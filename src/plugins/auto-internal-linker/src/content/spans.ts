import {
	isContainerBlock,
	isLinkableBlock,
	linkHrefs,
	linkMarkKeys,
	spanIsLinkable,
} from "../domain/rules/zones";

/**
 * Un span candidat, désigné par la clé de son bloc et son rang.
 *
 * La clé du bloc plutôt que son index : les listes imbriquent des blocs, et un
 * chemin d'index serait fragile à la première réorganisation. La pose du lien
 * (`content/apply-link.ts`) retrouve le bloc par la même clé.
 */
export interface SpanRef {
	blockKey: string;
	spanIndex: number;
	text: string;
}

export function collectLinkableSpans(blocks: unknown[]): SpanRef[] {
	const spans: SpanRef[] = [];

	walkBlocks(blocks, (block) => {
		if (!isLinkableBlock(block)) return;
		const linkKeys = linkMarkKeys(block);
		const children = Array.isArray(block.children) ? block.children : [];

		children.forEach((child, spanIndex) => {
			if (typeof child !== "object" || child === null) return;
			const span = child as Record<string, unknown>;
			if (span._type !== undefined && span._type !== "span") return;
			if (!spanIsLinkable(span, linkKeys)) return;
			spans.push({ blockKey: block._key as string, spanIndex, text: span.text as string });
		});
	});

	return spans;
}

/**
 * Tous les `href` de liens du document.
 *
 * Les liens des intertitres y figurent : ils ne sont pas *modifiables*, mais
 * ils comptent dans le plafond de liens de l'article. Les exclure gonflerait
 * artificiellement le nombre de suggestions permises.
 */
export function collectLinkHrefs(blocks: unknown[]): string[] {
	const hrefs: string[] = [];
	walkBlocks(blocks, (block) => hrefs.push(...linkHrefs(block)));
	return hrefs;
}

/** Retrouve un bloc par sa clé, y compris à l'intérieur d'une liste. */
export function findBlockByKey(blocks: unknown[], key: string): Record<string, unknown> | null {
	let found: Record<string, unknown> | null = null;
	walkBlocks(blocks, (block) => {
		if (found === null && block._key === key) found = block;
	});
	return found;
}

/**
 * Parcourt les blocs, en descendant dans les conteneurs.
 *
 * Une liste porte des blocs dans ses `children`, pas des spans : un balayage
 * du seul premier niveau manquerait tout le contenu des listes à puces, qui
 * est de la prose ordinaire et donc parfaitement liable.
 */
function walkBlocks(blocks: unknown[], visit: (block: Record<string, unknown>) => void): void {
	if (!Array.isArray(blocks)) return;

	for (const node of blocks) {
		if (typeof node !== "object" || node === null) continue;
		const block = node as Record<string, unknown>;

		if (isContainerBlock(block)) {
			walkBlocks(Array.isArray(block.children) ? block.children : [], visit);
			continue;
		}

		visit(block);
	}
}
