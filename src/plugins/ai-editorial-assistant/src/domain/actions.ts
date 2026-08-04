/**
 * Vocabulaire du domaine : les quatre actions rédactionnelles et la forme
 * d'article qu'elles consomment.
 *
 * Rien ici ne connaît EmDash ni le fournisseur LLM. `AssistantDocument` est
 * une projection volontairement pauvre de l'entrée : titre, texte plat et
 * paragraphes. Tout ce que le modèle n'a pas besoin de voir (images, taxonomies,
 * bylines) est laissé dehors — c'est autant de contexte en moins à payer au
 * token, et autant de champs en moins à faire fuiter vers une API tierce.
 */

export const ACTION_IDS = ["seoTitles", "tldr", "metaDescription", "vulgarize"] as const;

export type ActionId = (typeof ACTION_IDS)[number];

/** Un paragraphe du corps, adressable par son index pour « Vulgariser ». */
export interface Paragraph {
	index: number;
	text: string;
}

export interface AssistantDocument {
	entryId: string;
	collection: string;
	title: string;
	/** Corps Portable Text aplati, blocs séparés par une ligne vide. */
	plainText: string;
	paragraphs: Paragraph[];
	updatedAt: string | null;
}

/** Nombre de titres SEO exigé par le cahier des charges. */
export const SEO_TITLE_COUNT = 5;

/** Nombre de puces du TL;DR. */
export const TLDR_BULLET_COUNT = 3;

/** Longueur maximale d'une meta description, espaces compris. */
export const META_DESCRIPTION_MAX = 155;

/**
 * Résultat d'une action, discriminé par `action`.
 *
 * Un type par action plutôt qu'un `string[]` fourre-tout : le widget qui
 * affiche cinq titres et celui qui affiche trois puces n'ont pas la même UI,
 * et le compilateur doit refuser qu'on les confonde.
 */
export type ActionResult =
	| { action: "seoTitles"; titles: string[] }
	| { action: "tldr"; bullets: string[] }
	| { action: "metaDescription"; description: string }
	| { action: "vulgarize"; text: string; sourceText: string };

export function isActionId(value: unknown): value is ActionId {
	return typeof value === "string" && (ACTION_IDS as readonly string[]).includes(value);
}
