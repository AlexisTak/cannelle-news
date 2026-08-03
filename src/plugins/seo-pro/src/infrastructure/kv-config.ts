import type { PluginContext } from "emdash";
import { mergeConfig, type SeoConfig } from "../analysis/config";
import type { ConfigStore } from "../ports/config";

// Préfixe `settings:` = préférence exposée à l'utilisateur, par convention
// EmDash (`node_modules/emdash/src/plugins/types.ts:163`).
const KEY = "settings:seoConfig";
const LEGACY_SITE_URL_KEY = "settings:siteUrl";

export function createKvConfigStore(ctx: PluginContext): ConfigStore {
	const store: ConfigStore = {
		async get(): Promise<SeoConfig> {
			const stored = await ctx.kv.get<Partial<SeoConfig>>(KEY);
			const merged = mergeConfig(stored ?? {});
			// Reprise d'un réglage antérieur au plugin : sans ça, tous les liens
			// absolus vers le site seraient classés externes.
			if (!merged.siteUrl) {
				const legacy = await ctx.kv.get<string>(LEGACY_SITE_URL_KEY);
				if (legacy) merged.siteUrl = legacy;
			}
			return merged;
		},

		async set(config: Partial<SeoConfig>): Promise<void> {
			const current = await store.get();
			await ctx.kv.set(KEY, mergeConfig({ ...current, ...config }));
		},
	};

	return store;
}
