import { describe, expect, it } from "vitest";
import article from "../test/fixtures/article-ia.json";
import { createMockCtx, ollamaResponse } from "../test/mock-ctx";
import { createPlugin } from "./index";

const ENTRY_ID = article.id;
const entries = { [`posts/${ENTRY_ID}`]: article as never };

/**
 * Le contexte de route étend le contexte de plugin et porte `input`
 * (`emdash/src/plugins/routes.ts:161-170`).
 */
function routeCtx(ctx: unknown, input: unknown) {
	return { ...(ctx as Record<string, unknown>), input } as never;
}

describe("plugin routes", () => {
	const plugin = createPlugin();

	it("registers the five routes", () => {
		expect(Object.keys(plugin.routes).sort()).toEqual([
			"apply-seo",
			"generate",
			"missing-meta",
			"paragraphs",
			"prompts",
		]);
	});

	it("declares the ollama host passed as an option", () => {
		const custom = createPlugin({ ollamaHost: "ia.interne.lan" });
		expect(custom.allowedHosts).toContain("ia.interne.lan");
		expect(custom.allowedHosts).toContain("api.anthropic.com");
	});

	it("carries a failure message in the payload instead of throwing", async () => {
		// EmDash masque le message de toute exception qui n'est pas
		// `instanceof PluginRouteError`, et ce test échoue même sur un vrai
		// `PluginRouteError` en développement (runtime sur les sources, plugin
		// sur le bundle). Le message doit donc voyager dans la charge utile.
		const { ctx } = createMockCtx({ entries, httpResponse: ollamaResponse('["A","B"]') });

		const output = await plugin.routes.generate.handler(
			routeCtx(ctx, { collection: "posts", id: ENTRY_ID, action: "seoTitles" }),
		);

		expect(output).toMatchObject({ ok: false });
		expect((output as { message: string }).message).toMatch(/au lieu de 5/);
	});

	it("wraps a successful result in the ok envelope", async () => {
		const { ctx } = createMockCtx({
			entries,
			httpResponse: ollamaResponse('["A","B","C"]'),
		});

		const output = await plugin.routes.generate.handler(
			routeCtx(ctx, { collection: "posts", id: ENTRY_ID, action: "tldr" }),
		);

		expect(output).toMatchObject({
			ok: true,
			data: { result: { action: "tldr", bullets: ["A", "B", "C"] } },
		});
	});
});
