/** Minutes de lecture, plancher à 1 : « 0 min » n'a pas de sens à l'affichage. */
export function calculateReadingTime(wordCount: number, wpm = 200): number {
	return Math.max(1, Math.ceil(wordCount / wpm));
}
