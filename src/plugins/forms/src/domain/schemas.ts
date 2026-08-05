import { z } from "zod";

const fieldName = z.string().trim().min(1).max(64).regex(/^[a-z][a-z0-9_]*$/);

export const formFieldSchema = z
	.object({
		id: z.string().trim().min(1).max(80),
		name: fieldName,
		label: z.string().trim().min(1).max(160),
		type: z.enum(["text", "textarea", "email", "number", "checkbox", "select", "consent"]),
		required: z.boolean().default(false),
		minLength: z.number().int().min(0).max(10_000).optional(),
		maxLength: z.number().int().min(1).max(100_000).optional(),
		min: z.number().optional(),
		max: z.number().optional(),
		options: z.array(z.object({ label: z.string().trim().min(1).max(160), value: z.string().max(500) })).max(200).optional(),
		validationMessage: z.string().trim().min(1).max(300).optional(),
	})
	.superRefine((field, ctx) => {
		if (field.minLength !== undefined && field.maxLength !== undefined && field.minLength > field.maxLength) {
			ctx.addIssue({ code: "custom", path: ["maxLength"], message: "maxLength doit être supérieur ou égal à minLength" });
		}
		if (field.min !== undefined && field.max !== undefined && field.min > field.max) {
			ctx.addIssue({ code: "custom", path: ["max"], message: "max doit être supérieur ou égal à min" });
		}
		if (field.type === "select" && (!field.options || field.options.length === 0)) {
			ctx.addIssue({ code: "custom", path: ["options"], message: "Une liste doit proposer au moins une option" });
		}
	});

export const createFormInputSchema = z
	.object({
		title: z.string().trim().min(1).max(200),
		slug: z.string().trim().min(1).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
		fields: z.array(formFieldSchema).min(1).max(200),
	})
	.superRefine((form, ctx) => {
		const names = new Set<string>();
		for (const [index, field] of form.fields.entries()) {
			if (names.has(field.name)) ctx.addIssue({ code: "custom", path: ["fields", index, "name"], message: "Le nom du champ doit être unique" });
			names.add(field.name);
		}
	});

export const formIdInputSchema = z.object({ id: z.string().trim().min(1).max(100) });
export const publishFormInputSchema = formIdInputSchema;
export const updateFormInputSchema = createFormInputSchema.and(formIdInputSchema);
export const duplicateFormInputSchema = formIdInputSchema;
export const archiveFormInputSchema = formIdInputSchema;
export const submitFormInputSchema = z.object({
	formId: z.string().trim().min(1).max(100),
	values: z.record(z.string(), z.unknown()),
	_cannelle_website: z.string().max(500).optional(),
});

export type CreateFormInput = z.infer<typeof createFormInputSchema>;
export type SubmitFormInput = z.infer<typeof submitFormInputSchema>;
