import type { PluginContext } from "emdash";
import type { AssistantDocument } from "../domain/actions";
import { extractParagraphs, portableTextToPlainText } from "./portable-text";

/**
 * Charge une entrée EmDash et la projette en `AssistantDocument`.
 *
 * C'est la seule frontière où le vocabulaire du CMS (`content`, `data`)
 * rencontre celui du domaine. Deux pièges d'API sont absorbés ici :
 *
 * 1. `ctx.content` est `undefined` si la capability `content:read` n'est pas
 *    accordée (`emdash/dist/types-BvB7gDOD.d.mts:508`). Sans ce contrôle, la
 *    route échouerait sur un `TypeError` illisible.
 * 2. `ctx.content.get()` rend un `ContentItem` où `id`, `slug` et `updatedAt`
 *    vivent à la racine et les champs sous `.data` — d'où l'accès en deux
 *    temps plutôt qu'un objet plat.
 */
export async function loadAssistantDocument(
	ctx: PluginContext,
	collection: string,
	id: string,
): Promise<AssistantDocument> {
	if (!ctx.content) {
		throw new Error("ai-editorial-assistant: la capability content:read n'est pas accordée");
	}

	const item = await ctx.content.get(collection, id);
	if (!item) {
		throw new Error(`ai-editorial-assistant: entrée ${collection}/${id} introuvable`);
	}

	const data = (item.data ?? {}) as Record<string, unknown>;
	const body = data.content;

	return {
		entryId: String(item.id ?? id),
		collection,
		title: typeof data.title === "string" ? data.title : "",
		plainText: portableTextToPlainText(body),
		paragraphs: extractParagraphs(body),
		updatedAt: readTimestamp(item),
	};
}

/**
 * `updatedAt` de l'entrée, affiché dans le panneau.
 *
 * Le rédacteur doit pouvoir constater que la génération a porté sur une
 * version antérieure à ses modifications en cours : c'est la contrepartie
 * assumée du fait qu'un widget de champ n'a pas accès au brouillon non
 * sauvegardé.
 */
function readTimestamp(item: { updatedAt?: unknown; createdAt?: unknown }): string | null {
	const value = item.updatedAt ?? item.createdAt;
	if (value instanceof Date) return value.toISOString();
	return typeof value === "string" ? value : null;
}
