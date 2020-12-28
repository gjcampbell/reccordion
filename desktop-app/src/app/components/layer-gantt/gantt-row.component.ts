import { Component, ElementRef, HostListener, Input, ViewChild } from '@angular/core';
import { CommentLayer, IComment } from 'app/services/graphics.models';
import { WebmBlobSeriesLayer } from 'app/services/renderer.service';
import { Effect, EffectLayer } from 'app/services/effects.models';
import { FrameSeries, FrameSeriesLayer, VideoTimeRange } from 'app/services/video.models';
import { PlayerCanvasModel } from '../player-canvas.model';

export interface GanttRow<ItemType> {
  canReorderItems: boolean;
  multiRow: boolean;
  show: boolean;
  getType(): string;
  getItems(): ItemType[];
  getStartMs(item: ItemType): number;
  setStartMs(item: ItemType, value: number): void;
  setOffsetMs(item: ItemType, value: number): void;
  setLengthMs(item: ItemType, value: number): void;
  getEndMs(item: ItemType): number;
  setEndMs(item: ItemType, value: number): void;
  getLabel(item: ItemType): string;
  getItemType(item: ItemType): string;
  getBg(item: ItemType): string;
  getFg(item: ItemType): string;
  getIcon(item: ItemType): string;
  getBorder(item: ItemType): string;
  getLineHeight(item: ItemType): string;
}

export abstract class BaseGanttRow<T extends { startMs: number; endMs: number }> implements GanttRow<T> {
  public abstract canReorderItems: boolean;
  public multiRow = false;
  public get show() {
    return true;
  }
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
  public setOffsetMs(item: T, value: number) {
    item.startMs = value;
  }
  public setLengthMs(item: T, value: number) {
    item.endMs = value;
  }
  public getEndMs(item: T) {
    return item.endMs;
  }
  public setEndMs(item: T, value: number) {
    item.endMs = value;
  }
  public getBg(item: T) {
    return '#B48D40';
  }
  public getFg(item: T) {
    return '#000';
  }
  public getBorder(item: T) {
    return 'none';
  }
  public getLineHeight(item: T) {
    return '25px';
  }
  public getIcon(item: T) {
    return '';
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
    return item.zoom ? 'Zoom' : '';
  }
  public getItemType(item: Effect): string {
    return item.zoom ? 'zoom' : '';
  }
}

