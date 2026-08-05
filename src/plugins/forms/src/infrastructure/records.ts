import { createAuditEntry, createCannelleEvent, type CannelleEventName } from "@cannelle/plugin-core";
import type { PluginContext } from "emdash/plugin";
import { formsStorage } from "./storage";

export async function recordAudit(
	ctx: PluginContext,
	action: string,
	target: { type: string; id: string },
	metadata: Record<string, unknown> = {},
): Promise<void> {
	const entry = createAuditEntry({ action, actor: { id: "emdash", type: "system" }, target, metadata });
	await formsStorage(ctx).auditLogs.put(entry.id, {
		action: entry.action,
		targetId: entry.target.id,
		createdAt: entry.occurredAt,
		data: entry as unknown as Record<string, unknown>,
	});
}

export async function enqueueEvent(
	ctx: PluginContext,
	name: CannelleEventName,
	payload: Record<string, unknown>,
): Promise<void> {
	const event = createCannelleEvent(name, "cannelle-forms", payload);
	await formsStorage(ctx).eventOutbox.put(event.id, {
		name: event.name,
		status: "pending",
		createdAt: event.occurredAt,
		event: event as unknown as Record<string, unknown>,
	});
}
