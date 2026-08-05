import type { PluginContext, SandboxedRouteContext } from "emdash/plugin";
import { submitFormInputSchema } from "../domain/schemas";
import type { FormSubmission } from "../domain/types";
import { validateSubmission } from "../domain/validation";
import { consumeSubmissionQuota } from "../infrastructure/rate-limit";
import { queueSubmissionNotifications } from "../infrastructure/notifications";
import { enqueueEvent, recordAudit } from "../infrastructure/records";
import { formsStorage } from "../infrastructure/storage";
import { assertMethod, jsonError } from "./http";

function requestHeader(routeCtx: SandboxedRouteContext, name: string): string | undefined {
	const headers = routeCtx.request.headers;
	return headers[name.toLowerCase()] || undefined;
}

export async function submitFormRoute(routeCtx: SandboxedRouteContext, ctx: PluginContext) {
	assertMethod(routeCtx.request.method, "POST");
	const parsed = submitFormInputSchema.safeParse(routeCtx.input);
	if (!parsed.success) throw jsonError(400, "validation_failed", "La soumission est invalide.", { issues: parsed.error.issues });
	if (parsed.data._cannelle_website) return { success: true };

	const quota = await consumeSubmissionQuota(routeCtx, ctx, parsed.data.formId);
	if (!quota.allowed) throw jsonError(429, "rate_limited", "Trop de soumissions. Réessayez plus tard.", { retryAfter: quota.retryAfter });

	const storage = formsStorage(ctx);
	const form = await storage.forms.get(parsed.data.formId);
	if (!form || form.status !== "published") throw jsonError(404, "form_not_found", "Formulaire introuvable.");
	const validation = validateSubmission(form.fields, parsed.data.values);
	if (!validation.success) throw jsonError(422, "validation_failed", "Certains champs sont invalides.", { issues: validation.issues });

	const id = crypto.randomUUID();
	const submission: FormSubmission = {
		id,
		formId: form.id,
		formVersion: form.version,
		status: "new",
		values: validation.values,
		createdAt: new Date().toISOString(),
		metadata: {
			userAgent: requestHeader(routeCtx, "user-agent"),
			referer: requestHeader(routeCtx, "referer"),
		},
	};
	await storage.submissions.put(id, submission);
	await Promise.all([
		recordAudit(ctx, "form.submitted", { type: "submission", id }, { formId: form.id }),
		enqueueEvent(ctx, "cannelle.form.submitted", { formId: form.id, submissionId: id, formVersion: form.version }),
	]);
	try {
		await queueSubmissionNotifications(ctx, form, submission);
	} catch (error) {
		ctx.log.error(`Cannelle Forms notifications: ${error instanceof Error ? error.message : String(error)}`);
	}
	return { success: true, submissionId: id };
}

export async function listSubmissionsRoute(routeCtx: SandboxedRouteContext, ctx: PluginContext) {
	assertMethod(routeCtx.request.method, "GET");
	const input = routeCtx.input && typeof routeCtx.input === "object" ? routeCtx.input as Record<string, unknown> : {};
	if (typeof input.formId !== "string" || !input.formId) throw jsonError(400, "validation_failed", "Le formulaire est obligatoire.");
	const limit = Math.max(1, Math.min(100, Number(input.limit) || 50));
	const cursor = typeof input.cursor === "string" ? input.cursor : undefined;
	const result = await formsStorage(ctx).submissions.query({ where: { formId: input.formId }, limit, cursor });
	return {
		submissions: result.items.map((item) => item.data).sort((left, right) => right.createdAt.localeCompare(left.createdAt)),
		cursor: result.cursor,
		hasMore: result.hasMore,
	};
}
