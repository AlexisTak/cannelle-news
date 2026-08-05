import { describe, expect, it } from "vitest";
import { createMockCtx } from "../../test/mock-ctx";
import type { IndexedKeyword } from "../domain/keyword-entry";
import { createKeywordIndexStore } from "./keyword-index-store";

function keyword(normalized: string, targetId: string): IndexedKeyword {
	return {
		normalized,
		display: normalized,
		targetId,
		targetCollection: "posts",
		targetSlug: targetId,
		targetTitle: `Article ${targetId}`,
		targetUrl: `/posts/${targetId}`,
		source: "manual",
		weight: 100,
		updatedAt: "2026-08-04T00:00:00.000Z",
	};
}

describe("createKeywordIndexStore", () => {
	it("écrit une entrée par mot-clé", async () => {
		const { ctx, keywords } = createMockCtx();
		await createKeywordIndexStore(ctx).replaceForTarget("a", [
			keyword("llm", "a"),
			keyword("rag", "a"),
		]);
		expect(keywords.size).toBe(2);
		expect(keywords.has("a:llm")).toBe(true);
	});

	it("purge les anciennes entrées avant d'insérer les nouvelles", async () => {
		const { ctx, keywords } = createMockCtx();
		const store = createKeywordIndexStore(ctx);

		await store.replaceForTarget("a", [keyword("llm", "a"), keyword("rag", "a")]);
		await store.replaceForTarget("a", [keyword("llm", "a")]);

		expect([...keywords.keys()]).toEqual(["a:llm"]);
	});

	it("ne touche pas aux entrées des autres articles", async () => {
		const { ctx, keywords } = createMockCtx();
		const store = createKeywordIndexStore(ctx);

		await store.replaceForTarget("a", [keyword("llm", "a")]);
		await store.replaceForTarget("b", [keyword("rag", "b")]);
		await store.purgeTarget("a");

		expect([...keywords.keys()]).toEqual(["b:rag"]);
	});

	it("rend le nombre d'entrées purgées", async () => {
		const { ctx } = createMockCtx();
		const store = createKeywordIndexStore(ctx);
		await store.replaceForTarget("a", [keyword("llm", "a"), keyword("rag", "a")]);
		expect(await store.purgeTarget("a")).toBe(2);
	});

	it("rend toutes les entrées, toutes cibles confondues", async () => {
		const { ctx } = createMockCtx();
		const store = createKeywordIndexStore(ctx);
		await store.replaceForTarget("a", [keyword("llm", "a")]);
		await store.replaceForTarget("b", [keyword("rag", "b")]);

		const all = await store.all();
		expect(all.map((k) => k.normalized).sort()).toEqual(["llm", "rag"]);
	});

	it("pagine la lecture complète", async () => {
		const { ctx } = createMockCtx();
		const store = createKeywordIndexStore(ctx);
		const many = Array.from({ length: 250 }, (_, i) => keyword(`kw${i}`, "a"));
		await store.replaceForTarget("a", many);

		expect(await store.count()).toBe(250);
		expect(await store.all()).toHaveLength(250);
	});

	it("met en cache les lectures puis invalide le cache à l'écriture", async () => {
		const { ctx, keywords, kv } = createMockCtx();
		const store = createKeywordIndexStore(ctx);
		await store.replaceForTarget("a", [keyword("llm", "a")]);
		expect(await store.all()).toHaveLength(1);
		expect(kv.has("cache:keyword-index:v1")).toBe(true);

		keywords.set("external:stale", keyword("stale", "external"));
		expect(await store.all()).toHaveLength(1);

		await store.replaceForTarget("b", [keyword("rag", "b")]);
		expect(kv.has("cache:keyword-index:v1")).toBe(false);
		expect((await store.all()).map((item) => item.normalized).sort()).toEqual(["llm", "rag", "stale"]);
	});
});
