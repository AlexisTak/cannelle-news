import { describe, it, expect } from "vitest";
import { contentLengthRule, countWords } from "./content-length";
import { makeDoc } from "../../../test/make-doc";

const env = { focusKeyword: null };
const config = contentLengthRule.defaultConfig;
const words = (n: number) => makeDoc({ plainText: "mot ".repeat(n).trim() });

describe("countWords", () => {
	it("counts whitespace-separated words", () => expect(countWords("un deux trois")).toBe(3));
	it("returns 0 for blank text", () => expect(countWords("   ")).toBe(0));
	it("collapses repeated whitespace", () => expect(countWords("un   deux\n\ttrois")).toBe(3));
});

describe("content-length", () => {
	it("scores an ideal article", () => {
		const res = contentLengthRule.analyze(words(1200), config, env);
		expect(res.score).toBe(100);
		expect(res.metrics).toMatchObject({ verdict: "ideal" });
		expect(res.issues).toHaveLength(0);
	});

	it("errors on a very short article", () => {
		const res = contentLengthRule.analyze(words(200), config, env);
		expect(res.score).toBe(20);
		expect(res.metrics).toMatchObject({ verdict: "short" });
		expect(res.issues[0].severity).toBe("error");
	});

	it("warns on an acceptable but thin article", () => {
		const res = contentLengthRule.analyze(words(700), config, env);
		expect(res.score).toBe(60);
		expect(res.metrics).toMatchObject({ verdict: "acceptable" });
		expect(res.issues[0].severity).toBe("warning");
	});

	it("warns on a long article", () => {
		const res = contentLengthRule.analyze(words(3000), config, env);
		expect(res.score).toBe(60);
		expect(res.metrics).toMatchObject({ verdict: "long" });
	});

	it("errors on a very long article", () => {
		const res = contentLengthRule.analyze(words(4000), config, env);
		expect(res.score).toBe(20);
		expect(res.metrics).toMatchObject({ verdict: "very-long" });
	});
});
