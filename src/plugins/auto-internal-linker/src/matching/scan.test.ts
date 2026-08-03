import { describe, expect, it } from "vitest";
import type { IndexedKeyword } from "../domain/keyword-entry";
import { buildTrie } from "./trie";
import { CONTEXT_RADIUS, extractContext, scanSpans } from "./scan";

function keyword(normalized: string, display = normalized): IndexedKeyword {
	return {
		normalized,
		display,
		targetId: `id-${normalized}`,
		targetCollection: "posts",
		targetSlug: normalized,
		targetTitle: `Article ${display}`,
		targetUrl: `/posts/${normalized}`,
		source: "manual",
		weight: 100,
		updatedAt: "2026-08-04T00:00:00.000Z",
	};
}

const trie = buildTrie([
	{ key: "llm", value: keyword("llm", "LLM") },
	{ key: "modele de langue", value: keyword("modele de langue", "modèle de langue") },
]);

describe("scanSpans", () => {
	it("rend des offsets dans le texte brut, pas dans le texte normalisé", () => {
		const spans = [{ blockKey: "b1", spanIndex: 0, text: "Un cœur de LLM" }];
		const [occurrence] = scanSpans(spans, trie);

		expect(occurrence.start).toBe(11);
		expect(occurrence.end).toBe(14);
		expect("Un cœur de LLM".slice(occurrence.start, occurrence.end)).toBe("LLM");
	});

	it("conserve la casse d'origine dans le texte de l'occurrence", () => {
		const spans = [{ blockKey: "b1", spanIndex: 0, text: "Le Modèle De Langue explique" }];
		const [occurrence] = scanSpans(spans, trie);
		expect(occurrence.text).toBe("Modèle De Langue");
	});

	it("rattache l'occurrence à son span", () => {
		const spans = [
			{ blockKey: "b1", spanIndex: 0, text: "rien ici" },
			{ blockKey: "b2", spanIndex: 3, text: "un LLM" },
		];
		const [occurrence] = scanSpans(spans, trie);
		expect(occurrence.blockKey).toBe("b2");
		expect(occurrence.spanIndex).toBe(3);
	});

	it("porte le mot-clé indexé complet", () => {
		const spans = [{ blockKey: "b1", spanIndex: 0, text: "un LLM" }];
		expect(scanSpans(spans, trie)[0].keyword.targetTitle).toBe("Article LLM");
	});

	it("rend les occurrences dans l'ordre du document", () => {
		const spans = [
			{ blockKey: "b1", spanIndex: 0, text: "un modèle de langue" },
			{ blockKey: "b2", spanIndex: 0, text: "un LLM" },
		];
		expect(scanSpans(spans, trie).map((o) => o.keyword.normalized)).toEqual([
			"modele de langue",
			"llm",
		]);
	});

	it("retourne un tableau vide quand rien ne correspond", () => {
		expect(scanSpans([{ blockKey: "b1", spanIndex: 0, text: "rien" }], trie)).toEqual([]);
	});
});

describe("extractContext", () => {
	it("rend le texte entier quand il est court", () => {
		expect(extractContext("Un LLM récent", 3, 6)).toBe("Un LLM récent");
	});

	it("tronque avec des points de suspension des deux côtés", () => {
		const raw = `${"a".repeat(200)} LLM ${"b".repeat(200)}`;
		const context = extractContext(raw, 201, 204);
		expect(context.startsWith("…")).toBe(true);
		expect(context.endsWith("…")).toBe(true);
		expect(context).toContain("LLM");
		expect(context.length).toBeLessThanOrEqual(2 * CONTEXT_RADIUS + "LLM".length + 2);
	});
});
