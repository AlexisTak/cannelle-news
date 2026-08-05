import { describe, expect, it } from "vitest";
import { addDocument, documentFrequency, emptyBoilerplateStats, filterBoilerplate } from "./boilerplate";

describe("fréquence documentaire du boilerplate", () => {
	it("compte un shingle une seule fois par document", () => {
		const stats = emptyBoilerplateStats();
		addDocument(stats, [42, 42, 42]);
		expect(documentFrequency(stats, 42)).toBe(1);
	});

	it("filtre un shingle fréquent mais conserve un shingle rare", () => {
		const stats = emptyBoilerplateStats();
		for (let index = 0; index < 25; index++) addDocument(stats, index < 5 ? [42, 1000 + index] : [1000 + index]);
		expect(filterBoilerplate([42, 999_999], stats)).toEqual([999_999]);
	});
});
