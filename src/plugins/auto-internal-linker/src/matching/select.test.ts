import { describe, expect, it } from "vitest";
import type { IndexedKeyword, KeywordSource } from "../domain/keyword-entry";
import { SOURCE_WEIGHTS } from "../domain/keyword-entry";
import type { Occurrence } from "../domain/suggestion";
import { selectSuggestions } from "./select";

function occurrence(
	normalized: string,
	targetId: string,
	start = 0,
	source: KeywordSource = "manual",
): Occurrence {
	const keyword: IndexedKeyword = {
		normalized,
		display: normalized.toUpperCase(),
		targetId,
		targetCollection: "posts",
		targetSlug: targetId,
		targetTitle: `Article ${targetId}`,
		targetUrl: `/posts/${targetId}`,
		source,
		weight: SOURCE_WEIGHTS[source],
		updatedAt: "2026-08-01T00:00:00.000Z",
	};

	return {
		blockKey: "b1",
		spanIndex: 0,
		start,
		end: start + normalized.length,
		text: normalized,
		keyword,
		context: `…${normalized}…`,
	};
}

const base = { existingInternalHrefs: [], ignored: [], maxLinksPerEntry: 5 };

describe("selectSuggestions", () => {
	it("transforme une occurrence en suggestion affichable", () => {
		const [suggestion] = selectSuggestions({ ...base, occurrences: [occurrence("llm", "a")] });

		expect(suggestion).toEqual({
			keyword: "LLM",
			normalized: "llm",
			targetId: "a",
			targetTitle: "Article a",
			targetUrl: "/posts/a",
			blockKey: "b1",
			spanIndex: 0,
			start: 0,
			end: 3,
			context: "…llm…",
			source: "manual",
		});
	});

	it("ne retient que la première occurrence d'un mot-clé", () => {
		const suggestions = selectSuggestions({
			...base,
			occurrences: [occurrence("llm", "a", 0), occurrence("llm", "a", 50)],
		});
		expect(suggestions).toHaveLength(1);
		expect(suggestions[0].start).toBe(0);
	});

	it("ne propose qu'un seul lien par cible, même via deux mots-clés", () => {
		const suggestions = selectSuggestions({
			...base,
			occurrences: [occurrence("llm", "a", 0), occurrence("modele de langue", "a", 20)],
		});
		expect(suggestions).toHaveLength(1);
		expect(suggestions[0].normalized).toBe("llm");
	});

	it("écarte une cible déjà liée dans le corps", () => {
		const suggestions = selectSuggestions({
			...base,
			existingInternalHrefs: ["/posts/a"],
			occurrences: [occurrence("llm", "a")],
		});
		expect(suggestions).toEqual([]);
	});

	it("reconnaît une cible déjà liée sous forme absolue", () => {
		const suggestions = selectSuggestions({
			...base,
			existingInternalHrefs: ["https://cannelle.news/posts/a"],
			occurrences: [occurrence("llm", "a")],
		});
		expect(suggestions).toEqual([]);
	});

	it("respecte le plafond global", () => {
		const suggestions = selectSuggestions({
			...base,
			maxLinksPerEntry: 2,
			occurrences: [
				occurrence("llm", "a", 0),
				occurrence("rag", "b", 10),
				occurrence("agent", "c", 20),
			],
		});
		expect(suggestions.map((s) => s.targetId)).toEqual(["a", "b"]);
	});

	it("compte les liens déjà posés dans le plafond", () => {
		const suggestions = selectSuggestions({
			...base,
			maxLinksPerEntry: 2,
			existingInternalHrefs: ["/posts/z", "/posts/y"],
			occurrences: [occurrence("llm", "a")],
		});
		expect(suggestions).toEqual([]);
	});

	it("écarte un mot-clé refusé par le rédacteur", () => {
		const suggestions = selectSuggestions({
			...base,
			ignored: ["llm"],
			occurrences: [occurrence("llm", "a"), occurrence("rag", "b", 10)],
		});
		expect(suggestions.map((s) => s.normalized)).toEqual(["rag"]);
	});
});
