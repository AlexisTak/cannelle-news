import { z } from "astro/zod";
import type { PluginContext } from "emdash";
import { contentItemToEntry } from "../infrastructure/content-loader";
import { indexEntry } from "../infrastructure/index-entry";
import { createKvConfigStore } from "../infrastructure/kv-config";

/** Taille de page du balayage des articles. */
const PAGE_SIZE = 50;

export const rebuildInputSchema = z.object({});

export type RebuildInput = z.infer<typeof rebuildInputSchema>;

export interface RebuildOutput {
	entriesProcessed: number;
	keywordsIndexed: number;
}

/**
 * Reconstruit l'index depuis zéro.
 *
 * Sert à deux choses : l'amorçage sur un site déjà rempli, où aucun article
 * publié n'est passé par le hook d'indexation, et le rattrapage après un
 * changement de réglages — activer une source ou changer un motif d'URL rend
 * l'index existant obsolète sans qu'aucun article n'ait bougé.
 *
 * Rejouable : `replaceForTarget` purge avant d'insérer.
 */
export async function rebuildRouteHandler(
	_input: RebuildInput,
	ctx: PluginContext,
): Promise<RebuildOutput> {
	const config = await createKvConfigStore(ctx).get();
	let entriesProcessed = 0;
	let keywordsIndexed = 0;

	for (const collection of config.analyzableCollections) {
		let cursor: string | undefined;

		do {
			const page = await ctx.content?.list(collection, {
				where: { status: "published" },
				limit: PAGE_SIZE,
				cursor,
			});
			if (!page) break;

			for (const item of page.items) {
				keywordsIndexed += await indexEntry(ctx, contentItemToEntry(item), collection);
				entriesProcessed++;
			}

			cursor = page.cursor ?? undefined;
		} while (cursor);
	}

	ctx.log.info(
		`[auto-internal-linker] index reconstruit : ${entriesProcessed} articles, ${keywordsIndexed} mots-clés`,
	);

	return { entriesProcessed, keywordsIndexed };
}
