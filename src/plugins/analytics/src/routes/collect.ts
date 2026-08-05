import type { PluginContext, SandboxedRouteContext } from "emdash/plugin";
import { classifyDevice, collectInputSchema, isKnownBot, trafficSource } from "../domain/collect";
import type { AnalyticsEvent } from "../domain/types";
import { dailyVisitorId, requestCountry } from "../infrastructure/privacy";
import { analyticsStorage } from "../infrastructure/storage";

function header(routeCtx: SandboxedRouteContext, name: string): string {
	return routeCtx.request.headers[name.toLowerCase()] ?? "";
}

export async function collectRoute(routeCtx: SandboxedRouteContext, ctx: PluginContext) {
	if (routeCtx.request.method.toUpperCase() !== "POST") throw new Response("Method not allowed", { status: 405 });
	if ((await ctx.kv.get<boolean>("settings:enabled")) === false) return { accepted: false, reason: "disabled" };
	const parsed = collectInputSchema.safeParse(routeCtx.input);
	if (!parsed.success) throw new Response(JSON.stringify({ error: "invalid_event" }), { status: 400, headers: { "Content-Type": "application/json" } });
	if (parsed.data.dnt && (await ctx.kv.get<boolean>("settings:respectDnt")) !== false) return { accepted: false, reason: "dnt" };
	const userAgent = header(routeCtx, "user-agent");
	if (isKnownBot(userAgent)) return { accepted: false, reason: "bot" };
	const requestUrl = new URL(routeCtx.request.url);
	const referer = header(routeCtx, "referer") || null;
	if (referer) {
		try { if (new URL(referer).origin !== requestUrl.origin) return { accepted: false, reason: "origin" }; } catch { return { accepted: false, reason: "origin" }; }
	}
	const now = new Date();
	const date = now.toISOString().slice(0, 10);
	const event: AnalyticsEvent = {
		id: crypto.randomUUID(), type: parsed.data.type, name: parsed.data.name, path: parsed.data.path,
		title: parsed.data.title, visitorId: await dailyVisitorId(routeCtx, ctx, date, userAgent), date,
		createdAt: now.toISOString(), source: trafficSource(referer, requestUrl.origin), device: classifyDevice(userAgent),
		country: requestCountry(routeCtx), properties: parsed.data.properties,
	};
	await analyticsStorage(ctx).events.put(event.id, event);
	const goals = await analyticsStorage(ctx).goals.query({ where: { eventType: event.type }, limit: 100 });
	for (const item of goals.items) {
		if (item.data.eventName && item.data.eventName !== event.name) continue;
		const id = crypto.randomUUID();
		await analyticsStorage(ctx).goalCompletions.put(id, { goalId: item.data.id, eventId: event.id, visitorId: event.visitorId, date, createdAt: event.createdAt });
	}
	ctx.log.info(`Analytics event accepted: ${event.type}`);
	return { accepted: true };
}
