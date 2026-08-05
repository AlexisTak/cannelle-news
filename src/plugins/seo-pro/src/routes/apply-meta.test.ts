import { describe, expect, it } from "vitest";
import { createMockCtx } from "../../test/mock-ctx";
import { applyMetaRouteHandler } from "./apply-meta";

const entry = {
	id: "01APP",
	data: { title: "Titre" },
};

describe("apply-meta route", () => {
	it("writes title and description to the seo panel", async () => {
		const { ctx, updates } = createMockCtx({
			entries: { "posts/01APP": entry as never },
		});

		const output = await applyMetaRouteHandler(
			{ collection: "posts", id: "01APP", title: "New title", description: "New description" },
			ctx,
		);

		expect(output.applied).toEqual({ title: "New title", description: "New description" });
		expect(updates).toHaveLength(1);
		expect(updates[0].data).toEqual({ seo: { title: "New title", description: "New description" } });
	});

	it("only writes the provided fields", async () => {
		const { ctx, updates } = createMockCtx({
			entries: { "posts/01APP": entry as never },
		});

		await applyMetaRouteHandler({ collection: "posts", id: "01APP", description: "D" }, ctx);

		expect(updates[0].data).toEqual({ seo: { description: "D" } });
	});

	it("throws when the entry is not found", async () => {
		const { ctx } = createMockCtx();

		await expect(
			applyMetaRouteHandler({ collection: "posts", id: "01APP", title: "T" }, ctx),
		).rejects.toThrow("introuvable");
	});
});
