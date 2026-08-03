import { describe, it, expect } from "vitest";
import { focusKeywordRouteHandler, focusKeywordInputSchema } from "./focus-keyword";
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
	publishedAt: null,
	data: {
		title: "Cybersécurité et rédaction",
		content: [
			{
				_type: "block",
				children: [{ _type: "span", text: `${"mot ".repeat(99)}cybersecurite` }],
			},
		],
	},
};

function ctxWithContent(overrides: Record<string, unknown> = {}) {
	const { ctx, kv, reports } = createMockCtx(overrides);
	(ctx as unknown as Record<string, unknown>).content = {
		get: async (_c: string, id: string) => (id === item.id ? item : null),
		list: async () => ({ items: [], hasMore: false }),
	};
	return { ctx: ctx as PluginContext, kv, reports };
}

describe("focus-keyword route", () => {
	it("rejects a keyword longer than 60 chars", () => {
		expect(() =>
			focusKeywordInputSchema.parse({ entryId: "x", collection: "posts", keyword: "a".repeat(61) }),
		).toThrow();
	});

	it("accepts null to clear the keyword", () => {
		const parsed = focusKeywordInputSchema.parse({
			entryId: "x",
			collection: "posts",
			keyword: null,
		});
		expect(parsed.keyword).toBeNull();
	});

	it("stores the keyword and returns a report using it", async () => {
		const { ctx, kv } = ctxWithContent();
		const report = await focusKeywordRouteHandler(
			{ entryId: "01ENTRY", collection: "posts", keyword: "cybersecurite" },
			ctx,
		);
		expect(kv.get("focus:01ENTRY")).toBe("cybersecurite");
		expect(report.focusKeyword).toBe("cybersecurite");
		expect(report.focusKeywordSource).toBe("manual");
		expect(report.metrics.keywordOccurrences).toBe(1);
	});

	it("persists the fresh report", async () => {
		const { ctx, reports } = ctxWithContent();
		await focusKeywordRouteHandler(
			{ entryId: "01ENTRY", collection: "posts", keyword: "cybersecurite" },
			ctx,
		);
		expect(reports.get("01ENTRY")).toMatchObject({ focusKeyword: "cybersecurite" });
	});

	it("clears the stored keyword and falls back to automatic", async () => {
		const { ctx, kv } = ctxWithContent({ kv: { "focus:01ENTRY": "cybersecurite" } });
		const report = await focusKeywordRouteHandler(
			{ entryId: "01ENTRY", collection: "posts", keyword: null },
			ctx,
		);
		expect(kv.has("focus:01ENTRY")).toBe(false);
		expect(report.focusKeywordSource).toBe("auto");
	});
});
