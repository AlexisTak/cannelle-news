import type { PluginContext } from "emdash";

export interface MockEntry {
	id: string;
	slug?: string | null;
	locale?: string | null;
	updatedAt?: string;
	data: Record<string, unknown>;
	seo?: Record<string, unknown>;
	status?: string;
}

export interface MockCtxOptions {
	kv?: Record<string, unknown>;
	reports?: Record<string, unknown>;
	entries?: Record<string, MockEntry>;
	withoutContent?: boolean;
}

/**
 * `PluginContext` minimal en mémoire.
 *
 * Couvre `kv`, `storage.reports`, `content` et `log`. Le reste est laissé
 * absent volontairement : une route qui commencerait à lire `ctx.media` doit
 * échouer bruyamment en test, pas être silencieusement satisfaite par un
 * bouchon vide.
 */
export function createMockCtx(options: MockCtxOptions = {}) {
	const kv = new Map<string, unknown>(Object.entries(options.kv ?? {}));
	const reports = new Map<string, unknown>(Object.entries(options.reports ?? {}));
	const entries = new Map<string, MockEntry>(Object.entries(options.entries ?? {}));
	const updates: Array<{ collection: string; id: string; data: Record<string, unknown> }> = [];
	const logs: Array<{ level: string; message: string }> = [];

	const content = {
		async get(collection: string, id: string) {
			return entries.get(`${collection}/${id}`) ?? null;
		},
		async update(collection: string, id: string, data: Record<string, unknown>) {
			const key = `${collection}/${id}`;
			const existing = entries.get(key);
			if (!existing) throw new Error(`entrée ${key} introuvable`);
			updates.push({ collection, id, data });
			const { seo, ...fields } = data;
			const next: MockEntry = {
				...existing,
				data: { ...existing.data, ...fields },
			};
			if (seo) next.seo = seo as Record<string, unknown>;
			entries.set(key, next);
			return next;
		},
	};

	const ctx = {
		plugin: { id: "seo-pro", version: "0.1.0" },
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
					.filter(([k]) => (prefix ? k.startsWith(prefix) : true))
					.map(([key, value]) => ({ key, value }));
			},
		},
		storage: {
			reports: {
				async get(id: string) {
					return reports.get(id) ?? null;
				},
				async put(id: string, data: unknown) {
					reports.set(id, data);
				},
				async delete(id: string) {
					return reports.delete(id);
				},
				async exists(id: string) {
					return reports.has(id);
				},
				async getMany(ids: string[]) {
					return new Map(ids.filter((id) => reports.has(id)).map((id) => [id, reports.get(id)]));
				},
				async putMany(items: Array<{ id: string; data: unknown }>) {
					for (const { id, data } of items) reports.set(id, data);
				},
				async deleteMany(ids: string[]) {
					return ids.filter((id) => reports.delete(id)).length;
				},
				async count() {
					return reports.size;
				},
				async query(opts: { where?: Record<string, unknown>; orderBy?: Record<string, "asc" | "desc">; limit?: number } = {}) {
					let items = [...reports.entries()].map(([id, data]) => ({ id, data }));

					function matchesWhere(data: unknown, where: Record<string, unknown>): boolean {
						return Object.entries(where).every(([k, v]) => {
							const value = (data as Record<string, unknown>)[k];
							if (v !== null && typeof v === "object" && !Array.isArray(v)) {
								const range = v as { gt?: number; gte?: number; lt?: number; lte?: number };
								if (range.gt !== undefined && !(Number(value) > range.gt)) return false;
								if (range.gte !== undefined && !(Number(value) >= range.gte)) return false;
								if (range.lt !== undefined && !(Number(value) < range.lt)) return false;
								if (range.lte !== undefined && !(Number(value) <= range.lte)) return false;
								return true;
							}
							return value === v;
						});
					}

					if (opts.where) {
						items = items.filter(({ data }) => matchesWhere(data, opts.where!));
					}

					const [field, direction] = Object.entries(opts.orderBy ?? {})[0] ?? [];
					if (field) {
						items.sort((a, b) => {
							const av = (a.data as Record<string, unknown>)[field] as number | string;
							const bv = (b.data as Record<string, unknown>)[field] as number | string;
							const cmp = av < bv ? -1 : av > bv ? 1 : 0;
							return direction === "desc" ? -cmp : cmp;
						});
					}

					const limit = opts.limit ?? 50;
					return { items: items.slice(0, limit), cursor: undefined, hasMore: items.length > limit };
				},
			},
		},
		...(options.withoutContent ? {} : { content }),
		log: {
			debug: (message: string) => logs.push({ level: "debug", message }),
			info: (message: string) => logs.push({ level: "info", message }),
			warn: (message: string) => logs.push({ level: "warn", message }),
			error: (message: string) => logs.push({ level: "error", message }),
		},
		site: { url: "https://cannelle.news", name: "Cannelle News" },
		url: (path: string) => `https://cannelle.news${path}`,
	} as unknown as PluginContext;

	return { ctx, kv, reports, entries, updates, logs };
}
