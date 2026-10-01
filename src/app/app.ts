import { Component, inject, signal } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatToolbar } from '@angular/material/toolbar';
import { SwUpdate } from '@angular/service-worker';
import { RouterLink, RouterOutlet } from '@angular/router';
import { Icon } from './ui/icon';

@Component({
  imports: [RouterOutlet, RouterLink, MatToolbar, MatButton, Icon],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App {
  /** A newer version (e.g. new lessons) has been downloaded by the service worker and is ready to use. */
  protected readonly updateReady = signal(false);

  constructor() {
    inject(SwUpdate, { optional: true })?.versionUpdates.subscribe((event) => {
      if (event.type === 'VERSION_READY') {
        this.updateReady.set(true);
      }
    });
  }

  protected reload(): void {
    document.location.reload();
  }
}
