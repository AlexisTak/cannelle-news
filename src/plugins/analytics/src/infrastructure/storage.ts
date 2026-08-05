import type { PluginContext } from "emdash/plugin";
import type { AnalyticsEvent, AnalyticsGoal } from "../domain/types";

interface Item<T> { id: string; data: T }
interface Result<T> { items: Array<Item<T>>; cursor?: string; hasMore: boolean }
interface Collection<T> {
	get(id: string): Promise<T | null>;
	put(id: string, data: T): Promise<void>;
	delete(id: string): Promise<boolean>;
	query(options?: Record<string, unknown>): Promise<Result<T>>;
	count(where?: Record<string, unknown>): Promise<number>;
}

export function analyticsStorage(ctx: PluginContext) {
	return {
		events: ctx.storage.events as Collection<AnalyticsEvent>,
		goals: ctx.storage.goals as Collection<AnalyticsGoal>,
		goalCompletions: ctx.storage.goalCompletions as Collection<{ goalId: string; eventId: string; visitorId: string; date: string; createdAt: string }>,
		auditLogs: ctx.storage.auditLogs as Collection<Record<string, unknown>>,
	};
}
