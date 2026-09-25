import { Component, input, output } from '@angular/core';
import { MatButton } from '@angular/material/button';

/** Inserts `text` at the caret of `field` and notifies listeners as if the user had typed it. */
export function insertAtCaret(field: HTMLInputElement, text: string): void {
  const start = field.selectionStart ?? field.value.length;
  const end = field.selectionEnd ?? start;
  field.setRangeText(text, start, end, 'end');
  field.dispatchEvent(new Event('input', { bubbles: true }));
  field.focus();
}

@Component({
  selector: 'app-special-chars',
  imports: [MatButton],
  template: `
    <div class="chars" role="group" aria-label="Sonderzeichen">
      @for (char of chars; track char) {
        <button
          type="button"
          matButton="outlined"
          [disabled]="disabled()"
          (mousedown)="$event.preventDefault()"
          (click)="pick.emit(char)"
        >
          {{ char }}
        </button>
      }
    </div>
  `,
  styles: `
    .chars {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }
    button {
      min-width: 2.75rem;
      padding: 0 0.5rem;
    }
  `,
})
export class SpecialChars {
  protected readonly chars = ['č', 'š', 'ž', 'Č', 'Š', 'Ž'];
  readonly disabled = input(false);
  readonly pick = output<string>();
}
