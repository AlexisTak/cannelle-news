import type { SpanRef } from "../content/spans";
import type { IndexedKeyword } from "../domain/keyword-entry";
import type { Occurrence } from "../domain/suggestion";
import { normalizeWithOffsets } from "./normalize";
import { scanTrie, type Trie } from "./trie";

/** Caractères montrés de part et d'autre du terme dans l'aperçu. */
export const CONTEXT_RADIUS = 60;

/**
 * Repère les mots-clés dans les spans liables.
 *
 * Chaque span est normalisé indépendamment : un mot-clé ne peut donc pas
 * chevaucher deux spans. C'est une limite assumée — un terme coupé en deux par
 * une mise en gras partielle ne sera pas repéré — et c'est le prix à payer
 * pour que chaque ancre reste posable dans un seul span, sans réécriture de la
 * structure du bloc.
 */
export function scanSpans(spans: SpanRef[], trie: Trie<IndexedKeyword>): Occurrence[] {
	const occurrences: Occurrence[] = [];

	for (const span of spans) {
		const { normalized, map } = normalizeWithOffsets(span.text);

		for (const match of scanTrie(normalized, trie)) {
			const start = map[match.start];
			const end = map[match.end];

			occurrences.push({
				blockKey: span.blockKey,
				spanIndex: span.spanIndex,
				start,
				end,
				text: span.text.slice(start, end),
				keyword: match.value,
				context: extractContext(span.text, start, end),
			});
		}
	}

	return occurrences;
}

/**
 * Aperçu du terme dans son voisinage.
 *
 * Le rédacteur juge une suggestion sur le contexte, pas sur le seul mot : sans
 * cet extrait, « Créer un lien sur "modèle" » ne lui dit ni de quel modèle il
 * s'agit ni où le lien atterrira.
 */
export function extractContext(
	raw: string,
	start: number,
	end: number,
	radius = CONTEXT_RADIUS,
): string {
	const from = Math.max(0, start - radius);
	const to = Math.min(raw.length, end + radius);
	const prefix = from > 0 ? "…" : "";
	const suffix = to < raw.length ? "…" : "";
	return `${prefix}${raw.slice(from, to)}${suffix}`;
}
