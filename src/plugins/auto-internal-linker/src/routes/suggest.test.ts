import { describe, expect, it } from "vitest";
import { createMockCtx } from "../../test/mock-ctx";
import { createKeywordIndexStore } from "../infrastructure/keyword-index-store";
import { suggestRouteHandler } from "./suggest";

const target = {
	normalized: "llm",
	display: "LLM",
	targetId: "cible",
	targetCollection: "posts",
	targetSlug: "qu-est-ce-qu-un-llm",
	targetTitle: "Qu'est-ce qu'un LLM ?",
	targetUrl: "/posts/qu-est-ce-qu-un-llm",
	source: "manual" as const,
	weight: 100,
	updatedAt: "2026-08-01T00:00:00.000Z",
};

function ctxWith(text: string, extra: Record<string, unknown> = {}) {
	return createMockCtx({
		content: {
			"01J": {
				id: "01J",
				slug: "mon-article",
				data: {
					title: "Mon article",
					content: [
						{
							_type: "block",
							_key: "b1",
							children: [{ _type: "span", _key: "s1", text, marks: [] }],
						},
					],
					...extra,
				},
			},
		},
	});
}

describe("suggestRouteHandler", () => {
	it("propose un lien sur un mot-clé indexé", async () => {
		const { ctx } = ctxWith("Un LLM récent");
		await createKeywordIndexStore(ctx).replaceForTarget("cible", [target]);

		const output = await suggestRouteHandler({ collection: "posts", id: "01J" }, ctx);

		expect(output.indexEmpty).toBe(false);
		expect(output.suggestions).toHaveLength(1);
		expect(output.suggestions[0]).toMatchObject({
			keyword: "LLM",
			targetTitle: "Qu'est-ce qu'un LLM ?",
			targetUrl: "/posts/qu-est-ce-qu-un-llm",
		});
	});

	it("signale un index vide au lieu de rendre une liste muette", async () => {
		const { ctx } = ctxWith("Un LLM récent");
		const output = await suggestRouteHandler({ collection: "posts", id: "01J" }, ctx);

		expect(output.indexEmpty).toBe(true);
		expect(output.suggestions).toEqual([]);
	});

	it("ne propose jamais un lien d'un article vers lui-même", async () => {
		const { ctx } = ctxWith("Un LLM récent");
		await createKeywordIndexStore(ctx).replaceForTarget("01J", [
			{ ...target, targetId: "01J" },
		]);

		const output = await suggestRouteHandler({ collection: "posts", id: "01J" }, ctx);
		expect(output.suggestions).toEqual([]);
	});

	it("respecte les mots-clés ignorés par le rédacteur", async () => {
		const { ctx } = ctxWith("Un LLM récent", {
			internal_links: { version: 1, manualKeywords: [], accepted: [], ignored: ["llm"] },
		});
		await createKeywordIndexStore(ctx).replaceForTarget("cible", [target]);

		const output = await suggestRouteHandler({ collection: "posts", id: "01J" }, ctx);
		expect(output.suggestions).toEqual([]);
	});

	it("jette un message lisible pour un article introuvable", async () => {
		const { ctx } = ctxWith("Un LLM récent");
		await expect(
			suggestRouteHandler({ collection: "posts", id: "absent" }, ctx),
		).rejects.toThrow(/introuvable/i);
	});

	it("horodate l'analyse pour que l'UI puisse afficher sa fraîcheur", async () => {
		const { ctx } = ctxWith("Un LLM récent");
		const output = await suggestRouteHandler({ collection: "posts", id: "01J" }, ctx);
		expect(Number.isNaN(Date.parse(output.analyzedAt))).toBe(false);
	});
});
