import { PROVIDER_IDS, type ProviderId } from "../providers/types";

/**
 * Réglages du plugin, alimentés par le formulaire auto d'EmDash
 * (`admin.settingsSchema`).
 *
 * Les clés API n'apparaissent **pas** ici : elles vivent dans `ProviderSecrets`
 * et ne transitent jamais par une route ni par le navigateur. Séparer les deux
 * types rend l'erreur difficile à commettre — un objet `AssistantConfig`
 * renvoyé à l'admin ne peut structurellement pas contenir de secret.
 */
export interface AssistantConfig {
	provider: ProviderId;
	model: string;
	ollamaBaseUrl: string;
	maxTokens: number;
	language: "fr" | "en";
}

export interface ProviderSecrets {
	openaiApiKey: string;
	anthropicApiKey: string;
}

/**
 * Modèle par défaut selon le fournisseur.
 *
 * Volontairement les entrées de gamme : ces quatre actions sont des tâches de
 * reformulation courte, un modèle plus gros coûterait davantage sans améliorer
 * un titre de 60 caractères. Le champ `model` reste libre pour monter en gamme.
 */
export const DEFAULT_MODELS: Record<ProviderId, string> = {
	ollama: "llama3.1:8b",
	anthropic: "claude-sonnet-5",
	openai: "gpt-4o-mini",
};

export const DEFAULT_CONFIG: AssistantConfig = {
	provider: "ollama",
	model: "",
	ollamaBaseUrl: "http://localhost:11434",
	maxTokens: 1000,
	language: "fr",
};

/**
 * Fusionne des réglages partiels avec les défauts.
 *
 * Les clés à `undefined` sont retirées avant la fusion : un spread les
 * copierait telles quelles et écraserait le défaut, ce qui laisserait par
 * exemple `ollamaBaseUrl` vide dès qu'un seul réglage n'a jamais été saisi.
 */
export function mergeConfig(stored: Partial<AssistantConfig> | null | undefined): AssistantConfig {
	const defined = Object.fromEntries(
		Object.entries(stored ?? {}).filter(([, value]) => value !== undefined && value !== null),
	) as Partial<AssistantConfig>;

	const merged = { ...DEFAULT_CONFIG, ...defined };

	// Un `provider` inconnu (réglage écrit à la main, downgrade de version)
	// doit retomber sur le mode local plutôt que faire échouer chaque action.
	if (!(PROVIDER_IDS as readonly string[]).includes(merged.provider)) {
		merged.provider = DEFAULT_CONFIG.provider;
	}

	return merged;
}

/** Modèle effectif : celui choisi, sinon le défaut du fournisseur retenu. */
export function resolveModel(config: AssistantConfig): string {
	return config.model.trim() || DEFAULT_MODELS[config.provider];
}
