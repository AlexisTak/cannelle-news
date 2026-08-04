import type { PluginContext } from "emdash";

export function createMockPluginContext(storage: Record<string, unknown> = {}) {
	const terms = new Map<string, { id: string; data: unknown }>();

	return {
		plugin: { id: "glossary-cards", version: "0.1.0" },
		storage: {
			terms: {
				async putMany(items: Array<{ id: string; data: unknown }>) {
					for (const item of items) terms.set(item.id, item);
				},
				async deleteMany(ids: string[]) {
					let count = 0;
					for (const id of ids) {
						if (terms.delete(id)) count++;
					}
					return count;
				},
				async count() {
					return terms.size;
				},
				async query(opts: { where?: Record<string, unknown>; limit?: number; cursor?: string } = {}) {
					let items = [...terms.values()].map((item) => ({ ...item }));
					if (opts.where) {
						items = items.filter(({ data }) =>
							Object.entries(opts.where as Record<string, unknown>).every(
								([key, value]) => (data as Record<string, unknown>)[key] === value,
							),
						);
					}
					const limit = opts.limit ?? 100;
					const page = items.slice(0, limit);
					const hasMore = items.length > limit;
					return {
						items: page,
						cursor: hasMore ? String(limit) : undefined,
						hasMore,
					};
				},
			},
		},
		kv: {
			async get<T>(_key: string): Promise<T | null> {
				return null;
			},
			async set(_key: string, _value: unknown): Promise<void> {},
			async delete(_key: string): Promise<boolean> {
				return true;
			},
			async list(_prefix?: string) {
				return [];
			},
		},
		log: {
			debug() {},
			info() {},
			warn() {},
			error() {},
		},
		site: {
			name: "Cannelle News",
			url: "https://example.com",
			locale: "fr",
		},
		url(path: string) {
			return new URL(path, (this as unknown as { site: { url: string } }).site.url).toString();
		},
		...storage,
	} as unknown as PluginContext;
}
