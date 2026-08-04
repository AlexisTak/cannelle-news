import type { PortableTextMarkDef, PortableTextSpan } from "emdash";

/**
 * Une entrée de glossaire.
 *
 * `term` est la forme canonique affichée dans l'infobulle et dans le JSON-LD.
 * `aliases` capturent les déclinaisons courantes (pluriels, acronymes,
 * abréviations) qui pointeront vers la même définition.
 */
export interface GlossaryTerm {
	id: string;
	term: string;
	definition: string;
	fullUrl: string | null;
	aliases: string[];
	createdAt: string;
	updatedAt: string;
}

/**
 * Mark Portable Text créé par le plugin.
 *
 * EmDash supporte les `markDefs` de type arbitraire ; l'éditeur ProseMirror
 * préservera la mark `glossaryTerm` et ses attributs tant que le type est
 * connu (`portable-text-to-prosemirror.ts:404`).
 */
export interface GlossaryMarkDef extends PortableTextMarkDef {
	_type: "glossaryTerm";
	_key: string;
	termId: string;
	term: string;
	definition: string;
	fullUrl: string | null;
}

export interface GlossarySpan extends PortableTextSpan {
	marks?: string[];
}

export interface SaveTermInput {
	id?: string;
	term: string;
	definition: string;
	fullUrl?: string | null;
	aliases?: string[];
}
