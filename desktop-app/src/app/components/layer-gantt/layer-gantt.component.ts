import { Component, Input } from '@angular/core';
import { EffectLayer } from 'app/services/effects.models';
import { CommentLayer } from 'app/services/graphics.models';
import { WebmBlobSeriesLayer } from 'app/services/renderer.service';
import { IVideoLayer } from 'app/services/video.models';
import { PlayerCanvasModel } from '../player-canvas.model';
import { EffectGanttRow, GanttRow, ShapeGanttRow, VideoGanttRow } from './gantt-row.component';

@Component({
  selector: 'app-layer-gantt',
  templateUrl: './layer-gantt.component.html',
  styleUrls: ['./layer-gantt.component.scss'],
})
export class LayerGanttComponent {
  private layerModelLookup = new Map<IVideoLayer, GanttRow<any>>();

  constructor(protected readonly canvasModel: PlayerCanvasModel) {}

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
    } else if (layer instanceof EffectLayer) {
      return new EffectGanttRow(layer);
    } else if (layer instanceof CommentLayer) {
      return new ShapeGanttRow(layer);
    }
  }
}
