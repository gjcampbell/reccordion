import { Component } from '@angular/core';
import { ShapeService } from 'app/services/shape.service';
import { ResizerService } from '../resizer.service';
import { PlayerCanvasModel } from '../player-canvas.model';
import { CommentLayer, IComment } from 'app/services/graphics.models';

export interface IColor {
  fg: string;
  bg: string;
}
export interface IShape {
  name: string;
  icon: string;
  type: string;
}

export const fgDark = '#141518',
  fgLight = '#ECF0F1',
  color = (bg: string, fg: string) => ({ bg, fg }),
  colorOptions = [
    color('#25BC99', fgDark),
    color('#36CD62', fgDark),
    color('#3796E1', fgDark),
    color('#9A56BD', fgDark),
    color('#344860', fgLight),
    color('#1FA083', fgLight),
    color('#2EAF53', fgLight),
    color('#2B7EBF', fgLight),
    color('#8D40B4', fgLight),
    color('#2C3D52', fgLight),
    color('#F0C600', fgDark),
    color('#E58000', fgDark),
    color('#E64D33', fgDark),
    color('#ECF0F1', fgDark),
    color('#95A5A6', fgDark),
    color('#F29E00', fgLight),
    color('#D25600', fgLight),
    color('#BF3A22', fgLight),
    color('#BDC3C8', fgDark),
    color('#7F8C8D', fgDark),
  ] as IColor[],
  shape = (name: string, icon: string, type: string = 'points') => ({ name, icon, type }),
  shapeOptions = [
    shape('rect', 'fa-square', 'rect'),
    shape('circle', 'fa-circle', 'circle'),
    shape('arrow', 'fa-long-arrow-alt-right'),
    shape('triangle-up', 'fa-play fa-rotate-270'),
    shape('triangle-right', 'fa-play'),
    shape('triangle-down', 'fa-play fa-rotate-90'),
    shape('triangle-left', 'fa-play fa-rotate-180'),
    shape('star', 'fa-star'),
  ] as IShape[];

@Component({
  selector: 'app-canvas-text-editor',
  templateUrl: './canvas-text-editor.component.html',
  styleUrls: ['./canvas-text-editor.component.scss'],
  providers: [ResizerService, ShapeService],
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

  protected handleShapeClick(comment: IComment, shape: IShape) {
    comment.shape = shape.type;
    comment.points = this.getShapePoints(shape.name, comment) || [];
  }

  private getShapePoints(name: string, comment: IComment) {
    switch (name) {
      case 'star':
        return this.shapeService.createStarPoints(5, 0.5, comment);
      case 'triangle-up':
        return this.shapeService.createPolygon(3, Math.PI, comment);
      case 'triangle-right':
        return this.shapeService.createPolygon(3, Math.PI / 2, comment);
      case 'triangle-down':
        return this.shapeService.createPolygon(3, 0, comment);
      case 'triangle-left':
        return this.shapeService.createPolygon(3, Math.PI * 1.5, comment);
    }
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
