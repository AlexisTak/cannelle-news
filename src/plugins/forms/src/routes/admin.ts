import type { BlockInteraction, BlockResponse } from "@emdash-cms/blocks/server";
import type { PluginContext, SandboxedRouteContext } from "emdash/plugin";
import { createFormBlocks, dashboardBlocks, editorBlocks, errorBlocks, submissionsBlocks } from "../admin/blocks";
import { parseEditorFields } from "../admin/editor";
import { fieldsForTemplate } from "../admin/templates";
import { formsStorage } from "../infrastructure/storage";
import { archiveFormRoute, createFormRoute, duplicateFormRoute, publishFormRoute, updateFormRoute } from "./forms";

function asInteraction(input: unknown): BlockInteraction | null {
	if (!input || typeof input !== "object" || !("type" in input)) return null;
	return input as BlockInteraction;
}

async function renderDashboard(ctx: PluginContext, cursor?: string): Promise<BlockResponse> {
	const storage = formsStorage(ctx);
	const [formsResult, formsCount, publishedCount, submissionCount] = await Promise.all([
		storage.forms.query({ orderBy: { createdAt: "desc" }, limit: 50, cursor }),
		storage.forms.count(),
		storage.forms.count({ status: "published" }),
		storage.submissions.count(),
	]);
	return dashboardBlocks(
		formsResult.items.map((item) => item.data),
		{ forms: formsCount, published: publishedCount, submissions: submissionCount },
		formsResult.cursor,
	);
}

async function renderSubmissions(ctx: PluginContext, formId: string, cursor?: string): Promise<BlockResponse> {
	const storage = formsStorage(ctx);
	const form = await storage.forms.get(formId);
	if (!form) return errorBlocks("Le formulaire demandé n'existe plus.");
	const result = await storage.submissions.query({ where: { formId }, limit: 50, cursor });
	return submissionsBlocks(
		form,
		result.items.map((item) => item.data).sort((left, right) => right.createdAt.localeCompare(left.createdAt)),
		result.cursor,
	);
}

async function renderEditor(ctx: PluginContext, formId: string): Promise<BlockResponse> {
	const form = await formsStorage(ctx).forms.get(formId);
	return form ? editorBlocks(form) : errorBlocks("Le formulaire demandé n'existe plus.");
}

export async function adminRoute(routeCtx: SandboxedRouteContext, ctx: PluginContext): Promise<BlockResponse> {
	const interaction = asInteraction(routeCtx.input);
	if (!interaction) return errorBlocks("Interaction d'administration invalide.");

	try {
		if (interaction.type === "page_load" || interaction.action_id === "back_to_dashboard") return renderDashboard(ctx);
		if (interaction.type === "block_action" && interaction.action_id === "show_create") return createFormBlocks();
		if (interaction.type === "block_action" && interaction.action_id.startsWith("publish_form:")) {
			const formId = interaction.action_id.slice("publish_form:".length);
			await publishFormRoute({ ...routeCtx, input: { id: formId }, request: { ...routeCtx.request, method: "POST" } }, ctx);
			return { ...(await renderEditor(ctx, formId)), toast: { message: "Formulaire publié.", type: "success" } };
		}
		if (interaction.type === "block_action" && interaction.action_id.startsWith("duplicate_form:")) {
			await duplicateFormRoute({ ...routeCtx, input: { id: interaction.action_id.slice("duplicate_form:".length) }, request: { ...routeCtx.request, method: "POST" } }, ctx);
			return { ...(await renderDashboard(ctx)), toast: { message: "Formulaire dupliqué.", type: "success" } };
		}
		if (interaction.type === "block_action" && interaction.action_id.startsWith("archive_form:")) {
			await archiveFormRoute({ ...routeCtx, input: { id: interaction.action_id.slice("archive_form:".length) }, request: { ...routeCtx.request, method: "POST" } }, ctx);
			return { ...(await renderDashboard(ctx)), toast: { message: "Formulaire archivé.", type: "success" } };
		}
		if (interaction.type === "block_action" && interaction.action_id === "forms_page") {
			return renderDashboard(ctx, typeof interaction.value === "string" ? interaction.value : undefined);
		}
		if (interaction.type === "block_action" && interaction.action_id.startsWith("submissions_page:")) {
			return renderSubmissions(ctx, interaction.action_id.slice("submissions_page:".length), typeof interaction.value === "string" ? interaction.value : undefined);
		}
		if (interaction.type === "form_submit" && interaction.action_id === "view_submissions") {
			const formId = interaction.values.formId;
			if (typeof formId !== "string") return errorBlocks("Sélectionnez un formulaire.");
			return renderSubmissions(ctx, formId);
		}
		if (interaction.type === "form_submit" && interaction.action_id === "edit_form") {
			const formId = interaction.values.formId;
			return typeof formId === "string" ? renderEditor(ctx, formId) : errorBlocks("Sélectionnez un formulaire.");
		}
		if (interaction.type === "form_submit" && interaction.action_id.startsWith("save_form:")) {
			const formId = interaction.action_id.slice("save_form:".length);
			await updateFormRoute({
				...routeCtx,
				input: { id: formId, title: interaction.values.title, slug: interaction.values.slug, fields: parseEditorFields(interaction.values) },
				request: { ...routeCtx.request, method: "POST" },
			}, ctx);
			return { ...(await renderEditor(ctx, formId)), toast: { message: "Nouvelle version enregistrée en brouillon.", type: "success" } };
		}
		if (interaction.type === "form_submit" && interaction.action_id === "create_form") {
			const { title, slug, template } = interaction.values;
			const fields = typeof template === "string" ? fieldsForTemplate(template) : null;
			if (typeof title !== "string" || typeof slug !== "string" || !fields) return errorBlocks("Les informations du formulaire sont incomplètes.");
			await createFormRoute({ ...routeCtx, input: { title, slug, fields }, request: { ...routeCtx.request, method: "POST" } }, ctx);
			const response = await renderDashboard(ctx);
			return { ...response, toast: { message: "Formulaire créé en brouillon.", type: "success" } };
		}
		return renderDashboard(ctx);
	} catch (error) {
		ctx.log.error(`Cannelle Forms admin: ${error instanceof Error ? error.message : String(error)}`);
		return errorBlocks("L'opération n'a pas pu être terminée.");
	}
}
