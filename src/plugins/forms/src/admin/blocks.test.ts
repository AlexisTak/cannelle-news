import { validateBlocks } from "@emdash-cms/blocks/server";
import { describe, expect, it } from "vitest";
import type { FormDefinition, FormSubmission } from "../domain/types";
import { createFormBlocks, dashboardBlocks, editorBlocks, errorBlocks, submissionsBlocks } from "./blocks";
import { fieldsForTemplate } from "./templates";

const form: FormDefinition = {
	id: "form-1",
	title: "Contact",
	slug: "contact",
	status: "published",
	version: 1,
	fields: fieldsForTemplate("contact") ?? [],
	createdAt: "2026-08-05T08:00:00.000Z",
	updatedAt: "2026-08-05T08:00:00.000Z",
};

const submission: FormSubmission = {
	id: "submission-1",
	formId: form.id,
	formVersion: 1,
	status: "new",
	values: { email: "ada@example.com" },
	createdAt: "2026-08-05T09:00:00.000Z",
	metadata: {},
};

describe("blocs d'administration", () => {
	it.each([
		["création", createFormBlocks().blocks],
		["tableau de bord vide", dashboardBlocks([], { forms: 0, published: 0, submissions: 0 }).blocks],
		["tableau de bord", dashboardBlocks([form], { forms: 1, published: 1, submissions: 1 }).blocks],
		["soumissions", submissionsBlocks(form, [submission]).blocks],
		["éditeur", editorBlocks(form).blocks],
		["erreur", errorBlocks("Test").blocks],
	])("produit des blocs valides pour %s", (_name, blocks) => {
		expect(validateBlocks(blocks)).toEqual({ valid: true, errors: [] });
	});
});

describe("modèles de formulaire", () => {
	it.each(["contact", "quote", "registration"])("fournit le modèle %s", (template) => {
		const fields = fieldsForTemplate(template);
		expect(fields?.length).toBeGreaterThan(0);
		expect(fields?.some((field) => field.type === "consent")).toBe(true);
	});

	it("retourne une copie indépendante", () => {
		const first = fieldsForTemplate("contact")!;
		first[0].label = "Modifié";
		expect(fieldsForTemplate("contact")?.[0].label).toBe("Nom");
	});
});
