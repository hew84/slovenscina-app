import { Component, ElementRef, afterNextRender, computed, input, output, signal, viewChildren } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatCard, MatCardActions, MatCardContent } from '@angular/material/card';
import { isCorrect, nearMiss, nearMissMessage } from '../answer';
import { parseCloze } from '../cloze';
import { ClozeExercise } from '../models';
import { Feedback } from '../ui/feedback';
import { SpecialChars, insertAtCaret } from '../ui/special-chars';

@Component({
  selector: 'app-cloze',
  imports: [MatButton, MatCard, MatCardContent, MatCardActions, Feedback, SpecialChars],
  template: `
    <mat-card appearance="outlined">
      <mat-card-content>
        <p class="label">Ergänze den Satz</p>
        @if (exercise().translation) {
          <p class="translation">{{ exercise().translation }}</p>
        }
        <p class="sentence" lang="sl">
          @for (segment of segments(); track $index) {
            @if (segment.kind === 'text') {
              {{ segment.text }}
            } @else {
              <input
                #blank
                class="blank"
                [class.ok]="checked() && blankResults()[segment.index]"
                [class.wrong]="checked() && !blankResults()[segment.index]"
                [style.width.ch]="widthFor(segment.index)"
                [attr.aria-label]="'Lücke ' + (segment.index + 1)"
                autocomplete="off"
                autocapitalize="off"
                autocorrect="off"
                spellcheck="false"
                [value]="values()[segment.index] ?? ''"
                [readonly]="checked()"
                (focus)="lastFocused = segment.index"
                (input)="onInput(segment.index, $event)"
                (keydown.enter)="submit()"
              />
            }
          }
        </p>
        <app-special-chars [disabled]="checked()" (pick)="insert($event)" />
        @if (checked()) {
          <app-feedback [correct]="allCorrect()" [solution]="solution()" [hint]="hint()" />
        }
      </mat-card-content>
      <mat-card-actions>
        <button matButton="filled" type="button" [disabled]="!checked() && !canCheck()" (click)="submit()">
          {{ checked() ? 'Weiter' : 'Prüfen' }}
        </button>
      </mat-card-actions>
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
      font: inherit;
      color: var(--mat-sys-primary);
      background: transparent;
      border: 0;
      border-bottom: 2px solid var(--mat-sys-outline);
      border-radius: 0;
      min-width: 3.5ch;
      max-width: 100%;
      padding: 0 0.25rem;
      text-align: center;
      outline: none;
    }
    .blank:focus {
      border-bottom-color: var(--mat-sys-primary);
    }
    .blank.ok {
      border-bottom-color: var(--mat-sys-tertiary);
    }
    .blank.wrong {
      border-bottom-color: var(--mat-sys-error);
      color: var(--mat-sys-error);
    }
  `,
})
export class Cloze {
  readonly exercise = input.required<ClozeExercise>();
  readonly completed = output<boolean>();

  protected readonly segments = computed(() => parseCloze(this.exercise().text));
  protected readonly values = signal<Record<number, string>>({});
  protected readonly checked = signal(false);
  protected readonly blankResults = computed(() =>
    this.exercise().answers.map((accepted, index) => isCorrect(this.values()[index] ?? '', accepted)),
  );
  protected readonly allCorrect = computed(() => this.blankResults().every(Boolean));
  protected readonly canCheck = computed(() =>
    this.exercise().answers.every((_, index) => (this.values()[index] ?? '').trim().length > 0),
  );
  protected readonly solution = computed(() =>
    this.segments()
      .map((segment) => (segment.kind === 'text' ? segment.text : this.exercise().answers[segment.index][0]))
      .join(''),
  );
  protected readonly hint = computed(() => {
    for (const [index, accepted] of this.exercise().answers.entries()) {
      const kind = this.blankResults()[index] ? null : nearMiss(this.values()[index] ?? '', accepted);
      if (kind) {
        return nearMissMessage(kind);
      }
    }
    return null;
  });

  protected lastFocused = 0;
  private readonly blanks = viewChildren<ElementRef<HTMLInputElement>>('blank');

  constructor() {
    afterNextRender(() => this.blanks()[0]?.nativeElement.focus());
  }

  /** Sized for the longest accepted answer, in `ch` units. */
  protected widthFor(index: number): number {
    const longest = Math.max(...this.exercise().answers[index].map((answer) => answer.length));
    return Math.max(longest + 2, 5);
  }

  protected onInput(index: number, event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.values.update((current) => ({ ...current, [index]: value }));
  }

  protected insert(char: string): void {
    const field = this.blanks()[this.lastFocused]?.nativeElement;
    if (field) {
      insertAtCaret(field, char);
    }
  }

  protected submit(): void {
    if (this.checked()) {
      this.completed.emit(this.allCorrect());
    } else if (this.canCheck()) {
      this.checked.set(true);
    }
  }
}
