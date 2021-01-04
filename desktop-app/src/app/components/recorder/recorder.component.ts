import {
  AfterViewInit,
  Component,
  ElementRef,
  Inject,
  ViewChild,
  OnDestroy,
  ChangeDetectorRef,
  ChangeDetectionStrategy,
} from '@angular/core';
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
  public videoLayer: IBaseVideoLayer;
  public capturer?: ICapturer;
  public preview?: Blob | MediaStream;
  public stopped = false;
  public layers: IVideoLayer[] = [];
  public exporting = false;
  public fps = 25;
  public processing = false;
  public get isRecording() {
    return !!this.capturer;
  }
  public get isRecordingPaused() {
    return this.capturer && !this.capturer.isRecording();
  }
  public get isEmpty() {
    return !this.capturer && this.videoLayer.isEmpty();
  }
  @ViewChild('player', { static: false })
  public player: PlayerComponent;
  @ViewChild('recordingDur', { static: false })
  public recordingDurLabel: ElementRef<HTMLSpanElement>;

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

  public addText() {
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
      shapeData: { icon: 'fa-square', name: 'rect', ufName: 'Rectangle' },
    });
  }

  public addStar() {
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

  public addRect() {
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

  public addCircle() {
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

  public addArrow() {
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

  public addTriangle() {
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
    return this.stopped && !this.videoLayer.isEmpty();
  }

  public async export() {
    const dialogRef = this.dialog.open(ExportDialog, {
      data: {
        quality: 0.99999,
        width: this.player.width,
        height: this.player.height,
        frameRate: 25,
        durationMs: this.videoLayer.getDurationMs(),
        layers: [this.videoLayer, this.textLayer],
      },
      disableClose: true,
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

  public clear() {
    window.history.go(0);
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
      await this.videoLayer.addVideo(blob, this.capturer.source, this.videoLayer.getDurationMs());
      this.processing = false;
      this.capturer = undefined;
    }
  }

  private updateRecordingDur() {
    if (this.capturer && this.recordingDurLabel && this.recordingDurLabel.nativeElement) {
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
    <div mat-dialog-actions align="end">
      <button mat-flat-button color="primary" [disabled]="!canOpen" (click)="done()">Start Recording</button>
      <button mat-button (click)="cancel()">Cancel</button>
    </div>
  `,
})
export class ScreenPickerDialog {
  public selected?: ICapturable;

  public get canOpen() {
    return !!this.selected;
  }

  public startRecording = (item: ICapturable) => {
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
    <div mat-dialog-content class="export-body">
      <div *ngIf="!processing && !done" class="type-picker">
        <div class="big-button">
          <div class="main" (click)="exportGif(false)">
            <div class="icon icon-gif"></div>
            <div class="mat-caption text">
              Lower quality, takes a while to generate, supported by most tools, recommended for
              <strong>Outlook, Teams, Azure Devops</strong>
            </div>
          </div>
          <div (click)="exportGif(true)">
            <div class="title">Quicker GIF</div>
            <div class="mat-caption text">Slightly lower quality, but much faster to generate</div>
          </div>
        </div>
        <div class="big-button" (click)="exportWebm()">
          <div class="main">
            <div class="icon icon-webm"></div>
            <div class="mat-caption text">
              Smaller file, quicker, higher quality, recommended for <strong>Discord</strong> or
              <strong>Long Videos</strong>
            </div>
          </div>
        </div>
      </div>
      <div *ngIf="processing">
        <div class="processing-status">{{ status }} {{ percent }}</div>
        <ng-container *ngIf="percent === '' && processing">
          <mat-progress-bar mode="indeterminate"></mat-progress-bar>
        </ng-container>
      </div>
      <div *ngIf="done" class="ready">
        <div class="big-button" (click)="save()">
          <i class="fa fa-fw fa-save"></i>
          <div class="title">Save {{ outputType?.name }}</div>
          <div class="mat-caption text">Save the recording to your computer</div>
        </div>
        <div class="big-button" draggable="true" (dragstart)="handleDragStart($event)">
          <i class="fa fa-fw fa-hand-rock"></i>
          <div class="title">Drag the {{ outputType?.name }}</div>
          <div class="mat-caption text">Share the recording by dragging it to other apps</div>
        </div>
      </div>
    </div>
    <div mat-dialog-actions align="end">
      <button mat-button (click)="close()">Cancel</button>
    </div>
  `,
  styleUrls: ['./export-dialog.component.scss'],
})
export class ExportDialog implements AfterViewInit {
  public done = false;
  public percent = '';
  public status = '';
  public canceled = false;
  private tempOutputPath: string;
  public outputType: { name: string; type: string; ext: string };
  public processing = false;
  constructor(
    private readonly dialogRef: MatDialogRef<ExportDialog>,
    private readonly renderer: ReqRendererService,
    @Inject(MAT_DIALOG_DATA) private readonly video: IVideo,
    private readonly electron: ElectronService,
    private readonly converter: ConverterService
  ) {}

  public ngAfterViewInit() {
    //this.dialogRef.backdropClick().subscribe(() => (this.canceled = true));
  }

  private updatePercent = (percent) => {
    this.percent = (percent * 100).toFixed(0) + '%';
    return !this.canceled;
  };

  public async exportGif(fast: boolean) {
    this.processing = false;
    this.outputType = { name: 'GIF', ext: 'gif', type: 'image/gif' };
    this.status = 'Rendering Frames';
    const frames = this.renderer.createCtxStream(
        this.video.layers[0] as IBaseVideoLayer,
        this.video,
        this.updatePercent
      ),
      framesDir = await this.converter.convertEnumerableCtxToFrames(frames);
    this.tempOutputPath = this.electron.tempFilePath('gif');
    await this.converter.convertFramesToGif(
      framesDir,
      this.video.frameRate || 25,
      this.tempOutputPath,
      this.video.width,
      fast
    );
    this.processing = false;
    this.done = true;
  }
  public async exportWebm() {
    this.processing = true;
    this.outputType = { name: 'WebM', ext: 'webm', type: 'video/webm' };
    this.status = 'Rendering Frames';
    const frames = this.renderer.createCtxStream(
        this.video.layers[0] as IBaseVideoLayer,
        this.video,
        this.updatePercent
      ),
      framesDir = await this.converter.convertEnumerableCtxToFrames(frames);

    this.tempOutputPath = this.electron.tempFilePath('webm');
    await this.converter.convertFramesToWebm(framesDir, this.tempOutputPath, this.video.width);
    this.processing = false;
    this.done = true;
  }

  private async exportWithGifJs() {
    this.processing = true;
    this.status = 'Rendering Frames';
    const frames = this.renderer.createCtxStream(
      this.video.layers[0] as IBaseVideoLayer,
      this.video,
      this.updatePercent
    );
    this.tempOutputPath = this.electron.tempFilePath('gif');
    await this.converter.convertEnumerableCtxToGif(
      frames,
      this.video.frameRate || 25,
      this.tempOutputPath,
      this.video.width,
      this.video.height
    );
    this.processing = false;
  }

  private async exportWithFfmpeg() {
    this.processing = true;
    this.status = 'Rendering Frames';
    const frames = this.renderer.createFrames(this.video.layers[0] as IBaseVideoLayer, this.video, this.updatePercent);
    const framesDir = await this.converter.saveFrames(frames);
    if (!this.canceled) {
      this.status = 'Creating Gif';
      this.percent = '';
      this.tempOutputPath = this.electron.tempFilePath('gif');
      await this.converter.convertFramesToWebmToGif(framesDir, this.tempOutputPath, this.video.width);
    }
    this.processing = false;
  }

  public async save() {
    const saveResult = await this.electron.remote.dialog.showSaveDialog(null, {
      filters: [{ name: this.outputType.name, extensions: [this.outputType.ext] }],
    });
    if (!saveResult.canceled) {
      this.electron.copyFile(this.tempOutputPath, saveResult.filePath);
    }
  }
  public async handleDragStart(evt: DragEvent) {
    evt.preventDefault();
    this.electron.ipcRenderer.send('ondragstart', this.tempOutputPath);
  }

  public async copyGif() {
    const blob = this.electron.loadBlob(this.tempOutputPath, { type: 'image/gif' }),
      buffer = await blob.arrayBuffer();
    console.log(blob, buffer);
  }
  public async exportWithWebmWriter() {
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
