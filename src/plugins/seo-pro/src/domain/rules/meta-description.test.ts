import { describe, it, expect } from "vitest";
import { metaDescriptionRule } from "./meta-description";
import { makeDoc } from "../../../test/make-doc";

const env = { focusKeyword: null };
const config = metaDescriptionRule.defaultConfig;

describe("meta-description", () => {
	it("scores an ideal description", () => {
		const res = metaDescriptionRule.analyze(makeDoc({ metaDescription: "a".repeat(140) }), config, env);
		expect(res.score).toBe(100);
		expect(res.issues).toHaveLength(0);
	});

	it("errors when missing", () => {
		const res = metaDescriptionRule.analyze(makeDoc({ metaDescription: null }), config, env);
		expect(res.score).toBe(50);
		expect(res.issues[0].severity).toBe("error");
		expect(res.issues[0].message).toContain("missing");
	});

	it("errors below the warning floor", () => {
		const res = metaDescriptionRule.analyze(makeDoc({ metaDescription: "a".repeat(80) }), config, env);
		expect(res.score).toBe(50);
		expect(res.issues[0].severity).toBe("error");
	});

	it("warns just under the ideal range", () => {
		const res = metaDescriptionRule.analyze(makeDoc({ metaDescription: "a".repeat(110) }), config, env);
		expect(res.score).toBe(80);
		expect(res.issues[0].severity).toBe("warning");
	});

	it("warns when too long but still within tolerance", () => {
		const res = metaDescriptionRule.analyze(makeDoc({ metaDescription: "a".repeat(200) }), config, env);
		expect(res.score).toBe(80);
		expect(res.issues[0].message).toContain("too long");
	});

	it("drops to 50 past the warning ceiling", () => {
		const res = metaDescriptionRule.analyze(makeDoc({ metaDescription: "a".repeat(400) }), config, env);
		expect(res.score).toBe(50);
	});
});
