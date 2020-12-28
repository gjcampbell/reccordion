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
  public resizers = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
  public shapeOptions = shapeOptions;
  public colorOptions = colorOptions;

  constructor(
    public readonly model: PlayerCanvasModel,
    private readonly resizerSvc: ResizerService,
    private readonly shapeService: ShapeService
  ) {}

  public getCommentLayers() {
    return this.model.layers.filter((l) => l instanceof CommentLayer) as CommentLayer[];
  }

  public delete(comment: IComment, layer: CommentLayer) {
    layer.removeComment(comment);
  }

  public handleClick(comment: IComment, evt: MouseEvent) {
    this.model.select(comment);
    evt.stopImmediatePropagation();
  }

  public handleBgClick(comment: IComment, color: IColor) {
    comment.background = color.bg;
    comment.fillColor = color.fg;
  }

  public handleShapeClick(comment: IComment, shapeOption: IShapeOption) {
    const { points, shape, shapeData } = this.shapeService.createShape(shapeOption, comment);

    comment.shape = shape;
    comment.points = points;
    comment.shapeData = shapeData;
  }

  public handleToggleShadowClick(comment: IComment) {
    comment.shadowBlur = comment.shadowBlur ? 0 : 15;
  }

  public handleBorderColorClick(comment: IComment, color: string) {
    comment.borderColor = color;
    if (!comment.borderWidth) {
      comment.borderWidth = 4;
    }
  }

  public handleBorderWidthClick(comment: IComment, width: number) {
    comment.borderWidth = width;
    if (comment.borderColor === '#0000') {
      comment.borderColor = '#000';
    }
  }

  public incrementFontSize(comment: IComment, dir: number) {
    const newSize = Math.max(1, Math.min(200, comment.fontSize + dir));
    setFontSize(comment, newSize);
  }

  public reorder(comment: IComment, layer: CommentLayer, dir: number) {
    layer.reorder(comment, dir);
  }

  public handleMousedown(comment: IComment, origEvt: MouseEvent) {
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

  public handleResizerMousedown(comment: IComment, evt: MouseEvent, resizer: string) {
    this.resizerSvc.resize(resizer, comment, evt, this.model);
    evt.stopImmediatePropagation();
  }

  public getStyle(layer: CommentLayer, comment: IComment) {
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
