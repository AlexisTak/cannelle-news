import { describe, it, expect } from "vitest";
import { loadSeoDocument } from "./content-loader";
import { createKvConfigStore } from "./kv-config";
import { createStorageReportStore } from "./storage-report-store";
import { createMockCtx } from "../../test/mock-ctx";
import type { SeoReport } from "../domain/report";

const entry = {
	id: "01ABC",
	slug: "mon-article",
	locale: "fr",
	title: "Mon article",
	metaDescription: "Une description.",
	canonical: "https://cannelle.news/mon-article",
	excerpt: "Un extrait.",
	featured_image: { src: "/hero.jpg", alt: "Héros" },
	content: [
		{ _type: "block", children: [{ text: "Introduction du texte." }] },
		{ _type: "heading", level: 2, children: [{ text: "Première partie" }] },
		{ _type: "heading", level: 3, children: [{ text: "Détail" }] },
		{ _type: "heading", level: 5, children: [{ text: "Trop profond" }] },
		{
			_type: "block",
			children: [
				{ _type: "link", href: "/interne", children: [{ text: "lien interne" }] },
				{ _type: "link", href: "https://ailleurs.com", children: [{ text: "lien externe" }] },
			],
		},
		{ _type: "list", children: [{ _type: "block", children: [{ _type: "image", src: "/dans-liste.jpg", alt: null }] }] },
		{ _type: "image", src: "/corps.jpg", alt: "Corps" },
	],
};

describe("loadSeoDocument", () => {
	it("maps the CMS entry onto the domain shape", async () => {
		const { ctx } = createMockCtx();
		const doc = await loadSeoDocument(ctx, entry, "posts");

		expect(doc.entryId).toBe("01ABC");
		expect(doc.collection).toBe("posts");
		expect(doc.slug).toBe("mon-article");
		expect(doc.title).toBe("Mon article");
		expect(doc.canonical).toBe("https://cannelle.news/mon-article");
		expect(doc.plainText).toContain("Introduction du texte.");
	});

	it("keeps only H2-H4 headings", async () => {
		const { ctx } = createMockCtx();
		const doc = await loadSeoDocument(ctx, entry, "posts");
		expect(doc.headings).toEqual([
			{ level: 2, text: "Première partie" },
			{ level: 3, text: "Détail" },
		]);
	});

	it("reads the style-based headings EmDash actually produces", async () => {
		// Forme réelle observée sur un article du site : un bloc ordinaire
		// portant `style: "h2"`. La forme `_type: "heading"` du plan n'existe pas
		// dans ce CMS — s'y limiter faisait dire « aucun H2 » à un article qui en a.
		const { ctx } = createMockCtx();
		const doc = await loadSeoDocument(
			ctx,
			{
				id: "01Y",
				content: [
					{ _type: "block", style: "normal", children: [{ text: "Texte." }] },
					{ _type: "block", style: "h2", children: [{ text: "What to do next" }] },
					{ _type: "block", style: "h3", children: [{ text: "Sous-partie" }] },
					{ _type: "block", style: "h1", children: [{ text: "Titre de page" }] },
				],
			},
			"posts",
		);
		// H1 exclu : c'est le titre de la page, pas un intertitre de contenu.
		expect(doc.headings).toEqual([
			{ level: 2, text: "What to do next" },
			{ level: 3, text: "Sous-partie" },
		]);
	});

	it("finds links nested inside blocks", async () => {
		const { ctx } = createMockCtx();
		const doc = await loadSeoDocument(ctx, entry, "posts");
		expect(doc.links).toHaveLength(2);
		expect(doc.links.find((l) => l.href === "/interne")!.internal).toBe(true);
		expect(doc.links.find((l) => l.href === "https://ailleurs.com")!.internal).toBe(false);
	});

	it("finds images at any depth and puts the featured one first", async () => {
		const { ctx } = createMockCtx();
		const doc = await loadSeoDocument(ctx, entry, "posts");
		expect(doc.images.map((i) => i.src)).toEqual(["/hero.jpg", "/dans-liste.jpg", "/corps.jpg"]);
		expect(doc.featuredImage).toEqual({ src: "/hero.jpg", alt: "Héros" });
	});

	it("classifies same-host absolute links as internal once siteUrl is set", async () => {
		const { ctx } = createMockCtx({
			kv: { "settings:seoConfig": { siteUrl: "https://cannelle.news" } },
		});
		const withAbsolute = {
			...entry,
			content: [
				{
					_type: "block",
					children: [{ _type: "link", href: "https://cannelle.news/x", children: [{ text: "x" }] }],
				},
			],
		};
		const doc = await loadSeoDocument(ctx, withAbsolute, "posts");
		expect(doc.links[0].internal).toBe(true);
	});

	it("survives an entry with no content at all", async () => {
		const { ctx } = createMockCtx();
		const doc = await loadSeoDocument(ctx, { id: "01X" }, "pages");
		expect(doc.title).toBe("");
		expect(doc.plainText).toBe("");
		expect(doc.headings).toEqual([]);
		expect(doc.images).toEqual([]);
		expect(doc.featuredImage).toBeNull();
	});
});

describe("createKvConfigStore", () => {
	it("returns defaults when nothing is stored", async () => {
		const { ctx } = createMockCtx();
		const config = await createKvConfigStore(ctx).get();
		expect(config.wordsPerMinute).toBe(200);
		expect(config.analyzableCollections).toEqual(["posts", "pages"]);
	});

	it("falls back to the legacy siteUrl setting", async () => {
		const { ctx } = createMockCtx({ kv: { "settings:siteUrl": "https://legacy.example" } });
		const config = await createKvConfigStore(ctx).get();
		expect(config.siteUrl).toBe("https://legacy.example");
	});

	it("merges a partial write over the current config", async () => {
		const { ctx } = createMockCtx();
		const store = createKvConfigStore(ctx);
		await store.set({ wordsPerMinute: 250 });
		const config = await store.get();
		expect(config.wordsPerMinute).toBe(250);
		expect(config.analyzableCollections).toEqual(["posts", "pages"]);
	});
});

describe("createStorageReportStore", () => {
	const report = (entryId: string, collection: string, score: number): SeoReport =>
		({ entryId, collection, score, analyzedAt: "2026-08-03T00:00:00.000Z" }) as SeoReport;

	it("round-trips a report without an enclosing wrapper", async () => {
		const { ctx } = createMockCtx();
		const store = createStorageReportStore(ctx);
		await store.put(report("01A", "posts", 80));
		// La régression que corrige ce fichier : `get()` renvoie la donnée nue,
		// et un `result.data` rendrait `undefined` ici.
		expect(await store.get("01A")).toMatchObject({ entryId: "01A", score: 80 });
	});

	it("returns null for an unknown id", async () => {
		const { ctx } = createMockCtx();
		expect(await createStorageReportStore(ctx).get("nope")).toBeNull();
	});

	it("filters by collection and sorts by score", async () => {
		const { ctx } = createMockCtx();
		const store = createStorageReportStore(ctx);
		await store.put(report("01A", "posts", 40));
		await store.put(report("01B", "posts", 90));
		await store.put(report("01C", "pages", 99));

		const page = await store.query({ collection: "posts", limit: 10 });
		expect(page.items.map((r) => r.entryId)).toEqual(["01B", "01A"]);
		expect(page.cursor).toBeNull();
		expect(page.hasMore).toBe(false);
	});
});
