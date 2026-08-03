import { describe, it, expect } from "vitest";
import { headingStructureRule } from "./heading-structure";
import { makeDoc } from "../../../test/make-doc";

const env = { focusKeyword: null };

describe("heading-structure", () => {
	it("scores a full H2 + H3 outline", () => {
		const res = headingStructureRule.analyze(makeDoc(), undefined, env);
		expect(res.score).toBe(100);
		expect(res.issues).toHaveLength(0);
	});

	it("errors when no H2 exists", () => {
		const doc = makeDoc({ headings: [{ level: 3, text: "Sous-partie" }] });
		const res = headingStructureRule.analyze(doc, undefined, env);
		expect(res.score).toBe(30);
		expect(res.issues[0].severity).toBe("error");
	});

	it("errors on a document with no headings at all", () => {
		const res = headingStructureRule.analyze(makeDoc({ headings: [] }), undefined, env);
		expect(res.score).toBe(30);
	});

	it("informs when H2 exists without H3", () => {
		const doc = makeDoc({ headings: [{ level: 2, text: "Partie" }] });
		const res = headingStructureRule.analyze(doc, undefined, env);
		expect(res.score).toBe(70);
		expect(res.issues[0].severity).toBe("info");
	});

	it("counts each level", () => {
		const doc = makeDoc({
			headings: [
				{ level: 2, text: "A" },
				{ level: 2, text: "B" },
				{ level: 3, text: "C" },
			],
		});
		expect(headingStructureRule.analyze(doc, undefined, env).metrics).toMatchObject({
			h2Count: 2,
			h3Count: 1,
		});
	});
});
