import { describe, it, expect } from "vitest";
import { portableTextToPlainText, blockToText, spanToText } from "./portable-text";
import { classifyLink } from "./link-classifier";

describe("spanToText", () => {
	it("reads a span object", () => expect(spanToText({ text: "salut" })).toBe("salut"));
	it("passes a raw string through", () => expect(spanToText("salut")).toBe("salut"));
	it("returns empty for anything else", () => {
		expect(spanToText(null)).toBe("");
		expect(spanToText(42)).toBe("");
	});
});

describe("blockToText", () => {
	it("joins the spans of a block", () => {
		const block = { _type: "block", children: [{ text: "Bonjour " }, { text: "monde" }] };
		expect(blockToText(block)).toBe("Bonjour monde");
	});

	it("puts each list item on its own line", () => {
		const list = {
			_type: "list",
			children: [
				{ _type: "block", children: [{ text: "un" }] },
				{ _type: "block", children: [{ text: "deux" }] },
			],
		};
		expect(blockToText(list)).toBe("un\ndeux");
	});
});

describe("portableTextToPlainText", () => {
	it("separates blocks with a blank line", () => {
		const blocks = [
			{ _type: "block", children: [{ text: "Premier" }] },
			{ _type: "block", children: [{ text: "Second" }] },
		];
		expect(portableTextToPlainText(blocks)).toBe("Premier\n\nSecond");
	});

	it("drops blocks that carry no text", () => {
		const blocks = [
			{ _type: "block", children: [{ text: "Gardé" }] },
			{ _type: "image", src: "/a.jpg" },
		];
		expect(portableTextToPlainText(blocks)).toBe("Gardé");
	});

	it("returns empty for a non-array", () => {
		expect(portableTextToPlainText(null as unknown as unknown[])).toBe("");
	});
});

describe("classifyLink", () => {
	it("treats root-relative and anchor links as internal", () => {
		expect(classifyLink("/article", undefined)).toBe(true);
		expect(classifyLink("#section", undefined)).toBe(true);
	});

	it("treats an absolute link as external without a configured site URL", () => {
		expect(classifyLink("https://cannelle.news/a", undefined)).toBe(false);
	});

	it("matches the host when the site URL is known", () => {
		expect(classifyLink("https://cannelle.news/a", "https://cannelle.news")).toBe(true);
		expect(classifyLink("https://autre.com/a", "https://cannelle.news")).toBe(false);
	});

	it("returns false on a malformed URL rather than throwing", () => {
		expect(classifyLink("ht tp://bad", "https://cannelle.news")).toBe(false);
	});

	it("returns false for an empty href", () => {
		expect(classifyLink("", "https://cannelle.news")).toBe(false);
	});
});
