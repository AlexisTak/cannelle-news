import type { PluginContext } from "emdash";
import { keywordDocId, type IndexedKeyword } from "../domain/keyword-entry";
import type { KeywordIndexStore } from "../ports/keyword-index";

/** Taille de page des lectures paginées. */
const PAGE_SIZE = 100;
const MAX_INDEX_ENTRIES = 5_000;
const CACHE_TTL_MS = 60_000;
const CACHE_KEY = "cache:keyword-index:v1";

interface KeywordCache {
	expiresAt: number;
	items: IndexedKeyword[];
}

function yieldCpu(): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, 0));
}

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
	const invalidateCache = () => ctx.kv.delete(CACHE_KEY);

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
			await invalidateCache();
		},

		async purgeTarget(targetId: string): Promise<number> {
			const ids = await idsForTarget(targetId);
			if (ids.length === 0) return 0;
			const deleted = await collection.deleteMany(ids);
			await invalidateCache();
			return deleted;
		},

		async purgeCollectionPage(targetCollection: string) {
			const page = await collection.query({ where: { targetCollection }, limit: PAGE_SIZE });
			if (!page.items.length) return { deleted: 0, hasMore: false };
			const deleted = await collection.deleteMany(page.items.map((item) => item.id));
			await invalidateCache();
			return { deleted, hasMore: page.hasMore };
		},

		async all(): Promise<IndexedKeyword[]> {
			const cached = await ctx.kv.get<KeywordCache>(CACHE_KEY);
			if (cached && cached.expiresAt > Date.now()) return cached.items;

			const keywords: IndexedKeyword[] = [];
			let cursor: string | undefined;

			do {
				const remaining = MAX_INDEX_ENTRIES - keywords.length;
				if (remaining <= 0) break;
				const page = await collection.query({ limit: Math.min(PAGE_SIZE, remaining), cursor });
				keywords.push(...page.items.map((item) => item.data as IndexedKeyword));
				cursor = page.cursor;
				if (cursor) await yieldCpu();
			} while (cursor);
		},

			if (cursor) {
				ctx.log.warn(`[auto-internal-linker] index tronqué à ${MAX_INDEX_ENTRIES} mots-clés pour une suggestion`);
			}
			await ctx.kv.set(CACHE_KEY, { expiresAt: Date.now() + CACHE_TTL_MS, items: keywords } satisfies KeywordCache);
			return keywords;
		},

		count(): Promise<number> {
			return collection.count();
		},
	};

	return store;
}
