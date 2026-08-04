import type { PortableTextBlock, PortableTextMarkDef } from "emdash";
import type { GlossaryMarkDef, GlossaryTerm } from "./types";

/**
 * Détecte les spans portant une mark `glossaryTerm` et retourne les termes
 * uniques associés.
 */
export function collectGlossaryMarks(blocks: PortableTextBlock[]): GlossaryMarkDef[] {
	const seen = new Set<string>();
	const out: GlossaryMarkDef[] = [];

	for (const block of blocks) {
		if (block._type !== "block") continue;
		const markDefs = (block.markDefs ?? []) as PortableTextMarkDef[];
		for (const def of markDefs) {
			if (def._type !== "glossaryTerm") continue;
			if (seen.has(def._key)) continue;
			seen.add(def._key);
			out.push(def as GlossaryMarkDef);
		}
	}

	return out;
}

/**
 * Enrichit les markDefs avec les données courantes du glossaire.
 *
 * Si un terme a été modifié après publication, le contenu affiché doit refléter
 * la dernière définition sans avoir à rouvrir chaque article.
 */
export function hydrateGlossaryMarks(
	blocks: PortableTextBlock[],
	terms: GlossaryTerm[],
): PortableTextBlock[] {
	const termById = new Map(terms.map((t) => [t.id, t]));
	const termByNormalized = new Map(terms.map((t) => [normalize(t.term), t]));

	return blocks.map((block) => {
		if (block._type !== "block" || !block.markDefs) return block;

		const markDefs = (block.markDefs as PortableTextMarkDef[]).map((def) => {
			if (def._type !== "glossaryTerm") return def;
			const mark = def as GlossaryMarkDef;
			const fresh =
				termById.get(mark.termId) ?? termByNormalized.get(normalize(mark.term));
			if (!fresh) return def;
			return {
				...mark,
				term: fresh.term,
				definition: fresh.definition,
				fullUrl: fresh.fullUrl,
			};
		});

		return { ...block, markDefs };
	});
}

function normalize(value: string): string {
	return value
		.toLowerCase()
		.normalize("NFD")
		.replace(/[̀-ͯ]/g, "")
		.trim();
}
