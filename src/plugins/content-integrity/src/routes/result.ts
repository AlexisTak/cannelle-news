export type RouteResult<T> = { ok: true; data: T } | { ok: false; message: string };
export async function toRouteResult<T>(action: () => Promise<T>): Promise<RouteResult<T>> {
	try { return { ok: true, data: await action() }; }
	catch (error) { return { ok: false, message: error instanceof Error ? error.message : "Erreur inconnue" }; }
}
