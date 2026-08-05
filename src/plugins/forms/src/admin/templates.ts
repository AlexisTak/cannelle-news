import type { FormField } from "../domain/types";

export type FormTemplateId = "contact" | "quote" | "registration";

const templates: Record<FormTemplateId, FormField[]> = {
	contact: [
		{ id: "name", name: "name", label: "Nom", type: "text", required: true, maxLength: 120 },
		{ id: "email", name: "email", label: "E-mail", type: "email", required: true, maxLength: 254 },
		{ id: "message", name: "message", label: "Message", type: "textarea", required: true, minLength: 10, maxLength: 5_000 },
		{ id: "consent", name: "consent", label: "J'accepte que mes données soient utilisées pour répondre à ma demande", type: "consent", required: true },
	],
	quote: [
		{ id: "company", name: "company", label: "Entreprise", type: "text", required: true, maxLength: 160 },
		{ id: "email", name: "email", label: "E-mail", type: "email", required: true, maxLength: 254 },
		{ id: "budget", name: "budget", label: "Budget estimé", type: "number", required: false, min: 0 },
		{ id: "project", name: "project", label: "Description du projet", type: "textarea", required: true, minLength: 20, maxLength: 10_000 },
		{ id: "consent", name: "consent", label: "J'accepte le traitement de cette demande", type: "consent", required: true },
	],
	registration: [
		{ id: "first_name", name: "first_name", label: "Prénom", type: "text", required: true, maxLength: 100 },
		{ id: "last_name", name: "last_name", label: "Nom", type: "text", required: true, maxLength: 100 },
		{ id: "email", name: "email", label: "E-mail", type: "email", required: true, maxLength: 254 },
		{ id: "consent", name: "consent", label: "J'accepte les conditions d'inscription", type: "consent", required: true },
	],
};

export function fieldsForTemplate(template: string): FormField[] | null {
	if (!(template in templates)) return null;
	return structuredClone(templates[template as FormTemplateId]);
}
