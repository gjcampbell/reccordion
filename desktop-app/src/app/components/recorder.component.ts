import { AfterViewInit, Component, ElementRef, Inject, ViewChild } from '@angular/core';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { ConverterService } from 'app/services/converter.service';
import { ElectronService } from 'app/services/electron.service';
import {
  CommentLayer,
  IBaseVideoLayer,
  IVideo,
  IVideoLayer,
  ReqRendererService,
  WebmBlobSeriesLayer,
} from 'app/services/renderer.service';
import { ICapturable, ICapturer, RecordingService } from '../services/recording.service';
import { PlayerComponent } from './player.component';

@Component({
  selector: 'app-recorder',
  template: `
    <ng-container class="video" *ngIf="!exporting">
      <div class="main-options">
        <button *ngIf="canSelect()" mat-icon-button matTooltip="Start recording a Window" (click)="select()">
          <i class="fa fa-fw fa-tv"></i>
        </button>
        <button *ngIf="canCapture()" matTooltip="Resume Recording" mat-icon-button (click)="capturer.capture()">
          <i class="fa fa-fw fa-play-circle"></i>
        </button>
        <button *ngIf="canPause()" matTooltip="Pause Recording" mat-icon-button (click)="capturer.pause()">
          <i class="fa fa-fw fa-pause"></i>
        </button>
        <button *ngIf="canStop()" matTooltip="Stop Recording" mat-icon-button (click)="stop()">
          <i class="fa fa-fw fa-stop-circle"></i>
        </button>
        <button
          *ngIf="stopped && player.videoEl.paused"
          [matTooltip]="'Add Text at ' + player.getTimeLabel(2)"
          mat-icon-button
          (click)="addText()"
        >
          <i class="fa fa-fw fa-font"></i>
        </button>
        <button *ngIf="canExport()" matTooltip="Export Recording" mat-icon-button (click)="export()">
          <i class="fa fa-fw fa-file-export"></i>
        </button>
      </div>
      <app-player
        [source]="preview"
        (videoClicked)="togglePause()"
        [capturer]="capturer"
        [layers]="layers"
        [video]="videoLayer"
        #player
      ></app-player>
      <app-scrubber *ngIf="stopped" [layers]="layers" [video]="videoLayer"></app-scrubber>
    </ng-container>
  `,
  styles: [
    `
      .main-options {
        font-size: 2rem;
        text-align: center;
        flex: 0 0 auto;
      }
      :host {
        display: flex;
        flex-direction: column;
        height: 100%;
        overflow: hidden;
      }
      app-player {
        display: block;
        flex: 1 1 100%;
      }
      app-scrubber {
        display: block;
        flex: 1 1 auto;
      }
    `,
  ],
})
export class RecorderComponent implements AfterViewInit {
  public capturer?: ICapturer;
  public preview?: Blob | MediaStream;
  @ViewChild('player')
  public player: PlayerComponent;
  public stopped = false;
  protected videoLayer = new WebmBlobSeriesLayer();
  private textLayer = new CommentLayer();
  public layers: IVideoLayer[] = [];
  public exporting = false;

  constructor(
    private readonly recorder: RecordingService,
    private readonly dialog: MatDialog,
    private readonly electron: ElectronService
  ) {
    this.layers.push(this.videoLayer, this.textLayer);
    this.videoLayer.setDimensions(720, 480);
  }

  public ngAfterViewInit() {}

  public addText() {
    const startMs = this.videoLayer.getCurrTimeMs();
    this.textLayer.addText({
      startMs,
      endMs: startMs + 5000,
      text: 'Some Text',
      strokeColor: '#fff',
      strokeW: 2,
      font: 'Roboto',
      align: 'center',
      fillColor: '#fff',
      background: '#000',
      height: 200,
      width: 300,
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
    return this.stopped && this.videoLayer.isEmpty();
  }

  public async export() {
    const dialogRef = this.dialog.open(ExportDialog, {
      data: {
        width: this.player.width,
        height: this.player.height,
        durationMs: this.capturer.getDuration(),
        layers: [this.videoLayer, this.textLayer],
      },
    });
    this.exporting = true;
    dialogRef.afterClosed().subscribe(() => (this.exporting = false));
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
      if (this.canPause()) {
        await this.capturer.pause();
      }
      const blob = this.capturer.getBlob();
      this.preview = blob;
      this.stopped = true;
      this.videoLayer.ranges.addVideo(blob, this.capturer.getDuration());
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
    <div mat-dialog-content>{{ status }} {{ percent }}</div>
    <div mat-dialog-actions>
      <button mat-button (click)="close()">Cancel</button>
    </div>
  `,
})
export class ExportDialog implements AfterViewInit {
  public done = false;
  public percent = '';
  public status = '';
  public canceled = false;
  constructor(
    private readonly dialogRef: MatDialogRef<ExportDialog>,
    private readonly renderer: ReqRendererService,
    @Inject(MAT_DIALOG_DATA) private readonly video: IVideo,
    private readonly electron: ElectronService,
    private readonly converter: ConverterService
  ) {}

  public ngAfterViewInit() {
    this.export();
  }

  private async export() {
    this.status = 'Rendering';
    const blob = await this.renderer.render(this.video.layers[0] as IBaseVideoLayer, this.video, (percent) => {
        this.percent = (percent * 100).toFixed(0) + '%';
        return !this.canceled;
      }),
      tempWebMPath = this.electron.tempFilePath('webm');

    this.percent = '';
    this.status = 'Saving WebM';
    await this.electron.saveBlob(blob, tempWebMPath);
    this.status = 'Converting to Gif';
    const saveResult = await this.electron.remote.dialog.showSaveDialog(null, {
      filters: [{ name: 'Gif', extensions: ['gif'] }],
    });
    if (saveResult.canceled) {
      this.close();
    } else {
      await this.converter.convertToGif(tempWebMPath, saveResult.filePath);
      this.close();
    }
  }

  public close() {
    this.canceled = true;
    this.dialogRef.close();
  }
}
