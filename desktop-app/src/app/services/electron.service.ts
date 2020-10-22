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

  public tempFilePath(ext: string) {
    const file = `${v4()}.${ext}`,
      dir = this.os.tmpdir();

    return this.path.join(dir, file);
  }

  public getResourcePath() {
    return window.process.resourcesPath;
  }

  public async saveBlob(blob: Blob, path: string) {
    return new Promise((resolver) => {
      const reader = new FileReader();
      reader.onload = () => {
        console.log(reader);
        if (reader.readyState === 2) {
          const buffer = Buffer.from(reader.result as ArrayBuffer);
          this.fs.writeFileSync(path, buffer);
          resolver();
        }
      };
      reader.readAsArrayBuffer(blob);
    });
  }

  public cmd(cmd: string, args: string[]): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const buff = this.childProcess.spawnSync(cmd, args, { windowsVerbatimArguments: true });
      if (buff.status !== 0) {
        reject(`exit code: ${buff.status}`);
      } else {
        resolve();
      }
    });
  }
}
