import { Injectable } from '@angular/core';
import { ElectronService } from './electron.service';
import { AppConfig } from './../../environments/environment';
import { IFrameExtractor } from './interfaces';
import * as GIF from 'gif.js';

@Injectable()
export class ConverterService implements IFrameExtractor {
  private readonly ffmpegPath: string;
  private readonly gifskiPath: string;

  constructor(private readonly electron: ElectronService) {
    this.ffmpegPath = this.getResourcePath('ffmpeg.exe');
    this.gifskiPath = this.getResourcePath('gifski.exe');
  }

  private getResourcePath(resource: string) {
    return AppConfig.production
      ? this.electron.path.join(this.electron.getResourcePath(), `extraResources/${resource}`)
      : this.electron.path.resolve(this.electron.getResourcePath(), `./../../../../extraResources/${resource}`);
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

  public async saveFrames(frames: AsyncIterableIterator<Blob>) {
    const framePath = this.electron.tempDirPath();
    this.electron.mkDir(framePath);

    let index = 0;
    for await (const frame of frames) {
      const frameFileName = `frame-${index.toString().padStart(5, '0')}.png`,
        path = this.electron.pathJoin(framePath, frameFileName);
      await this.electron.saveBlob(frame, path);
      index++;
    }

    return framePath;
  }

  public estimateWebmRenderTime(width: number, height: number, durationMs: number) {
    const sec = durationMs / 1000,
      area = width * height,
      areaSeconds = area * sec,
      areaPerSec = 345600,
      expectedSec = areaSeconds / areaPerSec;
    return expectedSec * 1000;
  }

  public estimateGifRenderTime(width: number, height: number, durationMs: number, fastGif: boolean) {
    const sec = durationMs / 1000,
      area = width * height,
      areaSeconds = area * sec,
      areaPerSec = fastGif ? 115200 : 34560,
      expectedSec = areaSeconds / areaPerSec;
    return expectedSec * 1000;
  }

  /**
   * GIF.JS creates flickery gifs
   */
  public async convertEnumerableCtxToGif(
    frames: AsyncIterableIterator<CanvasRenderingContext2D>,
    fps: number,
    gifPath: string,
    width: number,
    height: number
  ): Promise<void> {
    const frameMills = 1000 / fps,
      gif = new GIF({
        quality: 10,
        width,
        height,
        workerScript: 'assets/gif.worker.js',
      });
    const dump = this.electron.tempDirPath();
    this.electron.mkDir(dump);

    for await (const frame of frames) {
      gif.addFrame(frame, { delay: frameMills, copy: true });
    }
    return new Promise((resolve) => {
      gif.on('finished', (blob) => {
        this.electron.saveBlob(blob, gifPath).then(resolve);
        resolve();
      });
      gif.on('progress', (pct) => {
        console.log(pct);
      });
      gif.render();
    });
  }
  private getFrame(ctx: CanvasRenderingContext2D): Promise<Blob> {
    return new Promise((r) => {
      ctx.canvas.toBlob(r, 'image/png');
    });
  }

  public async convertFramesToWebmToGif(framePath: string, gifPath: string, width: number) {
    const webmPath = this.electron.tempFilePath('webm'),
      webmArgs = ['-i', `"${framePath}\\frame-%05d.png"`, '-vf', `scale=${width}:-1`, `"${webmPath}"`];

    await this.electron.cmd(this.ffmpegPath, webmArgs, './');
    await this.convertToGif(webmPath, gifPath);
  }

  public async convertFramesToWebm(framePath: string, webmPath: string, width: number) {
    const webmArgs = ['-i', `"${framePath}\\frame-%05d.png"`, '-vf', `scale=${width}:-1`, `"${webmPath}"`];

    await this.electron.cmd(this.ffmpegPath, webmArgs, './');
  }

  public async convertEnumerableCtxToFrames(frames: AsyncIterableIterator<CanvasRenderingContext2D>) {
    const framesDir = this.electron.tempDirPath(),
      framePaths: string[] = [];
    await this.electron.mkDir(framesDir);
    let i = 0;
    for await (const frame of frames) {
      const path = this.electron.pathJoin(framesDir, `frame-${i.toString().padStart(5, '0')}.png`),
        imgBlob = await this.getFrame(frame);

      framePaths.push(path);
      this.electron.saveBlob(imgBlob, path);
      i++;
    }
    return { framesDir, framePaths };
  }

  public async convertFramesToGif(
    framesDir: string,
    fps: number,
    gifPath: string,
    width: number,
    fast: boolean,
    quality: number = 100
  ) {
    const args = ['-o', `"${gifPath}"`, `--fps ${fps}`, `-W ${width}`, 'frame-*.png'];
    if (fast) {
      args.push('--fast');
    }
    if (quality !== 100) {
      args.push(`--quality ${quality}`);
    }

    await this.electron.cmd(this.gifskiPath, args, framesDir);
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
