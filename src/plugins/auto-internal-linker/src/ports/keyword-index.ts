import type { IndexedKeyword } from "../domain/keyword-entry";

export interface KeywordIndexStore {
	/** Remplace toutes les entrées d'un article. Idempotent. */
	replaceForTarget(targetId: string, keywords: IndexedKeyword[]): Promise<void>;
	/** Supprime toutes les entrées d'un article, rend le nombre supprimé. */
	purgeTarget(targetId: string): Promise<number>;
	/** Supprime les entrées dont le targetId n'est pas dans la liste conservée. */
	purgeOrphans(keepTargetIds: Set<string>): Promise<number>;
	/**
	 * Parcourt l'index page par page.
	 *
	 * Le callback reçoit chaque page de mots-clés. Le parcours rend la main à
	 * l'évent loop entre les pages pour ne pas bloquer un Worker sur un gros
	 * index, contrairement à `all()` qui charge tout en mémoire d'un coup.
	 */
	stream(callback: (page: IndexedKeyword[]) => void | Promise<void>): Promise<void>;
	/** Toutes les entrées, pour construire le trie. */
	all(): Promise<IndexedKeyword[]>;
	count(): Promise<number>;
}
