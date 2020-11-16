import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Injectable,
  Input,
  NgZone,
  OnDestroy,
  Output,
  ViewChild,
} from '@angular/core';
import { CommentLayer, IBaseVideoLayer, IComment, IVideoLayer } from 'app/services/renderer.service';

@Injectable()
export class PlayerCanvasModel {
  public video: IBaseVideoLayer;
  public layers: IVideoLayer[];
  public height: number;
  public width: number;
  public selection: any[] = [];
  public ctx: CanvasRenderingContext2D;
  public isSelected(value: any) {
    return this.selection.includes(value);
  }
  public select(value: any) {
    this.selection.splice(0, Infinity, value);
  }
}

@Component({
  selector: 'app-player-canvas',
  template: `
    <canvas #cvs [height]="model.height" [width]="model.width" (click)="handleClick()"></canvas>
    <app-canvas-text-editor></app-canvas-text-editor>
  `,
  styles: [
    `
      :host {
        position: absolute;
        display: block;
        width: 100%;
        height: 100%;
      }
    `,
  ],
  providers: [PlayerCanvasModel],
})
export class PlayerCanvasComponent implements AfterViewInit, OnDestroy {
  private destroyed = false;

  @ViewChild('cvs')
  public cvs: ElementRef<HTMLCanvasElement>;

  @Output()
  public clicked = new EventEmitter<void>();

  @Input()
  public set layers(value: IVideoLayer[]) {
    this.model.layers = value;
  }

  @Input()
  public set height(value: number) {
    this.model.height = value;
  }

  @Input()
  public set width(value: number) {
    this.model.width = value;
  }

  @Input()
  public set video(value: IBaseVideoLayer) {
    this.model.video = value;
  }

  constructor(private readonly zone: NgZone, protected readonly model: PlayerCanvasModel) {}
  public ngOnDestroy(): void {
    this.destroyed = true;
  }

  public ngAfterViewInit(): void {
    this.start();
  }

  private start() {
    if (this.cvs.nativeElement) {
      this.model.ctx = this.cvs.nativeElement.getContext('2d');
      this.startCanvas();
    }
  }

  public handleClick() {
    if (this.model.selection.length) {
      this.model.selection.splice(0, Infinity);
    } else {
      this.clicked.emit();
    }
  }

  private startCanvas() {
    this.zone.runOutsideAngular(() => {
      const redraw = () => {
        this.draw();
        if (!this.destroyed) {
          window.requestAnimationFrame(redraw);
        }
      };
      redraw();
    });
  }

  private draw() {
    const { ctx, layers, video } = this.model;
    ctx.clearRect(0, 0, 2000, 2000);
    for (const layer of layers) {
      layer.drawFrame(video.getCurrTimeMs(), ctx);
    }
  }
}

interface IInitData {
  pageX: number;
  pageY: number;
  pos: { x: number; y: number };
  width: number;
  height: number;
}

@Injectable()
export class ResizerService {
  private minSize = 50;

  public resize(dir: string, model: IResizeable, origEvt: MouseEvent, bounds: { width: number; height: number }) {
    if (dir in this) {
      this[dir](model, origEvt, bounds);
    }
  }

  public nw(model: IResizeable, origEvt: MouseEvent, bounds: { width: number; height: number }) {
    const init = this.init(model, origEvt),
      maxX = model.position.x + model.width,
      maxY = model.position.y + model.height;
    this.bind(init, (deltX, deltY) => {
      const newX = Math.max(0, Math.min(maxX - this.minSize, init.pos.x + deltX)),
        newY = Math.max(0, Math.min(maxY - this.minSize, init.pos.y + deltY)),
        newW = Math.max(this.minSize, Math.min(maxX, init.width - deltX)),
        newH = Math.max(this.minSize, Math.min(maxY, init.height - deltY));

      this.updateModel(model, { newX, newY, newW, newH });
    });
  }

  public n(model: IResizeable, origEvt: MouseEvent, bounds: { width: number; height: number }) {
    const init = this.init(model, origEvt),
      maxY = model.position.y + model.height;
    this.bind(init, (deltX, deltY) => {
      const newY = Math.max(0, Math.min(maxY - this.minSize, init.pos.y + deltY)),
        newH = Math.max(this.minSize, Math.min(maxY, init.height - deltY));

      this.updateModel(model, { newY, newH });
    });
  }

