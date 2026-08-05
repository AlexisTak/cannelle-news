import { describe, it, expect } from "vitest";
import { canonicalRule } from "./canonical";
import { makeDoc } from "../../../test/make-doc";

const env = { focusKeyword: null, siteUrl: "https://example.com" };

describe("canonical", () => {
	it("scores 100 when a canonical URL is set and matches the site origin", () => {
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

	it("errors when the canonical URL is malformed", () => {
		const res = canonicalRule.analyze(makeDoc({ canonical: "not-a-url" }), undefined, env);
		expect(res.score).toBe(0);
		expect(res.issues[0].severity).toBe("error");
	});

	it("errors when the canonical URL points to a different origin", () => {
		const res = canonicalRule.analyze(
			makeDoc({ canonical: "https://evil.com/duplicate" }),
			undefined,
			env,
		);
		expect(res.score).toBe(0);
		expect(res.issues[0].message).toMatch(/site origin/i);
	});
});
