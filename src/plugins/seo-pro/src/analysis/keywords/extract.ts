import { normalizeToken } from "./normalize";
import { stopwordsFr } from "./stopwords.fr";
import { stopwordsEn } from "./stopwords.en";

export interface KeywordCandidate {
	keyword: string;
	score: number;
}

/**
 * Candidats mots-clés, pondérés par leur emplacement.
 *
 * Un terme du titre pèse 4, d'un intertitre 2, du corps 1 : la position porte
 * l'intention éditoriale mieux que la fréquence brute, qui favoriserait les
 * mots simplement répétés. Les listes de mots vides des deux langues sont
 * fusionnées — un article français cite souvent des termes anglais.
 */
export function extractKeywords(
	plainText: string,
	title: string,
	headings: string[],
	limit = 5,
): KeywordCandidate[] {
	const allStopwords = new Set([...stopwordsFr, ...stopwordsEn]);

	function tokens(text: string): string[] {
		return text
			.split(/\s+/)
			.map(normalizeToken)
			.filter((t) => t.length >= 3 && !allStopwords.has(t));
	}

	const counts = new Map<string, number>();
	const add = (token: string, weight: number) => {
		counts.set(token, (counts.get(token) ?? 0) + weight);
	};

	tokens(plainText).forEach((t) => add(t, 1));
	tokens(title).forEach((t) => add(t, 4));
	headings.forEach((h) => tokens(h).forEach((t) => add(t, 2)));

	// Expressions de 2 à 3 mots : « intelligence artificielle » vaut mieux que
	// « intelligence » et « artificielle » comptés séparément.
	function ngrams(source: string[], weight: number) {
		for (let n = 2; n <= 3; n++) {
			for (let i = 0; i <= source.length - n; i++) {
				const gram = source.slice(i, i + n).join(" ");
				if (gram.includes("'") || gram.includes("-")) continue;
				const parts = gram.split(/\s+/).filter((p) => !allStopwords.has(p));
				if (parts.length >= 2) add(gram, weight);
			}
		}
	}

	ngrams(tokens(plainText), 1);
	ngrams(tokens(title), 4);
	headings.forEach((h) => ngrams(tokens(h), 2));

	return Array.from(counts.entries())
		.map(([keyword, score]) => ({ keyword, score }))
		.sort((a, b) => b.score - a.score)
		.slice(0, limit);
}
