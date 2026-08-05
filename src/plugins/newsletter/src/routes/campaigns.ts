import type { PluginContext, SandboxedRouteContext } from "emdash/plugin";
import { z } from "zod";
import type { Campaign } from "../domain/types";
import { createToken, hashValue } from "../domain/security";
import { newsletterStorage } from "../infrastructure/storage";
import { trackedHtml } from "../domain/message";

const campaignSchema = z.object({ name: z.string().trim().min(1).max(160), subject: z.string().trim().min(1).max(200), text: z.string().min(1).max(100_000), listId: z.string().min(1).max(100).default("main") });

export async function campaignsRoute(routeCtx: SandboxedRouteContext, ctx: PluginContext) {
	const storage = newsletterStorage(ctx);
	if (routeCtx.request.method.toUpperCase() === "GET") {
		const result = await storage.campaigns.query({ orderBy: { createdAt: "desc" }, limit: 100 }); return { campaigns: result.items.map((item) => item.data) };
	}
	if (routeCtx.request.method.toUpperCase() !== "POST") throw new Response("Method not allowed", { status: 405 });
	const parsed = campaignSchema.safeParse(routeCtx.input); if (!parsed.success) throw new Response("Invalid campaign", { status: 400 });
	const campaign: Campaign = { id: crypto.randomUUID(), ...parsed.data, status: "draft", createdAt: new Date().toISOString() };
	await storage.campaigns.put(campaign.id, campaign); return { success: true, campaign };
}

export async function scheduleCampaignRoute(routeCtx: SandboxedRouteContext, ctx: PluginContext) {
	const input = routeCtx.input as Record<string, unknown>; if (typeof input?.id !== "string") throw new Response("Invalid id", { status: 400 });
	const storage = newsletterStorage(ctx); const campaign = await storage.campaigns.get(input.id); if (!campaign) throw new Response("Not found", { status: 404 });
	const scheduledAt = typeof input.scheduledAt === "string" && !Number.isNaN(Date.parse(input.scheduledAt)) ? new Date(input.scheduledAt).toISOString() : new Date().toISOString();
	const updated: Campaign = { ...campaign, status: "scheduled", scheduledAt }; await storage.campaigns.put(campaign.id, updated); return { success: true, campaign: updated };
}

export async function testCampaignRoute(routeCtx: SandboxedRouteContext, ctx: PluginContext) {
	const input = routeCtx.input as Record<string, unknown>; if (typeof input?.id !== "string" || typeof input.email !== "string") throw new Response("Invalid input", { status: 400 });
	const campaign = await newsletterStorage(ctx).campaigns.get(input.id); if (!campaign) throw new Response("Not found", { status: 404 });
	if (!ctx.email) throw new Response("Email provider unavailable", { status: 503 }); await ctx.email.send({ to: input.email, subject: `[TEST] ${campaign.subject}`, text: campaign.text }); return { success: true };
}

export async function processCampaigns(ctx: PluginContext, origin: string): Promise<void> {
	const storage = newsletterStorage(ctx); const due = await storage.campaigns.query({ where: { status: "scheduled" }, limit: 20 }); const now = new Date().toISOString();
	for (const item of due.items) {
		let campaign = item.data; if (!campaign.scheduledAt || campaign.scheduledAt > now) continue;
		await storage.campaigns.put(campaign.id, { ...campaign, status: "sending" });
		const subscribers = await storage.subscribers.query({ where: { status: "confirmed" }, limit: 500, cursor: campaign.cursor });
		for (const subscriberItem of subscribers.items) {
			if (subscriberItem.data.listId !== campaign.listId) continue;
			const token = createToken(); const trackingToken = createToken(); const subscriber = { ...subscriberItem.data, unsubscribeTokenHash: await hashValue(token) }; await storage.subscribers.put(subscriber.id, subscriber);
			const deliveryId = crypto.randomUUID(); const delivery = { campaignId: campaign.id, subscriberId: subscriber.id, status: "pending" as const, createdAt: new Date().toISOString(), trackingTokenHash: await hashValue(trackingToken) };
			await storage.deliveries.put(deliveryId, delivery);
			try {
				if (!ctx.email) throw new Error("Aucun fournisseur e-mail configuré");
				await ctx.email.send({ to: subscriber.email, subject: campaign.subject, text: `${campaign.text}\n\nSe désinscrire : ${origin}/_emdash/api/plugins/cannelle-newsletter/unsubscribe?token=${token}`, html: trackedHtml(campaign.text, origin, trackingToken, token) });
				await storage.deliveries.put(deliveryId, { ...delivery, status: "sent" });
			} catch (error) {
				await storage.deliveries.put(deliveryId, { ...delivery, status: "failed", error: error instanceof Error ? error.message.slice(0, 500) : "Erreur" });
			}
		}
		campaign = subscribers.hasMore ? { ...campaign, status: "scheduled", cursor: subscribers.cursor, scheduledAt: now } : { ...campaign, status: "sent", cursor: undefined, sentAt: now };
		await storage.campaigns.put(campaign.id, campaign);
	}
}

export async function campaignStatsRoute(routeCtx: SandboxedRouteContext, ctx: PluginContext) {
	const input = routeCtx.input as Record<string, unknown>; if (typeof input?.id !== "string") throw new Response("Invalid id", { status: 400 });
	const storage = newsletterStorage(ctx); const result = await storage.deliveries.query({ where: { campaignId: input.id }, limit: 1000 });
	const deliveries = result.items.map((item) => item.data); const count = (status: string) => deliveries.filter((item) => item.status === status).length;
	return { sent: count("sent"), failed: count("failed"), bounced: count("bounced"), complained: count("complained"), opened: deliveries.filter((item) => item.openedAt).length, clicked: deliveries.filter((item) => item.clickedAt).length, total: deliveries.length, truncated: result.hasMore };
}
