import { describe, expect, it } from "vitest";
import { META_DESCRIPTION_MAX } from "../domain/actions";
import article from "../../test/fixtures/article-ia.json";
import { createMockCtx } from "../../test/mock-ctx";
import { applySeoInputSchema, applySeoRouteHandler } from "./apply-seo";

const ENTRY_ID = article.id;
const entries = { [`posts/${ENTRY_ID}`]: article as never };

describe("apply-seo input schema", () => {
	it("requires at least one field", () => {
		expect(() => applySeoInputSchema.parse({ collection: "posts", id: "x" })).toThrow();
	});

	it("accepts a description alone", () => {
		const parsed = applySeoInputSchema.parse({
			collection: "posts",
			id: "x",
			description: "Une description",
		});
		expect(parsed.description).toBe("Une description");
	});
});

describe("apply-seo route", () => {
	it("writes only the seo key, leaving content fields untouched", async () => {
		const { ctx, updates, entries: store } = createMockCtx({ entries });

		await applySeoRouteHandler(
			{ collection: "posts", id: ENTRY_ID, title: "Nouveau titre SEO" },
			ctx,
		);

		expect(updates[0].data).toEqual({ seo: { title: "Nouveau titre SEO" } });
		// Le titre éditorial de `data` n'a pas bougé : c'est ce qui protège le
		// brouillon non enregistré ouvert dans l'éditeur.
		expect(store.get(`posts/${ENTRY_ID}`)?.data.title).toBe(article.data.title);
	});

	it("re-applies the 155-character limit server-side", async () => {
		const { ctx, updates } = createMockCtx({ entries });

		await applySeoRouteHandler(
			{ collection: "posts", id: ENTRY_ID, description: "phrase ".repeat(40) },
			ctx,
		);

		const seo = (updates[0].data as { seo: { description: string } }).seo;
		expect(seo.description.length).toBeLessThanOrEqual(META_DESCRIPTION_MAX);
	});

	it("writes both fields when both are given", async () => {
		const { ctx, updates } = createMockCtx({ entries });

		await applySeoRouteHandler(
			{ collection: "posts", id: ENTRY_ID, title: "Titre", description: "Description" },
			ctx,
		);

		expect(updates[0].data).toEqual({ seo: { title: "Titre", description: "Description" } });
	});

	it("fails clearly on a missing entry", async () => {
		const { ctx } = createMockCtx({ entries });
		await expect(
			applySeoRouteHandler({ collection: "posts", id: "nope", title: "x" }, ctx),
		).rejects.toThrow(/introuvable/);
	});

	it("fails clearly when content:write is missing", async () => {
		const { ctx } = createMockCtx({ withoutContent: true });
		await expect(
			applySeoRouteHandler({ collection: "posts", id: ENTRY_ID, title: "x" }, ctx),
		).rejects.toThrow(/content:write/);
	});
});
