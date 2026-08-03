import { describe, it, expect } from "vitest";
import { countSyllables } from "./syllables";

describe("countSyllables (fr)", () => {
	it("counts vowel groups as one syllable", () => {
		expect(countSyllables("beau", "fr")).toBe(1);
		expect(countSyllables("maison", "fr")).toBe(2);
	});

	it("drops the silent final e", () => {
		// « porte » = por-te à l'écrit, une seule syllabe prononcée.
		expect(countSyllables("porte", "fr")).toBe(1);
	});

	it("never returns less than one for a real word", () => {
		expect(countSyllables("le", "fr")).toBe(1);
	});

	it("handles accented characters", () => {
		expect(countSyllables("éléphant", "fr")).toBe(3);
	});

	it("returns 0 for a token with no letters", () => {
		expect(countSyllables("—", "fr")).toBe(0);
		expect(countSyllables("123", "fr")).toBe(0);
	});
});

describe("countSyllables (en)", () => {
	it("counts vowel groups", () => {
		expect(countSyllables("beautiful", "en")).toBe(3);
		expect(countSyllables("cat", "en")).toBe(1);
	});

	it("treats y as a vowel", () => {
		expect(countSyllables("rhythm", "en")).toBe(1);
	});

	it("returns at least 1 for a consonant-only word", () => {
		expect(countSyllables("nth", "en")).toBe(1);
	});
});
