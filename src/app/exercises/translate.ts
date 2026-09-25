import { Component, ElementRef, afterNextRender, computed, input, output, signal, viewChild } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatCard, MatCardActions, MatCardContent } from '@angular/material/card';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { isCorrect, nearMiss, nearMissMessage } from '../answer';
import { TranslateExercise } from '../models';
import { Feedback } from '../ui/feedback';
import { SpecialChars, insertAtCaret } from '../ui/special-chars';

@Component({
  selector: 'app-translate',
  imports: [MatButton, MatCard, MatCardContent, MatCardActions, MatFormField, MatLabel, MatInput, Feedback, SpecialChars],
  template: `
    <mat-card appearance="outlined">
      <mat-card-content>
        <p class="label">Übersetze ins Slowenische</p>
        <p class="prompt">{{ exercise().prompt }}</p>
        <mat-form-field appearance="outline" class="field">
          <mat-label>Slowenisch</mat-label>
          <input
            matInput
            #field
            lang="sl"
            autocomplete="off"
            autocapitalize="off"
            autocorrect="off"
            spellcheck="false"
            [value]="value()"
            [readonly]="checked()"
            (input)="onInput($event)"
            (keydown.enter)="submit()"
          />
        </mat-form-field>
        <app-special-chars [disabled]="checked()" (pick)="insert($event)" />
        @if (checked()) {
          <app-feedback [correct]="correct()" [solution]="exercise().answers[0]" [hint]="hint()" />
        }
      </mat-card-content>
      <mat-card-actions>
        <button matButton="filled" type="button" [disabled]="!checked() && !value().trim()" (click)="submit()">
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
      gap: 0.5rem;
    }
    mat-card-actions {
      padding: 0 1rem 1rem;
      justify-content: flex-end;
    }
    .label {
      color: var(--mat-sys-on-surface-variant);
      font: var(--mat-sys-label-large);
      margin: 0;
    }
    .prompt {
      font: var(--mat-sys-headline-medium);
      margin: 0 0 0.5rem;
    }
    .field {
      width: 100%;
    }
    app-feedback {
      margin-top: 0.75rem;
    }
  `,
})
export class Translate {
  readonly exercise = input.required<TranslateExercise>();
  readonly completed = output<boolean>();

  protected readonly value = signal('');
  protected readonly checked = signal(false);
  protected readonly correct = computed(() => isCorrect(this.value(), this.exercise().answers));
  protected readonly hint = computed(() => {
    const kind = this.correct() ? null : nearMiss(this.value(), this.exercise().answers);
    return kind ? nearMissMessage(kind) : null;
  });
  private readonly field = viewChild.required<ElementRef<HTMLInputElement>>('field');

  constructor() {
    afterNextRender(() => this.field().nativeElement.focus());
  }

  protected onInput(event: Event): void {
    this.value.set((event.target as HTMLInputElement).value);
  }

  protected insert(char: string): void {
    insertAtCaret(this.field().nativeElement, char);
  }

  protected submit(): void {
    if (this.checked()) {
      this.completed.emit(this.correct());
    } else if (this.value().trim()) {
      this.checked.set(true);
    }
  }
}
