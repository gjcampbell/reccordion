import { Injectable } from '@angular/core';
import { ElectronService } from 'app/services/electron.service';
import { ICapturable, ICapturer } from './video.models';
declare var MediaRecorder: {
  /**
   * https://developer.mozilla.org/en-US/docs/Web/Media/Formats/codecs_parameter
   *
   */
  new (stream: MediaStream, options: { mimeType: string; videoBitsPerSecond: number }): MediaRecorder;
  start(): void;
  stop(): void;
  pause(): void;
  resume(): void;
  ondataavailable: (event: BlobEvent) => void;
  onstop: () => void;
};

const kbps = 1024,
  mbps = kbps * kbps;

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
      videoRecorder = new MediaRecorder(videoStream, {
        mimeType: 'video/webm;codecs="vp9"',
        videoBitsPerSecond: 4 * mbps,
      });

    return this.createCapturer(videoRecorder, view.name, view.iconUrl);
  }

  private createCapturer(videoRecorder: MediaRecorder, name: string, icon: string) {
    let duration = 0,
      startTime: number = 0;

    const chunks: Blob[] = [],
      result: ICapturer = {
        getStream: () => videoRecorder.stream,
        isRecording: () => videoRecorder.state === 'recording',
        getBlob: () => new Blob(chunks, { type: 'video/webm' }),
        getDuration: () => duration + (videoRecorder.state === 'recording' ? Date.now() - startTime : 0),
        pause: () =>
          new Promise((resolve) => {
            duration += Date.now() - startTime;
            videoRecorder.ondataavailable = (e) => {
              chunks.push(e.data);
              resolve();
            };

            videoRecorder.requestData();
            videoRecorder.pause();
          }),
        capture: () => {
          if (videoRecorder.state === 'paused') {
            videoRecorder.resume();
          } else {
            videoRecorder.start();
          }
          startTime = Date.now();
        },
        source: {
          name,
          icon,
        },
      };

    return result;
  }
}
