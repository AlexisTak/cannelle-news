import type { ReadabilityInput } from "./formula";

/**
 * Kandel & Moles (1958) — adaptation française de Flesch.
 *
 * Les constantes diffèrent de l'anglais (207 / 73.6 contre 206.835 / 84.6)
 * parce que le français utilise des mots plus longs à difficulté égale :
 * appliquer Flesch tel quel pénaliserait tout texte français.
 */
export function kandelMolesFr(input: ReadabilityInput): number {
	if (input.sentenceCount === 0 || input.wordCount === 0) return 0;
	const wordsPerSentence = input.wordCount / input.sentenceCount;
	const syllablesPerWord = input.syllableCount / input.wordCount;
	return 207 - 1.015 * wordsPerSentence - 73.6 * syllablesPerWord;
}
