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
      <div class="handle" [class.enabled]="enabled" (mousedown)="handleMousedown($event)">
        <i class="fa fa-arrows-alt-v"></i>
      </div>
    </div>
  `,
  styleUrls: ['./video-sizer.component.scss'],
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

  @Input()
  public enabled = false;

  public get pixelRatio() {
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
