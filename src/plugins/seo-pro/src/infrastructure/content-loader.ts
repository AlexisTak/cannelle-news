import type { PluginContext } from "emdash";
import type { SeoDocument, ImageRef } from "../domain/document";
import { portableTextToPlainText, blockToText, spanToText } from "../content/portable-text";
import { classifyLink } from "../content/link-classifier";
import { createKvConfigStore } from "./kv-config";

/**
 * Traduit une entrée EmDash en `SeoDocument`.
 *
 * C'est la seule frontière où le vocabulaire du CMS (`featured_image`,
 * `content`) rencontre celui du domaine : au-delà, plus rien ne sait qu'EmDash
 * existe.
 */
export async function loadSeoDocument(
	ctx: PluginContext,
	entry: Record<string, unknown>,
	collection: string,
): Promise<SeoDocument> {
	const config = await createKvConfigStore(ctx).get();
	const siteUrl = config.siteUrl ?? undefined;

	const body = Array.isArray(entry.content) ? entry.content : [];
	const images = extractImages(body);

	// L'image mise en avant passe en tête : c'est celle que la règle image-alt
	// doit voir en premier, et elle ne vit pas dans le corps Portable Text.
	const featuredImage = toImageRef(entry.featured_image);
	if (featuredImage) images.unshift(featuredImage);

	return {
		entryId: String(entry.id ?? ""),
		collection,
		slug: entry.slug ? String(entry.slug) : null,
		locale: entry.locale ? String(entry.locale) : null,
		title: String(entry.title ?? ""),
		metaDescription: entry.metaDescription ? String(entry.metaDescription) : null,
		canonical: entry.canonical ? String(entry.canonical) : null,
		excerpt: entry.excerpt ? String(entry.excerpt) : null,
		featuredImage,
		plainText: portableTextToPlainText(body),
		headings: extractHeadings(body),
		links: extractLinks(body, siteUrl),
		images,
	};
}

/**
 * Aplatit un `ContentItem` en l'objet plat qu'attend `loadSeoDocument`.
 *
 * Les deux sources d'entrée n'ont pas la même forme : le hook `content:afterSave`
 * livre un `Record` déjà plat (`ContentHookEvent.content`), alors que
 * `ctx.content.get()` rend un `ContentItem` où `id`, `slug` et `locale` vivent
 * à la racine et le reste sous `.data`. Sans cette fusion, tout rapport produit
 * par une route naîtrait avec un `entryId` vide.
 */
export function contentItemToEntry(item: {
	id: string;
	slug?: string | null;
	locale?: string | null;
	data: Record<string, unknown>;
}): Record<string, unknown> {
	return { ...item.data, id: item.id, slug: item.slug ?? null, locale: item.locale ?? null };
}

function toImageRef(value: unknown): ImageRef | null {
	if (typeof value !== "object" || value === null) return null;
	const img = value as Record<string, unknown>;
	return { src: String(img.src ?? ""), alt: img.alt ? String(img.alt) : null };
}

/**
 * Niveau d'intertitre d'un bloc, ou `null` si ce n'en est pas un.
 *
 * EmDash encode les intertitres comme des blocs ordinaires portant un `style`
 * (`"h2"`, `"h3"`…) — voir `emdash/src/content/converters/types.ts:41`. La
 * forme `{ _type: "heading", level: 2 }` est aussi acceptée : certains
 * convertisseurs d'import la produisent, et l'ignorer coûterait un faux
 * « aucun H2 » sur du contenu migré.
 */
function headingLevel(b: Record<string, unknown>): 2 | 3 | 4 | null {
	if (typeof b.style === "string") {
		const match = /^h([2-4])$/.exec(b.style);
		if (match) return Number(match[1]) as 2 | 3 | 4;
	}
	if (b._type === "heading" && typeof b.level === "number" && b.level >= 2 && b.level <= 4) {
		return b.level as 2 | 3 | 4;
	}
	return null;
}

function extractHeadings(blocks: unknown[]): SeoDocument["headings"] {
	const headings: SeoDocument["headings"] = [];
	for (const block of blocks) {
		if (typeof block !== "object" || block === null) continue;
		const level = headingLevel(block as Record<string, unknown>);
		if (level === null) continue;
		const text = blockToText(block);
		if (text) headings.push({ level, text });
	}
	return headings;
}

function extractLinks(blocks: unknown[], siteUrl?: string): SeoDocument["links"] {
	const links: SeoDocument["links"] = [];
	for (const block of blocks) collect(block, (n) => {
		if (n._type === "link" && typeof n.href === "string") {
			const text = Array.isArray(n.children) ? n.children.map(spanToText).join("") : "";
			links.push({ href: n.href, text, internal: classifyLink(n.href, siteUrl) });
		}
	});
	return links;
}

function extractImages(blocks: unknown[]): ImageRef[] {
	const images: ImageRef[] = [];
	for (const block of blocks) collect(block, (n) => {
		if (n._type === "image" || n._type === "imageBlock") {
			images.push({ src: typeof n.src === "string" ? n.src : "", alt: n.alt ? String(n.alt) : null });
		}
	});
	return images;
}

/**
 * Parcours récursif générique de l'arbre Portable Text.
 *
 * Liens et images peuvent être imbriqués à n'importe quelle profondeur (dans
 * une liste, une citation, un bloc personnalisé) : un balayage du seul premier
 * niveau en manquerait la majorité.
 */
function collect(node: unknown, visit: (node: Record<string, unknown>) => void): void {
	if (typeof node !== "object" || node === null) return;
	if (Array.isArray(node)) {
		node.forEach((child) => collect(child, visit));
		return;
	}
	const n = node as Record<string, unknown>;
	visit(n);
	for (const key of Object.keys(n)) collect(n[key], visit);
}
