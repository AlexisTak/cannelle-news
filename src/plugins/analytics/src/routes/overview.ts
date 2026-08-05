import type { PluginContext, SandboxedRouteContext } from "emdash/plugin";
import { calculateOverview } from "../domain/overview";
import { analyticsStorage } from "../infrastructure/storage";

export async function overviewRoute(routeCtx: SandboxedRouteContext, ctx: PluginContext) {
	if (routeCtx.request.method.toUpperCase() !== "GET") throw new Response("Method not allowed", { status: 405 });
	const input = routeCtx.input && typeof routeCtx.input === "object" ? routeCtx.input as Record<string, unknown> : {};
	const days = Math.max(1, Math.min(365, Number(input.days) || 30));
	const since = new Date(Date.now() - (days - 1) * 86_400_000).toISOString().slice(0, 10);
	const result = await analyticsStorage(ctx).events.query({ where: { date: { gte: since } }, limit: 5000 });
	return { overview: calculateOverview(result.items.map((item) => item.data)), days, truncated: result.hasMore };
}
