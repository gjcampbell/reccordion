import { Component } from '@angular/core';

@Component({
  selector: 'app-big-overlay',
  template: `<ng-content></ng-content>`,
  styles: [
    `
      :host {
        position: fixed;
        display: flex;
        align-items: center;
        left: 0;
        top: 0;
        width: 100%;
        height: 100%;
        z-index: 3;
        justify-content: center;
      }
    `,
  ],
})
export class BigOverlayComponent {}
