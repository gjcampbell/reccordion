import { AfterViewInit, Component } from '@angular/core';
import { ElectronService } from './services/electron.service';
import { TranslateService } from '@ngx-translate/core';
import { AppConfig } from '../environments/environment';
import { Titlebar } from 'custom-electron-titlebar';
import { UpdateService } from './services/update.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements AfterViewInit {
  constructor(
    private electronService: ElectronService,
    private translate: TranslateService,
    private readonly updateService: UpdateService
  ) {
    this.translate.setDefaultLang('en');
    console.log('AppConfig', AppConfig);

    if (electronService.isElectron) {
      console.log(process.env);
      console.log('Run in electron');
      console.log('Electron ipcRenderer', this.electronService.ipcRenderer);
      console.log('NodeJS childProcess', this.electronService.childProcess);
    } else {
      console.log('Run in browser');
    }
  }

  public ngAfterViewInit() {
    document.getElementById('splash').remove();
    this.createMenu();
  }

  private createMenu() {
    (window as any).onTitlebarReady = async (titlebar: Titlebar) => {
      const { Menu, MenuItem } = this.electronService.remote,
        menu = new Menu();

      menu.append(
        new MenuItem({
          label: 'Help',
          click: () => this.electronService.openInBrowser('https://github.com/gjcampbell/reccordion'),
        })
      );
      titlebar.updateMenu(menu);

      const update = await this.updateService.checkForUpdates();
      if (update.hasUpdate) {
        menu.append(
          new MenuItem({
            label: 'Update Available',
            click: () => update.openDownload(),
          })
        );
        titlebar.updateMenu(menu);
      }
    };
  }
}
