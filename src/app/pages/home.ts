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
            <a matButton="filled" [routerLink]="['/lesson', lesson.id]">
              {{ progress.get(lesson.id) ? 'Nochmal üben' : 'Starten' }}
            </a>
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
    mat-card-actions {
      padding: 0 1rem 1rem;
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

  constructor() {
    this.lessonService
      .list()
      .then((lessons) => this.lessons.set(lessons))
      .catch(() => this.error.set('Die Lektionen konnten nicht geladen werden. Bist du offline und hast die App noch nie online geöffnet?'));
  }
}
