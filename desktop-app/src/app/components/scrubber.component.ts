import { Component, ElementRef, HostBinding, Input, ViewChild } from '@angular/core';
import { IBaseVideoLayer, IVideoLayer } from 'app/services/renderer.service';

@Component({
  selector: 'app-scrubber',
  template: `
    <div class="c-margin" [style]="{ padding: '0 ' + this.hpadding + 'px' }">
      <div class="c-container" #container>
        <div class="c-bar" [style.left]="getBarPos()" (mousedown)="handleBarMouseDown($event)">
          <div class="c-window" tabindex="0"></div>
        </div>
        <div></div>
      </div>
    </div>
  `,
  styles: [
    `
      .c-margin {
        display: block;
        box-sizing: border-box;
        bottom: 0;
        width: 100%;
        min-height: 40px;
      }
      .c-container {
        display: block;
        position: relative;
        min-height: 40px;
        width: 100%;
      }
      .c-bar {
        height: 100%;
        position: absolute;
        width: 1px;
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

  @Input()
  public layers: IVideoLayer[] = [];

  @Input()
  public video: IBaseVideoLayer;

  @ViewChild('container', { static: true })
  protected container: ElementRef<HTMLDivElement>;

  protected getBarPos() {
    return (this.video.getCurrTimeMs() / this.video.getDurationMs()) * 100 + '%';
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
