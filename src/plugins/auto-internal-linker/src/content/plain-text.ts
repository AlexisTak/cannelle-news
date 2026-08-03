/**
 * Portable Text → texte plat, pour l'extraction de mots-clés.
 *
 * Distinct de `content/spans.ts`, qui travaille par span et par offset : ici on
 * ne cherche pas à situer quoi que ce soit, seulement à compter des mots. Les
 * deux parcours ont des besoins assez différents pour ne pas être fusionnés.
 */
export function portableTextToPlainText(blocks: unknown[]): string {
	if (!Array.isArray(blocks)) return "";
	return blocks.map(blockToText).filter(Boolean).join("\n\n");
}

/** Textes des intertitres H2–H4, qui pèsent plus lourd que le corps. */
export function collectHeadings(blocks: unknown[]): string[] {
	if (!Array.isArray(blocks)) return [];
	const headings: string[] = [];

	for (const node of blocks) {
		if (typeof node !== "object" || node === null) continue;
		const block = node as Record<string, unknown>;
		if (typeof block.style !== "string" || !/^h[2-4]$/.test(block.style)) continue;
		const text = blockToText(block);
		if (text) headings.push(text);
	}

	return headings;
}

function blockToText(block: unknown): string {
	if (typeof block !== "object" || block === null) return "";
	const b = block as Record<string, unknown>;

	// Une liste porte des blocs dans ses `children`, pas des spans.
	if (b._type === "list") {
		const items = Array.isArray(b.children) ? b.children : [];
		return items.map(blockToText).join("\n");
	}

	const children = Array.isArray(b.children) ? b.children : [];
	return children
		.map((child) => {
			if (typeof child === "string") return child;
			if (typeof child !== "object" || child === null) return "";
			const span = child as Record<string, unknown>;
			return typeof span.text === "string" ? span.text : "";
		})
		.join("");
}
