export type ClozeSegment = { kind: 'text'; text: string } | { kind: 'blank'; index: number };

const BLANK = /\{\{(\d+)\}\}/g;

/** Fills each blank {{n}} with values[n]: fillBlanks("Jaz {{0}}.", ["sem"]) → "Jaz sem." */
export function fillBlanks(text: string, values: readonly string[]): string {
  return text.replace(BLANK, (_, index) => values[Number(index)] ?? '');
}

/** Splits "Jaz {{0}} iz {{1}}." into text and blank segments. */
export function parseCloze(text: string): ClozeSegment[] {
  const segments: ClozeSegment[] = [];
  let last = 0;
  for (const match of text.matchAll(BLANK)) {
    if (match.index > last) {
      segments.push({ kind: 'text', text: text.slice(last, match.index) });
    }
    segments.push({ kind: 'blank', index: Number(match[1]) });
    last = match.index + match[0].length;
  }
  if (last < text.length) {
    segments.push({ kind: 'text', text: text.slice(last) });
  }
  return segments;
}
