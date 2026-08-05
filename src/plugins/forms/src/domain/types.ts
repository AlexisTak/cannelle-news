export type FormStatus = "draft" | "published" | "archived";
export type SubmissionStatus = "new" | "read" | "spam" | "archived";

export type FormFieldType =
	| "text"
	| "textarea"
	| "email"
	| "number"
	| "checkbox"
	| "select"
	| "consent";

export interface FormField {
	id: string;
	name: string;
	label: string;
	type: FormFieldType;
	required: boolean;
	minLength?: number;
	maxLength?: number;
	min?: number;
	max?: number;
	options?: Array<{ label: string; value: string }>;
	validationMessage?: string;
}

export interface FormDefinition {
	id: string;
	slug: string;
	title: string;
	status: FormStatus;
	version: number;
	fields: FormField[];
	createdAt: string;
	updatedAt: string;
	publishedAt?: string;
}

export interface FormVersion {
	formId: string;
	version: number;
	definition: FormDefinition;
	createdAt: string;
}

export interface FormSubmission {
	id: string;
	formId: string;
	formVersion: number;
	status: SubmissionStatus;
	values: Record<string, string | number | boolean>;
	createdAt: string;
	metadata: {
		userAgent?: string;
		referer?: string;
	};
}

export interface ValidationIssue {
	field: string;
	code: "required" | "invalid_type" | "invalid_format" | "too_short" | "too_long" | "too_small" | "too_large" | "invalid_option";
	message: string;
}
