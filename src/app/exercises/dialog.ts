import {
  Component,
  DestroyRef,
  ElementRef,
  InjectionToken,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatCard, MatCardActions, MatCardContent } from '@angular/material/card';
import { fillBlanks, parseCloze } from '../cloze';
import { DialogExercise, DialogLine } from '../models';
import { SpeechService } from '../speech.service';
import { Icon } from '../ui/icon';

/** Pacing of the dialog in milliseconds; replaced with zeros in tests. */
export interface DialogTiming {
  /** Pause after each spoken sentence. */
  pauseAfterLine: number;
  /** Without a Slovenian voice, each sentence stays this long … */
  silentBase: number;
  /** … plus this much per character, so longer sentences can be read. */
  silentPerChar: number;
  /** How long to wait for the device's voices to load before starting silently. */
  voiceWait: number;
}

export const DIALOG_TIMING = new InjectionToken<DialogTiming>('DIALOG_TIMING', {
  factory: () => ({ pauseAfterLine: 350, silentBase: 900, silentPerChar: 45, voiceWait: 800 }),
});

/** The second speaker is spoken slightly higher, so the two sound different with a single device voice. */
const SECOND_SPEAKER_PITCH = 1.25;

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

@Component({
  selector: 'app-dialog',
  imports: [NgTemplateOutlet, MatButton, MatIconButton, MatCard, MatCardContent, MatCardActions, Icon],
  template: `
    <mat-card appearance="outlined">
      <mat-card-content>
        <p class="label">Dialog{{ exercise().title ? ': ' + exercise().title : '' }}</p>
        <div class="chat" aria-live="polite">
          @for (line of visibleLines(); track $index; let i = $index) {
            <div class="row" [class.right]="isRight(line)">
              <span class="name">{{ line.speaker }}</span>
              <div class="bubble">
                <div class="line">
                  @if (line.de) {
                    <button
                      type="button"
                      class="sentence"
                      lang="sl"
                      [attr.aria-expanded]="openTranslations().has(i)"
                      aria-label="Übersetzung ein- oder ausblenden"
                      (click)="toggleTranslation(i)"
                    >
                      <ng-container [ngTemplateOutlet]="sentence" [ngTemplateOutletContext]="{ line, i }" />
                    </button>
                  } @else {
                    <span class="sentence" lang="sl">
                      <ng-container [ngTemplateOutlet]="sentence" [ngTemplateOutletContext]="{ line, i }" />
                    </span>
                  }
                  @if (speech.available() && !playing() && !(line.answer && picks()[i] === undefined)) {
                    <button matIconButton type="button" class="replay" aria-label="Satz anhören" (click)="say(i)">
                      <app-icon name="volume" />
                    </button>
                  }
                </div>
                @if (line.de && openTranslations().has(i)) {
                  <div class="de">{{ line.de }}</div>
                }
              </div>
            </div>
          }
        </div>

        <ng-template #sentence let-line="line" let-i="i">
          <!-- Text sits directly inside <span>s: loose template whitespace would show up as extra spaces. -->
          @for (segment of segmentsOf(line); track $index) {
            @if (segment.kind === 'text') {
              <span>{{ segment.text }}</span>
            } @else if (picks()[i] === undefined) {
              <span class="blank" aria-label="Lücke"></span>
            } @else if (picks()[i] === line.answer) {
              <span class="ok">{{ line.answer }}</span>
            } @else {
              <s class="wrong">{{ picks()[i] }}</s><span class="ok"> {{ line.answer }}</span>
            }
          }
        </ng-template>

        <!-- Not "@if (waitingAt(); as index)": index 0 is falsy. -->
        @let index = waitingAt();
        @if (index !== null) {
          <div class="choose">
            <p class="label">Wähle das richtige Wort</p>
            <div class="options" role="group" aria-label="Auswahl">
              @for (option of optionsFor(index); track option) {
                <button matButton="outlined" type="button" class="option" lang="sl" (click)="pick(index, option)">
                  {{ option }}
                </button>
              }
            </div>
          </div>
        }

        @if (done()) {
          <p class="result" role="status">
            @if (gapCount() === 0) {
              Dialog beendet.
            } @else {
              {{ correctCount() }} von {{ gapCount() }} {{ gapCount() === 1 ? 'Lücke' : 'Lücken' }} richtig
            }
          </p>
        }
      </mat-card-content>
      @if (done()) {
        <mat-card-actions>
          <button matButton="filled" type="button" (click)="completed.emit(correctCount() === gapCount())">Weiter</button>
        </mat-card-actions>
      }
      <!-- Scroll anchor: kept in view so the newest line, the answer buttons and "Weiter" stay visible. -->
      <div #end></div>
    </mat-card>
  `,
  styleUrl: './dialog.scss',
})
export class Dialog {
  protected readonly speech = inject(SpeechService);
  private readonly timing = inject(DIALOG_TIMING);
  readonly exercise = input.required<DialogExercise>();
  readonly completed = output<boolean>();

