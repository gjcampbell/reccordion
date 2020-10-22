import { AfterViewInit, Component, ElementRef, EventEmitter, Input, NgZone, Output, ViewChild } from '@angular/core';
import { MatSliderChange } from '@angular/material/slider';
import { DomSanitizer } from '@angular/platform-browser';
import { ICapturer } from 'app/services/recording.service';
import { IVideoLayer } from 'app/services/renderer.service';
import { PlayerCanvasComponent } from './player-canvas.component';

@Component({
  selector: 'app-player',
  template: `
    <app-video-sizer [maxHeight]="2000" [maxWidth]="2000" [(width)]="width" [(height)]="height">
      <div class="video-message" *ngIf="isLive && capturer" (click)="togglePlay()">
        <p class="mat-headline">
          <i class="fa fa-circle" [class.message-paused]="isLivePause"></i> Recording
          {{ isLivePause ? 'Paused' : 'In Progress' }}
        </p>
      </div>

      <video
        #preview
        (click)="togglePlay()"
        (loadedmetadata)="handleMetadataLoaded()"
        (timeupdate)="handleTimeUpdate()"
      ></video>
      <app-player-canvas
        #cvs
        (clicked)="togglePlay()"
        [height]="height"
        [width]="width"
        [layers]="canvasLayers"
      ></app-player-canvas>
    </app-video-sizer>
    <div class="play-bar">
      <ng-container *ngIf="!isLive">
        <button mat-icon-button class="play" color="accent" (click)="togglePlay()">
          <i class="fa fa-fw" [class.fa-play]="videoEl.paused" [class.fa-pause]="!videoEl.paused"></i>
        </button>
        <mat-slider
          [(ngModel)]="currentTime"
          [min]="0"
          [max]="capturer?.getDuration() / 1000"
          [step]="0.025"
          (input)="handleSliderInput($event)"
          [tickInterval]="0.025"
        ></mat-slider>
      </ng-container>

      <ng-container *ngIf="!isLive">
        <div *ngIf="isLive" class="live-bar"></div>
      </ng-container>
      <div class="time mat-body" #time></div>
    </div>
  `,
  styles: [
    `
      .video-message {
        position: absolute;
        padding: 2rem;
        background: #fffb;
        border-radius: 10px;
        box-shadow: 0 0 8px #888;
      }
      .video-message p {
        text-align: center;
      }
      .video-message i {
        color: red;
      }
      .video-message i.message-paused {
        color: #0005;
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
        display: flex;
        align-items: center;
      }
      .time {
        min-width: 4rem;
        text-align: right;
      }
    `,
  ],
})
export class PlayerComponent implements AfterViewInit {
  private _currentTime = 0;
  private currentSource: MediaStream | Blob;
  public width = 720;
  public height = 480;

  @ViewChild('preview', { static: true })
  public videoElementRef: ElementRef<HTMLVideoElement>;
  @ViewChild('time')
  public timeDisplay: ElementRef<HTMLDivElement>;
  @ViewChild('cvs')
  public playerCanvas: PlayerCanvasComponent;

  public isLive: boolean = true;

  public get isLivePause() {
    return this.capturer && !this.capturer.isRecording();
  }

  @Input()
  public canvasLayers: IVideoLayer[];

  @Input()
  public capturer?: ICapturer;

  @Input()
  public set source(value: MediaStream | Blob) {
    if (this.videoEl && value !== this.currentSource) {
      this.currentSource = value;
      if (value instanceof MediaStream) {
        this.isLive = true;
        this.videoEl.srcObject = value;
      } else {
        this.isLive = false;
        this.videoEl.srcObject = undefined;
        const url = this.sanitizer.bypassSecurityTrustUrl(URL.createObjectURL(value)) as any;
        this.videoEl.src = url.changingThisBreaksApplicationSecurity;
      }
    }
  }

  @Output()
  public videoClicked = new EventEmitter();

  public get videoEl() {
    return this.videoElementRef && this.videoElementRef.nativeElement;
  }

  public set currentTime(value: number) {
    if (this.videoEl) {
      this.videoEl.currentTime = value;
    }
  }
  public get currentTime() {
    return this._currentTime;
  }

  public constructor(private readonly sanitizer: DomSanitizer, private readonly zone: NgZone) {}

  public ngAfterViewInit() {
    this.watchTime();
  }

  private watchTime() {
    const videoEl = this.videoElementRef.nativeElement,
      timeDisplay = this.timeDisplay.nativeElement;
    if (videoEl && timeDisplay) {
      this.zone.runOutsideAngular(() => {
        videoEl.addEventListener('timeupdate', (e) => {
          const time = this.isLive ? this.capturer.getDuration() / 1000 : videoEl.currentTime;
          timeDisplay.innerText = this.formatTime(time);
        });
      });
    }
  }

  private formatTime(time: number, mills: number = 0) {
    const seconds = (time % 60).toFixed(mills).padStart(mills > 0 ? mills + 3 : 2, '0'),
      minutes = Math.floor(time / 60);

    return `${minutes}:${seconds}`;
  }

  public getTimeLabel(mills: number = 0) {
    return this.formatTime(this._currentTime);
  }

  public handleTimeUpdate() {
    if (this.videoEl) {
      this._currentTime = this.videoEl.currentTime;
      this.playerCanvas.setTime(this.videoEl.currentTime * 1000);
    }
  }
  public handleMetadataLoaded() {
    if (this.videoEl) {
      this.videoEl.play();
    }
  }
  public async togglePlay() {
    if (this.videoEl) {
      if (!this.isLive) {
        if (this.videoEl.ended) {
          this.videoEl.currentTime = 0;
          this.videoEl.play();
        } else if (this.videoEl.paused) {
          await this.videoEl.play();
        } else {
          this.videoEl.pause();
        }
      } else {
        this.videoClicked.emit();
      }
    }
  }
  public handleSliderInput(evt: MatSliderChange) {
    this.currentTime = evt.value;
  }
}
