import { Component, input } from '@angular/core';
import { Icon } from './icon';

@Component({
  selector: 'app-feedback',
  imports: [Icon],
  template: `
    <div class="feedback" [class.ok]="correct()" [class.wrong]="!correct()" role="status">
      <app-icon [name]="correct() ? 'check' : 'close'" />
      <div>
        <strong>{{ correct() ? 'Richtig!' : 'Leider falsch.' }}</strong>
        @if (!correct() && solution()) {
          <div>Richtig wäre: <span lang="sl" class="solution">{{ solution() }}</span></div>
        }
        @if (hint()) {
          <div class="hint">{{ hint() }}</div>
        }
      </div>
    </div>
  `,
  styles: `
    .feedback {
      display: flex;
      gap: 0.75rem;
      align-items: flex-start;
      padding: 0.75rem 1rem;
      border-radius: var(--mat-sys-corner-medium);
    }
    .ok {
      background: var(--mat-sys-tertiary-container);
      color: var(--mat-sys-on-tertiary-container);
    }
    .wrong {
      background: var(--mat-sys-error-container);
      color: var(--mat-sys-on-error-container);
    }
    .solution {
      font-weight: 500;
    }
    .hint {
      margin-top: 0.25rem;
      font: var(--mat-sys-body-small);
    }
  `,
})
export class Feedback {
  readonly correct = input.required<boolean>();
  readonly solution = input<string>();
  readonly hint = input<string | null>(null);
}
