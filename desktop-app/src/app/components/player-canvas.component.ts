import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  NgZone,
  OnDestroy,
  Output,
  ViewChild,
} from '@angular/core';
import { IBaseVideoLayer, IVideoLayer } from 'app/services/video.models';
import { PlayerCanvasModel } from './player-canvas.model';

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
  public set height(value: number) {
    this.model.height = value;
    this.updateDim();
  }

  @Input()
  public set width(value: number) {
    this.model.width = value;
    this.updateDim();
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
    if (this.model.hasSelection()) {
      this.model.clearSelection();
    } else {
      this.clicked.emit();
    }
  }

  private startCanvas() {
    this.zone.runOutsideAngular(() => {
      const redraw = async () => {
        await this.draw();
        if (!this.destroyed) {
          window.requestAnimationFrame(redraw);
        }
      };
      redraw();
    });
  }

  private async draw() {
    const { ctx, layers, video } = this.model;
    ctx.save();
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    ctx.clearRect(0, 0, 2000, 2000);
    for (const layer of layers) {
      await layer.drawFrame(video.getCurrTimeMs(), ctx);
    }
    ctx.restore();
  }
}
