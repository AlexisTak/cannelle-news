import { normalizeKeyword } from "../matching/normalize";
import { STOPWORDS } from "./stopwords";

export interface KeywordCandidate {
	keyword: string;
	score: number;
}

/**
 * Candidats mots-clés d'un article, pondérés par leur emplacement.
 *
 * Un terme du titre pèse 4, d'un intertitre 2, du corps 1 : la position porte
 * l'intention éditoriale mieux que la fréquence brute, qui favoriserait les
 * mots simplement répétés.
 *
 * Adapté de `seo-pro/src/analysis/keywords/extract.ts`. Recopié plutôt
 * qu'importé : les deux plugins sont indépendants et doivent pouvoir évoluer
 * séparément.
 */
export function extractKeywords(
	plainText: string,
	title: string,
	headings: string[],
	limit = 5,
): KeywordCandidate[] {
	const counts = new Map<string, number>();
	const add = (token: string, weight: number) => {
		counts.set(token, (counts.get(token) ?? 0) + weight);
	};

	const tokenize = (text: string): string[] =>
		normalizeKeyword(text)
			.split(" ")
			.filter((token) => token.length >= 3 && !STOPWORDS.has(token));

	// Expressions de 2 à 3 mots : « intelligence artificielle » vaut mieux que
	// « intelligence » et « artificielle » comptés séparément.
	const ngrams = (tokens: string[], weight: number) => {
		for (let n = 2; n <= 3; n++) {
			for (let i = 0; i + n <= tokens.length; i++) {
				add(tokens.slice(i, i + n).join(" "), weight);
			}
		}
	};

	const bodyTokens = tokenize(plainText);
	const titleTokens = tokenize(title);

	bodyTokens.forEach((token) => add(token, 1));
	titleTokens.forEach((token) => add(token, 4));
	headings.forEach((heading) => tokenize(heading).forEach((token) => add(token, 2)));

	ngrams(bodyTokens, 1);
	ngrams(titleTokens, 4);
	headings.forEach((heading) => ngrams(tokenize(heading), 2));

	return [...counts.entries()]
		.map(([keyword, score]) => ({ keyword, score }))
		.sort((a, b) => b.score - a.score || a.keyword.localeCompare(b.keyword))
		.slice(0, limit);
}
