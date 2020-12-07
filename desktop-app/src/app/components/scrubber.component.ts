import { Component, ElementRef, ViewChild } from '@angular/core';
import { PlayerCanvasModel } from './player-canvas.model';

@Component({
  selector: 'app-scrubber',
  template: `
    <div class="c-margin">
      <div class="c-container" #container>
        <div class="c-bar" [style.left]="getBarPos()" (mousedown)="handleBarMouseDown($event)">
          <div class="c-window" tabindex="0"></div>
        </div>
        <div></div>
      </div>
    </div>
    <div class="c-seekbar" (click)="handleSeekbarClick($event)"></div>
  `,
  styles: [
    `
      .c-seekbar {
        height: 20px;
        width: 100%;
      }
      .c-margin {
        display: block;
        box-sizing: border-box;
        bottom: 0;
        width: 100%;
        position: absolute;
        height: 100%;
      }
      .c-container {
        display: block;
        position: relative;
        width: 100%;
        height: 100%;
      }
      .c-bar {
        position: absolute;
        width: 1px;
        z-index: 1;
        height: 100000px;
        top: -2px;
      }
      .c-window {
        bottom: 0;
        height: 100%;
        position: absolute;
        border-width: 0 5px;
        border-style: solid;
        border-color: #0944;
        width: 1px;
        left: -5.5px;
        user-select: none;
        cursor: ew-resize;
        outline: none;
      }
      .c-window::after {
        content: '';
        display: block;
        height: 100%;
        width: 100%;
        border-left: dotted 1px #000;
      }
    `,
  ],
})
export class ScrubberComponent {
  protected hpadding = 16;

  public get layers() {
    return this.canvasModel.layers;
  }

  public get video() {
    return this.canvasModel.video;
  }

  @ViewChild('container', { static: true })
  protected container: ElementRef<HTMLDivElement>;

  constructor(private readonly canvasModel: PlayerCanvasModel) {}

  protected getBarPos() {
    return (this.video.getCurrTimeMs() / this.video.getDurationMs()) * 100 + '%';
  }

  protected handleSeekbarClick(evt: MouseEvent & { target: HTMLDivElement }) {
    const { width } = evt.target.getBoundingClientRect(),
      x = evt.offsetX,
      dur = this.video.getDurationMs(),
      seekPct = Math.max(0, Math.min(1, x / width)),
      seekMs = dur * seekPct;

    this.video.seek(seekMs);
  }

  protected handleBarMouseDown(evt: MouseEvent) {
    const { width } = this.container.nativeElement.getBoundingClientRect(),
      startX = evt.pageX,
      dur = this.video.getDurationMs(),
      startPct = this.video.getCurrTimeMs() / this.video.getDurationMs(),
      handleMseUp = () => {
        window.removeEventListener('mousemove', handleMseMove);
        window.removeEventListener('mouseup', handleMseUp);
      },
      handleMseMove = (evt: MouseEvent) => {
        const newX = evt.pageX,
          deltX = newX - startX,
          pctDelt = deltX / width,
          pct = Math.min(1, Math.max(0, startPct + pctDelt));

        this.video.seek(pct * dur);
      };

    window.addEventListener('mousemove', handleMseMove);
    window.addEventListener('mouseup', handleMseUp);
  }
}
