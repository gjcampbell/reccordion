import { Injectable, NgZone } from '@angular/core';

@Injectable()
export class FastNgUpdateService {
  private listeners = new Set<() => void>();

  constructor(private readonly zone: NgZone) {}
  public addUpdateListener(updater: () => void) {
    this.listeners.add(updater);
    if (this.listeners.size === 1) {
      this.start();
    }
    return () => this.listeners.delete(updater);
  }

  private start() {
    this.zone.runOutsideAngular(() => {
      const update = () => {
        for (const updater of this.listeners) {
          this.runUpdater(updater);
        }
        if (this.listeners.size > 0) {
          window.requestAnimationFrame(update);
        }
      };
      update();
    });
  }

  private runUpdater(updater: () => void) {
    try {
      updater();
    } catch (err) {
      this.listeners.delete(updater);
      console.log(err);
    }
  }
}
