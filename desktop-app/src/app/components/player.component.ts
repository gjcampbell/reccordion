import { AfterViewInit, Component, ElementRef, Input, ViewChild } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';

@Component({
  selector: 'app-player',
  template: `
    <video #preview (timeupdate)="handleTimeUpdate()"></video>
    <mat-slider *ngIf="!isLive" [(ngModel)]="currentTime"></mat-slider>
  `,
  styles: [``],
})
export class PlayerComponent implements AfterViewInit {
  private _currentTime = 0;
  private currentSource: MediaStream | Blob;

  @ViewChild('preview', { static: true })
  public videoElementRef: ElementRef<HTMLVideoElement>;

  public isLive: boolean = true;

  @Input()
  public set source(value: MediaStream | Blob) {
    if (this.videoEl && value !== this.currentSource) {
      this.currentSource = value;
      if (value instanceof MediaStream) {
        this.isLive = true;
        this.videoEl.src = undefined;
        this.videoEl.srcObject = value;
      } else {
        this.isLive = false;
        this.videoEl.srcObject = undefined;
        const url = this.sanitizer.bypassSecurityTrustUrl(URL.createObjectURL(value)) as any;
        this.videoEl.src = url.changingThisBreaksApplicationSecurity;
      }
    }
  }

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

  public constructor(private readonly sanitizer: DomSanitizer) {}

  public ngAfterViewInit() {
    const videoEl = this.videoElementRef.nativeElement;
    if (videoEl) {
    }
  }

  public handleTimeUpdate() {
    if (this.videoEl) {
      this._currentTime = this.videoEl.currentTime;
    }
  }
}
