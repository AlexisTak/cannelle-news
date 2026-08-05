import { describe, expect, it } from "vitest";
import { detectQuoteSpans, excludeQuotedText } from "./quotes";

describe("citations", () => {
	it("détecte les guillemets français, droits et typographiques", () => {
		const text = 'Avant «citation française» puis "citation droite" et “citation typographique”.';
		expect(detectQuoteSpans(text)).toHaveLength(3);
	});

	it("gère les guillemets français imbriqués", () => {
		const text = "Avant «extérieur «intérieur» fin» après";
		expect(detectQuoteSpans(text)).toEqual([[7, 32]]);
	});

	it("masque les citations sans déplacer les offsets", () => {
		const text = "Introduction «une longue citation» conclusion";
		const masked = excludeQuotedText(text);
		expect(masked).toHaveLength(text.length);
		expect(masked.startsWith("Introduction «")).toBe(true);
		expect(masked.endsWith("» conclusion")).toBe(true);
		expect(masked).not.toContain("longue citation");
	});
});
