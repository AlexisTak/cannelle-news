import type { KeywordSource } from "./keyword-entry";

export interface LinkerConfig {
	/** Collections dont les articles sont analysés *et* indexés. */
	analyzableCollections: string[];
	maxLinksPerEntry: number;
	minKeywordLength: number;
	sources: Record<KeywordSource, boolean>;
	/** Motif d'URL publique par collection, `{slug}` interpolé. */
	urlPatterns: Record<string, string>;
	/** Origine du site, pour classer les liens déjà posés. */
	siteUrl: string | null;
}

export const DEFAULT_CONFIG: LinkerConfig = {
	analyzableCollections: ["posts"],
	maxLinksPerEntry: 5,
	minKeywordLength: 3,
	sources: { manual: true, title: true, taxonomy: true, extracted: true },
	urlPatterns: { posts: "/posts/{slug}", pages: "/{slug}" },
	siteUrl: null,
};

/**
 * Fusion des réglages stockés avec les défauts.
 *
 * `sources` et `urlPatterns` sont fusionnés champ à champ : sans cela,
 * enregistrer un seul motif d'URL effacerait tous les autres.
 */
export function mergeConfig(partial: Partial<LinkerConfig>): LinkerConfig {
	return {
		...DEFAULT_CONFIG,
		...partial,
		sources: { ...DEFAULT_CONFIG.sources, ...(partial.sources ?? {}) },
		urlPatterns: { ...DEFAULT_CONFIG.urlPatterns, ...(partial.urlPatterns ?? {}) },
	};
}

/**
 * URL publique d'un article, ou `null` s'il n'en a pas.
 *
 * Un article sans slug, ou d'une collection sans motif déclaré, n'est pas
 * indexable : on ne saurait pas vers quoi pointer.
 */
export function buildTargetUrl(
	collection: string,
	slug: string | null,
	patterns: Record<string, string>,
): string | null {
	if (!slug) return null;
	const pattern = patterns[collection];
	if (!pattern) return null;
	return pattern.replace("{slug}", slug);
}
