import { describe, expect, it } from "vitest";
import { createMockCtx } from "../../test/mock-ctx";
import { createKeywordIndexStore } from "../infrastructure/keyword-index-store";
import { rebuildRouteHandler } from "./rebuild";

function ctxWithArticles() {
	return createMockCtx({
		content: {
			a: {
				id: "a",
				slug: "les-llm",
				data: { title: "Les LLM", content: [], internal_links: null },
			},
			b: {
				id: "b",
				slug: "le-rag",
				data: { title: "Le RAG", content: [], internal_links: null },
			},
		},
	});
}

describe("rebuildRouteHandler", () => {
	it("indexe tous les articles publiés", async () => {
		const { ctx } = ctxWithArticles();
		const output = await rebuildRouteHandler({}, ctx);

		expect(output.entriesProcessed).toBe(2);
		expect(output.keywordsIndexed).toBeGreaterThan(0);
		expect(await createKeywordIndexStore(ctx).count()).toBe(output.keywordsIndexed);
	});

	it("est rejouable sans accumuler de doublons", async () => {
		const { ctx } = ctxWithArticles();
		const first = await rebuildRouteHandler({}, ctx);
		const second = await rebuildRouteHandler({}, ctx);

		expect(second.keywordsIndexed).toBe(first.keywordsIndexed);
		expect(await createKeywordIndexStore(ctx).count()).toBe(first.keywordsIndexed);
	});
});
