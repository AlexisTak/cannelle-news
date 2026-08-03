/**
 * Enveloppe de résultat des routes du plugin.
 *
 * EmDash ne laisse passer le message d'une exception que si elle est
 * `instanceof PluginRouteError` (`emdash/src/plugins/routes.ts:182`) ; toute
 * autre devient « Plugin route error ». Ce test échoue même en levant un vrai
 * `PluginRouteError` : en développement le runtime EmDash s'exécute depuis ses
 * sources tandis que l'import du plugin résout le bundle — deux objets de
 * classe distincts, donc `instanceof` faux.
 *
 * Les échecs *attendus* — article introuvable, index vide — voyagent donc dans
 * la charge utile plutôt que par une exception. `ui/api.ts` la déballe et
 * relève une `Error` porteuse du vrai message.
 */
export type RouteResult<T> = { ok: true; data: T } | { ok: false; message: string };

/** Exécute un handler en convertissant tout échec en résultat transportable. */
export async function toRouteResult<T>(run: () => Promise<T>): Promise<RouteResult<T>> {
	try {
		return { ok: true, data: await run() };
	} catch (error) {
		return { ok: false, message: error instanceof Error ? error.message : "Erreur inconnue" };
	}
}
