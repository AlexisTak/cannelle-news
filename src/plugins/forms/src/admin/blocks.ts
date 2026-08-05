import { blocks, elements, type Block, type BlockResponse, type FormField } from "@emdash-cms/blocks/server";
import type { FormDefinition, FormSubmission } from "../domain/types";
import { EDITOR_FIELD_SLOTS } from "./editor";

export function createFormBlocks(): BlockResponse {
	return {
		blocks: [
			blocks.header("Nouveau formulaire"),
			blocks.section("Choisissez un modèle. Les champs pourront être personnalisés dans une prochaine évolution de l'éditeur."),
			blocks.form({
				blockId: "create-form",
				fields: [
					elements.textInput("title", "Titre", { placeholder: "Formulaire de contact" }),
					elements.textInput("slug", "Slug", { placeholder: "contact" }),
					elements.select("template", "Modèle", [
						{ label: "Contact", value: "contact" },
						{ label: "Demande de devis", value: "quote" },
						{ label: "Inscription", value: "registration" },
					], { initialValue: "contact" }),
				],
				submit: { label: "Créer le brouillon", actionId: "create_form" },
			}),
			blocks.actions([elements.button("back_to_dashboard", "Annuler", { style: "secondary" })]),
		],
	};
}

export function dashboardBlocks(
	forms: FormDefinition[],
	counts: { forms: number; published: number; submissions: number },
	nextCursor?: string,
): BlockResponse {
	const content: Block[] = [
		blocks.header("Cannelle Forms"),
		blocks.section("Créez, publiez et suivez vos formulaires sans service externe.", {
			accessory: elements.button("show_create", "Nouveau formulaire", { style: "primary" }),
		}),
		blocks.stats([
			{ label: "Formulaires", value: counts.forms },
			{ label: "Publiés", value: counts.published },
			{ label: "Soumissions", value: counts.submissions },
		]),
	];

	if (forms.length === 0) {
		content.push(blocks.empty({
			title: "Aucun formulaire",
			description: "Créez votre premier formulaire à partir d'un modèle prêt à l'emploi.",
			actions: [elements.button("show_create", "Créer un formulaire", { style: "primary" })],
		}));
		return { blocks: content };
	}

	content.push(blocks.table({
		blockId: "forms-table",
		columns: [
			{ key: "title", label: "Formulaire", format: "text" },
			{ key: "slug", label: "Slug", format: "code" },
			{ key: "status", label: "Statut", format: "badge" },
			{ key: "updatedAt", label: "Dernière modification", format: "relative_time" },
		],
		rows: forms.map((form) => ({
			title: form.title,
			slug: form.slug,
			status: form.status,
			updatedAt: form.updatedAt,
		})),
		nextCursor,
		pageActionId: "forms_page",
		emptyText: "Aucun formulaire",
	}));

	content.push(blocks.header("Gérer un formulaire"));
	content.push(blocks.form({
		blockId: "form-manager",
		fields: [elements.select("formId", "Formulaire", forms.map((form) => ({ label: form.title, value: form.id })))],
		submit: { label: "Ouvrir l'éditeur", actionId: "edit_form" },
	}));

	content.push(blocks.header("Consulter les soumissions"));
	content.push(blocks.form({
		blockId: "submissions-picker",
		fields: [elements.select("formId", "Formulaire", forms.map((form) => ({ label: form.title, value: form.id })))],
		submit: { label: "Afficher", actionId: "view_submissions" },
	}));
	return { blocks: content };
}

