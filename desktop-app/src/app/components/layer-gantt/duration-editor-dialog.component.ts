import { Component, Inject } from '@angular/core';
import { PlayerCanvasModel } from '../player-canvas.model';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
  selector: 'app-duration-editor',
  template: `
    <div mat-dialog-content class="container">
      <div class="label">How long should the video be?</div>
      <div class="duration-input">
        <input type="number" [(ngModel)]="minutes" min="0" />:
        <input type="number" [(ngModel)]="seconds" min="0" step=".1" />
      </div>
      <div class="label">(minutes:seconds)</div>
    </div>
    <div mat-dialog-actions align="end">
      <button mat-flat-button color="primary" [disabled]="!canApply" (click)="done()">Apply</button>
      <button mat-button (click)="cancel()">Cancel</button>
    </div>
  `,
  styles: [
    `
      .container {
        text-align: center;
      }
      .duration-input {
        background: #fff2;
        color: #fff;
        display: inline-block;
      }
      input {
        background: #0000;
        border: 0;
        color: #fff;
        text-align: center;
        width: 57px;
        padding: 0.5rem 0;
        outline: none;
        font-size: 1rem;
      }
      input::-webkit-inner-spin-button,
      input::-webkit-outer-spin-button {
        appearance: none;
        width: 0;
      }
      .label {
        color: #dadada;
      }
    `,
  ],
})
export class DurationEditorDialog {
  protected seconds: number;
  protected minutes: number;

  protected get canApply() {
    return this.getDurationMs() > 0;
  }
  constructor(
    @Inject(MAT_DIALOG_DATA) private readonly model: PlayerCanvasModel,
    private readonly dialogRef: MatDialogRef<DurationEditorDialog>
  ) {
    this.dialogRef.afterOpened().subscribe(() => this.loadCurrentDur());
  }
  protected done() {
    this.dialogRef.close(this.getDurationMs());
  }
  protected cancel() {
    this.dialogRef.close();
  }
  protected getDuration() {
    return this.model.formatAsFrame(this.getDurationMs());
  }
  private getDurationMs() {
    return (this.minutes * 60 + this.seconds) * 1000;
  }
  private loadCurrentDur() {
    const { minute, second, frame } = this.model.getFrameTime(this.model.video.getDurationMs());
    this.minutes = minute;
    this.seconds = parseFloat((second + frame / this.model.fps).toFixed(1));
  }
}
