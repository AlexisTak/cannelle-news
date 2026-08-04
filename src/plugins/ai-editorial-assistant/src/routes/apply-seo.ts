import { z } from "astro/zod";
import type { PluginContext } from "emdash";
import { truncateMetaDescription } from "../domain/validate";

export const applySeoInputSchema = z
	.object({
		collection: z.string().min(1),
		id: z.string().min(1),
		title: z.string().trim().min(1).max(300).optional(),
		description: z.string().trim().min(1).max(2000).optional(),
	})
	.refine((input) => input.title !== undefined || input.description !== undefined, {
		message: "title ou description doit être fourni",
	});

export type ApplySeoInput = z.infer<typeof applySeoInputSchema>;

export interface ApplySeoOutput {
	applied: { title?: string; description?: string };
}

/**
 * Écrit dans le panneau SEO natif de l'entrée.
 *
 * Pourquoi c'est sûr malgré un éditeur ouvert : la clé `seo` de
 * `ContentWriteInput` est extraite par EmDash et routée vers la table
 * `_emdash_seo`, séparée des champs de contenu
 * (`emdash/dist/types-BvB7gDOD.d.mts:300-308`). Un `update` ne portant que
 * `seo` ne touche donc à aucun champ de `data` — le brouillon non enregistré
 * du rédacteur survit à l'opération.
 *
 * En contrepartie, `SeoPanel` est un composant cœur qui lit `item.seo` au
 * montage : la valeur écrite n'apparaît qu'au rechargement de l'éditeur.
 * L'UI le dit explicitement après un succès.
 */
export async function applySeoRouteHandler(
	input: ApplySeoInput,
	ctx: PluginContext,
): Promise<ApplySeoOutput> {
	const content = ctx.content;
	if (!content || typeof (content as { update?: unknown }).update !== "function") {
		throw new Error("ai-editorial-assistant: la capability content:write n'est pas accordée");
	}

	const existing = await content.get(input.collection, input.id);
	if (!existing) {
		throw new Error(
			`ai-editorial-assistant: entrée ${input.collection}/${input.id} introuvable`,
		);
	}

	const applied: ApplySeoOutput["applied"] = {};
	if (input.title !== undefined) applied.title = input.title;
	// Deuxième passage de la limite des 155 caractères : la route est
	// atteignable sans passer par le widget, la contrainte ne peut pas
	// dépendre du client.
	if (input.description !== undefined) {
		applied.description = truncateMetaDescription(input.description);
	}

	await (
		content as {
			update(c: string, id: string, data: Record<string, unknown>): Promise<unknown>;
		}
	).update(input.collection, input.id, { seo: applied });

	ctx.log.info(
		`[ai-editorial-assistant] seo mis à jour sur ${input.collection}/${input.id} (${Object.keys(applied).join(", ")})`,
	);

	return { applied };
}
