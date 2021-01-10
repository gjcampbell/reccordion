import { Injectable } from '@angular/core';

// If you import a module but never use any of the imported values other than as TypeScript types,
// the resulting javascript file will look as if you never imported the module at all.
import { ipcRenderer, webFrame, remote, desktopCapturer } from 'electron';
import * as childProcess from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { v4 } from 'uuid';

@Injectable({
  providedIn: 'root',
})
export class ElectronService {
  ipcRenderer: typeof ipcRenderer;
  webFrame: typeof webFrame;
  remote: typeof remote;
  childProcess: typeof childProcess;
  fs: typeof fs;
  path: typeof path;
  desktopCapturer: typeof desktopCapturer;
  os: typeof os;
  dialog: typeof remote.dialog;

  get isElectron(): boolean {
    return !!(window && window.process && window.process.type);
  }

  constructor() {
    // Conditional imports
    if (this.isElectron) {
      this.ipcRenderer = window.require('electron').ipcRenderer;
      this.webFrame = window.require('electron').webFrame;
      this.desktopCapturer = window.require('electron').desktopCapturer;
      this.remote = window.require('electron').remote;

      this.path = window.require('path');
      this.childProcess = window.require('child_process');
      this.fs = window.require('fs');
      this.os = window.require('os');
    }
  }

  public getFiles(dir: string): Promise<string[]> {
    return new Promise((resolve, reject) => {
      this.fs.readdir(dir, (e, files) => {
        if (e) {
          reject(e);
        } else {
          resolve(files.map((f) => this.path.join(dir, f)));
        }
      });
    });
  }

  public tempDirPath() {
    return this.path.join(this.os.tmpdir(), v4());
  }

  public tempFilePath(ext: string) {
    const file = `${v4()}.${ext}`,
      dir = this.os.tmpdir();

    return this.path.join(dir, file);
  }

  public getResourcePath() {
    return window.process.resourcesPath;
  }

  public pathJoin(...parts: string[]) {
    return this.path.join(...parts);
  }

  public async mkDir(dir: string) {
    this.fs.mkdirSync(dir);
  }

  public copyFile(source: string, dest: string) {
    this.fs.copyFileSync(source, dest);
  }

  public loadBlob(path: string, props: { type: string }) {
    const fileBuff = this.fs.readFileSync(path);
    return new Blob([fileBuff], props);
  }

  public async saveBlob(blob: Blob, path: string) {
    return new Promise<void>((resolver) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (reader.readyState === 2) {
          const buffer = Buffer.from(reader.result as ArrayBuffer);
          this.fs.writeFileSync(path, buffer);
          resolver();
        }
      };
      reader.readAsArrayBuffer(blob);
    });
  }

  public async httpGet(url: string) {
    return await this.ipcRenderer.invoke('http', JSON.stringify({ url, method: 'GET' }));
  }

  public async cmd(cmd: string, args: string[], cwd: string = undefined): Promise<boolean> {
    return await this.ipcRenderer.invoke('cmd', JSON.stringify({ cmd, args, cwd }));
    // return new Promise<boolean>(async (resolve, reject) => {
    //   const child = this.childProcess.spawnSync(cmd, args, {
    //     windowsVerbatimArguments: true,
    //     cwd,
    //   });
    //   resolve(true);
    // });
  }

  public cmdTryingToReadStdoutProgress(
    cmd: string,
    args: string[],
    cwd: string = undefined,
    progress: (message: string) => void = undefined
  ): Promise<boolean> {
    return new Promise<boolean>(async (resolve, reject) => {
      const child = this.childProcess.spawn(cmd, args, {
          windowsVerbatimArguments: true,
          cwd,
          shell: true,
        }),
        reportProgress = (chunk: Buffer) => {
          const message = chunk.toString('utf-8');
          if (progress) {
            progress(message);
          }
          console.log(message);
        },
        progressTo = setInterval(() => {
          console.log(child);
        }, 1000),
        done = (result: boolean) => {
          clearInterval(progressTo);
          resolve(result);
        };

      child
        .on('exit', (code) => done(code === 0))
        .on('error', (err) => {
          console.error(err);
          done(false);
        });

      child.stdout.on('data', reportProgress);
      child.stderr.on('data', reportProgress);
    });
  }
}
