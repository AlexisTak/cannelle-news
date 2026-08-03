import { describe, expect, it } from "vitest";
import { isWordChar, normalizeKeyword, normalizeWithOffsets } from "./normalize";

describe("normalizeWithOffsets", () => {
	it("met en minuscules sans décaler les offsets", () => {
		const { normalized, map } = normalizeWithOffsets("Un LLM");
		expect(normalized).toBe("un llm");
		expect(map).toEqual([0, 1, 2, 3, 4, 5, 6]);
	});

	it("désaccentue en gardant la correspondance un pour un", () => {
		const { normalized, map } = normalizeWithOffsets("modèle");
		expect(normalized).toBe("modele");
		expect(map).toEqual([0, 1, 2, 3, 4, 5, 6]);
	});

	it("fait pointer les deux caractères d'une ligature sur le même offset brut", () => {
		const { normalized, map } = normalizeWithOffsets("œuvre");
		expect(normalized).toBe("oeuvre");
		// 'œ' occupe l'offset brut 0 ; 'o' et 'e' y renvoient tous les deux.
		expect(map).toEqual([0, 0, 1, 2, 3, 4, 5]);
	});

	it("permet de retrouver la sous-chaîne brute exacte d'une correspondance", () => {
		const raw = "Le cœur du réacteur";
		const { normalized, map } = normalizeWithOffsets(raw);
		expect(normalized).toBe("le coeur du reacteur");

		const start = normalized.indexOf("coeur");
		const end = start + "coeur".length;
		// L'offset de fin est celui du caractère suivant la correspondance.
		expect(raw.slice(map[start], map[end])).toBe("cœur");
	});

	it("conserve la longueur de la carte égale à celle du texte normalisé plus la sentinelle", () => {
		const { normalized, map } = normalizeWithOffsets("Élan œcuménique & æther");
		expect(map).toHaveLength(normalized.length + 1);
	});
});

describe("normalizeKeyword", () => {
	it("réduit un terme à sa forme comparable", () => {
		expect(normalizeKeyword("  Modèle de Langue  ")).toBe("modele de langue");
	});

	it("compresse les espaces internes", () => {
		expect(normalizeKeyword("intelligence   artificielle")).toBe("intelligence artificielle");
	});

	it("préserve apostrophes et tirets", () => {
		expect(normalizeKeyword("Porte-parole d'Aujourd'hui")).toBe("porte-parole d'aujourd'hui");
	});
});

describe("isWordChar", () => {
	it("reconnaît lettres, chiffres, apostrophe et tiret", () => {
		for (const ch of ["a", "z", "0", "9", "'", "-"]) expect(isWordChar(ch)).toBe(true);
	});

	it("rejette les séparateurs et les bornes de chaîne", () => {
		for (const ch of [" ", ".", ",", "(", undefined]) expect(isWordChar(ch)).toBe(false);
	});
});
