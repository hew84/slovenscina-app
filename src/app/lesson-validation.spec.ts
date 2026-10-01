import { LessonFormatError, parseLesson } from './lesson-validation';

const valid = () => ({
  id: 'lesson-99',
  title: 'Test',
  level: 'A1',
  vocabulary: [{ id: 'v1', sl: 'Hvala', de: 'Danke' }],
  exercises: [
    { id: 'e1', type: 'flashcard', vocabId: 'v1' },
    { id: 'e2', type: 'cloze', text: 'Jaz {{0}} iz {{1}}.', answers: [['sem'], ['Nemčije']] },
    { id: 'e3', type: 'translate', prompt: 'Danke', answers: ['Hvala'] },
  ],
});

function problemsOf(raw: unknown): string[] {
  try {
    parseLesson(raw);
  } catch (error) {
    if (error instanceof LessonFormatError) {
      return error.problems;
    }
    throw error;
  }
  return [];
}

describe('parseLesson', () => {
  it('accepts a valid lesson', () => {
    const lesson = parseLesson(valid());
    expect(lesson.exercises).toHaveLength(3);
    expect(lesson.vocabulary[0].sl).toBe('Hvala');
  });

  it('rejects non-objects', () => {
    expect(problemsOf(null)).toHaveLength(1);
    expect(problemsOf([])).toHaveLength(1);
  });

  it('reports a flashcard that points to a missing vocabulary entry', () => {
    const lesson = valid();
    lesson.exercises[0] = { id: 'e1', type: 'flashcard', vocabId: 'nope' };
    expect(problemsOf(lesson).join('\n')).toContain('vocabId');
  });

  it('reports duplicate ids', () => {
    const lesson = valid();
    lesson.exercises[2].id = 'e1';
    expect(problemsOf(lesson).join('\n')).toContain('doppelt');
  });

  it('reports cloze placeholders that do not match the answers', () => {
    const lesson = valid();
    lesson.exercises[1] = { id: 'e2', type: 'cloze', text: 'Jaz {{0}} iz {{1}}.', answers: [['sem']] } as never;
    expect(problemsOf(lesson).join('\n')).toContain('Platzhalter');
  });

  it('reports an unknown exercise type', () => {
    const lesson = valid();
    lesson.exercises[2] = { id: 'e3', type: 'memory' } as never;
    expect(problemsOf(lesson).join('\n')).toContain('unbekannter');
  });

  describe('choice exercises', () => {
    const choice = (overrides: Record<string, unknown>) => {
      const lesson = valid();
      lesson.exercises[2] = {
        id: 'e3',
        type: 'choice',
        text: 'Kako {{0}}?',
        answer: 'si',
        distractor: 'sem',
        translation: 'Wie geht’s dir?',
        ...overrides,
      } as never;
      return lesson;
    };

    it('accepts a valid choice exercise', () => {
      expect(parseLesson(choice({})).exercises[2]).toMatchObject({ type: 'choice', answer: 'si', distractor: 'sem' });
    });

    it('requires a translation and a distractor', () => {
      expect(problemsOf(choice({ translation: undefined })).join('\n')).toContain('Pflicht');
      expect(problemsOf(choice({ distractor: '' })).join('\n')).toContain('Pflicht');
    });

    it('requires exactly one blank {{0}}', () => {
      expect(problemsOf(choice({ text: 'Kako si?' })).join('\n')).toContain('genau eine Lücke');
      expect(problemsOf(choice({ text: '{{0}} {{1}}?' })).join('\n')).toContain('genau eine Lücke');
      expect(problemsOf(choice({ text: 'Kako {{1}}?' })).join('\n')).toContain('genau eine Lücke');
    });

    it('rejects a distractor equal to the answer', () => {
      expect(problemsOf(choice({ distractor: ' si ' })).join('\n')).toContain('nicht gleich');
    });
  });

  describe('dialog exercises', () => {
    const dialog = (overrides: Record<string, unknown> = {}, lines?: unknown[]) => {
      const lesson = valid();
      lesson.exercises[2] = {
        id: 'e3',
        type: 'dialog',
        speakers: ['Ana', 'Marko'],
        lines: lines ?? [
          { speaker: 'Ana', sl: 'Kako si?', de: 'Wie geht’s dir?' },
          { speaker: 'Marko', sl: 'Dobro. Pa {{0}}?', answer: 'ti', distractor: 'si' },
        ],
        ...overrides,
      } as never;
      return lesson;
    };
    const problems = (overrides: Record<string, unknown> = {}, lines?: unknown[]) =>
      problemsOf(dialog(overrides, lines)).join('\n');

    it('accepts lines with and without a blank', () => {
      const parsed = parseLesson(dialog()).exercises[2];
      expect(parsed).toMatchObject({ type: 'dialog', speakers: ['Ana', 'Marko'] });
      expect(parsed.type === 'dialog' && parsed.lines[1]).toMatchObject({ answer: 'ti', distractor: 'si' });
    });

    it('accepts a dialog without any blank', () => {
      expect(problems({}, [{ speaker: 'Ana', sl: 'Živjo.' }])).toBe('');
    });

    it('requires exactly two different speakers', () => {
      expect(problems({ speakers: ['Ana'] })).toContain('genau zwei');
      expect(problems({ speakers: ['Ana', 'Ana'] })).toContain('genau zwei');
    });

    it('requires at least one line', () => {
      expect(problems({}, [])).toContain('nicht-leere Liste');
    });

    it('reports an unknown speaker', () => {
      expect(problems({}, [{ speaker: 'Eva', sl: 'Živjo.' }])).toContain('Sprecher "Eva"');
    });

    it('requires answer and distractor for a blank, and only for a blank', () => {
      expect(problems({}, [{ speaker: 'Ana', sl: 'Pa {{0}}?', answer: 'ti' }])).toContain('braucht');
      expect(problems({}, [{ speaker: 'Ana', sl: 'Živjo.', answer: 'ti', distractor: 'si' }])).toContain(
        'nur bei einem Satz mit Lücke',
      );
    });

    it('allows at most one blank per line', () => {
      expect(problems({}, [{ speaker: 'Ana', sl: '{{0}} {{1}}', answer: 'a', distractor: 'b' }])).toContain(
        'höchstens eine Lücke',
      );
    });

    it('rejects a distractor equal to the answer', () => {
      expect(problems({}, [{ speaker: 'Ana', sl: 'Pa {{0}}?', answer: 'ti', distractor: 'ti' }])).toContain(
        'nicht gleich',
      );
    });
  });

  it('collects several problems at once', () => {
    expect(problemsOf({ id: '', vocabulary: 'x', exercises: [] }).length).toBeGreaterThan(3);
  });
});
