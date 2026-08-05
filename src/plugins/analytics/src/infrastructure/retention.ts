import { retentionCutoff } from "@cannelle/plugin-core";
import type { PluginContext } from "emdash/plugin";
import { analyticsStorage } from "./storage";

export async function applyAnalyticsRetention(ctx: PluginContext, now = new Date()): Promise<number> {
	const configured = (await ctx.kv.get<number>("settings:retentionDays")) ?? 365;
	const days = Number.isInteger(configured) && configured >= 1 && configured <= 3650 ? configured : 365;
	const cutoff = retentionCutoff({ days, mode: "delete" }, now).toISOString().slice(0, 10);
	const storage = analyticsStorage(ctx);
	const expired = await storage.events.query({ where: { date: { lt: cutoff } }, limit: 1000 });
	let deleted = 0;
	for (const item of expired.items) if (await storage.events.delete(item.id)) deleted += 1;
	return deleted;
}
