import { z } from "astro/zod";
import type { PluginContext } from "emdash";
import { loadSeoDocument, contentItemToEntry } from "../infrastructure/content-loader";
import { createKvConfigStore } from "../infrastructure/kv-config";
import { analyze } from "../analysis/analyze";
import { generateMeta, type GeneratedMeta } from "../generation/generate-meta";
import { focusKey } from "./analyze";

export const generateMetaInputSchema = z.object({
	collection: z.string().min(1),
	id: z.string().min(1),
});

export type GenerateMetaInput = z.infer<typeof generateMetaInputSchema>;

export interface GenerateMetaOutput {
	generated: GeneratedMeta;
	focusKeyword: string | null;
}

/**
 * Route de génération de meta title, meta description et tags sociaux.
 *
 * Réutilise le moteur d'analyse pour obtenir le mot-clé cible et le document
 * SEO, puis appelle le générateur pour produire des valeurs conformes aux
 * contraintes de longueur.
 */
export async function generateMetaRouteHandler(
	input: GenerateMetaInput,
	ctx: PluginContext,
): Promise<GenerateMetaOutput> {
	if (!ctx.content) {
		throw new Error("seo-pro: la capability content:read n'est pas accordée");
	}

	const item = await ctx.content.get(input.collection, input.id);
	if (!item) {
		throw new Error(`seo-pro: entrée ${input.collection}/${input.id} introuvable`);
	}

	const config = await createKvConfigStore(ctx).get();
	const doc = await loadSeoDocument(ctx, contentItemToEntry(item), input.collection);

	const manualFocus = await ctx.kv.get<string | null>(focusKey(item.id));
	const report = analyze(doc, config, manualFocus ?? undefined);

	const generated = generateMeta(doc, config, report.focusKeyword ?? undefined);

	ctx.log.info(
		`[seo-pro] meta générée pour ${input.collection}/${input.id} (focus: ${report.focusKeyword ?? "auto"})`,
	);

	return { generated, focusKeyword: report.focusKeyword };
}
