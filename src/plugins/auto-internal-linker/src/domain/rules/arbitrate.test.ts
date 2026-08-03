import { describe, expect, it } from "vitest";
import type { IndexedKeyword, KeywordSource } from "../keyword-entry";
import { SOURCE_WEIGHTS } from "../keyword-entry";
import { pickWinners } from "./arbitrate";

function keyword(
	normalized: string,
	targetId: string,
	source: KeywordSource,
	updatedAt = "2026-08-01T00:00:00.000Z",
): IndexedKeyword {
	return {
		normalized,
		display: normalized,
		targetId,
		targetCollection: "posts",
		targetSlug: targetId,
		targetTitle: `Article ${targetId}`,
		targetUrl: `/posts/${targetId}`,
		source,
		weight: SOURCE_WEIGHTS[source],
		updatedAt,
	};
}

describe("pickWinners", () => {
	it("laisse passer un mot-clé sans concurrent", () => {
		const only = keyword("llm", "a", "title");
		expect(pickWinners([only])).toEqual([only]);
	});

	it("préfère la source la plus explicite", () => {
		const manual = keyword("llm", "a", "manual");
		const taxonomy = keyword("llm", "b", "taxonomy");
		expect(pickWinners([taxonomy, manual])).toEqual([manual]);
	});

	it("départage deux poids égaux par la fraîcheur", () => {
		const older = keyword("llm", "a", "title", "2026-01-01T00:00:00.000Z");
		const newer = keyword("llm", "b", "title", "2026-08-01T00:00:00.000Z");
		expect(pickWinners([older, newer])).toEqual([newer]);
	});

	it("départage une égalité parfaite de façon déterministe", () => {
		const first = keyword("llm", "aaa", "title");
		const second = keyword("llm", "bbb", "title");
		expect(pickWinners([second, first])).toEqual([first]);
		expect(pickWinners([first, second])).toEqual([first]);
	});

	it("conserve un gagnant par forme normalisée", () => {
		const winners = pickWinners([
			keyword("llm", "a", "manual"),
			keyword("llm", "b", "title"),
			keyword("rag", "c", "taxonomy"),
		]);
		expect(winners.map((k) => k.normalized).sort()).toEqual(["llm", "rag"]);
	});
});
