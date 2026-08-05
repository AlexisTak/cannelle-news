import { describe, expect, it } from "vitest";
import type { FormDefinition, FormSubmission } from "./types";
import { submissionsToCsv } from "./export";

const form = {
	id: "form-1", slug: "contact", title: "Contact", status: "published", version: 1,
	fields: [
		{ id: "message", name: "message", label: "Message", type: "textarea", required: true },
		{ id: "email", name: "email", label: "E-mail", type: "email", required: true },
	],
	createdAt: "2026-08-05T09:00:00Z", updatedAt: "2026-08-05T09:00:00Z",
} satisfies FormDefinition;
const submission: FormSubmission = {
	id: "sub-1", status: "new", createdAt: "2026-08-05T10:00:00Z",
	formId: "form-1", formVersion: 1, metadata: {},
	values: { message: "Bonjour,\n\"Cannelle\"", email: "ada@example.com" },
};

describe("submissionsToCsv", () => {
	it("échappe les virgules, retours ligne et guillemets", () => {
		const csv = submissionsToCsv(form, [submission]);
		expect(csv).toContain('"Bonjour,\n""Cannelle"""');
		expect(csv.split("\r\n")[0]).toBe("submission_id,status,created_at,message,email");
	});
});
