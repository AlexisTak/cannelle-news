import { describe, expect, it } from "vitest";
import type { FormField } from "./types";
import { validateSubmission } from "./validation";

const fields: FormField[] = [
	{ id: "name", name: "name", label: "Nom", type: "text", required: true, minLength: 2 },
	{ id: "email", name: "email", label: "E-mail", type: "email", required: true },
	{ id: "budget", name: "budget", label: "Budget", type: "number", required: false, min: 100 },
	{ id: "consent", name: "consent", label: "Consentement", type: "consent", required: true },
];

describe("validateSubmission", () => {
	it("normalise une soumission valide", () => {
		const result = validateSubmission(fields, { name: " Ada ", email: "ada@example.com", budget: "250", consent: true, injected: "ignored" });
		expect(result).toEqual({ success: true, issues: [], values: { name: "Ada", email: "ada@example.com", budget: 250, consent: true } });
	});

	it("rejette les champs requis et les formats invalides", () => {
		const result = validateSubmission(fields, { name: "A", email: "incorrect", budget: 10, consent: false });
		expect(result.success).toBe(false);
		expect(result.issues.map((item) => [item.field, item.code])).toEqual([
			["name", "too_short"],
			["email", "invalid_format"],
			["budget", "too_small"],
			["consent", "required"],
		]);
	});

	it("refuse les valeurs de types inattendus", () => {
		const result = validateSubmission(fields, { name: [], email: {}, consent: "yes" });
		expect(result.issues.map((item) => item.code)).toEqual(["invalid_type", "invalid_type", "invalid_type"]);
	});
});
