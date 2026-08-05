import {
	describeHttpFailure,
	fetchWithTimeout,
	readJsonLimited,
	safeText,
	ProviderError,
	type CompletionRequest,
	type HttpFetch,
	type LlmProvider,
} from "./types";

/**
 * Adaptateur Ollama (`POST /api/chat`).
 *
 * Deux réglages non négociables :
 *
 * - `stream: false` — l'API renvoie sinon une suite de JSON séparés par des
 *   retours ligne, que `response.json()` refuse de lire.
 * - `format: "json"` — contraint le décodage au niveau du modèle. C'est la
 *   seule des trois intégrations où cette garantie est gratuite, et elle
 *   compense la tendance des petits modèles locaux à préfacer leur réponse.
 * - `think: false` — un modèle à raisonnement (qwen3, deepseek-r1…) écrit sa
 *   chaîne de pensée dans `message.thinking` et peut épuiser `num_predict`
 *   avant d'avoir produit un seul caractère de `content`. Constaté sur
 *   `qwen3.5:4b` : 1 000 tokens de raisonnement, `content` vide,
 *   `done_reason: "length"`. Les quatre actions sont des reformulations
 *   contraintes, le raisonnement explicite n'y apporte rien.
 *
 * Aucune clé API : c'est l'intérêt du mode local, aucun contenu d'article ne
 * quitte la machine.
 */
export function createOllamaProvider(fetchImpl: HttpFetch, baseUrl: string): LlmProvider {
	const endpoint = `${baseUrl.replace(/\/+$/, "")}/api/chat`;

	return {
		id: "ollama",

		async complete({ system, user, model, maxTokens }: CompletionRequest): Promise<string> {
			const response = await fetchWithTimeout(fetchImpl, endpoint, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					model,
					stream: false,
					think: false,
					format: "json",
					options: { temperature: 0.3, num_predict: maxTokens },
					messages: [
						{ role: "system", content: system },
						{ role: "user", content: user },
					],
				}),
			});

			if (!response.ok) {
				throw new ProviderError(
					"ollama",
					describeHttpFailure("ollama", response.status, await safeText(response)),
				);
			}

			const payload = await readJsonLimited<{
				message?: { content?: string; thinking?: string };
				done_reason?: string;
			}>(response);
			const text = payload.message?.content ?? "";

			if (!text.trim()) {
				// Distinguer les deux causes : sans ça, un budget de tokens trop
				// bas et un modèle défaillant donnent le même « réponse vide ».
				if (payload.done_reason === "length") {
					throw new ProviderError(
						"ollama",
						payload.message?.thinking
							? "le modèle a épuisé son budget de tokens en raisonnement. Choisissez un modèle sans raisonnement, ou augmentez « Tokens maximum » dans les réglages."
							: "réponse tronquée : augmentez « Tokens maximum » dans les réglages.",
					);
				}
				throw new ProviderError("ollama", "réponse vide");
			}
			return text;
		},
	};
}