export class VideoGanttRow extends BaseGanttRow<VideoTimeRange> {
  public canReorderItems = false;
  constructor(private readonly layer: WebmBlobSeriesLayer) {
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

export class FrameSeriesGanttRow extends BaseGanttRow<FrameSeries> {
  public canReorderItems = false;

  constructor(private readonly layer: FrameSeriesLayer) {
    super();
  }
  public getType() {
    return 'Video';
  }
  public getItems(): FrameSeries[] {
    return this.layer.getSeries();
  }
  public getLabel(item: FrameSeries) {
    return item.source.name;
  }
  public getItemType(item: FrameSeries) {
    return 'recording';
  }
  public setLengthMs(item: FrameSeries, value: number) {
    item.lengthMs = value - item.startMs + item.offsetMs;
  }
  public setEndMs(item: FrameSeries, value: number) {
    // noop
  }
  public setOffsetMs(item: FrameSeries, value: number) {
    const newOffset = value - item.startMs + item.offsetMs,
      offsetDelt = newOffset - item.offsetMs,
      safeDelt =
        item.offsetMs + offsetDelt > 0 || item.lengthMs - offsetDelt > item.getOriginalDuration()
          ? offsetDelt
          : item.offsetMs;
    item.offsetMs += safeDelt;
    item.startMs += safeDelt;
  }
  public getIcon(item: FrameSeries) {
    return item.source.icon;
  }
}

export class ShapeGanttRow extends BaseGanttRow<IComment> {
  public canReorderItems = true;
  public multiRow = true;
  public get show() {
    return this.layer.getComments().length > 0;
  }

  constructor(private readonly layer: CommentLayer) {
    super();
  }

  public getType() {
    return 'Shape';
  }
  public getItems(): IComment[] {
    return this.layer.getComments();
  }
  public getLabel(item: IComment) {
    return `${(item.shapeData && item.shapeData.ufName) || item.shape} ${item.text}`;
  }
  public getItemType(item: IComment) {
    return item.text ? 'text' : 'shape';
  }
  public getBg(item: IComment) {
    return item.background === '#0000' ? '#fff' : item.background;
  }
  public getFg(item: IComment) {
    return item.fillColor === '#0000' ? '#000' : item.fillColor;
  }
  public getBorder(item: IComment) {
    return `solid ${item.borderWidth}px ${item.borderColor}`;
  }
  public getLineHeight(item: IComment) {
    return `25px`;
  }
  public getIcon(item: IComment) {
    return item.shapeData ? item.shapeData.icon : '';
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
  public handleResize() {
    this.containerWidth = undefined;
  }

  public isSelected(value: any) {
    return this.canvasModel.isSelected(value);
  }

  public select(value: any) {
    this.canvasModel.select(value);
  }

  public handleItemMseDown(orig: MouseEvent, item: any) {
    const init = this.getInitDim(orig, item),
      maxX = init.containerW - init.item.w,
      widthMs = init.endMs - init.startMs,
      mousemove = (evt: MouseEvent) => {
        const delt = evt.screenX - init.mse.x,
          newX = Math.min(maxX, Math.max(0, delt + init.item.x)),
          startMs = (newX / init.containerW) * init.durMs,
          snappedStartMs = this.canvasModel.snapMsToFrame(startMs),
          endMs = startMs + widthMs,
          snappedEndMs = this.canvasModel.snapMsToFrame(endMs);

        this.model.setStartMs(item, snappedStartMs);
        this.model.setEndMs(item, snappedEndMs);
      },
      mouseup = () => {
        window.removeEventListener('mouseup', mouseup);
        window.removeEventListener('mousemove', mousemove);
      };

    window.addEventListener('mouseup', mouseup);
    window.addEventListener('mousemove', mousemove);
  }

  public handleLeftMseDown(orig: MouseEvent, item: any) {
    const init = this.getInitDim(orig, item),
      maxX = init.item.w + init.item.x,
      mousemove = (evt: MouseEvent) => {
        const delt = evt.screenX - init.mse.x,
          newX = Math.min(maxX, Math.max(0, delt + init.item.x)),
          startMs = (newX / init.containerW) * init.durMs,
          snappedMs = this.canvasModel.snapMsToFrame(startMs);

        this.model.setOffsetMs(item, snappedMs);
      },
      mouseup = () => {
        window.removeEventListener('mouseup', mouseup);
        window.removeEventListener('mousemove', mousemove);
      };

    window.addEventListener('mouseup', mouseup);
    window.addEventListener('mousemove', mousemove);
    orig.stopImmediatePropagation();
  }

  public handleRightMseDown(orig: MouseEvent, item: any) {
    const init = this.getInitDim(orig, item),
      maxW = init.containerW - init.item.x,
      mousemove = (evt: MouseEvent) => {
        const delt = evt.screenX - init.mse.x,
          newW = Math.min(maxW, Math.max(0, delt + init.item.w)),
          endMs = (newW / init.containerW) * init.durMs + init.startMs,
          snappedMs = this.canvasModel.snapMsToFrame(endMs);

        this.model.setLengthMs(item, snappedMs);
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

  public getItemClass(item: any) {
    return `item-type-${this.model.getItemType(item)}`;
  }

  public getItemStyle(item: any) {
    const startMs = this.model.getStartMs(item),
      endMs = this.model.getEndMs(item),
      totalDur = this.canvasModel.video.getDurationMs(),
      left = startMs / totalDur,
      right = endMs / totalDur,
      width = right - left;

    return {
      left: `${left * 100}%`,
      width: `${width * 100}%`,
      //background: this.model.getBg(item),
      //color: this.model.getFg(item),
      //border: this.model.getBorder(item),
      //lineHeight: this.model.getLineHeight(item),
    };
  }

  private getContainerWidth() {
    return (
      this.containerWidth || (this.containerWidth = this.itemContainer.nativeElement.getBoundingClientRect().width)
    );
  }
}
