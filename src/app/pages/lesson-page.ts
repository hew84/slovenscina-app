import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatCard, MatCardActions, MatCardContent } from '@angular/material/card';
import { MatProgressBar } from '@angular/material/progress-bar';
import { RouterLink } from '@angular/router';
import { Cloze } from '../exercises/cloze';
import { Flashcard } from '../exercises/flashcard';
import { Translate } from '../exercises/translate';
import { LessonFormatError } from '../lesson-validation';
import { LessonService } from '../lesson.service';
import { Exercise, Lesson } from '../models';
import { ProgressService } from '../progress.service';
import { Icon } from '../ui/icon';

interface Result {
  exercise: Exercise;
  correct: boolean;
}

type Phase = 'loading' | 'error' | 'running' | 'done';

@Component({
  selector: 'app-lesson-page',
  imports: [MatButton, MatCard, MatCardContent, MatCardActions, MatProgressBar, RouterLink, Icon, Flashcard, Cloze, Translate],
  template: `
    <a matButton routerLink="/" class="back"><app-icon name="back" /> Übersicht</a>

    @switch (phase()) {
      @case ('loading') {
        <p>Lade Lektion …</p>
      }
      @case ('error') {
        <p class="error" role="alert">{{ error() }}</p>
      }
      @case ('running') {
        <h1>{{ lesson()?.title }}</h1>
        <div class="progress">
          <mat-progress-bar mode="determinate" [value]="percentDone()" aria-label="Fortschritt" />
          <span>{{ index() + 1 }} / {{ queue().length }}{{ isRetry() ? ' · Wiederholung' : '' }}</span>
        </div>
        <!-- One-item loop: a fresh component per exercise, so no answer state leaks into the next one. -->
        @for (exercise of [current()]; track exercise.id) {
          @switch (exercise.type) {
            @case ('flashcard') {
              <app-flashcard [item]="vocabFor(exercise.vocabId)" (completed)="next(exercise, $event)" />
            }
            @case ('cloze') {
              <app-cloze [exercise]="exercise" (completed)="next(exercise, $event)" />
            }
            @case ('translate') {
              <app-translate [exercise]="exercise" (completed)="next(exercise, $event)" />
            }
          }
        }
      }
      @case ('done') {
        <mat-card appearance="outlined">
          <mat-card-content>
            <h1>{{ isRetry() ? 'Wiederholung geschafft' : 'Lektion abgeschlossen' }}</h1>
            <p class="score">{{ correctCount() }} von {{ results().length }} richtig</p>
            @if (mistakes().length > 0) {
              <h2>Zum Nachschauen</h2>
              <ul class="mistakes">
                @for (mistake of mistakes(); track mistake.exercise.id) {
                  <li>
                    <span>{{ promptOf(mistake.exercise) }}</span>
                    <span lang="sl" class="solution">{{ solutionOf(mistake.exercise) }}</span>
                  </li>
                }
              </ul>
            }
          </mat-card-content>
          <mat-card-actions>
            @if (mistakes().length > 0) {
              <button matButton="filled" type="button" (click)="retryMistakes()">
                <app-icon name="refresh" /> Fehler wiederholen
              </button>
            }
            <button matButton="tonal" type="button" (click)="restart()">Von vorn</button>
            <a matButton routerLink="/">Zur Übersicht</a>
          </mat-card-actions>
        </mat-card>
      }
    }
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    h1 {
      font: var(--mat-sys-headline-medium);
      margin: 0;
    }
    h2 {
      font: var(--mat-sys-title-medium);
      margin: 1.5rem 0 0.5rem;
    }
    .back {
      align-self: flex-start;
    }
    .progress {
      display: flex;
      align-items: center;
      gap: 1rem;
      color: var(--mat-sys-on-surface-variant);
      white-space: nowrap;
    }
    .score {
      font: var(--mat-sys-title-large);
      margin: 0.5rem 0 0;
    }
    .mistakes {
      list-style: none;
      padding: 0;
      margin: 0;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .mistakes li {
      display: flex;
      justify-content: space-between;
      gap: 1rem;
      padding-bottom: 0.5rem;
      border-bottom: 1px solid var(--mat-sys-outline-variant);
    }
    .solution {
      color: var(--mat-sys-primary);
      font-weight: 500;
      text-align: right;
    }
    mat-card-content {
      padding-top: 1.5rem;
    }
    mat-card-actions {
      padding: 0 1rem 1rem;
      flex-wrap: wrap;
      gap: 0.5rem;
    }
    .error {
      color: var(--mat-sys-error);
      white-space: pre-line;
    }
  `,
})
export class LessonPage {
  /** Bound from the route parameter. */
  readonly id = input.required<string>();

