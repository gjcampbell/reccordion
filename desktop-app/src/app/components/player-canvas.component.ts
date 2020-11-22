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
import { NgModelGroup } from '@angular/forms';
import {
  absPt,
  CommentLayer,
  diffPt,
  dividePt,
  IBaseVideoLayer,
  IComment,
  IVideoLayer,
  Pt,
  ShapePoint,
  ShapeService,
} from 'app/services/renderer.service';

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
    <canvas
      #cvs
      [width]="canvasWidth"
      [height]="canvasHeight"
      (click)="handleClick()"
      [style.width.px]="model.width"
      [style.height.px]="model.height"
    ></canvas>
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
  protected canvasWidth: number;
  protected canvasHeight: number;

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
    this.updateDim();
  }

  @Input()
  public set width(value: number) {
    this.model.width = value;
    this.updateDim();
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

  private updateDim() {
    this.canvasHeight = this.model.height * window.devicePixelRatio;
    this.canvasWidth = this.model.width * window.devicePixelRatio;
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
    ctx.save();
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    ctx.clearRect(0, 0, 2000, 2000);
    for (const layer of layers) {
      layer.drawFrame(video.getCurrTimeMs(), ctx);
    }
    ctx.restore();
  }
}

interface IInitData {
  pageX: number;
  pageY: number;
  pos: { x: number; y: number };
  width: number;
  height: number;
  left: number;
  right: number;
  top: number;
  bottom: number;
}

interface IResizeable {
  position: { x: number; y: number };
  width: number;
  height: number;
  points: ShapePoint[];
}

@Injectable()
export class ResizerService {
  private minSize = 50;

  public resize(dir: string, model: IResizeable, origEvt: MouseEvent, bounds: { width: number; height: number }) {
    if (dir in this) {
      this[dir](model, origEvt, bounds);
    }
  }

  private scalePoints(model: IResizeable, origin: Pt, scale: Pt) {
    for (const pt of model.points) {
      pt.scale(origin, scale);
    }
  }

  public nw(model: IResizeable, origEvt: MouseEvent, bounds: { width: number; height: number }) {
    const init = this.init(model, origEvt),
      scaleOrigin = { x: init.right, y: init.bottom },
      maxX = init.right - this.minSize,
      maxY = init.bottom - this.minSize;
    this.bind(init, (deltX, deltY) => {
      const newX = Math.max(0, Math.min(maxX, init.pos.x + deltX)),
        newY = Math.max(0, Math.min(maxY, init.pos.y + deltY)),
        newW = Math.max(this.minSize, Math.min(init.right, init.width - deltX)),
        newH = Math.max(this.minSize, Math.min(init.bottom, init.height - deltY)),
        scaleDenom = diffPt(model.position, scaleOrigin),
        scaleNum = diffPt({ x: newX, y: newY }, scaleOrigin),
        scale = dividePt(scaleNum, scaleDenom);

      this.scalePoints(model, scaleOrigin, scale);
      this.updateModel(model, { newX, newY, newW, newH });
    });
  }

  public n(model: IResizeable, origEvt: MouseEvent, bounds: { width: number; height: number }) {
    const init = this.init(model, origEvt),
      scaleOrigin = { x: model.position.x, y: init.bottom },
      maxY = init.bottom - this.minSize;
    this.bind(init, (deltX, deltY) => {
      const newY = Math.max(0, Math.min(maxY, init.pos.y + deltY)),
        newH = Math.max(this.minSize, Math.min(init.bottom, init.height - deltY)),
        scale = newH / model.height;

      this.scalePoints(model, scaleOrigin, { x: 1, y: scale });
      this.updateModel(model, { newY, newH });
    });
  }

