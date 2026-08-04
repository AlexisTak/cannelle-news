/**
 * Appelle les routes du plugin.
 *
 * EmDash expose `apiFetch` via la page admin ; ici on reste sur fetch natif
 * pour ne pas ajouter de dépendance runtime.
 */
export async function apiFetch<T>(route: string, body: Record<string, unknown>): Promise<T> {
	const res = await fetch(`/_emdash/api/plugins/glossary-cards/${route}`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
	});
	const data = (await res.json()) as { ok: boolean; data?: T; message?: string } | T;
	if (typeof data === "object" && data !== null && "ok" in data && !data.ok) {
		throw new Error((data as { message?: string }).message ?? "Erreur du plugin");
	}
	return data as T;
}
