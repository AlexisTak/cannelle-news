import type { PluginContext } from "emdash";
import { keywordDocId, type IndexedKeyword } from "../domain/keyword-entry";
import type { KeywordIndexStore } from "../ports/keyword-index";

/** Taille de page des lectures paginées. */
const PAGE_SIZE = 100;

interface StorageCollection {
	putMany(items: Array<{ id: string; data: unknown }>): Promise<void>;
	deleteMany(ids: string[]): Promise<number>;
	count(): Promise<number>;
	query(opts: {
		where?: Record<string, unknown>;
		limit?: number;
		cursor?: string;
	}): Promise<{ items: Array<{ id: string; data: unknown }>; cursor?: string; hasMore: boolean }>;
}

export function createKeywordIndexStore(ctx: PluginContext): KeywordIndexStore {
	const collection = (ctx.storage as unknown as Record<string, StorageCollection>).keywords;

	async function idsForTarget(targetId: string): Promise<string[]> {
		const ids: string[] = [];
		let cursor: string | undefined;

		do {
			// `targetId` doit figurer dans les index déclarés : le stockage refuse
			// toute requête sur un champ non indexé.
			const page = await collection.query({ where: { targetId }, limit: PAGE_SIZE, cursor });
			ids.push(...page.items.map((item) => item.id));
			cursor = page.cursor;
		} while (cursor);

		return ids;
	}

	const store: KeywordIndexStore = {
		/**
		 * Purge puis réinsère.
		 *
		 * Une simple réinsertion laisserait derrière elle les mots-clés retirés du
		 * titre ou d'un tag : l'article continuerait d'être la cible de termes
		 * qu'il ne traite plus.
		 */
		async replaceForTarget(targetId: string, keywords: IndexedKeyword[]): Promise<void> {
			await store.purgeTarget(targetId);
			if (keywords.length === 0) return;

			await collection.putMany(
				keywords.map((keyword) => ({
					id: keywordDocId(targetId, keyword.normalized),
					data: keyword,
				})),
			);
		},

		async purgeTarget(targetId: string): Promise<number> {
			const ids = await idsForTarget(targetId);
			if (ids.length === 0) return 0;
			return collection.deleteMany(ids);
		},

		async all(): Promise<IndexedKeyword[]> {
			const keywords: IndexedKeyword[] = [];
			let cursor: string | undefined;

			do {
				const page = await collection.query({ limit: PAGE_SIZE, cursor });
				keywords.push(...page.items.map((item) => item.data as IndexedKeyword));
				cursor = page.cursor;
			} while (cursor);

			return keywords;
		},

		count(): Promise<number> {
			return collection.count();
		},
	};

	return store;
}