  public ne(model: IResizeable, origEvt: MouseEvent, bounds: { width: number; height: number }) {
    const init = this.init(model, origEvt),
      scaleOrigin = { x: init.left, y: init.bottom },
      maxY = init.bottom - this.minSize,
      maxW = bounds.width - init.left;
    this.bind(init, (deltX, deltY) => {
      const newY = Math.max(0, Math.min(maxY, init.pos.y + deltY)),
        newW = Math.max(this.minSize, Math.min(maxW, init.width + deltX)),
        newH = Math.max(this.minSize, Math.min(init.bottom, init.height - deltY)),
        scaleDenom = { x: model.width, y: model.position.y - scaleOrigin.y },
        scaleNum = { x: newW, y: newY - scaleOrigin.y },
        scale = dividePt(scaleNum, scaleDenom);

      this.scalePoints(model, scaleOrigin, scale);
      this.updateModel(model, { newY, newW, newH });
    });
  }

  public e(model: IResizeable, origEvt: MouseEvent, bounds: { width: number; height: number }) {
    const init = this.init(model, origEvt),
      scaleOrigin = { x: init.left, y: init.top },
      maxW = bounds.width - init.left;
    this.bind(init, (deltX, deltY) => {
      const newW = Math.max(this.minSize, Math.min(maxW, init.width + deltX)),
        scale = newW / model.width;

      this.scalePoints(model, scaleOrigin, { x: scale, y: 1 });
      this.updateModel(model, { newW });
    });
  }

  public se(model: IResizeable, origEvt: MouseEvent, bounds: { width: number; height: number }) {
    const init = this.init(model, origEvt),
      maxW = bounds.width - model.position.x,
      maxH = bounds.height - model.position.y,
      scaleOrigin = { ...model.position };
    this.bind(init, (deltX, deltY) => {
      const newW = Math.max(this.minSize, Math.min(maxW, init.width + deltX)),
        newH = Math.max(this.minSize, Math.min(maxH, init.height + deltY)),
        scaleDenom = { x: model.width, y: model.height },
        scaleNum = { x: newW, y: newH },
        scale = dividePt(scaleNum, scaleDenom);

      this.scalePoints(model, scaleOrigin, scale);
      this.updateModel(model, { newW, newH });
    });
  }

  public s(model: IResizeable, origEvt: MouseEvent, bounds: { width: number; height: number }) {
    const init = this.init(model, origEvt),
      maxH = bounds.height - model.position.y,
      scaleOrigin = { ...model.position };
    this.bind(init, (deltX, deltY) => {
      const newH = Math.max(this.minSize, Math.min(maxH, init.height + deltY)),
        scale = newH / model.height;

      this.scalePoints(model, scaleOrigin, { x: 1, y: scale });
      this.updateModel(model, { newH });
    });
  }

  public sw(model: IResizeable, origEvt: MouseEvent, bounds: { width: number; height: number }) {
    const init = this.init(model, origEvt),
      maxX = model.position.x + model.width,
      maxH = bounds.height - model.position.y,
      scaleOrigin = { x: init.right, y: init.top };
    this.bind(init, (deltX, deltY) => {
      const newX = Math.max(0, Math.min(maxX - this.minSize, init.pos.x + deltX)),
        newW = Math.max(this.minSize, Math.min(maxX, init.width - deltX)),
        newH = Math.max(this.minSize, Math.min(maxH, init.height + deltY)),
        scaleDenom = { x: model.position.x - scaleOrigin.x, y: model.height },
        scaleNum = { x: newX - scaleOrigin.x, y: newH },
        scale = dividePt(scaleNum, scaleDenom);

      this.scalePoints(model, scaleOrigin, scale);
      this.updateModel(model, { newX, newW, newH });
    });
  }

