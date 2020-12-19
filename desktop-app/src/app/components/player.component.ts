import { AfterViewInit, Component, ElementRef, EventEmitter, Input, NgZone, Output, ViewChild } from '@angular/core';
import { IVideoLayer, ICapturer, IBaseVideoLayer, IVideo } from 'app/services/video.models';
import { PlayerCanvasComponent } from './player-canvas.component';
import { PlayerCanvasModel } from './player-canvas.model';

@Component({
  selector: 'app-player',
  template: `
    <app-video-sizer
      [maxHeight]="2000"
      [maxWidth]="2000"
      [(width)]="width"
      [(height)]="height"
      (heightChange)="handleDimChange()"
      (widthChange)="handleDimChange()"
      [class.live]="isLive"
      [enabled]="!video.isEmpty() || isLive"
    >
      <video
        class="display-live"
        #preview
        (click)="togglePlay()"
        (loadedmetadata)="handleMetadataLoaded()"
        (timeupdate)="handleTimeUpdate()"
      ></video>
      <app-player-canvas
        #cvs
        class="display-preview"
        (clicked)="togglePlay()"
        [height]="height"
        [width]="width"
      ></app-player-canvas>
    </app-video-sizer>
    <div class="play-bar">
      <ng-container *ngIf="!isLive">
        <app-layer-gantt></app-layer-gantt>
      </ng-container>
    </div>
  `,
  styles: [
    `
      :host {
        display: grid;
        flex: 1 1 100%;
        justify-conent: stretch;
        justify-items: center;
        grid-template-rows: 1fr min-content;
        height: 100%;
        overflow: hidden;
      }
      .display-preview {
        display: unset;
      }
      .display-live {
        display: none;
      }
      .live .display-preview {
        display: none;
      }
      .live .display-live {
        display: block;
      }
      video {
        width: 100%;
        height: 100%;
      }
      mat-slider {
        width: 100%;
        flex: 1 1 100%;
        transition: none !important;
      }
      .play-bar {
        padding: 0.5rem;
        box-sizing: border-box;
        width: 100%;
      }
      .time {
        min-width: 4rem;
        text-align: right;
      }
      app-layer-gantt {
        flex: 1 1 auto;
      }
    `,
  ],
  providers: [PlayerCanvasModel],
})
export class PlayerComponent implements AfterViewInit {
  private _currentTime = 0;
  private currentSource: MediaStream | Blob;
  public width = 720;
  public height = 480;
  protected liveTime = '';

  @ViewChild('time')
  public timeDisplay: ElementRef<HTMLDivElement>;
  @ViewChild('preview')
  public videoElementRef: ElementRef<HTMLVideoElement>;
  @ViewChild('cvs')
  public playerCanvas: PlayerCanvasComponent;

  public isLive: boolean = true;

  public get isLivePause() {
    return this.capturer && !this.capturer.isRecording();
  }

  @Output()
  public clicked = new EventEmitter<void>();

  @Input()
  public set layers(value: IVideoLayer[]) {
    this.model.layers = value;
  }
  public get layers() {
    return this.model.layers;
  }

  @Input()
  public set fps(value: number) {
    this.model.fps = value;
  }

  @Input()
  public set video(value: IBaseVideoLayer) {
    this.model.video = value;
  }
  public get video() {
    return this.model.video;
  }

  @Input()
  public capturer?: ICapturer;

  @Input()
  public set source(value: MediaStream | Blob) {
    if (this.videoEl && value !== this.currentSource) {
      this.currentSource = value;
      if (value instanceof MediaStream) {
        this.isLive = true;
        this.videoEl.srcObject = value;
        this.watchTime();
      } else {
        this.isLive = false;
        this.videoEl.srcObject = undefined;
      }
    }
  }

  @Output()
  public videoClicked = new EventEmitter();

  public get videoEl() {
    return this.videoElementRef && this.videoElementRef.nativeElement;
  }

  public constructor(private readonly zone: NgZone, protected readonly model: PlayerCanvasModel) {}

  public ngAfterViewInit() {}

  private watchTime() {
    this.liveTime = '0:00.0';
    this.videoEl.addEventListener('timeupdate', () => {
      const time = this.isLive ? this.capturer.getDuration() : this.videoEl.currentTime;
      this.liveTime = this.formatTime(time, 1);
    });
  }

  private formatTime(time: number, mills: number = 0) {
    return this.model.formatAsTime(time, mills);
  }

  public getTimeLabel(mills: number = 0) {
    return this.formatTime(this._currentTime, mills);
  }

  public handleTimeUpdate() {
    if (this.videoEl) {
      this._currentTime = this.videoEl.currentTime;
    }
  }
  public handleDimChange() {
    this.video.setDimensions(this.width, this.height);
  }
  public handleMetadataLoaded() {
    if (this.videoEl) {
      this.videoEl.play();
    }
  }
  public async togglePlay() {
    if (this.videoEl) {
      if (!this.isLive) {
        if (this.video.isPlaying()) {
          await this.video.pause();
        } else {
          await this.video.play();
        }
      } else {
        this.videoClicked.emit();
      }
    }
  }
}
