import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { DialogExercise } from '../models';
import { SpeechService } from '../speech.service';
import { DIALOG_TIMING, Dialog } from './dialog';

const exercise: DialogExercise = {
  id: 'd1',
  type: 'dialog',
  speakers: ['Ana', 'Marko'],
  lines: [
    { speaker: 'Ana', sl: 'Dober dan.', de: 'Guten Tag.' },
    { speaker: 'Marko', sl: 'Dober {{0}}.', answer: 'dan', distractor: 'večer' },
    { speaker: 'Ana', sl: 'Kako si?' },
    { speaker: 'Marko', sl: 'Dobro. Pa {{0}}?', answer: 'ti', distractor: 'si' },
    { speaker: 'Ana', sl: 'Adijo.' },
  ],
};

describe('Dialog', () => {
  let speak: ReturnType<typeof vi.fn>;

  async function render(dialog: DialogExercise = exercise, voiceAvailable = true) {
    speak = vi.fn(() => Promise.resolve());
    TestBed.configureTestingModule({
      providers: [
        { provide: SpeechService, useValue: { available: signal(voiceAvailable), speak, stop: vi.fn() } },
        { provide: DIALOG_TIMING, useValue: { pauseAfterLine: 0, silentBase: 0, silentPerChar: 0, voiceWait: 0 } },
      ],
    });
    const fixture = TestBed.createComponent(Dialog);
    fixture.componentRef.setInput('exercise', dialog);
    const results: boolean[] = [];
    fixture.componentInstance.completed.subscribe((correct) => results.push(correct));
    const element = fixture.nativeElement as HTMLElement;

    /** Lets the playback loop run until it waits for input or ends. */
    const settle = async () => {
      for (let i = 0; i < 30; i++) {
        await new Promise((resolve) => setTimeout(resolve));
      }
      await fixture.whenStable();
    };
    const bubbles = () => [...element.querySelectorAll('.sentence')].map((node) => node.textContent?.trim());
    const option = (word: string) =>
      [...element.querySelectorAll<HTMLButtonElement>('button.option')].find((b) => b.textContent?.trim() === word);
    const button = (label: string) =>
      [...element.querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent?.trim() === label);

    await settle();
    return { fixture, element, results, settle, bubbles, option, button };
  }

  it('plays the lines up to the first blank, then waits for a choice', async () => {
    const { bubbles, option } = await render();
    expect(bubbles()).toEqual(['Dober dan.', 'Dober .']);
    expect(speak).toHaveBeenCalledTimes(1);
    expect(speak).toHaveBeenCalledWith('Dober dan.', { pitch: 1 });
    expect(option('dan')).toBeTruthy();
    expect(option('večer')).toBeTruthy();
  });

  it('after a pick, reads the completed sentence in the second voice and continues to the next blank', async () => {
    const { bubbles, option, settle } = await render();
    option('dan')!.click();
    await settle();
    expect(speak).toHaveBeenNthCalledWith(2, 'Dober dan.', { pitch: 1.25 });
    expect(speak).toHaveBeenNthCalledWith(3, 'Kako si?', { pitch: 1 });
    expect(bubbles()).toEqual(['Dober dan.', 'Dober dan.', 'Kako si?', 'Dobro. Pa ?']);
  });

  it('counts the dialog as correct only if every blank is right', async () => {
    const { option, button, settle, element, results } = await render();
    option('dan')!.click();
    await settle();
    option('si')!.click();
    await settle();

    expect(element.querySelector('s.wrong')?.textContent).toBe('si');
    expect(element.textContent).toContain('1 von 2 Lücken richtig');
    button('Weiter')!.click();
    expect(results).toEqual([false]);
  });

  it('reports a fully correct dialog', async () => {
    const { option, button, settle, results } = await render();
    option('dan')!.click();
    await settle();
    option('ti')!.click();
    await settle();
    button('Weiter')!.click();
    expect(results).toEqual([true]);
  });

  it('handles a blank in the very first line', async () => {
    const { option } = await render({
      ...exercise,
      lines: [{ speaker: 'Ana', sl: 'Kako {{0}}?', answer: 'si', distractor: 'sem' }],
    });
    expect(option('si')).toBeTruthy();
    expect(speak).not.toHaveBeenCalled();
  });

  it('plays a dialog without blanks to the end', async () => {
    const { element, results, button } = await render({
      ...exercise,
      lines: [
        { speaker: 'Ana', sl: 'Živjo.' },
        { speaker: 'Marko', sl: 'Živjo.' },
      ],
    });
    expect(speak).toHaveBeenCalledTimes(2);
    expect(element.textContent).toContain('Dialog beendet.');
    button('Weiter')!.click();
    expect(results).toEqual([true]);
  });

  it('runs silently without a Slovenian voice', async () => {
    const { bubbles } = await render(exercise, false);
    expect(speak).not.toHaveBeenCalled();
    expect(bubbles()).toEqual(['Dober dan.', 'Dober .']);
  });

  it('shows the translation when a sentence is tapped', async () => {
    const { element, fixture } = await render();
    expect(element.querySelector('.de')).toBeNull();
    element.querySelector<HTMLButtonElement>('button.sentence')!.click();
    await fixture.whenStable();
    expect(element.querySelector('.de')?.textContent).toBe('Guten Tag.');
  });

  it('does not offer to replay an unanswered blank', async () => {
    const { element } = await render();
    expect(element.querySelectorAll('.replay')).toHaveLength(1);
  });
});
