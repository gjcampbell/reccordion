import { Injectable } from '@angular/core';
import { ElectronService } from './electron.service';
import { AppConfig } from './../../environments/environment';

@Injectable()
export class ConverterService {
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
}
