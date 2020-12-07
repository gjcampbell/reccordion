import { IFrameExtractor } from './interfaces';

export type VideoEl = HTMLVideoElement & {
  requestVideoFrameCallback: (callback: (now: number, { mediaTime: number }) => void) => void;
};

export declare class IWebMWriter {
  constructor(options: { quality: number; frameRate: number | null });
  public complete(): Promise<Blob>;
  public addFrame(frame: HTMLCanvasElement | Blob, alpha?: string, frameDur?: number): Promise<void>;
  public setDimensions(width: number, height: number): void;
}

export interface VideoTimeRange {
  startMs: number;
  endMs: number;
  video: IVideoElement;
}

export interface IFrameIterator {
  seek(timeMs: number): Promise<void>;
  iterateFrames(frameHandler: (timeMs?: number) => Promise<boolean>, speed: number | undefined): Promise<void>;
  durationMs: number;
}

export interface IVideoElement extends IFrameIterator {
  w: number;
  h: number;
  videoEl: VideoEl;
}

interface VideoClip {
  localStart: number;
  localEnd: number;
  globalStart: number;
  globalEnd: number;
  video: IVideoElement;
}

export interface IVideoLayer {
  setDimensions(width: number, height: number): void;
  drawFrame(millisecond: number, ctx: CanvasRenderingContext2D): Promise<void>;
}

export interface IBaseVideoLayer extends IVideoLayer {
  onFrameChanged: (mills: number) => void;
  iterateFrames(handleFrame: (mills) => Promise<boolean>): Promise<void>;
  isPlaying(): boolean;
  play(): Promise<void>;
  pause(): Promise<void>;
  seek(mills: number): Promise<void>;
  getDurationMs(): number;
  getCurrTimeMs(): number;
  isEmpty(): boolean;
  addVideo(blob: Blob, durationMs: number, startMs: number): Promise<void>;
}

export interface IVideo {
  layers: IVideoLayer[];
  width: number;
  height: number;
  durationMs: number;
  frameRate?: number;
  quality?: number;
}

export interface ICapturable {
  name: string;
  isScreen: boolean;
  id: string;
  iconUrl: string;
  previewUrl: string;
  displayId: string;
}

export interface ICapturer {
  getStream: () => MediaStream;
  getBlob: () => Blob;
  getDuration: () => number;
  pause: () => Promise<void>;
  capture: () => void;
  isRecording: () => boolean;
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

  public getVideo(): IVideoElement | undefined {
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
        globalEnd: (total += range.endMs),
      });
    }
  }
}

export class TimeIterator {
  public durationMs = 0;
  private currentTimeMs = 0;
  private startTime: Date;
  public fps = 25;
  public playing = false;
  public async seek(timeMs: number): Promise<void> {
    this.startTime = new Date();
    this.currentTimeMs = timeMs;
  }
  public async play(): Promise<void> {
    this.startTime = new Date();
    this.playing = true;
  }
  public async pause(): Promise<void> {
    this.currentTimeMs = this.getTimeSinceStart();
    this.playing = false;
  }
  public getTimeMs() {
    return this.playing ? this.getTimeSinceStart() : this.currentTimeMs;
  }
  private getTimeSinceStart() {
    const timeSincePlay = (new Date() as any) - (this.startTime as any),
      playOffset = this.currentTimeMs + timeSincePlay;
    return playOffset % this.durationMs;
  }
}

/**
 * createImageBitmap can't keep up with request animation from
 */
export class BitmapFrameCache implements IFrameCache {
  private cache = new Map<number, ImageBitmap>();
  private lastIndex = -1;
  private maxCached = 2;
  private frames: Blob[];

  constructor() {}
  public load(frames: Blob[]) {
    this.frames = frames;
    return this;
  }
  public async getFrame(index: number) {
    if (this.clearFor(index)) {
      await this.cacheFor(index);
    }
    return this.cache.get(index);
  }
  private clearFor(index: number) {
    if (this.lastIndex === index) {
      return false;
    } else {
      const end = Math.min(this.lastIndex + this.maxCached, index);
      for (let i = this.lastIndex; i < end; i++) {
        this.cache.delete(i);
      }
      return true;
    }
  }
  private async cacheFor(index: number) {
    this.lastIndex = index;
    await this.cacheImage(index);
    const max = Math.min(index + this.maxCached, this.frames.length - 1);
    for (let i = index + 1; i < max; i++) {
      this.cacheImage(index);
    }
  }
  private async cacheImage(index: number) {
    if (!this.cache.has(index)) {
      const frame = this.frames[index],
        image = await createImageBitmap(frame);

      this.cache.set(index, image);
    }
  }
}

/**
 * Low memory usage
 * Profiler during play shows that every frame does a decode
 * on the image, each taking 10ms for 1300x1000 size images
 * CPU idle 4sec out of 7, time painting 1900ms
 * Smooth tho
 */
export class HtmlImgFrameCache implements IFrameCache {
  private imgs: HTMLImageElement[];
  public load(frames: Blob[]): IFrameCache {
    this.imgs = frames.map((f) => {
      const url = URL.createObjectURL(f),
        img = document.createElement('img');
      img.src = url;
      return img;
    });
    return this;
  }
  public async getFrame(index: number) {
    return this.imgs[index];
  }
}

/**
 * High memory usage, profiler during play shows minimal activity
 * CPU idle 7.7sec out of 9, time paiting 100ms
 * Smooth
 */
