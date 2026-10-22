import { Component, inject, signal } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatCard, MatCardActions, MatCardContent, MatCardHeader, MatCardSubtitle, MatCardTitle } from '@angular/material/card';
import { RouterLink } from '@angular/router';
import { LessonService } from '../lesson.service';
import { LessonSummary } from '../models';
import { ProgressService } from '../progress.service';

@Component({
  selector: 'app-home',
  imports: [MatButton, MatCard, MatCardHeader, MatCardTitle, MatCardSubtitle, MatCardContent, MatCardActions, RouterLink],
  template: `
    <h1>Lektionen</h1>
    @if (error()) {
      <p class="error" role="alert">{{ error() }}</p>
    } @else if (lessons(); as lessons) {
      @for (lesson of lessons; track lesson.id) {
        <mat-card appearance="outlined">
          <mat-card-header>
            <mat-card-title>{{ lesson.title }}</mat-card-title>
            <mat-card-subtitle>Niveau {{ lesson.level }}</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            @if (lesson.description) {
              <p>{{ lesson.description }}</p>
            }
            @if (progress.get(lesson.id); as result) {
              <p class="progress">Bestes Ergebnis: {{ result.bestPercent }} % · {{ result.attempts }}× gespielt</p>
            }
          </mat-card-content>
          <mat-card-actions>
            @if (confirmingReset() === lesson.id) {
              <span class="confirm" role="alert">Wirklich zurücksetzen?</span>
              <button matButton type="button" (click)="confirmingReset.set(null)">Abbrechen</button>
              <button matButton="tonal" type="button" class="danger" (click)="reset(lesson.id)">Zurücksetzen</button>
            } @else {
              <a matButton="filled" [routerLink]="['/lesson', lesson.id]">
                {{ progress.get(lesson.id) ? 'Nochmal üben' : 'Starten' }}
              </a>
              @if (progress.get(lesson.id)) {
                <button matButton type="button" (click)="confirmingReset.set(lesson.id)">Fortschritt zurücksetzen</button>
              }
            }
          </mat-card-actions>
        </mat-card>
      } @empty {
        <p>Noch keine Lektionen vorhanden.</p>
      }
    } @else {
      <p>Lade Lektionen …</p>
    }
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    h1 {
      font: var(--mat-sys-headline-large);
      margin: 0.5rem 0 0;
    }
    mat-card-content p {
      margin: 0.5rem 0 0;
    }
    .progress {
      color: var(--mat-sys-on-surface-variant);
    }
    .confirm {
      flex-basis: 100%;
      font: var(--mat-sys-title-small);
    }
    .danger {
      // Material's own button tokens; plain background/color would be overridden.
      --mat-button-tonal-container-color: var(--mat-sys-error-container);
      --mat-button-tonal-label-text-color: var(--mat-sys-on-error-container);
      --mat-button-tonal-state-layer-color: var(--mat-sys-on-error-container);
    }
    mat-card-actions {
      padding: 0 1rem 1rem;
      flex-wrap: wrap;
      gap: 0.5rem;
    }
    .error {
      color: var(--mat-sys-error);
    }
  `,
})
export class Home {
  private readonly lessonService = inject(LessonService);
  protected readonly progress = inject(ProgressService);
  protected readonly lessons = signal<LessonSummary[] | null>(null);
  protected readonly error = signal<string | null>(null);
  /** Lesson whose reset is waiting for confirmation. */
  protected readonly confirmingReset = signal<string | null>(null);

  constructor() {
    this.lessonService
      .list()
      .then((lessons) => this.lessons.set(lessons))
      .catch(() => this.error.set('Die Lektionen konnten nicht geladen werden. Bist du offline und hast die App noch nie online geöffnet?'));
  }

  protected reset(lessonId: string): void {
    this.progress.reset(lessonId);
    this.confirmingReset.set(null);
  }
}
