/**
 * Portable Text → texte plat.
 *
 * `blockToText` et `spanToText` sont exportés parce que `content-loader.ts` en
 * a besoin pour lire le texte d'un intertitre ou d'un lien sans réextraire tout
 * le document — le plan les gardait privés tout en les appelant ailleurs.
 */
export function portableTextToPlainText(blocks: unknown[]): string {
	if (!Array.isArray(blocks)) return "";
	return blocks.map(blockToText).filter(Boolean).join("\n\n");
}

export function blockToText(block: unknown): string {
	if (typeof block !== "object" || block === null) return "";
	const b = block as Record<string, unknown>;

	// Une liste porte ses entrées dans `children`, pas des spans de texte.
	if (b._type === "list") {
		const items = Array.isArray(b.children) ? b.children : [];
		return items.map((item) => blockToText(item)).join("\n");
	}

	const children = Array.isArray(b.children) ? b.children : [];
	return children.map(spanToText).join("");
}

export function spanToText(span: unknown): string {
	if (typeof span === "string") return span;
	if (typeof span !== "object" || span === null) return "";
	const s = span as Record<string, unknown>;
	if (typeof s.text === "string") return s.text;
	return "";
}
