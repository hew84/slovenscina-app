import { Injectable, signal } from '@angular/core';

const SLOVENIAN = /^sl([-_]|$)/i;

/** Reads Slovenian text aloud with the device's own voices (Web Speech API). */
@Injectable({ providedIn: 'root' })
export class SpeechService {
  private readonly synth: SpeechSynthesis | null =
    typeof speechSynthesis === 'undefined' ? null : speechSynthesis;

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

  speak(text: string): void {
    const voice = this.findVoice();
    if (!this.synth || !voice) {
      return;
    }
    this.synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = voice;
    utterance.lang = voice.lang;
    utterance.rate = 0.9;
    this.synth.speak(utterance);
  }

  private findVoice(): SpeechSynthesisVoice | null {
    return this.synth?.getVoices().find((voice) => SLOVENIAN.test(voice.lang)) ?? null;
  }
}
