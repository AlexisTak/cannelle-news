import { findBlockByKey } from "./spans";

export interface LinkPlacement {
	blockKey: string;
	spanIndex: number;
	start: number;
	end: number;
	href: string;
}

/**
 * Clé d'un `markDef`, unique dans le document.
 *
 * `crypto.randomUUID()` est disponible dans les Workers comme dans Node : pas
 * d'import de `node:crypto`, interdit par les contraintes du dépôt. Le
 * paramètre reste injectable pour que les tests soient déterministes.
 */
function defaultMakeKey(): string {
	return `l-${crypto.randomUUID().slice(0, 8)}`;
}

/**
 * Pose les liens demandés et rend un nouvel arbre.
 *
 * Ne modifie jamais les blocs reçus : ce sont ceux qui partent en base au
 * moment de l'enregistrement, et une mutation en place rendrait tout échec
 * partiel irrécupérable.
 *
 * Une pose dont le bloc ou le span a disparu est ignorée en silence — c'est le
 * cas normal quand le rédacteur a réécrit le paragraphe entre la suggestion et
 * l'enregistrement, et une ancre posée à côté de son contexte serait pire que
 * pas d'ancre du tout.
 */
export function applyLinks(
	blocks: unknown[],
	placements: LinkPlacement[],
	makeKey: (index: number) => string = defaultMakeKey,
): unknown[] {
	if (placements.length === 0) return blocks;

	const clone = structuredClone(blocks) as unknown[];

	// Groupées par bloc puis par span, appliquées par offsets décroissants :
	// commencer par la gauche décalerait tous les offsets restants.
	const byTarget = new Map<string, LinkPlacement[]>();
	placements.forEach((placement) => {
		const key = `${placement.blockKey}\x00${placement.spanIndex}`;
		const list = byTarget.get(key);
		if (list) list.push(placement);
		else byTarget.set(key, [placement]);
	});

	let keyIndex = 0;

	for (const group of byTarget.values()) {
		const sorted = [...group].sort((a, b) => b.start - a.start);
		const { blockKey, spanIndex } = sorted[0];

		const block = findBlockByKey(clone, blockKey);
		if (!block) continue;

		const children = Array.isArray(block.children) ? block.children : null;
		if (!children) continue;

		const span = children[spanIndex];
		if (typeof span !== "object" || span === null) continue;
		const original = span as Record<string, unknown>;
		if (typeof original.text !== "string") continue;

		const markDefs = Array.isArray(block.markDefs) ? [...block.markDefs] : [];
		let pieces: Array<Record<string, unknown>> = [original];

		for (const placement of sorted) {
			const linkKey = makeKey(keyIndex++);
			// Les offsets sont traités de droite à gauche : chaque nouvelle
			// cible se trouve dans le morceau le plus à gauche, celui qui n'a
			// pas encore été découpé. Découper par la droite d'abord préserve
			// les offsets des cibles restantes à gauche.
			const tail = pieces[0];
			const split = splitSpan(tail, placement, linkKey);
			if (!split) {
				keyIndex--;
				continue;
			}
			markDefs.push({ _type: "link", _key: linkKey, href: placement.href });
			pieces = [...split, ...pieces.slice(1)];
		}

		block.markDefs = markDefs;
		block.children = [...children.slice(0, spanIndex), ...pieces, ...children.slice(spanIndex + 1)];
	}

	return clone;
}

/**
 * Découpe un span en avant / ancre / après.
 *
 * Les morceaux vides sont omis : un terme en tête de span ne doit pas laisser
 * un span de texte vide, que l'éditeur afficherait comme un artefact.
 * Les `marks` d'origine sont reportés partout, sinon un gras englobant le
 * terme sauterait au passage.
 */
function splitSpan(
	span: Record<string, unknown>,
	placement: LinkPlacement,
	linkKey: string,
): Array<Record<string, unknown>> | null {
	const text = span.text as string;
	if (placement.start < 0 || placement.end > text.length || placement.start >= placement.end) {
		return null;
	}

	const marks = Array.isArray(span.marks) ? (span.marks as string[]) : [];
	const baseKey = typeof span._key === "string" ? span._key : "s";
	const pieces: Array<Record<string, unknown>> = [];

	const before = text.slice(0, placement.start);
	if (before) pieces.push({ ...span, _key: baseKey, text: before, marks: [...marks] });

	pieces.push({
		...span,
		_key: `${baseKey}-${linkKey}`,
		text: text.slice(placement.start, placement.end),
		marks: [...marks, linkKey],
	});

	const after = text.slice(placement.end);
	if (after) {
		pieces.push({ ...span, _key: `${baseKey}-${linkKey}-after`, text: after, marks: [...marks] });
	}

	return pieces;
}
