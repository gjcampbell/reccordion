import { Injectable } from '@angular/core';
import { ShapePoint, IComment } from './graphics.models';

export interface IColor {
  fg: string;
  bg: string;
}
export interface IShapeOption {
  name: string;
  icon: string;
  type: string;
  ufName: string;
}
export interface IShapeBounds {
  width: number;
  height: number;
  position: { x: number; y: number };
}
export interface IShape extends IShapeBounds {
  shape: string;
  points: ShapePoint[];
  shapeData?: { name: string; ufName: string; icon: string };
}

export const fgDark = '#141518',
  fgLight = '#ECF0F1',
  color = (bg: string, fg: string) => ({ bg, fg }),
  colorOptions = [
    color('#25BC99', fgDark),
    color('#36CD62', fgDark),
    color('#3796E1', fgDark),
    color('#9A56BD', fgDark),
    color('#344860', fgLight),
    color('#1FA083', fgLight),
    color('#2EAF53', fgLight),
    color('#2B7EBF', fgLight),
    color('#8D40B4', fgLight),
    color('#2C3D52', fgLight),
    color('#F0C600', fgDark),
    color('#E58000', fgDark),
    color('#E64D33', fgDark),
    color('#ECF0F1', fgDark),
    color('#95A5A6', fgDark),
    color('#F29E00', fgLight),
    color('#D25600', fgLight),
    color('#BF3A22', fgLight),
    color('#BDC3C8', fgDark),
    color('#7F8C8D', fgDark),
  ] as IColor[],
  shape = (name: string, icon: string, ufName: string, type: string = 'points') => ({ name, icon, ufName, type }),
  rectOption = shape('rect', 'fa-square', 'Rectangle', 'rect'),
  circleOption = shape('circle', 'fa-circle', 'Circle', 'circle'),
  triangleOption = shape('triangle-up', 'fa-play fa-rotate-270', 'Triangle'),
  arrowOption = shape('arrow-right', 'fa-long-arrow-alt-right', 'Arrow'),
  starOption = shape('star', 'fa-star', 'Star'),
  shapeOptions = [
    rectOption,
    circleOption,
    arrowOption,
    triangleOption,
    shape('triangle-right', 'fa-play', 'Triangle'),
    shape('triangle-down', 'fa-play fa-rotate-90', 'Triangle'),
    shape('triangle-left', 'fa-play fa-rotate-180', 'Triangle'),
    starOption,
  ] as IShapeOption[];

@Injectable()
export class ShapeService {
  public createShape(shapeOption: IShapeOption, origShape: IShape) {
    return {
      ...origShape,
      shape: shapeOption.type,
      shapeData: { ...shape },
      points: this.getShapePoints(shapeOption.name, origShape),
    } as IShape;
  }

  public getShapePoints(name: string, bounds: IShapeBounds) {
    switch (name) {
      case 'star':
        return this.createStarPoints(5, 0.5, bounds);
      case 'triangle-up':
        return this.createPolygon(3, Math.PI, bounds);
      case 'triangle-right':
        return this.createPolygon(3, Math.PI / 2, bounds);
      case 'triangle-down':
        return this.createPolygon(3, 0, bounds);
      case 'triangle-left':
        return this.createPolygon(3, Math.PI * 1.5, bounds);
      case 'arrow-right':
        return this.createArrow(0, 0.8, 0.15, bounds);
    }
    return [];
  }

  public createStarPoints(points: number, innerRadiusPct: number, startShape: IShapeBounds) {
    const cx = startShape.width / 2 + startShape.position.x,
      cy = startShape.height / 2 + startShape.position.y,
      radius = Math.min(startShape.width / 2, startShape.height / 2),
      innerRadius = radius * innerRadiusPct,
      result: ShapePoint[] = [],
      radianInc = (Math.PI * 2) / points,
      halfInc = radianInc / 2,
      startRad = halfInc;

    for (let i = 0; i < points; i++) {
      const radiansOuter = startRad + i * radianInc,
        outerX = Math.sin(radiansOuter) * radius + cx,
        outerY = Math.cos(radiansOuter) * radius + cy,
        radiansInner = radiansOuter + halfInc,
        innerX = Math.sin(radiansInner) * innerRadius + cx,
        innerY = Math.cos(radiansInner) * innerRadius + cy;

      result.push(new ShapePoint({ x: outerX, y: outerY }));
      result.push(new ShapePoint({ x: innerX, y: innerY }));
    }

    return result;
  }
  public createPolygon(points: number, startAngle: number, startShape: IShapeBounds) {
    const cx = startShape.width / 2 + startShape.position.x,
      cy = startShape.height / 2 + startShape.position.y,
      radius = Math.min(startShape.width / 2, startShape.height / 2),
      radianInc = (Math.PI * 2) / points,
      result: ShapePoint[] = [];

    for (let i = 0; i < points; i++) {
      const radians = startAngle + radianInc * i,
        x = Math.sin(radians) * radius + cx,
        y = Math.cos(radians) * radius + cy;

      result.push(new ShapePoint({ x, y }));
    }

    return result;
  }
  public createArrow(angle: number, lineLengthPct: number, lineThicknessPct: number, startShape: IShapeBounds) {
    const cy = startShape.height / 2 + startShape.position.y,
      left = startShape.position.x,
      top = startShape.position.y,
      right = startShape.width + startShape.position.x,
      bottom = startShape.height + startShape.position.y,
      halfThick = (lineThicknessPct / 2) * startShape.height,
      arrowLen = (1 - lineLengthPct) * startShape.width,
      result: ShapePoint[] = [
        new ShapePoint({ x: right, y: cy }),
        new ShapePoint({ x: right - arrowLen, y: bottom }),
        new ShapePoint({ x: right - arrowLen, y: cy + halfThick }),
        new ShapePoint({ x: left, y: cy + halfThick }),
        new ShapePoint({ x: left, y: cy - halfThick }),
        new ShapePoint({ x: right - arrowLen, y: cy - halfThick }),
        new ShapePoint({ x: right - arrowLen, y: top }),
        new ShapePoint({ x: right, y: cy }),
      ];

    return result;
  }
}
