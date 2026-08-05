import { apiFetch as emdashFetch } from "@emdash-cms/admin";

const BASE = "/_emdash/api/plugins/glossary-cards";

/**
 * Appelle une route du plugin.
 *
 * `apiFetch` ajoute l'en-tête `X-EmDash-Request` exigé par la protection CSRF
 * d'EmDash : un `fetch` nu reçoit un 403.
 *
 * Les routes renvoient leur valeur dans l'enveloppe EmDash
 * (`{ success: true, data }` / `{ success: false, error }`) : sans déballage,
 * l'appelant reçoit l'enveloppe au lieu de la charge utile.
 */
export async function apiFetch<T>(route: string, body: Record<string, unknown>): Promise<T> {
	const res = await emdashFetch(`${BASE}/${route}`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
	});
	const payload = (await res.json()) as
		| { success: true; data: T }
		| { success: false; error: { code: string; message: string } };

	if (!payload.success) throw new Error(payload.error.message || payload.error.code);
	return payload.data;
}
