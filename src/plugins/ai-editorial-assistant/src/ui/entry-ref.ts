/**
 * Identification de l'entrée en cours d'édition.
 *
 * Un widget de champ est monté avec sept props — `value`, `onChange`, `label`,
 * `id`, `required`, `options`, `minimal` (`@emdash-cms/admin/dist/index.js:14465`)
 * — et rien qui désigne l'entrée. L'URL de l'éditeur est donc le seul canal
 * disponible : `/_emdash/admin/content/:collection/:id`.
 *
 * `new` n'est pas un identifiant : sur une entrée jamais enregistrée, il n'y a
 * rien à lire côté serveur, et l'UI doit le dire au lieu d'échouer.
 */
export interface EntryRef {
	collection: string;
	id: string;
}

const EDITOR_PATH = /\/content\/([^/]+)\/([^/?#]+)/;

export function readEntryRef(pathname = currentPathname()): EntryRef | null {
	const match = EDITOR_PATH.exec(pathname);
	if (!match) return null;

	const [, collection, id] = match;
	if (id === "new") return null;

	return { collection: decodeURIComponent(collection), id: decodeURIComponent(id) };
}

function currentPathname(): string {
	return typeof window === "undefined" ? "" : window.location.pathname;
}
