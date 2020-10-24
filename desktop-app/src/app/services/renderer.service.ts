import { Injectable } from '@angular/core';
const WebMWriter = (window as any).WebMWriter as typeof IWebMWriter;
type VideoEl = HTMLVideoElement & {
  requestVideoFrameCallback: (callback: (now: number, { mediaTime: number }) => void) => void;
};

declare class IWebMWriter {
  constructor(options: { quality: number; frameRate: number | null });
  public complete(): Promise<Blob>;
  public addFrame(frame: HTMLCanvasElement | Blob, alpha?: string, frameDur?: number): Promise<void>;
  public setDimensions(width: number, height: number): void;
}

export interface IVideoLayer {
  prepare(width: number, height: number, frameDurationMs: number): Promise<void>;
  drawFrame(millisecond: number, ctx: CanvasRenderingContext2D): Promise<void>;
}

export interface IBaseVideoLayer extends IVideoLayer {
  iterateFrames(handleFrame: (mills) => Promise<boolean>): Promise<boolean>;
}

export interface IVideo {
  layers: IVideoLayer[];
  width: number;
  height: number;
  durationMs: number;
  frameRate?: number;
  quality?: number;
}

export class BaseRendererService {
  protected create2dCtx(video: IVideo, canvas?: HTMLCanvasElement) {
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.width = video.width;
      canvas.height = video.height;
    }

    const result = canvas.getContext('2d');

    return result;
  }

  protected async prepareLayers(video: IVideo, framerate: number) {
    const { width, height, layers } = video;
    for (const layer of layers) {
      await layer.prepare(width, height, framerate);
    }
  }
}

@Injectable()
export class ReqRendererService extends BaseRendererService {
  public async render(
    rootVideo: IBaseVideoLayer,
    video: IVideo,
    progress?: (percent: number, stage: string) => boolean
  ) {
    const ctx = this.create2dCtx(video),
      frameRate = video.frameRate || 25,
      writer = new WebMWriter({ quality: video.quality || 0.9999, frameRate });

    await this.prepareLayers(video, frameRate);

    const frames = await this.getFrames(rootVideo, video, ctx, progress);

    if (frames) {
      frames.sort((a, b) => a.mills - b.mills);
      writer.setDimensions(video.width, video.height);

      for (let i = 1; i <= frames.length; i++) {
        const frame = frames[i - 1],
          nextFrameMs = frames[i] ? frames[i].mills : video.durationMs;

        await writer.addFrame(frame.blob, undefined, nextFrameMs - frame.mills);
      }

      return await writer.complete();
    } else {
      return new Blob([]);
    }
  }

  private async getFrames(
    rootVideo: IBaseVideoLayer,
    video: IVideo,
    ctx: CanvasRenderingContext2D,
    progress: (percent: number, stage: string) => boolean
  ) {
    const frameBlobs: { blob: Blob; mills: number }[] = [],
      finished = await rootVideo.iterateFrames(async (mills) => {
        ctx.fillRect(0, 0, video.width, video.height);
        for (const layer of video.layers) {
          layer.drawFrame(mills, ctx);
        }
        ctx.canvas.toBlob((blob) => frameBlobs.push({ blob, mills }), 'image/webp', video.quality);
        return progress(mills / video.durationMs, '');
      });

    return finished ? frameBlobs : undefined;
  }
}

@Injectable()
export class RendererService extends BaseRendererService {
  public async render(video: IVideo, canvas?: HTMLCanvasElement, progress?: (percent: number) => boolean) {
    const ctx = this.create2dCtx(video, canvas),
      frameRate = video.frameRate || 25,
      duration = video.durationMs,
      writer = new WebMWriter({ quality: video.quality || 0.9999, frameRate }),
      frameProvider = this.getFrameMs(1000 / frameRate, duration);

    await this.prepareLayers(video, frameRate);

    await this.writeFrames(video, ctx, writer, frameProvider, progress);

    return await writer.complete();
  }

  private async writeFrames(
    video: IVideo,
    ctx: CanvasRenderingContext2D,
    writer: IWebMWriter,
    frameMs: IterableIterator<number>,
    progress: (percent: number) => boolean
  ) {
    for (const mills of frameMs) {
      ctx.fillRect(0, 0, video.width, video.height);
      for (const layer of video.layers) {
        await layer.drawFrame(mills, ctx);
      }
      writer.addFrame(ctx.canvas);
      if (!progress(mills / video.durationMs)) {
        break;
      }
    }
  }

  private *getFrameMs(fps: number, duration: number): IterableIterator<number> {
    for (let mills = 0; mills < duration; mills = Math.min(mills + fps, duration)) {
      yield mills;
    }
  }
}

