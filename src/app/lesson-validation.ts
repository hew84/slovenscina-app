import { parseCloze } from './cloze';
import { Exercise, Lesson, VocabItem } from './models';

/** Thrown for hand-written lesson JSON that does not match the expected format. */
export class LessonFormatError extends Error {
  constructor(readonly problems: string[]) {
    super(`Lektion fehlerhaft:\n${problems.map((problem) => `• ${problem}`).join('\n')}`);
  }
}

type Json = Record<string, unknown>;

const isObject = (value: unknown): value is Json =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isText = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

const isTextList = (value: unknown): value is string[] =>
  Array.isArray(value) && value.length > 0 && value.every(isText);

/** Validates untrusted lesson JSON and returns it typed, or throws a LessonFormatError listing every problem. */
export function parseLesson(raw: unknown): Lesson {
  const problems: string[] = [];

  if (!isObject(raw)) {
    throw new LessonFormatError(['Die Datei enthält kein JSON-Objekt.']);
  }
  for (const key of ['id', 'title', 'level']) {
    if (!isText(raw[key])) {
      problems.push(`"${key}" fehlt oder ist leer.`);
    }
  }

  const vocabulary = validateVocabulary(raw['vocabulary'], problems);
  const vocabIds = new Set(vocabulary.map((item) => item.id));
  const exercises = validateExercises(raw['exercises'], vocabIds, problems);

  if (problems.length > 0) {
    throw new LessonFormatError(problems);
  }
  return {
    id: raw['id'] as string,
    title: raw['title'] as string,
    level: raw['level'] as string,
    description: isText(raw['description']) ? raw['description'] : undefined,
    vocabulary,
    exercises,
  };
}

function validateVocabulary(raw: unknown, problems: string[]): VocabItem[] {
  if (!Array.isArray(raw)) {
    problems.push('"vocabulary" muss eine Liste sein.');
    return [];
  }
  const seen = new Set<string>();
  const items: VocabItem[] = [];
  raw.forEach((entry, position) => {
    const label = `vocabulary[${position}]`;
    if (!isObject(entry) || !isText(entry['id']) || !isText(entry['sl']) || !isText(entry['de'])) {
      problems.push(`${label}: "id", "sl" und "de" sind Pflicht und dürfen nicht leer sein.`);
      return;
    }
    if (seen.has(entry['id'])) {
      problems.push(`${label}: id "${entry['id']}" kommt doppelt vor.`);
    }
    seen.add(entry['id']);
    items.push({
      id: entry['id'],
      sl: entry['sl'],
      de: entry['de'],
      note: isText(entry['note']) ? entry['note'] : undefined,
    });
  });
  return items;
}

function validateExercises(raw: unknown, vocabIds: Set<string>, problems: string[]): Exercise[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    problems.push('"exercises" muss eine nicht-leere Liste sein.');
    return [];
  }
  const seen = new Set<string>();
  const exercises: Exercise[] = [];
  raw.forEach((entry, position) => {
    const id = isObject(entry) && isText(entry['id']) ? entry['id'] : null;
    const label = `exercises[${position}]${id ? ` (${id})` : ''}`;
    if (!isObject(entry) || id === null) {
      problems.push(`${label}: "id" fehlt.`);
      return;
    }
    if (seen.has(id)) {
      problems.push(`${label}: id "${id}" kommt doppelt vor.`);
    }
    seen.add(id);

    switch (entry['type']) {
      case 'flashcard':
        if (!isText(entry['vocabId']) || !vocabIds.has(entry['vocabId'])) {
          problems.push(`${label}: "vocabId" verweist auf keine Vokabel.`);
          return;
        }
        exercises.push({ id, type: 'flashcard', vocabId: entry['vocabId'] });
        return;
      case 'translate':
        if (!isText(entry['prompt']) || !isTextList(entry['answers'])) {
          problems.push(`${label}: "prompt" und eine nicht-leere Liste "answers" sind Pflicht.`);
          return;
        }
        exercises.push({ id, type: 'translate', prompt: entry['prompt'], answers: entry['answers'] });
        return;
      case 'cloze': {
        const answers = entry['answers'];
        if (!isText(entry['text']) || !Array.isArray(answers) || !answers.every(isTextList)) {
          problems.push(
            `${label}: "text" und "answers" (Liste von Listen mit erlaubten Schreibweisen) sind Pflicht.`,
          );
          return;
        }
        const blanks = new Set(
          parseCloze(entry['text']).flatMap((segment) => (segment.kind === 'blank' ? [segment.index] : [])),
        );
        const covered = answers.every((_, index) => blanks.has(index)) && blanks.size === answers.length;
        if (blanks.size === 0 || !covered) {
          problems.push(
            `${label}: Platzhalter {{0}}…{{n}} im Text und Einträge in "answers" passen nicht zusammen.`,
          );
          return;
        }
        exercises.push({
          id,
          type: 'cloze',
          text: entry['text'],
          answers,
          translation: isText(entry['translation']) ? entry['translation'] : undefined,
        });
        return;
      }
      default:
        problems.push(`${label}: unbekannter "type" (erlaubt: flashcard, cloze, translate).`);
    }
  });
  return exercises;
}
