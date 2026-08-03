import { readFieldValue, type LinkerFieldValue } from "../domain/suggestion";

/** Slug du champ qui porte le widget de suggestions. */
export const LINKER_FIELD = "internal_links";

export interface LinkerEntry {
	id: string;
	collection: string;
	slug: string | null;
	title: string;
	body: unknown[];
	fieldValue: LinkerFieldValue;
}

/**
 * Traduit une entrée EmDash en vocabulaire du plugin.
 *
 * Seule frontière où les noms de champs du CMS (`content`, `internal_links`)
 * apparaissent : au-delà, plus rien ne sait qu'EmDash existe.
 */
export function toLinkerEntry(
	content: Record<string, unknown>,
	collection: string,
): LinkerEntry {
	return {
		id: String(content.id ?? ""),
		collection,
		slug: content.slug ? String(content.slug) : null,
		title: String(content.title ?? ""),
		body: Array.isArray(content.content) ? content.content : [],
		fieldValue: readFieldValue(content[LINKER_FIELD]),
	};
}

/**
 * Aplatit un `ContentItem` en l'objet plat qu'attend `toLinkerEntry`.
 *
 * Les deux sources n'ont pas la même forme : le hook livre un `Record` plat,
 * `ctx.content.get()` rend `{ id, slug, status, data }`. Sans cette fusion,
 * l'identifiant serait perdu à chaque appel de route.
 */
export function contentItemToEntry(item: {
	id: string;
	slug?: string | null;
	status?: string;
	data: Record<string, unknown>;
}): Record<string, unknown> {
	return { ...item.data, id: item.id, slug: item.slug ?? null, status: item.status ?? "draft" };
}
