import { z } from "astro/zod";
import type { PluginContext } from "emdash";
import type { SeoConfig } from "../analysis/config";
import { createKvConfigStore } from "../infrastructure/kv-config";

/**
 * Lecture et écriture de la configuration en une seule route.
 *
 * Sans `patch`, c'est une lecture ; avec, on écrit puis on renvoie l'état
 * fusionné. Le plan prévoyait une page de réglages mais aucune route pour la
 * servir — la page n'aurait rien pu ni lire ni enregistrer.
 */
export const settingsInputSchema = z.object({
	patch: z
		.object({
			wordsPerMinute: z.number().int().min(50).max(1000).optional(),
			// `z.url()` et non `z.string().url()` : la seconde est dépréciée en
			// zod 4, que réexporte `astro/zod`.
			siteUrl: z.url().nullable().optional(),
			analyzableCollections: z.array(z.string().min(1)).min(1).optional(),
		})
		.optional(),
});

export type SettingsInput = z.infer<typeof settingsInputSchema>;

export async function settingsRouteHandler(
	input: SettingsInput,
	ctx: PluginContext,
): Promise<SeoConfig> {
	const store = createKvConfigStore(ctx);
	if (input.patch && Object.keys(input.patch).length > 0) {
		await store.set(input.patch);
	}
	return store.get();
}
