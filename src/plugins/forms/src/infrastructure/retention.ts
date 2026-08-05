import { retentionCutoff, validateRetentionPolicy, type RetentionPolicy } from "@cannelle/plugin-core";
import type { PluginContext } from "emdash/plugin";
import { recordAudit } from "./records";
import { formsStorage } from "./storage";

export interface RetentionResult { scanned: number; deleted: number; anonymized: number }

export async function applySubmissionRetention(ctx: PluginContext, now = new Date()): Promise<RetentionResult> {
	const days = (await ctx.kv.get<number>("settings:retentionDays")) ?? 365;
	const configuredMode = await ctx.kv.get<string>("settings:retentionMode");
	const policy = validateRetentionPolicy({ days, mode: configuredMode === "delete" ? "delete" : "anonymize" });
	const cutoff = retentionCutoff(policy, now).toISOString();
	const storage = formsStorage(ctx);
	const result = await storage.submissions.query({ where: { createdAt: { lt: cutoff } }, limit: 500 });
	let deleted = 0;
	let anonymized = 0;
	for (const item of result.items) {
		if (policy.mode === "delete") {
			if (await storage.submissions.delete(item.id)) deleted += 1;
		} else {
			await storage.submissions.put(item.id, {
				...item.data,
				values: Object.fromEntries(Object.keys(item.data.values).map((key) => [key, "[ANONYMISÉ]"])),
				metadata: {},
				status: "archived",
			});
			anonymized += 1;
		}
	}
	if (deleted || anonymized) await recordAudit(ctx, "form.retention.applied", { type: "submissions", id: "batch" }, { cutoff, deleted, anonymized });
	return { scanned: result.items.length, deleted, anonymized };
}

export function retentionPolicyFromValues(days: number, mode: string): RetentionPolicy {
	return validateRetentionPolicy({ days, mode: mode === "delete" ? "delete" : "anonymize" });
}
