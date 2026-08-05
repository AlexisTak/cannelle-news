import type { FormDefinition, FormSubmission } from "./types";

function csvCell(value: unknown): string {
	const text = value === undefined || value === null ? "" : String(value);
	return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function submissionsToCsv(form: FormDefinition, submissions: readonly FormSubmission[]): string {
	const fieldNames = form.fields.map((field) => field.name);
	const header = ["submission_id", "status", "created_at", ...fieldNames].map(csvCell).join(",");
	const rows = submissions.map((submission) => [submission.id, submission.status, submission.createdAt, ...fieldNames.map((name) => submission.values[name])].map(csvCell).join(","));
	return [header, ...rows].join("\r\n");
}
