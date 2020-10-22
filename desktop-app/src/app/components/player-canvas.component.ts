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
import { IVideoLayer } from 'app/services/renderer.service';

@Component({
  selector: 'app-player-canvas',
  template: `<canvas #cvs [height]="height" [width]="width" (click)="handleClick()"></canvas>`,
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
      this.startRenderLoop();
    }
  }

  public handleClick() {
    this.clicked.emit();
  }

  public setTime(timeMs: number) {
    this.timeMs = timeMs;
  }

  private startRenderLoop() {
    this.zone.runOutsideAngular(() => {
      let lastTimeMs = -1;
      const redraw = () => {
        if (this.timeMs !== lastTimeMs) {
          this.draw();
          //lastTimeMs = this.timeMs;
        }
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
