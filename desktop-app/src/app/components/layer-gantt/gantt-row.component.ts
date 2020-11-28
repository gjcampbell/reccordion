import { Component, ElementRef, HostListener, Input, ViewChild } from '@angular/core';
import { CommentLayer, IComment } from 'app/services/graphics.models';
import { WebmBlobSeriesLayer } from 'app/services/renderer.service';
import { Effect, EffectLayer } from 'app/services/effects.models';
import { IBaseVideoLayer, IVideoLayer, VideoTimeRange } from 'app/services/video.models';
import { PlayerCanvasModel } from '../player-canvas.model';
import { basename } from 'path';

export interface GanttRow<ItemType> {
  canReorderItems: boolean;
  multiRow: boolean;
  getType(): string;
  getItems(): ItemType[];
  getStartMs(item: ItemType): number;
  setStartMs(item: ItemType, value: number): void;
  getEndMs(item: ItemType): number;
  setEndMs(item: ItemType, value: number): void;
  getLabel(item: ItemType): string;
  getItemType(item: ItemType): string;
}

export abstract class BaseGanttRow<T extends { startMs: number; endMs: number }> implements GanttRow<T> {
  public abstract canReorderItems: boolean;
  public multiRow = false;
  public abstract getType(): string;
  public abstract getItems(): T[];
  public abstract getLabel(item: T): string;
  public abstract getItemType(item: T): string;

  public getStartMs(item: T) {
    return item.startMs;
  }
  public setStartMs(item: T, value: number) {
    item.startMs = value;
  }
  public getEndMs(item: T) {
    return item.endMs;
  }
  public setEndMs(item: T, value: number) {
    item.endMs = value;
  }
}

export class EffectGanttRow extends BaseGanttRow<Effect> {
  public canReorderItems: boolean;
  constructor(private readonly layer: EffectLayer) {
    super();
  }
  public getType() {
    return 'Effect';
  }
  public getItems(): Effect[] {
    return this.layer.effects;
  }
  public getLabel(item: Effect): string {
    return item.zoom ? 'zoom' : '';
  }
  public getItemType(item: Effect): string {
    return item.zoom ? 'zoom' : '';
  }
}

export class VideoGanttRow extends BaseGanttRow<VideoTimeRange> {
  public canReorderItems = false;
  constructor(private readonly layer: IBaseVideoLayer) {
    super();
  }
  public getType() {
    return 'Video';
  }
  public getItems(): VideoTimeRange[] {
    return this.layer.ranges.ranges;
  }
  public getLabel(item: VideoTimeRange) {
    return 'Recording';
  }
  public getItemType(item: VideoTimeRange) {
    return 'recording';
  }
}

export class ShapeGanttRow extends BaseGanttRow<IComment> {
  public canReorderItems = true;
  public multiRow = true;
  constructor(private readonly layer: CommentLayer) {
    super();
  }

  public getType() {
    return 'Shapes';
  }
  public getItems(): IComment[] {
    return this.layer.getComments();
  }
  public getLabel(item: IComment) {
    return `${item.shape} ${item.text}`;
  }
  public getItemType(item: IComment) {
    return item.text ? 'text' : 'shape';
  }
}

@Component({
  selector: 'app-gantt-row',
  templateUrl: './gantt-row.component.html',
  styleUrls: ['./gantt-row.component.scss'],
})
export class GanttRowComponent {
  private containerWidth?: number;

  @Input()
  public model: GanttRow<any>;

  @ViewChild('itemContainer')
  public itemContainer: ElementRef<HTMLDivElement>;

  constructor(private readonly canvasModel: PlayerCanvasModel) {}

  @HostListener('window:resize')
  protected handleResize() {
    this.containerWidth = undefined;
  }

  public isSelected(value: any) {
    return this.canvasModel.isSelected(value);
  }

  public select(value: any) {
    this.canvasModel.select(value);
  }

  protected handleItemMseDown(orig: MouseEvent, item: any) {
    const init = this.getInitDim(orig, item),
      maxX = init.containerW - init.item.w,
      widthMs = init.endMs - init.startMs,
      mousemove = (evt: MouseEvent) => {
        const delt = evt.screenX - init.mse.x,
          newX = Math.min(maxX, Math.max(0, delt + init.item.x)),
          startMs = (newX / init.containerW) * init.durMs,
          endMs = startMs + widthMs;

        this.model.setStartMs(item, startMs);
        this.model.setEndMs(item, endMs);
      },
      mouseup = () => {
        window.removeEventListener('mouseup', mouseup);
        window.removeEventListener('mousemove', mousemove);
      };

    window.addEventListener('mouseup', mouseup);
    window.addEventListener('mousemove', mousemove);
  }

  protected handleLeftMseDown(orig: MouseEvent, item: any) {
    const init = this.getInitDim(orig, item),
      maxX = init.item.w + init.item.x,
      mousemove = (evt: MouseEvent) => {
        const delt = evt.screenX - init.mse.x,
          newX = Math.min(maxX, Math.max(0, delt + init.item.x)),
          startMs = (newX / init.containerW) * init.durMs;

        this.model.setStartMs(item, startMs);
      },
      mouseup = () => {
        window.removeEventListener('mouseup', mouseup);
        window.removeEventListener('mousemove', mousemove);
      };

    window.addEventListener('mouseup', mouseup);
    window.addEventListener('mousemove', mousemove);
    orig.stopImmediatePropagation();
  }

  protected handleRightMseDown(orig: MouseEvent, item: any) {
    const init = this.getInitDim(orig, item),
      maxW = init.containerW - init.item.x,
      mousemove = (evt: MouseEvent) => {
        const delt = evt.screenX - init.mse.x,
          newW = Math.min(maxW, Math.max(0, delt + init.item.w)),
          endMs = (newW / init.containerW) * init.durMs + init.startMs;

        this.model.setEndMs(item, endMs);
      },
      mouseup = () => {
        window.removeEventListener('mouseup', mouseup);
        window.removeEventListener('mousemove', mousemove);
      };

    window.addEventListener('mouseup', mouseup);
    window.addEventListener('mousemove', mousemove);
    orig.stopImmediatePropagation();
  }

  private getInitDim(evt: MouseEvent, item: any) {
    const containerW = this.getContainerWidth(),
      durMs = this.canvasModel.video.getDurationMs(),
      startMs = this.model.getStartMs(item),
      endMs = this.model.getEndMs(item);
    return {
      mse: { x: evt.screenX, y: evt.screenY },
      item: { x: (startMs / durMs) * containerW, w: ((endMs - startMs) / durMs) * containerW },
      containerW,
      durMs,
      startMs,
      endMs,
    };
  }

  protected getItemClass(item: any) {
    return `item-type-${this.model.getItemType(item)}`;
  }

  protected getItemStyle(item: any) {
    const startMs = this.model.getStartMs(item),
      endMs = this.model.getEndMs(item),
      totalDur = this.canvasModel.video.getDurationMs(),
      left = startMs / totalDur,
      right = endMs / totalDur,
      width = right - left;

    return {
      left: `${left * 100}%`,
      width: `${width * 100}%`,
    };
  }

  private getContainerWidth() {
    return (
      this.containerWidth || (this.containerWidth = this.itemContainer.nativeElement.getBoundingClientRect().width)
    );
  }
}
