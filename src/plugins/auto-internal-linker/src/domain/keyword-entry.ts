/**
 * Un mot-clé indexé : le lien entre un terme et l'article qu'il désigne.
 *
 * `normalized` est la forme comparable (minuscules, sans accents) sur laquelle
 * porte toute la recherche ; `display` est la forme montrée au rédacteur. Les
 * deux sont conservées parce qu'un index ne servant qu'à comparer produirait
 * des suggestions illisibles (« qu'est-ce qu'un llm »).
 */
export type KeywordSource = "manual" | "title" | "taxonomy" | "extracted";

/**
 * Poids par source, du plus explicite au plus dérivé.
 *
 * Un mot-clé saisi à la main l'emporte sur un titre, qui l'emporte sur un tag
 * partagé, qui l'emporte sur une extraction statistique. C'est l'ordre de
 * l'intention éditoriale, pas celui de la fréquence.
 */
export const SOURCE_WEIGHTS: Record<KeywordSource, number> = {
	manual: 100,
	title: 80,
	taxonomy: 50,
	extracted: 20,
};

/**
 * Sources produites par la machine, seules soumises à `minKeywordLength`.
 *
 * `manual` et `taxonomy` en sont exemptées : « IA » est un sigle légitime sur
 * ce site, et un rédacteur qui saisit deux caractères sait ce qu'il fait.
 */
export const AUTOMATIC_SOURCES: readonly KeywordSource[] = ["title", "extracted"];

export interface IndexedKeyword {
	normalized: string;
	display: string;
	targetId: string;
	targetCollection: string;
	targetSlug: string;
	targetTitle: string;
	targetUrl: string;
	source: KeywordSource;
	weight: number;
	updatedAt: string;
}

/**
 * Identifiant de document du stockage.
 *
 * Déterministe à partir de la cible et du terme : réindexer un article écrase
 * ses propres entrées au lieu d'en accumuler des doublons.
 */
export function keywordDocId(targetId: string, normalized: string): string {
	return `${targetId}:${normalized}`;
}
