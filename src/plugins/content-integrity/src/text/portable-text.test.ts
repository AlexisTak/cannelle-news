import { describe, expect, it } from "vitest";
import { extractText } from "./portable-text";

describe("extractText", () => {
	it("exclut entièrement les blocs de citation", () => {
		const result = extractText([
			{ _type: "block", style: "normal", children: [{ text: "Introduction originale" }] },
			{ _type: "block", style: "blockquote", children: [{ text: "Citation commune à exclure" }] },
			{ _type: "block", style: "normal", children: [{ text: "Conclusion originale" }] },
		]);

		expect(result.text).toBe("Introduction originale Conclusion originale");
		expect(result.text).not.toContain("Citation commune");
	});
});
