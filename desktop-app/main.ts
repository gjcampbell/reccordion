import { app, BrowserWindow, ipcMain, nativeImage, IpcMainInvokeEvent } from 'electron';
import { IpcMainEvent } from 'electron/main';
import { spawn, spawnSync } from 'child_process';
import * as https from 'https';
import * as path from 'path';
import * as url from 'url';

let win: BrowserWindow = null;
const args = process.argv.slice(1),
  serve = args.some((val) => val === '--serve'),
  windows = new Set<BrowserWindow>();

app.commandLine.appendSwitch('js-flags', '--expose_gc --max-old-space-size=512');

function createWindow(): BrowserWindow {
  // Create the browser window.
  win = new BrowserWindow({
    x: 0,
    y: 0,
    width: 1000,
    height: 750,
    titleBarStyle: 'hidden',
    frame: false,
    webPreferences: {
      nodeIntegration: true,
      allowRunningInsecureContent: serve ? true : false,
      contextIsolation: false, // false if you want to run 2e2 test with Spectron
      enableRemoteModule: true, // true if you want to run 2e2 test  with Spectron or use remote module in renderer context (ie. Angular)
    },
  });

  if (serve) {
    win.webContents.openDevTools();

    require('electron-reload')(__dirname, {
      electron: require(`${__dirname}/node_modules/electron`),
    });
    win.loadURL('http://localhost:4200');
  } else {
    win.loadURL(
      url.format({
        pathname: path.join(__dirname, 'dist/index.html'),
        protocol: 'file:',
        slashes: true,
      })
    );
  }

  // Emitted when the window is closed.
  win.on('closed', () => {
    // Dereference the window object, usually you would store window
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    windows.delete(win);
    if (windows.size === 0) {
      app.quit();
    }
    win = null;
  });

  windows.add(win);
  return win;
}

try {
  // This method will be called when Electron has finished
  // initialization and is ready to create browser windows.
  // Some APIs can only be used after this event occurs.
  // Added 400 ms to fix the black background issue while using transparent window. More detais at https://github.com/electron/electron/issues/15947
  app.on('ready', () => setTimeout(createWindow, 400));
  // Quit when all windows are closed.
  app.on('window-all-closed', () => {
    // On OS X it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  app.on('activate', () => {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (win === null) {
      createWindow();
    }
  });
} catch (e) {
  // Catch Error
  // throw e;
}

ipcMain.on('ondragstart', (evt: IpcMainEvent, path: string, icon: string) => {
  evt.sender.startDrag({ file: path, icon });
});

ipcMain.handle('cmd', (evt: IpcMainInvokeEvent, cmdJson: string) => {
  return new Promise<void>((resolve) => {
    const { cmd, args, cwd } = JSON.parse(cmdJson),
      child = spawn(cmd, args, {
        windowsVerbatimArguments: true,
        cwd,
      });
    console.log('starting cmd', cmd, args, cwd);
    child.on('close', () => resolve());
    child.on('error', () => resolve());
    child.on('exit', () => resolve());
  });
});

ipcMain.handle('http', (evt: IpcMainInvokeEvent, argsJson: string) => {
  const request = JSON.parse(argsJson);
  return new Promise<string>((resolve) => {
    const req = https.request(request, (response) => {
      let result = '';
      response.setEncoding('utf8');
      response.on('data', (chunk) => (result += chunk));
      response.on('end', () => resolve(result));
    });
    req.on('error', (e) => console.error(e));
    req.end();
  });
});
