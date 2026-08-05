import type { FormField, FormFieldType } from "../domain/types";

export const EDITOR_FIELD_SLOTS = 12;
const TYPES = new Set<FormFieldType>(["text", "textarea", "email", "number", "checkbox", "select", "consent"]);

function stringValue(value: unknown): string {
	return typeof value === "string" ? value.trim() : "";
}

function optionalNumber(value: unknown): number | undefined {
	if (value === "" || value === undefined || value === null) return undefined;
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : undefined;
}

export function parseEditorFields(values: Record<string, unknown>): FormField[] {
	const fields: FormField[] = [];
	for (let index = 0; index < EDITOR_FIELD_SLOTS; index += 1) {
		if (values[`field_${index}_enabled`] !== true) continue;
		const typeValue = stringValue(values[`field_${index}_type`]);
		const type = TYPES.has(typeValue as FormFieldType) ? typeValue as FormFieldType : "text";
		const name = stringValue(values[`field_${index}_name`]);
		const options = stringValue(values[`field_${index}_options`])
			.split("\n").map((option) => option.trim()).filter(Boolean)
			.map((option) => ({ label: option, value: option }));
		fields.push({
			id: stringValue(values[`field_${index}_id`]) || crypto.randomUUID(),
			name,
			label: stringValue(values[`field_${index}_label`]),
			type,
			required: values[`field_${index}_required`] === true,
			...(optionalNumber(values[`field_${index}_min_length`]) !== undefined ? { minLength: optionalNumber(values[`field_${index}_min_length`]) } : {}),
			...(optionalNumber(values[`field_${index}_max_length`]) !== undefined ? { maxLength: optionalNumber(values[`field_${index}_max_length`]) } : {}),
			...(optionalNumber(values[`field_${index}_min`]) !== undefined ? { min: optionalNumber(values[`field_${index}_min`]) } : {}),
			...(optionalNumber(values[`field_${index}_max`]) !== undefined ? { max: optionalNumber(values[`field_${index}_max`]) } : {}),
			...(type === "select" ? { options } : {}),
			...(stringValue(values[`field_${index}_validation_message`]) ? { validationMessage: stringValue(values[`field_${index}_validation_message`]) } : {}),
		});
	}
	return fields;
}
