import { z } from "astro/zod";
import type { PluginContext } from "emdash";
import type { SeoReport } from "../domain/report";
import { analyzeRouteHandler, focusKey } from "./analyze";
import { createStorageReportStore } from "../infrastructure/storage-report-store";

export const focusKeywordInputSchema = z.object({
	entryId: z.string(),
	collection: z.string(),
	keyword: z.string().max(60).nullable(),
});

export type FocusKeywordInput = z.infer<typeof focusKeywordInputSchema>;

/**
 * Fixe (ou efface) le mot-clé cible, puis réanalyse dans la foulée.
 *
 * Réanalyser immédiatement est le point de la route : changer le focus sans
 * rafraîchir laisserait le rédacteur devant un score calculé sur l'ancien mot.
 */
export async function focusKeywordRouteHandler(
	input: FocusKeywordInput,
	ctx: PluginContext,
): Promise<SeoReport> {
	if (input.keyword === null) {
		await ctx.kv.delete(focusKey(input.entryId));
	} else {
		await ctx.kv.set(focusKey(input.entryId), input.keyword);
	}

	const report = await analyzeRouteHandler(
		{ collection: input.collection, id: input.entryId },
		ctx,
	);
	await createStorageReportStore(ctx).put(report);
	return report;
}
