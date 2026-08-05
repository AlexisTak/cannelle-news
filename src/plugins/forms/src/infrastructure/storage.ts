import type { PluginContext } from "emdash/plugin";
import type { FormDefinition, FormSubmission, FormVersion } from "../domain/types";

export interface StoredItem<T> { id: string; data: T }
export interface QueryResult<T> { items: Array<StoredItem<T>>; cursor?: string; hasMore: boolean }
export interface Collection<T> {
	get(id: string): Promise<T | null>;
	put(id: string, data: T): Promise<void>;
	delete(id: string): Promise<boolean>;
	query(options?: Record<string, unknown>): Promise<QueryResult<T>>;
	count(where?: Record<string, unknown>): Promise<number>;
}

export interface AuditDocument { action: string; targetId: string; createdAt: string; data: Record<string, unknown> }
export interface OutboxDocument { name: string; status: "pending" | "delivered" | "failed"; createdAt: string; event: Record<string, unknown> }
export interface NotificationJob {
	type: "admin" | "receipt";
	recipient: string;
	subject: string;
	text: string;
	status: "pending" | "sent" | "failed";
	attempts: number;
	createdAt: string;
	nextAttemptAt: string;
	lastError?: string;
}

export function formsStorage(ctx: PluginContext) {
	return {
		forms: ctx.storage.forms as Collection<FormDefinition>,
		versions: ctx.storage.formVersions as Collection<FormVersion>,
		submissions: ctx.storage.submissions as Collection<FormSubmission>,
		auditLogs: ctx.storage.auditLogs as Collection<AuditDocument>,
		eventOutbox: ctx.storage.eventOutbox as Collection<OutboxDocument>,
		notificationJobs: ctx.storage.notificationJobs as Collection<NotificationJob>,
	};
}