export class OffscreenCanvasFrameCache implements IFrameCache {
  private canvases: OffscreenCanvas[] = [];
  private preload: Promise<any>;
  public load(frames: Blob[]): IFrameCache {
    this.loadCanvases(frames);
    return this;
  }
  private loadCanvases(frames: Blob[]) {
    const loader = (frame: Blob, index: number, resolver: () => void) => {
        const url = URL.createObjectURL(frame),
          img = document.createElement('img');

        img.onload = () => {
          const canvas = new OffscreenCanvas(img.naturalWidth, img.naturalHeight),
            ctx = canvas.getContext('2d');

          ctx.drawImage(img, 0, 0);
          this.canvases[index] = canvas;
          resolver();
        };

        img.src = url;
      },
      loaderPromise = (frame: Blob, index: number) => new Promise((resolve) => loader(frame, index, resolve));

    this.preload = Promise.all(frames.map(loaderPromise));
  }
  public async getFrame(index: number) {
    await this.preload;
    return this.canvases[index];
  }
}

interface IFrameCache {
  load(frames: Blob[]): IFrameCache;
  getFrame(index: number): Promise<ImageBitmap | HTMLImageElement | OffscreenCanvas>;
}

export class FrameSeries {
  private durationMs: number;
  private frameCache: IFrameCache;
  private frameCount: number;
  private frameDurationMs: number;
  public speedBoost: number = 1;
  public offsetMs = 0;
  public lengthMs: number;

  public get endMs() {
    return this.startMs - this.offsetMs + this.lengthMs;
  }
  constructor(frames: Blob[], private fps: number, public startMs: number) {
    this.frameDurationMs = 1000 / this.fps;
    this.frameCount = frames.length;
    this.durationMs = this.frameCount * this.frameDurationMs;
    this.lengthMs = this.durationMs;
    this.frameCache = new HtmlImgFrameCache().load(frames);
  }

  public async drawFrame(millisecond: number, ctx: CanvasRenderingContext2D, width: number, height: number) {
    const startMs = this.startMs - this.offsetMs,
      endMs = this.startMs - this.offsetMs + this.lengthMs;
    if (startMs <= millisecond && endMs >= millisecond) {
      const frameIdxOffset = this.offsetMs / this.frameDurationMs,
        frameIdx = (millisecond - startMs) / this.frameDurationMs + frameIdxOffset,
        legitIndex = Math.max(0, Math.min(this.frameCount - 1, Math.floor(frameIdx))),
        frame = await this.frameCache.getFrame(legitIndex),
        scale = Math.min(width / frame.width, height / frame.height),
        w = frame.width * scale,
        h = frame.height * scale,
        x = (width - w) / 2,
        y = (height - h) / 2;

      ctx.drawImage(frame, x, y, w, h);
    }
  }
  public getOriginalDuration() {
    return this.durationMs;
  }
  private async loadFrames(frames: Blob[]) {
    // this consumes insane memory
    const allFrames: ImageBitmap[] = [];
    await Promise.all(frames.map(async (f) => allFrames.push(await createImageBitmap(f))));
  }
}

export class FrameSeriesLayer implements IBaseVideoLayer {
  public w: number;
  public h: number;
  private seriesSets: FrameSeries[] = [];
  public timeIterator = new TimeIterator();
  constructor(private frameExtractor: IFrameExtractor) {}

  public onFrameChanged: (mills: number) => void;
  public isEmpty() {
    return this.seriesSets.length > 0;
  }
  public getSeries() {
    return this.seriesSets;
  }
  public iterateFrames(handleFrame: (mills: any) => Promise<boolean>): Promise<void> {
    throw new Error('Method not implemented.');
  }
  public isPlaying(): boolean {
    return this.timeIterator.playing;
  }
  public async play() {
    this.timeIterator.play();
  }
  public async pause() {
    this.timeIterator.pause();
  }
  public async seek(mills: number) {
    this.timeIterator.seek(mills);
  }
  public getDurationMs() {
    return this.timeIterator.durationMs;
  }
  public setDurationMs(value: number) {
    this.timeIterator.durationMs = value;
  }
  public getCurrTimeMs(): number {
    return this.timeIterator.getTimeMs();
  }
  public setDimensions(width: number, height: number): void {
    this.w = width;
    this.h = height;
  }
  public async drawFrame(millisecond: number, ctx: CanvasRenderingContext2D) {
    for (const series of this.seriesSets) {
      await series.drawFrame(millisecond, ctx, this.w, this.h);
    }
  }
  public async addVideo(blob: Blob, durationMs: number, startMs: number) {
    const rawFrames = await this.frameExtractor.extractFrames(blob),
      frameSeries = new FrameSeries(rawFrames.blobs, 25, startMs);

    this.timeIterator.durationMs += frameSeries.getOriginalDuration();
    this.seriesSets.push(frameSeries);
  }
}

export class Video implements IVideoElement {
  public w!: number;
  public h!: number;
  public videoEl!: VideoEl;
  public durationMs: number;
  public ctx: CanvasRenderingContext2D;

  private constructor(private readonly blob: Blob) {}

  public async play() {
    await this.videoEl.play();
  }
  public async pause() {
    await this.videoEl.pause();
  }
  public seek(timeMs: number): Promise<void> {
    const timeSec = timeMs / 1000;
    return new Promise((resolve) => {
      if (this.videoEl.currentTime !== timeSec) {
        this.videoEl.onseeked = () => resolve;
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
      this.ctx.drawImage(this.videoEl, 0, 0);
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
      url = URL.createObjectURL(this.blob),
      canvas = document.createElement('canvas');

    return new Promise<VideoEl>((resolver) => {
      videoEl.onloadedmetadata = () => {
        videoEl.onloadedmetadata = undefined;
        canvas.width = videoEl.videoWidth;
        canvas.height = videoEl.videoHeight;
        this.ctx = canvas.getContext('2d');

        resolver(videoEl);
      };
      videoEl.src = url;
    });
  }
}
