import { describe, it, expect } from "vitest";
import { canonicalRule } from "./canonical";
import { makeDoc } from "../../../test/make-doc";

const env = { focusKeyword: null };

describe("canonical", () => {
	it("scores 100 when a canonical URL is set", () => {
		const res = canonicalRule.analyze(makeDoc(), undefined, env);
		expect(res.score).toBe(100);
		expect(res.issues).toHaveLength(0);
	});

	it("errors when the canonical URL is null", () => {
		const res = canonicalRule.analyze(makeDoc({ canonical: null }), undefined, env);
		expect(res.score).toBe(50);
		expect(res.issues[0].severity).toBe("error");
	});

	it("treats a whitespace-only canonical as absent", () => {
		const res = canonicalRule.analyze(makeDoc({ canonical: "   " }), undefined, env);
		expect(res.score).toBe(50);
	});
});
