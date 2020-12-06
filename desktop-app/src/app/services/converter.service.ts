import { Injectable } from '@angular/core';
import { ElectronService } from './electron.service';
import { AppConfig } from './../../environments/environment';
import { IFrameExtractor } from './interfaces';

@Injectable()
export class ConverterService implements IFrameExtractor {
  private ffmpegPath: string;

  constructor(private readonly electron: ElectronService) {
    this.ffmpegPath = AppConfig.production
      ? this.electron.path.join(this.electron.getResourcePath(), `extraResources`, `ffmpeg.exe`)
      : this.electron.path.resolve(this.electron.getResourcePath(), './../../../../extraResources/ffmpeg.exe');
  }

  public async convertToGif(inputWebmPath: string, gifPath: string) {
    const palettePath = this.electron.tempFilePath('png'),
      cmd = this.ffmpegPath,
      paletteArgs = ['-y', '-i', `"${inputWebmPath}"`, '-vf', 'palettegen', `"${palettePath}"`],
      gifArgs = [
        '-y',
        '-i',
        `"${inputWebmPath}"`,
        '-i',
        `"${palettePath}"`,
        '-filter_complex',
        'paletteuse',
        '-r 10',
        `"${gifPath}"`,
      ];

    await this.electron.cmd(cmd, paletteArgs);
    await this.electron.cmd(cmd, gifArgs);
  }

  public async extractFrames(webmBlob: Blob, fps: number = 25): Promise<{ files: string[]; blobs: Blob[] }> {
    const dir = this.electron.tempDirPath(),
      webmPath = this.electron.tempFilePath('webm'),
      cmd = this.ffmpegPath,
      args = [
        '-i',
        `"${webmPath}"`,
        `-r ${fps}`,
        '-vsync vfr',
        '-qscale:v 5',
        '-compression_level 6',
        `"${dir}\\f%05d.jpg"`,
      ];

    this.electron.mkDir(dir);
    await this.electron.saveBlob(webmBlob, webmPath);
    await this.electron.cmd(cmd, args);
    const files = await this.electron.getFiles(dir);
    return {
      files,
      blobs: files.map((f) => this.electron.loadBlob(f, { type: 'image/jpeg' })),
    };
  }
}
