import { describe, expect, it } from "vitest";
import { createMockCtx } from "../../test/mock-ctx";
import { missingMetaRouteHandler } from "./missing-meta";

function makeEntry(
	id: string,
	data: Record<string, unknown>,
	status: string,
	seo?: Record<string, unknown>,
) {
	const entry = {
		id,
		data,
		status,
	} as unknown as { id: string; data: Record<string, unknown>; status: string; seo?: Record<string, unknown> };
	if (seo) entry.seo = seo;
	return entry;
}

describe("missing-meta route", () => {
	it("counts articles missing TL;DR, meta description and SEO title", async () => {
		const { ctx } = createMockCtx({
			entries: {
				"posts/1": makeEntry("1", { title: "Article 1", tldr: ["Puce 1"], metaDescription: "Desc" }, "published"),
				"posts/2": makeEntry("2", { title: "Article 2" }, "published"),
				"posts/3": makeEntry(
					"3",
					{ title: "Article 3", tldr: [] },
					"published",
					{ description: "SEO desc" },
				),
			},
		});

		const output = await missingMetaRouteHandler({}, ctx);

		expect(output.articlesChecked).toBe(3);
		expect(output.withoutTldr).toBe(2);
		expect(output.withoutMetaDescription).toBe(1);
		expect(output.withoutSeoTitle).toBe(0);
		expect(output.items).toHaveLength(2);
		expect(output.items.some((i) => i.id === "2")).toBe(true);
		expect(output.items.some((i) => i.id === "3")).toBe(true);
	});

	it("considers a SEO panel description as valid meta description", async () => {
		const { ctx } = createMockCtx({
			entries: {
				"posts/1": makeEntry("1", { title: "T" }, "published", { description: "Via SEO panel" }),
			},
		});

		const output = await missingMetaRouteHandler({}, ctx);

		expect(output.withoutMetaDescription).toBe(0);
	});

	it("considers a SEO panel title as valid SEO title", async () => {
		const { ctx } = createMockCtx({
			entries: {
				"posts/1": makeEntry(
					"1",
					{ tldr: ["Puce"], metaDescription: "Desc" },
					"published",
					{ title: "SEO title" },
				),
			},
		});

		const output = await missingMetaRouteHandler({}, ctx);

		expect(output.withoutSeoTitle).toBe(0);
		expect(output.items).toHaveLength(0);
	});

	it("ignores drafts", async () => {
		const { ctx } = createMockCtx({
			entries: {
				"posts/1": makeEntry("1", { title: "Draft" }, "draft"),
			},
		});

		const output = await missingMetaRouteHandler({}, ctx);

		expect(output.articlesChecked).toBe(0);
	});

	it("fails gracefully when content:read is missing", async () => {
		const { ctx } = createMockCtx({ withoutContent: true });

		await expect(missingMetaRouteHandler({}, ctx)).rejects.toThrow(
			"content:read",
		);
	});
});
