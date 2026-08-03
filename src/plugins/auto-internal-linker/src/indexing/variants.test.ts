import { describe, expect, it } from "vitest";
import { titleVariants } from "./variants";

describe("titleVariants", () => {
	it("rend le titre normalisé", () => {
		expect(titleVariants("Le RAG expliqué")).toContain("le rag explique");
	});

	it("rend une variante débarrassée des mots vides", () => {
		expect(titleVariants("Le RAG expliqué")).toContain("rag explique");
	});

	it("réduit un titre interrogatif à son noyau", () => {
		expect(titleVariants("Qu'est-ce qu'un LLM ?")).toContain("llm");
	});

	it("ne rend pas de doublon quand les deux variantes coïncident", () => {
		expect(titleVariants("Cybersécurité")).toEqual(["cybersecurite"]);
	});

	it("rend un tableau vide pour un titre entièrement fait de mots vides", () => {
		expect(titleVariants("De la même")).toEqual([]);
	});

	it("rend un tableau vide pour un titre vide", () => {
		expect(titleVariants("   ")).toEqual([]);
	});
});
