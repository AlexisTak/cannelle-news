import type { PluginContext } from "emdash";
import { alignPassages } from "../compare/align";
import { compareSets } from "../compare/containment";
import { severityFor } from "../compare/verdict";
import { assertValidConfig, mergeConfig, type IntegrityConfig } from "../domain/config";
import type { Fingerprint, Match, MatchStatus } from "../domain/types";
import { filterBoilerplate, type BoilerplateStats } from "../domain/boilerplate";
import { createBands } from "../fingerprint/bands";
import { fingerprintText } from "../fingerprint/document";
import { extractText } from "../text/portable-text";
import { excludeQuotedText } from "../text/quotes";

const CONFIG_KEY = "settings:integrityConfig";

type Ctx = PluginContext & { storage: Record<string, any> };

export async function getConfig(ctx: PluginContext): Promise<IntegrityConfig> {
	return mergeConfig((await ctx.kv.get<Partial<IntegrityConfig>>(CONFIG_KEY)) ?? {});
}

export async function setConfig(ctx: PluginContext, patch: Partial<IntegrityConfig>) {
	const config = mergeConfig(patch);
	assertValidConfig(config);
	await ctx.kv.set(CONFIG_KEY, config);
	return config;
}

export function toDocument(content: any, collection: string, config: IntegrityConfig): Fingerprint {
	const data = (content?.data ?? content ?? {}) as Record<string, unknown>;
	const text = excludeQuotedText(extractText(data.content).text);
	const computed = fingerprintText(text, config);
	return {
		id: String(content?.id ?? data.id ?? ""), collection, title: String(data.title ?? "Sans titre"),
		slug: String(content?.slug ?? data.slug ?? content?.id ?? ""), text, ...computed, updatedAt: new Date().toISOString(),
	};
}

function matchId(a: string, b: string) { return [a, b].sort().join("--"); }

async function candidateIds(ctx: Ctx, document: Fingerprint, config: IntegrityConfig) {
	const ids = new Set<string>();
	for (const band of createBands(document.signature, config.bandRows)) {
		const result = await ctx.storage.bands.query({ where: { bandHash: band.bandHash }, limit: 200 });
		for (const item of result.items) {
			const id = String(item.data.entryId ?? "");
			if (id && id !== document.id) ids.add(id);
			if (ids.size >= config.candidateLimit) return [...ids];
		}
	}
	return [...ids];
}

export async function checkDocument(ctx: PluginContext, document: Fingerprint, persist = true): Promise<Match[]> {
	const typed = ctx as Ctx, config = await getConfig(ctx), matches: Match[] = [];
	const boilerplate = await ctx.kv.get<BoilerplateStats>("settings:shingleDf");
	const sourceHashes = filterBoilerplate(document.shingleHashes, boilerplate);
	for (const id of await candidateIds(typed, document, config)) {
		const candidateItem = await typed.storage.fingerprints.get(id);
		if (!candidateItem) continue;
		const candidate = (candidateItem.data ?? candidateItem) as Fingerprint;
		const comparison = compareSets(sourceHashes, filterBoilerplate(candidate.shingleHashes, boilerplate));
		const score = Math.max(comparison.sourceContainment, comparison.targetContainment);
		const severity = severityFor(score, config);
		if (!severity) continue;
		const passages = alignPassages(document.text, candidate.text);
		const idPair = matchId(document.id, candidate.id), previousItem = await typed.storage.matches.get(idPair);
		const previous = (previousItem?.data ?? previousItem) as Match | null;
		const sameVersions = previous?.sourceHash === document.contentHash && previous?.targetHash === candidate.contentHash;
		const now = new Date().toISOString();
		const match: Match = {
			id: idPair, sourceId: document.id, targetId: candidate.id, sourceTitle: document.title, targetTitle: candidate.title,
			sourceSlug: document.slug, targetSlug: candidate.slug, score, severity,
			status: sameVersions ? previous.status : "new", sourceExcerpt: passages[0]?.source ?? document.text.slice(0, 280),
			targetExcerpt: passages[0]?.target ?? candidate.text.slice(0, 280), sourceHash: document.contentHash,
			targetHash: candidate.contentHash, createdAt: previous?.createdAt ?? now, updatedAt: now,
		};
		if (persist) await typed.storage.matches.put(match.id, match);
		matches.push(match);
	}
	return matches.sort((a, b) => b.score - a.score);
}

export async function indexEntry(ctx: PluginContext, content: any, collection: string) {
	const config = await getConfig(ctx);
	if (!config.collections.includes(collection) || content?.status !== "published") return { indexed: false, matches: 0 };
	const typed = ctx as Ctx, document = toDocument(content, collection, config);
	if (!document.id || !document.text) return { indexed: false, matches: 0 };
	const oldItem = await typed.storage.fingerprints.get(document.id);
	const old = (oldItem?.data ?? oldItem) as Fingerprint | null;
	if (old?.contentHash === document.contentHash) return { indexed: false, matches: 0 };
	await purgeBands(typed, document.id);
	await typed.storage.fingerprints.put(document.id, document);
	await typed.storage.bands.putMany(createBands(document.signature, config.bandRows).map((band) => ({ id: `${document.id}:${band.bandIndex}`, data: { ...band, entryId: document.id } })));
	const matches = await checkDocument(ctx, document, true);
	return { indexed: true, matches: matches.length };
}

async function purgeBands(ctx: Ctx, entryId: string) {
	const result = await ctx.storage.bands.query({ where: { entryId }, limit: 200 });
	if (result.items.length) await ctx.storage.bands.deleteMany(result.items.map((item: any) => item.id));
}

export async function purgeEntry(ctx: PluginContext, entryId: string) {
	const typed = ctx as Ctx;
	await purgeBands(typed, entryId);
	await typed.storage.fingerprints.delete(entryId);
	for (const key of ["sourceId", "targetId"]) {
		for (;;) {
			// Repartir de la première page après chaque suppression évite de sauter
			// des lignes lorsque le curseur est fondé sur un offset.
			const found = await typed.storage.matches.query({ where: { [key]: entryId }, limit: 100 });
			if (!found.items.length) break;
			const deleted = await typed.storage.matches.deleteMany(found.items.map((item: any) => item.id));
			if (!deleted) throw new Error("Impossible de purger les constats d’intégrité");
		}
	}
}

export async function reviewMatch(ctx: PluginContext, id: string, status: MatchStatus) {
	const store = (ctx as Ctx).storage.matches, item = await store.get(id);
	if (!item) throw new Error("Constat introuvable");
	const match = { ...(item.data ?? item), status, updatedAt: new Date().toISOString() };
	await store.put(id, match);
	return match as Match;
}
