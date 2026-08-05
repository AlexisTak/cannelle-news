import { describe, expect, it } from "vitest";
import { generateMeta } from "./generate-meta";
import type { SeoDocument } from "../domain/document";

const baseDoc: SeoDocument = {
	entryId: "1",
	collection: "posts",
	slug: "test-article",
	locale: null,
	title: "Comment fonctionne un transformeur",
	metaDescription: null,
	canonical: null,
	excerpt: "Les transformeurs sont au cœur de l'IA générative moderne et révolutionnent le traitement du langage.",
	featuredImage: { src: "/image.jpg", alt: "Transformer" },
	plainText: "Les transformeurs sont au cœur de l'IA générative moderne.",
	headings: [],
	links: [],
	images: [],
};

const baseConfig = { siteUrl: "https://cannelle.news", analyzableCollections: ["posts"], wordsPerMinute: 200, engineVersion: "1.0.0", rules: {} };

describe("generateMeta", () => {
	it("keeps a title inside the ideal range", () => {
		const result = generateMeta(baseDoc, baseConfig);
		expect(result.title.length).toBeGreaterThanOrEqual(30);
		expect(result.title.length).toBeLessThanOrEqual(60);
	});

	it("truncates a long title at a word boundary", () => {
		const doc = { ...baseDoc, title: "Un titre extrêmement long qui dépasse largement la limite idéale de soixante caractères pour un title SEO" };
		const result = generateMeta(doc, baseConfig);
		expect(result.title.length).toBeLessThanOrEqual(60);
		expect(result.title).not.toMatch(/\s$/);
	});

	it("includes the focus keyword in the title when absent", () => {
		const result = generateMeta(baseDoc, baseConfig, "transformer");
		expect(result.title.toLowerCase()).toContain("transformer");
	});

	it("generates a description within the limit", () => {
		const result = generateMeta(baseDoc, baseConfig);
		expect(result.description.length).toBeLessThanOrEqual(155);
	});

	it("prefers excerpt over plain text", () => {
		const result = generateMeta(baseDoc, baseConfig);
		expect(result.description).toContain("transformeurs");
	});

	it("prefixes the focus keyword in the description when absent", () => {
		const doc = { ...baseDoc, excerpt: "Cette architecture change tout." };
		const result = generateMeta(doc, baseConfig, "transformer");
		expect(result.description.toLowerCase().startsWith("transformer")).toBe(true);
	});

	it("builds OpenGraph and Twitter cards from the generated values", () => {
		const result = generateMeta(baseDoc, baseConfig);
		expect(result.openGraph.title).toBe(result.title);
		expect(result.openGraph.description).toBe(result.description);
		expect(result.openGraph.type).toBe("article");
		expect(result.openGraph.url).toBe("https://cannelle.news/test-article");
		expect(result.openGraph.image).toBe("/image.jpg");
		expect(result.twitter.card).toBe("summary_large_image");
	});

	it("falls back to summary card when no image", () => {
		const doc = { ...baseDoc, featuredImage: null };
		const result = generateMeta(doc, baseConfig);
		expect(result.twitter.card).toBe("summary");
		expect(result.openGraph.image).toBeNull();
	});
});
