import { Injectable } from '@angular/core';
import { ElectronService } from './electron.service';

interface GithubReleaseResponse {
  tag_name: string;
  assets: { browser_download_url: string; name: string }[];
}

@Injectable()
export class UpdateService {
  private versionMatcher = /^v\d+(\.\d+){2}$/;
  private latestReleaseUrl = 'https://api.github.com/repos/gjcampbell/reccordion/releases/latest';

  constructor(private readonly electron: ElectronService) {}

  public async checkForUpdates() {
    const latest = await this.getLatestRelease(),
      currentVersion = await this.getCurrentVersion();

    return {
      hasUpdate: latest.version && latest.version !== currentVersion,
      openDownload: () => this.electron.openInBrowser(latest.installerUrl),
    };
  }

  public;

  private async getLatestRelease() {
    const result = await this.electron.httpGet<GithubReleaseResponse>(this.latestReleaseUrl),
      installerAsset = result ? result.assets.find((a) => a.name.endsWith('installer.exe')) : null,
      installerUrl = installerAsset ? installerAsset.browser_download_url : null,
      version = result && this.versionMatcher.test(result.tag_name) ? result.tag_name : null;

    return { installerUrl, version };
  }

  private getCurrentVersion() {
    return 'v' + this.electron.remote.app.getVersion();
  }
}
