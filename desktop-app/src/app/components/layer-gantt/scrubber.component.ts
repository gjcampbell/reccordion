import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { FastNgUpdateService } from 'app/services/fast-ng-update.service';
import { PlayerCanvasModel } from '../player-canvas.model';

@Component({
  selector: 'app-scrubber',
  template: `
    <div class="margin">
      <div class="container" #container>
        <div #bar class="bar" [style.left]="getBarPos()" (mousedown)="handleBarMouseDown($event)">
          <div class="marker"></div>
          <div class="sliver" tabindex="0"></div>
        </div>
      </div>
    </div>
    <div class="seekbar" (click)="handleSeekbarClick($event)"></div>
  `,
  styleUrls: ['./scrubber.component.scss'],
})
export class ScrubberComponent implements AfterViewInit, OnDestroy {
  protected hpadding = 16;
  private disposer: () => void;

  public get layers() {
    return this.canvasModel.layers;
  }

  public get video() {
    return this.canvasModel.video;
  }

  @ViewChild('bar', { static: true })
  protected bar: ElementRef<HTMLDivElement>;

  @ViewChild('container', { static: true })
  protected container: ElementRef<HTMLDivElement>;

  constructor(private readonly canvasModel: PlayerCanvasModel, private readonly updater: FastNgUpdateService) {}

  ngOnDestroy() {
    this.disposer();
  }

  ngAfterViewInit() {
    this.disposer = this.updater.addUpdateListener(() => this.updateBarPos());
  }

  private updateBarPos() {
    if (this.bar && this.bar.nativeElement) {
      this.bar.nativeElement.style.left = this.getBarPos();
    }
  }

  protected getBarPos() {
    const snappedFrame = this.canvasModel.snapMsToFrame(this.video.getCurrTimeMs());
    return (snappedFrame / this.video.getDurationMs()) * 100 + '%';
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
