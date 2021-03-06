import 'reflect-metadata';
import '../polyfills';

import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClientModule, HttpClient } from '@angular/common/http';

// NG Translate
import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';

import { ConverterService } from './services/converter.service';
import { ElectronService } from './services/electron.service';
import { FastNgUpdateService } from './services/fast-ng-update.service';
import { RecordingService } from './services/recording.service';
import { RendererService, ReqRendererService } from './services/renderer.service';
import { ShapeService } from './services/shape.service';
import { UpdateService } from './services/update.service';

import { AppComponent } from './app.component';
import { CanvasTextEditorComponent } from './components/canvas-text-editor/canvas-text-editor.component';
import { BigOverlayComponent } from './components/big-overlay/big-overlay.component';
import { DurationEditorDialog } from './components/layer-gantt/duration-editor-dialog.component';
import {
  ExportDialog,
  ExportPreviewComponent,
  RecorderComponent,
  ScreenPickerDialog,
} from './components/recorder/recorder.component';
import { GanttRowComponent } from './components/layer-gantt/gantt-row.component';
import { LayerGanttComponent } from './components/layer-gantt/layer-gantt.component';
import { PlayerCanvasComponent } from './components/player-canvas.component';
import { PlayerComponent } from './components/player.component';
import { VideoSizerComponent } from './components/video-sizer/video-sizer.component';
import { ScreenPickerComponent } from './components/screen-picker.component';
import { ScrubberComponent } from './components/layer-gantt/scrubber.component';

import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSliderModule } from '@angular/material/slider';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';

// AoT requires an exported function for factories
export function HttpLoaderFactory(http: HttpClient): TranslateHttpLoader {
  return new TranslateHttpLoader(http, './assets/i18n/', '.json');
}

@NgModule({
  declarations: [
    AppComponent,
    BigOverlayComponent,
    CanvasTextEditorComponent,
    DurationEditorDialog,
    ExportDialog,
    ExportPreviewComponent,
    GanttRowComponent,
    LayerGanttComponent,
    PlayerCanvasComponent,
    PlayerComponent,
    RecorderComponent,
    ScreenPickerComponent,
    ScreenPickerDialog,
    ScrubberComponent,
    VideoSizerComponent,
  ],
  imports: [
    BrowserAnimationsModule,
    BrowserModule,
    FormsModule,
    HttpClientModule,
    MatButtonModule,
    MatDialogModule,
    MatInputModule,
    MatMenuModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    MatSliderModule,
    MatTabsModule,
    MatTooltipModule,
    TranslateModule.forRoot({
      loader: {
        provide: TranslateLoader,
        useFactory: HttpLoaderFactory,
        deps: [HttpClient],
      },
    }),
  ],
  providers: [
    ConverterService,
    ElectronService,
    FastNgUpdateService,
    RecordingService,
    ReqRendererService,
    RendererService,
    ShapeService,
    UpdateService,
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
