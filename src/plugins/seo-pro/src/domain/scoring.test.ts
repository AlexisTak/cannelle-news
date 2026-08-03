import { describe, it, expect } from "vitest";
import { calculateOverallScore, gradeFromScore } from "./scoring";
import type { Issue } from "./report";

describe("calculateOverallScore", () => {
	it("computes weighted average of rule scores", () => {
		const results = [
			{ rule: { id: "a", weight: 1.5 }, score: 100, issues: [] as Issue[] },
			{ rule: { id: "b", weight: 1 }, score: 50, issues: [] as Issue[] },
		];
		expect(calculateOverallScore(results)).toBe(80); // (100*1.5 + 50*1)/2.5 = 80
	});

	it("rounds to nearest integer", () => {
		const results = [
			{ rule: { id: "a", weight: 1 }, score: 77, issues: [] as Issue[] },
			{ rule: { id: "b", weight: 1 }, score: 78, issues: [] as Issue[] },
		];
		expect(calculateOverallScore(results)).toBe(78);
	});
});

describe("gradeFromScore", () => {
	it("returns good for 80+", () => expect(gradeFromScore(80)).toBe("good"));
	it("returns ok for 60-79", () => expect(gradeFromScore(60)).toBe("ok"));
	it("returns poor for <60", () => expect(gradeFromScore(59)).toBe("poor"));
});
