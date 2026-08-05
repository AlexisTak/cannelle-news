import { describe, expect, it } from "vitest";
import { createMockPluginContext } from "../../test/mock-ctx";
import { createGlossaryStore } from "../store/glossary-store";
import { rehydrateTermRouteHandler } from "./rehydrate";

describe("rehydrateTermRouteHandler", () => {
	it("met à jour les marks existantes par pages bornées", async () => {
		const base = createMockPluginContext();
		await createGlossaryStore(base).save({ id: "ia", term: "IA", definition: "Définition fraîche", fullUrl: null, aliases: [] });
		const updates: unknown[] = [];
		const ctx = Object.assign(base, { content: {
			list: async () => ({ items: [{ id: "post-1", data: { content: [{ _type: "block", children: [], markDefs: [{ _type: "glossaryTerm", _key: "m", termId: "ia", term: "IA", definition: "Ancienne", fullUrl: null }] }] } }], hasMore: false }),
			update: async (_collection: string, _id: string, data: unknown) => { updates.push(data); return {}; },
		} });
		const result = await rehydrateTermRouteHandler({ termId: "ia" }, ctx, ["posts"]);
		expect(result.done).toBe(true);
		expect(updates).toHaveLength(1);
		expect(JSON.stringify(updates[0])).toContain("Définition fraîche");
	});
});
