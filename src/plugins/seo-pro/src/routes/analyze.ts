import { z } from "astro/zod";
import type { PluginContext } from "emdash";
import type { SeoReport } from "../domain/report";
import { analyze } from "../analysis/analyze";
import { createKvConfigStore } from "../infrastructure/kv-config";
import { loadSeoDocument, contentItemToEntry } from "../infrastructure/content-loader";

export const analyzeInputSchema = z.object({
	collection: z.string(),
	id: z.string(),
});

export type AnalyzeInput = z.infer<typeof analyzeInputSchema>;

/** Clé KV du focus manuel d'une entrée. Partagée avec `focus-keyword.ts`. */
export function focusKey(entryId: string): string {
	return `focus:${entryId}`;
}

export async function analyzeRouteHandler(
	input: AnalyzeInput,
	ctx: PluginContext,
): Promise<SeoReport> {
	// `ctx.content` n'existe que si la capacité `content:read` est accordée.
	// Sans ce garde, un plugin mal déclaré planterait sur `undefined.get`.
	if (!ctx.content) throw new Error("seo-pro: content:read capability is not granted");

	const item = await ctx.content.get(input.collection, input.id);
	if (!item) throw new Error(`seo-pro: entry ${input.collection}/${input.id} not found`);

	const config = await createKvConfigStore(ctx).get();
	const manualFocus = await ctx.kv.get<string | null>(focusKey(input.id));
	const doc = await loadSeoDocument(ctx, contentItemToEntry(item), input.collection);

	return analyze(doc, config, manualFocus ?? undefined, config.engineVersion);
}