  public w(model: IResizeable, origEvt: MouseEvent, bounds: { width: number; height: number }) {
    const init = this.init(model, origEvt),
      maxX = model.position.x + model.width,
      scaleOrigin = { x: init.right, y: init.top };
    this.bind(init, (deltX, deltY) => {
      const newX = Math.max(0, Math.min(maxX - this.minSize, init.pos.x + deltX)),
        newW = Math.max(this.minSize, Math.min(maxX, init.width - deltX)),
        scaleDenom = model.position.x - scaleOrigin.x,
        scaleNum = newX - scaleOrigin.x,
        scale = scaleNum / scaleDenom;

      this.scalePoints(model, scaleOrigin, { x: scale, y: 1 });
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
      left: model.position.x,
      right: model.position.x + model.width,
      top: model.position.y,
      bottom: model.position.y + model.height,
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
interface IShape {
  name: string;
  icon: string;
  type: string;
}

const fgDark = '#141518',
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
            <button [matMenuTriggerFor]="shapeMenu" matTooltip="Select Shape">
              <i class="fa fa-fw fa-shapes"></i>
            </button>
            <mat-menu #shapeMenu="matMenu">
              <div class="shapes">
                <div *ngFor="let shape of shapeOptions" class="shape" (click)="handleShapeClick(comment, shape)">
                  <i [class]="'fa fa-fw ' + shape.icon"></i>
                </div>
              </div>
            </mat-menu>
            <button [matMenuTriggerFor]="colorMenu" matTooltip="Select Background">
              <i
                class="fa fa-fw color-picker"
                [style.color]="comment.background === '#0000' ? '#000' : comment.background"
                [class.fa-square]="comment.background !== '#0000'"
                [class.fa-ban]="comment.background === '#0000'"
              ></i>
            </button>
            <mat-menu #colorMenu="matMenu">
              <div class="colors bg-colors">
                <div class="color color-none" (click)="handleBgClick(comment, { bg: '#0000', fg: '#000' })">
                  No Background
                </div>
                <div
                  class="color"
                  (click)="handleBgClick(comment, { bg: '#000', fg: '#fff' })"
                  [style.backgroundColor]="'#000'"
                  [style.color]="'#fff'"
                >
                  text
                </div>
                <div
                  class="color"
                  (click)="handleBgClick(comment, { bg: '#fff', fg: '#000' })"
                  [style.backgroundColor]="'#fff'"
                >
                  text
                </div>
                <div
                  *ngFor="let color of colorOptions"
                  (click)="handleBgClick(comment, color)"
                  class="color"
                  [style.backgroundColor]="color.bg"
                  [style.color]="color.fg"
                >
                  text
                </div>
              </div>
            </mat-menu>
            <button [matMenuTriggerFor]="borderMenu" matTooltip="Select Border">
              <i
                class="fa fa-fw color-picker"
                [class.fa-square]="comment.borderColor !== '#0000'"
                [class.fa-ban]="comment.borderColor === '#0000'"
                [style.color]="comment.borderColor === '#0000' ? '#000' : comment.borderColor"
              ></i>
            </button>
            <mat-menu #borderMenu="matMenu">
              <div class="borders">
                <div class="border-widths">
                  <div class="width" (click)="handleBorderWidthClick(comment, 8)">
                    <div [style.height.px]="8"></div>
                  </div>
                  <div class="width" (click)="handleBorderWidthClick(comment, 4)">
                    <div [style.height.px]="4"></div>
                  </div>
                  <div class="width" (click)="handleBorderWidthClick(comment, 2)">
                    <div [style.height.px]="2"></div>
                  </div>
                  <div class="width" (click)="handleBorderWidthClick(comment, 1)">
                    <div [style.height.px]="1"></div>
                  </div>
                  <div class="width" (click)="handleBorderWidthClick(comment, 0.5)">
                    <div [style.height.px]="0.5"></div>
                  </div>
                </div>
                <div class="colors border-colors">
                  <div class="color color-none" (click)="handleBorderColorClick(comment, '#0000')">No Border</div>
                  <div
                    class="color"
                    (click)="handleBorderColorClick(comment, '#000')"
                    [style.backgroundColor]="'#000'"
                  ></div>
                  <div
                    class="color"
                    (click)="handleBorderColorClick(comment, '#fff')"
                    [style.backgroundColor]="'#fff'"
                  ></div>
                  <div
                    *ngFor="let color of colorOptions"
                    (click)="handleBorderColorClick(comment, color.bg)"
                    class="color"
                    [style.backgroundColor]="color.bg"
                    [style.color]="color.fg"
                  ></div>
                </div>
              </div>
            </mat-menu>
            <button
              matTooltip="Shadow"
              [class.active]="!!comment.shadowBlur"
              (click)="handleToggleShadowClick(comment)"
            >
              <i class="fa fa-fw fa-clone fa-rotate-270"></i>
            </button>
            <div class="sep"></div>
            <button
              mat
              (click)="comment.align = 'left'"
              [class.active]="comment.align === 'left'"
              matTooltip="Align Left"
            >
              <i class="fa fa-fw fa-align-left"></i>
            </button>
            <button
              mat
              (click)="comment.align = 'center'"
              [class.active]="comment.align === 'center'"
              matTooltip="Align Center"
            >
              <i class="fa fa-fw fa-align-center"></i>
            </button>
            <button
              mat
              (click)="comment.align = 'right'"
              [class.active]="comment.align === 'right'"
              matTooltip="Align Right"
            >
              <i class="fa fa-fw fa-align-right"></i>
            </button>
            <div class="sep"></div>
            <button
              mat
              (click)="comment.vAlign = 'top'"
              [class.active]="comment.vAlign === 'top'"
              matTooltip="Align Top"
            >
              <i class="fa fa-fw fa-grip-lines top"></i>
            </button>
            <button
              mat
              (click)="comment.vAlign = 'middle'"
              [class.active]="comment.vAlign === 'middle'"
              matTooltip="Align Middle"
            >
              <i class="fa fa-fw fa-grip-lines middle"></i>
            </button>
            <button
              mat
              (click)="comment.vAlign = 'bottom'"
              [class.active]="comment.vAlign === 'bottom'"
              matTooltip="Align Bottom"
            >
              <i class="fa fa-fw fa-grip-lines bottom"></i>
            </button>
            <div class="sep"></div>
            <button
              mat
              (click)="delete(comment, layer)"
              [class.active]="comment.vAlign === 'bottom'"
              matTooltip="Delete Comment"
            >
              <i class="fa fa-fw fa-trash"></i>
            </button>
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
      .shapes {
        display: grid;
        grid-template-columns: 1fr 1fr 1fr 1fr;
      }
      .shape {
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        border: solid 2px #0000;
      }
      .shape:hover {
        border-color: #000;
      }
      .shape i {
        font-size: 1.3rem;
      }
      .borders {
        display: flex;
      }
      .border-widths {
        display: grid;
        width: 45px;
        grid-template-rows: 1fr 1fr 1fr 1fr 1fr;
      }
      .border-widths .width {
        cursor: pointer;
        box-sizing: border-box;
        border: solid 2px #0000;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .border-widths .width div {
        background: #000;
        width: 27px;
      }
      .border-widths .width:hover {
        border-color: #000;
      }
      .color-picker {
        border: solid 1px #0008;
      }
      .colors {
        display: grid;
        grid-template-columns: 1fr 1fr 1fr 1fr 1fr;
        width: 225px;
      }
      .color {
        width: 100%;
        height: 100%;
        text-align: center;
        height: 25px;
        vertical-align: middle;
        cursor: pointer;
        box-sizing: border-box;
        border: solid 2px #0000;
      }
      .border-colors {
      }
      .color-none {
        grid-column-start: 1;
        grid-column-end: 4;
      }
      .color:hover {
        border: solid 2px #000;
      }
      .tools button.active {
        background: #8d40b4;
        color: #fff;
      }
      .fa-grip-lines.top {
        line-height: 0;
        vertical-align: top;
      }
      .fa-grip-lines.bottom {
        line-height: 0;
        vertical-align: bottom;
      }
      .tools {
        border-radius: 3px;
        position: absolute;
        background: #fffd;
        border: solid 1px #0003;
        display: flex;
      }
      .tools button {
        border: none;
        background: none;
        min-width: 30px;
        height: 25px;
        cursor: pointer;
      }
      .tools .sep {
        width: 1px;
        height: 25px;
        margin: 0 8px;
        background-color: #0003;
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
    `,
  ],
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
