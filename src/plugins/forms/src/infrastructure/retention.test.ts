import { describe, expect, it } from "vitest";
import { retentionPolicyFromValues } from "./retention";

describe("retentionPolicyFromValues", () => {
	it("normalise le mode inconnu vers l'anonymisation", () => {
		expect(retentionPolicyFromValues(365, "unknown")).toEqual({ days: 365, mode: "anonymize" });
	});

	it("conserve le mode suppression explicite", () => {
		expect(retentionPolicyFromValues(30, "delete")).toEqual({ days: 30, mode: "delete" });
	});

	it("refuse une durée hors limites", () => {
		expect(() => retentionPolicyFromValues(0, "delete")).toThrow(RangeError);
	});
});
