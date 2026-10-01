import { readFileSync, readdirSync } from 'node:fs';
import { parseLesson } from './lesson-validation';
import { LessonSummary } from './models';

// Checks the real content in public/lessons, so a broken lesson fails the build before it is deployed.
const DIR = 'public/lessons';
const read = (file: string): unknown => JSON.parse(readFileSync(`${DIR}/${file}`, 'utf8'));

const index = read('index.json') as LessonSummary[];
const lessonFiles = readdirSync(DIR).filter((file) => file !== 'index.json' && file.endsWith('.json'));

describe('lesson files', () => {
  it('index.json lists every lesson file exactly once', () => {
    const listed = index.map((entry) => `${entry.id}.json`);
    expect([...listed].sort()).toEqual([...lessonFiles].sort());
  });

  describe.each(lessonFiles)('%s', (file) => {
    const raw = read(file);

    it('is a valid lesson', () => {
      expect(() => parseLesson(raw)).not.toThrow();
    });

    it('matches its index.json entry (id = file name, title, level, description)', () => {
      const lesson = parseLesson(raw);
      expect(`${lesson.id}.json`).toBe(file);
      const entry = index.find((item) => item.id === lesson.id);
      expect(entry).toEqual({
        id: lesson.id,
        title: lesson.title,
        level: lesson.level,
        ...(lesson.description ? { description: lesson.description } : {}),
      });
    });
  });
});
