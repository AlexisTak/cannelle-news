import { z } from "astro/zod";
import type { PluginContext } from "emdash";
import { buildUrlToTargetMap, extractInternalLinkTargets } from "../infrastructure/link-audit";
import { contentItemToEntry, toLinkerEntry } from "../infrastructure/content-loader";
import { createKeywordIndexStore } from "../infrastructure/keyword-index-store";
import { createKvConfigStore } from "../infrastructure/kv-config";

export const auditInputSchema = z.object({
	threshold: z
		.object({
			incoming: z.number().int().min(0).optional(),
			outgoing: z.number().int().min(0).optional(),
		})
		.optional(),
	cursor: z.string().optional(),
	limit: z.number().int().min(1).max(200).optional(),
});

export type AuditInput = z.infer<typeof auditInputSchema>;

export interface AuditItem {
	id: string;
	collection: string;
	slug: string | null;
	title: string;
	incomingCount: number;
	outgoingCount: number;
	status: "orphan" | "poorly-linked" | "ok";
}

export interface AuditSummary {
	total: number;
	orphanCount: number;
	poorlyLinkedCount: number;
	unlinkedCount: number;
	zeroIncoming: number;
	zeroOutgoing: number;
}

export interface AuditOutput {
	summary: AuditSummary;
	items: AuditItem[];
	threshold: { incoming: number; outgoing: number };
	hasMore: boolean;
	cursor?: string;
}

/** Nombre d'articles analysés avant de rendre la main à l'évent loop. */
const CPU_YIELD_EVERY = 20;

function yieldCpu(): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, 0));
}

/**
 * Audite le maillage interne des articles publiés.
 *
 * Un article est considéré :
 * - "orphan" quand il a moins de `threshold.incoming` liens entrants **et**
 *   moins de `threshold.outgoing` liens sortants internes ;
 * - "poorly-linked" quand seulement l'une des deux conditions est vraie ;
 * - "ok" sinon.
 *
 * Le scan porte sur toutes les collections analysables configurées. Il
 * s'arrête temporairement sur les articles pour ne pas bloquer le worker.
 */
export async function auditRouteHandler(input: AuditInput, ctx: PluginContext): Promise<AuditOutput> {
	const config = await createKvConfigStore(ctx).get();
	const appliedThreshold = {
		incoming: input.threshold?.incoming ?? 1,
		outgoing: input.threshold?.outgoing ?? 1,
	};
	const indexStore = createKeywordIndexStore(ctx);

	const allKeywords = await indexStore.all();
	const urlToTargetMap = buildUrlToTargetMap(allKeywords);

	const incomingByTarget = new Map<string, number>();
	const outgoingBySource = new Map<
		string,
		{ id: string; collection: string; slug: string | null; title: string; count: number }
	>();

	let scanned = 0;

	for (const collection of config.analyzableCollections) {
		let cursor: string | undefined;

		do {
			const page = await ctx.content?.list(collection, {
				where: { status: "published" },
				limit: 100,
				cursor,
			});
			if (!page) break;

			for (const item of page.items) {
				const entry = toLinkerEntry(contentItemToEntry(item), collection);
				if (!entry.id) continue;

				const targets = extractInternalLinkTargets(
					entry.body,
					config.siteUrl ?? null,
					urlToTargetMap,
					entry.id,
				);
				outgoingBySource.set(entry.id, {
					id: entry.id,
					collection,
					slug: entry.slug,
					title: entry.title,
					count: targets.length,
				});

				for (const targetId of targets) {
					incomingByTarget.set(targetId, (incomingByTarget.get(targetId) ?? 0) + 1);
				}

				scanned++;
				if (scanned % CPU_YIELD_EVERY === 0) await yieldCpu();
			}

			cursor = page.cursor ?? undefined;
		} while (cursor);
	}

	const allItems: AuditItem[] = [];
	for (const source of outgoingBySource.values()) {
		const incomingCount = incomingByTarget.get(source.id) ?? 0;
		const outgoingCount = source.count;

		let status: AuditItem["status"] = "ok";
		const lowIncoming = incomingCount < appliedThreshold.incoming;
		const lowOutgoing = outgoingCount < appliedThreshold.outgoing;
		if (lowIncoming && lowOutgoing) status = "orphan";
		else if (lowIncoming || lowOutgoing) status = "poorly-linked";

		allItems.push({
			id: source.id,
			collection: source.collection,
			slug: source.slug,
			title: source.title,
			incomingCount,
			outgoingCount,
			status,
		});
	}

	// Tri stable par statut décroissant puis par nombre de liens entrants.
	allItems.sort((a, b) => {
		const order = { orphan: 0, "poorly-linked": 1, ok: 2 };
		if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status];
		return a.incomingCount - b.incomingCount;
	});

	const summary: AuditSummary = {
		total: allItems.length,
		orphanCount: allItems.filter((i) => i.status === "orphan").length,
		poorlyLinkedCount: allItems.filter((i) => i.status === "poorly-linked").length,
		unlinkedCount: allItems.filter((i) => i.outgoingCount < appliedThreshold.outgoing).length,
		zeroIncoming: allItems.filter((i) => i.incomingCount === 0).length,
		zeroOutgoing: allItems.filter((i) => i.outgoingCount === 0).length,
	};

	const offset = input.cursor ? Number(input.cursor) : 0;
	const limit = input.limit ?? 50;
	const pageItems = allItems.slice(offset, offset + limit);
	const nextOffset = offset + pageItems.length;
	const hasMore = nextOffset < allItems.length;

	return {
		summary,
		items: pageItems,
		threshold: appliedThreshold,
		hasMore,
		cursor: hasMore ? String(nextOffset) : undefined,
	};
}
