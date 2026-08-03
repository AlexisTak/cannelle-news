import { collectHeadings, portableTextToPlainText } from "../content/plain-text";
import { buildTargetUrl, type LinkerConfig } from "../domain/config";
import {
	AUTOMATIC_SOURCES,
	SOURCE_WEIGHTS,
	type IndexedKeyword,
	type KeywordSource,
} from "../domain/keyword-entry";
import { normalizeKeyword } from "../matching/normalize";
import { extractKeywords } from "./extract";
import { titleVariants } from "./variants";

/** Nombre de candidats retenus par l'extraction automatique. */
const EXTRACTED_LIMIT = 5;

export interface DeriveInput {
	entryId: string;
	collection: string;
	slug: string | null;
	title: string;
	body: unknown[];
	manualKeywords: string[];
	taxonomyLabels: string[];
	config: LinkerConfig;
	/** Horodatage injecté pour que les tests soient déterministes. */
	now: string;
}

/**
 * Tous les mots-clés qui devront pointer vers cet article.
 *
 * Les quatre sources cohabitent par poids, pas par exclusion : un terme issu
 * de deux sources ne produit qu'une entrée, celle de la source la plus lourde.
 * Sans cette déduplication, le même mot-clé apparaîtrait plusieurs fois dans
 * l'index et le trie n'en garderait qu'un au hasard de l'ordre d'insertion.
 */
export function deriveKeywords(input: DeriveInput): IndexedKeyword[] {
	const targetUrl = buildTargetUrl(input.collection, input.slug, input.config.urlPatterns);
	// Un article sans URL publique ne peut être la cible d'aucun lien.
	if (!targetUrl) return [];

	const best = new Map<string, { display: string; source: KeywordSource }>();

	const offer = (raw: string, source: KeywordSource) => {
		if (!input.config.sources[source]) return;

		const normalized = normalizeKeyword(raw);
		if (!normalized) return;
		if (
			AUTOMATIC_SOURCES.includes(source) &&
			normalized.length < input.config.minKeywordLength
		) {
			return;
		}

		const current = best.get(normalized);
		if (current && SOURCE_WEIGHTS[current.source] >= SOURCE_WEIGHTS[source]) return;
		best.set(normalized, { display: raw.trim(), source });
	};

	// Ordre décroissant d'autorité : le premier passage gagne à poids égal.
	input.manualKeywords.forEach((keyword) => offer(keyword, "manual"));
	titleVariants(input.title).forEach((variant) => offer(variant, "title"));
	input.taxonomyLabels.forEach((label) => offer(label, "taxonomy"));

	if (input.config.sources.extracted) {
		const plainText = portableTextToPlainText(input.body);
		const headings = collectHeadings(input.body);
		extractKeywords(plainText, input.title, headings, EXTRACTED_LIMIT).forEach((candidate) =>			offer(candidate.keyword, "extracted"),
		);
	}

	return [...best.entries()].map(([normalized, { display, source }]) => ({
		normalized,
		display,
		targetId: input.entryId,
		targetCollection: input.collection,
		targetSlug: input.slug as string,
		targetTitle: input.title,
		targetUrl,
		source,
		weight: SOURCE_WEIGHTS[source],
		updatedAt: input.now,
	}));
}
