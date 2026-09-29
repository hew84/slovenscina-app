import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ChoiceExercise } from '../models';
import { SpeechService } from '../speech.service';
import { Choice } from './choice';

const exercise: ChoiceExercise = {
  id: 'a1',
  type: 'choice',
  text: 'Kako {{0}}?',
  answer: 'si',
  distractor: 'sem',
  translation: 'Wie geht’s dir?',
};

describe('Choice', () => {
  let speak: ReturnType<typeof vi.fn>;

  async function render(voiceAvailable = true) {
    speak = vi.fn();
    TestBed.configureTestingModule({
      providers: [{ provide: SpeechService, useValue: { available: signal(voiceAvailable), speak } }],
    });
    const fixture = TestBed.createComponent(Choice);
    fixture.componentRef.setInput('exercise', exercise);
    const results: boolean[] = [];
    fixture.componentInstance.completed.subscribe((correct) => results.push(correct));
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const option = (word: string) =>
      [...element.querySelectorAll<HTMLButtonElement>('button.option')].find((button) => button.textContent?.trim() === word)!;
    const button = (label: string) =>
      [...element.querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent?.includes(label));
    return { fixture, element, results, option, button };
  }

  it('shows the German translation and both words', async () => {
    const { element, option } = await render();
    expect(element.textContent).toContain('Wie geht’s dir?');
    expect(option('si')).toBeTruthy();
    expect(option('sem')).toBeTruthy();
  });

  it('reads the full sentence aloud once when it opens', async () => {
    await render();
    expect(speak).toHaveBeenCalledTimes(1);
    expect(speak).toHaveBeenCalledWith('Kako si?');
  });

  it('replays the sentence from the listen button', async () => {
    const { button } = await render();
    button('Anhören')!.click();
    expect(speak).toHaveBeenCalledTimes(2);
  });

  it('hides the listen button and stays silent without a Slovenian voice', async () => {
    const { button } = await render(false);
    expect(button('Anhören')).toBeUndefined();
    expect(speak).not.toHaveBeenCalled();
  });

  it('reports a correct pick after "Weiter"', async () => {
    const { fixture, option, button, results } = await render();
    option('si').click();
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Richtig!');
    button('Weiter')!.click();
    expect(results).toEqual([true]);
  });

  it('reports a wrong pick, shows the solution and locks the options', async () => {
    const { fixture, option, button, results } = await render();
    option('sem').click();
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Richtig wäre: Kako si?');
    expect(option('si').disabled).toBe(true);
    expect(option('sem').classList).toContain('wrong');
    expect(option('si').classList).toContain('ok');
    button('Weiter')!.click();
    expect(results).toEqual([false]);
  });
});
