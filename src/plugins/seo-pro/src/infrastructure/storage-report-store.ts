import type { PluginContext } from "emdash";
import type { Grade, SeoReport } from "../domain/report";
import type { ReportStore } from "../ports/report-store";

function scoreRangeForGrade(grade: Grade): { gte: number; lte: number } {
	switch (grade) {
		case "good":
			return { gte: 80, lte: 100 };
		case "ok":
			return { gte: 60, lte: 79 };
		case "poor":
			return { gte: 0, lte: 59 };
	}
}

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

		async delete(entryId: string): Promise<boolean> {
			return reports.delete(entryId);
		},

		async query({ collection, grade, limit, cursor, sort = "score" }) {
			const orderBy: Record<string, "asc" | "desc"> =
				sort === "analyzedAt" ? { analyzedAt: "desc" } : { score: "desc" };
			type QueryOpts = NonNullable<Parameters<typeof reports.query>[0]>;
			const where: NonNullable<QueryOpts["where"]> = {};
			if (collection) where.collection = collection;
			if (grade) where.score = scoreRangeForGrade(grade) as NonNullable<QueryOpts["where"]>[string];
			const result = await reports.query({
				where: Object.keys(where).length > 0 ? where : undefined,
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
