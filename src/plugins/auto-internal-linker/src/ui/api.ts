import { apiFetch } from "@emdash-cms/admin";
import type { LinkerConfig } from "../domain/config";
import type { RouteResult } from "../routes/result";
import type { RebuildOutput } from "../routes/rebuild";
import type { SettingsInput, SettingsOutput } from "../routes/settings";
import type { SuggestInput, SuggestOutput } from "../routes/suggest";

const BASE = "/_emdash/api/plugins/auto-internal-linker";

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

export function fetchSuggestions(input: SuggestInput): Promise<SuggestOutput> {
	return call<SuggestOutput>("suggest", input);
}

export function rebuildIndex(): Promise<RebuildOutput> {
	return call<RebuildOutput>("rebuild", {});
}

export function fetchLinkerSettings(): Promise<SettingsOutput> {
	return call<SettingsOutput>("settings", {});
}

export function saveLinkerSettings(patch: Partial<LinkerConfig>): Promise<SettingsOutput> {
	return call<SettingsOutput>("settings", { patch } as SettingsInput);
}

export function errorMessage(err: unknown): string {
	return err instanceof Error ? err.message : "Erreur inconnue";
}
