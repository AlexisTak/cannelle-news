import { z } from "astro/zod";
import type { PluginContext } from "emdash";
import type { LinkerConfig } from "../domain/config";
import { createKvConfigStore } from "../infrastructure/kv-config";
import { createKeywordIndexStore } from "../infrastructure/keyword-index-store";

export const settingsInputSchema = z.object({
	patch: z
		.object({
			analyzableCollections: z.array(z.string().min(1)).optional(),
			maxLinksPerEntry: z.number().int().min(1).max(50).optional(),
			minKeywordLength: z.number().int().min(1).max(20).optional(),
			sources: z
				.object({
					manual: z.boolean().optional(),
					title: z.boolean().optional(),
					taxonomy: z.boolean().optional(),
					extracted: z.boolean().optional(),
				})
				.optional(),
			urlPatterns: z.record(z.string(), z.string()).optional(),
			siteUrl: z
				.string()
				.regex(/^https?:\/\/.+/, "L'URL doit commencer par http:// ou https://")
				.nullable()
				.optional(),
		})
		.optional(),
});

export type SettingsInput = z.infer<typeof settingsInputSchema>;

export interface SettingsOutput {
	config: LinkerConfig;
	/** Taille de l'index, affichée à côté du bouton de reconstruction. */
	indexSize: number;
}

/**
 * Lit les réglages, ou les met à jour puis les relit.
 *
 * Une seule route pour les deux usages : la page de réglages a de toute façon
 * besoin de l'état complet après écriture, et deux routes obligeraient l'UI à
 * enchaîner deux appels pour rien.
 */
export async function settingsRouteHandler(
	input: SettingsInput,
	ctx: PluginContext,
): Promise<SettingsOutput> {
	const store = createKvConfigStore(ctx);
	if (input.patch) {
		const before = await store.get();
		await store.set(input.patch as Partial<LinkerConfig>);
		const after = await store.get();
		const removed = before.analyzableCollections.filter((collection) => !after.analyzableCollections.includes(collection));
		if (removed.length) {
			const pending = await ctx.kv.get<string[]>("jobs:staleCollections") ?? [];
			await ctx.kv.set("jobs:staleCollections", [...new Set([...pending, ...removed])]);
		}
	}

	return {
		config: await store.get(),
		indexSize: await createKeywordIndexStore(ctx).count(),
	};
}
