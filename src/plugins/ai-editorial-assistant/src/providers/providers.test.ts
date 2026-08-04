import { describe, expect, it } from "vitest";
import { DEFAULT_CONFIG, type AssistantConfig } from "../domain/config";
import { createAnthropicProvider } from "./anthropic";
import { buildRequest, resolveProvider } from "./factory";
import { createOllamaProvider } from "./ollama";
import { createOpenAiProvider } from "./openai";
import { ProviderError, type HttpFetch } from "./types";

interface Call {
	url: string;
	init?: RequestInit;
}

/**
 * `fetch` factice qui enregistre l'appel.
 *
 * Pas de `vi.fn()` : le dépôt n'utilise ni mocks ni espions, et un tableau
 * d'appels suffit pour vérifier ce qu'on envoie sur le réseau.
 */
function fakeFetch(response: Response | (() => Response)): { fetch: HttpFetch; calls: Call[] } {
	const calls: Call[] = [];
	const fetch: HttpFetch = async (url, init) => {
		calls.push({ url, init });
		return typeof response === "function" ? response() : response;
	};
	return { fetch, calls };
}

function json(body: unknown, status = 200): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { "Content-Type": "application/json" },
	});
}

const request = { system: "consigne", user: "article", model: "m", maxTokens: 500 };

describe("openai provider", () => {
	it("returns the assistant message", async () => {
		const { fetch, calls } = fakeFetch(json({ choices: [{ message: { content: "sortie" } }] }));
		const text = await createOpenAiProvider(fetch, "sk-test").complete(request);

		expect(text).toBe("sortie");
		expect(calls[0].url).toBe("https://api.openai.com/v1/chat/completions");
		expect((calls[0].init?.headers as Record<string, string>).Authorization).toBe(
			"Bearer sk-test",
		);
	});

	it("explains a 401 in editor-facing terms", async () => {
		const { fetch } = fakeFetch(json({ error: "bad key" }, 401));
		await expect(createOpenAiProvider(fetch, "sk-bad").complete(request)).rejects.toThrow(
			/clé API refusée/,
		);
	});

	it("explains a 429 as a quota problem", async () => {
		const { fetch } = fakeFetch(json({}, 429));
		await expect(createOpenAiProvider(fetch, "sk").complete(request)).rejects.toThrow(
			/quota atteint/,
		);
	});

	it("rejects an empty completion", async () => {
		const { fetch } = fakeFetch(json({ choices: [{ message: { content: "  " } }] }));
		await expect(createOpenAiProvider(fetch, "sk").complete(request)).rejects.toThrow(
			ProviderError,
		);
	});
});

describe("anthropic provider", () => {
	it("concatenates text blocks and pins the api version", async () => {
		const { fetch, calls } = fakeFetch(
			json({
				content: [
					{ type: "text", text: "pre" },
					{ type: "text", text: "mier" },
				],
			}),
		);
		const text = await createAnthropicProvider(fetch, "sk-ant").complete(request);

		expect(text).toBe("premier");
		const headers = calls[0].init?.headers as Record<string, string>;
		expect(headers["x-api-key"]).toBe("sk-ant");
		expect(headers["anthropic-version"]).toBe("2023-06-01");
	});

	it("sends the system prompt as a top-level field", async () => {
		const { fetch, calls } = fakeFetch(json({ content: [{ type: "text", text: "ok" }] }));
		await createAnthropicProvider(fetch, "sk-ant").complete(request);

		const body = JSON.parse(String(calls[0].init?.body)) as Record<string, unknown>;
		expect(body.system).toBe("consigne");
		expect(body.messages).toEqual([{ role: "user", content: "article" }]);
	});
});

describe("ollama provider", () => {
	it("disables streaming and forces json decoding", async () => {
		const { fetch, calls } = fakeFetch(json({ message: { content: '["A"]' } }));
		const text = await createOllamaProvider(fetch, "http://localhost:11434").complete(request);

		expect(text).toBe('["A"]');
		const body = JSON.parse(String(calls[0].init?.body)) as Record<string, unknown>;
		expect(body.stream).toBe(false);
		expect(body.format).toBe("json");
	});

	it("disables reasoning mode", async () => {
		const { fetch, calls } = fakeFetch(json({ message: { content: "ok" } }));
		await createOllamaProvider(fetch, "http://localhost:11434").complete(request);

		const body = JSON.parse(String(calls[0].init?.body)) as Record<string, unknown>;
		expect(body.think).toBe(false);
	});

	it("explains a budget exhausted by reasoning", async () => {
		// qwen3.5:4b : 1000 tokens de raisonnement, content vide, done_reason "length".
		const { fetch } = fakeFetch(
			json({ message: { content: "", thinking: "Thinking Process:…" }, done_reason: "length" }),
		);
		await expect(
			createOllamaProvider(fetch, "http://localhost:11434").complete(request),
		).rejects.toThrow(/budget de tokens en raisonnement/);
	});

	it("explains a plain truncation without reasoning", async () => {
		const { fetch } = fakeFetch(json({ message: { content: "" }, done_reason: "length" }));
		await expect(
			createOllamaProvider(fetch, "http://localhost:11434").complete(request),
		).rejects.toThrow(/réponse tronquée/);
	});

	it("normalizes a trailing slash in the base url", async () => {
		const { fetch, calls } = fakeFetch(json({ message: { content: "ok" } }));
		await createOllamaProvider(fetch, "http://localhost:11434/").complete(request);

		expect(calls[0].url).toBe("http://localhost:11434/api/chat");
	});

	it("suggests ollama pull on a 404", async () => {
		const { fetch } = fakeFetch(json({ error: "model not found" }, 404));
		await expect(
			createOllamaProvider(fetch, "http://localhost:11434").complete(request),
		).rejects.toThrow(/ollama pull/);
	});
});

describe("resolveProvider", () => {
	const { fetch } = fakeFetch(json({}));
	const noSecrets = { openaiApiKey: "", anthropicApiKey: "" };

	it("defaults to ollama with no configuration at all", () => {
		expect(resolveProvider(DEFAULT_CONFIG, noSecrets, fetch).id).toBe("ollama");
	});

	it("refuses anthropic without a key, before any network call", () => {
		const config: AssistantConfig = { ...DEFAULT_CONFIG, provider: "anthropic" };
		expect(() => resolveProvider(config, noSecrets, fetch)).toThrow(/clé API absente/);
	});

	it("refuses openai without a key", () => {
		const config: AssistantConfig = { ...DEFAULT_CONFIG, provider: "openai" };
		expect(() => resolveProvider(config, noSecrets, fetch)).toThrow(/clé API absente/);
	});

	it("refuses ollama without a base url", () => {
		const config: AssistantConfig = { ...DEFAULT_CONFIG, ollamaBaseUrl: "  " };
		expect(() => resolveProvider(config, noSecrets, fetch)).toThrow(/URL de l'instance/);
	});
});

describe("buildRequest", () => {
	it("falls back to the provider default model", () => {
		expect(buildRequest(DEFAULT_CONFIG, "s", "u").model).toBe("llama3.1:8b");
	});

	it("honours an explicit model", () => {
		const config: AssistantConfig = { ...DEFAULT_CONFIG, model: "mistral:7b" };
		expect(buildRequest(config, "s", "u").model).toBe("mistral:7b");
	});
});
