import type { PluginContext, SandboxedRouteContext } from "emdash/plugin";
import { submissionsToCsv } from "../domain/export";
import { formsStorage } from "../infrastructure/storage";
import { assertMethod, jsonError } from "./http";

export async function exportSubmissionsRoute(routeCtx: SandboxedRouteContext, ctx: PluginContext) {
	assertMethod(routeCtx.request.method, "GET");
	const input = routeCtx.input && typeof routeCtx.input === "object" ? routeCtx.input as Record<string, unknown> : {};
	if (typeof input.formId !== "string" || !input.formId) throw jsonError(400, "validation_failed", "Le formulaire est obligatoire.");
	const format = input.format === "json" ? "json" : "csv";
	const storage = formsStorage(ctx);
	const form = await storage.forms.get(input.formId);
	if (!form) throw jsonError(404, "form_not_found", "Formulaire introuvable.");
	const result = await storage.submissions.query({ where: { formId: form.id }, limit: 1000 });
	const submissions = result.items.map((item) => item.data);
	return format === "json"
		? { filename: `${form.slug}-soumissions.json`, contentType: "application/json", content: JSON.stringify(submissions, null, 2), truncated: result.hasMore }
		: { filename: `${form.slug}-soumissions.csv`, contentType: "text/csv; charset=utf-8", content: submissionsToCsv(form, submissions), truncated: result.hasMore };
}
