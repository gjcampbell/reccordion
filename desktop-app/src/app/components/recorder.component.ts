import { AfterViewInit, Component, Inject, ViewChild } from '@angular/core';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { ElectronService } from 'app/services/electron.service';
import { CommentLayer, IVideo, RendererService, WebmBlobSeriesLayer } from 'app/services/renderer.service';
import { ICapturable, ICapturer, RecordingService } from '../services/recording.service';
import { PlayerComponent } from './player.component';

@Component({
  selector: 'app-recorder',
  template: ` <div>
    <div class="video">
      <div class="main-options">
        <button *ngIf="canSelect()" mat-icon-button matTooltip="Start recording a Window" (click)="select()">
          <i class="fa fa-fw fa-tv"></i>
        </button>
        <button *ngIf="canCapture()" matTooltip="Resume Recording" mat-icon-button (click)="capturer.capture()">
          <i class="fa fa-fw fa-circle"></i>
        </button>
        <button *ngIf="canPause()" matTooltip="Pause Recording" mat-icon-button (click)="capturer.pause()">
          <i class="fa fa-fw fa-pause"></i>
        </button>
        <button *ngIf="canStop()" matTooltip="Stop Recording" mat-icon-button (click)="stop()">
          <i class="fa fa-fw fa-stop-circle"></i>
        </button>
        <button
          *ngIf="stopped && player.videoEl.paused"
          [matTooltip]="'Add Text at ' + player.getTimeLabel()"
          mat-icon-button
          (click)="addText()"
        >
          <i class="fa fa-fw fa-font"></i>
        </button>
        <button *ngIf="canExport()" matTooltip="Export Recording" mat-icon-button (click)="export()">
          <i class="fa fa-fw fa-file-export"></i>
        </button>
      </div>
      <app-player [source]="preview" (videoClicked)="togglePause()" [capturer]="capturer" #player></app-player>
    </div>
  </div>`,
  styles: [
    `
      .main-options {
        font-size: 2rem;
        text-align: center;
      }
    `,
  ],
})
export class RecorderComponent {
  public capturer?: ICapturer;
  public preview?: Blob | MediaStream;
  @ViewChild('player')
  public player: PlayerComponent;
  public stopped = false;
  private videoLayer = new WebmBlobSeriesLayer();
  private textLayer = new CommentLayer();

  constructor(
    private readonly recorder: RecordingService,
    private readonly dialog: MatDialog,
    private readonly electron: ElectronService,
    private readonly renderer: RendererService
  ) {}

  public addText() {
    this.textLayer.comments.push({
      startMs: this.player.currentTime * 1000,
      text: 'Some Text',
      strokeColor: '#fff',
      strokeW: 2,
      font: 'bold 24pt sans-serif',
      fillColor: '#000',
    });
  }

  public select() {
    const dialogRef = this.dialog.open(ScreenPickerDialog);
    dialogRef.afterClosed().subscribe(async (result) => {
      if (result) {
        this.stopped = false;
        await this.useCapturable(result);
        this.capture();
      }
    });
  }

  public async save() {
    if (this.preview instanceof Blob) {
      await this.electron.saveBlob(this.preview, `c:/temp/what.webm`);
    }
  }

  public canExport() {
    return this.stopped && this.videoLayer.blobs.length > 0;
  }

  public async export() {
    this.dialog.open(ExportDialog, {
      data: {
        width: this.player.width,
        height: this.player.height,
        durationMs: this.capturer.getDuration(),
        layers: [this.videoLayer, this.textLayer],
      },
    });
  }

  public canSelect() {
    return !this.capturer || this.stopped;
  }

  public canCapture() {
    return this.capturer && !this.capturer.isRecording() && !this.stopped;
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

  public togglePause() {
    if (this.capturer) {
      if (this.capturer.isRecording()) {
        this.capturer.pause();
      } else {
        this.capturer.capture();
      }
    }
  }

  public canStop() {
    return this.capturer && !this.stopped;
  }

  public async stop() {
    if (this.capturer) {
      await this.capturer.pause();
      const blob = this.capturer.getBlob();
      this.preview = blob;
      this.stopped = true;
      this.videoLayer.blobs.push(blob);
    }
  }

  private async useCapturable(capturable: ICapturable) {
    const capturer = await this.recorder.record(true, capturable);
    this.capturer = capturer;
    this.preview = this.capturer.getStream();
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

@Component({
  template: `
    <div mat-dialog-content>{{ (percent * 100).toFixed(0) }}%</div>
    <div mat-dialog-actions>
      <button mat-button (click)="close()">Close</button>
    </div>
  `,
})
export class ExportDialog implements AfterViewInit {
  public done = false;
  public percent = 0;
  public canceled = false;
  constructor(
    private readonly dialogRef: MatDialogRef<ExportDialog>,
    private readonly renderer: RendererService,
    @Inject(MAT_DIALOG_DATA) private readonly video: IVideo,
    private readonly electron: ElectronService
  ) {}

  public ngAfterViewInit() {
    this.export();
  }

  private async export() {
    const blob = await this.renderer.render(this.video, undefined, (percent) => {
      this.percent = percent;
      return !this.canceled;
    });
    await this.electron.saveBlob(blob, `c:/temp/blah.webm`);
  }

  public close() {
    this.canceled = true;
    this.dialogRef.close();
  }
}
