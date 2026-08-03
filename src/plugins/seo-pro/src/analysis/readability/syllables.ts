/**
 * Compte les syllabes d'un mot, approximation par groupes de voyelles.
 *
 * Les deux formules de lisibilité ont besoin d'un ratio syllabes/mot ; une
 * approximation suffit puisque le score final est ramené à un palier
 * (bon / acceptable / difficile), pas exploité au dixième près.
 */
export function countSyllables(word: string, lang: "fr" | "en"): number {
	const cleaned = word.toLowerCase().replace(/[^a-zà-ÿ]/g, "");
	if (!cleaned) return 0;

	if (lang === "en") {
		const matches = cleaned.match(/[aeiouy]+/g);
		return matches ? Math.max(1, matches.length) : 1;
	}

	// Français : un groupe de voyelles consécutives vaut une syllabe ;
	// le « e » muet final est retiré.
	const vowels = "aeiouyàáâãäåæèéêëìíîïòóôõöùúûüÿ";
	let count = 0;
	let lastWasVowel = false;
	for (const ch of cleaned) {
		const isVowel = vowels.includes(ch);
		if (isVowel && !lastWasVowel) count++;
		lastWasVowel = isVowel;
	}
	if (cleaned.endsWith("e") && count > 1) count--;
	return Math.max(1, count);
}
