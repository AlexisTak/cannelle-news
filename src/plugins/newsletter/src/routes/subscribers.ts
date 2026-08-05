import type { PluginContext, SandboxedRouteContext } from "emdash/plugin";
import { z } from "zod";
import type { Subscriber } from "../domain/types";
import { createToken, hashValue, normalizeEmail } from "../domain/security";
import { newsletterStorage } from "../infrastructure/storage";

const subscribeSchema = z.object({ email: z.email(), listId: z.string().min(1).max(100).default("main"), source: z.string().max(100).default("website") });

export async function subscribeRoute(routeCtx: SandboxedRouteContext, ctx: PluginContext) {
	if (routeCtx.request.method.toUpperCase() !== "POST") throw new Response("Method not allowed", { status: 405 });
	const parsed = subscribeSchema.safeParse(routeCtx.input); if (!parsed.success) throw new Response("Invalid email", { status: 400 });
	await ctx.kv.set("settings:siteOrigin", new URL(routeCtx.request.url).origin);
	const email = normalizeEmail(parsed.data.email); const emailHash = await hashValue(email); const storage = newsletterStorage(ctx);
	const existing = await storage.subscribers.query({ where: { emailHash }, limit: 1 });
	if (existing.items[0]?.data.status === "confirmed") return { success: true, pending: false };
	const confirmToken = createToken(); const unsubscribeToken = createToken(); const now = new Date().toISOString();
	const subscriber: Subscriber = {
		id: existing.items[0]?.id ?? crypto.randomUUID(), email, emailHash, status: "pending", listId: parsed.data.listId,
		source: parsed.data.source, confirmTokenHash: await hashValue(confirmToken), unsubscribeTokenHash: await hashValue(unsubscribeToken), createdAt: existing.items[0]?.data.createdAt ?? now,
	};
	const doubleOptIn = (await ctx.kv.get<boolean>("settings:doubleOptIn")) !== false;
	if (!doubleOptIn) { subscriber.status = "confirmed"; subscriber.confirmedAt = now; }
	await storage.subscribers.put(subscriber.id, subscriber);
	await storage.consents.put(crypto.randomUUID(), { subscriberId: subscriber.id, type: "signup", source: subscriber.source, createdAt: now });
	if (doubleOptIn) {
		if (!ctx.email) throw new Response("Email provider unavailable", { status: 503 });
		const origin = new URL(routeCtx.request.url).origin; const subject = (await ctx.kv.get<string>("settings:confirmationSubject")) ?? "Confirmez votre inscription";
		await ctx.email.send({ to: email, subject, text: `Confirmez votre inscription : ${origin}/_emdash/api/plugins/cannelle-newsletter/confirm?token=${confirmToken}` });
	}
	return { success: true, pending: doubleOptIn };
}

async function tokenSubscriber(ctx: PluginContext, field: "confirmTokenHash" | "unsubscribeTokenHash", token: unknown) {
	if (typeof token !== "string" || token.length < 20) return null;
	const result = await newsletterStorage(ctx).subscribers.query({ where: { [field]: await hashValue(token) }, limit: 1 });
	return result.items[0] ?? null;
}

export async function confirmRoute(routeCtx: SandboxedRouteContext, ctx: PluginContext) {
	const input = routeCtx.input as Record<string, unknown>; const item = await tokenSubscriber(ctx, "confirmTokenHash", input?.token);
	if (!item) throw new Response("Invalid token", { status: 404 });
	const now = new Date().toISOString(); await newsletterStorage(ctx).subscribers.put(item.id, { ...item.data, status: "confirmed", confirmedAt: now, confirmTokenHash: "used" });
	await newsletterStorage(ctx).consents.put(crypto.randomUUID(), { subscriberId: item.id, type: "confirmed", createdAt: now });
	return { success: true, message: "Inscription confirmée." };
}

export async function unsubscribeRoute(routeCtx: SandboxedRouteContext, ctx: PluginContext) {
	const input = routeCtx.input as Record<string, unknown>; const item = await tokenSubscriber(ctx, "unsubscribeTokenHash", input?.token);
	if (!item) throw new Response("Invalid token", { status: 404 });
	const now = new Date().toISOString(); await newsletterStorage(ctx).subscribers.put(item.id, { ...item.data, status: "unsubscribed", unsubscribedAt: now });
	await newsletterStorage(ctx).consents.put(crypto.randomUUID(), { subscriberId: item.id, type: "unsubscribed", createdAt: now });
	return { success: true, message: "Désinscription enregistrée." };
}

export async function listSubscribersRoute(routeCtx: SandboxedRouteContext, ctx: PluginContext) {
	if (routeCtx.request.method.toUpperCase() !== "GET") throw new Response("Method not allowed", { status: 405 });
	const result = await newsletterStorage(ctx).subscribers.query({ orderBy: { createdAt: "desc" }, limit: 100 });
	return { subscribers: result.items.map((item) => ({ ...item.data, confirmTokenHash: undefined, unsubscribeTokenHash: undefined })) };
}
