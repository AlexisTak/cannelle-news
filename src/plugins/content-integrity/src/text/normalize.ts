// Curly/straight apostrophes are intentionally *not* in PUNCT — they must stay
// inside a word so the per-word `replace(APOSTROPHES, "")` step can merge
// `l’eau` into `leau` rather than splitting it into two tokens.
const PUNCT = /[‐-―“”„‟‵.,;:!?()\[\]{}«»"`~@#$%^&*+=<>/\\|_-]/g;
const APOSTROPHES = /['’‘‚‛′]/g;
const DIACRITICS = /\p{Diacritic}/gu;

export interface NormalizedDoc {
  words: string[];
  /** For each word, byte offset into the **original** input string. */
  offsets: Uint32Array;
  /** Reserved: spans of quoted text. Populated in `quotes.ts`. */
  quoteSpans: Array<[number, number]>;
}

export function normalize(input: string): NormalizedDoc {
  if (input.length === 0) {
    return { words: [], offsets: new Uint32Array(0), quoteSpans: [] };
  }

  const words: string[] = [];
  const offsets: number[] = [];

  let i = 0;
  while (i < input.length) {
    const ch = input[i];
    if (/\s/.test(ch)) {
      i++;
      continue;
    }
    if (PUNCT.test(ch)) {
      i++;
      PUNCT.lastIndex = 0;
      continue;
    }

    const start = i;
    while (i < input.length) {
      const c = input[i];
      if (/\s/.test(c) || PUNCT.test(c)) {
        PUNCT.lastIndex = 0;
        break;
      }
      i++;
    }

    const raw = input.slice(start, i);
    const cleaned = raw
      .replace(APOSTROPHES, "")
      .normalize("NFD")
      .replace(DIACRITICS, "")
      .toLowerCase();

    if (cleaned.length > 0) {
      words.push(cleaned);
      offsets.push(start);
    }
  }

  return {
    words,
    offsets: new Uint32Array(offsets),
    quoteSpans: [],
  };
}
