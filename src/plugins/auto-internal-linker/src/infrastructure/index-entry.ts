import type { PluginContext } from "emdash";
import { deriveKeywords } from "../indexing/derive-keywords";
import { contentItemToEntry, toLinkerEntry } from "./content-loader";
import { createKeywordIndexStore } from "./keyword-index-store";
import { createKvConfigStore } from "./kv-config";

/**
 * Indexe une entrée. Rend le nombre de mots-clés écrits.
 *
 * Appelée par trois chemins — `content:afterPublish`, `content:afterSave` sur
 * un article déjà publié, et la route `rebuild` — qui convergent ici pour que
 * la règle « ce qui rend un article indexable » n'existe qu'à un seul endroit.
 */
export async function indexEntry(
	ctx: PluginContext,
	content: Record<string, unknown>,
	collection: string,
): Promise<number> {
	const config = await createKvConfigStore(ctx).get();
	if (!config.analyzableCollections.includes(collection)) return 0;

	const entry = toLinkerEntry(content, collection);
	if (!entry.id || !entry.slug) return 0;

	// Les taxonomies sont capacité-dépendantes : si l'accès est refusé à
	// l'exécution, on indexe sans elles plutôt que d'échouer.
	let taxonomyLabels: string[] = [];
	if (ctx.taxonomies) {
		try {
			const terms = await ctx.taxonomies.getEntryTerms(collection, entry.id);
			taxonomyLabels = terms.map((term) => (term as { label?: string }).label).filter(Boolean) as string[];
		} catch (error) {
			ctx.log.warn(`[auto-internal-linker] taxonomies illisibles pour ${entry.id}: ${error}`);
		}
	}

	const keywords = deriveKeywords({
		entryId: entry.id,
		collection,
		slug: entry.slug,
		title: entry.title,
		body: entry.body,
		manualKeywords: entry.fieldValue.manualKeywords,
		taxonomyLabels,
		config,
		now: new Date().toISOString(),
	});

	await createKeywordIndexStore(ctx).replaceForTarget(entry.id, keywords);
	return keywords.length;
}

export { contentItemToEntry };
