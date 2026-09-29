import { Component, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatCard, MatCardActions, MatCardContent } from '@angular/material/card';
import { fillBlanks, parseCloze } from '../cloze';
import { ChoiceExercise } from '../models';
import { SpeechService } from '../speech.service';
import { Feedback } from '../ui/feedback';
import { Icon } from '../ui/icon';

@Component({
  selector: 'app-choice',
  imports: [MatButton, MatCard, MatCardContent, MatCardActions, Feedback, Icon],
  template: `
    <mat-card appearance="outlined">
      <mat-card-content>
        <p class="label">Hör zu und wähle das richtige Wort</p>
        <p class="translation">{{ exercise().translation }}</p>
        <p class="sentence" lang="sl">
          @for (segment of segments(); track $index) {
            <!-- Text sits directly inside <span>s: loose template whitespace would show up under pre-wrap. -->
            @if (segment.kind === 'text') {
              <span>{{ segment.text }}</span>
            } @else {
              <span class="blank" [class.ok]="picked() !== null" [attr.aria-label]="picked() === null ? 'Lücke' : null">{{ picked() === null ? '' : exercise().answer }}</span>
            }
          }
        </p>
        @if (speech.available()) {
          <button matButton="tonal" type="button" class="listen" (click)="speak()">
            <app-icon name="volume" /> Anhören
          </button>
        }
        <div class="options" role="group" aria-label="Auswahl">
          @for (option of options(); track option) {
            <button
              matButton="outlined"
              type="button"
              class="option"
              lang="sl"
              [class.ok]="picked() !== null && option === exercise().answer"
              [class.wrong]="picked() === option && option !== exercise().answer"
              [disabled]="picked() !== null"
              (click)="pick(option)"
            >
              {{ option }}
            </button>
          }
        </div>
        @if (picked() !== null) {
          <app-feedback [correct]="correct()" [solution]="sentence()" />
        }
      </mat-card-content>
      @if (picked() !== null) {
        <mat-card-actions>
          <button matButton="filled" type="button" (click)="completed.emit(correct())">Weiter</button>
        </mat-card-actions>
      }
    </mat-card>
  `,
  styles: `
    mat-card-content {
      padding-top: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    mat-card-actions {
      padding: 0 1rem 1rem;
      justify-content: flex-end;
    }
    p {
      margin: 0;
    }
    .label {
      color: var(--mat-sys-on-surface-variant);
      font: var(--mat-sys-label-large);
    }
    .translation {
      color: var(--mat-sys-on-surface-variant);
      font-style: italic;
    }
    .sentence {
      font: var(--mat-sys-headline-small);
      line-height: 2.75rem;
      white-space: pre-wrap;
    }
    .blank {
      display: inline-block;
      min-width: 4ch;
      padding: 0 0.25rem;
      text-align: center;
      border-bottom: 2px solid var(--mat-sys-outline);
      line-height: 2rem;
    }
    .blank.ok {
      min-width: 0;
      padding: 0;
      color: var(--mat-sys-primary);
      border-bottom-color: var(--app-success);
    }
    .listen {
      align-self: flex-start;
    }
    .options {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.75rem;
    }
    .option {
      height: 3.5rem;
      font: var(--mat-sys-title-medium);
    }
    .option.ok {
      background: var(--app-success-container);
      color: var(--app-on-success-container);
      border-color: var(--app-success);
    }
    .option.wrong {
      background: var(--mat-sys-error-container);
      color: var(--mat-sys-on-error-container);
      border-color: var(--mat-sys-error);
    }
    app-feedback {
      margin-top: 0.25rem;
    }
  `,
})
export class Choice {
  protected readonly speech = inject(SpeechService);
  readonly exercise = input.required<ChoiceExercise>();
  readonly completed = output<boolean>();

  protected readonly segments = computed(() => parseCloze(this.exercise().text));
  protected readonly sentence = computed(() => fillBlanks(this.exercise().text, [this.exercise().answer]));
  /** Random order, so the correct word is not always in the same place. */
  protected readonly options = computed(() => {
    const { answer, distractor } = this.exercise();
    return Math.random() < 0.5 ? [answer, distractor] : [distractor, answer];
  });
  protected readonly picked = signal<string | null>(null);
  protected readonly correct = computed(() => this.picked() === this.exercise().answer);

  constructor() {
    // Read the full sentence aloud once, as soon as a Slovenian voice is known to exist (voices load asynchronously).
    // Browsers may block speech that was not started by a tap; the "Anhören" button is the fallback.
    let spoken = false;
    effect(() => {
      if (!spoken && this.speech.available()) {
        spoken = true;
        untracked(() => this.speak());
      }
    });
  }

  protected speak(): void {
    this.speech.speak(this.sentence());
  }

  protected pick(option: string): void {
    if (this.picked() === null) {
      this.picked.set(option);
    }
  }
}
