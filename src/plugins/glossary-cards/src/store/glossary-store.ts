import type { PluginContext } from "emdash";
import type { GlossaryTerm } from "../lib/types";

const PAGE_SIZE = 100;

interface StorageCollection {
	get(id: string): Promise<unknown | null>;
	putMany(items: Array<{ id: string; data: unknown }>): Promise<void>;
	deleteMany(ids: string[]): Promise<number>;
	count(): Promise<number>;
	query(opts: {
		where?: Record<string, unknown>;
		limit?: number;
		cursor?: string;
	}): Promise<{ items: Array<{ id: string; data: unknown }>; cursor?: string; hasMore: boolean }>;
}

function normalizeTerm(term: string): string {
	return term
		.toLowerCase()
		.normalize("NFD")
		.replace(/[̀-ͯ]/g, "")
		.trim();
}

export function createGlossaryStore(ctx: PluginContext) {
	const collection = (ctx.storage as unknown as Record<string, StorageCollection>).terms;

	const store = {
		async list(): Promise<GlossaryTerm[]> {
			const terms: GlossaryTerm[] = [];
			let cursor: string | undefined;
			do {
				const page = await collection.query({ limit: PAGE_SIZE, cursor });
				terms.push(...page.items.map((item) => item.data as GlossaryTerm));
				cursor = page.cursor;
			} while (cursor);
			return terms;
		},

		async get(id: string): Promise<GlossaryTerm | null> {
			const item = await collection.get(id);
			return item ? (item as GlossaryTerm) : null;
		},

		async findByTerm(term: string): Promise<GlossaryTerm | null> {
			const normalized = normalizeTerm(term);
			const all = await store.list();
			return (
				all.find((t) => {
					const candidates = [t.term, ...t.aliases].map(normalizeTerm);
					return candidates.includes(normalized);
				}) ?? null
			);
		},

		async save(input: Omit<GlossaryTerm, "createdAt" | "updatedAt"> & { id: string }): Promise<void> {
			const now = new Date().toISOString();
			const existing = await store.get(input.id);
			const term: GlossaryTerm = {
				...input,
				createdAt: existing?.createdAt ?? now,
				updatedAt: now,
			};
			await collection.putMany([{ id: term.id, data: term }]);
		},

		async delete(id: string): Promise<boolean> {
			const count = await collection.deleteMany([id]);
			return count > 0;
		},

		count(): Promise<number> {
			return collection.count();
		},
	};

	return store;
}
