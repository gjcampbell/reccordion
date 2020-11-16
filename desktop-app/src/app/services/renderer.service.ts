import { Injectable } from '@angular/core';
import canvasTxt from '../canvas-txt';
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
  setDimensions(width: number, height: number): void;
  drawFrame(millisecond: number, ctx: CanvasRenderingContext2D): Promise<void>;
}

export interface IBaseVideoLayer extends IVideoLayer {
  iterateFrames(handleFrame: (mills) => Promise<boolean>): Promise<void>;
  isPlaying(): boolean;
  play(): Promise<void>;
  pause(): Promise<void>;
  seek(mills: number): Promise<void>;
  getDurationMs(): number;
  getCurrTimeMs(): number;
  onFrameChanged: (mills: number) => void;
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
    let canceled = false;
    const frameBlobs: { blob: Blob; mills: number }[] = [];
    await rootVideo.iterateFrames(async (mills) => {
      ctx.fillRect(0, 0, video.width, video.height);
      for (const layer of video.layers) {
        layer.drawFrame(mills, ctx);
      }
      ctx.canvas.toBlob((blob) => frameBlobs.push({ blob, mills }), 'image/webp', video.quality);
      return (canceled = progress(mills / video.durationMs, ''));
    });

    return !canceled ? frameBlobs : undefined;
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

export interface IComment {
  text: string;
  position: { x: number; y: number };
  width: number;
  height: number;
  lineHeight: number;
  align: 'center' | 'left' | 'right';
  vAlign: 'middle' | 'top' | 'bottom';
  font: string;
  fontSize: number;
  strokeW: number;
  strokeColor: string;
  fillColor: string;
  padding: number;
  startMs: number;
  endMs: number;
  background: string;
  borderRadius: number;
  borderColor: string;
  borderWidth: number;
  shadowBlur: number;
  shadowColor: string;
  shape: string;
  shapeData: any;
  points: { x: number; y: number }[];
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
      width: 300,
      height: 300,
      align: 'center',
      vAlign: 'middle',
      font: 'sans-serif',
      fontSize: 16,
      lineHeight: (comment.fontSize || 16) * 1.2,
      startMs: 0,
      endMs: 5000,
      strokeColor: '#fff',
      strokeW: 1,
      fillColor: '#000',
      background: '#fff',
      borderRadius: 4,
      borderColor: '#0000',
      borderWidth: 0,
      padding: 5,
      shadowBlur: 15,
      shadowColor: '#000',
      shape: 'rect',
      shapeData: {},
      points: [],
      ...comment,
    });
  }

  public async setDimensions() {}
  public async drawFrame(millisecond: number, ctx: CanvasRenderingContext2D) {
    for (const comment of this.comments) {
      if (comment.startMs <= millisecond && comment.endMs >= millisecond) {
        ctx.fillStyle = comment.background;
        ctx.shadowBlur = comment.shadowBlur;
        ctx.shadowColor = comment.shadowColor;
        if (comment.shape in this) {
          this[comment.shape](comment, ctx);
        }
        ctx.shadowBlur = 0;
        canvasTxt.align = comment.align;
        canvasTxt.vAlign = comment.vAlign;
        canvasTxt.fontSize = comment.fontSize;
        canvasTxt.font = comment.font;
        canvasTxt.lineHeight = comment.lineHeight;
        ctx.fillStyle = comment.fillColor;
        canvasTxt.drawText(
          ctx,
          comment.text,
          comment.position.x + comment.padding,
          comment.position.y + comment.padding,
          comment.width - comment.padding * 2,
          comment.height - comment.padding * 2
        );
      }
    }
  }
  private rect(comment: IComment, ctx: CanvasRenderingContext2D) {
    ctx.fillRect(comment.position.x, comment.position.y, comment.width, comment.height);
    ctx.shadowBlur = 0;
    if (comment.borderWidth) {
      ctx.strokeStyle = comment.borderColor;
      ctx.lineWidth = comment.borderWidth;
      ctx.strokeRect(comment.position.x, comment.position.y, comment.width, comment.height);
    }
  }
  private circle(comment: IComment, ctx: CanvasRenderingContext2D) {
    const rx = comment.width / 2,
      ry = comment.height / 2,
      x = comment.position.x + rx,
      y = comment.position.y + ry;
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, 2 * Math.PI);
    ctx.fill();
    ctx.shadowBlur = 0;
    if (comment.borderWidth) {
      ctx.strokeStyle = comment.borderColor;
      ctx.lineWidth = comment.borderWidth;
      ctx.stroke();
    }
  }

  public getLines(ctx, text, maxWidth) {
    const words = text.split(' '),
      lines: string[] = [];
    let currentLine = words[0];

    for (let i = 1; i < words.length; i++) {
      let word = words[i],
        width = ctx.measureText(currentLine + ' ' + word).width;
      if (width < maxWidth) {
        currentLine += ' ' + word;
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    }
    lines.push(currentLine);
    return lines;
  }
}

export interface VideoTimeRange {
  startMs: number;
  endMs: number;
  video: Video;
}

export interface VideoClip {
  localStart: number;
  localEnd: number;
  globalStart: number;
  globalEnd: number;
  video: Video;
}

