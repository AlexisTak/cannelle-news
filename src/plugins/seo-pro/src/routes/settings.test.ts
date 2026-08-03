import { describe, it, expect } from "vitest";
import { settingsRouteHandler, settingsInputSchema } from "./settings";
import { createMockCtx } from "../../test/mock-ctx";

describe("settings route", () => {
	it("returns the current config when no patch is given", async () => {
		const { ctx } = createMockCtx();
		const config = await settingsRouteHandler({}, ctx);
		expect(config.wordsPerMinute).toBe(200);
		expect(config.analyzableCollections).toEqual(["posts", "pages"]);
	});

	it("writes a patch and returns the merged result", async () => {
		const { ctx } = createMockCtx();
		const config = await settingsRouteHandler(
			{ patch: { wordsPerMinute: 250, siteUrl: "https://cannelle.news" } },
			ctx,
		);
		expect(config.wordsPerMinute).toBe(250);
		expect(config.siteUrl).toBe("https://cannelle.news");
		// Non touché par le patch, doit survivre.
		expect(config.analyzableCollections).toEqual(["posts", "pages"]);
	});

	it("persists across calls", async () => {
		const { ctx } = createMockCtx();
		await settingsRouteHandler({ patch: { analyzableCollections: ["posts"] } }, ctx);
		const config = await settingsRouteHandler({}, ctx);
		expect(config.analyzableCollections).toEqual(["posts"]);
	});

	it("accepts null to clear the site URL", () => {
		expect(settingsInputSchema.parse({ patch: { siteUrl: null } }).patch?.siteUrl).toBeNull();
	});

	it("rejects a malformed site URL", () => {
		expect(() => settingsInputSchema.parse({ patch: { siteUrl: "pas-une-url" } })).toThrow();
	});

	it("rejects an empty collection list", () => {
		expect(() => settingsInputSchema.parse({ patch: { analyzableCollections: [] } })).toThrow();
	});

	it("rejects an out-of-range reading speed", () => {
		expect(() => settingsInputSchema.parse({ patch: { wordsPerMinute: 5 } })).toThrow();
	});
});
