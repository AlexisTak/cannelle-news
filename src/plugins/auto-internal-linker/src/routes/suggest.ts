import { z } from "astro/zod";
import type { PluginContext } from "emdash";
import { isInternalHref } from "../content/link-classifier";
import { collectLinkHrefs, collectLinkableSpans } from "../content/spans";
import { pickWinners } from "../domain/rules/arbitrate";
import type { Suggestion } from "../domain/suggestion";
import { contentItemToEntry, toLinkerEntry } from "../infrastructure/content-loader";
import { createKeywordIndexStore } from "../infrastructure/keyword-index-store";
import { createKvConfigStore } from "../infrastructure/kv-config";
import { scanSpans } from "../matching/scan";
import { selectSuggestions } from "../matching/select";
import { buildTrie } from "../matching/trie";

export const suggestInputSchema = z.object({
	collection: z.string().min(1),
	id: z.string().min(1),
});

export type SuggestInput = z.infer<typeof suggestInputSchema>;

export interface SuggestOutput {
	suggestions: Suggestion[];
	/** Vrai quand l'index ne contient rien : l'UI propose alors de le construire. */
	indexEmpty: boolean;
	analyzedAt: string;
}

/**
 * Suggestions de liens pour l'article demandé.
 *
 * L'analyse porte sur la dernière version **enregistrée** : un widget de champ
 * n'a pas accès au texte en cours de frappe, seulement à l'identifiant de
 * l'entrée. `analyzedAt` remonte donc à l'UI pour qu'elle affiche ce décalage
 * plutôt que de le laisser subir.
 */
export async function suggestRouteHandler(
	input: SuggestInput,
	ctx: PluginContext,
): Promise<SuggestOutput> {
	const analyzedAt = new Date().toISOString();

	const item = await ctx.content?.get(input.collection, input.id);
	if (!item) throw new Error(`Article introuvable : ${input.collection}/${input.id}`);

	const config = await createKvConfigStore(ctx).get();
	const entry = toLinkerEntry(contentItemToEntry(item), input.collection);

	const indexed = await createKeywordIndexStore(ctx).all();
	if (indexed.length === 0) return { suggestions: [], indexEmpty: true, analyzedAt };

	// L'auto-lien est écarté ici, avant le balayage : inutile de chercher des
	// occurrences qu'on rejetterait ensuite.
	const others = indexed.filter((keyword) => keyword.targetId !== entry.id);
	const trie = buildTrie(
		pickWinners(others).map((keyword) => ({ key: keyword.normalized, value: keyword })),
	);

	const occurrences = scanSpans(collectLinkableSpans(entry.body), trie);

	const suggestions = selectSuggestions({
		occurrences,
		existingInternalHrefs: collectLinkHrefs(entry.body).filter((href) =>
			isInternalHref(href, config.siteUrl),
		),
		ignored: entry.fieldValue.ignored,
		maxLinksPerEntry: config.maxLinksPerEntry,
	});

	return { suggestions, indexEmpty: false, analyzedAt };
}
