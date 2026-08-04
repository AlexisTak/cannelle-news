import { z } from "astro/zod";
import type { PluginContext } from "emdash";
import { loadAssistantDocument } from "../infrastructure/content-loader";

export const paragraphsInputSchema = z.object({
	collection: z.string().min(1),
	id: z.string().min(1),
});

export type ParagraphsInput = z.infer<typeof paragraphsInputSchema>;

export interface ParagraphSummary {
	index: number;
	preview: string;
	chars: number;
}

export interface ParagraphsOutput {
	items: ParagraphSummary[];
	updatedAt: string | null;
}

/** Longueur de l'aperçu affiché dans le sélecteur. */
const PREVIEW_CHARS = 140;

/**
 * Liste les paragraphes vulgarisables de l'entrée enregistrée.
 *
 * Renvoie un **aperçu** et non le texte intégral : la liste sert à choisir,
 * pas à lire, et un article long ferait transiter plusieurs dizaines de
 * kilo-octets pour remplir un menu déroulant. Le texte complet est relu
 * côté serveur par la route `generate` à partir de l'index.
 */
export async function paragraphsRouteHandler(
	input: ParagraphsInput,
	ctx: PluginContext,
): Promise<ParagraphsOutput> {
	const doc = await loadAssistantDocument(ctx, input.collection, input.id);

	return {
		items: doc.paragraphs.map((paragraph) => ({
			index: paragraph.index,
			preview: preview(paragraph.text),
			chars: paragraph.text.length,
		})),
		updatedAt: doc.updatedAt,
	};
}

function preview(text: string): string {
	if (text.length <= PREVIEW_CHARS) return text;
	const slice = text.slice(0, PREVIEW_CHARS);
	const lastSpace = slice.lastIndexOf(" ");
	return `${(lastSpace > 0 ? slice.slice(0, lastSpace) : slice).trimEnd()}…`;
}
