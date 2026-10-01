import { TestBed } from '@angular/core/testing';
import { SpeechService } from './speech.service';

/** Minimal stand-ins for the Web Speech API, which jsdom does not provide. */
class FakeUtterance extends EventTarget {
  voice: unknown = null;
  lang = '';
  rate = 1;
  pitch = 1;
  constructor(readonly text: string) {
    super();
  }
}

function installFakeSpeech(voices: { lang: string }[]) {
  const spoken: FakeUtterance[] = [];
  const synth = Object.assign(new EventTarget(), {
    getVoices: () => voices,
    speak: (utterance: FakeUtterance) => spoken.push(utterance),
    cancel: vi.fn(),
  });
  vi.stubGlobal('speechSynthesis', synth);
  vi.stubGlobal('SpeechSynthesisUtterance', FakeUtterance);
  return { synth, spoken };
}

describe('SpeechService', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('is unavailable and resolves at once without a Slovenian voice', async () => {
    const { spoken } = installFakeSpeech([{ lang: 'de-DE' }]);
    const service = TestBed.inject(SpeechService);
    expect(service.available()).toBe(false);
    await service.speak('Živjo');
    expect(spoken).toHaveLength(0);
  });

  it('speaks with the Slovenian voice and the given pitch, resolving on "end"', async () => {
    const { spoken } = installFakeSpeech([{ lang: 'de-DE' }, { lang: 'sl-SI' }]);
    const service = TestBed.inject(SpeechService);
    expect(service.available()).toBe(true);

    let done = false;
    const pending = service.speak('Dober dan.', { pitch: 1.25 }).then(() => (done = true));
    expect(spoken[0]).toMatchObject({ text: 'Dober dan.', lang: 'sl-SI', pitch: 1.25 });

    await Promise.resolve();
    expect(done).toBe(false);
    spoken[0].dispatchEvent(new Event('end'));
    await pending;
    expect(done).toBe(true);
  });

  it('resolves after a timeout if the browser never reports the end', async () => {
    vi.useFakeTimers();
    installFakeSpeech([{ lang: 'sl-SI' }]);
    const service = TestBed.inject(SpeechService);
    let done = false;
    void service.speak('Adijo.').then(() => (done = true));

    await vi.advanceTimersByTimeAsync(2000);
    expect(done).toBe(false);
    await vi.advanceTimersByTimeAsync(5000);
    expect(done).toBe(true);
  });
});
