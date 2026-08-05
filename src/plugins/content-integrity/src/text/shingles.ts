import { fnv1a32 } from "../fingerprint/hash";

export interface Shingle { hash: number; startWord: number; endWord: number }

export function createShingles(words: string[], width = 6): Shingle[] {
	if (width < 1 || words.length < width) return [];
	return Array.from({ length: words.length - width + 1 }, (_, startWord) => ({
		hash: fnv1a32(words.slice(startWord, startWord + width).join("\u001f")),
		startWord,
		endWord: startWord + width,
	}));
}
