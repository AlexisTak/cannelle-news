import { describe, expect, it } from "vitest";
import { createMockCtx } from "../../test/mock-ctx";
import { createKeywordIndexStore } from "./keyword-index-store";
import { indexEntry } from "./index-entry";

const content = {
	id: "01J",
	slug: "qu-est-ce-qu-un-llm",
	title: "Qu'est-ce qu'un LLM ?",
	content: [
		{
			_type: "block",
			_key: "b1",
			children: [{ _type: "span", _key: "s1", text: "Un modèle de langue.", marks: [] }],
		},
	],
	internal_links: { version: 1, manualKeywords: ["LLMs"], accepted: [], ignored: [] },
};

describe("indexEntry", () => {
	it("indexe une entrée d'une collection analysée", async () => {
		const { ctx } = createMockCtx({ terms: { "01J": [{ label: "IA" }] } });
		const count = await indexEntry(ctx, content, "posts");

		expect(count).toBeGreaterThan(0);
		const all = await createKeywordIndexStore(ctx).all();
		expect(all.map((k) => k.normalized)).toContain("llms");
		expect(all.map((k) => k.normalized)).toContain("ia");
	});

	it("n'indexe rien pour une collection hors périmètre", async () => {
		const { ctx } = createMockCtx();
		expect(await indexEntry(ctx, content, "pages")).toBe(0);
		expect(await createKeywordIndexStore(ctx).count()).toBe(0);
	});

	it("n'indexe rien pour une entrée sans identifiant", async () => {
		const { ctx } = createMockCtx();
		expect(await indexEntry(ctx, { ...content, id: "" }, "posts")).toBe(0);
	});

	it("n'indexe rien pour une entrée sans slug", async () => {
		const { ctx } = createMockCtx();
		expect(await indexEntry(ctx, { ...content, slug: null }, "posts")).toBe(0);
	});

	it("remplace les entrées précédentes au lieu de les accumuler", async () => {
		const { ctx } = createMockCtx();
		await indexEntry(ctx, content, "posts");
		const first = await createKeywordIndexStore(ctx).count();

		await indexEntry(ctx, content, "posts");
		expect(await createKeywordIndexStore(ctx).count()).toBe(first);
	});

	it("fonctionne sans accès aux taxonomies", async () => {
		const { ctx } = createMockCtx();
		// `ctx.taxonomies` absent : la capacité peut être refusée à l'exécution.
		delete (ctx as unknown as Record<string, unknown>).taxonomies;
		expect(await indexEntry(ctx, content, "posts")).toBeGreaterThan(0);
	});
});
