import { hrefToPath } from "../../content/link-classifier";

/**
 * État du décompte des liens pour un article.
 *
 * `used` part du nombre de liens internes **déjà présents** dans le corps :
 * sans ce plancher, le plafond ne voudrait rien dire sur un article déjà
 * maillé à la main, où le plugin ajouterait cinq liens de plus.
 */
export interface CapState {
	used: number;
	linkedPaths: Set<string>;
}

export function createCapState(existingInternalHrefs: string[]): CapState {
	const linkedPaths = new Set(existingInternalHrefs.map(hrefToPath));
	return { used: existingInternalHrefs.length, linkedPaths };
}

/**
 * Peut-on encore poser un lien vers cette cible ?
 *
 * Deux refus distincts : le plafond global, et l'unicité par cible. Le second
 * est celui qui évite le pire du keyword stuffing — cinq mots-clés différents
 * pointant tous vers la même page.
 */
export function canLink(state: CapState, targetUrl: string, maxLinks: number): boolean {
	if (state.used >= maxLinks) return false;
	return !state.linkedPaths.has(hrefToPath(targetUrl));
}

export function registerLink(state: CapState, targetUrl: string): void {
	state.used++;
	state.linkedPaths.add(hrefToPath(targetUrl));
}
