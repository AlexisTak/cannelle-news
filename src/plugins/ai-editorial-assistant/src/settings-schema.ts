import type { PluginDescriptor } from "emdash";
import { DEFAULT_CONFIG, DEFAULT_MODELS } from "./domain/config";

/**
 * `SettingField` n'est exporté par aucun point d'entrée public d'`emdash`
 * (ni `.`, ni `./plugin`). Le type est donc dérivé structurellement du
 * descripteur, ce qui reste vérifié par le compilateur sans dépendre d'un
 * chemin d'import interne.
 */
type SettingsSchema = NonNullable<PluginDescriptor["settingsSchema"]>;

/**
 * Formulaire de réglages auto-généré par EmDash.
 *
 * C'est le seul mécanisme de la plateforme qui stocke une valeur en
 * **écriture seule** : `buildSettingsResponse` ne renvoie qu'un booléen
 * `secretsSet` pour les champs `secret` (`emdash/dist/api-b8WIiGU4.mjs:2419`).
 * Une clé API saisie ici ne peut donc pas ressortir par l'API admin, alors
 * qu'un champ `string` — ou un stockage maison en KV exposé par une route —
 * la renverrait au navigateur à chaque chargement de page.
 *
 * Déclaré une seule fois puis partagé entre le descripteur (lu au build) et
 * `definePlugin` (lu au runtime) : deux copies divergeraient.
 */
export const SETTINGS_SCHEMA: SettingsSchema = {
	provider: {
		type: "select",
		label: "Fournisseur",
		description:
			"Ollama tourne en local : aucun contenu d'article ne sort de l'infrastructure.",
		options: [
			{ value: "ollama", label: "Ollama (local)" },
			{ value: "anthropic", label: "Anthropic (Claude)" },
			{ value: "openai", label: "OpenAI" },
		],
		default: DEFAULT_CONFIG.provider,
	},
	model: {
		type: "string",
		label: "Modèle",
		description: `Laisser vide pour le défaut du fournisseur (${DEFAULT_MODELS.ollama}, ${DEFAULT_MODELS.anthropic}, ${DEFAULT_MODELS.openai}).`,
	},
	ollamaBaseUrl: {
		type: "url",
		label: "URL de l'instance Ollama",
		description:
			"L'hôte doit figurer dans allowedHosts, réglé à l'enregistrement du plugin dans astro.config.mjs.",
		default: DEFAULT_CONFIG.ollamaBaseUrl,
		placeholder: "http://localhost:11434",
	},
	anthropicApiKey: {
		type: "secret",
		label: "Clé API Anthropic",
		description: "Utilisée uniquement si le fournisseur est Anthropic.",
	},
	openaiApiKey: {
		type: "secret",
		label: "Clé API OpenAI",
		description: "Utilisée uniquement si le fournisseur est OpenAI.",
	},
	maxTokens: {
		type: "number",
		label: "Tokens maximum par réponse",
		description: "1000 suffit largement pour cinq titres ou trois puces.",
		default: DEFAULT_CONFIG.maxTokens,
		min: 100,
		max: 4000,
	},
	language: {
		type: "select",
		label: "Langue de rédaction",
		options: [
			{ value: "fr", label: "Français" },
			{ value: "en", label: "Anglais" },
		],
		default: DEFAULT_CONFIG.language,
	},
};