export function editorBlocks(form: FormDefinition): BlockResponse {
	if (form.fields.length > EDITOR_FIELD_SLOTS) {
		return {
			blocks: [
				blocks.header(`Éditeur — ${form.title}`),
				blocks.banner({
					title: "Formulaire trop volumineux pour l'éditeur visuel",
					description: `Ce formulaire contient ${form.fields.length} champs. L'éditeur actuel en prend en charge ${EDITOR_FIELD_SLOTS} sans perte de données.`,
					variant: "alert",
				}),
				blocks.actions([elements.button("back_to_dashboard", "Retour", { style: "secondary" })]),
			],
		};
	}
	const editorFields: FormField[] = [
		elements.textInput("title", "Titre", { initialValue: form.title }),
		elements.textInput("slug", "Slug", { initialValue: form.slug }),
	];
	for (let index = 0; index < EDITOR_FIELD_SLOTS; index += 1) {
		const field = form.fields[index];
		editorFields.push(elements.toggle(`field_${index}_enabled`, `Champ ${index + 1} activé`, { initialValue: Boolean(field) }));
		editorFields.push(elements.textInput(`field_${index}_id`, `Champ ${index + 1} — identifiant`, { initialValue: field?.id ?? `field-${index + 1}` }));
		editorFields.push(elements.textInput(`field_${index}_name`, `Champ ${index + 1} — nom technique`, { initialValue: field?.name ?? "" }));
		editorFields.push(elements.textInput(`field_${index}_label`, `Champ ${index + 1} — libellé`, { initialValue: field?.label ?? "" }));
		editorFields.push(elements.select(`field_${index}_type`, `Champ ${index + 1} — type`, [
			{ label: "Texte", value: "text" }, { label: "Texte long", value: "textarea" },
			{ label: "E-mail", value: "email" }, { label: "Nombre", value: "number" },
			{ label: "Case à cocher", value: "checkbox" }, { label: "Liste", value: "select" },
			{ label: "Consentement", value: "consent" },
		], { initialValue: field?.type ?? "text" }));
		editorFields.push(elements.toggle(`field_${index}_required`, `Champ ${index + 1} obligatoire`, { initialValue: field?.required ?? false }));
		editorFields.push(elements.numberInput(`field_${index}_min_length`, `Champ ${index + 1} — longueur minimale`, { initialValue: field?.minLength, min: 0, max: 10_000 }));
		editorFields.push(elements.numberInput(`field_${index}_max_length`, `Champ ${index + 1} — longueur maximale`, { initialValue: field?.maxLength, min: 1, max: 100_000 }));
		editorFields.push(elements.numberInput(`field_${index}_min`, `Champ ${index + 1} — valeur minimale`, { initialValue: field?.min }));
		editorFields.push(elements.numberInput(`field_${index}_max`, `Champ ${index + 1} — valeur maximale`, { initialValue: field?.max }));
		editorFields.push(elements.textInput(`field_${index}_options`, `Champ ${index + 1} — options (une par ligne)`, { multiline: true, initialValue: field?.options?.map((option) => option.value).join("\n") ?? "" }));
		editorFields.push(elements.textInput(`field_${index}_validation_message`, `Champ ${index + 1} — message d'erreur personnalisé`, { initialValue: field?.validationMessage ?? "" }));
	}

	return {
		blocks: [
			blocks.header(`Éditeur — ${form.title}`),
			blocks.fields([{ label: "Statut", value: form.status }, { label: "Version", value: String(form.version) }]),
			blocks.banner({ title: "Publication", description: "Enregistrer une modification remet le formulaire en brouillon. Publiez-le ensuite pour rendre la nouvelle version publique." }),
			blocks.form({ blockId: `editor:${form.id}`, fields: editorFields, submit: { label: "Enregistrer une nouvelle version", actionId: `save_form:${form.id}` } }),
			blocks.actions([
				elements.button(`publish_form:${form.id}`, "Publier", { style: "primary" }),
				elements.button(`duplicate_form:${form.id}`, "Dupliquer", { style: "secondary" }),
				elements.button(`archive_form:${form.id}`, "Archiver", { style: "danger", confirm: { title: "Archiver ce formulaire ?", text: "Il ne pourra plus recevoir de soumissions.", confirm: "Archiver", deny: "Annuler", style: "danger" } }),
				elements.button("back_to_dashboard", "Retour", { style: "secondary" }),
			]),
		],
	};
}

export function submissionsBlocks(form: FormDefinition, submissions: FormSubmission[], nextCursor?: string): BlockResponse {
	const rows = submissions.map((submission) => ({
		id: submission.id,
		status: submission.status,
		createdAt: submission.createdAt,
		values: JSON.stringify(submission.values),
	}));
	return {
		blocks: [
			blocks.header(`Soumissions — ${form.title}`),
			blocks.actions([elements.button("back_to_dashboard", "Retour aux formulaires", { style: "secondary" })]),
			blocks.stats([{ label: "Résultats affichés", value: submissions.length }]),
			blocks.table({
				blockId: "submissions-table",
				columns: [
					{ key: "status", label: "Statut", format: "badge" },
					{ key: "createdAt", label: "Date", format: "relative_time" },
					{ key: "values", label: "Valeurs", format: "code" },
				],
				rows,
				nextCursor,
				pageActionId: `submissions_page:${form.id}`,
				emptyText: "Aucune soumission pour ce formulaire",
			}),
		],
	};
}

export function errorBlocks(message: string): BlockResponse {
	return {
		blocks: [
			blocks.header("Cannelle Forms"),
			blocks.banner({ title: "Une erreur est survenue", description: message, variant: "error" }),
			blocks.actions([elements.button("back_to_dashboard", "Retour", { style: "secondary" })]),
		],
		toast: { message, type: "error" },
	};
}
