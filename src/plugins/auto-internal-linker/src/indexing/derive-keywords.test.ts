import { describe, expect, it } from "vitest";
import { DEFAULT_CONFIG, mergeConfig } from "../domain/config";
import { deriveKeywords, type DeriveInput } from "./derive-keywords";

const body = [
	{
		_type: "block",
		_key: "b1",
		style: "normal",
		children: [
			{
				_type: "span",
				_key: "s1",
				text: "Un modèle de langue est un réseau de neurones. Le modèle de langue apprend seul.",
				marks: [],
			},
		],
	},
];

function input(overrides: Partial<DeriveInput> = {}): DeriveInput {
	return {
		entryId: "01J",
		collection: "posts",
		slug: "qu-est-ce-qu-un-llm",
		title: "Qu'est-ce qu'un LLM ?",
		body,
		manualKeywords: ["modèle de langue", "LLMs"],
		taxonomyLabels: ["Intelligence artificielle"],
		config: DEFAULT_CONFIG,
		now: "2026-08-04T10:00:00.000Z",
		...overrides,
	};
}

describe("deriveKeywords", () => {
	it("indexe les mots-clés manuels au poids maximal", () => {
		const manual = deriveKeywords(input()).find((k) => k.normalized === "llms");
		expect(manual?.source).toBe("manual");
		expect(manual?.weight).toBe(100);
	});

	it("indexe les variantes du titre", () => {
		const normalized = deriveKeywords(input()).map((k) => k.normalized);
		expect(normalized).toContain("llm");
	});

	it("indexe les libellés de taxonomie", () => {
		const term = deriveKeywords(input()).find(
			(k) => k.normalized === "intelligence artificielle",
		);
		expect(term?.source).toBe("taxonomy");
	});

	it("conserve la source la plus lourde pour un terme partagé", () => {
		// « modèle de langue » vient à la fois de `manual` et de `extracted`.
		const entries = deriveKeywords(input()).filter(
			(k) => k.normalized === "modele de langue",
		);
		expect(entries).toHaveLength(1);
		expect(entries[0].source).toBe("manual");
	});

	it("porte l'URL cible construite depuis le motif de la collection", () => {
		expect(deriveKeywords(input())[0].targetUrl).toBe("/posts/qu-est-ce-qu-un-llm");
	});

	it("porte le libellé d'affichage d'origine", () => {
		const term = deriveKeywords(input()).find(
			(k) => k.normalized === "intelligence artificielle",
		);
		expect(term?.display).toBe("Intelligence artificielle");
	});

	it("n'indexe rien sans slug — l'article n'a pas d'URL", () => {
		expect(deriveKeywords(input({ slug: null }))).toEqual([]);
	});

	it("n'indexe rien pour une collection sans motif d'URL", () => {
		expect(deriveKeywords(input({ collection: "events" }))).toEqual([]);
	});

	it("respecte la désactivation d'une source", () => {
		const config = mergeConfig({ sources: { extracted: false } as never });
		const sources = new Set(deriveKeywords(input({ config })).map((k) => k.source));
		expect(sources.has("extracted")).toBe(false);
		expect(sources.has("manual")).toBe(true);
	});

	it("applique minKeywordLength aux seules sources automatiques", () => {
		const derived = deriveKeywords(
			input({ manualKeywords: ["IA"], taxonomyLabels: ["IA"], title: "Le IA" }),
		);
		// « ia » survit par `manual` / `taxonomy`, jamais par `title`.
		const ia = derived.find((k) => k.normalized === "ia");
		expect(ia).toBeDefined();
		expect(["manual", "taxonomy"]).toContain(ia?.source);
	});

	it("horodate chaque entrée avec `now`", () => {
		expect(deriveKeywords(input())[0].updatedAt).toBe("2026-08-04T10:00:00.000Z");
	});
});
