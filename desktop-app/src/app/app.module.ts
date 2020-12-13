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

import { AppComponent } from './app.component';
import { ExportDialog, RecorderComponent, ScreenPickerDialog } from './components/recorder.component';
import { GanttRowComponent } from './components/layer-gantt/gantt-row.component';
import { LayerGanttComponent } from './components/layer-gantt/layer-gantt.component';
import { PlayerCanvasComponent } from './components/player-canvas.component';
import { CanvasTextEditorComponent } from './components/canvas-text-editor/canvas-text-editor.component';
import { PlayerComponent } from './components/player.component';
import { VideoSizerComponent } from './components/video-sizer.component';
import { ScreenPickerComponent } from './components/screen-picker.component';
import { ScrubberComponent } from './components/layer-gantt/scrubber.component';

import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
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
    CanvasTextEditorComponent,
    ExportDialog,
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
    MatMenuModule,
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
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
