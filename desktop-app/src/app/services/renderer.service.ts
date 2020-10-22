import { Injectable } from '@angular/core';
import { resolve } from 'dns';
const WebMWriter = (window as any).WebMWriter as typeof IWebMWriter;

declare class IWebMWriter {
  constructor(options: { quality: number; frameRate: number | null });
  public complete: () => Promise<Blob>;
  public addFrame: (canvas: HTMLCanvasElement) => void;
}

export interface IVideoLayer {
  prepare(width: number, height: number, frameDurationMs: number): Promise<void>;
  drawFrame(millisecond: number, ctx: CanvasRenderingContext2D): Promise<void>;
}

export interface IVideo {
  layers: IVideoLayer[];
  width: number;
  height: number;
  durationMs: number;
  frameRate?: number;
  quality?: number;
}

@Injectable()
export class RendererService {
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

  private async prepareLayers(video: IVideo, framerate: number) {
    const { width, height, layers } = video;
    for (const layer of layers) {
      await layer.prepare(width, height, framerate);
    }
  }

  private create2dCtx(video: IVideo, canvas?: HTMLCanvasElement) {
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.width = video.width;
      canvas.height = video.height;
    }

    const result = canvas.getContext('2d');

    return result;
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

interface IComment {
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
  public comments: Partial<IComment>[] = [];

  private preparedComments: IComment[] = [];

  public async prepare() {
    for (const comment of this.comments) {
      this.preparedComments = [];
      this.preparedComments.push({
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
  }
  public async drawFrame(millisecond: number, ctx: CanvasRenderingContext2D) {
    for (const comment of this.preparedComments) {
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
}

export class WebmBlobSeriesLayer implements IVideoLayer {
  public blobs: Blob[] = [];
  private videos: { x: number; y: number; w: number; h: number; el: HTMLVideoElement; durMs: number }[] = [];

  public async prepare(width: number, height: number, frameDurationMs: number) {
    for (const blob of this.blobs) {
      const videoEl = await this.createVideoEl(width, height, blob),
        scale = Math.min(width / videoEl.videoWidth, height / videoEl.videoHeight),
        w = videoEl.videoWidth * scale,
        h = videoEl.videoHeight * scale,
        x = (width - w) / 2,
        y = (height - h) / 2;

      this.videos.push({ x, y, w, h, el: videoEl, durMs: videoEl.duration * 1000 });
    }
  }

  public async drawFrame(millisecond: number, ctx: CanvasRenderingContext2D) {
    const vm = this.getVideoByMs(millisecond);
    if (vm) {
      await this.seek(vm.video.el, vm.mills / 1000);
      ctx.drawImage(vm.video.el, vm.video.x, vm.video.y, vm.video.w, vm.video.h);
    }
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

  private async seek(videoEl: HTMLVideoElement, second: number) {
    return new Promise((resolver) => {
      videoEl.onseeked = resolver;
      if (videoEl.currentTime === second) {
        resolver();
      }
      videoEl.currentTime = second;
    });
  }
}
