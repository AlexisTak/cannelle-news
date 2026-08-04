import { z } from "astro/zod";
import type { PluginContext } from "emdash";
import { contentItemToEntry } from "../infrastructure/content-loader";
import { indexEntry } from "../infrastructure/index-entry";
import { createKvConfigStore } from "../infrastructure/kv-config";
import { createKeywordIndexStore } from "../infrastructure/keyword-index-store";

/** Taille de page du balayage des articles. */
const PAGE_SIZE = 50;

/** Nombre d'articles indexés avant de rendre la main à l'évent loop. */
const CHUNK_SIZE = 10;

export const rebuildInputSchema = z.object({});

export type RebuildInput = z.infer<typeof rebuildInputSchema>;

export interface RebuildOutput {
	entriesProcessed: number;
	keywordsIndexed: number;
	orphansPurged: number;
	publishedCount: number;
}

/** Rend temporairement la main à l'évent loop pour éviter de bloquer un Worker. */
function yieldCpu(): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, 0));
}

/**
 * Reconstruit l'index depuis zéro.
 *
 * Sert à deux choses : l'amorçage sur un site déjà rempli, où aucun article
 * publié n'est passé par le hook d'indexation, et le rattrapage après un
 * changement de réglages — activer une source ou changer un motif d'URL rend
 * l'index existant obsolète sans qu'aucun article n'ait bougé.
 *
 * Rejouable : `replaceForTarget` purge avant d'insérer, et une passe finale
 * supprime les entrées orphelines (articles devenus brouillons, corbeille,
 * ou d'une collection désactivée).
 */
export async function rebuildRouteHandler(
	_input: RebuildInput,
	ctx: PluginContext,
): Promise<RebuildOutput> {
	const config = await createKvConfigStore(ctx).get();
	const indexStore = createKeywordIndexStore(ctx);
	const processedIds = new Set<string>();
	let entriesProcessed = 0;
	let keywordsIndexed = 0;
	let publishedCount = 0;

	for (const collection of config.analyzableCollections) {
		let cursor: string | undefined;

		do {
			const page = await ctx.content?.list(collection, {
				where: { status: "published" },
				limit: PAGE_SIZE,
				cursor,
			});
			if (!page) break;
			publishedCount += page.items.length;

			for (let i = 0; i < page.items.length; i += CHUNK_SIZE) {
				const chunk = page.items.slice(i, i + CHUNK_SIZE);
				const counts = await Promise.all(
					chunk.map(async (item) => {
						const entry = contentItemToEntry(item);
						if (entry.id) processedIds.add(String(entry.id));
						return indexEntry(ctx, entry, collection);
					}),
				);

				keywordsIndexed += counts.reduce((sum, c) => sum + c, 0);
				entriesProcessed += chunk.length;

				// Rend la main entre les chunks pour ne pas saturer le CPU/IO.
				if (i + CHUNK_SIZE < page.items.length) {
					await yieldCpu();
				}
			}

			cursor = page.cursor ?? undefined;
		} while (cursor);
	}

	const orphansPurged = await indexStore.purgeOrphans(processedIds);

	ctx.log.info(
		`[auto-internal-linker] index reconstruit : ${entriesProcessed} articles, ${keywordsIndexed} mots-clés, ${orphansPurged} orphelins purgés`,
	);

	return { entriesProcessed, keywordsIndexed, orphansPurged, publishedCount };
}
