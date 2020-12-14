import { AfterViewInit, Component, ElementRef, Inject, ViewChild, OnDestroy } from '@angular/core';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { ConverterService } from 'app/services/converter.service';
import { ElectronService } from 'app/services/electron.service';
import { CommentLayer, IComment } from 'app/services/graphics.models';
import { ReqRendererService, WebmBlobSeriesLayer } from 'app/services/renderer.service';
import {
  ICapturer,
  IVideoLayer,
  ICapturable,
  IVideo,
  IBaseVideoLayer,
  formatTime,
  FrameSeriesLayer,
  snapToFrameMs,
} from 'app/services/video.models';
import { RecordingService } from '../../services/recording.service';
import { PlayerComponent } from '../player.component';
import { FastNgUpdateService } from 'app/services/fast-ng-update.service';
import {
  rectOption,
  circleOption,
  starOption,
  arrowOption,
  triangleOption,
  ShapeService,
} from 'app/services/shape.service';

@Component({
  selector: 'app-recorder',
  templateUrl: './recorder.component.html',
  styleUrls: ['./recorder.component.scss'],
})
export class RecorderComponent implements AfterViewInit, OnDestroy {
  private textLayer = new CommentLayer();
  private disposer: () => void;
  protected videoLayer: IBaseVideoLayer;
  protected capturer?: ICapturer;
  protected preview?: Blob | MediaStream;
  protected stopped = false;
  protected layers: IVideoLayer[] = [];
  protected exporting = false;
  protected fps = 25;
  protected processing = false;
  protected get isRecording() {
    return !!this.capturer;
  }
  protected get isRecordingPaused() {
    return this.capturer && !this.capturer.isRecording();
  }
  protected get isEmpty() {
    return !this.capturer && this.videoLayer.isEmpty();
  }
  @ViewChild('player')
  protected player: PlayerComponent;
  @ViewChild('recordingDur')
  protected recordingDurLabel: ElementRef<HTMLSpanElement>;

  constructor(
    private readonly recorder: RecordingService,
    private readonly dialog: MatDialog,
    private readonly electron: ElectronService,
    private readonly converter: ConverterService,
    private readonly shapeService: ShapeService,
    private readonly updater: FastNgUpdateService
  ) {
    this.videoLayer = new FrameSeriesLayer(this.converter);
    this.videoLayer.setDimensions(720, 480);
    this.layers.push(this.videoLayer, this.textLayer);
  }

  public ngOnDestroy() {
    this.disposer();
  }

  public ngAfterViewInit() {
    this.disposer = this.updater.addUpdateListener(() => this.updateRecordingDur());
  }

  protected addText() {
    this.addShape({
      text: 'Some Text',
      strokeColor: '#fff',
      strokeW: 2,
      borderColor: '#000',
      borderWidth: 1,
      font: 'Roboto',
      align: 'center',
      fillColor: '#000',
      background: '#fff',
      height: 50,
      width: 300,
    });
  }

  protected addStar() {
    this.addShape(
      this.shapeService.createShape(starOption, {
        fillColor: '#141518',
        background: '#F0C600',
        position: { x: 0, y: 0 },
        width: 150,
        height: 150,
        text: '',
      } as IComment)
    );
  }

  protected addRect() {
    this.addShape(
      this.shapeService.createShape(rectOption, {
        fillColor: '#000',
        background: '#0000',
        borderColor: '#000',
        borderWidth: 4,
        position: { x: 0, y: 0 },
        width: 300,
        height: 200,
        text: '',
      } as IComment)
    );
  }

  protected addCircle() {
    this.addShape(
      this.shapeService.createShape(circleOption, {
        fillColor: '#000',
        background: '#0000',
        borderColor: '#000',
        borderWidth: 4,
        position: { x: 0, y: 0 },
        width: 150,
        height: 150,
        text: '',
      } as IComment)
    );
  }

  protected addArrow() {
    this.addShape(
      this.shapeService.createShape(arrowOption, {
        fillColor: '#fff',
        background: '#000',
        position: { x: 0, y: 0 },
        width: 100,
        height: 50,
        text: '',
      } as IComment)
    );
  }

  protected addTriangle() {
    this.addShape(
      this.shapeService.createShape(triangleOption, {
        fillColor: '#141518',
        background: '#E58000',
        position: { x: 0, y: 0 },
        width: 150,
        height: 150,
        text: '',
      } as IComment)
    );
  }

  private addShape(comment: Partial<IComment>) {
    const max = this.videoLayer.getDurationMs(),
      currentMs = snapToFrameMs(this.videoLayer.getCurrTimeMs(), this.fps),
      startMs = Math.min(currentMs, max - 1000),
      endMs = Math.min(startMs + 3000, max);
    this.textLayer.addText({
      ...comment,
      startMs,
      endMs,
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
      this.processing = true;
      await this.videoLayer.addVideo(blob, this.capturer.getDuration(), this.videoLayer.getDurationMs());
      this.processing = false;
      this.capturer = undefined;
    }
  }

  private updateRecordingDur() {
    if (this.capturer && this.recordingDurLabel.nativeElement) {
      this.recordingDurLabel.nativeElement.textContent = formatTime(this.capturer.getDuration());
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
      <app-screen-picker (itemSelected)="handleSelected($event)" [startRecording]="startRecording"></app-screen-picker>
    </div>
    <div mat-dialog-actions>
      <button mat-button color="primary" [disabled]="!canOpen" (click)="done()">Start Recording</button>
      <button mat-button (click)="cancel()">Cancel</button>
    </div>
  `,
})
export class ScreenPickerDialog {
  public selected?: ICapturable;

  public get canOpen() {
    return !!this.selected;
  }

  protected startRecording = (item: ICapturable) => {
    this.selected = item;
    this.dialogRef.close(item);
  };

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
