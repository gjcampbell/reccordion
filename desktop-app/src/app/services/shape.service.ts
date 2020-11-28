import { Injectable } from '@angular/core';
import { ShapePoint } from './graphics.models';

@Injectable()
export class ShapeService {
  createStarPoints(
    points: number,
    innerRadiusPct: number,
    startShape: { width: number; height: number; position: { x: number; y: number } }
  ) {
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
  createPolygon(
    points: number,
    startAngle: number,
    startShape: { width: number; height: number; position: { x: number; y: number } }
  ) {
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
  createArrow(
    angle: number,
    lineLengthPct: number,
    lineThicknessPct: number,
    startShape: { width: number; height: number; position: { x: number; y: number } }
  ) {
    const cx = startShape.width / 2 + startShape.position.x,
      cy = startShape.height / 2 + startShape.position.y,
      halfThick = lineThicknessPct / 2,
      arrowLen = 1 - lineLengthPct,
      result: ShapePoint[] = [];
  }
}
