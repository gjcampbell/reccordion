import canvasTxt from '../canvas-txt';
import { IVideoLayer } from './video.models';

export interface Pt {
  x: number;
  y: number;
}

export const movePt = (pt: Pt, x: number, y: number) => {
    pt.x += x;
    pt.y += y;
  },
  copyPt = (pt: Pt | undefined) => {
    return pt ? { ...pt } : undefined;
  },
  absPt = (pt: Pt) => {
    return { x: Math.abs(pt.x), y: Math.abs(pt.y) };
  },
  scalePt = (pt: Pt, origin: Pt, scale: Pt) => {
    const diff = diffPt(pt, origin),
      diffDelt = multiplyPt(diff, scale);
    return addPt(origin, diffDelt);
  },
  dividePt = (num: Pt, denom: Pt) => {
    return {
      x: num.x / denom.x,
      y: num.y / denom.y,
    };
  },
  diffPt = (first: Pt, second: Pt) => {
    return {
      x: first.x - second.x,
      y: first.y - second.y,
    };
  },
  addPt = (first: Pt, second: Pt) => {
    return {
      x: first.x + second.x,
      y: first.y + second.y,
    };
  },
  multiplyPt = (a: Pt, b: Pt) => {
    return {
      x: a.x * b.x,
      y: a.y * b.y,
    };
  },
  calcLineHeight = (fontSizePt: number) => {
    return (fontSizePt || 16) * 1.2;
  },
  setFontSize = (comment: IComment, sizePt: number) => {
    comment.fontSize = sizePt;
    comment.lineHeight = calcLineHeight(sizePt);
  };

export class ShapePoint {
  public constructor(public pos: Pt, public cp1?: Pt, public cp2?: Pt) {}
  public isCurve() {
    return !!this.cp1;
  }
  public move(x: number, y: number) {
    movePt(this.pos, x, y);
    if (this.cp1) {
      movePt(this.cp1, x, y);
    }
    if (this.cp2) {
      movePt(this.cp2, x, y);
    }
  }
  scale(origin: Pt, scale: Pt) {
    this.pos = scalePt(this.pos, origin, scale);
    if (this.cp1) {
      this.cp1 = scalePt(this.cp1, origin, scale);
    }
    if (this.cp2) {
      this.cp2 = scalePt(this.cp2, origin, scale);
    }
  }
  public copy() {
    return new ShapePoint(copyPt(this.pos), copyPt(this.cp1), copyPt(this.cp2));
  }
}

export interface IComment {
  text: string;
  position: { x: number; y: number };
  width: number;
  height: number;
  lineHeight: number;
  align: 'center' | 'left' | 'right';
  vAlign: 'middle' | 'top' | 'bottom';
  font: string;
  fontSize: number;
  strokeW: number;
  strokeColor: string;
  fillColor: string;
  padding: number;
  startMs: number;
  endMs: number;
  background: string;
  borderRadius: number;
  borderColor: string;
  borderWidth: number;
  shadowBlur: number;
  shadowColor: string;
  shape: string;
  shapeData?: { name: string; ufName: string; icon: string };
  points: ShapePoint[];
}

export class CommentLayer implements IVideoLayer {
  private comments: IComment[] = [];

  public isEmpty() {
    return this.comments.length < 1;
  }

  public getComments() {
    return this.comments;
  }

  public reorder(comment: IComment, dir: number) {
    const idx = this.comments.indexOf(comment);
    if (idx >= 0) {
      const max = this.comments.length - 1,
        newIdx = Math.max(0, Math.min(max, idx + dir));
      if (newIdx !== idx) {
        this.comments.splice(idx, 1);
        this.comments.splice(newIdx, 0, comment);
      }
    }
  }

  public removeComment(comment: IComment) {
    const idx = this.comments.indexOf(comment);
    if (idx >= 0) {
      this.comments.splice(idx, 1);
    }
  }

  public addText(comment: Partial<IComment>) {
    this.comments.push({
      text: 'None',
      position: { x: 0, y: 0 },
      width: 300,
      height: 300,
      align: 'center',
      vAlign: 'middle',
      font: 'sans-serif',
      fontSize: 16,
      lineHeight: calcLineHeight(comment.fontSize || 16),
      startMs: 0,
      endMs: 5000,
      strokeColor: '#fff',
      strokeW: 1,
      fillColor: '#000',
      background: '#fff',
      borderRadius: 4,
      borderColor: '#0000',
      borderWidth: 0,
      padding: 5,
      shadowBlur: 15,
      shadowColor: '#000',
      shape: 'rect',
      shapeData: undefined,
      points: [],
      ...comment,
    });
  }

  public async setDimensions() {}
  public async drawFrame(millisecond: number, ctx: CanvasRenderingContext2D) {
    for (const comment of this.comments) {
      if (comment.startMs <= millisecond && comment.endMs >= millisecond) {
        this.startShape(comment, ctx);
        if (comment.shape in this) {
          this[comment.shape](comment, ctx);
        }
        this.endShape(comment, ctx);

        this.drawText(comment, ctx);
      }
    }
  }

  private drawText(comment: IComment, ctx: CanvasRenderingContext2D) {
    canvasTxt.align = comment.align;
    canvasTxt.vAlign = comment.vAlign;
    canvasTxt.fontSize = comment.fontSize;
    canvasTxt.font = comment.font;
    canvasTxt.lineHeight = comment.lineHeight;
    ctx.fillStyle = comment.fillColor;
    canvasTxt.drawText(
      ctx,
      comment.text,
      comment.position.x + comment.padding,
      comment.position.y + comment.padding,
      Math.max(comment.width - comment.padding * 2, 50),
      Math.max(comment.height - comment.padding * 2, 50)
    );
  }

  private rect(comment: IComment, ctx: CanvasRenderingContext2D) {
    ctx.rect(comment.position.x, comment.position.y, comment.width, comment.height);
  }
  private circle(comment: IComment, ctx: CanvasRenderingContext2D) {
    const rx = comment.width / 2,
      ry = comment.height / 2,
      x = comment.position.x + rx,
      y = comment.position.y + ry;
    ctx.ellipse(x, y, rx, ry, 0, 0, 2 * Math.PI);
  }
  private points(comment: IComment, ctx: CanvasRenderingContext2D) {
    for (const pt of comment.points.concat(comment.points[0])) {
      if (pt.isCurve()) {
        ctx.bezierCurveTo(pt.cp1.x, pt.cp1.y, pt.cp2.x, pt.cp2.y, pt.pos.x, pt.pos.y);
      } else {
        ctx.lineTo(pt.pos.x, pt.pos.y);
      }
    }
  }
  private startShape(comment: IComment, ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = comment.background;
    ctx.shadowBlur = comment.shadowBlur;
    ctx.shadowColor = comment.shadowColor;
    ctx.beginPath();
  }
  private endShape(comment: IComment, ctx: CanvasRenderingContext2D) {
    ctx.fill();
    ctx.shadowBlur = 0;
    if (comment.borderWidth) {
      ctx.closePath();
      ctx.strokeStyle = comment.borderColor;
      ctx.lineWidth = comment.borderWidth;
      ctx.stroke();
    }
  }

  public getLines(ctx, text, maxWidth) {
    const words = text.split(' '),
      lines: string[] = [];
    let currentLine = words[0];

    for (let i = 1; i < words.length; i++) {
      let word = words[i],
        width = ctx.measureText(currentLine + ' ' + word).width;
      if (width < maxWidth) {
        currentLine += ' ' + word;
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    }
    lines.push(currentLine);
    return lines;
  }
}
