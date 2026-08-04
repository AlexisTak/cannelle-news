import { describe, expect, it } from "vitest";
import article from "../../test/fixtures/article-ia.json";
import { extractParagraphs, portableTextToPlainText } from "./portable-text";

const body = article.data.content;

describe("portableTextToPlainText", () => {
	it("joins blocks with a blank line", () => {
		const text = portableTextToPlainText(body);
		expect(text).toContain("Trois laboratoires européens");
		expect(text).toContain("Comment ça marche");
		expect(text.split("\n\n").length).toBeGreaterThan(3);
	});

	it("flattens list items onto their own lines", () => {
		const text = portableTextToPlainText(body);
		expect(text).toContain("Inférence divisée par six");
		expect(text).toContain("Licence permissive");
	});

	it("returns an empty string for a missing body", () => {
		expect(portableTextToPlainText(undefined)).toBe("");
		expect(portableTextToPlainText("pas un tableau")).toBe("");
	});
});

describe("extractParagraphs", () => {
	const paragraphs = extractParagraphs(body);

	it("excludes headings", () => {
		expect(paragraphs.some((p) => p.text === "Comment ça marche")).toBe(false);
	});

	it("excludes non-prose blocks", () => {
		// Une image n'a rien à vulgariser.
		expect(paragraphs.some((p) => p.text.includes("diffusion.png"))).toBe(false);
	});

	it("excludes blocks that are too short to be a passage", () => {
		expect(paragraphs.some((p) => p.text === "Trop court.")).toBe(false);
	});

	it("keeps the block index, not the rank in the filtered list", () => {
		// Le premier paragraphe retenu après l'intertitre est le bloc 2.
		const latent = paragraphs.find((p) => p.text.includes("espace latent"));
		expect(latent?.index).toBe(2);
	});

	it("returns an empty list for a missing body", () => {
		expect(extractParagraphs(null)).toEqual([]);
	});
});
