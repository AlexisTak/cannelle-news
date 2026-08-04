import type { AssistantConfig, ProviderSecrets } from "../domain/config";
import { resolveModel } from "../domain/config";
import { createAnthropicProvider } from "./anthropic";
import { createOllamaProvider } from "./ollama";
import { createOpenAiProvider } from "./openai";
import { ProviderError, type HttpFetch, type LlmProvider } from "./types";

/**
 * Choisit l'adaptateur correspondant au fournisseur configuré.
 *
 * L'absence de clé est détectée **ici**, avant tout appel réseau : sinon le
 * rédacteur reçoit un « HTTP 401 » là où le vrai problème est un réglage jamais
 * renseigné. Ollama n'a pas de clé, seulement une URL — un plugin fraîchement
 * installé fonctionne donc sans configuration si une instance locale tourne.
 */
export function resolveProvider(
	config: AssistantConfig,
	secrets: ProviderSecrets,
	fetchImpl: HttpFetch,
): LlmProvider {
	switch (config.provider) {
		case "ollama": {
			const baseUrl = config.ollamaBaseUrl.trim();
			if (!baseUrl) {
				throw new ProviderError("ollama", "URL de l'instance Ollama non renseignée.");
			}
			return createOllamaProvider(fetchImpl, baseUrl);
		}

		case "anthropic": {
			const key = secrets.anthropicApiKey.trim();
			if (!key) {
				throw new ProviderError(
					"anthropic",
					"clé API absente. Renseignez-la dans les réglages du plugin.",
				);
			}
			return createAnthropicProvider(fetchImpl, key);
		}

		case "openai": {
			const key = secrets.openaiApiKey.trim();
			if (!key) {
				throw new ProviderError(
					"openai",
					"clé API absente. Renseignez-la dans les réglages du plugin.",
				);
			}
			return createOpenAiProvider(fetchImpl, key);
		}
	}
}

/** Requête complète prête à partir, modèle et budget de tokens résolus. */
export function buildRequest(config: AssistantConfig, system: string, user: string) {
	return {
		system,
		user,
		model: resolveModel(config),
		maxTokens: config.maxTokens,
	};
}
