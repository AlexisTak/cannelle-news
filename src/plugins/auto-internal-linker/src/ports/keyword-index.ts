import type { IndexedKeyword } from "../domain/keyword-entry";

export interface KeywordIndexStore {
	/** Remplace toutes les entrées d'un article. Idempotent. */
	replaceForTarget(targetId: string, keywords: IndexedKeyword[]): Promise<void>;
	/** Supprime toutes les entrées d'un article, rend le nombre supprimé. */
	purgeTarget(targetId: string): Promise<number>;
	purgeCollectionPage(collection: string): Promise<{ deleted: number; hasMore: boolean }>;
	/** Toutes les entrées, pour construire le trie. */
	all(): Promise<IndexedKeyword[]>;
	count(): Promise<number>;
}
