import { Component, computed, input } from '@angular/core';

// Material icon paths inlined so no icon font is needed (works offline, no third-party requests).
const PATHS = {
  back: 'M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z',
  check: 'M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z',
  close: 'M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z',
  refresh:
    'M17.65 6.35A7.96 7.96 0 0 0 12 4a8 8 0 1 0 7.73 10h-2.08A6 6 0 1 1 12 6c1.66 0 3.14.69 4.22 1.78L13 11h7V4z',
  volume:
    'M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 7.97v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z',
} as const;

export type IconName = keyof typeof PATHS;

@Component({
  selector: 'app-icon',
  template: `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path [attr.d]="path()" /></svg>`,
  styles: `
    :host {
      display: inline-flex;
      vertical-align: middle;
    }
    svg {
      width: 1.5em;
      height: 1.5em;
      fill: currentColor;
    }
  `,
})
export class Icon {
  readonly name = input.required<IconName>();
  protected readonly path = computed(() => PATHS[this.name()]);
}
