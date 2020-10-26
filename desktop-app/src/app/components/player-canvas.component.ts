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
import { CommentLayer, IBaseVideoLayer, IComment, IVideoLayer } from 'app/services/renderer.service';

@Component({
  selector: 'app-player-canvas',
  template: `
    <canvas #cvs [height]="height" [width]="width" (click)="handleClick()"></canvas>
    <app-canvas-text-editor [time]="time" [layers]="layers" [ctx]="drawingContext"></app-canvas-text-editor>
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
  private ctx: CanvasRenderingContext2D;
  private timeMs = 0;
  private destroyed = false;

  @ViewChild('cvs')
  public cvs: ElementRef<HTMLCanvasElement>;

  @Output()
  public clicked = new EventEmitter<void>();

  @Input()
  public layers: IVideoLayer[] = [];

  @Input()
  public height: number;

  @Input()
  public width: number;

  @Input()
  public video: IBaseVideoLayer;

  public get time() {
    return this.timeMs;
  }

  public get drawingContext() {
    return this.ctx;
  }

  constructor(private readonly zone: NgZone) {}
  public ngOnDestroy(): void {
    this.destroyed = true;
  }

  public ngAfterViewInit(): void {
    this.start();
  }

  private start() {
    if (this.cvs.nativeElement) {
      this.ctx = this.cvs.nativeElement.getContext('2d');
      this.startCanvas();
    }
  }

  public handleClick() {
    this.clicked.emit();
  }

  public setTime(timeMs: number) {
    this.timeMs = timeMs;
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
    const { ctx } = this;
    ctx.clearRect(0, 0, 2000, 2000);
    for (const layer of this.layers) {
      layer.drawFrame(this.timeMs, ctx);
    }
  }
}

@Component({
  selector: 'app-canvas-text-editor',
  template: `
    <ng-container *ngFor="let layer of _layers">
      <div class="comment" *ngFor="let comment of layer.getComments()" [style]="{}"></div>
    </ng-container>
  `,
  styles: [
    `
      .comment {
        position: absolute;
      }
    `,
  ],
})
export class CanvasTextEditorComponent {
  private _time = 0;
  protected _layers: CommentLayer[];

  @Input()
  public set time(ms: number) {
    this._time = ms;
  }

  @Input()
  public set layers(layers: IVideoLayer[]) {
    this._layers = layers.filter((l) => l instanceof CommentLayer) as CommentLayer[];
  }

  @Input()
  public ctx: CanvasRenderingContext2D;

  protected getDim(layer: CommentLayer, comment: IComment) {
    //layer.
  }
}
