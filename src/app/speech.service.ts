import { Injectable, signal } from '@angular/core';

const SLOVENIAN = /^sl([-_]|$)/i;

export interface SpeakOptions {
  /** 0–2, 1 is the voice's normal pitch. */
  pitch?: number;
}

/** Reads Slovenian text aloud with the device's own voices (Web Speech API). */
@Injectable({ providedIn: 'root' })
export class SpeechService {
  private readonly synth: SpeechSynthesis | null =
    typeof speechSynthesis === 'undefined' ? null : speechSynthesis;
  /** Held so the browser cannot garbage-collect the utterance (and drop its "end" event) while it speaks. */
  private current: SpeechSynthesisUtterance | null = null;

  /** True only if the device has a Slovenian voice; otherwise the UI hides the audio buttons. */
  readonly available = signal(false);

  constructor() {
    if (!this.synth) {
      return;
    }
    const update = () => this.available.set(this.findVoice() !== null);
    update();
    // Voices are loaded asynchronously in most browsers.
    this.synth.addEventListener('voiceschanged', update);
  }

  /**
   * Speaks `text`, replacing anything currently being spoken.
   * Resolves when speaking ends, is interrupted, or fails — and at the latest after a generous
   * timeout, because some browsers (notably iOS Safari) occasionally never report the end.
   * Resolves immediately when there is no Slovenian voice.
   */
  speak(text: string, options: SpeakOptions = {}): Promise<void> {
    const voice = this.findVoice();
    if (!this.synth || !voice) {
      return Promise.resolve();
    }
    this.synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = voice;
    utterance.lang = voice.lang;
    utterance.rate = 0.9;
    utterance.pitch = options.pitch ?? 1;
    this.current = utterance;

    return new Promise((resolve) => {
      const finish = () => {
        clearTimeout(fallback);
        if (this.current === utterance) {
          this.current = null;
        }
        resolve();
      };
      const fallback = setTimeout(finish, 3000 + text.length * 150);
      utterance.addEventListener('end', finish);
      utterance.addEventListener('error', finish);
      this.synth!.speak(utterance);
    });
  }

  /** Stops speaking; a pending `speak()` promise resolves. */
  stop(): void {
    this.synth?.cancel();
  }

  private findVoice(): SpeechSynthesisVoice | null {
    return this.synth?.getVoices().find((voice) => SLOVENIAN.test(voice.lang)) ?? null;
  }
}
