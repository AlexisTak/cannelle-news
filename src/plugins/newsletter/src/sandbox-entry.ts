import type { SandboxedPlugin } from "emdash/plugin";
import { z } from "zod";
import { adminRoute } from "./routes/admin";
import { campaignStatsRoute, campaignsRoute, processCampaigns, scheduleCampaignRoute, testCampaignRoute } from "./routes/campaigns";
import { confirmRoute, listSubscribersRoute, subscribeRoute, unsubscribeRoute } from "./routes/subscribers";
import { exportSubscribersRoute, importSubscribersRoute } from "./routes/import-export";
import { listsRoute, templatesRoute } from "./routes/catalog";
import { deliveryEventRoute } from "./routes/deliverability";
import { trackClickRoute, trackOpenRoute } from "./routes/tracking";

export default {
	hooks: {
		"plugin:install": async (_event, ctx) => {
			await ctx.kv.set("settings:doubleOptIn", true); await ctx.kv.set("settings:fromName", "Cannelle");
			await ctx.storage.lists.put("main", { id: "main", name: "Liste principale", createdAt: new Date().toISOString() });
			await ctx.cron?.schedule("send-campaigns", { schedule: "* * * * *", data: { origin: "" } });
		},
		cron: async (event, ctx) => { if (event.name === "send-campaigns") { const origin = (await ctx.kv.get<string>("settings:siteOrigin")) ?? ""; await processCampaigns(ctx, origin); } },
	},
	routes: {
		subscribe: { public: true, input: z.unknown(), handler: subscribeRoute }, confirm: { public: true, input: z.unknown(), handler: confirmRoute }, unsubscribe: { public: true, input: z.unknown(), handler: unsubscribeRoute },
		subscribers: { input: z.unknown(), handler: listSubscribersRoute }, campaigns: { input: z.unknown(), handler: campaignsRoute },
		lists: { input: z.unknown(), handler: listsRoute }, templates: { input: z.unknown(), handler: templatesRoute },
		"delivery-event": { public: true, input: z.unknown(), handler: deliveryEventRoute },
		open: { public: true, cacheControl: "no-store", input: z.unknown(), handler: trackOpenRoute }, click: { public: true, input: z.unknown(), handler: trackClickRoute },
		"subscribers/import": { input: z.unknown(), handler: importSubscribersRoute }, "subscribers/export": { input: z.unknown(), handler: exportSubscribersRoute },
		"campaign/schedule": { input: z.unknown(), handler: scheduleCampaignRoute }, "campaign/test": { input: z.unknown(), handler: testCampaignRoute }, "campaign/stats": { permission: "plugins:read", input: z.unknown(), handler: campaignStatsRoute },
		admin: { input: z.unknown(), handler: adminRoute },
	},
} satisfies SandboxedPlugin;
