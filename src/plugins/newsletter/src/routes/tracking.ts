import type { PluginContext, SandboxedRouteContext } from "emdash/plugin";
import { hashValue } from "../domain/security";
import { newsletterStorage } from "../infrastructure/storage";

async function deliveryFromToken(routeCtx: SandboxedRouteContext, ctx: PluginContext) {
	const input = routeCtx.input as Record<string, unknown>;
	if (typeof input?.token !== "string" || input.token.length < 20) return null;
	const result = await newsletterStorage(ctx).deliveries.query({ where: { trackingTokenHash: await hashValue(input.token) }, limit: 1 });
	return result.items[0] ?? null;
}

export async function trackOpenRoute(routeCtx: SandboxedRouteContext, ctx: PluginContext) {
	const item = await deliveryFromToken(routeCtx, ctx); if (!item) return { accepted: false };
	if (!item.data.openedAt) await newsletterStorage(ctx).deliveries.put(item.id, { ...item.data, openedAt: new Date().toISOString() });
	return { accepted: true };
}

export async function trackClickRoute(routeCtx: SandboxedRouteContext, ctx: PluginContext) {
	if (routeCtx.request.method.toUpperCase() !== "POST") throw new Response("Method not allowed", { status: 405 });
	const item = await deliveryFromToken(routeCtx, ctx); const input = routeCtx.input as Record<string, unknown>;
	if (!item || typeof input?.url !== "string") return { accepted: false };
	let destination: URL; try { destination = new URL(input.url); } catch { return { accepted: false }; }
	if (!['http:', 'https:'].includes(destination.protocol)) return { accepted: false };
	const campaign = await newsletterStorage(ctx).campaigns.get(item.data.campaignId);
	if (!campaign || !campaign.text.includes(destination.toString())) return { accepted: false };
	await newsletterStorage(ctx).deliveries.put(item.id, { ...item.data, clickedAt: new Date().toISOString(), clickCount: (item.data.clickCount ?? 0) + 1 });
	return { accepted: true, redirect: destination.toString() };
}
