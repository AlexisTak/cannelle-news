import { describe, expect, it } from "vitest";
import { createFormInputSchema } from "./schemas";

describe("createFormInputSchema", () => {
	it("accepte un formulaire minimal", () => {
		expect(createFormInputSchema.safeParse({ title: "Contact", slug: "contact", fields: [{ id: "email", name: "email", label: "E-mail", type: "email", required: true }] }).success).toBe(true);
	});

	it("refuse les noms dupliqués", () => {
		const field = { id: "one", name: "email", label: "E-mail", type: "email", required: true };
		expect(createFormInputSchema.safeParse({ title: "Contact", slug: "contact", fields: [field, { ...field, id: "two" }] }).success).toBe(false);
	});

	it("impose des options aux listes", () => {
		expect(createFormInputSchema.safeParse({ title: "Contact", slug: "contact", fields: [{ id: "topic", name: "topic", label: "Sujet", type: "select", required: false }] }).success).toBe(false);
	});
});
