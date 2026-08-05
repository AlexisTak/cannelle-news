import { describe, expect, it } from "vitest";
import { keywordDocId } from "../../src/domain/keyword-entry";
import { auditRouteHandler } from "../../src/routes/audit";
import { createMockCtx } from "../mock-ctx";

function bodyWithLink(href: string) {
	return [
		{
			_type: "block",
			children: [
				{
					_type: "span",
					text: "Voir aussi",
					marks: ["link1"],
				},
			],
			markDefs: [{ _type: "link", _key: "link1", href }],
		},
	];
}

function keywordDoc(
	targetId: string,
	normalized: string,
	slug: string,
	overrides: Record<string, unknown> = {},
) {
	return {
		[keywordDocId(targetId, normalized)]: {
			normalized,
			display: normalized,
			targetId,
			targetCollection: "posts",
			targetSlug: slug,
			targetTitle: `Article ${targetId}`,
			targetUrl: `/posts/${slug}`,
			source: "title",
			weight: 80,
			updatedAt: new Date().toISOString(),
			...overrides,
		},
	};
}

const POSTS = {
	postA: { id: "postA", slug: "article-a", data: { title: "Article A", content: bodyWithLink("/posts/article-b") } },
	postB: { id: "postB", slug: "article-b", data: { title: "Article B", content: bodyWithLink("/posts/article-a") } },
	postC: { id: "postC", slug: "article-c", data: { title: "Article C", content: [{ _type: "block", children: [{ _type: "span", text: "Isolated" }] }] } },
};

