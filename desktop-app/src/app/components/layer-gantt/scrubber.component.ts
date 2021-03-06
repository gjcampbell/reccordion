import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy, HostListener } from '@angular/core';
import { FastNgUpdateService } from 'app/services/fast-ng-update.service';
import { PlayerCanvasModel } from '../player-canvas.model';

@Component({
  selector: 'app-scrubber',
  template: `
    <div class="margin">
      <div class="container" #container [style]="getSeekbarBg()" (click)="handleContainerClick($event)">
        <div
          #bar
          class="bar"
          [style.left]="getBarPos()"
          (mousedown)="handleBarMouseDown($event)"
          (click)="handleBarClick($event)"
        >
          <div class="marker"></div>
          <div class="sliver" tabindex="0"></div>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./scrubber.component.scss'],
})
export class ScrubberComponent implements AfterViewInit, OnDestroy {
  public hpadding = 16;
  private disposer: () => void;
  private expectedDurMs = 0;
  private expectedWidth = 0;
  private cachedBg: { background: string };

  public get layers() {
    return this.canvasModel.layers;
  }

  public get video() {
    return this.canvasModel.video;
  }

  @ViewChild('bar', { static: true })
  public bar: ElementRef<HTMLDivElement>;

  @ViewChild('container', { static: true })
  public container: ElementRef<HTMLDivElement>;

  constructor(private readonly canvasModel: PlayerCanvasModel, private readonly updater: FastNgUpdateService) {}

  public ngOnDestroy() {
    this.disposer();
  }

  public ngAfterViewInit() {
    this.disposer = this.updater.addUpdateListener(() => this.updateBarPos());
  }

  @HostListener('window:resize')
  public handleResize() {
    this.expectedWidth = 0;
  }

  private updateBarPos() {
    if (this.bar && this.bar.nativeElement) {
      this.bar.nativeElement.style.left = this.getBarPos();
    }
  }

  private getContainerWidth() {
    if (this.expectedWidth === 0 && this.container.nativeElement) {
      const bounds = this.container.nativeElement.getBoundingClientRect();
      this.expectedWidth = bounds.width;
    }
    return this.expectedWidth;
  }

  public getSeekbarBg() {
    if (this.expectedDurMs !== this.video.getDurationMs() || this.expectedWidth === 0) {
      const width = this.getContainerWidth(),
        durMs = this.video.getDurationMs(),
        frames = this.canvasModel.getFrameCount(),
        pxPerFrame = width / frames,
        minPxPerFrame = 5,
        adjustedPxPerFrame =
          pxPerFrame > minPxPerFrame ? pxPerFrame : Math.ceil(minPxPerFrame / pxPerFrame) * pxPerFrame;

      this.cachedBg = {
        background: `repeating-linear-gradient(90deg, #666, transparent 1px, transparent ${adjustedPxPerFrame}px),
          repeating-linear-gradient(90deg, #666, transparent 1px, transparent ${adjustedPxPerFrame}px),
          repeating-linear-gradient(90deg, #666, transparent 1px, transparent ${adjustedPxPerFrame}px)`,
      };
      this.expectedDurMs = durMs;
    }
    return this.cachedBg;
  }

  public getBarPos() {
    const snappedFrame = this.canvasModel.snapMsToFrame(this.video.getCurrTimeMs());
    return (snappedFrame / this.video.getDurationMs()) * 100 + '%';
  }

  public handleBarClick(evt: MouseEvent) {
    evt.stopImmediatePropagation();
  }

  public handleContainerClick(evt: MouseEvent & { target: HTMLDivElement }) {
    const width = this.getContainerWidth(),
      x = evt.offsetX,
      dur = this.video.getDurationMs(),
      seekPct = Math.max(0, Math.min(1, x / width)),
      seekMs = dur * seekPct;

    this.video.seek(seekMs);
  }

  public handleBarMouseDown(evt: MouseEvent) {
    const width = this.getContainerWidth(),
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
    evt.stopImmediatePropagation();
  }
}
