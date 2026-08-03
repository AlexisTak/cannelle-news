import type { PluginContext } from "emdash";
import type { SeoReport } from "../domain/report";
import type { ReportStore } from "../ports/report-store";

export function createStorageReportStore(ctx: PluginContext): ReportStore {
	const reports = ctx.storage.reports;

	return {
		async get(entryId: string): Promise<SeoReport | null> {
			// `StorageCollection.get()` renvoie la donnée elle-même, pas une
			// enveloppe `{ data }` — contrairement à `query()`, qui elle en pose une.
			const result = await reports.get(entryId);
			return (result as SeoReport | null) ?? null;
		},

		async put(report: SeoReport): Promise<void> {
			await reports.put(report.entryId, report);
		},

		async query({ collection, limit, cursor, sort = "score" }) {
			const orderBy: Record<string, "asc" | "desc"> =
				sort === "analyzedAt" ? { analyzedAt: "desc" } : { score: "desc" };
			const result = await reports.query({
				where: collection ? { collection } : undefined,
				orderBy,
				limit,
				cursor,
			});
			return {
				items: result.items.map((i) => (i as { data: SeoReport }).data),
				// `PaginatedResult.cursor` est optionnel ; le port expose `null`.
				cursor: result.cursor ?? null,
				hasMore: result.hasMore,
			};
		},
	};
}