  public ne(model: IResizeable, origEvt: MouseEvent, bounds: { width: number; height: number }) {
    const init = this.init(model, origEvt),
      maxW = bounds.width - model.position.x,
      maxY = model.position.y + model.height;
    this.bind(init, (deltX, deltY) => {
      const newY = Math.max(0, Math.min(maxY - this.minSize, init.pos.y + deltY)),
        newW = Math.max(this.minSize, Math.min(maxW, init.width + deltX)),
        newH = Math.max(this.minSize, Math.min(maxY, init.height - deltY));

      this.updateModel(model, { newY, newW, newH });
    });
  }

  public e(model: IResizeable, origEvt: MouseEvent, bounds: { width: number; height: number }) {
    const init = this.init(model, origEvt),
      maxW = bounds.width - model.position.x;
    this.bind(init, (deltX, deltY) => {
      const newW = Math.max(this.minSize, Math.min(maxW, init.width + deltX));

      this.updateModel(model, { newW });
    });
  }

  public se(model: IResizeable, origEvt: MouseEvent, bounds: { width: number; height: number }) {
    const init = this.init(model, origEvt),
      maxW = bounds.width - model.position.x,
      maxH = bounds.height - model.position.y;
    this.bind(init, (deltX, deltY) => {
      const newW = Math.max(this.minSize, Math.min(maxW, init.width + deltX)),
        newH = Math.max(this.minSize, Math.min(maxH, init.height + deltY));

      this.updateModel(model, { newW, newH });
    });
  }

  public s(model: IResizeable, origEvt: MouseEvent, bounds: { width: number; height: number }) {
    const init = this.init(model, origEvt),
      maxH = bounds.height - model.position.y;
    this.bind(init, (deltX, deltY) => {
      const newH = Math.max(this.minSize, Math.min(maxH, init.height + deltY));

      this.updateModel(model, { newH });
    });
  }

  public sw(model: IResizeable, origEvt: MouseEvent, bounds: { width: number; height: number }) {
    const init = this.init(model, origEvt),
      maxX = model.position.x + model.width,
      maxH = bounds.height - model.position.y;
    this.bind(init, (deltX, deltY) => {
      const newX = Math.max(0, Math.min(maxX - this.minSize, init.pos.x + deltX)),
        newW = Math.max(this.minSize, Math.min(maxX, init.width - deltX)),
        newH = Math.max(this.minSize, Math.min(maxH, init.height + deltY));

      this.updateModel(model, { newX, newW, newH });
    });
  }

  public w(model: IResizeable, origEvt: MouseEvent, bounds: { width: number; height: number }) {
    const init = this.init(model, origEvt),
      maxX = model.position.x + model.width;
    this.bind(init, (deltX, deltY) => {
      const newX = Math.max(0, Math.min(maxX - this.minSize, init.pos.x + deltX)),
        newW = Math.max(this.minSize, Math.min(maxX, init.width - deltX));

      this.updateModel(model, { newX, newW });
    });
  }

  private updateModel(model: IResizeable, update: { newX?: number; newY?: number; newW?: number; newH?: number }) {
    if ('newX' in update) {
      model.position.x = update.newX;
    }
    if ('newY' in update) {
      model.position.y = update.newY;
    }
    if ('newW' in update) {
      model.width = update.newW;
    }
    if ('newH' in update) {
      model.height = update.newH;
    }
  }

  private init(model: IResizeable, origEvt: MouseEvent): IInitData {
    return {
      pageX: origEvt.pageX,
      pageY: origEvt.pageY,
      pos: { ...model.position },
      width: model.width,
      height: model.height,
    };
  }

  private bind(init: IInitData, moveHandler: (deltX: number, deltY: number) => void) {
    const mouseup = () => {
        window.removeEventListener('mouseup', mouseup);
        window.removeEventListener('mousemove', mousemove);
      },
      mousemove = (evt: MouseEvent) => {
        const deltX = evt.pageX - init.pageX,
          deltY = evt.pageY - init.pageY;

        moveHandler(deltX, deltY);
      };
    window.addEventListener('mouseup', mouseup);
    window.addEventListener('mousemove', mousemove);
  }
}

interface IColor {
  fg: string;
  bg: string;
}

