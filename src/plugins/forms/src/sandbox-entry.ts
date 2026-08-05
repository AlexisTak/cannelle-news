import type { SandboxedPlugin } from "emdash/plugin";
import { z } from "zod";
import { adminRoute } from "./routes/admin";
import { retryNotifications } from "./infrastructure/notifications";
import { exportSubmissionsRoute } from "./routes/export";
import { applySubmissionRetention } from "./infrastructure/retention";
import { archiveFormRoute, createFormRoute, duplicateFormRoute, getFormRoute, getPublicFormRoute, listFormsRoute, publishFormRoute, updateFormRoute } from "./routes/forms";
import { listSubmissionsRoute, submitFormRoute } from "./routes/submissions";

const plugin = {
	hooks: {
		"plugin:install": async (_event, ctx) => {
			await ctx.kv.set("settings:submissionRateLimit", 10);
			await ctx.kv.set("settings:submissionRateWindowSeconds", 600);
			await ctx.kv.set("settings:sendReceipt", false);
			await ctx.kv.set("settings:retentionDays", 365);
			await ctx.kv.set("settings:retentionMode", "anonymize");
			await ctx.cron?.schedule("retry-notifications", { schedule: "*/5 * * * *" });
			await ctx.cron?.schedule("submission-retention", { schedule: "15 3 * * *" });
			ctx.log.info("Cannelle Forms installé");
		},
		cron: async (event, ctx) => {
			if (event.name === "retry-notifications") await retryNotifications(ctx);
			if (event.name === "submission-retention") await applySubmissionRetention(ctx);
		},
	},
	routes: {
		create: { input: z.unknown(), handler: createFormRoute },
		get: { permission: "plugins:read", input: z.unknown(), handler: getFormRoute },
		public: { public: true, cacheControl: "public, max-age=60, stale-while-revalidate=300", input: z.unknown(), handler: getPublicFormRoute },
		list: { permission: "plugins:read", input: z.unknown(), handler: listFormsRoute },
		publish: { input: z.unknown(), handler: publishFormRoute },
		update: { input: z.unknown(), handler: updateFormRoute },
		duplicate: { input: z.unknown(), handler: duplicateFormRoute },
		archive: { input: z.unknown(), handler: archiveFormRoute },
		submit: { public: true, input: z.unknown(), handler: submitFormRoute },
		submissions: { permission: "plugins:read", input: z.unknown(), handler: listSubmissionsRoute },
		export: { input: z.unknown(), handler: exportSubmissionsRoute },
		admin: { input: z.unknown(), handler: adminRoute },
	},
} satisfies SandboxedPlugin;

export default plugin;
