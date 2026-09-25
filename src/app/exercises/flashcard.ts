import { Component, inject, input, output, signal } from '@angular/core';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatCard, MatCardActions, MatCardContent } from '@angular/material/card';
import { VocabItem } from '../models';
import { SpeechService } from '../speech.service';
import { Icon } from '../ui/icon';

@Component({
  selector: 'app-flashcard',
  imports: [MatButton, MatIconButton, MatCard, MatCardContent, MatCardActions, Icon],
  template: `
    <mat-card appearance="outlined">
      <mat-card-content>
        <p class="label">Wie heißt das auf Slowenisch?</p>
        <p class="prompt">{{ item().de }}</p>
        @if (revealed()) {
          <p class="answer" lang="sl">
            {{ item().sl }}
            @if (speech.available()) {
              <button matIconButton type="button" aria-label="Aussprache anhören" (click)="speech.speak(item().sl)">
                <app-icon name="volume" />
              </button>
            }
          </p>
          @if (item().note) {
            <p class="note">{{ item().note }}</p>
          }
        }
      </mat-card-content>
      <mat-card-actions>
        @if (revealed()) {
          <button matButton="tonal" type="button" (click)="completed.emit(false)">Nicht gewusst</button>
          <button matButton="filled" type="button" (click)="completed.emit(true)">Gewusst</button>
        } @else {
          <button matButton="filled" type="button" (click)="revealed.set(true)">Umdrehen</button>
        }
      </mat-card-actions>
    </mat-card>
  `,
  styles: `
    mat-card-content {
      padding-top: 1.5rem;
      min-height: 12rem;
    }
    mat-card-actions {
      padding: 0 1rem 1rem;
      justify-content: flex-end;
      gap: 0.5rem;
    }
    .label {
      color: var(--mat-sys-on-surface-variant);
      font: var(--mat-sys-label-large);
    }
    .prompt {
      font: var(--mat-sys-headline-medium);
    }
    .answer {
      font: var(--mat-sys-headline-medium);
      color: var(--mat-sys-primary);
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .note {
      color: var(--mat-sys-on-surface-variant);
    }
  `,
})
export class Flashcard {
  protected readonly speech = inject(SpeechService);
  readonly item = input.required<VocabItem>();
  readonly completed = output<boolean>();
  protected readonly revealed = signal(false);
}