const fgDark = '#141518',
  fgLight = '#ECF0F1',
  color = (bg: string, fg: string) => ({ bg, fg }),
  colorOptions = [
    color('#7F8C8D', fgDark),
    color('#BDC3C8', fgDark),
    color('#BF3A22', fgDark),
    color('#D25600', fgDark),
    color('#F29E00', fgLight),
    color('#95A5A6', fgLight),
    color('#ECF0F1', fgLight),
    color('#E64D33', fgLight),
    color('#E58000', fgLight),
    color('#F0C600', fgLight),
    color('#2C3D52', fgDark),
    color('#8D40B4', fgDark),
    color('#2B7EBF', fgDark),
    color('#2EAF53', fgDark),
    color('#1FA083', fgDark),
    color('#344860', fgLight),
    color('#9A56BD', fgLight),
    color('#3796E1', fgLight),
    color('#36CD62', fgDark),
    color('#25BC99', fgDark),
  ] as IColor[];

@Component({
  selector: 'app-canvas-text-editor',
  template: `
    <ng-container *ngFor="let layer of getCommentLayers()">
      <div
        class="comment"
        *ngFor="let comment of layer.getComments()"
        [class.selected]="model.isSelected(comment)"
        [style]="getStyle(layer, comment)"
      >
        <div
          class="comment-dragbox"
          (click)="handleClick(comment)"
          (mousedown)="handleMousedown(comment, $event)"
        ></div>
        <ng-container *ngIf="model.isSelected(comment)">
          <div class="tools tools-top">
            <button mat-icon-button><i class="fa fa-fw fa-bold"></i></button>
          </div>
          <div
            *ngFor="let resizer of resizers"
            [class]="'resizer resizer-' + resizer"
            (mousedown)="handleResizerMousedown(comment, $event, resizer)"
          ></div>
          <div class="tools tools-bottom">
            <textarea [(ngModel)]="comment.text"></textarea>
          </div>
        </ng-container>
      </div>
    </ng-container>
  `,
  styles: [
    `
      .comment {
        position: absolute;
        user-select: none;
      }
      .comment-dragbox.selected,
      .comment-dragbox:hover {
        background: #27b3;
      }
      .comment-dragbox {
        width: 100%;
        height: 100%;
      }
      .resizer {
        position: absolute;
        width: 10px;
        height: 10px;
        box-sizing: border-box;
        border-radius: 2px;
        border: solid 1px #000;
        background: #fff;
      }
      .resizer-nw {
        left: -10px;
        top: -10px;
        cursor: nw-resize;
      }
      .resizer-n {
        left: calc(50% - 5px);
        top: -10px;
        cursor: n-resize;
      }
      .resizer-ne {
        right: -10px;
        top: -10px;
        cursor: ne-resize;
      }
      .resizer-e {
        right: -10px;
        top: calc(50% - 5px);
        cursor: e-resize;
      }
      .resizer-se {
        right: -10px;
        bottom: -10px;
        cursor: se-resize;
      }
      .resizer-s {
        left: calc(50% - 5px);
        bottom: -10px;
        cursor: s-resize;
      }
      .resizer-sw {
        left: -10px;
        bottom: -10px;
        cursor: sw-resize;
      }
      .resizer-w {
        left: -10px;
        top: calc(50% - 5px);
        cursor: w-resize;
      }
      .tools {
        border-radius: 3px;
        position: absolute;
        background: #000d;
      }
      .tools-top {
        bottom: calc(100% + 15px);
      }
      .tools-bottom {
        width: 100%;
        padding: 4px;
        top: calc(100% + 15px);
      }
      .tools-bottom textarea {
        min-height: 65px;
        width: 100%;
        box-sizing: border-box;
      }
    `,
  ],
  providers: [ResizerService],
})
export class CanvasTextEditorComponent {
  protected resizers = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];

  constructor(protected readonly model: PlayerCanvasModel, private readonly resizerSvc: ResizerService) {}

  protected getCommentLayers() {
    return this.model.layers.filter((l) => l instanceof CommentLayer) as CommentLayer[];
  }

  protected handleClick(comment: IComment, evt: MouseEvent) {
    this.model.select(comment);
    evt.stopImmediatePropagation();
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
          newY = Math.min(this.model.height - comment.height, Math.max(0, startPos.y + deltY));

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

interface IResizeable {
  position: { x: number; y: number };
  width: number;
  height: number;
}
