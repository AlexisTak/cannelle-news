import type { PluginContext, SandboxedRouteContext } from "emdash/plugin";
import { z } from "zod";
import type { NewsletterList, NewsletterTemplate } from "../domain/types";
import { newsletterStorage } from "../infrastructure/storage";

export async function listsRoute(routeCtx: SandboxedRouteContext, ctx: PluginContext) {
	const storage = newsletterStorage(ctx);
	if (routeCtx.request.method.toUpperCase() === "GET") { const result = await storage.lists.query({ orderBy: { createdAt: "desc" }, limit: 100 }); return { lists: result.items.map((item) => item.data) }; }
	if (routeCtx.request.method.toUpperCase() !== "POST") throw new Response("Method not allowed", { status: 405 });
	const parsed = z.object({ name: z.string().trim().min(1).max(120) }).safeParse(routeCtx.input); if (!parsed.success) throw new Response("Invalid list", { status: 400 });
	const list: NewsletterList = { id: crypto.randomUUID(), name: parsed.data.name, createdAt: new Date().toISOString() }; await storage.lists.put(list.id, list); return { success: true, list };
}

export async function templatesRoute(routeCtx: SandboxedRouteContext, ctx: PluginContext) {
	const storage = newsletterStorage(ctx);
	if (routeCtx.request.method.toUpperCase() === "GET") { const result = await storage.templates.query({ orderBy: { createdAt: "desc" }, limit: 100 }); return { templates: result.items.map((item) => item.data) }; }
	if (routeCtx.request.method.toUpperCase() !== "POST") throw new Response("Method not allowed", { status: 405 });
	const parsed = z.object({ name: z.string().trim().min(1).max(120), subject: z.string().trim().min(1).max(200), text: z.string().min(1).max(100_000) }).safeParse(routeCtx.input); if (!parsed.success) throw new Response("Invalid template", { status: 400 });
	const template: NewsletterTemplate = { id: crypto.randomUUID(), ...parsed.data, createdAt: new Date().toISOString() }; await storage.templates.put(template.id, template); return { success: true, template };
}
