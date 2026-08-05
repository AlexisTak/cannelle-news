import type { PluginContext, SandboxedRouteContext } from "emdash/plugin";
import { archiveFormInputSchema, createFormInputSchema, duplicateFormInputSchema, formIdInputSchema, publishFormInputSchema, updateFormInputSchema } from "../domain/schemas";
import type { FormDefinition, FormVersion } from "../domain/types";
import { enqueueEvent, recordAudit } from "../infrastructure/records";
import { formsStorage } from "../infrastructure/storage";
import { assertMethod, jsonError } from "./http";

export async function createFormRoute(routeCtx: SandboxedRouteContext, ctx: PluginContext) {
	assertMethod(routeCtx.request.method, "POST");
	const parsed = createFormInputSchema.safeParse(routeCtx.input);
	if (!parsed.success) throw jsonError(400, "validation_failed", "Le formulaire est invalide.", { issues: parsed.error.issues });

	const storage = formsStorage(ctx);
	const duplicate = await storage.forms.query({ where: { slug: parsed.data.slug }, limit: 1 });
	if (duplicate.items.length > 0) throw jsonError(409, "slug_conflict", "Ce slug est déjà utilisé.");

	const id = crypto.randomUUID();
	const now = new Date().toISOString();
	const form: FormDefinition = { id, ...parsed.data, status: "draft", version: 1, createdAt: now, updatedAt: now };
	const version: FormVersion = { formId: id, version: 1, definition: form, createdAt: now };

	await storage.forms.put(id, form);
	try {
		await storage.versions.put(`${id}:1`, version);
	} catch (error) {
		await storage.forms.delete(id);
		throw error;
	}
	await Promise.all([
		recordAudit(ctx, "form.created", { type: "form", id }, { slug: form.slug }),
		enqueueEvent(ctx, "cannelle.form.created", { formId: id, slug: form.slug, version: 1 }),
	]);
	return { success: true, form };
}

export async function getFormRoute(routeCtx: SandboxedRouteContext, ctx: PluginContext) {
	assertMethod(routeCtx.request.method, "GET");
	const parsed = formIdInputSchema.safeParse(routeCtx.input);
	if (!parsed.success) throw jsonError(400, "validation_failed", "Identifiant invalide.");
	const form = await formsStorage(ctx).forms.get(parsed.data.id);
	if (!form) throw jsonError(404, "form_not_found", "Formulaire introuvable.");
	return { form };
}

export async function getPublicFormRoute(routeCtx: SandboxedRouteContext, ctx: PluginContext) {
	assertMethod(routeCtx.request.method, "GET");
	const parsed = formIdInputSchema.safeParse(routeCtx.input);
	if (!parsed.success) throw jsonError(400, "validation_failed", "Identifiant invalide.");
	const form = await formsStorage(ctx).forms.get(parsed.data.id);
	if (!form || form.status !== "published") throw jsonError(404, "form_not_found", "Formulaire introuvable.");
	return {
		form: {
			id: form.id,
			title: form.title,
			version: form.version,
			fields: form.fields,
		},
	};
}

export async function listFormsRoute(routeCtx: SandboxedRouteContext, ctx: PluginContext) {
	assertMethod(routeCtx.request.method, "GET");
	const input = routeCtx.input && typeof routeCtx.input === "object" ? routeCtx.input as Record<string, unknown> : {};
	const limit = Math.max(1, Math.min(100, Number(input.limit) || 50));
	const cursor = typeof input.cursor === "string" ? input.cursor : undefined;
	const result = await formsStorage(ctx).forms.query({ orderBy: { createdAt: "desc" }, limit, cursor });
	return { forms: result.items.map((item) => item.data), cursor: result.cursor, hasMore: result.hasMore };
}

export async function publishFormRoute(routeCtx: SandboxedRouteContext, ctx: PluginContext) {
	assertMethod(routeCtx.request.method, "POST");
	const parsed = publishFormInputSchema.safeParse(routeCtx.input);
	if (!parsed.success) throw jsonError(400, "validation_failed", "Identifiant invalide.");
	const storage = formsStorage(ctx);
	const current = await storage.forms.get(parsed.data.id);
	if (!current) throw jsonError(404, "form_not_found", "Formulaire introuvable.");
	const now = new Date().toISOString();
	const form: FormDefinition = { ...current, status: "published", publishedAt: now, updatedAt: now };
	await storage.forms.put(form.id, form);
	await Promise.all([
		recordAudit(ctx, "form.published", { type: "form", id: form.id }),
		enqueueEvent(ctx, "cannelle.form.published", { formId: form.id, slug: form.slug, version: form.version }),
	]);
	return { success: true, form };
}

