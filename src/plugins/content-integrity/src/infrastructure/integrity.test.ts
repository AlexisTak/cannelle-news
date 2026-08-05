import { describe, expect, it } from "vitest";
import { createMockIntegrityContext } from "../../test/mock-ctx";
import type { Match } from "../domain/types";
import { indexEntry, purgeEntry, reviewMatch } from "./integrity";

const shared = "La rédaction indépendante a vérifié chaque document auprès de trois sources distinctes avant de publier cette enquête importante pour ses lecteurs.";

function article(id: string, text = shared) {
	return {
		id,
		slug: id,
		status: "published",
		data: {
			title: `Article ${id}`,
			content: [{ _type: "block", style: "normal", children: [{ _type: "span", text }] }],
		},
	};
}

describe("cycle d'intégrité", () => {
	it("indexe, préserve un rejet sans changement, rouvre après édition puis purge", async () => {
		const { ctx, records } = createMockIntegrityContext();
		await indexEntry(ctx, article("a"), "posts");
		const second = await indexEntry(ctx, article("b"), "posts");

		expect(second.matches).toBeGreaterThan(0);
		expect(records.matches.size).toBe(1);
		const [matchId] = records.matches.keys();
		await reviewMatch(ctx, matchId, "dismissed");
		expect((records.matches.get(matchId) as unknown as Match).status).toBe("dismissed");

		const unchanged = await indexEntry(ctx, article("b"), "posts");
		expect(unchanged).toEqual({ indexed: false, matches: 0 });
		expect((records.matches.get(matchId) as unknown as Match).status).toBe("dismissed");

		await indexEntry(ctx, article("b", `${shared} Une information complémentaire modifie cette nouvelle version.`), "posts");
		expect((records.matches.get(matchId) as unknown as Match).status).toBe("new");

		await purgeEntry(ctx, "a");
		expect(records.fingerprints.has("a")).toBe(false);
		expect([...records.bands.values()].some((band) => band.entryId === "a")).toBe(false);
		expect(records.matches.size).toBe(0);
	});

	it("purge plus de 200 constats sans en laisser d'orphelins", async () => {
		const { ctx, records } = createMockIntegrityContext();
		for (let index = 0; index < 250; index++) {
			records.matches.set(`match-${index}`, { sourceId: "a", targetId: `target-${index}` });
		}

		await purgeEntry(ctx, "a");
		expect(records.matches.size).toBe(0);
	});
});
