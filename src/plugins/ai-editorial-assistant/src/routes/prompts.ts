import { z } from "astro/zod";
import type { PluginContext } from "emdash";
import { DEFAULT_PROMPTS, type Prompts } from "../domain/prompts";
import { loadPrompts, savePrompts } from "../infrastructure/kv-config";

/**
 * Une chaîne vide est acceptée volontairement : elle signifie « réinitialiser
 * ce prompt », et `savePrompts` retire alors la surcharge du stockage.
 */
const promptPatchSchema = z.object({
	seoTitles: z.string().max(8000).optional(),
	tldr: z.string().max(8000).optional(),
	metaDescription: z.string().max(8000).optional(),
	vulgarize: z.string().max(8000).optional(),
});

export const promptsInputSchema = z.object({
	patch: promptPatchSchema.optional(),
});

export type PromptsInput = z.infer<typeof promptsInputSchema>;

export interface PromptsOutput {
	/** Prompts effectifs : surcharges fusionnées avec les défauts. */
	prompts: Prompts;
	/** Défauts d'usine, pour que l'UI puisse proposer « Réinitialiser ». */
	defaults: Prompts;
	/** Clés effectivement surchargées en base. */
	overridden: Array<keyof Prompts>;
}

/**
 * Lecture et écriture des prompts de fond.
 *
 * Une seule route pour les deux opérations, comme `seo-pro/src/routes/settings.ts` :
 * sans `patch` on lit, avec `patch` on écrit puis on relit. L'UI n'a ainsi
 * jamais à recharger séparément après une sauvegarde.
 */
export async function promptsRouteHandler(
	input: PromptsInput,
	ctx: PluginContext,
): Promise<PromptsOutput> {
	const prompts = input.patch
		? await savePrompts(ctx, input.patch)
		: await loadPrompts(ctx);

	const overridden = (Object.keys(DEFAULT_PROMPTS) as Array<keyof Prompts>).filter(
		(key) => prompts[key] !== DEFAULT_PROMPTS[key],
	);

	return { prompts, defaults: DEFAULT_PROMPTS, overridden };
}
