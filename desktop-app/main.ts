import { app, BrowserWindow, screen, ipcMain, nativeImage } from 'electron';
import { IpcMainEvent } from 'electron/main';
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

ipcMain.on('ondragstart', (evt: IpcMainEvent, path: string) => {
  evt.sender.startDrag({ file: path, icon: images.accordionDrag });
});

const images = {
  accordionDrag: nativeImage.createFromDataURL(
    'data:image/png;base64,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'
  ),
};
