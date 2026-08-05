import { describe, it, expect } from "vitest";
import { analyzeRouteHandler } from "./analyze";
import { reportRouteHandler } from "./report";
import { createMockCtx } from "../../test/mock-ctx";
import type { PluginContext } from "emdash";

const item = {
	id: "01ENTRY",
	type: "posts",
	slug: "test-article",
	status: "published",
	locale: "fr",
	createdAt: "2026-08-01T00:00:00.000Z",
	updatedAt: "2026-08-01T00:00:00.000Z",
	publishedAt: "2026-08-01T00:00:00.000Z",
	data: {
		title: "Test Article",
		content: [{ _type: "block", children: [{ _type: "span", text: "Ceci est un article. " }] }],
	},
};

function ctxWithContent(overrides: Record<string, unknown> = {}) {
	const { ctx, kv, reports } = createMockCtx(overrides);
	(ctx as unknown as Record<string, unknown>).content = {
		get: async (_collection: string, id: string) => (id === item.id ? item : null),
		list: async () => ({ items: [], hasMore: false }),
	};
	return { ctx: ctx as PluginContext, kv, reports };
}

describe("analyze route", () => {
	it("returns a report for an existing entry", async () => {
		const { ctx } = ctxWithContent();
		const report = await analyzeRouteHandler({ collection: "posts", id: "01ENTRY" }, ctx);
		expect(report.entryId).toBe("01ENTRY");
		expect(report.title).toBe("Test Article");
	});

	it("lifts id, slug and locale out of the ContentItem root", async () => {
		// Le piège que corrige `contentItemToEntry` : ces trois champs ne sont
		// pas dans `.data`, et sans fusion le rapport naîtrait sans identité.
		const { ctx } = ctxWithContent();
		const report = await analyzeRouteHandler({ collection: "posts", id: "01ENTRY" }, ctx);
		expect(report.entryId).toBe("01ENTRY");
		expect(report.locale).toBe("fr");
	});

	it("throws when the entry does not exist", async () => {
		const { ctx } = ctxWithContent();
		await expect(
			analyzeRouteHandler({ collection: "posts", id: "absent" }, ctx),
		).rejects.toThrow("not found");
	});

	it("throws when the content capability is missing", async () => {
		const { ctx } = createMockCtx({ withoutContent: true });
		await expect(
			analyzeRouteHandler({ collection: "posts", id: "01ENTRY" }, ctx),
		).rejects.toThrow("content:read");
	});

	it("uses a stored manual focus keyword", async () => {
		const { ctx } = ctxWithContent({ kv: { "focus:01ENTRY": "article" } });
		const report = await analyzeRouteHandler({ collection: "posts", id: "01ENTRY" }, ctx);
		expect(report.focusKeyword).toBe("article");
		expect(report.focusKeywordSource).toBe("manual");
	});
});

describe("report route", () => {
	it("analyses and stores on first call", async () => {
		const { ctx, reports } = ctxWithContent();
		const report = await reportRouteHandler({ collection: "posts", id: "01ENTRY" }, ctx);
		expect(report.entryId).toBe("01ENTRY");
		expect(reports.get("01ENTRY")).toBeDefined();
	});

	it("serves the cached report on the second call", async () => {
		const { ctx } = ctxWithContent();
		const first = await reportRouteHandler({ collection: "posts", id: "01ENTRY" }, ctx);
		const second = await reportRouteHandler({ collection: "posts", id: "01ENTRY" }, ctx);
		expect(second.analyzedAt).toBe(first.analyzedAt);
	});

	it("recomputes when the stored report came from another engine version", async () => {
		const { ctx, reports } = ctxWithContent();
		const stale = await reportRouteHandler({ collection: "posts", id: "01ENTRY" }, ctx);
		reports.set("01ENTRY", { ...stale, engineVersion: "0.0.1", score: 1 });

		const fresh = await reportRouteHandler({ collection: "posts", id: "01ENTRY" }, ctx);
		expect(fresh.engineVersion).toBe("1.0.0");
		expect(fresh.score).not.toBe(1);
	});
});