  /** Number of lines shown so far. */
  private readonly shown = signal(0);
  /** Index of the line whose blank is waiting for a pick, or null. */
  protected readonly waitingAt = signal<number | null>(null);
  protected readonly playing = signal(true);
  protected readonly done = signal(false);
  protected readonly picks = signal<Record<number, string>>({});
  protected readonly openTranslations = signal<ReadonlySet<number>>(new Set());

  protected readonly visibleLines = computed(() => this.exercise().lines.slice(0, this.shown()));
  protected readonly gapCount = computed(() => this.exercise().lines.filter((line) => line.answer).length);
  protected readonly correctCount = computed(
    () => this.exercise().lines.filter((line, index) => line.answer && this.picks()[index] === line.answer).length,
  );
  /** Option order per line, shuffled once per dialog run. */
  private readonly options = computed(() =>
    this.exercise().lines.map(({ answer, distractor }) =>
      answer && distractor ? (Math.random() < 0.5 ? [answer, distractor] : [distractor, answer]) : [],
    ),
  );

  private readonly end = viewChild.required<ElementRef<HTMLElement>>('end');
  private destroyed = false;

  constructor() {
    // Start as soon as a Slovenian voice is known to exist (voices load asynchronously), or silently after a short wait.
    let started = false;
    const start = () => {
      if (!started) {
        started = true;
        void this.play(0);
      }
    };
    effect(() => {
      if (this.speech.available()) {
        untracked(start);
      }
    });
    const timer = setTimeout(start, this.timing.voiceWait);

    effect(() => {
      this.shown();
      this.waitingAt();
      this.done();
      untracked(() => setTimeout(() => this.end().nativeElement.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' })));
    });

    inject(DestroyRef).onDestroy(() => {
      this.destroyed = true;
      clearTimeout(timer);
      this.speech.stop();
    });
  }

  /** Shows and speaks lines from `from` on, until a line with a blank or the end of the dialog. */
  private async play(from: number): Promise<void> {
    const lines = this.exercise().lines;
    this.playing.set(true);
    for (let index = from; index < lines.length; index++) {
      if (this.destroyed) {
        return;
      }
      this.shown.set(index + 1);
      if (lines[index].answer) {
        this.playing.set(false);
        this.waitingAt.set(index);
        return;
      }
      await this.speakLine(index);
    }
    this.playing.set(false);
    this.done.set(true);
  }

  protected async pick(index: number, option: string): Promise<void> {
    if (this.waitingAt() !== index) {
      return;
    }
    this.picks.update((picks) => ({ ...picks, [index]: option }));
    this.waitingAt.set(null);
    this.playing.set(true);
    await this.speakLine(index);
    await this.play(index + 1);
  }

  /** Speaks a line during playback and waits until it is done, plus a short pause. */
  private async speakLine(index: number): Promise<void> {
    const line = this.exercise().lines[index];
    if (this.speech.available()) {
      await this.say(index);
      await delay(this.timing.pauseAfterLine);
    } else {
      await delay(this.timing.silentBase + this.textOf(line).length * this.timing.silentPerChar);
    }
  }

  protected say(index: number): Promise<void> {
    const line = this.exercise().lines[index];
    return this.speech.speak(this.textOf(line), { pitch: this.isRight(line) ? SECOND_SPEAKER_PITCH : 1 });
  }

  protected isRight(line: DialogLine): boolean {
    return line.speaker === this.exercise().speakers[1];
  }

  protected segmentsOf(line: DialogLine) {
    return parseCloze(line.sl);
  }

  protected optionsFor(index: number): string[] {
    return this.options()[index];
  }

  protected toggleTranslation(index: number): void {
    this.openTranslations.update((open) => {
      const next = new Set(open);
      if (!next.delete(index)) {
        next.add(index);
      }
      return next;
    });
  }

  private textOf(line: DialogLine): string {
    return fillBlanks(line.sl, [line.answer ?? '']);
  }
}