export class VideoTimeRanges {
  public ranges: VideoTimeRange[] = [];
  private calcRanges: VideoClip[] = [];
  public timeMs = 0;
  public durationMs = 0;
  public playing = false;

  public isEmpty() {
    return this.ranges.length === 0;
  }

  public getVideo(): Video | undefined {
    return this.getVideoByTime(this.timeMs)?.video;
  }

  public async addVideo(blob: Blob, durationMs: number) {
    const video = await Video.load(blob, durationMs);
    this.ranges.push({ video, endMs: durationMs, startMs: 0 });
    this.recalcRanges();
  }

  public setVideos(videos: VideoTimeRange[]) {
    this.ranges = videos;
    this.recalcRanges();
  }

  public async play(frameHandler: (timeMs: number | undefined) => Promise<boolean>, speed: number = 1) {
    if (this.timeMs >= this.durationMs) {
      this.timeMs = 0;
    }
    this.playing = true;
    let videoClip = this.getVideoByTime(this.timeMs),
      lastMs = 0;
    const handler = async (timeMs: number | undefined) => {
      let result = true;
      if (this.timeMs !== lastMs) {
        videoClip = this.getVideoByTime(this.timeMs);
        result = false;
        lastMs = this.timeMs;
      } else {
        const globalTime = videoClip.globalStart + (timeMs === undefined ? videoClip.localEnd : timeMs);
        if (globalTime >= videoClip.globalEnd) {
          videoClip = this.getVideoByTime(globalTime);
          result = false;
        } else if (!this.playing) {
          videoClip = undefined;
          result = false;
        } else {
          result = await frameHandler(globalTime);
        }
        this.timeMs = lastMs = globalTime;
      }
      return result;
    };
    while (videoClip) {
      await this.seek(this.timeMs);
      await videoClip.video.iterateFrames(handler, speed);
    }
    this.playing = false;
  }

  public async pause() {
    this.playing = false;
  }

  public async seek(timeMs: number) {
    this.timeMs = timeMs;
    const videoClip = this.getVideoByTime(this.timeMs);
    await this.seekVideo(this.timeMs, videoClip);
  }

  private async seekVideo(timeMs: number, clip: VideoClip) {
    clip.video.seek(this.timeMs - clip.globalStart + clip.localStart);
  }

  private getVideoByTime(timeMs: number) {
    return this.calcRanges.filter((r) => r.globalStart <= timeMs && r.globalEnd > timeMs).find(() => true);
  }

  private recalcRanges() {
    this.durationMs = this.ranges.reduce((result, item) => result + (item.endMs - item.startMs), 0);
    this.calcRanges = [];
    let total = 0;
    for (const range of this.ranges) {
      this.calcRanges.push({
        localStart: range.startMs,
        localEnd: range.endMs,
        video: range.video,
        globalStart: total,
        globalEnd: total += range.endMs,
      });
    }
  }
}

export class Video {
  public w!: number;
  public h!: number;
  public videoEl!: VideoEl;
  public durationMs: number;

  private constructor(private readonly blob: Blob) {}

  public async play() {
    await this.videoEl.play();
  }
  public async pause() {
    await this.videoEl.pause();
  }
  public seek(timeMs: number) {
    const timeSec = timeMs / 1000;
    return new Promise((resolve) => {
      if (this.videoEl.currentTime !== timeSec) {
        this.videoEl.onseeked = resolve;
        this.videoEl.currentTime = timeSec;
      } else {
        resolve();
      }
    });
  }
  public async iterateFrames(frameHandler: (timeMs?: number) => Promise<boolean>, speed: number = 1) {
    this.videoEl.playbackRate = speed;
    if (this.videoEl.paused) {
      await this.play();
    }
    while (true) {
      const timeMs = await this.nextFrame();
      if (!(await frameHandler(timeMs))) {
        this.pause();
        break;
      }
    }
  }

  public static async load(blob: Blob, durationMs: number) {
    const result = new Video(blob);
    result.durationMs = durationMs;
    await result.init();
    return result;
  }

  private nextFrame() {
    return new Promise<number | undefined>(this.nextFrameHandler);
  }

  private nextFrameHandler = (resolver: (timeMs: number | undefined) => void) => {
    this.videoEl.onended = () => resolver(undefined);
    this.videoEl.requestVideoFrameCallback((time, { mediaTime }) => resolver(mediaTime * 1000));
  };

  private async init() {
    this.videoEl = await this.createVideoEl();
    this.w = this.videoEl.videoWidth;
    this.h = this.videoEl.videoHeight;
  }

  private async createVideoEl() {
    const videoEl = document.createElement('video') as VideoEl,
      url = URL.createObjectURL(this.blob);

    return new Promise<VideoEl>((resolver) => {
      videoEl.onloadedmetadata = () => {
        videoEl.onloadedmetadata = undefined;
        resolver(videoEl);
      };
      videoEl.src = url;
    });
  }
}

export class WebmBlobSeriesLayer implements IBaseVideoLayer {
  public onFrameChanged: (mills: number) => void;
  public ranges = new VideoTimeRanges();
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
}
