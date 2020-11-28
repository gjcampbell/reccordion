import { Injectable } from '@angular/core';
import { IBaseVideoLayer, IVideoLayer } from 'app/services/video.models';

@Injectable()
export class PlayerCanvasModel {
  private selection = new Set<any>();

  public video: IBaseVideoLayer;
  public layers: IVideoLayer[];
  public height: number;
  public width: number;
  public ctx: CanvasRenderingContext2D;
  public isSelected(value: any) {
    return this.selection.has(value);
  }
  public select(...values: any[]) {
    this.selection.clear();
    for (const item of values) {
      this.selection.add(item);
    }
  }
  public hasSelection() {
    return this.selection.size > 0;
  }
  public clearSelection() {
    this.selection.clear();
  }
}
