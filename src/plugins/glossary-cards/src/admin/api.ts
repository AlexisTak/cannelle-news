import { apiFetch as emdashFetch } from "@emdash-cms/admin";

const BASE = "/_emdash/api/plugins/glossary-cards";

/**
 * Appelle une route du plugin.
 *
 * `apiFetch` d'EmDash ajoute l'en-tête `X-EmDash-Request` exigé par la
 * protection CSRF du dispatcher de routes plugin
 * (`astro/routes/api/plugins/[pluginId]/[...path].ts`) : un `fetch` nu reçoit
 * un 403 sur *toutes* les routes, y compris les lectures.
 *
 * L'enveloppe est celle d'EmDash — `{ success, data }` en succès,
 * `{ success, error }` en échec. Les routes de ce plugin renvoient leur
 * résultat directement, sans la seconde enveloppe `{ ok, message }` que
 * `ai-editorial-assistant` interpose pour faire voyager ses messages d'erreur.
 */
export async function apiFetch<T>(route: string, body: Record<string, unknown>): Promise<T> {
	const res = await emdashFetch(`${BASE}/${route}`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
	});

	const payload = (await res.json()) as
		| { success: true; data: T }
		| { success: false; error?: { code?: string; message?: string } };

	if (!payload.success) {
		throw new Error(payload.error?.message || payload.error?.code || "Erreur du plugin");
	}

	return payload.data;
}
