import type { IndexedKeyword, KeywordSource } from "./keyword-entry";

/** Une correspondance repérée dans le corps, en offsets **bruts**. */
export interface Occurrence {
	blockKey: string;
	spanIndex: number;
	start: number;
	end: number;
	/** Texte brut exact de l'occurrence — c'est lui qui deviendra l'ancre. */
	text: string;
	keyword: IndexedKeyword;
	context: string;
}

/** Une proposition affichable, survivante des garde-fous. */
export interface Suggestion {
	keyword: string;
	normalized: string;
	targetId: string;
	targetTitle: string;
	targetUrl: string;
	blockKey: string;
	spanIndex: number;
	start: number;
	end: number;
	context: string;
	source: KeywordSource;
}

export interface AcceptedLink {
	keyword: string;
	targetId: string;
	targetUrl: string;
}

/**
 * Valeur du champ `internal_links`.
 *
 * `version` existe pour qu'une évolution de la forme soit migrable en lecture
 * sans casser les articles déjà enregistrés.
 */
export interface LinkerFieldValue {
	version: 1;
	manualKeywords: string[];
	accepted: AcceptedLink[];
	ignored: string[];
}

export const EMPTY_FIELD_VALUE: LinkerFieldValue = {
	version: 1,
	manualKeywords: [],
	accepted: [],
	ignored: [],
};

/**
 * Lecture défensive de la valeur du champ.
 *
 * Elle vient d'un champ `json` libre : elle peut être `null` sur un article
 * antérieur au plugin, ou tordue par une édition manuelle. Toute valeur
 * inattendue retombe sur la forme vide plutôt que de faire échouer un
 * enregistrement — voir la contrainte globale « ne jamais empêcher d'écrire ».
 */
export function readFieldValue(raw: unknown): LinkerFieldValue {
	if (typeof raw !== "object" || raw === null) return EMPTY_FIELD_VALUE;
	const v = raw as Record<string, unknown>;

	return {
		version: 1,
		manualKeywords: stringArray(v.manualKeywords),
		ignored: stringArray(v.ignored),
		accepted: Array.isArray(v.accepted)
			? v.accepted.flatMap((item) => {
					if (typeof item !== "object" || item === null) return [];
					const a = item as Record<string, unknown>;
					if (typeof a.keyword !== "string" || typeof a.targetId !== "string") return [];
					if (typeof a.targetUrl !== "string") return [];
					return [{ keyword: a.keyword, targetId: a.targetId, targetUrl: a.targetUrl }];
				})
			: [],
	};
}

function stringArray(value: unknown): string[] {
	if (!Array.isArray(value)) return [];
	return value.filter((item): item is string => typeof item === "string" && item.trim() !== "");
}
