import { z } from "astro/zod";
import type { PluginContext } from "emdash";
import { contentItemToEntry } from "../infrastructure/content-loader";
import { indexEntry } from "../infrastructure/index-entry";
import { createKvConfigStore } from "../infrastructure/kv-config";
import { createKeywordIndexStore } from "../infrastructure/keyword-index-store";

const PAGE_SIZE = 5;
const LEASE_MS = 30_000;
const REBUILD_STATE_KEY = "jobs:rebuild";

export const rebuildInputSchema = z.object({
	jobId: z.string().min(8).max(100),
}).strict();

export type RebuildInput = z.infer<typeof rebuildInputSchema>;

interface RebuildState {
	jobId: string;
	collectionIndex: number;
	cursor?: string;
	entriesProcessed: number;
	keywordsIndexed: number;
	staleCollections: string[];
	expiresAt: number;
}

export type RebuildOutput =
	| { status: "running"; jobId: string; entriesProcessed: number; keywordsIndexed: number; collection: string }
	| { status: "complete"; jobId: string; entriesProcessed: number; keywordsIndexed: number }
	| { status: "busy"; jobId: string; entriesProcessed: number; keywordsIndexed: number; retryAfterMs: number };

export async function rebuildRouteHandler(
	input: RebuildInput,
	ctx: PluginContext,
): Promise<RebuildOutput> {
	if (!ctx.content) throw new Error("Accès contenu indisponible");

	const now = Date.now();
	let state = await ctx.kv.get<RebuildState>(REBUILD_STATE_KEY);
	if (state && state.expiresAt > now && state.jobId !== input.jobId) {
		return {
			status: "busy",
			jobId: state.jobId,
			entriesProcessed: state.entriesProcessed,
			keywordsIndexed: state.keywordsIndexed,
			retryAfterMs: state.expiresAt - now,
		};
	}

	if (!state || state.expiresAt <= now || state.jobId !== input.jobId) {
		state = {
			jobId: input.jobId,
			collectionIndex: 0,
			entriesProcessed: 0,
			keywordsIndexed: 0,
			staleCollections: await ctx.kv.get<string[]>("jobs:staleCollections") ?? [],
			expiresAt: now + LEASE_MS,
		};
	}

	state.expiresAt = now + LEASE_MS;
	await ctx.kv.set(REBUILD_STATE_KEY, state);
	const owner = await ctx.kv.get<RebuildState>(REBUILD_STATE_KEY);
	if (!owner || owner.jobId !== input.jobId) {
		return {
			status: "busy",
			jobId: owner?.jobId ?? "unknown",
			entriesProcessed: owner?.entriesProcessed ?? 0,
			keywordsIndexed: owner?.keywordsIndexed ?? 0,
			retryAfterMs: Math.max(0, (owner?.expiresAt ?? now) - now),
		};
	}
	state = owner;
	state.staleCollections ??= [];
	if (state.staleCollections.length) {
		const stale = state.staleCollections[0];
		const cleanup = await createKeywordIndexStore(ctx).purgeCollectionPage(stale);
		if (!cleanup.hasMore) state.staleCollections.shift();
		await ctx.kv.set("jobs:staleCollections", state.staleCollections);
		state.expiresAt = Date.now() + LEASE_MS;
		await ctx.kv.set(REBUILD_STATE_KEY, state);
		return { status: "running", jobId: state.jobId, entriesProcessed: state.entriesProcessed, keywordsIndexed: state.keywordsIndexed, collection: `cleanup:${stale}` };
	}

	const config = await createKvConfigStore(ctx).get();
	const collection = config.analyzableCollections[state.collectionIndex];
	if (!collection) {
		await ctx.kv.delete(REBUILD_STATE_KEY);
		return complete(state);
	}

	const page = await ctx.content.list(collection, {
		where: { status: "published" },
		limit: PAGE_SIZE,
		cursor: state.cursor,
	});
	for (const item of page.items) {
		state.keywordsIndexed += await indexEntry(ctx, contentItemToEntry(item), collection);
		state.entriesProcessed++;
	}

	if (page.hasMore && page.cursor) {
		state.cursor = page.cursor;
	} else {
		state.collectionIndex++;
		state.cursor = undefined;
	}

	if (state.collectionIndex >= config.analyzableCollections.length) {
		await ctx.kv.delete(REBUILD_STATE_KEY);
		ctx.log.info(
			`[auto-internal-linker] index reconstruit : ${state.entriesProcessed} articles, ${state.keywordsIndexed} mots-clés`,
		);
		return complete(state);
	}

	state.expiresAt = Date.now() + LEASE_MS;
	await ctx.kv.set(REBUILD_STATE_KEY, state);
	return {
		status: "running",
		jobId: state.jobId,
		entriesProcessed: state.entriesProcessed,
		keywordsIndexed: state.keywordsIndexed,
		collection: config.analyzableCollections[state.collectionIndex],
	};
}

function complete(state: RebuildState): Extract<RebuildOutput, { status: "complete" }> {
	return {
		status: "complete",
		jobId: state.jobId,
		entriesProcessed: state.entriesProcessed,
		keywordsIndexed: state.keywordsIndexed,
	};
}
