import { apiFetch } from "@emdash-cms/admin";
import type { ActionId } from "../domain/actions";
import type { Prompts } from "../domain/prompts";
import type { GenerateOutput } from "../routes/generate";
import type { ParagraphsOutput } from "../routes/paragraphs";
import type { PromptsOutput } from "../routes/prompts";
import type { ApplySeoOutput } from "../routes/apply-seo";
import type { MissingMetaOutput } from "../routes/missing-meta";
import type { RouteResult } from "../routes/result";

const BASE = "/_emdash/api/plugins/ai-editorial-assistant";

/**
 * Appelle une route du plugin.
 *
 * `apiFetch` ajoute l'en-tête `X-EmDash-Request` exigé par la protection CSRF
 * d'EmDash : un `fetch` nu reçoit un 403.
 *
 * Deux enveloppes à déballer : celle d'EmDash (`success` / `error`, qui
 * masque les messages d'exception), puis celle du plugin (`ok` / `message`,
 * qui les transporte — voir `routes/result.ts`). La seconde est la seule à
 * porter un texte utile au rédacteur.
 */
async function call<T>(route: string, body: unknown): Promise<T> {
	const res = await apiFetch(`${BASE}/${route}`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
	});
	const payload = (await res.json()) as
		| { success: true; data: RouteResult<T> }
		| { success: false; error: { code: string; message: string } };

	if (!payload.success) throw new Error(payload.error.message || payload.error.code);
	if (!payload.data.ok) throw new Error(payload.data.message);
	return payload.data.data;
}

export function generate(input: {
	collection: string;
	id: string;
	action: ActionId;
	paragraphIndex?: number;
	text?: string;
}): Promise<GenerateOutput> {
	return call<GenerateOutput>("generate", input);
}

export function applySeo(input: {
	collection: string;
	id: string;
	title?: string;
	description?: string;
}): Promise<ApplySeoOutput> {
	return call<ApplySeoOutput>("apply-seo", input);
}

export function fetchParagraphs(collection: string, id: string): Promise<ParagraphsOutput> {
	return call<ParagraphsOutput>("paragraphs", { collection, id });
}

export function fetchPrompts(): Promise<PromptsOutput> {
	return call<PromptsOutput>("prompts", {});
}

export function savePrompts(patch: Partial<Prompts>): Promise<PromptsOutput> {
	return call<PromptsOutput>("prompts", { patch });
}

export function fetchMissingMeta(): Promise<MissingMetaOutput> {
	return call<MissingMetaOutput>("missing-meta", {});
}

/** Message d'erreur affichable, quelle que soit la valeur rejetée. */
export function errorMessage(err: unknown): string {
	return err instanceof Error ? err.message : "Erreur inconnue";
}

export type { GenerateOutput, ParagraphsOutput, PromptsOutput, Prompts };
