export type ClozeSegment = { kind: 'text'; text: string } | { kind: 'blank'; index: number };

const BLANK = /\{\{(\d+)\}\}/g;

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
