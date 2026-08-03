import type { PluginContext } from "emdash";
import { mergeConfig, type LinkerConfig } from "../domain/config";
import type { ConfigStore } from "../ports/config";

// Préfixe `settings:` = préférence exposée à l'utilisateur, par convention
// EmDash (`node_modules/emdash/src/plugins/types.ts:163`).
const KEY = "settings:linkerConfig";

export function createKvConfigStore(ctx: PluginContext): ConfigStore {
	const store: ConfigStore = {
		async get(): Promise<LinkerConfig> {
			return mergeConfig((await ctx.kv.get<Partial<LinkerConfig>>(KEY)) ?? {});
		},

		async set(patch: Partial<LinkerConfig>): Promise<void> {
			// Relire avant d'écrire : `mergeConfig` fusionne `sources` et
			// `urlPatterns` champ à champ, mais seulement par rapport à ce qu'on
			// lui donne. Sans la relecture, enregistrer un seul motif d'URL
			// effacerait les réglages voisins déjà stockés.
			const current = await store.get();
			await ctx.kv.set(KEY, mergeConfig({ ...current, ...patch }));
		},
	};

	return store;
}
