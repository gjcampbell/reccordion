import { Injectable } from '@angular/core';
import { IBaseVideoLayer, IVideo, IVideoLayer, IVideoSource, IWebMWriter, VideoTimeRanges } from './video.models';

const WebMWriter = (window as any).WebMWriter as typeof IWebMWriter;

export class BaseRendererService {
  public create2dCtx(video: IVideo, canvas?: HTMLCanvasElement) {
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.width = video.width;
      canvas.height = video.height;
    }

    const result = canvas.getContext('2d');

    return result;
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
      writer = new WebMWriter({ quality: video.quality || 0.99999, frameRate });

    //ctx.scale(1 / window.devicePixelRatio, 1 / window.devicePixelRatio);
    const frames = await this.getFrames(rootVideo, video, ctx, progress);

    if (frames) {
      frames.sort((a, b) => a.mills - b.mills);
      writer.setDimensions(video.width / window.devicePixelRatio, video.height / window.devicePixelRatio);

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
    let canceled = false;
    const frameBlobs: { blob: Blob; mills: number }[] = [];

    await rootVideo.iterateFrames(async (mills) => {
      ctx.fillRect(0, 0, video.width, video.height);
      for (const layer of video.layers) {
        await layer.drawFrame(mills, ctx);
      }
      frameBlobs.push({ blob: await this.getBlob(ctx, video.quality), mills });
      canceled = !progress(mills / video.durationMs, '');
      return !canceled;
    });

    return !canceled ? frameBlobs : undefined;
  }
  public async *createFrames(
    rootVideo: IBaseVideoLayer,
    video: IVideo,
    progress: (percent: number, stage: string) => boolean
  ) {
    let canceled = false;
    const ctx = this.create2dCtx(video),
      frameRate = video.frameRate || 25,
      frameDur = 1000 / frameRate;

    for (let mills = 0; mills <= rootVideo.getDurationMs(); mills += frameDur) {
      ctx.fillRect(0, 0, video.width, video.height);
      for (const layer of video.layers) {
        await layer.drawFrame(mills, ctx);
      }
      canceled = !progress(mills / video.durationMs, '');
      if (canceled) {
        break;
      } else {
        yield await this.getBlob(ctx, video.quality);
      }
    }
  }

  private getBlob(ctx: CanvasRenderingContext2D, quality: number) {
    return new Promise<Blob>((resolve) => {
      ctx.canvas.toBlob(resolve, 'image/webp', quality);
    });
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

export class WebmBlobSeriesLayer implements IBaseVideoLayer {
  public onFrameChanged: (mills: number) => void;
  public readonly ranges = new VideoTimeRanges();
  private height = 0;
  private width = 0;

  public isEmpty() {
    return this.ranges.isEmpty();
  }

  public setDimensions(width: number, height: number) {
    this.height = height;
    this.width = width;
  }

  public isPlaying() {
    return this.ranges.playing;
  }
  public async play() {
    await this.ranges.play(async (time) => {
      if (this.onFrameChanged) {
        this.onFrameChanged(time);
      }
      return true;
    }, 1);
  }
  public async pause() {
    await this.ranges.pause();
  }
  public async seek(mills: number) {
    await this.ranges.seek(mills);
  }
  public getDurationMs() {
    return this.ranges.durationMs;
  }
  public setDurationMs(value: number) {}
  public getCurrTimeMs() {
    return this.ranges.timeMs;
  }

  public async drawFrame(millisecond: number, ctx: CanvasRenderingContext2D) {
    const vm = this.ranges.getVideo();
    if (vm) {
      const scale = Math.min(this.width / vm.w, this.height / vm.h),
        w = vm.w * scale,
        h = vm.h * scale,
        x = (this.width - w) / 2,
        y = (this.height - h) / 2;

      ctx.drawImage(vm.videoEl, x, y, w, h);
    }
  }

  public async iterateFrames(handleFrame: (mills) => Promise<boolean>) {
    await this.ranges.play(async (time) => {
      return await handleFrame(time);
    }, 2);
  }

  public async addVideo(blob: Blob, source: IVideoSource, startMs: number) {
    //this.ranges.addVideo(blob, durationMs);
  }
}
