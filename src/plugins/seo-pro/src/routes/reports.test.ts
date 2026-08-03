import { describe, it, expect } from "vitest";
import { reportsRouteHandler, reportsInputSchema } from "./reports";
import { createMockCtx } from "../../test/mock-ctx";
import type { SeoReport } from "../domain/report";

const report = (entryId: string, collection: string, score: number, grade: string): SeoReport =>
	({
		entryId,
		collection,
		title: `Titre ${entryId}`,
		score,
		grade,
		analyzedAt: "2026-08-03T00:00:00.000Z",
	}) as SeoReport;

const seeded = {
	"01A": report("01A", "posts", 40, "poor"),
	"01B": report("01B", "posts", 90, "good"),
	"01C": report("01C", "pages", 70, "ok"),
};

describe("reports route", () => {
	it("applies schema defaults", () => {
		const parsed = reportsInputSchema.parse({});
		expect(parsed.limit).toBe(20);
		expect(parsed.sort).toBe("score");
	});

	it("rejects a limit above the ceiling", () => {
		expect(() => reportsInputSchema.parse({ limit: 500 })).toThrow();
	});

	it("returns summaries sorted by score", async () => {
		const { ctx } = createMockCtx({ reports: seeded });
		const page = await reportsRouteHandler({ limit: 20, sort: "score" }, ctx);
		expect(page.items.map((i) => i.entryId)).toEqual(["01B", "01C", "01A"]);
	});

	it("returns only summary fields, not full reports", async () => {
		const { ctx } = createMockCtx({ reports: seeded });
		const page = await reportsRouteHandler({ limit: 20, sort: "score" }, ctx);
		expect(Object.keys(page.items[0]).sort()).toEqual([
			"analyzedAt",
			"collection",
			"entryId",
			"grade",
			"score",
			"title",
		]);
	});

	it("filters by collection", async () => {
		const { ctx } = createMockCtx({ reports: seeded });
		const page = await reportsRouteHandler({ collection: "posts", limit: 20, sort: "score" }, ctx);
		expect(page.items.map((i) => i.entryId)).toEqual(["01B", "01A"]);
	});

	it("filters by grade", async () => {
		const { ctx } = createMockCtx({ reports: seeded });
		const page = await reportsRouteHandler({ limit: 20, sort: "score", grade: "poor" }, ctx);
		expect(page.items.map((i) => i.entryId)).toEqual(["01A"]);
	});

	it("returns an empty page when nothing is stored", async () => {
		const { ctx } = createMockCtx();
		const page = await reportsRouteHandler({ limit: 20, sort: "score" }, ctx);
		expect(page.items).toEqual([]);
		expect(page.hasMore).toBe(false);
	});
});
