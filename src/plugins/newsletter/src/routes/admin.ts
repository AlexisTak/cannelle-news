import type { BlockInteraction, BlockResponse } from "@emdash-cms/blocks/server";
import type { PluginContext, SandboxedRouteContext } from "emdash/plugin";
import { newsletterDashboard } from "../admin/blocks";
import { newsletterStorage } from "../infrastructure/storage";
import { campaignsRoute, scheduleCampaignRoute } from "./campaigns";

async function render(ctx: PluginContext): Promise<BlockResponse> {
	const storage = newsletterStorage(ctx); const [confirmed, pending, unsubscribed, campaigns] = await Promise.all([storage.subscribers.count({ status: "confirmed" }), storage.subscribers.count({ status: "pending" }), storage.subscribers.count({ status: "unsubscribed" }), storage.campaigns.query({ orderBy: { createdAt: "desc" }, limit: 50 })]);
	return newsletterDashboard({ confirmed, pending, unsubscribed }, campaigns.items.map((item) => item.data));
}
export async function adminRoute(routeCtx: SandboxedRouteContext, ctx: PluginContext): Promise<BlockResponse> {
	const interaction = routeCtx.input as BlockInteraction; if (interaction?.type === "form_submit" && interaction.action_id === "create_campaign") {
		await campaignsRoute({ ...routeCtx, input: interaction.values, request: { ...routeCtx.request, method: "POST" } }, ctx); return { ...(await render(ctx)), toast: { message: "Campagne créée.", type: "success" } };
	}
	if (interaction?.type === "form_submit" && interaction.action_id === "schedule_campaign") {
		const scheduledAt = typeof interaction.values.scheduledAt === "string" ? `${interaction.values.scheduledAt}T09:00:00.000Z` : new Date().toISOString();
		await scheduleCampaignRoute({ ...routeCtx, input: { id: interaction.values.id, scheduledAt }, request: { ...routeCtx.request, method: "POST" } }, ctx);
		return { ...(await render(ctx)), toast: { message: "Campagne programmée.", type: "success" } };
	}
	return render(ctx);
}
