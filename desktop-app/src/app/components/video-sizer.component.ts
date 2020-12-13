import { AfterViewInit, Component, EventEmitter, HostBinding, Input, Output } from '@angular/core';

@Component({
  selector: 'app-video-sizer',
  template: `
    <div class="content" [class.resizing]="resizing" [style.width.px]="width" [style.height.px]="height">
      <ng-content></ng-content>
      <div class="height edge">
        <span>{{ height * pixelRatio }}px</span>
      </div>
      <div class="width edge">
        <span>{{ width * pixelRatio }}px</span>
      </div>
      <div class="handle" (mousedown)="handleMousedown($event)">
        <i class="fa fa-arrows-alt-v"></i>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        height: 100%;
        overflow: auto;
      }
      .content {
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #000;
        box-shadow: 0 0 8px #000;
        margin: 20px auto;
      }
      .edge {
        position: absolute;
        border: solid 1px #0005;
        font-size: 8px;
        box-sizing: border-box;
        visibility: hidden;
      }
      .resizing .edge {
        visibility: visible;
      }
      .edge span {
      }
      .height {
        height: 100%;
        top: 0;
        right: -10px;
        border-width: 1px 0 1px 0;
        display: flex;
        width: 10px;
        align-items: center;
        padding-left: 10px;
        background: linear-gradient(90deg, transparent 5px, #0005 5px, transparent 6px);
      }
      .width {
        width: 100%;
        text-align: center;
        bottom: -10px;
        height: 10px;
        left: 0;
        padding-top: 6px;
        border-width: 0 1px 0 1px;
        background: linear-gradient(0deg, transparent 5px, #0005 5px, transparent 6px);
      }
      .handle {
        cursor: grab;
        transform: rotate(135deg);
        right: -12px;
        bottom: -18px;
        position: absolute;
        user-select: none;
      }
      .resizing .handle {
        cursor: grabbing;
      }
    `,
  ],
})
export class VideoSizerComponent {
  @Input()
  public width: number = 0;
  @Output()
  public widthChange = new EventEmitter<number>();

  @Input()
  public height: number = 0;
  @Output()
  public heightChange = new EventEmitter<number>();

  @Input()
  public maxWidth = Infinity;
  @Input()
  public maxHeight = Infinity;
  @Input()
  public minWidth = 50;
  @Input()
  public minHeight = 50;

  protected get pixelRatio() {
    return window.devicePixelRatio;
  }

  public resizing = false;

  public handleMousedown(origEvt: MouseEvent) {
    this.resizing = true;
    const startX = origEvt.pageX,
      startY = origEvt.pageY,
      startW = this.width,
      startH = this.height,
      onmove = (evt: MouseEvent) => {
        const deltX = evt.pageX - startX,
          deltY = evt.pageY - startY,
          newW = Math.max(this.minWidth, Math.min(this.maxWidth, startW + deltX * 2)),
          newH = Math.max(this.minHeight, Math.min(this.maxHeight, startH + deltY));

        this.width = newW;
        this.widthChange.emit(newW);
        this.height = newH;
        this.heightChange.emit(newH);
      },
      onmouseup = () => {
        this.resizing = false;
        window.removeEventListener('mouseup', onmouseup);
        window.removeEventListener('mousemove', onmove);
      };

    window.addEventListener('mousemove', onmove);
    window.addEventListener('mouseup', onmouseup);
  }
}