describe("auditRouteHandler", () => {
	it("returns empty audit when no analyzable content", async () => {
		const { ctx } = createMockCtx({
			kv: {
				"settings:linkerConfig": {
					analyzableCollections: ["posts"],
					maxLinksPerEntry: 3,
					minKeywordLength: 3,
					sources: { manual: true, title: true, taxonomy: true, extracted: true },
					urlPatterns: {},
					siteUrl: "https://example.com",
				},
			},
		});

		const result = await auditRouteHandler({ threshold: { incoming: 1, outgoing: 1 } }, ctx);

		expect(result.summary.total).toBe(0);
		expect(result.items).toEqual([]);
		expect(result.hasMore).toBe(false);
	});

	it("classifies linked articles as ok", async () => {
		const { ctx } = createMockCtx({
			kv: {
				"settings:linkerConfig": {
					analyzableCollections: ["posts"],
					maxLinksPerEntry: 3,
					minKeywordLength: 3,
					sources: { manual: true, title: true, taxonomy: true, extracted: true },
					urlPatterns: {},
					siteUrl: "https://example.com",
				},
			},
			content: POSTS,
			keywords: {
				...keywordDoc("postA", "article a", "article-a"),
				...keywordDoc("postB", "article b", "article-b"),
				...keywordDoc("postC", "article c", "article-c"),
			},
		});

		const result = await auditRouteHandler({ threshold: { incoming: 1, outgoing: 1 } }, ctx);

		expect(result.summary.total).toBe(3);
		expect(result.summary.orphanCount).toBe(1);
		expect(result.summary.poorlyLinkedCount).toBe(0);
		expect(result.summary.unlinkedCount).toBe(1);
		expect(result.summary.zeroIncoming).toBe(1);
		expect(result.summary.zeroOutgoing).toBe(1);

		const orphan = result.items.find((i) => i.id === "postC");
		expect(orphan?.status).toBe("orphan");
		expect(orphan?.incomingCount).toBe(0);
		expect(orphan?.outgoingCount).toBe(0);
	});

	it("handles absolute internal URLs", async () => {
		const { ctx } = createMockCtx({
			kv: {
				"settings:linkerConfig": {
					analyzableCollections: ["posts"],
					maxLinksPerEntry: 3,
					minKeywordLength: 3,
					sources: { manual: true, title: true, taxonomy: true, extracted: true },
					urlPatterns: {},
					siteUrl: "https://example.com",
				},
			},
			content: {
				postX: { id: "postX", slug: "x", data: { title: "X", content: bodyWithLink("https://example.com/posts/y") } },
				postY: { id: "postY", slug: "y", data: { title: "Y", content: bodyWithLink("https://example.com/posts/x") } },
			},
			keywords: {
				...keywordDoc("postX", "x", "x"),
				...keywordDoc("postY", "y", "y"),
			},
		});

		const result = await auditRouteHandler({ threshold: { incoming: 1, outgoing: 1 } }, ctx);

		expect(result.summary.total).toBe(2);
		expect(result.summary.orphanCount).toBe(0);
		expect(result.items.every((i) => i.status === "ok")).toBe(true);
	});

	it("ignores external links and self-links", async () => {
		const { ctx } = createMockCtx({
			kv: {
				"settings:linkerConfig": {
					analyzableCollections: ["posts"],
					maxLinksPerEntry: 3,
					minKeywordLength: 3,
					sources: { manual: true, title: true, taxonomy: true, extracted: true },
					urlPatterns: {},
					siteUrl: "https://example.com",
				},
			},
			content: {
				postSolo: {
					id: "postSolo",
					slug: "solo",
					data: { title: "Solo", content: bodyWithLink("https://external.com/solo") },
				},
				postSelf: {
					id: "postSelf",
					slug: "self",
					data: { title: "Self", content: bodyWithLink("/posts/self") },
				},
			},
			keywords: {
				...keywordDoc("postSolo", "solo", "solo"),
				...keywordDoc("postSelf", "self", "self"),
			},
		});

		const result = await auditRouteHandler({ threshold: { incoming: 1, outgoing: 1 } }, ctx);

		expect(result.summary.total).toBe(2);
		expect(result.summary.orphanCount).toBe(2);
		expect(result.items.every((i) => i.incomingCount === 0 && i.outgoingCount === 0)).toBe(true);
	});

	it("respects configurable thresholds", async () => {
		const { ctx } = createMockCtx({
			kv: {
				"settings:linkerConfig": {
					analyzableCollections: ["posts"],
					maxLinksPerEntry: 3,
					minKeywordLength: 3,
					sources: { manual: true, title: true, taxonomy: true, extracted: true },
					urlPatterns: {},
					siteUrl: "https://example.com",
				},
			},
			content: POSTS,
			keywords: {
				...keywordDoc("postA", "article a", "article-a"),
				...keywordDoc("postB", "article b", "article-b"),
				...keywordDoc("postC", "article c", "article-c"),
			},
		});

		const result = await auditRouteHandler({ threshold: { incoming: 2, outgoing: 1 } }, ctx);

		expect(result.summary.total).toBe(3);
		// Avec un seuil de 2 liens entrants mais 1 sortant, A et B n'ont pas assez
		// d'entrants mais assez de sortants : ils deviennent "poorly-linked".
		// C n'a ni l'un ni l'autre : il reste orphelin.
		expect(result.summary.orphanCount).toBe(1);
		expect(result.summary.poorlyLinkedCount).toBe(2);
	});

	it("paginates results with cursor", async () => {
		const { ctx } = createMockCtx({
			kv: {
				"settings:linkerConfig": {
					analyzableCollections: ["posts"],
					maxLinksPerEntry: 3,
					minKeywordLength: 3,
					sources: { manual: true, title: true, taxonomy: true, extracted: true },
					urlPatterns: {},
					siteUrl: "https://example.com",
				},
			},
			content: POSTS,
			keywords: {
				...keywordDoc("postA", "article a", "article-a"),
				...keywordDoc("postB", "article b", "article-b"),
				...keywordDoc("postC", "article c", "article-c"),
			},
		});

		const first = await auditRouteHandler(
			{ threshold: { incoming: 1, outgoing: 1 }, limit: 2 },
			ctx,
		);
		expect(first.items.length).toBe(2);
		expect(first.hasMore).toBe(true);
		expect(first.cursor).toBe("2");

		const second = await auditRouteHandler(
			{ threshold: { incoming: 1, outgoing: 1 }, limit: 2, cursor: first.cursor },
			ctx,
		);
		expect(second.items.length).toBe(1);
		expect(second.hasMore).toBe(false);

		const allIds = [...first.items, ...second.items].map((i) => i.id).sort();
		expect(allIds).toEqual(["postA", "postB", "postC"]);
	});
});
