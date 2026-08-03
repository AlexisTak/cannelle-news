import { describe, it, expect } from "vitest";
import { linkBalanceRule } from "./link-balance";
import { makeDoc } from "../../../test/make-doc";

const env = { focusKeyword: null };
const config = linkBalanceRule.defaultConfig;

const internal = (n: number) =>
	Array.from({ length: n }, (_, i) => ({ href: `/a${i}`, text: `a${i}`, internal: true }));
const external = (n: number) =>
	Array.from({ length: n }, (_, i) => ({ href: `https://x${i}.com`, text: `x${i}`, internal: false }));

describe("link-balance", () => {
	it("scores a balanced article", () => {
		const doc = makeDoc({ links: [...internal(2), ...external(1)] });
		const res = linkBalanceRule.analyze(doc, config, env);
		expect(res.score).toBe(100);
		expect(res.issues).toHaveLength(0);
	});

	it("informs when internal links are short", () => {
		const doc = makeDoc({ links: [...internal(1), ...external(2)] });
		const res = linkBalanceRule.analyze(doc, config, env);
		expect(res.score).toBe(60);
		expect(res.issues[0].severity).toBe("info");
		expect(res.issues[0].message).toContain("internal");
	});

	it("informs when external links are missing", () => {
		const doc = makeDoc({ links: internal(3) });
		const res = linkBalanceRule.analyze(doc, config, env);
		expect(res.score).toBe(60);
		expect(res.issues[0].message).toContain("external");
	});

	it("warns when both are missing", () => {
		const res = linkBalanceRule.analyze(makeDoc({ links: [] }), config, env);
		expect(res.score).toBe(20);
		expect(res.issues[0].severity).toBe("warning");
	});

	it("counts each side", () => {
		const doc = makeDoc({ links: [...internal(3), ...external(2)] });
		expect(linkBalanceRule.analyze(doc, config, env).metrics).toMatchObject({
			internal: 3,
			external: 2,
		});
	});
});
