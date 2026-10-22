import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { LessonService } from '../lesson.service';
import { ProgressService } from '../progress.service';
import { Home } from './home';

describe('Home', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: LessonService,
          useValue: {
            list: () =>
              Promise.resolve([
                { id: 'lesson-01', title: 'Eins', level: 'A1' },
                { id: 'lesson-02', title: 'Zwei', level: 'A1' },
              ]),
          },
        },
      ],
    });
  });

  async function render() {
    const fixture = TestBed.createComponent(Home);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const cards = () => [...element.querySelectorAll('mat-card')];
    const button = (card: Element, label: string) =>
      [...card.querySelectorAll<HTMLElement>('button, a')].find((b) => b.textContent?.trim() === label);
    return { fixture, cards, button };
  }

  it('offers a reset only for lessons with progress', async () => {
    TestBed.inject(ProgressService).record('lesson-01', 5, 10);
    const { cards, button } = await render();
    expect(button(cards()[0], 'Fortschritt zurücksetzen')).toBeTruthy();
    expect(button(cards()[1], 'Fortschritt zurücksetzen')).toBeUndefined();
  });

  it('resets only after confirmation', async () => {
    const progress = TestBed.inject(ProgressService);
    progress.record('lesson-01', 5, 10);
    const { fixture, cards, button } = await render();

    button(cards()[0], 'Fortschritt zurücksetzen')!.click();
    await fixture.whenStable();
    expect(cards()[0].textContent).toContain('Wirklich zurücksetzen?');
    button(cards()[0], 'Abbrechen')!.click();
    await fixture.whenStable();
    expect(progress.get('lesson-01')).toBeDefined();

    button(cards()[0], 'Fortschritt zurücksetzen')!.click();
    await fixture.whenStable();
    button(cards()[0], 'Zurücksetzen')!.click();
    await fixture.whenStable();
    expect(progress.get('lesson-01')).toBeUndefined();
    expect(cards()[0].textContent).not.toContain('Bestes Ergebnis');
    expect(button(cards()[0], 'Starten')).toBeTruthy();
  });
});
