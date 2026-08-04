import { describe, expect, it } from "vitest";
import article from "../../test/fixtures/article-ia.json";
import { createMockCtx, jsonResponse, ollamaResponse } from "../../test/mock-ctx";
import { generateInputSchema, generateRouteHandler } from "./generate";

const ENTRY_ID = article.id;
const entries = { [`posts/${ENTRY_ID}`]: article as never };

function ctxWith(response: Response | (() => Response), kv: Record<string, unknown> = {}) {
	return createMockCtx({ entries, httpResponse: response, kv });
}

describe("generate input schema", () => {
	it("rejects an unknown action", () => {
		expect(() =>
			generateInputSchema.parse({ collection: "posts", id: "x", action: "translate" }),
		).toThrow();
	});

	it("accepts a paragraph index for vulgarize", () => {
		const parsed = generateInputSchema.parse({
			collection: "posts",
			id: "x",
			action: "vulgarize",
			paragraphIndex: 2,
		});
		expect(parsed.paragraphIndex).toBe(2);
	});
});

describe("generate route", () => {
	it("returns five seo titles from a json array", async () => {
		const { ctx, httpCalls } = ctxWith(ollamaResponse('["A","B","C","D","E","F"]'));
		const output = await generateRouteHandler(
			{ collection: "posts", id: ENTRY_ID, action: "seoTitles" },
			ctx,
		);

		expect(output.result).toEqual({ action: "seoTitles", titles: ["A", "B", "C", "D", "E"] });
		expect(output.provider).toBe("ollama");
		expect(output.model).toBe("llama3.1:8b");
		expect(httpCalls).toHaveLength(1);
	});

	it("reports the analysed version so the editor knows what was read", async () => {
		const { ctx } = ctxWith(ollamaResponse('["A","B","C"]'));
		const output = await generateRouteHandler(
			{ collection: "posts", id: ENTRY_ID, action: "tldr" },
			ctx,
		);

		expect(output.updatedAt).toBe("2026-08-03T09:12:00.000Z");
	});

	it("sends the article body to the model", async () => {
		const { ctx, httpCalls } = ctxWith(ollamaResponse('{"description":"ok"}'));
		await generateRouteHandler(
			{ collection: "posts", id: ENTRY_ID, action: "metaDescription" },
			ctx,
		);

		const body = JSON.parse(String(httpCalls[0].init?.body)) as {
			messages: Array<{ role: string; content: string }>;
		};
		expect(body.messages[1].content).toContain("Trois laboratoires européens");
	});

	it("sends only the selected passage when vulgarizing", async () => {
		const { ctx, httpCalls } = ctxWith(ollamaResponse('{"text":"En clair"}'));
		const output = await generateRouteHandler(
			{ collection: "posts", id: ENTRY_ID, action: "vulgarize", paragraphIndex: 2 },
			ctx,
		);

		const body = JSON.parse(String(httpCalls[0].init?.body)) as {
			messages: Array<{ role: string; content: string }>;
		};
		// Le contexte complet pousserait le modèle à résumer l'article entier.
		expect(body.messages[1].content).toContain("espace latent");
		expect(body.messages[1].content).not.toContain("Trois laboratoires européens");
		expect(output.result).toMatchObject({ action: "vulgarize", text: "En clair" });
	});

	it("accepts pasted text instead of a paragraph index", async () => {
		const { ctx } = ctxWith(ollamaResponse('{"text":"En clair"}'));
		const output = await generateRouteHandler(
			{ collection: "posts", id: ENTRY_ID, action: "vulgarize", text: "Passage collé" },
			ctx,
		);

		expect(output.result).toMatchObject({ sourceText: "Passage collé" });
	});

	it("explains a stale paragraph index", async () => {
		const { ctx } = ctxWith(ollamaResponse('{"text":"x"}'));
		await expect(
			generateRouteHandler(
				{ collection: "posts", id: ENTRY_ID, action: "vulgarize", paragraphIndex: 99 },
				ctx,
			),
		).rejects.toThrow(/n'existe plus dans la version enregistrée/);
	});

	it("requires a passage to vulgarize", async () => {
		const { ctx } = ctxWith(ollamaResponse('{"text":"x"}'));
		await expect(
			generateRouteHandler({ collection: "posts", id: ENTRY_ID, action: "vulgarize" }, ctx),
		).rejects.toThrow(/collez un passage/);
	});

	it("fails clearly on a missing entry", async () => {
		const { ctx } = ctxWith(ollamaResponse("[]"));
		await expect(
			generateRouteHandler({ collection: "posts", id: "nope", action: "tldr" }, ctx),
		).rejects.toThrow(/introuvable/);
	});

	it("refuses to run on an empty article", async () => {
		const { ctx } = createMockCtx({
			entries: { "posts/empty": { id: "empty", data: { title: "Brouillon" } } },
			httpResponse: ollamaResponse("[]"),
		});

		await expect(
			generateRouteHandler({ collection: "posts", id: "empty", action: "tldr" }, ctx),
		).rejects.toThrow(/l'article est vide/);
	});

	it("fails clearly when network:request is missing", async () => {
		const { ctx } = createMockCtx({ entries, withoutHttp: true });
		await expect(
			generateRouteHandler({ collection: "posts", id: ENTRY_ID, action: "tldr" }, ctx),
		).rejects.toThrow(/network:request/);
	});

	it("fails clearly when content:read is missing", async () => {
		const { ctx } = createMockCtx({ withoutContent: true, httpResponse: ollamaResponse("[]") });
		await expect(
			generateRouteHandler({ collection: "posts", id: ENTRY_ID, action: "tldr" }, ctx),
		).rejects.toThrow(/content:read/);
	});

	it("surfaces a provider misconfiguration before calling the network", async () => {
		const { ctx, httpCalls } = ctxWith(ollamaResponse("[]"), { "settings:provider": "openai" });
		await expect(
			generateRouteHandler({ collection: "posts", id: ENTRY_ID, action: "tldr" }, ctx),
		).rejects.toThrow(/clé API absente/);
		expect(httpCalls).toHaveLength(0);
	});

	it("uses the configured provider and model", async () => {
		const { ctx, httpCalls } = ctxWith(
			jsonResponse({ content: [{ type: "text", text: '["A","B","C"]' }] }),
			{
				"settings:provider": "anthropic",
				"settings:anthropicApiKey": "sk-ant-test",
				"settings:model": "claude-sonnet-5",
			},
		);

		const output = await generateRouteHandler(
			{ collection: "posts", id: ENTRY_ID, action: "tldr" },
			ctx,
		);

		expect(output.provider).toBe("anthropic");
		expect(output.model).toBe("claude-sonnet-5");
		expect(httpCalls[0].url).toBe("https://api.anthropic.com/v1/messages");
	});

	it("applies the stored prompt override", async () => {
		const { ctx, httpCalls } = ctxWith(ollamaResponse('["A","B","C","D","E"]'), {
			"settings:prompts": { seoTitles: "Consigne maison" },
		});

		await generateRouteHandler(
			{ collection: "posts", id: ENTRY_ID, action: "seoTitles" },
			ctx,
		);

		const body = JSON.parse(String(httpCalls[0].init?.body)) as {
			messages: Array<{ role: string; content: string }>;
		};
		expect(body.messages[0].content).toBe("Consigne maison");
	});

	it("appends the language directive when set to english", async () => {
		const { ctx, httpCalls } = ctxWith(ollamaResponse('["A","B","C"]'), {
			"settings:language": "en",
		});

		await generateRouteHandler({ collection: "posts", id: ENTRY_ID, action: "tldr" }, ctx);

		const body = JSON.parse(String(httpCalls[0].init?.body)) as {
			messages: Array<{ role: string; content: string }>;
		};
		expect(body.messages[0].content).toMatch(/Write every generated string in English\.$/);
	});

	it("rejects an output that breaks the contract", async () => {
		// Deux titres au lieu de cinq : mieux vaut une erreur qu'une liste amputée.
		const { ctx } = ctxWith(ollamaResponse('["A","B"]'));
		await expect(
			generateRouteHandler({ collection: "posts", id: ENTRY_ID, action: "seoTitles" }, ctx),
		).rejects.toThrow(/au lieu de 5/);
	});
});
