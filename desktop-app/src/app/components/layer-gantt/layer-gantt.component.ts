import { AfterViewInit, Component, ElementRef, Input, OnDestroy, ViewChild } from '@angular/core';
import { EffectLayer } from 'app/services/effects.models';
import { FastNgUpdateService } from 'app/services/fast-ng-update.service';
import { CommentLayer } from 'app/services/graphics.models';
import { WebmBlobSeriesLayer } from 'app/services/renderer.service';
import { FrameSeriesLayer, IVideoLayer } from 'app/services/video.models';
import { PlayerCanvasModel } from '../player-canvas.model';
import { EffectGanttRow, FrameSeriesGanttRow, GanttRow, ShapeGanttRow, VideoGanttRow } from './gantt-row.component';
import { MatDialog } from '@angular/material/dialog';
import { DurationEditorDialog } from './duration-editor-dialog.component';

@Component({
  selector: 'app-layer-gantt',
  templateUrl: './layer-gantt.component.html',
  styleUrls: ['./layer-gantt.component.scss'],
})
export class LayerGanttComponent implements OnDestroy, AfterViewInit {
  private layerModelLookup = new Map<IVideoLayer, GanttRow<any>>();
  private disposer: () => void;

  @ViewChild('timeLabel', { static: true })
  protected timeLabel: ElementRef<HTMLDivElement>;
  @ViewChild('totalLabel', { static: true })
  protected totalLabel: ElementRef<HTMLDivElement>;

  constructor(
    protected readonly canvasModel: PlayerCanvasModel,
    private readonly updater: FastNgUpdateService,
    private readonly dialog: MatDialog
  ) {}

  ngOnDestroy() {
    this.disposer();
  }

  ngAfterViewInit() {
    this.disposer = this.updater.addUpdateListener(() => this.updateLabels());
  }

  protected handleEnterDuration() {
    const dialog = this.dialog.open(DurationEditorDialog, { data: this.canvasModel });
    dialog.afterClosed().subscribe((durMs: number) => {
      if (durMs) {
        this.canvasModel.video.setDurationMs(durMs);
      }
    });
  }

  private updateLabels() {
    this.updateFrameLabel();
    this.updateTimeLabel();
  }

  private updateFrameLabel() {
    if (this.totalLabel.nativeElement) {
      const time = this.canvasModel.video.getDurationMs();
      this.totalLabel.nativeElement.textContent = this.canvasModel.formatAsFrame(time);
    }
  }

  private updateTimeLabel() {
    if (this.timeLabel.nativeElement) {
      const time = this.canvasModel.video.getCurrTimeMs();
      this.timeLabel.nativeElement.textContent = this.canvasModel.formatAsFrame(time);
    }
  }

  protected togglePlay() {
    if (!this.canvasModel.video.isPlaying()) {
      this.canvasModel.video.play();
    } else {
      this.canvasModel.video.pause();
    }
  }

  protected getLayerModel(layer: IVideoLayer) {
    let result = this.layerModelLookup.get(layer);
    if (!result) {
      result = this.createGanttRowModel(layer);
      this.layerModelLookup.set(layer, result);
    }
    return result;
  }

  private createGanttRowModel(layer: IVideoLayer) {
    if (layer instanceof WebmBlobSeriesLayer) {
      return new VideoGanttRow(layer);
    } else if (layer instanceof FrameSeriesLayer) {
      return new FrameSeriesGanttRow(layer);
    } else if (layer instanceof EffectLayer) {
      return new EffectGanttRow(layer);
    } else if (layer instanceof CommentLayer) {
      return new ShapeGanttRow(layer);
    }
  }
}
