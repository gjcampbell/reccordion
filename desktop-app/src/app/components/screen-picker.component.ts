import { AfterViewInit, Component, EventEmitter, Input, Output } from '@angular/core';
import { ICapturable } from 'app/services/video.models';
import { RecordingService } from '../services/recording.service';

@Component({
  selector: 'app-screen-picker',
  template: `
    <mat-spinner *ngIf="loading"></mat-spinner>
    <mat-tab-group *ngIf="!loading">
      <mat-tab *ngFor="let group of screenGroups" [label]="group.name">
        <div class="screen-container">
          <div
            class="screen"
            *ngFor="let item of group.items"
            (click)="select(item)"
            (dblclick)="selectAndRecord(item)"
            [class.selected]="item === selected"
          >
            <div class="screen-icon">
              <img [src]="item.iconUrl" />
              <div class="mat-caption">{{ item.name }}</div>
            </div>
            <div class="screen-preview"><img [src]="item.previewUrl" /></div>
          </div>
        </div>
      </mat-tab>
    </mat-tab-group>
  `,
  styles: [
    `
      :host {
        width: 725px;
        display: flex;
        min-height: 400px;
        justify-content: center;
        align-items: center;
      }
      mat-tab-group {
        height: 100%;
        width: 100%;
      }
      .screen-container {
        display: grid;
        grid-gap: 25px;
        padding: 25px;
        grid-template-columns: 150px 150px 150px 150px;
        grid-template-rows: 160px;
        height: 350px;
        overflow: auto;
      }
      .screen {
        cursor: pointer;
        display: grid;
      }
      .screen:hover {
        outline: solid 5px #0068;
      }
      .screen.selected {
        outline: solid 5px #006;
      }
      .screen-icon {
        display: grid;
        height: 1.25rem;
        grid-template-columns: 30px 120px;
      }
      .screen-icon img {
        width: 1.25rem;
      }
      .screen-icon div {
        width: 100%;
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
      }
      .screen-preview {
        height: 150px;
      }
    `,
  ],
})
export class ScreenPickerComponent implements AfterViewInit {
  public loading: boolean;
  public screenGroups: { name: string; items: ICapturable[] }[] = [];
  public selected?: ICapturable;
  @Output()
  public itemSelected = new EventEmitter<ICapturable>();
  @Input()
  public startRecording: (item: ICapturable) => void;

  constructor(private readonly recorder: RecordingService) {}

  public ngAfterViewInit() {
    this.loadScreens();
  }

  public select(item: ICapturable) {
    this.selected = item;
    this.itemSelected.emit(item);
  }

  public selectAndRecord(item: ICapturable) {
    this.selected = item;
    this.startRecording(item);
  }

  public refresh() {
    this.loadScreens();
  }

  private async loadScreens() {
    this.loading = true;
    try {
      const capturables = await this.recorder.getScreens();
      this.screenGroups = [
        { name: 'Windows', items: capturables.filter((c) => !c.isScreen) },
        { name: 'Screens', items: capturables.filter((c) => c.isScreen) },
      ];
    } finally {
      this.loading = false;
    }
  }
}
