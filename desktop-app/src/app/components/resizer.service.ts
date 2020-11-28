import { Injectable } from '@angular/core';
import { Pt, diffPt, dividePt, ShapePoint } from 'app/services/graphics.models';

@Injectable()
export class ResizerService {
  private minSize = 50;

  public resize(dir: string, model: IResizeable, origEvt: MouseEvent, bounds: { width: number; height: number }) {
    if (dir in this) {
      this[dir](model, origEvt, bounds);
    }
  }

  private scalePoints(model: IResizeable, origin: Pt, scale: Pt) {
    for (const pt of model.points) {
      pt.scale(origin, scale);
    }
  }

  public nw(model: IResizeable, origEvt: MouseEvent, bounds: { width: number; height: number }) {
    const init = this.init(model, origEvt),
      scaleOrigin = { x: init.right, y: init.bottom },
      maxX = init.right - this.minSize,
      maxY = init.bottom - this.minSize;
    this.bind(init, (deltX, deltY) => {
      const newX = Math.max(0, Math.min(maxX, init.pos.x + deltX)),
        newY = Math.max(0, Math.min(maxY, init.pos.y + deltY)),
        newW = Math.max(this.minSize, Math.min(init.right, init.width - deltX)),
        newH = Math.max(this.minSize, Math.min(init.bottom, init.height - deltY)),
        scaleDenom = diffPt(model.position, scaleOrigin),
        scaleNum = diffPt({ x: newX, y: newY }, scaleOrigin),
        scale = dividePt(scaleNum, scaleDenom);

      this.scalePoints(model, scaleOrigin, scale);
      this.updateModel(model, { newX, newY, newW, newH });
    });
  }

  public n(model: IResizeable, origEvt: MouseEvent, bounds: { width: number; height: number }) {
    const init = this.init(model, origEvt),
      scaleOrigin = { x: model.position.x, y: init.bottom },
      maxY = init.bottom - this.minSize;
    this.bind(init, (deltX, deltY) => {
      const newY = Math.max(0, Math.min(maxY, init.pos.y + deltY)),
        newH = Math.max(this.minSize, Math.min(init.bottom, init.height - deltY)),
        scale = newH / model.height;

      this.scalePoints(model, scaleOrigin, { x: 1, y: scale });
      this.updateModel(model, { newY, newH });
    });
  }

  public ne(model: IResizeable, origEvt: MouseEvent, bounds: { width: number; height: number }) {
    const init = this.init(model, origEvt),
      scaleOrigin = { x: init.left, y: init.bottom },
      maxY = init.bottom - this.minSize,
      maxW = bounds.width - init.left;
    this.bind(init, (deltX, deltY) => {
      const newY = Math.max(0, Math.min(maxY, init.pos.y + deltY)),
        newW = Math.max(this.minSize, Math.min(maxW, init.width + deltX)),
        newH = Math.max(this.minSize, Math.min(init.bottom, init.height - deltY)),
        scaleDenom = { x: model.width, y: model.position.y - scaleOrigin.y },
        scaleNum = { x: newW, y: newY - scaleOrigin.y },
        scale = dividePt(scaleNum, scaleDenom);

      this.scalePoints(model, scaleOrigin, scale);
      this.updateModel(model, { newY, newW, newH });
    });
  }

  public e(model: IResizeable, origEvt: MouseEvent, bounds: { width: number; height: number }) {
    const init = this.init(model, origEvt),
      scaleOrigin = { x: init.left, y: init.top },
      maxW = bounds.width - init.left;
    this.bind(init, (deltX, deltY) => {
      const newW = Math.max(this.minSize, Math.min(maxW, init.width + deltX)),
        scale = newW / model.width;

      this.scalePoints(model, scaleOrigin, { x: scale, y: 1 });
      this.updateModel(model, { newW });
    });
  }

  public se(model: IResizeable, origEvt: MouseEvent, bounds: { width: number; height: number }) {
    const init = this.init(model, origEvt),
      maxW = bounds.width - model.position.x,
      maxH = bounds.height - model.position.y,
      scaleOrigin = { ...model.position };
    this.bind(init, (deltX, deltY) => {
      const newW = Math.max(this.minSize, Math.min(maxW, init.width + deltX)),
        newH = Math.max(this.minSize, Math.min(maxH, init.height + deltY)),
        scaleDenom = { x: model.width, y: model.height },
        scaleNum = { x: newW, y: newH },
        scale = dividePt(scaleNum, scaleDenom);

      this.scalePoints(model, scaleOrigin, scale);
      this.updateModel(model, { newW, newH });
    });
  }