export interface IComment {
  text: string;
  position: { x: number; y: number };
  maxW: number;
  align: 'center' | 'left' | 'right';
  font: string;
  strokeW: number;
  strokeColor: string;
  fillColor: string;
  startMs: number;
  endMs: number;
}

export class CommentLayer implements IVideoLayer {
  private comments: IComment[] = [];

  public getComments() {
    return this.comments;
  }

  public addText(comment: Partial<IComment>) {
    this.comments.push({
      text: 'None',
      position: { x: 0, y: 0 },
      maxW: 300,
      align: 'left',
      font: '16pt sans-serif',
      startMs: 0,
      endMs: 5000,
      strokeColor: '#fff',
      strokeW: 1,
      fillColor: '#000',
      ...comment,
    });
  }

  public async prepare() {}
  public async drawFrame(millisecond: number, ctx: CanvasRenderingContext2D) {
    for (const comment of this.comments) {
      if (comment.startMs <= millisecond && comment.endMs >= millisecond) {
        ctx.font = comment.font;
        ctx.fillStyle = comment.fillColor;
        ctx.strokeStyle = comment.strokeColor;
        ctx.textBaseline = 'top';
        if (comment.strokeW) {
          ctx.lineWidth = comment.strokeW;
          ctx.strokeText(comment.text, comment.position.x, comment.position.y, comment.maxW);
        }
        ctx.fillText(comment.text, comment.position.x, comment.position.y, comment.maxW);
      }
    }
  }

  public getBounds(comment: IComment, ctx: CanvasRenderingContext2D, time: number) {
    ctx.font = comment.font;
    ctx.fillStyle = comment.fillColor;
    ctx.strokeStyle = comment.strokeColor;
    ctx.textBaseline = 'top';
    if (comment.strokeW) {
      ctx.lineWidth = comment.strokeW;
    }
    const textMetrics = ctx.measureText(comment.text);
  }
}

export class WebmBlobSeriesLayer implements IBaseVideoLayer {
  public blobs: Blob[] = [];
  private videos: { x: number; y: number; w: number; h: number; el: VideoEl; durMs: number }[] = [];
  private canSeek = true;

  public async prepare(width: number, height: number, frameDurationMs: number) {
    this.videos = [];
    for (const blob of this.blobs) {
      const videoEl = await this.createVideoEl(width, height, blob),
        scale = Math.min(width / videoEl.videoWidth, height / videoEl.videoHeight),
        w = videoEl.videoWidth * scale,
        h = videoEl.videoHeight * scale,
        x = (width - w) / 2,
        y = (height - h) / 2;

      this.videos.push({ x, y, w, h, el: videoEl as VideoEl, durMs: videoEl.duration * 1000 });
    }
  }

  public async drawFrame(millisecond: number, ctx: CanvasRenderingContext2D) {
    const vm = this.getVideoByMs(millisecond);
    if (vm) {
      if (!this.canSeek) {
        await this.seek(vm.video.el, vm.mills / 1000);
      }
      ctx.drawImage(vm.video.el, vm.video.x, vm.video.y, vm.video.w, vm.video.h);
    }
  }

  public async iterateFrames(handleFrame: (mills) => Promise<boolean>) {
    for (const video of this.videos) {
      do {
        const mills = await this.nextFrame(video.el);
        if (mills === undefined) {
          break;
        }
        if (!(await handleFrame(mills))) {
          return false;
        }
      } while (true);
    }
    return true;
  }

  private async nextFrame(videoEl: VideoEl) {
    if (videoEl.paused) {
      videoEl.playbackRate = 2;
      await videoEl.play();
    }
    return new Promise<number | undefined>((resolve) => {
      videoEl.onended = () => resolve(undefined);
      videoEl.requestVideoFrameCallback((time, { mediaTime }) => resolve(mediaTime * 1000));
    });
  }

  private createVideoEl(width: number, height: number, blob: Blob) {
    const videoEl = document.createElement('video'),
      url = URL.createObjectURL(blob);

    return new Promise<HTMLVideoElement>((resolver) => {
      videoEl.onloadeddata = () => {
        videoEl.onloadeddata = undefined;
        resolver(videoEl);
      };
      videoEl.src = url;
    });
  }

  private getVideoByMs(mills: number) {
    for (const video of this.videos) {
      if (video.durMs >= mills) {
        return { mills, video };
      } else {
        mills -= video.durMs;
      }
    }
    return undefined;
  }

  private seek(videoEl: HTMLVideoElement, second: number) {
    return new Promise((resolver) => {
      videoEl.onseeked = resolver;
      if (videoEl.currentTime === second) {
        resolver();
      }
      videoEl.currentTime = second;
    });
  }
}
