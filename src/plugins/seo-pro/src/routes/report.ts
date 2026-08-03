import { z } from "astro/zod";
import type { PluginContext } from "emdash";
import type { SeoReport } from "../domain/report";
import { createStorageReportStore } from "../infrastructure/storage-report-store";
import { createKvConfigStore } from "../infrastructure/kv-config";
import { analyzeRouteHandler } from "./analyze";

export const reportInputSchema = z.object({
	id: z.string(),
	collection: z.string(),
});

export type ReportInput = z.infer<typeof reportInputSchema>;

/**
 * Rapport d'une entrée, recalculé si nécessaire.
 *
 * La comparaison `engineVersion` est ce qui rend une évolution des règles
 * visible : un rapport produit par une version antérieure est périmé même si
 * le contenu n'a pas bougé, sinon le dashboard mélangerait des scores issus de
 * barèmes différents.
 */
export async function reportRouteHandler(
	input: ReportInput,
	ctx: PluginContext,
): Promise<SeoReport> {
	const store = createStorageReportStore(ctx);
	const config = await createKvConfigStore(ctx).get();
	const existing = await store.get(input.id);

	if (existing && existing.engineVersion === config.engineVersion) return existing;

	const report = await analyzeRouteHandler({ collection: input.collection, id: input.id }, ctx);
	await store.put(report);
	return report;
}