  public s(model: IResizeable, origEvt: MouseEvent, bounds: { width: number; height: number }) {
    const init = this.init(model, origEvt),
      maxH = bounds.height - model.position.y,
      scaleOrigin = { ...model.position };
    this.bind(init, (deltX, deltY) => {
      const newH = Math.max(this.minSize, Math.min(maxH, init.height + deltY)),
        scale = newH / model.height;

      this.scalePoints(model, scaleOrigin, { x: 1, y: scale });
      this.updateModel(model, { newH });
    });
  }

  public sw(model: IResizeable, origEvt: MouseEvent, bounds: { width: number; height: number }) {
    const init = this.init(model, origEvt),
      maxX = model.position.x + model.width,
      maxH = bounds.height - model.position.y,
      scaleOrigin = { x: init.right, y: init.top };
    this.bind(init, (deltX, deltY) => {
      const newX = Math.max(0, Math.min(maxX - this.minSize, init.pos.x + deltX)),
        newW = Math.max(this.minSize, Math.min(maxX, init.width - deltX)),
        newH = Math.max(this.minSize, Math.min(maxH, init.height + deltY)),
        scaleDenom = { x: model.position.x - scaleOrigin.x, y: model.height },
        scaleNum = { x: newX - scaleOrigin.x, y: newH },
        scale = dividePt(scaleNum, scaleDenom);

      this.scalePoints(model, scaleOrigin, scale);
      this.updateModel(model, { newX, newW, newH });
    });
  }

  public w(model: IResizeable, origEvt: MouseEvent, bounds: { width: number; height: number }) {
    const init = this.init(model, origEvt),
      maxX = model.position.x + model.width,
      scaleOrigin = { x: init.right, y: init.top };
    this.bind(init, (deltX, deltY) => {
      const newX = Math.max(0, Math.min(maxX - this.minSize, init.pos.x + deltX)),
        newW = Math.max(this.minSize, Math.min(maxX, init.width - deltX)),
        scaleDenom = model.position.x - scaleOrigin.x,
        scaleNum = newX - scaleOrigin.x,
        scale = scaleNum / scaleDenom;

      this.scalePoints(model, scaleOrigin, { x: scale, y: 1 });
      this.updateModel(model, { newX, newW });
    });
  }

  private updateModel(model: IResizeable, update: { newX?: number; newY?: number; newW?: number; newH?: number }) {
    if ('newX' in update) {
      model.position.x = update.newX;
    }
    if ('newY' in update) {
      model.position.y = update.newY;
    }
    if ('newW' in update) {
      model.width = update.newW;
    }
    if ('newH' in update) {
      model.height = update.newH;
    }
  }

  private init(model: IResizeable, origEvt: MouseEvent): IInitData {
    return {
      pageX: origEvt.pageX,
      pageY: origEvt.pageY,
      pos: { ...model.position },
      width: model.width,
      height: model.height,
      left: model.position.x,
      right: model.position.x + model.width,
      top: model.position.y,
      bottom: model.position.y + model.height,
    };
  }

  private bind(init: IInitData, moveHandler: (deltX: number, deltY: number) => void) {
    const mouseup = () => {
        window.removeEventListener('mouseup', mouseup);
        window.removeEventListener('mousemove', mousemove);
      },
      mousemove = (evt: MouseEvent) => {
        const deltX = evt.pageX - init.pageX,
          deltY = evt.pageY - init.pageY;

        moveHandler(deltX, deltY);
      };
    window.addEventListener('mouseup', mouseup);
    window.addEventListener('mousemove', mousemove);
  }
}

interface IInitData {
  pageX: number;
  pageY: number;
  pos: { x: number; y: number };
  width: number;
  height: number;
  left: number;
  right: number;
  top: number;
  bottom: number;
}

interface IResizeable {
  position: { x: number; y: number };
  width: number;
  height: number;
  points: ShapePoint[];
}
