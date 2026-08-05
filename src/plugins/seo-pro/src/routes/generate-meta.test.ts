import { describe, expect, it } from "vitest";
import { createMockCtx } from "../../test/mock-ctx";
import { generateMetaRouteHandler } from "./generate-meta";

const entry = {
	id: "01GEN",
	slug: "article-test",
	data: {
		title: "Comment fonctionne un transformeur",
		excerpt: "Les transformeurs sont au cœur de l'IA générative moderne et révolutionnent le traitement du langage.",
		featured_image: { src: "/image.jpg", alt: "Transformer" },
		content: [
			{ _type: "block", style: "normal", children: [{ text: "Corps de l'article." }] },
		],
	},
};

describe("generate-meta route", () => {
	it("returns generated title, description and social cards", async () => {
		const { ctx } = createMockCtx({
			entries: { "posts/01GEN": entry as never },
			kv: { "settings:siteUrl": "https://cannelle.news" },
		});

		const output = await generateMetaRouteHandler({ collection: "posts", id: "01GEN" }, ctx);

		expect(output.generated.title).toBeTruthy();
		expect(output.generated.description).toBeTruthy();
		expect(output.generated.openGraph.type).toBe("article");
		expect(output.generated.openGraph.url).toBe("https://cannelle.news/article-test");
		expect(output.generated.openGraph.image).toBe("/image.jpg");
		expect(output.generated.twitter.card).toBe("summary_large_image");
	});

	it("throws when the entry is not found", async () => {
		const { ctx } = createMockCtx();

		await expect(
			generateMetaRouteHandler({ collection: "posts", id: "01GEN" }, ctx),
		).rejects.toThrow("introuvable");
	});
});
