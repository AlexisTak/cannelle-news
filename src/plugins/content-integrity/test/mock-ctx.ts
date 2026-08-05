import type { PluginContext } from "emdash";

type Stored = Record<string, unknown>;

function createCollection() {
	const records = new Map<string, Stored>();
	return {
		records,
		api: {
			async get(id: string) { return records.get(id) ?? null; },
			async put(id: string, data: Stored) { records.set(id, data); },
			async putMany(items: Array<{ id: string; data: Stored }>) {
				for (const item of items) records.set(item.id, item.data);
			},
			async delete(id: string) { return records.delete(id); },
			async deleteMany(ids: string[]) { return ids.filter((id) => records.delete(id)).length; },
			async count() { return records.size; },
			async query(options: {
				where?: Record<string, unknown>;
				limit?: number;
				cursor?: string;
				orderBy?: Record<string, "asc" | "desc">;
			} = {}) {
				let items = [...records].map(([id, data]) => ({ id, data }));
				if (options.where) {
					items = items.filter(({ data }) =>
						Object.entries(options.where!).every(([key, value]) => data[key] === value),
					);
				}
				const offset = Number(options.cursor ?? 0);
				const limit = options.limit ?? 100;
				const page = items.slice(offset, offset + limit);
				const next = offset + page.length;
				return { items: page, cursor: next < items.length ? String(next) : undefined, hasMore: next < items.length };
			},
		},
	};
}

export function createMockIntegrityContext() {
	const kv = new Map<string, unknown>();
	const fingerprints = createCollection();
	const bands = createCollection();
	const matches = createCollection();
	const watch = createCollection();
	const ctx = {
		plugin: { id: "content-integrity", version: "0.1.0" },
		kv: {
			get: async <T,>(key: string) => (kv.get(key) as T | undefined) ?? null,
			set: async (key: string, value: unknown) => { kv.set(key, value); },
			delete: async (key: string) => kv.delete(key),
			list: async (prefix?: string) => [...kv].filter(([key]) => !prefix || key.startsWith(prefix)).map(([key, value]) => ({ key, value })),
		},
		storage: {
			fingerprints: fingerprints.api,
			bands: bands.api,
			matches: matches.api,
			watch: watch.api,
		},
		log: { debug() {}, info() {}, warn() {}, error() {} },
	} as unknown as PluginContext;
	return {
		ctx,
		kv,
		records: {
			fingerprints: fingerprints.records,
			bands: bands.records,
			matches: matches.records,
			watch: watch.records,
		},
	};
}
