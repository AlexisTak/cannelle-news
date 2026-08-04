import {
	describeHttpFailure,
	safeText,
	ProviderError,
	type CompletionRequest,
	type HttpFetch,
	type LlmProvider,
} from "./types";

const ENDPOINT = "https://api.openai.com/v1/chat/completions";

/**
 * Adaptateur OpenAI (Chat Completions).
 *
 * `temperature: 0.7` sur les titres serait tentant, mais les quatre actions
 * sont des tâches de reformulation contrainte : une température basse donne
 * des sorties plus courtes, plus proches du texte source et plus faciles à
 * valider. Le rédacteur relance s'il veut d'autres propositions.
 */
export function createOpenAiProvider(fetchImpl: HttpFetch, apiKey: string): LlmProvider {
	return {
		id: "openai",

		async complete({ system, user, model, maxTokens }: CompletionRequest): Promise<string> {
			const response = await fetchImpl(ENDPOINT, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${apiKey}`,
				},
				body: JSON.stringify({
					model,
					max_completion_tokens: maxTokens,
					temperature: 0.3,
					messages: [
						{ role: "system", content: system },
						{ role: "user", content: user },
					],
				}),
			});

			if (!response.ok) {
				throw new ProviderError(
					"openai",
					describeHttpFailure("openai", response.status, await safeText(response)),
				);
			}

			const payload = (await response.json()) as {
				choices?: Array<{ message?: { content?: string } }>;
			};
			const text = payload.choices?.[0]?.message?.content ?? "";

			if (!text.trim()) throw new ProviderError("openai", "réponse vide");
			return text;
		},
	};
}
