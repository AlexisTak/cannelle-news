import { describe, it, expect } from "vitest";
import { titleLengthRule } from "./title-length";
import { makeDoc } from "../../../test/make-doc";

const env = { focusKeyword: null };
const config = titleLengthRule.defaultConfig;

describe("title-length", () => {
	it("scores ideal title", () => {
		const doc = makeDoc({ title: "L'IA générative bouleverse la cybersécurité" });
		const res = titleLengthRule.analyze(doc, config, env);
		expect(res.score).toBe(100);
		expect(res.issues).toHaveLength(0);
	});

	it("flags short title", () => {
		const res = titleLengthRule.analyze(makeDoc({ title: "IA" }), config, env);
		expect(res.score).toBe(40);
		expect(res.issues[0].severity).toBe("error");
	});

	it("treats a near-miss as a warning, not an error", () => {
		// 25 chars : hors idéal (30-60) mais dans la fenêtre d'avertissement (20-70).
		const res = titleLengthRule.analyze(makeDoc({ title: "a".repeat(25) }), config, env);
		expect(res.score).toBe(80);
		expect(res.issues[0].severity).toBe("warning");
	});

	it("flags long title", () => {
		const res = titleLengthRule.analyze(makeDoc({ title: "a".repeat(80) }), config, env);
		expect(res.score).toBe(40);
		expect(res.issues[0].message).toContain("too long");
	});

	it("reports the estimated pixel width", () => {
		const res = titleLengthRule.analyze(makeDoc({ title: "a".repeat(40) }), config, env);
		expect(res.metrics).toMatchObject({ length: 40, pixelWidth: 380 });
	});
});
