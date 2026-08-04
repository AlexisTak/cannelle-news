import {
	describeHttpFailure,
	safeText,
	ProviderError,
	type CompletionRequest,
	type HttpFetch,
	type LlmProvider,
} from "./types";

const ENDPOINT = "https://api.anthropic.com/v1/messages";

/**
 * Version d'API Anthropic épinglée.
 *
 * L'en-tête `anthropic-version` est obligatoire et fige le format de réponse :
 * sans lui la requête est refusée, et le laisser flottant exposerait le
 * parsing de `content[0].text` à une évolution de schéma non annoncée.
 */
const API_VERSION = "2023-06-01";

/**
 * Adaptateur Anthropic (Messages API).
 *
 * Différence de forme avec OpenAI : la consigne système est un champ `system`
 * de premier niveau, pas un message de rôle `system`. C'est précisément ce que
 * le port `LlmProvider` sert à masquer au reste du plugin.
 */
export function createAnthropicProvider(fetchImpl: HttpFetch, apiKey: string): LlmProvider {
	return {
		id: "anthropic",

		async complete({ system, user, model, maxTokens }: CompletionRequest): Promise<string> {
			const response = await fetchImpl(ENDPOINT, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"x-api-key": apiKey,
					"anthropic-version": API_VERSION,
				},
				body: JSON.stringify({
					model,
					max_tokens: maxTokens,
					temperature: 0.3,
					system,
					messages: [{ role: "user", content: user }],
				}),
			});

			if (!response.ok) {
				throw new ProviderError(
					"anthropic",
					describeHttpFailure("anthropic", response.status, await safeText(response)),
				);
			}

			const payload = (await response.json()) as {
				content?: Array<{ type?: string; text?: string }>;
			};
			// Le tableau `content` peut contenir des blocs non textuels ; on
			// concatène uniquement les blocs `text`.
			const text = (payload.content ?? [])
				.filter((block) => block.type === "text" || typeof block.text === "string")
				.map((block) => block.text ?? "")
				.join("");

			if (!text.trim()) throw new ProviderError("anthropic", "réponse vide");
			return text;
		},
	};
}
