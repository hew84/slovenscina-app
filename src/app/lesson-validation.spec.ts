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

  it('collects several problems at once', () => {
    expect(problemsOf({ id: '', vocabulary: 'x', exercises: [] }).length).toBeGreaterThan(3);
  });
});
