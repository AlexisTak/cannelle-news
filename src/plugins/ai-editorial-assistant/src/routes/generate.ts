import { z } from "astro/zod";
import type { PluginContext } from "emdash";
import { ACTION_IDS, type ActionId, type ActionResult } from "../domain/actions";
import { resolveModel } from "../domain/config";
import { buildSystemPrompt, buildUserMessage } from "../domain/prompts";
import { validateOutput } from "../domain/validate";
import { loadAssistantDocument } from "../infrastructure/content-loader";
import { loadConfig, loadPrompts, loadSecrets } from "../infrastructure/kv-config";
import { buildRequest, resolveProvider } from "../providers/factory";

export const generateInputSchema = z.object({
	collection: z.string().min(1),
	id: z.string().min(1),
	action: z.enum(ACTION_IDS),
	/** `vulgarize` uniquement : index de bloc renvoyé par la route `paragraphs`. */
	paragraphIndex: z.number().int().min(0).optional(),
	/** `vulgarize` uniquement : passage collé à la main par le rédacteur. */
	text: z.string().max(20000).optional(),
});

export type GenerateInput = z.infer<typeof generateInputSchema>;

export interface GenerateOutput {
	result: ActionResult;
	model: string;
	provider: string;
	/** `updatedAt` de la version analysée : le panneau l'affiche au rédacteur. */
	updatedAt: string | null;
}

/**
 * Exécute une action rédactionnelle sur une entrée.
 *
 * L'article est lu **côté serveur** depuis la dernière version enregistrée :
 * un widget de champ ne reçoit que sa propre valeur
 * (`@emdash-cms/admin/dist/index.js:14465`), il ne peut donc pas transmettre
 * le brouillon en cours. `updatedAt` est renvoyé pour que l'UI puisse le dire
 * plutôt que de laisser croire à une analyse du texte affiché.
 */
export async function generateRouteHandler(
	input: GenerateInput,
	ctx: PluginContext,
): Promise<GenerateOutput> {
	if (!ctx.http) {
		throw new Error(
			"ai-editorial-assistant: la capability network:request n'est pas accordée",
		);
	}

	const doc = await loadAssistantDocument(ctx, input.collection, input.id);
	const sourceText = resolveSourceText(input, doc.paragraphs);

	if (input.action !== "vulgarize" && !doc.plainText.trim()) {
		throw new Error(
			"ai-editorial-assistant: l'article est vide. Rédigez et enregistrez du contenu avant de lancer une action.",
		);
	}

	const [config, secrets, prompts] = await Promise.all([
		loadConfig(ctx),
		loadSecrets(ctx),
		loadPrompts(ctx),
	]);

	const provider = resolveProvider(config, secrets, ctx.http.fetch);
	const request = buildRequest(
		config,
		buildSystemPrompt(prompts[input.action], config.language),
		buildUserMessage(input.action, doc, sourceText),
	);

	const raw = await provider.complete(request);
	const result = validateOutput(input.action, raw, sourceText);

	ctx.log.info(
		`[ai-editorial-assistant] ${input.collection}/${input.id} ${input.action} via ${provider.id}`,
	);

	return {
		result,
		model: resolveModel(config),
		provider: provider.id,
		updatedAt: doc.updatedAt,
	};
}

/**
 * Passage à reformuler pour `vulgarize`.
 *
 * Deux entrées possibles : un index de bloc choisi dans le sélecteur, ou du
 * texte collé. L'index prime, mais un index périmé — l'article a été remanié
 * depuis l'ouverture du panneau — doit produire un message compréhensible
 * plutôt qu'une reformulation du mauvais paragraphe.
 */
function resolveSourceText(
	input: GenerateInput,
	paragraphs: Array<{ index: number; text: string }>,
): string {
	if (input.action !== "vulgarize") return "";

	if (input.paragraphIndex !== undefined) {
		const paragraph = paragraphs.find((p) => p.index === input.paragraphIndex);
		if (!paragraph) {
			throw new Error(
				"ai-editorial-assistant: ce paragraphe n'existe plus dans la version enregistrée. Rechargez la liste.",
			);
		}
		return paragraph.text;
	}

	const pasted = (input.text ?? "").trim();
	if (!pasted) {
		throw new Error(
			"ai-editorial-assistant: sélectionnez un paragraphe ou collez un passage à vulgariser.",
		);
	}
	return pasted;
}

/** Actions exposées, pour les tests et l'UI. */
export const SUPPORTED_ACTIONS: readonly ActionId[] = ACTION_IDS;
