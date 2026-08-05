import type { PluginContext } from "emdash";
import { getConfig, indexEntry } from "../infrastructure/integrity";
import { toDocument } from "../infrastructure/integrity";
import { addDocument, emptyBoilerplateStats, type BoilerplateStats } from "../domain/boilerplate";

const REBUILD_STATE_KEY = "jobs:rebuild";
const LEASE_MS = 30_000;
const PAGE_SIZE = 1;

interface RebuildState {
	jobId: string;
	collectionIndex: number;
	cursor?: string;
	processed: number;
	indexed: number;
	expiresAt: number;
	boilerplate: BoilerplateStats;
}

export type RebuildOutput =
	| { status: "running"; jobId: string; processed: number; indexed: number; collection: string }
	| { status: "complete"; jobId: string; processed: number; indexed: number }
	| { status: "busy"; jobId: string; processed: number; indexed: number; retryAfterMs: number };

export async function rebuildRouteHandler(
	input: { jobId: string },
	ctx: PluginContext,
): Promise<RebuildOutput> {
	if (!ctx.content) throw new Error("Accès contenu indisponible");

	const now = Date.now();
	let state = await ctx.kv.get<RebuildState>(REBUILD_STATE_KEY);
	if (state && state.expiresAt > now && state.jobId !== input.jobId) {
		return {
			status: "busy",
			jobId: state.jobId,
			processed: state.processed,
			indexed: state.indexed,
			retryAfterMs: state.expiresAt - now,
		};
	}

	if (!state || state.expiresAt <= now || state.jobId !== input.jobId) {
		state = { jobId: input.jobId, collectionIndex: 0, processed: 0, indexed: 0, expiresAt: now + LEASE_MS, boilerplate: emptyBoilerplateStats() };
	}

	// KV ne fournit pas de compare-and-swap. Une relecture empêche tout de même
	// un demandeur écrasé par une course de commencer son traitement.
	state.expiresAt = now + LEASE_MS;
	await ctx.kv.set(REBUILD_STATE_KEY, state);
	const owner = await ctx.kv.get<RebuildState>(REBUILD_STATE_KEY);
	if (!owner || owner.jobId !== input.jobId) {
		return {
			status: "busy",
			jobId: owner?.jobId ?? "unknown",
			processed: owner?.processed ?? 0,
			indexed: owner?.indexed ?? 0,
			retryAfterMs: Math.max(0, (owner?.expiresAt ?? now) - now),
		};
	}
	state = owner;
	state.boilerplate ??= emptyBoilerplateStats();

	const config = await getConfig(ctx);
	const collection = config.collections[state.collectionIndex];
	if (!collection) {
		await ctx.kv.delete(REBUILD_STATE_KEY);
		return { status: "complete", jobId: state.jobId, processed: state.processed, indexed: state.indexed };
	}

	const page = await ctx.content.list(collection, { limit: PAGE_SIZE, cursor: state.cursor });
	for (const content of page.items) {
		addDocument(state.boilerplate, toDocument(content, collection, config).shingleHashes);
		if ((await indexEntry(ctx, content, collection)).indexed) state.indexed++;
		state.processed++;
	}

	if (page.hasMore && page.cursor) {
		state.cursor = page.cursor;
	} else {
		state.collectionIndex++;
		state.cursor = undefined;
	}

	if (state.collectionIndex >= config.collections.length) {
		await ctx.kv.set("settings:shingleDf", state.boilerplate);
		await ctx.kv.delete(REBUILD_STATE_KEY);
		return { status: "complete", jobId: state.jobId, processed: state.processed, indexed: state.indexed };
	}

	state.expiresAt = Date.now() + LEASE_MS;
	await ctx.kv.set(REBUILD_STATE_KEY, state);
	return {
		status: "running",
		jobId: state.jobId,
		processed: state.processed,
		indexed: state.indexed,
		collection: config.collections[state.collectionIndex],
	};
}
