import type { PluginContext, SandboxedRouteContext } from "emdash/plugin";
import { z } from "zod";
import { hashValue, normalizeEmail } from "../domain/security";
import { newsletterStorage } from "../infrastructure/storage";

const eventSchema = z.object({ type: z.enum(["bounce", "complaint"]), email: z.email(), campaignId: z.string().max(100).optional() });

export async function deliveryEventRoute(routeCtx: SandboxedRouteContext, ctx: PluginContext) {
	if (routeCtx.request.method.toUpperCase() !== "POST") throw new Response("Method not allowed", { status: 405 });
	const expected = await ctx.kv.get<string>("settings:eventWebhookSecret");
	const provided = routeCtx.request.headers["x-cannelle-signature"];
	if (!expected || !provided || provided !== expected) throw new Response("Unauthorized", { status: 401 });
	const parsed = eventSchema.safeParse(routeCtx.input); if (!parsed.success) throw new Response("Invalid event", { status: 400 });
	const storage = newsletterStorage(ctx); const emailHash = await hashValue(normalizeEmail(parsed.data.email)); const matches = await storage.subscribers.query({ where: { emailHash }, limit: 1 }); const subscriber = matches.items[0];
	if (!subscriber) return { accepted: true };
	const now = new Date().toISOString(); await storage.subscribers.put(subscriber.id, { ...subscriber.data, status: "unsubscribed", unsubscribedAt: now });
	await storage.suppressions.put(crypto.randomUUID(), { emailHash, reason: parsed.data.type, createdAt: now });
	await storage.consents.put(crypto.randomUUID(), { subscriberId: subscriber.id, type: parsed.data.type, createdAt: now });
	if (parsed.data.campaignId) await storage.deliveries.put(crypto.randomUUID(), { campaignId: parsed.data.campaignId, subscriberId: subscriber.id, status: parsed.data.type === "bounce" ? "bounced" : "complained", createdAt: now });
	return { accepted: true };
}
