import { z } from "astro/zod";
import type { PluginContext } from "emdash";

export const applyMetaInputSchema = z.object({
	collection: z.string().min(1),
	id: z.string().min(1),
	title: z.string().trim().min(1).max(200).optional(),
	description: z.string().trim().min(1).max(2000).optional(),
});

export type ApplyMetaInput = z.infer<typeof applyMetaInputSchema>;

export interface ApplyMetaOutput {
	applied: { title?: string; description?: string };
}

/**
 * Écrit dans le panneau SEO natif de l'entrée les meta générées.
 *
 * Même mécanisme que `ai-editorial-assistant/routes/apply-seo` : la clé `seo`
 * est extraite par EmDash et routée vers la table `_emdash_seo`, séparée des
 * champs de contenu. L'éditeur ouvert n'est donc pas écrasé ; le panneau SEO
 * natif se rafraîchit au prochain chargement.
 */
export async function applyMetaRouteHandler(
	input: ApplyMetaInput,
	ctx: PluginContext,
): Promise<ApplyMetaOutput> {
	const content = ctx.content;
	if (!content || typeof (content as { update?: unknown }).update !== "function") {
		throw new Error("seo-pro: la capability content:write n'est pas accordée");
	}

	const existing = await content.get(input.collection, input.id);
	if (!existing) {
		throw new Error(`seo-pro: entrée ${input.collection}/${input.id} introuvable`);
	}

	const applied: ApplyMetaOutput["applied"] = {};
	if (input.title !== undefined) applied.title = input.title;
	if (input.description !== undefined) applied.description = input.description;

	await (
		content as {
			update(c: string, id: string, data: Record<string, unknown>): Promise<unknown>;
		}
	).update(input.collection, input.id, { seo: applied });

	ctx.log.info(`[seo-pro] meta appliquée sur ${input.collection}/${input.id}`);

	return { applied };
}
