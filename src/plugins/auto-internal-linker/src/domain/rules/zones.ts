/**
 * Là où un lien n'a pas sa place.
 *
 * Trois motifs distincts, qu'on garde séparés parce qu'ils n'ont pas le même
 * statut : l'imbrication de liens est une invalidité technique, l'intertitre
 * et la citation sont des choix éditoriaux, le bloc de code n'est pas de la
 * prose.
 */
const BLOCKED_STYLES = new Set(["h1", "h2", "h3", "h4", "h5", "h6", "blockquote"]);
const BLOCKED_TYPES = new Set(["code", "htmlBlock", "image", "imageBlock", "html"]);

/** Types de blocs dont les `children` sont eux-mêmes des blocs. */
const CONTAINER_TYPES = new Set(["list"]);

export function isContainerBlock(block: Record<string, unknown>): boolean {
	return typeof block._type === "string" && CONTAINER_TYPES.has(block._type);
}

/**
 * Le corps de ce bloc peut-il recevoir un lien ?
 *
 * Un bloc sans `_key` est refusé : la pose du lien retrouve son bloc par clé,
 * et une ancre qu'on ne saurait pas réécrire ne doit pas être proposée.
 */
export function isLinkableBlock(block: Record<string, unknown>): boolean {
	if (typeof block._key !== "string" || block._key === "") return false;
	if (typeof block._type === "string" && BLOCKED_TYPES.has(block._type)) return false;
	if (typeof block.style === "string" && BLOCKED_STYLES.has(block.style)) return false;
	return true;
}

/**
 * Clés des `markDefs` de type lien du bloc.
 *
 * Un span dont les `marks` en contient une est déjà à l'intérieur d'un lien.
 */
export function linkMarkKeys(block: Record<string, unknown>): Set<string> {
	const keys = new Set<string>();
	const defs = Array.isArray(block.markDefs) ? block.markDefs : [];

	for (const def of defs) {
		if (typeof def !== "object" || def === null) continue;
		const d = def as Record<string, unknown>;
		if (d._type === "link" && typeof d._key === "string") keys.add(d._key);
	}

	return keys;
}

/** `href` de tous les liens du bloc, intertitres compris. */
export function linkHrefs(block: Record<string, unknown>): string[] {
	const defs = Array.isArray(block.markDefs) ? block.markDefs : [];
	const hrefs: string[] = [];

	for (const def of defs) {
		if (typeof def !== "object" || def === null) continue;
		const d = def as Record<string, unknown>;
		if (d._type === "link" && typeof d.href === "string" && d.href) hrefs.push(d.href);
	}

	return hrefs;
}

export function spanIsLinkable(span: Record<string, unknown>, linkKeys: Set<string>): boolean {
	if (typeof span.text !== "string" || span.text === "") return false;
	const marks = Array.isArray(span.marks) ? span.marks : [];
	return !marks.some((mark) => typeof mark === "string" && linkKeys.has(mark));
}
