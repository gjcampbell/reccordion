import { Injectable } from '@angular/core';
import { IBaseVideoLayer, IVideo, IVideoLayer } from 'app/services/video.models';

@Injectable()
export class PlayerCanvasModel {
  private selection = new Set<any>();
  private _fps = 25;

  public getCurrentFrame() {
    return this.snapMsToFrame(this.video.getCurrTimeMs()) / this.frameDurMs;
  }
  public getCurrentTimeMs() {
    return this.getCurrentFrame() * this.frameDurMs;
  }
  public getTotalTimeMs() {
    return this.video.getDurationMs();
  }
  public getFrameCount() {
    return this.video.getDurationMs() / this.frameDurMs;
  }
  public snapMsToFrame(mills: number) {
    return Math.floor(mills / this.frameDurMs) * this.frameDurMs;
  }
  public formatAsTime(timeMs: number, millDec = 2) {
    const snappedMs = this.snapMsToFrame(timeMs),
      mills = millDec > 0 ? '.' + snappedMs.toString().slice(-3, -3 + millDec) : '',
      seconds = Math.floor((snappedMs / 1000) % 60)
        .toFixed(0)
        .padStart(2, '0'),
      minutes = Math.floor(snappedMs / 60000);

    return `${minutes}:${seconds}${mills}`;
  }
  public formatAsFrame(timeMs: number) {
    const { minute, second, frame } = this.getFrameTime(timeMs);
    return `${minute}:${second.toString().padStart(2, '0')} ${frame.toString().padStart(2, '0')}f`;
  }
  public getFrameTime(timeMs: number) {
    const snappedMs = this.snapMsToFrame(timeMs),
      frameCt = snappedMs / this.frameDurMs,
      frame = (frameCt % this.fps) + 1,
      second = Math.floor(frameCt / this.fps) % 60,
      minute = Math.floor(second / 60);

    return { minute, second, frame };
  }
  public frameDurMs = 40;
  public root: IVideo;
  public video: IBaseVideoLayer;
  public layers: IVideoLayer[];
  public height: number;
  public width: number;
  public set fps(value: number) {
    this._fps = value;
    this.frameDurMs = 1000 / value;
  }
  public get fps() {
    return this._fps;
  }
  public ctx: CanvasRenderingContext2D;
  public isSelected(value: any) {
    return this.selection.has(value);
  }
  public select(...values: any[]) {
    this.selection.clear();
    for (const item of values) {
      this.selection.add(item);
    }
  }
  public hasSelection() {
    return this.selection.size > 0;
  }
  public clearSelection() {
    this.selection.clear();
  }
}
