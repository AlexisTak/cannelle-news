import type { BlockInteraction, BlockResponse } from "@emdash-cms/blocks/server";
import type { PluginContext, SandboxedRouteContext } from "emdash/plugin";
import { analyticsDashboard } from "../admin/blocks";
import { calculateOverview } from "../domain/overview";
import { goalsRoute } from "./goals";
import { analyticsStorage } from "../infrastructure/storage";

async function render(ctx: PluginContext): Promise<BlockResponse> {
	const since = new Date(Date.now() - 29 * 86_400_000).toISOString().slice(0, 10);
	const result = await analyticsStorage(ctx).events.query({ where: { date: { gte: since } }, limit: 5000 });
	return analyticsDashboard(calculateOverview(result.items.map((item) => item.data)), 30, result.hasMore);
}

export async function adminRoute(routeCtx: SandboxedRouteContext, ctx: PluginContext): Promise<BlockResponse> {
	const interaction = routeCtx.input as BlockInteraction;
	if (interaction?.type === "form_submit" && interaction.action_id === "create_goal") {
		await goalsRoute({ ...routeCtx, input: interaction.values, request: { ...routeCtx.request, method: "POST" } }, ctx);
		return { ...(await render(ctx)), toast: { message: "Objectif créé.", type: "success" } };
	}
	return render(ctx);
}
