import type { PluginContext, PortableTextBlock } from "emdash";
import { hydrateGlossaryMarks } from "../lib/portable-text";
import { createGlossaryStore } from "../store/glossary-store";

const PAGE_SIZE = 5;

export async function rehydrateTermRouteHandler(
	input: { termId: string; collectionIndex?: number; cursor?: string },
	ctx: PluginContext,
	collections: string[],
) {
	if (!ctx.content?.update) throw new Error("La capacité content:write est indisponible");
	const term = await createGlossaryStore(ctx).get(input.termId);
	if (!term) throw new Error("Terme introuvable");
	const collectionIndex = input.collectionIndex ?? 0;
	const collection = collections[collectionIndex];
	if (!collection) return { processed: 0, updated: 0, done: true as const };

	const page = await ctx.content.list(collection, { limit: PAGE_SIZE, cursor: input.cursor });
	let updated = 0;
	for (const item of page.items) {
		const body = item.data?.content as PortableTextBlock[] | undefined;
		if (!body?.length) continue;
		const hydrated = hydrateGlossaryMarks(body, [term]);
		if (JSON.stringify(hydrated) !== JSON.stringify(body)) {
			await ctx.content.update(collection, item.id, { content: hydrated });
			updated++;
		}
	}
	if (page.hasMore && page.cursor) return { processed: page.items.length, updated, done: false as const, collectionIndex, cursor: page.cursor };
	const next = collectionIndex + 1;
	return { processed: page.items.length, updated, done: next >= collections.length, collectionIndex: next, cursor: undefined };
}
