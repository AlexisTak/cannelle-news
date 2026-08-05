import { definePlugin, type PluginDescriptor } from "emdash";
import { z } from "astro/zod";
import type { MatchStatus } from "./domain/types";
import { checkDocument, getConfig, indexEntry, purgeEntry, reviewMatch, setConfig, toDocument } from "./infrastructure/integrity";
import { toRouteResult } from "./routes/result";
import { rebuildRouteHandler } from "./routes/rebuild";

export const PLUGIN_ID = "content-integrity";
export const PLUGIN_VERSION = "0.1.0";

const collectionSchema = z.string().min(1).max(64).regex(/^[a-z][a-z0-9_-]*$/);
const idSchema = z.string().min(1).max(200);
const checkSchema = z.object({ collection: collectionSchema.default("posts"), entryId: idSchema }).strict();
const matchesSchema = z.object({
	status: z.enum(["new", "confirmed", "dismissed"]).optional(),
	severity: z.enum(["low", "medium", "high", "critical"]).optional(),
	cursor: z.string().max(500).optional(),
	limit: z.number().int().min(1).max(100).default(50),
}).strict();
const matchSchema = z.object({ id: idSchema }).strict();
const reviewSchema = z.object({ id: idSchema, status: z.enum(["new", "confirmed", "dismissed"]) }).strict();
const thresholdsSchema = z.object({
	ignore: z.number().min(0).max(1).optional(), low: z.number().min(0).max(1).optional(),
	medium: z.number().min(0).max(1).optional(), high: z.number().min(0).max(1).optional(),
}).strict();
const settingsSchema = z.object({ patch: z.object({
	collections: z.array(collectionSchema).min(1).max(20).optional(),
	shingleWidth: z.number().int().min(2).max(12).optional(), signatureSize: z.number().int().min(16).max(512).optional(),
	bandRows: z.number().int().min(1).max(16).optional(), candidateLimit: z.number().int().min(1).max(100).optional(),
	thresholds: thresholdsSchema.optional(),
}).strict().optional() }).strict();

export function contentIntegrityPlugin(): PluginDescriptor {
	return {
		id: PLUGIN_ID, version: PLUGIN_VERSION, format: "native",
		entrypoint: "@cannelle/plugin-content-integrity", adminEntry: "@cannelle/plugin-content-integrity/admin",
		adminPages: [{ path: "/integrity", label: "Intégrité éditoriale", icon: "shield-check" }],
		adminWidgets: [{ id: "integrity-overview", title: "Intégrité éditoriale", size: "half" }],
		fieldWidgets: [{ name: "integrity", label: "Contrôle d’intégrité", fieldTypes: ["json"] }],
	};
}

export function createPlugin() {
	return definePlugin({
		id: PLUGIN_ID, version: PLUGIN_VERSION,
		capabilities: ["content:read"],
		storage: {
			fingerprints: { indexes: ["collection", "contentHash", "updatedAt"] },
			bands: { indexes: ["bandHash", "entryId", ["bandHash", "bandIndex"]] },
			matches: { indexes: ["status", "severity", "sourceId", "targetId", "updatedAt", ["status", "severity"]] },
			watch: { indexes: ["status", "nextCheckAt"] },
		},
		admin: {
			entry: "@cannelle/plugin-content-integrity/admin",
			pages: [{ path: "/integrity", label: "Intégrité éditoriale", icon: "shield-check" }],
			widgets: [{ id: "integrity-overview", title: "Intégrité éditoriale", size: "half" }],
			fieldWidgets: [{ name: "integrity", label: "Contrôle d’intégrité", fieldTypes: ["json"] }],
		},
		routes: {
			check: { input: checkSchema, handler: async (ctx) => toRouteResult(async () => {
				const input = ctx.input as { collection?: string; entryId?: string };
				const collection = input.collection ?? "posts";
				if (!input.entryId || !ctx.content) throw new Error("entryId requis");
				const content = await ctx.content.get(collection, input.entryId);
				if (!content) throw new Error("Article introuvable");
				return checkDocument(ctx, toDocument(content, collection, await getConfig(ctx)), false);
			}) },
			matches: { input: matchesSchema, handler: async (ctx) => toRouteResult(async () => {
				const input = ctx.input as { status?: MatchStatus; severity?: string; cursor?: string; limit?: number };
				const where: Record<string, unknown> = {};
				if (input.status) where.status = input.status;
				if (input.severity) where.severity = input.severity;
				return (ctx.storage as any).matches.query({ where, orderBy: { updatedAt: "desc" }, limit: Math.min(100, Math.max(1, input.limit ?? 50)), cursor: input.cursor });
			}) },
			match: { input: matchSchema, handler: async (ctx) => toRouteResult(async () => {
				const id = String((ctx.input as any).id ?? "");
				const item = await (ctx.storage as any).matches.get(id);
				if (!item) throw new Error("Constat introuvable");
				return item.data ?? item;
			}) },
			review: { input: reviewSchema, handler: async (ctx) => toRouteResult(() => {
				const input = ctx.input as { id: string; status: MatchStatus };
				if (!["new", "confirmed", "dismissed"].includes(input.status)) throw new Error("Statut invalide");
				return reviewMatch(ctx, input.id, input.status);
			}) },
			settings: { input: settingsSchema, handler: async (ctx) => toRouteResult(async () => {
				const patch = (ctx.input as any).patch;
				const config = patch ? await setConfig(ctx, patch) : await getConfig(ctx);
				return { config, indexSize: await (ctx.storage as any).fingerprints.count(), matchCount: await (ctx.storage as any).matches.count() };
			}) },
			rebuild: {
				input: z.object({ jobId: z.string().min(8).max(100) }).strict(),
				handler: async (ctx) => toRouteResult(() =>
					rebuildRouteHandler(ctx.input as { jobId: string }, ctx),
				),
			},
		},
		hooks: {
			"content:afterSave": { priority: 100, errorPolicy: "continue", timeout: 5000, handler: async (event, ctx) => { if (event.content.status === "published") await indexEntry(ctx, event.content, event.collection); } },
			"content:afterPublish": { priority: 100, errorPolicy: "continue", timeout: 5000, handler: async (event, ctx) => { await indexEntry(ctx, event.content, event.collection); } },
			"content:afterRestore": { priority: 100, errorPolicy: "continue", timeout: 5000, handler: async (event, ctx) => { if (event.content.status === "published") await indexEntry(ctx, event.content, event.collection); } },
			"content:afterUnpublish": { priority: 100, errorPolicy: "continue", timeout: 5000, handler: async (event, ctx) => { const id = String(event.content.id ?? ""); if (id) await purgeEntry(ctx, id); } },
			"content:afterDelete": { priority: 100, errorPolicy: "continue", timeout: 5000, handler: async (event, ctx) => { if (event.id) await purgeEntry(ctx, event.id); } },
		},
	});
}

export default createPlugin;
