import 'reflect-metadata';
import '../polyfills';

import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClientModule, HttpClient } from '@angular/common/http';
import { SharedModule } from './shared/shared.module';

// NG Translate
import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';

import { AppComponent } from './app.component';
import { StorageService } from './services/StorageService';
import { RecordingService } from './services/recording.service';
import { RendererService } from './services/renderer.service';
import { ExportDialog, RecorderComponent, ScreenPickerDialog } from './components/recorder.component';
import { PlayerComponent } from './components/player.component';
import { VideoSizerComponent } from './components/video-sizer.component';
import { ScreenPickerComponent } from './components/screen-picker.component';
import { ElectronService } from './services/electron.service';

import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
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
    ExportDialog,
    PlayerComponent,
    RecorderComponent,
    ScreenPickerComponent,
    ScreenPickerDialog,
    VideoSizerComponent,
  ],
  imports: [
    BrowserAnimationsModule,
    BrowserModule,
    FormsModule,
    HttpClientModule,
    SharedModule,
    MatButtonModule,
    MatDialogModule,
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
  providers: [StorageService, RecordingService, ElectronService, RendererService],
  bootstrap: [AppComponent],
})
export class AppModule {}
