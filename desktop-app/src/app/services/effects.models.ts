import { IVideoLayer } from './video.models';

export interface Effect {
  zoom?: Snapshot<Zoom>[];
  startMs: number;
  endMs: number;
  enable: boolean;
}

export interface Snapshot<T> {
  value: T;
  timePct: number;
}

export interface Zoom {
  lPct: number;
  tPct: number;
  rPct: number;
  bPct: number;
}

export class EffectLayer implements IVideoLayer {
  public effects: Effect[];

  public setDimensions(width: number, height: number) {}
  public async drawFrame(millisecond: number, ctx: CanvasRenderingContext2D) {}
}
