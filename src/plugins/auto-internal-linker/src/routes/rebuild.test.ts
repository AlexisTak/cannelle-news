import { describe, expect, it } from "vitest";
import { createMockCtx } from "../../test/mock-ctx";
import { createKeywordIndexStore } from "../infrastructure/keyword-index-store";
import { rebuildRouteHandler } from "./rebuild";

function ctxWithArticles() {
	return createMockCtx({
		content: {
			a: { id: "a", slug: "les-llm", data: { title: "Les LLM", content: [], internal_links: null } },
			b: { id: "b", slug: "le-rag", data: { title: "Le RAG", content: [], internal_links: null } },
		},
	});
}

async function runToCompletion(
	ctx: Parameters<typeof rebuildRouteHandler>[1],
	jobId: string,
) {
	let output = await rebuildRouteHandler({ jobId }, ctx);
	while (output.status === "running") output = await rebuildRouteHandler({ jobId }, ctx);
	return output;
}

describe("rebuildRouteHandler", () => {
	it("indexe tous les articles publiés", async () => {
		const { ctx } = ctxWithArticles();
		const output = await runToCompletion(ctx, "job-first");

		expect(output.status).toBe("complete");
		expect(output.entriesProcessed).toBe(2);
		expect(output.keywordsIndexed).toBeGreaterThan(0);
		expect(await createKeywordIndexStore(ctx).count()).toBe(output.keywordsIndexed);
	});

	it("est rejouable sans accumuler de doublons", async () => {
		const { ctx } = ctxWithArticles();
		const first = await runToCompletion(ctx, "job-first");
		const second = await runToCompletion(ctx, "job-second");

		expect(second.keywordsIndexed).toBe(first.keywordsIndexed);
		expect(await createKeywordIndexStore(ctx).count()).toBe(first.keywordsIndexed);
	});

	it("refuse une reconstruction concurrente tant que le bail est actif", async () => {
		const articles = Object.fromEntries(
			Array.from({ length: 6 }, (_, index) => [
				String(index),
				{
					id: String(index),
					slug: `article-${index}`,
					data: { title: `Article ${index}`, content: [], internal_links: null },
				},
			]),
		);
		const { ctx } = createMockCtx({ content: articles });
		const first = await rebuildRouteHandler({ jobId: "job-primary" }, ctx);
		const competing = await rebuildRouteHandler({ jobId: "job-secondary" }, ctx);

		expect(first).toMatchObject({ status: "running", entriesProcessed: 5 });
		expect(competing).toMatchObject({ status: "busy", jobId: "job-primary", entriesProcessed: 5 });
	});

	it("purge par lot les mots-clés des collections retirées", async () => {
		const stale = {
			normalized: "archive", display: "archive", targetId: "old", targetCollection: "pages",
			targetSlug: "old", targetTitle: "Old", targetUrl: "/old", source: "manual", weight: 100,
			updatedAt: "2026-08-05T00:00:00.000Z",
		};
		const { ctx, keywords } = createMockCtx({ kv: { "jobs:staleCollections": ["pages"] }, keywords: { "old:archive": stale } });
		const output = await rebuildRouteHandler({ jobId: "job-cleanup" }, ctx);
		expect(output).toMatchObject({ status: "running", collection: "cleanup:pages" });
		expect(keywords.size).toBe(0);
	});
});
