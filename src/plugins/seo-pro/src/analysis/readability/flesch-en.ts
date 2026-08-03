import type { ReadabilityInput } from "./formula";

/** Flesch Reading Ease (1948), formule anglaise de référence. */
export function fleschEn(input: ReadabilityInput): number {
	if (input.sentenceCount === 0 || input.wordCount === 0) return 0;
	const wordsPerSentence = input.wordCount / input.sentenceCount;
	const syllablesPerWord = input.syllableCount / input.wordCount;
	return 206.835 - 1.015 * wordsPerSentence - 84.6 * syllablesPerWord;
}
