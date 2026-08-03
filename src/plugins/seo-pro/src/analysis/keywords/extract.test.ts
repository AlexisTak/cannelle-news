import { describe, it, expect } from "vitest";
import { extractKeywords } from "./extract";

describe("extractKeywords", () => {
	it("ranks a title term above a body term of equal frequency", () => {
		const res = extractKeywords("cybersecurite apparait ici", "cybersecurite", [], 10);
		const cyber = res.find((r) => r.keyword === "cybersecurite");
		const apparait = res.find((r) => r.keyword === "apparait");
		expect(cyber!.score).toBeGreaterThan(apparait!.score);
	});

	it("strips accents so variants collapse into one candidate", () => {
		const res = extractKeywords("générative generative Générative", "", [], 10);
		expect(res.filter((r) => r.keyword === "generative")).toHaveLength(1);
		expect(res.find((r) => r.keyword === "generative")!.score).toBe(3);
	});

	it("excludes stopwords and tokens shorter than 3 chars", () => {
		const res = extractKeywords("le la les de un ia et intelligence", "", [], 20);
		const kept = res.map((r) => r.keyword);
		expect(kept).toContain("intelligence");
		expect(kept).not.toContain("le");
		expect(kept).not.toContain("ia");
	});

	it("produces multi-word n-grams", () => {
		const res = extractKeywords("intelligence artificielle intelligence artificielle", "", [], 20);
		expect(res.map((r) => r.keyword)).toContain("intelligence artificielle");
	});

	it("weights headings between body and title", () => {
		const res = extractKeywords("alpha", "beta", ["gamma"], 10);
		const score = (k: string) => res.find((r) => r.keyword === k)!.score;
		expect(score("beta")).toBeGreaterThan(score("gamma"));
		expect(score("gamma")).toBeGreaterThan(score("alpha"));
	});

	it("honours the limit and returns the highest scores first", () => {
		const res = extractKeywords("alpha bravo charlie delta echo foxtrot", "alpha", [], 3);
		expect(res).toHaveLength(3);
		expect(res[0].keyword).toBe("alpha");
		expect(res[0].score).toBeGreaterThanOrEqual(res[1].score);
		expect(res[1].score).toBeGreaterThanOrEqual(res[2].score);
	});

	it("returns an empty list for text made only of stopwords", () => {
		expect(extractKeywords("le la les de des", "", [])).toEqual([]);
	});
});
