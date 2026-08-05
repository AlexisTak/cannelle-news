import type { PluginContext, SandboxedRouteContext } from "emdash/plugin";
import { z } from "zod";
import { isAnalyticsEventType } from "../domain/collect";
import type { AnalyticsGoal } from "../domain/types";
import { analyticsStorage } from "../infrastructure/storage";

const goalSchema = z.object({ name: z.string().trim().min(1).max(120), eventType: z.string(), eventName: z.string().trim().max(100).optional() });

export async function goalsRoute(routeCtx: SandboxedRouteContext, ctx: PluginContext) {
	const storage = analyticsStorage(ctx);
	if (routeCtx.request.method.toUpperCase() === "GET") {
		const result = await storage.goals.query({ orderBy: { createdAt: "desc" }, limit: 100 });
		return { goals: result.items.map((item) => item.data) };
	}
	if (routeCtx.request.method.toUpperCase() !== "POST") throw new Response("Method not allowed", { status: 405 });
	const parsed = goalSchema.safeParse(routeCtx.input);
	if (!parsed.success || !isAnalyticsEventType(parsed.data.eventType)) throw new Response("Invalid goal", { status: 400 });
	const goal: AnalyticsGoal = { id: crypto.randomUUID(), name: parsed.data.name, eventType: parsed.data.eventType, eventName: parsed.data.eventName, createdAt: new Date().toISOString() };
	await storage.goals.put(goal.id, goal);
	return { success: true, goal };
}
