import { Component, NgZone } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { ElectronService } from 'app/services/electron.service';
import { ICapturable, ICapturer, RecordingService } from '../services/recording.service';

@Component({
  selector: 'app-recorder',
  template: `<div>
    <button (click)="select()">Select App</button>
    <button (click)="capture()" [disabled]="!canCapture()">Record</button>
    <button (click)="pause()" [disabled]="!canPause()">Pause</button>
    <div class="video"><app-player [source]="preview"></app-player></div>
  </div>`,
  styles: [
    `
      .video {
        max-width: 500px;
        max-height: 500px;
      }
    `,
  ],
})
export class RecorderComponent {
  public capturer?: ICapturer;
  public preview?: Blob | MediaStream;

  constructor(private readonly recorder: RecordingService, private readonly dialog: MatDialog) {}

  public select() {
    const dialogRef = this.dialog.open(ScreenPickerDialog);
    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.useCapturable(result);
      }
    });
  }

  public canCapture() {
    return this.capturer && !this.capturer.isRecording();
  }

  public capture() {
    if (this.capturer) {
      this.capturer.capture();
      this.preview = this.capturer.getStream();
    }
  }

  public canPause() {
    return this.capturer && this.capturer.isRecording();
  }

  public pause() {
    if (this.capturer) {
      this.capturer.pause();
      this.preview = this.capturer.getBlob();
    }
  }

  private async useCapturable(capturable: ICapturable) {
    const capturer = await this.recorder.record(true, capturable);
    this.capturer = capturer;
  }
}

@Component({
  template: `
    <div mat-dialog-content>
      <app-screen-picker (itemSelected)="handleSelected($event)"></app-screen-picker>
    </div>
    <div mat-dialog-actions>
      <button mat-button [disabled]="!canOpen" (click)="done()">Open</button>
      <button mat-button (click)="cancel()">Cancel</button>
    </div>
  `,
})
export class ScreenPickerDialog {
  public selected?: ICapturable;

  public get canOpen() {
    return !!this.selected;
  }

  constructor(private readonly dialogRef: MatDialogRef<ScreenPickerDialog>) {}

  public done() {
    this.dialogRef.close(this.selected);
  }

  public cancel() {
    this.dialogRef.close();
  }

  public handleSelected(selected: ICapturable) {
    this.selected = selected;
  }
}
