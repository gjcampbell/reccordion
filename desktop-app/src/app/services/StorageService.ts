import { Injectable } from '@angular/core';
import { ElectronService } from 'app/services/electron.service';

@Injectable()
export class StorageService {
  public constructor(private electron: ElectronService) {}

  public getStreamWriter() {
    const content = this.electron.fs.readFileSync('c:/temp/junk.txt', {
      encoding: 'utf8',
    });
    console.log(content);
  }
}
