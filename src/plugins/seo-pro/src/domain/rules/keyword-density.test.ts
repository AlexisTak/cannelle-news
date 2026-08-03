import { describe, it, expect } from "vitest";
import { keywordDensityRule, countOccurrences } from "./keyword-density";
import { makeDoc } from "../../../test/make-doc";

const config = keywordDensityRule.defaultConfig;

describe("countOccurrences", () => {
	it("ignores accents and case", () => {
		expect(countOccurrences("La Cybersécurité et la cybersecurite", "cybersécurité")).toBe(2);
	});

	it("only matches whole words", () => {
		// « ia » ne doit pas matcher « biais » ni « médiatique ».
		expect(countOccurrences("le biais médiatique de l'ia", "ia")).toBe(1);
	});

	it("sees through French elision", () => {
		expect(countOccurrences("l'IA et d'IA et qu'IA", "ia")).toBe(3);
	});

	it("leaves non-elided apostrophes alone", () => {
		// « aujourd'hui » ne doit pas se faire amputer en « hui ».
		expect(countOccurrences("aujourd'hui", "hui")).toBe(0);
		expect(countOccurrences("aujourd'hui", "aujourd'hui")).toBe(1);
	});

	it("matches multi-word phrases", () => {
		expect(countOccurrences("intelligence artificielle et intelligence humaine", "intelligence artificielle")).toBe(1);
	});

	it("returns 0 for an empty keyword", () => {
		expect(countOccurrences("du texte", "")).toBe(0);
	});
});

describe("keyword-density", () => {
	it("penalises a missing focus keyword", () => {
		const res = keywordDensityRule.analyze(makeDoc(), config, { focusKeyword: null });
		expect(res.score).toBe(20);
		expect(res.issues[0].message).toContain("No focus keyword");
	});

	it("scores an ideal density", () => {
		// 1 occurrence sur 100 mots = 1 %, dans l'idéal 0.5-1.5 %.
		const plainText = `${"mot ".repeat(99)}cybersecurite`;
		const res = keywordDensityRule.analyze(makeDoc({ plainText }), config, {
			focusKeyword: "cybersecurite",
		});
		expect(res.score).toBe(100);
		expect(res.metrics).toMatchObject({ density: 1, occurrences: 1 });
	});

	it("warns when the keyword is too rare", () => {
		const plainText = `${"mot ".repeat(999)}cybersecurite`;
		const res = keywordDensityRule.analyze(makeDoc({ plainText }), config, {
			focusKeyword: "cybersecurite",
		});
		expect(res.score).toBe(70);
		expect(res.issues[0].severity).toBe("warning");
	});

	it("errors on keyword stuffing", () => {
		const plainText = "cybersecurite ".repeat(50) + "mot ".repeat(50);
		const res = keywordDensityRule.analyze(makeDoc({ plainText }), config, {
			focusKeyword: "cybersecurite",
		});
		expect(res.score).toBe(30);
		expect(res.issues[0].severity).toBe("error");
		expect(res.issues[0].message).toContain("stuffing");
	});
});
