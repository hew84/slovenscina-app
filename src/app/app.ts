import { Component, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatToolbar } from '@angular/material/toolbar';
import { SwUpdate } from '@angular/service-worker';
import { RouterLink, RouterOutlet } from '@angular/router';

@Component({
  imports: [RouterOutlet, RouterLink, MatToolbar],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App {
  constructor() {
    // The service worker serves the cached app; tell the user when a newer version (e.g. new lessons) is ready.
    const updates = inject(SwUpdate, { optional: true });
    const snackBar = inject(MatSnackBar);
    updates?.versionUpdates.subscribe((event) => {
      if (event.type === 'VERSION_READY') {
        snackBar
          .open('Neue Version verfügbar', 'Neu laden')
          .onAction()
          .subscribe(() => document.location.reload());
      }
    });
  }
}
