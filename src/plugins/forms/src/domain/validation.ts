import type { FormField, ValidationIssue } from "./types";

export interface SubmissionValidationResult {
	success: boolean;
	values: Record<string, string | number | boolean>;
	issues: ValidationIssue[];
}

function issue(field: FormField, code: ValidationIssue["code"], fallback: string): ValidationIssue {
	return { field: field.name, code, message: field.validationMessage ?? fallback };
}

export function validateSubmission(
	fields: readonly FormField[],
	input: Record<string, unknown>,
): SubmissionValidationResult {
	const values: Record<string, string | number | boolean> = {};
	const issues: ValidationIssue[] = [];

	for (const field of fields) {
		const raw = input[field.name];
		const missing = raw === undefined || raw === null || raw === "" || raw === false;
		if (missing) {
			if (field.required) issues.push(issue(field, "required", `${field.label} est obligatoire.`));
			continue;
		}

		if (field.type === "number") {
			const value = typeof raw === "number" ? raw : Number(raw);
			if (!Number.isFinite(value)) {
				issues.push(issue(field, "invalid_type", `${field.label} doit être un nombre.`));
				continue;
			}
			if (field.min !== undefined && value < field.min) issues.push(issue(field, "too_small", `${field.label} doit être supérieur ou égal à ${field.min}.`));
			if (field.max !== undefined && value > field.max) issues.push(issue(field, "too_large", `${field.label} doit être inférieur ou égal à ${field.max}.`));
			values[field.name] = value;
			continue;
		}

		if (field.type === "checkbox" || field.type === "consent") {
			if (typeof raw !== "boolean") {
				issues.push(issue(field, "invalid_type", `${field.label} doit être une valeur booléenne.`));
				continue;
			}
			values[field.name] = raw;
			continue;
		}

		if (typeof raw !== "string") {
			issues.push(issue(field, "invalid_type", `${field.label} doit être du texte.`));
			continue;
		}
		const value = raw.trim();
		if (field.minLength !== undefined && value.length < field.minLength) issues.push(issue(field, "too_short", `${field.label} est trop court.`));
		if (field.maxLength !== undefined && value.length > field.maxLength) issues.push(issue(field, "too_long", `${field.label} est trop long.`));
		if (field.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) issues.push(issue(field, "invalid_format", `${field.label} doit contenir une adresse e-mail valide.`));
		if (field.type === "select" && !field.options?.some((option) => option.value === value)) issues.push(issue(field, "invalid_option", `${field.label} contient une option inconnue.`));
		values[field.name] = value;
	}

	return { success: issues.length === 0, values, issues };
}
