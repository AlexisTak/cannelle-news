import { describe, it, expect } from "vitest";
import { analyze } from "../src/analysis/analyze";
import { defaultConfig } from "../src/analysis/config";
import type { SeoDocument } from "../src/domain/document";
import fr from "./fixtures/article-ia.json";
import en from "./fixtures/article-en.json";

/**
 * Tests de bout en bout du moteur sur deux articles réalistes.
 *
 * Les fixtures sont des `SeoDocument` directs plutôt que du Portable Text :
 * le parcours Portable Text est déjà couvert par `content-loader.test.ts`, et
 * mélanger les deux rendrait un échec ici ambigu — parseur ou moteur ?
 */
const frDoc = fr as SeoDocument;
const enDoc = en as SeoDocument;

describe("moteur sur un article français", () => {
	const report = analyze(frDoc, defaultConfig, "intelligence artificielle", "1.0.0");

	it("picks the French readability formula", () => {
		expect(report.metrics.readability.formula).toBe("kandel-moles-fr");
	});

	it("carries identity and title through", () => {
		expect(report.entryId).toBe("fr-ia-001");
		expect(report.title).toBe("L'IA générative transforme la recherche scientifique");
		expect(report.locale).toBe("fr");
	});

	it("counts the outline", () => {
		expect(report.metrics.h2Count).toBe(2);
		expect(report.metrics.h3Count).toBe(3);
		expect(report.issues.some((i) => i.ruleId === "heading-structure")).toBe(false);
	});

	it("counts links on both sides", () => {
		expect(report.metrics.internalLinks).toBe(2);
		expect(report.metrics.externalLinks).toBe(1);
		expect(report.issues.some((i) => i.ruleId === "link-balance")).toBe(false);
	});

	it("flags the image with no alt text", () => {
		expect(report.metrics.imagesTotal).toBe(2);
		expect(report.metrics.imagesWithoutAlt).toBe(1);
		expect(report.issues.some((i) => i.ruleId === "image-alt")).toBe(true);
	});

	it("accepts a well-sized title, meta description and canonical", () => {
		for (const rule of ["title-length", "meta-description", "canonical"]) {
			expect(report.issues.some((i) => i.ruleId === rule)).toBe(false);
		}
	});

	it("still flags the article as too short for SEO", () => {
		// ~115 mots contre 900 attendus : le verdict doit rester sévère.
		expect(report.metrics.contentLength.verdict).toBe("short");
		expect(report.issues.some((i) => i.ruleId === "content-length")).toBe(true);
	});

	it("suggests keywords drawn from the content", () => {
		expect(report.suggestedKeywords.length).toBeGreaterThan(0);
		expect(report.suggestedKeywords.every((k) => k.length >= 3)).toBe(true);
	});

	it("produces a score and a matching grade", () => {
		expect(report.score).toBeGreaterThan(0);
		expect(report.score).toBeLessThanOrEqual(100);
		const expected = report.score >= 80 ? "good" : report.score >= 60 ? "ok" : "poor";
		expect(report.grade).toBe(expected);
	});
});

describe("moteur sur un article anglais", () => {
	const report = analyze(enDoc, defaultConfig, "generative", "1.0.0");

	it("picks the English readability formula", () => {
		expect(report.metrics.readability.formula).toBe("flesch-en");
	});

	it("counts occurrences of the focus keyword", () => {
		// « Generative » apparaît en début de phrase et en minuscules ; la
		// normalisation doit les réunir.
		expect(report.metrics.keywordOccurrences).toBeGreaterThanOrEqual(2);
		expect(report.metrics.keywordDensity).toBeGreaterThan(0);
	});

	it("has no missing alt text", () => {
		expect(report.metrics.imagesWithoutAlt).toBe(0);
		expect(report.issues.some((i) => i.ruleId === "image-alt")).toBe(false);
	});

	it("accepts a two-level outline", () => {
		expect(report.metrics.h2Count).toBe(2);
		expect(report.metrics.h3Count).toBe(1);
		expect(report.issues.some((i) => i.ruleId === "heading-structure")).toBe(false);
	});
});

describe("cohérence entre les deux langues", () => {
	it("selects a different formula per language", () => {
		const a = analyze(frDoc, defaultConfig, undefined, "1.0.0");
		const b = analyze(enDoc, defaultConfig, undefined, "1.0.0");
		expect(a.metrics.readability.formula).not.toBe(b.metrics.readability.formula);
	});

	it("is deterministic apart from the timestamp", () => {
		const a = analyze(frDoc, defaultConfig, "intelligence artificielle", "1.0.0");
		const b = analyze(frDoc, defaultConfig, "intelligence artificielle", "1.0.0");
		expect({ ...a, analyzedAt: "" }).toEqual({ ...b, analyzedAt: "" });
	});

	it("keeps every issue traceable to a real rule", () => {
		const report = analyze(frDoc, defaultConfig, undefined, "1.0.0");
		const known = new Set([
			"title-length",
			"meta-description",
			"content-length",
			"keyword-density",
			"readability",
			"heading-structure",
			"image-alt",
			"link-balance",
			"canonical",
		]);
		for (const issue of report.issues) expect(known).toContain(issue.ruleId);
	});
});
