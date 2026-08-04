import { describe, expect, it } from "vitest";
import { createMockCtx } from "../../test/mock-ctx";
import { DEFAULT_PROMPTS } from "../domain/prompts";
import { promptsInputSchema, promptsRouteHandler } from "./prompts";

describe("prompts route", () => {
	it("returns the defaults when nothing is stored", async () => {
		const { ctx } = createMockCtx();
		const output = await promptsRouteHandler({}, ctx);

		expect(output.prompts).toEqual(DEFAULT_PROMPTS);
		expect(output.overridden).toEqual([]);
	});

	it("stores an override and reports it", async () => {
		const { ctx } = createMockCtx();
		const output = await promptsRouteHandler({ patch: { tldr: "Consigne maison" } }, ctx);

		expect(output.prompts.tldr).toBe("Consigne maison");
		expect(output.prompts.seoTitles).toBe(DEFAULT_PROMPTS.seoTitles);
		expect(output.overridden).toEqual(["tldr"]);
	});

	it("persists the override across calls", async () => {
		const { ctx } = createMockCtx();
		await promptsRouteHandler({ patch: { vulgarize: "Autre consigne" } }, ctx);
		const output = await promptsRouteHandler({}, ctx);

		expect(output.prompts.vulgarize).toBe("Autre consigne");
	});

	it("treats an empty string as a reset", async () => {
		const { ctx } = createMockCtx();
		await promptsRouteHandler({ patch: { tldr: "Consigne maison" } }, ctx);
		const output = await promptsRouteHandler({ patch: { tldr: "" } }, ctx);

		expect(output.prompts.tldr).toBe(DEFAULT_PROMPTS.tldr);
		expect(output.overridden).toEqual([]);
	});

	it("always exposes the factory defaults for the reset button", async () => {
		const { ctx } = createMockCtx();
		const output = await promptsRouteHandler({ patch: { seoTitles: "X" } }, ctx);

		expect(output.defaults).toEqual(DEFAULT_PROMPTS);
	});
});

describe("prompts input schema", () => {
	it("accepts an empty payload", () => {
		expect(promptsInputSchema.parse({})).toEqual({});
	});

	it("rejects an unreasonably long prompt", () => {
		expect(() => promptsInputSchema.parse({ patch: { tldr: "x".repeat(8001) } })).toThrow();
	});
});
