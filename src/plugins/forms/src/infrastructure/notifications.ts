import type { PluginContext } from "emdash/plugin";
import type { FormDefinition, FormSubmission } from "../domain/types";
import { enqueueEvent, recordAudit } from "./records";
import { formsStorage, type NotificationJob } from "./storage";

function formatValues(submission: FormSubmission): string {
	return Object.entries(submission.values).map(([key, value]) => `${key}: ${String(value)}`).join("\n");
}

function receiptAddress(form: FormDefinition, submission: FormSubmission): string | null {
	const emailField = form.fields.find((field) => field.type === "email");
	if (!emailField) return null;
	const value = submission.values[emailField.name];
	return typeof value === "string" && value.includes("@") ? value : null;
}

export async function queueSubmissionNotifications(ctx: PluginContext, form: FormDefinition, submission: FormSubmission): Promise<void> {
	const jobs: Array<{ id: string; data: NotificationJob }> = [];
	const now = new Date().toISOString();
	const adminRecipient = await ctx.kv.get<string>("settings:notificationRecipient");
	if (adminRecipient?.trim()) {
		jobs.push({ id: crypto.randomUUID(), data: {
			type: "admin", recipient: adminRecipient.trim(), subject: `Nouvelle soumission — ${form.title}`,
			text: `Une nouvelle soumission a été reçue.\n\n${formatValues(submission)}`,
			status: "pending", attempts: 0, createdAt: now, nextAttemptAt: now,
		} });
	}
	if ((await ctx.kv.get<boolean>("settings:sendReceipt")) === true) {
		const recipient = receiptAddress(form, submission);
		if (recipient) jobs.push({ id: crypto.randomUUID(), data: {
			type: "receipt", recipient, subject: `Confirmation — ${form.title}`,
			text: "Bonjour,\n\nVotre réponse a bien été enregistrée.\n\nMerci.",
			status: "pending", attempts: 0, createdAt: now, nextAttemptAt: now,
		} });
	}
	for (const job of jobs) {
		await formsStorage(ctx).notificationJobs.put(job.id, job.data);
		await deliverNotification(ctx, job.id, job.data);
	}
}

export async function deliverNotification(ctx: PluginContext, id: string, job: NotificationJob): Promise<void> {
	const attempts = job.attempts + 1;
	try {
		if (!ctx.email) throw new Error("Aucun fournisseur e-mail configuré");
		await ctx.email.send({ to: job.recipient, subject: job.subject, text: job.text });
		await formsStorage(ctx).notificationJobs.put(id, { ...job, status: "sent", attempts, lastError: undefined });
		await enqueueEvent(ctx, "cannelle.form.notification.sent", { notificationId: id, type: job.type });
	} catch (error) {
		const delayMinutes = Math.min(60, 2 ** Math.min(attempts, 6));
		await formsStorage(ctx).notificationJobs.put(id, {
			...job, status: "failed", attempts,
			nextAttemptAt: new Date(Date.now() + delayMinutes * 60_000).toISOString(),
			lastError: error instanceof Error ? error.message.slice(0, 500) : "Erreur inconnue",
		});
		await recordAudit(ctx, "form.notification.failed", { type: "notification", id }, { attempts });
	}
}

export async function retryNotifications(ctx: PluginContext): Promise<void> {
	const result = await formsStorage(ctx).notificationJobs.query({ where: { status: "failed" }, limit: 50 });
	const now = new Date().toISOString();
	for (const item of result.items) if (item.data.nextAttemptAt <= now && item.data.attempts < 10) await deliverNotification(ctx, item.id, item.data);
}
