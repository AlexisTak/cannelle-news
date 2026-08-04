import { describe, expect, it } from "vitest";
import { META_DESCRIPTION_MAX } from "./actions";
import { AssistantOutputError, truncateMetaDescription, validateOutput } from "./validate";

describe("truncateMetaDescription", () => {
	it("leaves a short description untouched", () => {
		const text = "Une description courte et conforme.";
		expect(truncateMetaDescription(text)).toBe(text);
	});

	it("never exceeds the limit", () => {
		const text = "mot ".repeat(80);
		expect(truncateMetaDescription(text).length).toBeLessThanOrEqual(META_DESCRIPTION_MAX);
	});

	it("cuts on a word boundary and ends with an ellipsis", () => {
		const text = `${"a".repeat(10)} ${"reformulation ".repeat(20)}`.trim();
		const result = truncateMetaDescription(text);
		expect(result.endsWith("…")).toBe(true);
		// Le texte conservé est un préfixe exact de l'original suivi d'une
		// frontière de mot : aucun « reformulati… » au milieu d'un mot.
		const kept = result.slice(0, -1);
		expect(text.startsWith(kept)).toBe(true);
		expect(text[kept.length]).toBe(" ");
	});

	it("removes orphan punctuation left by the cut", () => {
		const text = `${"x".repeat(140)}, suite de la phrase qui dépasse largement`;
		expect(truncateMetaDescription(text)).not.toMatch(/[,;:]…$/u);
	});

	it("collapses newlines and repeated spaces", () => {
		expect(truncateMetaDescription("Une\n\n  description   aérée")).toBe(
			"Une\n\ndescription aérée",
		);
	});
});

describe("validateOutput", () => {
	it("keeps exactly five seo titles", () => {
		const raw = JSON.stringify(["A", "B", "C", "D", "E", "F", "G"]);
		const result = validateOutput("seoTitles", raw);
		expect(result).toEqual({ action: "seoTitles", titles: ["A", "B", "C", "D", "E"] });
	});

	it("rejects a short seo title list", () => {
		expect(() => validateOutput("seoTitles", '["A","B"]')).toThrow(AssistantOutputError);
	});

	it("keeps exactly three tldr bullets", () => {
		const result = validateOutput("tldr", '["Un","Deux","Trois","Quatre"]');
		expect(result).toEqual({ action: "tldr", bullets: ["Un", "Deux", "Trois"] });
	});

	it("rejects a two-bullet tldr", () => {
		// Un TL;DR incomplet publié sans être vu est pire qu'une erreur visible.
		expect(() => validateOutput("tldr", '["Un","Deux"]')).toThrow(AssistantOutputError);
	});

	it("truncates an over-long meta description", () => {
		const raw = JSON.stringify({ description: "phrase ".repeat(40) });
		const result = validateOutput("metaDescription", raw);
		if (result.action !== "metaDescription") throw new Error("mauvaise action");
		expect(result.description.length).toBeLessThanOrEqual(META_DESCRIPTION_MAX);
	});

	it("rejects an empty meta description", () => {
		expect(() => validateOutput("metaDescription", '{"description":"  "}')).toThrow(
			AssistantOutputError,
		);
	});

	it("carries the source text alongside the reformulation", () => {
		const result = validateOutput("vulgarize", '{"text":"En clair"}', "Passage technique");
		expect(result).toEqual({
			action: "vulgarize",
			text: "En clair",
			sourceText: "Passage technique",
		});
	});

	it("rejects an empty reformulation", () => {
		expect(() => validateOutput("vulgarize", '{"text":""}', "src")).toThrow(
			AssistantOutputError,
		);
	});
});
