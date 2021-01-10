import { AfterViewInit, Component, ElementRef, Inject, ViewChild, OnDestroy, Input } from '@angular/core';
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
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { formatDistance, addMilliseconds, format } from 'date-fns';

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
  public confirmClear = false;
  public width = 720;
  public height = 480;
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
        width: this.width,
        height: this.height,
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
    this.confirmClear = false;
    window.history.go(0);
  }
  public cancelClear() {
    this.confirmClear = false;
  }

  public tryClear() {
    this.confirmClear = true;
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

interface IProcessingStep {
  step: string;
  percent: number;
  estimatedWait?: string;
  startTime?: string;
  started?: boolean;
  done?: boolean;
}

@Component({
  selector: 'app-export-preview',
  template: `
    <ng-container *ngIf="src">
      <img *ngIf="type === 'img'" [src]="src" />
      <video *ngIf="type === 'video'">
        <source [src]="src" [type]="mimeType" />
      </video>
    </ng-container>
  `,
  styles: [
    `
      video,
      img {
        width: 100%;
      }
    `,
  ],
})
export class ExportPreviewComponent {
  public type: string;
  public src: SafeUrl;
  public mimeType: string;

  @Input()
  public set export(value: { path: string; type: string }) {
    this.type = value.path.endsWith('.webm') ? 'video' : 'img';
    this.mimeType = value.type;
    this.loadSrc(value.path, value.type);
  }

  private async loadSrc(path: string, type: string) {
    const blob = await this.electron.loadBlob(path, { type });
    this.src = this.domSanitizer.bypassSecurityTrustUrl(URL.createObjectURL(blob));
  }

  constructor(private readonly electron: ElectronService, private readonly domSanitizer: DomSanitizer) {}
}

@Component({
  templateUrl: './export-dialog.component.html',
  styleUrls: ['./export-dialog.component.scss'],
})
export class ExportDialog implements AfterViewInit {
  public done = false;
  public canceled = false;
  public tempOutputPath: string;
  private firstFramePath: string;
  public outputType: { name: string; type: string; ext: string };
  public processing = false;
  public processingSteps: IProcessingStep[] = [];
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

  private getPercent(percent: number) {
    return (percent * 100).toFixed(0) + '%';
  }

  public getStepStatus(step: IProcessingStep) {
    return !step.started
      ? 'Not Started'
      : step.done
      ? 'Done'
      : step.estimatedWait
      ? 'Running'
      : this.getPercent(step.percent);
  }

  private async createFrames(status: { percent: number }) {
    const frames = this.renderer.createCtxStream(this.video.layers[0] as IBaseVideoLayer, this.video, (pct) => {
      status.percent = pct;
      return !this.canceled;
    });
    return await this.converter.convertEnumerableCtxToFrames(frames);
  }

  private startProcessing(steps: IProcessingStep[]) {
    this.processingSteps = steps;
    this.processing = true;
    return steps;
  }

  public async exportGif(fast: boolean) {
    const [renderStep, convertStep] = this.startProcessing([
        { step: 'Rendering Frames', percent: 0, started: true },
        { step: 'Converting to GIF', percent: 0, estimatedWait: '' },
      ]),
      { width, height, durationMs, frameRate } = this.video,
      estimatedMs = this.converter.estimateGifRenderTime(width, height, durationMs, fast);

    this.outputType = { name: 'GIF', ext: 'gif', type: 'image/gif' };
    const { framesDir, framePaths } = await this.createFrames(renderStep);

    renderStep.done = true;
    this.startStep(convertStep, estimatedMs);

    this.tempOutputPath = this.electron.tempFilePath('gif');
    this.firstFramePath = framePaths[0];
    await this.converter.convertFramesToGif(framesDir, frameRate || 25, this.tempOutputPath, width, fast);
    this.processing = false;
    this.done = true;
  }

  public async exportWebm() {
    const [renderStep, convertStep] = this.startProcessing([
        { step: 'Rendering Frames', percent: 0, started: true },
        { step: 'Converting to WebM', percent: 0, estimatedWait: '' },
      ]),
      { width, height, durationMs } = this.video,
      estimatedMs = this.converter.estimateWebmRenderTime(width, height, durationMs);
    this.outputType = { name: 'WebM', ext: 'webm', type: 'video/webm' };
    const { framesDir, framePaths } = await await this.createFrames(renderStep);

    this.tempOutputPath = this.electron.tempFilePath('webm');
    this.firstFramePath = framePaths[0];
    renderStep.done = true;
    this.startStep(convertStep, estimatedMs);

    await this.converter.convertFramesToWebm(framesDir, this.tempOutputPath, width);
    this.processing = false;
    this.done = true;
  }

  private startStep(step: IProcessingStep, estimatedMs: number) {
    step.started = true;
    step.startTime = format(new Date(), 'eeee h:mma');
    step.estimatedWait = this.getExpectedTime(estimatedMs);
  }

  private getExpectedTime(mills: number) {
    const endTime = addMilliseconds(new Date(), mills);
    return formatDistance(endTime, new Date(), { includeSeconds: true });
  }

  private async exportWithGifJs() {
    this.processing = true;
    const frames = this.renderer.createCtxStream(this.video.layers[0] as IBaseVideoLayer, this.video, () => true);
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
    const frames = this.renderer.createFrames(this.video.layers[0] as IBaseVideoLayer, this.video, () => true);
    const framesDir = await this.converter.saveFrames(frames);
    if (!this.canceled) {
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
    this.electron.ipcRenderer.send('ondragstart', this.tempOutputPath, this.firstFramePath);
  }

  public async copyGif() {
    const blob = this.electron.loadBlob(this.tempOutputPath, { type: 'image/gif' }),
      buffer = await blob.arrayBuffer();
    console.log(blob, buffer);
  }
  public async exportWithWebmWriter() {
    const blob = await this.renderer.render(this.video.layers[0] as IBaseVideoLayer, this.video, () => true),
      tempWebMPath = this.electron.tempFilePath('webm');

    await this.electron.saveBlob(blob, tempWebMPath);
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
