import { describe, it, expect } from "vitest";
import { calculateReadingTime } from "./reading-time";

describe("calculateReadingTime", () => {
	it("uses 200 words per minute by default", () => {
		expect(calculateReadingTime(400)).toBe(2);
	});

	it("rounds up a partial minute", () => {
		expect(calculateReadingTime(201)).toBe(2);
	});

	it("never returns less than one minute", () => {
		expect(calculateReadingTime(0)).toBe(1);
		expect(calculateReadingTime(5)).toBe(1);
	});

	it("accepts a custom reading speed", () => {
		expect(calculateReadingTime(600, 300)).toBe(2);
	});
});