export async function updateFormRoute(routeCtx: SandboxedRouteContext, ctx: PluginContext) {
	assertMethod(routeCtx.request.method, "POST");
	const parsed = updateFormInputSchema.safeParse(routeCtx.input);
	if (!parsed.success) throw jsonError(400, "validation_failed", "Le formulaire est invalide.", { issues: parsed.error.issues });
	const storage = formsStorage(ctx);
	const current = await storage.forms.get(parsed.data.id);
	if (!current) throw jsonError(404, "form_not_found", "Formulaire introuvable.");
	const conflicts = await storage.forms.query({ where: { slug: parsed.data.slug }, limit: 2 });
	if (conflicts.items.some((item) => item.data.id !== current.id)) throw jsonError(409, "slug_conflict", "Ce slug est déjà utilisé.");

	const now = new Date().toISOString();
	const form: FormDefinition = {
		...current,
		title: parsed.data.title,
		slug: parsed.data.slug,
		fields: parsed.data.fields,
		version: current.version + 1,
		status: "draft",
		publishedAt: undefined,
		updatedAt: now,
	};
	await storage.forms.put(form.id, form);
	try {
		await storage.versions.put(`${form.id}:${form.version}`, { formId: form.id, version: form.version, definition: form, createdAt: now });
	} catch (error) {
		await storage.forms.put(current.id, current);
		throw error;
	}
	await Promise.all([
		recordAudit(ctx, "form.updated", { type: "form", id: form.id }, { version: form.version }),
		enqueueEvent(ctx, "cannelle.form.updated", { formId: form.id, slug: form.slug, version: form.version }),
	]);
	return { success: true, form };
}

export async function duplicateFormRoute(routeCtx: SandboxedRouteContext, ctx: PluginContext) {
	assertMethod(routeCtx.request.method, "POST");
	const parsed = duplicateFormInputSchema.safeParse(routeCtx.input);
	if (!parsed.success) throw jsonError(400, "validation_failed", "Identifiant invalide.");
	const storage = formsStorage(ctx);
	const source = await storage.forms.get(parsed.data.id);
	if (!source) throw jsonError(404, "form_not_found", "Formulaire introuvable.");

	let suffix = 2;
	let slug = `${source.slug}-copie`;
	while ((await storage.forms.query({ where: { slug }, limit: 1 })).items.length > 0) slug = `${source.slug}-copie-${suffix++}`;
	const id = crypto.randomUUID();
	const now = new Date().toISOString();
	const form: FormDefinition = {
		...structuredClone(source), id, slug, title: `${source.title} — copie`, status: "draft", version: 1,
		createdAt: now, updatedAt: now, publishedAt: undefined,
	};
	await storage.forms.put(id, form);
	try {
		await storage.versions.put(`${id}:1`, { formId: id, version: 1, definition: form, createdAt: now });
	} catch (error) {
		await storage.forms.delete(id);
		throw error;
	}
	await Promise.all([
		recordAudit(ctx, "form.duplicated", { type: "form", id }, { sourceFormId: source.id }),
		enqueueEvent(ctx, "cannelle.form.created", { formId: id, slug, version: 1, duplicatedFrom: source.id }),
	]);
	return { success: true, form };
}

export async function archiveFormRoute(routeCtx: SandboxedRouteContext, ctx: PluginContext) {
	assertMethod(routeCtx.request.method, "POST");
	const parsed = archiveFormInputSchema.safeParse(routeCtx.input);
	if (!parsed.success) throw jsonError(400, "validation_failed", "Identifiant invalide.");
	const storage = formsStorage(ctx);
	const current = await storage.forms.get(parsed.data.id);
	if (!current) throw jsonError(404, "form_not_found", "Formulaire introuvable.");
	const form: FormDefinition = { ...current, status: "archived", updatedAt: new Date().toISOString() };
	await storage.forms.put(form.id, form);
	await Promise.all([
		recordAudit(ctx, "form.archived", { type: "form", id: form.id }),
		enqueueEvent(ctx, "cannelle.form.updated", { formId: form.id, status: "archived", version: form.version }),
	]);
	return { success: true, form };
}