  private readonly lessons = inject(LessonService);
  private readonly progress = inject(ProgressService);

  protected readonly phase = signal<Phase>('loading');
  protected readonly error = signal('');
  protected readonly lesson = signal<Lesson | null>(null);
  protected readonly queue = signal<Exercise[]>([]);
  protected readonly index = signal(0);
  protected readonly results = signal<Result[]>([]);
  protected readonly isRetry = signal(false);

  protected readonly current = computed(() => this.queue()[this.index()]);
  protected readonly percentDone = computed(() => (this.index() / Math.max(this.queue().length, 1)) * 100);
  protected readonly correctCount = computed(() => this.results().filter((result) => result.correct).length);
  protected readonly mistakes = computed(() => this.results().filter((result) => !result.correct));

  constructor() {
    effect(() => {
      const id = this.id();
      untracked(() => void this.load(id));
    });
  }

  private async load(id: string): Promise<void> {
    this.phase.set('loading');
    try {
      const lesson = await this.lessons.load(id);
      if (this.id() !== id) {
        return;
      }
      this.lesson.set(lesson);
      this.start(lesson.exercises, false);
    } catch (error) {
      if (this.id() !== id) {
        return;
      }
      this.error.set(
        error instanceof LessonFormatError
          ? error.message
          : 'Die Lektion konnte nicht geladen werden. Bist du offline und hast die App noch nie online geöffnet?',
      );
      this.phase.set('error');
    }
  }

  private start(exercises: Exercise[], retry: boolean): void {
    this.queue.set(exercises);
    this.index.set(0);
    this.results.set([]);
    this.isRetry.set(retry);
    this.phase.set('running');
  }

  protected next(exercise: Exercise, correct: boolean): void {
    const results = [...this.results(), { exercise, correct }];
    this.results.set(results);
    if (this.index() + 1 < this.queue().length) {
      this.index.update((value) => value + 1);
      return;
    }
    // Only full runs count towards the saved progress, not the retry of mistakes.
    if (!this.isRetry()) {
      this.progress.record(this.id(), results.filter((result) => result.correct).length, results.length);
    }
    this.phase.set('done');
  }

  protected retryMistakes(): void {
    this.start(
      this.mistakes().map((mistake) => mistake.exercise),
      true,
    );
  }

  protected restart(): void {
    this.start(this.lesson()?.exercises ?? [], false);
  }

  protected vocabFor(vocabId: string) {
    // The validator guarantees that every flashcard points to an existing vocabulary entry.
    return this.lesson()!.vocabulary.find((item) => item.id === vocabId)!;
  }

  protected promptOf(exercise: Exercise): string {
    switch (exercise.type) {
      case 'flashcard':
        return this.vocabFor(exercise.vocabId).de;
      case 'translate':
        return exercise.prompt;
      case 'cloze':
        return exercise.translation ?? exercise.text.replace(/\{\{\d+\}\}/g, '…');
    }
  }

  protected solutionOf(exercise: Exercise): string {
    switch (exercise.type) {
      case 'flashcard':
        return this.vocabFor(exercise.vocabId).sl;
      case 'translate':
        return exercise.answers[0];
      case 'cloze':
        return exercise.text.replace(/\{\{(\d+)\}\}/g, (_, index) => exercise.answers[Number(index)][0]);
    }
  }
}
