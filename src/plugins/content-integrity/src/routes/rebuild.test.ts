import type { PluginContext } from "emdash";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getConfigMock, indexEntryMock } = vi.hoisted(() => ({
	getConfigMock: vi.fn(),
	indexEntryMock: vi.fn(),
}));

vi.mock("../infrastructure/integrity", () => ({
	getConfig: getConfigMock,
	indexEntry: indexEntryMock,
	toDocument: (content: { id?: string }) => ({ shingleHashes: [String(content.id ?? "").length + 1] }),
}));

import { rebuildRouteHandler } from "./rebuild";

function createContext() {
	const kv = new Map<string, unknown>();
	const calls: Array<{ collection: string; limit?: number; cursor?: string }> = [];
	const content = {
		posts: [{ id: "p1" }, { id: "p2" }],
		pages: [{ id: "g1" }],
	};
	const ctx = {
		kv: {
			get: async <T,>(key: string) => (kv.get(key) as T | undefined) ?? null,
			set: async (key: string, value: unknown) => { kv.set(key, value); },
			delete: async (key: string) => kv.delete(key),
		},
		content: {
			list: async (collection: "posts" | "pages", options: { limit?: number; cursor?: string }) => {
				calls.push({ collection, ...options });
				const offset = Number(options.cursor ?? 0);
				const items = content[collection].slice(offset, offset + (options.limit ?? 100));
				const next = offset + items.length;
				return {
					items,
					cursor: next < content[collection].length ? String(next) : undefined,
					hasMore: next < content[collection].length,
				};
			},
		},
	} as unknown as PluginContext;
	return { ctx, kv, calls };
}

describe("rebuildRouteHandler", () => {
	beforeEach(() => {
		getConfigMock.mockReset().mockResolvedValue({ collections: ["posts", "pages"] });
		indexEntryMock.mockReset().mockResolvedValue({ indexed: true, matches: 0 });
	});

	it("traite un seul contenu par tick et reprend jusqu'à la fin", async () => {
		const { ctx, kv, calls } = createContext();
		let result = await rebuildRouteHandler({ jobId: "job-primary" }, ctx);

		expect(result).toMatchObject({ status: "running", processed: 1, indexed: 1 });
		while (result.status === "running") {
			result = await rebuildRouteHandler({ jobId: "job-primary" }, ctx);
		}

		expect(result).toMatchObject({ status: "complete", processed: 3, indexed: 3 });
		expect(calls).toHaveLength(3);
		expect(calls.every((call) => call.limit === 1)).toBe(true);
		expect(kv.has("jobs:rebuild")).toBe(false);
	});

	it("refuse un second job tant que le bail du premier est actif", async () => {
		const { ctx } = createContext();
		await rebuildRouteHandler({ jobId: "job-primary" }, ctx);

		await expect(rebuildRouteHandler({ jobId: "job-secondary" }, ctx)).resolves.toMatchObject({
			status: "busy",
			jobId: "job-primary",
			processed: 1,
		});
		expect(indexEntryMock).toHaveBeenCalledTimes(1);
	});
});
