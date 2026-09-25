import { parseCloze } from './cloze';

describe('parseCloze', () => {
  it('splits text and blanks in order', () => {
    expect(parseCloze('Jaz {{0}} iz {{1}}.')).toEqual([
      { kind: 'text', text: 'Jaz ' },
      { kind: 'blank', index: 0 },
      { kind: 'text', text: ' iz ' },
      { kind: 'blank', index: 1 },
      { kind: 'text', text: '.' },
    ]);
  });

  it('handles a blank at the start and no trailing text', () => {
    expect(parseCloze('{{0}} noč')).toEqual([
      { kind: 'blank', index: 0 },
      { kind: 'text', text: ' noč' },
    ]);
  });

  it('returns a single text segment when there is no blank', () => {
    expect(parseCloze('Hvala')).toEqual([{ kind: 'text', text: 'Hvala' }]);
  });
});
