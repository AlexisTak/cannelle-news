import type { PluginContext } from "emdash";

export interface MockCtxOptions {
	kv?: Record<string, unknown>;
	keywords?: Record<string, unknown>;
	content?: Record<string, { id: string; slug: string | null; data: Record<string, unknown> }>;
	terms?: Record<string, Array<{ label: string }>>;
}

/**
 * `PluginContext` minimal en mémoire.
 *
 * Ne couvre que les surfaces que le plugin touche réellement. Le reste est
 * laissé absent volontairement : un module qui commencerait à lire `ctx.media`
 * doit échouer bruyamment en test, pas être satisfait par un bouchon vide.
 */
export function createMockCtx(options: MockCtxOptions = {}) {
	const kv = new Map<string, unknown>(Object.entries(options.kv ?? {}));
	const keywords = new Map<string, unknown>(Object.entries(options.keywords ?? {}));
	const logs: Array<{ level: string; message: string }> = [];

	const collection = {
		async get(id: string) {
			return keywords.get(id) ?? null;
		},
		async put(id: string, data: unknown) {
			keywords.set(id, data);
		},
		async delete(id: string) {
			return keywords.delete(id);
		},
		async exists(id: string) {
			return keywords.has(id);
		},
		async putMany(items: Array<{ id: string; data: unknown }>) {
			for (const { id, data } of items) keywords.set(id, data);
		},
		async deleteMany(ids: string[]) {
			return ids.filter((id) => keywords.delete(id)).length;
		},
		async count() {
			return keywords.size;
		},
		async query(opts: { where?: Record<string, unknown>; limit?: number; cursor?: string } = {}) {
			let items = [...keywords.entries()].map(([id, data]) => ({ id, data }));

			if (opts.where) {
				items = items.filter(({ data }) =>
					Object.entries(opts.where as Record<string, unknown>).every(
						([key, value]) => (data as Record<string, unknown>)[key] === value,
					),
				);
			}

			const offset = opts.cursor ? Number(opts.cursor) : 0;
			const limit = opts.limit ?? 100;
			const page = items.slice(offset, offset + limit);
			const nextOffset = offset + page.length;
			const hasMore = nextOffset < items.length;

			return { items: page, cursor: hasMore ? String(nextOffset) : undefined, hasMore };
		},
	};

	const ctx = {
		plugin: { id: "auto-internal-linker", version: "0.1.0" },
		kv: {
			async get<T>(key: string): Promise<T | null> {
				return (kv.get(key) as T | undefined) ?? null;
			},
			async set(key: string, value: unknown): Promise<void> {
				kv.set(key, value);
			},
			async delete(key: string): Promise<boolean> {
				return kv.delete(key);
			},
			async list(prefix?: string) {
				return [...kv.entries()]
					.filter(([key]) => (prefix ? key.startsWith(prefix) : true))
					.map(([key, value]) => ({ key, value }));
			},
		},
		storage: { keywords: collection },
		content: {
			async get(_collection: string, id: string) {
				const item = options.content?.[id];
				return item ? { ...item, type: _collection, status: "published", locale: null } : null;
			},
			async list(_collection: string, opts: { cursor?: string; limit?: number } = {}) {
				const items = Object.values(options.content ?? {}).map((item) => ({
					...item,
					type: _collection,
					status: "published",
					locale: null,
				}));
				const offset = opts.cursor ? Number(opts.cursor) : 0;
				const limit = opts.limit ?? 100;
				const page = items.slice(offset, offset + limit);
				const nextOffset = offset + page.length;
				const hasMore = nextOffset < items.length;
				return { items: page, cursor: hasMore ? String(nextOffset) : undefined, hasMore };
			},
		},
		taxonomies: {
			async getEntryTerms(_collection: string, entryId: string) {
				return options.terms?.[entryId] ?? [];
			},
		},
		log: {
			debug: (message: string) => logs.push({ level: "debug", message }),
			info: (message: string) => logs.push({ level: "info", message }),
			warn: (message: string) => logs.push({ level: "warn", message }),
			error: (message: string) => logs.push({ level: "error", message }),
		},
	} as unknown as PluginContext;

	return { ctx, kv, keywords, logs };
}
