import type { PluginContext } from "emdash";
import { mergeConfig, type AssistantConfig, type ProviderSecrets } from "../domain/config";
import { mergePrompts, type Prompts } from "../domain/prompts";

/**
 * Lecture des réglages du plugin.
 *
 * Le formulaire auto-généré par `admin.settingsSchema` écrit **une option par
 * champ** sous `plugin:<id>:settings:<clé>`
 * (`emdash/dist/api-b8WIiGU4.mjs:2373`), et le préfixe du KV de plugin est
 * précisément `plugin:<id>:` (`context-B6hc7zJL.mjs:357`). Un
 * `ctx.kv.get("settings:model")` relit donc exactement ce que l'administrateur
 * a saisi — sans qu'aucune route de ce plugin n'ait à exposer ces valeurs.
 *
 * Les prompts, eux, sont un objet unique sous `settings:prompts` : ils sont
 * édités ensemble par la page `/prompts` et n'ont pas leur place dans un
 * formulaire de champs simples.
 */

const PROMPTS_KEY = "settings:prompts";

export async function loadConfig(ctx: PluginContext): Promise<AssistantConfig> {
	const [provider, model, ollamaBaseUrl, maxTokens, language] = await Promise.all([
		ctx.kv.get<string>("settings:provider"),
		ctx.kv.get<string>("settings:model"),
		ctx.kv.get<string>("settings:ollamaBaseUrl"),
		ctx.kv.get<number>("settings:maxTokens"),
		ctx.kv.get<string>("settings:language"),
	]);

	return mergeConfig({
		provider: provider as AssistantConfig["provider"] | undefined,
		model: model ?? undefined,
		ollamaBaseUrl: ollamaBaseUrl ?? undefined,
		maxTokens: typeof maxTokens === "number" ? maxTokens : undefined,
		language: language as AssistantConfig["language"] | undefined,
	});
}

/**
 * Clés API.
 *
 * Isolée de `loadConfig` pour que le type des secrets ne puisse pas se
 * retrouver par mégarde dans une réponse de route : rien de ce que renvoie
 * `loadConfig` n'est sensible, tout ce que renvoie cette fonction l'est.
 */
export async function loadSecrets(ctx: PluginContext): Promise<ProviderSecrets> {
	const [openaiApiKey, anthropicApiKey] = await Promise.all([
		ctx.kv.get<string>("settings:openaiApiKey"),
		ctx.kv.get<string>("settings:anthropicApiKey"),
	]);

	return {
		openaiApiKey: openaiApiKey ?? "",
		anthropicApiKey: anthropicApiKey ?? "",
	};
}

export async function loadPrompts(ctx: PluginContext): Promise<Prompts> {
	const stored = await ctx.kv.get<Partial<Prompts>>(PROMPTS_KEY);
	return mergePrompts(stored);
}

/**
 * Écrit une modification partielle des prompts.
 *
 * Une chaîne vide vaut « réinitialiser » : la clé est retirée du stockage, et
 * `mergePrompts` fait resurgir le défaut. Sans cette convention, il faudrait
 * une seconde route juste pour effacer une surcharge.
 */
export async function savePrompts(ctx: PluginContext, patch: Partial<Prompts>): Promise<Prompts> {
	const stored = (await ctx.kv.get<Partial<Prompts>>(PROMPTS_KEY)) ?? {};

	for (const [key, value] of Object.entries(patch) as Array<[keyof Prompts, string]>) {
		if (value.trim()) stored[key] = value;
		else delete stored[key];
	}

	await ctx.kv.set(PROMPTS_KEY, stored);
	return mergePrompts(stored);
}
