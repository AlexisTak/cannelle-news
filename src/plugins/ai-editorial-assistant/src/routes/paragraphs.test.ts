import { describe, expect, it } from "vitest";
import article from "../../test/fixtures/article-ia.json";
import { createMockCtx } from "../../test/mock-ctx";
import { paragraphsRouteHandler } from "./paragraphs";

const ENTRY_ID = article.id;
const entries = { [`posts/${ENTRY_ID}`]: article as never };

describe("paragraphs route", () => {
	it("lists only vulgarizable paragraphs", async () => {
		const { ctx } = createMockCtx({ entries });
		const output = await paragraphsRouteHandler({ collection: "posts", id: ENTRY_ID }, ctx);

		expect(output.items.length).toBeGreaterThan(0);
		expect(output.items.some((item) => item.preview.includes("Comment ça marche"))).toBe(false);
	});

	it("returns a preview, not the full text", async () => {
		const { ctx } = createMockCtx({ entries });
		const output = await paragraphsRouteHandler({ collection: "posts", id: ENTRY_ID }, ctx);

		for (const item of output.items) {
			expect(item.preview.length).toBeLessThanOrEqual(141);
			// `chars` renseigne la longueur réelle même quand l'aperçu est coupé.
			expect(item.chars).toBeGreaterThanOrEqual(item.preview.length - 1);
		}
	});

	it("exposes the block index used by the generate route", async () => {
		const { ctx } = createMockCtx({ entries });
		const output = await paragraphsRouteHandler({ collection: "posts", id: ENTRY_ID }, ctx);

		expect(output.items.map((item) => item.index)).toContain(2);
	});

	it("reports the analysed version", async () => {
		const { ctx } = createMockCtx({ entries });
		const output = await paragraphsRouteHandler({ collection: "posts", id: ENTRY_ID }, ctx);

		expect(output.updatedAt).toBe("2026-08-03T09:12:00.000Z");
	});
});
