import { Component } from '@angular/core';
import { ShapeService, shapeOptions, colorOptions, IColor, IShapeOption } from 'app/services/shape.service';
import { ResizerService } from '../resizer.service';
import { PlayerCanvasModel } from '../player-canvas.model';
import { CommentLayer, IComment, setFontSize } from 'app/services/graphics.models';

@Component({
  selector: 'app-canvas-text-editor',
  templateUrl: './canvas-text-editor.component.html',
  styleUrls: ['./canvas-text-editor.component.scss'],
  providers: [ResizerService],
})
export class CanvasTextEditorComponent {
  protected resizers = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
  protected shapeOptions = shapeOptions;
  protected colorOptions = colorOptions;

  constructor(
    protected readonly model: PlayerCanvasModel,
    private readonly resizerSvc: ResizerService,
    private readonly shapeService: ShapeService
  ) {}

  protected getCommentLayers() {
    return this.model.layers.filter((l) => l instanceof CommentLayer) as CommentLayer[];
  }

  protected delete(comment: IComment, layer: CommentLayer) {
    layer.removeComment(comment);
  }

  protected handleClick(comment: IComment, evt: MouseEvent) {
    this.model.select(comment);
    evt.stopImmediatePropagation();
  }

  protected handleBgClick(comment: IComment, color: IColor) {
    comment.background = color.bg;
    comment.fillColor = color.fg;
  }

  protected handleShapeClick(comment: IComment, shapeOption: IShapeOption) {
    const { points, shape, shapeData } = this.shapeService.createShape(shapeOption, comment);

    comment.shape = shape;
    comment.points = points;
    comment.shapeData = shapeData;
  }

  protected handleToggleShadowClick(comment: IComment) {
    comment.shadowBlur = comment.shadowBlur ? 0 : 15;
  }

  protected handleBorderColorClick(comment: IComment, color: string) {
    comment.borderColor = color;
    if (!comment.borderWidth) {
      comment.borderWidth = 4;
    }
  }

  protected handleBorderWidthClick(comment: IComment, width: number) {
    comment.borderWidth = width;
    if (comment.borderColor === '#0000') {
      comment.borderColor = '#000';
    }
  }

  protected incrementFontSize(comment: IComment, dir: number) {
    const newSize = Math.max(1, Math.min(200, comment.fontSize + dir));
    setFontSize(comment, newSize);
  }

  protected reorder(comment: IComment, layer: CommentLayer, dir: number) {
    layer.reorder(comment, dir);
  }

  protected handleMousedown(comment: IComment, origEvt: MouseEvent) {
    const startPos = { ...comment.position },
      { pageX, pageY } = origEvt,
      mouseup = () => {
        window.removeEventListener('mousemove', mousemove);
        window.removeEventListener('mouseup', mouseup);
      },
      mousemove = (evt: MouseEvent) => {
        const deltX = evt.pageX - pageX,
          deltY = evt.pageY - pageY,
          newX = Math.min(this.model.width - comment.width, Math.max(0, startPos.x + deltX)),
          newY = Math.min(this.model.height - comment.height, Math.max(0, startPos.y + deltY)),
          actualDeltX = newX - comment.position.x,
          actualDeltY = newY - comment.position.y;
        for (let i = 0; i < comment.points.length; i++) {
          comment.points[i].move(actualDeltX, actualDeltY);
        }
        comment.position.x = newX;
        comment.position.y = newY;
      };

    window.addEventListener('mousemove', mousemove);
    window.addEventListener('mouseup', mouseup);
  }

  protected handleResizerMousedown(comment: IComment, evt: MouseEvent, resizer: string) {
    this.resizerSvc.resize(resizer, comment, evt, this.model);
    evt.stopImmediatePropagation();
  }

  protected getStyle(layer: CommentLayer, comment: IComment) {
    return {
      display:
        this.model.video.getCurrTimeMs() >= comment.startMs && this.model.video.getCurrTimeMs() <= comment.endMs
          ? 'block'
          : 'none',
      width: comment.width + 'px',
      height: comment.height + 'px',
      left: comment.position.x + 'px',
      top: comment.position.y + 'px',
    };
  }
}
