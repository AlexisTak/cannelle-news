import { z } from "astro/zod";
import type { PluginContext } from "emdash";
import { createStorageReportStore } from "../infrastructure/storage-report-store";

export const reportsInputSchema = z.object({
	collection: z.string().optional(),
	limit: z.number().min(1).max(100).default(20),
	cursor: z.string().optional(),
	sort: z.enum(["score", "analyzedAt"]).default("score"),
	grade: z.enum(["good", "ok", "poor"]).optional(),
});

export type ReportsInput = z.infer<typeof reportsInputSchema>;

export interface ReportSummary {
	entryId: string;
	collection: string;
	title: string | null;
	score: number;
	grade: string;
	analyzedAt: string;
}

/**
 * Liste paginée pour le dashboard. Ne renvoie qu'un résumé : le rapport complet
 * (métriques, issues) pèse trop pour une liste de plusieurs dizaines de lignes.
 */
export async function reportsRouteHandler(
	input: ReportsInput,
	ctx: PluginContext,
): Promise<{ items: ReportSummary[]; cursor: string | null; hasMore: boolean }> {
	const result = await createStorageReportStore(ctx).query({
		collection: input.collection,
		limit: input.limit,
		cursor: input.cursor,
		sort: input.sort,
	});

	// Le filtre par grade s'applique après la requête : le grade est dérivé du
	// score et n'est pas indexé, donc non filtrable côté stockage.
	const items = input.grade ? result.items.filter((r) => r.grade === input.grade) : result.items;

	return {
		items: items.map((r) => ({
			entryId: r.entryId,
			collection: r.collection,
			title: r.title ?? null,
			score: r.score,
			grade: r.grade,
			analyzedAt: r.analyzedAt,
		})),
		cursor: result.cursor,
		hasMore: result.hasMore,
	};
}
