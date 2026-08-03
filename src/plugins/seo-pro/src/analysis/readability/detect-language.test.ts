import { describe, it, expect } from "vitest";
import { detectLanguage } from "./detect-language";

describe("detectLanguage", () => {
	it("detects French prose", () => {
		const text =
			"Le modèle a été entraîné sur des données publiques, et les résultats " +
			"montrent que la précision reste stable dans la plupart des cas.";
		expect(detectLanguage(text)).toBe("fr");
	});

	it("detects English prose", () => {
		const text =
			"The model was trained on public data, and the results show that the " +
			"accuracy remains stable in most of the cases we have tested.";
		expect(detectLanguage(text)).toBe("en");
	});

	it("matches stopwords despite attached punctuation", () => {
		// Sans tokenisation, « the, » et « the. » ne matcheraient rien et ce
		// texte anglais serait classé français par défaut.
		expect(detectLanguage("The results, the data. The conclusion of the study.")).toBe("en");
	});

	it("handles typographic apostrophes", () => {
		const text = "L’équipe a publié l’étude, et l’on retrouve les mêmes chiffres dans le rapport.";
		expect(detectLanguage(text)).toBe("fr");
	});

	it("falls back to French on an empty or wordless string", () => {
		expect(detectLanguage("")).toBe("fr");
		expect(detectLanguage("123 456 —")).toBe("fr");
	});
});
