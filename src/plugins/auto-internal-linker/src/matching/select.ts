import { canLink, createCapState, registerLink } from "../domain/rules/caps";
import type { Occurrence, Suggestion } from "../domain/suggestion";

export interface SelectInput {
	occurrences: Occurrence[];
	/** `href` des liens internes déjà présents dans le corps. */
	existingInternalHrefs: string[];
	/** Formes normalisées refusées par le rédacteur sur cet article. */
	ignored: string[];
	maxLinksPerEntry: number;
}

/**
 * Applique les garde-fous aux occurrences brutes.
 *
 * L'ordre des occurrences est celui du document : le plafond retient donc les
 * premières, celles qui tombent dans le chapeau et les premiers paragraphes.
 * C'est aussi l'ordre le plus utile éditorialement, un lien haut dans la page
 * étant plus suivi qu'un lien en fin d'article.
 *
 * L'auto-lien n'est pas filtré ici : les mots-clés de l'article lui-même sont
 * retirés avant la construction du trie (`routes/suggest.ts`), ce qui évite de
 * balayer pour rejeter ensuite.
 */
export function selectSuggestions(input: SelectInput): Suggestion[] {
	const state = createCapState(input.existingInternalHrefs);
	const ignored = new Set(input.ignored);
	const seen = new Set<string>();
	const suggestions: Suggestion[] = [];

	for (const occurrence of input.occurrences) {
		const { keyword } = occurrence;

		if (ignored.has(keyword.normalized)) continue;
		if (seen.has(keyword.normalized)) continue;
		if (!canLink(state, keyword.targetUrl, input.maxLinksPerEntry)) continue;

		seen.add(keyword.normalized);
		registerLink(state, keyword.targetUrl);

		suggestions.push({
			keyword: keyword.display,
			normalized: keyword.normalized,
			targetId: keyword.targetId,
			targetTitle: keyword.targetTitle,
			targetUrl: keyword.targetUrl,
			blockKey: occurrence.blockKey,
			spanIndex: occurrence.spanIndex,
			start: occurrence.start,
			end: occurrence.end,
			context: occurrence.context,
			source: keyword.source,
		});
	}

	return suggestions;
}
