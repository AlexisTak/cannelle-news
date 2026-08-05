import type { PluginContext, SandboxedRouteContext } from "emdash/plugin";
import type { Subscriber } from "../domain/types";
import { parseSubscriberCsv, subscriberEmailsToCsv } from "../domain/csv";
import { createToken, hashValue } from "../domain/security";
import { newsletterStorage } from "../infrastructure/storage";

export async function importSubscribersRoute(routeCtx: SandboxedRouteContext, ctx: PluginContext) {
	if (routeCtx.request.method.toUpperCase() !== "POST") throw new Response("Method not allowed", { status: 405 });
	const input = routeCtx.input as Record<string, unknown>;
	if (typeof input?.csv !== "string" || input.consentConfirmed !== true) throw new Response("A confirmed consent is required", { status: 400 });
	const listId = typeof input.listId === "string" ? input.listId : "main"; const emails = parseSubscriberCsv(input.csv); const storage = newsletterStorage(ctx); let imported = 0; let skipped = 0;
	for (const email of emails) {
		const emailHash = await hashValue(email); const existing = await storage.subscribers.query({ where: { emailHash }, limit: 1 }); if (existing.items.length) { skipped += 1; continue; }
		const now = new Date().toISOString(); const subscriber: Subscriber = { id: crypto.randomUUID(), email, emailHash, status: "confirmed", listId, source: "csv-import", confirmTokenHash: "imported", unsubscribeTokenHash: await hashValue(createToken()), createdAt: now, confirmedAt: now };
		await storage.subscribers.put(subscriber.id, subscriber); await storage.consents.put(crypto.randomUUID(), { subscriberId: subscriber.id, type: "import-confirmed", createdAt: now }); imported += 1;
	}
	return { success: true, imported, skipped, invalid: Math.max(0, input.csv.split(/\r?\n/).length - emails.length - 1) };
}

export async function exportSubscribersRoute(routeCtx: SandboxedRouteContext, ctx: PluginContext) {
	if (routeCtx.request.method.toUpperCase() !== "GET") throw new Response("Method not allowed", { status: 405 });
	const result = await newsletterStorage(ctx).subscribers.query({ where: { status: "confirmed" }, limit: 1000 });
	return { filename: "abonnes-newsletter.csv", contentType: "text/csv; charset=utf-8", content: subscriberEmailsToCsv(result.items.map((item) => item.data.email)), truncated: result.hasMore };
}
