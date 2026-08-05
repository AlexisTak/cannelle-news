import type { SandboxedPlugin } from "emdash/plugin";
import { z } from "zod";
import { TRACKER_CODE } from "./tracker";
import { adminRoute } from "./routes/admin";
import { collectRoute } from "./routes/collect";
import { goalsRoute } from "./routes/goals";
import { overviewRoute } from "./routes/overview";
import { applyAnalyticsRetention } from "./infrastructure/retention";

export default {
	hooks: {
		"plugin:install": async (_event, ctx) => {
			await ctx.kv.set("settings:enabled", true); await ctx.kv.set("settings:respectDnt", true);
			await ctx.kv.set("settings:retentionDays", 365); await ctx.kv.set("settings:excludeAdmins", true);
			await ctx.cron?.schedule("analytics-retention", { schedule: "45 3 * * *" });
		},
		cron: async (event, ctx) => { if (event.name === "analytics-retention") await applyAnalyticsRetention(ctx); },
		"page:fragments": async (_event, ctx) => (await ctx.kv.get<boolean>("settings:enabled")) === false ? null : ({ kind: "inline-script", placement: "body:end", code: TRACKER_CODE, key: "cannelle-analytics-tracker" }),
	},
	routes: {
		collect: { public: true, input: z.unknown(), handler: collectRoute },
		overview: { permission: "plugins:read", input: z.unknown(), handler: overviewRoute }, goals: { input: z.unknown(), handler: goalsRoute },
		admin: { input: z.unknown(), handler: adminRoute },
	},
} satisfies SandboxedPlugin;
