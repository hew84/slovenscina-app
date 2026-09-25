export interface VocabItem {
  id: string;
  sl: string;
  de: string;
  note?: string;
}

export interface FlashcardExercise {
  id: string;
  type: 'flashcard';
  vocabId: string;
}

export interface ClozeExercise {
  id: string;
  type: 'cloze';
  /** Sentence with numbered blanks, e.g. "Jaz {{0}} iz {{1}}." */
  text: string;
  /** Accepted spellings per blank, indexed like the placeholders. */
  answers: string[][];
  translation?: string;
}

export interface TranslateExercise {
  id: string;
  type: 'translate';
  /** German prompt. */
  prompt: string;
  /** Accepted Slovenian spellings. */
  answers: string[];
}

export type Exercise = FlashcardExercise | ClozeExercise | TranslateExercise;

export interface Lesson {
  id: string;
  title: string;
  level: string;
  description?: string;
  vocabulary: VocabItem[];
  exercises: Exercise[];
}

export interface LessonSummary {
  id: string;
  title: string;
  level: string;
  description?: string;
}
