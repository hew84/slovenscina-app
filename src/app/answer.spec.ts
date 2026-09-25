import { isCorrect, nearMiss, normalizeAnswer } from './answer';

describe('isCorrect', () => {
  it('accepts the exact spelling', () => {
    expect(isCorrect('Lahko noč', ['Lahko noč'])).toBe(true);
  });

  it('accepts any of several listed variants', () => {
    expect(isCorrect('Nasvidenje', ['Na svidenje', 'Nasvidenje'])).toBe(true);
  });

  it('rejects missing diacritics', () => {
    expect(isCorrect('Lahko noc', ['Lahko noč'])).toBe(false);
    expect(isCorrect('vecer', ['večer'])).toBe(false);
  });

  it('rejects wrong capitalisation', () => {
    expect(isCorrect('dober dan', ['Dober dan'])).toBe(false);
  });

  it('rejects missing punctuation', () => {
    expect(isCorrect('Kako si', ['Kako si?'])).toBe(false);
  });

  it('ignores surrounding and repeated whitespace', () => {
    expect(isCorrect('  Dober   dan ', ['Dober dan'])).toBe(true);
  });

  it('treats a decomposed č (c + combining caron) like the composed character', () => {
    expect(isCorrect('večer', ['večer'])).toBe(true);
  });

  it('rejects empty input', () => {
    expect(isCorrect('   ', [''])).toBe(false);
  });
});

describe('normalizeAnswer', () => {
  it('trims and collapses whitespace', () => {
    expect(normalizeAnswer(' a \t b ')).toBe('a b');
  });
});

describe('nearMiss', () => {
  it('detects a capitalisation slip', () => {
    expect(nearMiss('dober dan', ['Dober dan'])).toBe('case');
  });

  it('detects missing diacritics', () => {
    expect(nearMiss('Lahko noc', ['Lahko noč'])).toBe('diacritics');
    expect(nearMiss('Zivjo', ['Živjo'])).toBe('diacritics');
  });

  it('returns null for unrelated answers and empty input', () => {
    expect(nearMiss('Hvala', ['Prosim'])).toBeNull();
    expect(nearMiss('', ['Prosim'])).toBeNull();
  });
});
