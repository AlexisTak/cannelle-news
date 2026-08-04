import type { PluginContext } from "emdash";

export interface MockEntry {
	id: string;
	slug?: string | null;
	updatedAt?: string;
	data: Record<string, unknown>;
}

export interface MockCtxOptions {
	kv?: Record<string, unknown>;
	/** Entrées de contenu, indexées par `"<collection>/<id>"`. */
	entries?: Record<string, MockEntry>;
	/** Réponse rendue par `ctx.http.fetch`, ou fonction pour varier par appel. */
	httpResponse?: Response | (() => Response);
	/** Omettre `ctx.content` pour simuler une capability absente. */
	withoutContent?: boolean;
	/** Omettre `ctx.http` pour simuler l'absence de `network:request`. */
	withoutHttp?: boolean;
}

/**
 * `PluginContext` minimal en mémoire.
 *
 * Ne couvre que `kv`, `content`, `http` et `log` — les seules surfaces que le
 * plugin touche. Le reste est laissé absent volontairement : une route qui
 * commencerait à lire `ctx.media` doit échouer bruyamment en test plutôt
 * qu'être silencieusement satisfaite par un bouchon vide.
 *
 * `httpCalls` est exposé pour vérifier ce qui part sur le réseau sans recourir
 * à un espion — le dépôt n'utilise ni `vi.fn()` ni mocks.
 */
export function createMockCtx(options: MockCtxOptions = {}) {
	const kv = new Map<string, unknown>(Object.entries(options.kv ?? {}));
	const entries = new Map<string, MockEntry>(Object.entries(options.entries ?? {}));
	const logs: Array<{ level: string; message: string }> = [];
	const httpCalls: Array<{ url: string; init?: RequestInit }> = [];
	const updates: Array<{ collection: string; id: string; data: Record<string, unknown> }> = [];

	const content = {
		async get(collection: string, id: string) {
			return entries.get(`${collection}/${id}`) ?? null;
		},
		async update(collection: string, id: string, data: Record<string, unknown>) {
			const key = `${collection}/${id}`;
			const existing = entries.get(key);
			if (!existing) throw new Error(`entrée ${key} introuvable`);
			updates.push({ collection, id, data });
			// Reproduit la sémantique EmDash : `seo` est extrait et routé vers
			// une table séparée, il ne se mélange pas aux champs de `data`.
			const { seo, ...fields } = data;
			const next: MockEntry = {
				...existing,
				data: { ...existing.data, ...fields },
			};
			if (seo) (next as unknown as Record<string, unknown>).seo = seo;
			entries.set(key, next);
			return next;
		},
		async list(
			collection: string,
			options: { where?: Record<string, unknown>; limit?: number; cursor?: string },
		) {
			const limit = options.limit ?? 50;
			const all = [...entries.entries()]
				.filter(([key, entry]) => {
					if (!key.startsWith(`${collection}/`)) return false;
					if (!options.where) return true;
					if (options.where.status && (entry as unknown as Record<string, unknown>).status !== options.where.status) {
						return false;
					}
					return true;
				})
				.map(([, entry]) => entry);

			let start = 0;
			if (options.cursor) {
				const index = Number(options.cursor);
				if (!Number.isNaN(index)) start = index;
			}
			const pageItems = all.slice(start, start + limit);
			const nextCursor = start + pageItems.length < all.length ? String(start + pageItems.length) : undefined;
			return { items: pageItems, cursor: nextCursor };
		},
	};

	const http = {
		async fetch(url: string, init?: RequestInit) {
			httpCalls.push({ url, init });
			const response = options.httpResponse ?? new Response("{}", { status: 200 });
			return typeof response === "function" ? response() : response;
		},
	};

	const ctx = {
		plugin: { id: "ai-editorial-assistant", version: "0.1.0" },
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
		content: options.withoutContent ? undefined : content,
		http: options.withoutHttp ? undefined : http,
		log: {
			debug: (message: string) => logs.push({ level: "debug", message }),
			info: (message: string) => logs.push({ level: "info", message }),
			warn: (message: string) => logs.push({ level: "warn", message }),
			error: (message: string) => logs.push({ level: "error", message }),
		},
		site: { url: "https://cannelle.news", name: "Cannelle News" },
		url: (path: string) => `https://cannelle.news${path}`,
	} as unknown as PluginContext;

	return { ctx, kv, entries, logs, httpCalls, updates };
}

/** Réponse JSON prête à l'emploi pour `httpResponse`. */
export function jsonResponse(body: unknown, status = 200): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { "Content-Type": "application/json" },
	});
}

/** Réponse d'un modèle Ollama, forme `{ message: { content } }`. */
export function ollamaResponse(content: string): Response {
	return jsonResponse({ message: { content } });
}
