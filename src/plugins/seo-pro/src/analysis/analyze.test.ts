import { describe, it, expect } from "vitest";
import { analyze } from "./analyze";
import { makeDoc } from "../../test/make-doc";
import { defaultConfig } from "./config";

describe("analyze", () => {
	it("returns a complete report for a good document", () => {
		const report = analyze(makeDoc(), defaultConfig, undefined, "1.0.0");
		expect(report.score).toBeGreaterThan(0);
		expect(report.grade).toMatch(/good|ok|poor/);
		expect(report.metrics.wordCount).toBeGreaterThan(0);
		expect(report.metrics.h2Count).toBe(1);
		expect(report.metrics.h3Count).toBe(1);
		expect(report.focusKeyword).not.toBeNull();
	});

	it("uses manual focus keyword when provided", () => {
		const doc = makeDoc({ title: "Intelligence artificielle" });
		const report = analyze(doc, defaultConfig, "intelligence artificielle", "1.0.0");
		expect(report.focusKeyword).toBe("intelligence artificielle");
		expect(report.focusKeywordSource).toBe("manual");
	});

	it("falls back to the automatic keyword when the manual one is blank", () => {
		const report = analyze(makeDoc(), defaultConfig, "   ", "1.0.0");
		expect(report.focusKeywordSource).toBe("auto");
		expect(report.focusKeyword).not.toBeNull();
	});

	it("flags keyword stuffing", () => {
		const repeated = "intelligence artificielle ".repeat(40);
		const doc = makeDoc({ title: "Test", plainText: `${repeated} ${"mot ".repeat(100)}` });
		const report = analyze(doc, defaultConfig, "intelligence artificielle", "1.0.0");
		expect(
			report.issues.some((i) => i.ruleId === "keyword-density" && i.severity === "error"),
		).toBe(true);
	});

	it("reports a density consistent with the rule that raised the issue", () => {
		// Le garde-fou contre la régression que ce refactor évite : deux
		// implémentations de comptage donneraient deux densités différentes.
		const doc = makeDoc({ plainText: `${"mot ".repeat(99)}cybersecurite` });
		const report = analyze(doc, defaultConfig, "cybersecurite", "1.0.0");
		expect(report.metrics.keywordOccurrences).toBe(1);
		expect(report.metrics.keywordDensity).toBe(1);
		expect(report.issues.some((i) => i.ruleId === "keyword-density")).toBe(false);
	});

	it("carries every rule id into the report", () => {
		const report = analyze(makeDoc({ canonical: null, headings: [], links: [] }), defaultConfig);
		const ruleIds = new Set(report.issues.map((i) => i.ruleId));
		expect(ruleIds).toContain("canonical");
		expect(ruleIds).toContain("heading-structure");
		expect(ruleIds).toContain("link-balance");
	});

	it("uses the configured reading speed", () => {
		const doc = makeDoc({ plainText: "mot ".repeat(600) });
		const fast = analyze(doc, { ...defaultConfig, wordsPerMinute: 600 }, undefined, "1.0.0");
		const slow = analyze(doc, { ...defaultConfig, wordsPerMinute: 200 }, undefined, "1.0.0");
		expect(fast.metrics.readingTimeMinutes).toBe(1);
		expect(slow.metrics.readingTimeMinutes).toBe(3);
	});

	it("honours a per-rule config override", () => {
		// 65 caractères : hors idéal par défaut (30-60) et au-delà de 600 px.
		// Les deux gardes de la règle sont indépendantes, l'override doit lever
		// les deux — sinon la largeur en pixels continue de signaler.
		const doc = makeDoc({ title: "a".repeat(65) });
		const strict = analyze(doc, defaultConfig, undefined, "1.0.0");
		const lenient = analyze(
			doc,
			{
				...defaultConfig,
				rules: { "title-length": { config: { idealMaxChars: 70, maxPixelWidth: 700 } } },
			},
			undefined,
			"1.0.0",
		);
		expect(strict.issues.some((i) => i.ruleId === "title-length")).toBe(true);
		expect(lenient.issues.some((i) => i.ruleId === "title-length")).toBe(false);
	});

	it("keeps untouched defaults when a rule config is partially overridden", () => {
		const doc = makeDoc({ title: "court" });
		const report = analyze(
			doc,
			{ ...defaultConfig, rules: { "title-length": { config: { idealMaxChars: 200 } } } },
			undefined,
			"1.0.0",
		);
		// `idealMinChars` reste à 30 : un titre de 5 caractères doit encore alerter.
		expect(report.issues.some((i) => i.ruleId === "title-length")).toBe(true);
	});

	it("stamps the engine version and an ISO timestamp", () => {
		const report = analyze(makeDoc(), defaultConfig, undefined, "9.9.9");
		expect(report.engineVersion).toBe("9.9.9");
		expect(() => new Date(report.analyzedAt).toISOString()).not.toThrow();
	});
});
