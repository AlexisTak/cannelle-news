import { z } from "astro/zod";
import type { PluginContext } from "emdash";

export const missingMetaInputSchema = z.object({
	cursor: z.string().max(500).optional(),
	limit: z.number().int().min(1).max(50).default(50),
}).strict();

export interface MissingMetaInput { cursor?: string; limit?: number }

export interface MissingMetaOutput {
	collections: string[];
	articlesChecked: number;
	withoutTldr: number;
	withoutMetaDescription: number;
	withoutSeoTitle: number;
	cursor?: string;
	hasMore: boolean;
	items: Array<{
		collection: string;
		id: string;
		title: string;
		missingTldr: boolean;
		missingMetaDescription: boolean;
		missingSeoTitle: boolean;
	}>;
}

/**
 * Collections scannées par défaut pour le widget de santé éditoriale.
 *
 * Le seed EmDash place les champs `tldr` et `ai_assistant` sur `posts` ;
 * `pages` ne les'a pas, mais il a souvent un besoin SEO comparable.
 */
const DEFAULT_COLLECTIONS = ["posts"];

/** Taille de page pour le balayage des articles publiés. */
const PAGE_SIZE = 50;

/**
 * Liste les articles publiés qui n'ont pas de TL;DR, de meta description ou de
 * titre SEO.
 *
 * La meta description et le titre SEO peuvent vivre soit dans les champs de
 * contenu (`metaDescription`, `title`), soit dans le panneau SEO natif
 * (`seo.description`, `seo.title`). Un article est considéré comme couvert
 * dès qu'une de ces deux sources est renseignée.
 */
export async function missingMetaRouteHandler(
	_input: MissingMetaInput,
	ctx: PluginContext,
): Promise<MissingMetaOutput> {
	if (!ctx.content) {
		throw new Error("ai-editorial-assistant: la capability content:read n'est pas accordée");
	}

	const result: MissingMetaOutput = {
		collections: [...DEFAULT_COLLECTIONS],
		articlesChecked: 0,
		withoutTldr: 0,
		withoutMetaDescription: 0,
		withoutSeoTitle: 0,
		hasMore: false,
		items: [],
	};

	for (const collection of DEFAULT_COLLECTIONS) {
			const page = await ctx.content.list(collection, {
				where: { status: "published" },
				limit: Math.min(PAGE_SIZE, _input.limit ?? PAGE_SIZE),
				cursor: _input.cursor,
			});
			if (!page) break;

			for (const item of page.items) {
				const data = (item.data ?? {}) as Record<string, unknown>;
				const seo = (item.seo ?? {}) as Record<string, unknown>;

				const title =
					typeof data.title === "string" && data.title.trim()
						? data.title.trim()
						: typeof seo.title === "string" && seo.title.trim()
							? seo.title.trim()
							: "";

				const hasTldr =
					Array.isArray(data.tldr) && data.tldr.some((b) => typeof b === "string" && b.trim());

				const hasMetaDescription =
					(typeof data.metaDescription === "string" && data.metaDescription.trim() !== "") ||
					(typeof seo.description === "string" && seo.description.trim() !== "");

				const hasSeoTitle =
					(typeof data.title === "string" && data.title.trim() !== "") ||
					(typeof seo.title === "string" && seo.title.trim() !== "");

				result.articlesChecked++;
				if (!hasTldr) result.withoutTldr++;
				if (!hasMetaDescription) result.withoutMetaDescription++;
				if (!hasSeoTitle) result.withoutSeoTitle++;

				if (!hasTldr || !hasMetaDescription || !hasSeoTitle) {
					result.items.push({
						collection,
						id: item.id,
						title,
						missingTldr: !hasTldr,
						missingMetaDescription: !hasMetaDescription,
						missingSeoTitle: !hasSeoTitle,
					});
				}
			}

			result.cursor = page.cursor ?? undefined;
			result.hasMore = page.hasMore;
	}

	ctx.log.info(
		`[ai-editorial-assistant] audit meta : ${result.articlesChecked} articles, ${result.withoutTldr} sans TL;DR, ${result.withoutMetaDescription} sans meta description`,
	);

	return result;
}
