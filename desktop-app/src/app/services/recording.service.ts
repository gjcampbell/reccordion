import { Injectable } from '@angular/core';
import { ElectronService } from 'app/services/electron.service';
declare var MediaRecorder: {
  /**
   * https://developer.mozilla.org/en-US/docs/Web/Media/Formats/codecs_parameter
   *
   */
  new (stream: MediaStream, options: { mimeType: 'video/webm' }): MediaRecorder;
  start(): void;
  stop(): void;
  pause(): void;
  resume(): void;
  ondataavailable: (event: BlobEvent) => void;
  onstop: () => void;
};

export interface ICapturable {
  name: string;
  isScreen: boolean;
  id: string;
  iconUrl: string;
  previewUrl: string;
  displayId: string;
}

export interface ICapturer {
  getStream: () => MediaStream;
  getBlob: () => Blob;
  getDuration: () => number;
  pause: () => void;
  capture: () => void;
  isRecording: () => boolean;
}

@Injectable()
export class RecordingService {
  public constructor(private readonly electron: ElectronService) {}

  public async getScreens() {
    const sources = await this.electron.desktopCapturer.getSources({
      types: ['window', 'screen'],
      fetchWindowIcons: true,
    });

    return sources.map(
      (s) =>
        ({
          name: s.name,
          isScreen: s.name === 'Entire Screen' || s.name.startsWith('Screen '),
          id: s.id,
          iconUrl: s.appIcon ? s.appIcon.toDataURL() : undefined,
          previewUrl: s.thumbnail.toDataURL(),
          displayId: s.display_id,
        } as ICapturable)
    );
  }

  public async record(audio: boolean, view: ICapturable) {
    const videoStream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: view.id,
          },
        } as any,
      }),
      videoRecorder = new MediaRecorder(videoStream, { mimeType: 'video/webm' });

    return this.createCapturer(videoRecorder);
  }

  private createCapturer(videoRecorder: MediaRecorder) {
    let duration = 0;
    const buffer: Blob[] = [],
      result: ICapturer = {
        getStream: () => videoRecorder.stream,
        isRecording: () => videoRecorder.state === 'recording',
        getBlob: () => new Blob(buffer, { type: 'video/webm' }),
        getDuration: () => duration,
        pause: () => {
          if (videoRecorder.state === 'recording') {
            videoRecorder.pause();
          }
        },
        capture: () => {
          if (videoRecorder.state === 'paused') {
            videoRecorder.resume();
          } else {
            videoRecorder.start();
          }
        },
      };

    videoRecorder.ondataavailable = (e) => {
      buffer.push(e.data);
      duration = e.timecode;
    };

    return result;
  }
}
