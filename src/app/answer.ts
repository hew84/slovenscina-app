export type NearMiss = 'case' | 'diacritics';

/**
 * Answers are compared exactly, including capitalisation and č/š/ž.
 * Only invisible differences are ignored: surrounding/repeated whitespace and
 * Unicode composition (a keyboard may send "c" + combining caron instead of "č").
 */
export function normalizeAnswer(value: string): string {
  return value.normalize('NFC').trim().replace(/\s+/g, ' ');
}

export function isCorrect(input: string, accepted: readonly string[]): boolean {
  const normalized = normalizeAnswer(input);
  return normalized.length > 0 && accepted.some((answer) => normalizeAnswer(answer) === normalized);
}

const stripDiacritics = (value: string) => value.normalize('NFD').replace(/\p{M}/gu, '');

/**
 * For a wrong answer: says whether it would have been right apart from
 * capitalisation or diacritics. Only used for feedback, never for grading.
 */
export function nearMiss(input: string, accepted: readonly string[]): NearMiss | null {
  const normalized = normalizeAnswer(input);
  if (!normalized) {
    return null;
  }
  const targets = accepted.map(normalizeAnswer);
  if (targets.some((target) => target.toLowerCase() === normalized.toLowerCase())) {
    return 'case';
  }
  const bare = stripDiacritics(normalized).toLowerCase();
  if (targets.some((target) => stripDiacritics(target).toLowerCase() === bare)) {
    return 'diacritics';
  }
  return null;
}

export function nearMissMessage(kind: NearMiss): string {
  return kind === 'case'
    ? 'Fast richtig – achte auf Groß- und Kleinschreibung.'
    : 'Fast richtig – achte auf die Sonderzeichen (č, š, ž).';
}
