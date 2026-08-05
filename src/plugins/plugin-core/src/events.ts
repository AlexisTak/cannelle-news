export const CANNELLE_EVENT_NAMES = [
	"cannelle.form.created",
	"cannelle.form.updated",
	"cannelle.form.published",
	"cannelle.form.submitted",
	"cannelle.form.submission.updated",
	"cannelle.form.submission.deleted",
	"cannelle.form.spam.detected",
	"cannelle.form.notification.sent",
	"cannelle.form.webhook.failed",
	"cannelle.analytics.event.received",
	"cannelle.analytics.goal.completed",
	"cannelle.analytics.form.converted",
	"cannelle.analytics.newsletter.subscribed",
	"cannelle.analytics.report.generated",
	"cannelle.analytics.alert.triggered",
	"cannelle.analytics.anomaly.detected",
	"cannelle.newsletter.subscriber.created",
	"cannelle.newsletter.subscriber.confirmed",
	"cannelle.newsletter.subscriber.unsubscribed",
	"cannelle.newsletter.campaign.created",
	"cannelle.newsletter.campaign.scheduled",
	"cannelle.newsletter.campaign.sent",
	"cannelle.newsletter.email.delivered",
	"cannelle.newsletter.email.opened",
	"cannelle.newsletter.email.clicked",
	"cannelle.newsletter.email.bounced",
	"cannelle.newsletter.email.complained",
	"cannelle.newsletter.automation.started",
	"cannelle.newsletter.automation.completed",
] as const;

export type CannelleEventName = (typeof CANNELLE_EVENT_NAMES)[number];

export interface CannelleEvent<TName extends CannelleEventName = CannelleEventName, TPayload = unknown> {
	id: string;
	name: TName;
	version: 1;
	occurredAt: string;
	source: string;
	correlationId?: string;
	payload: TPayload;
}

export interface CreateEventOptions {
	id?: string;
	now?: Date;
	correlationId?: string;
}

export function createCannelleEvent<TName extends CannelleEventName, TPayload>(
	name: TName,
	source: string,
	payload: TPayload,
	options: CreateEventOptions = {},
): CannelleEvent<TName, TPayload> {
	const normalizedSource = source.trim();
	if (!normalizedSource) throw new TypeError("Event source must not be empty");

	return {
		id: options.id ?? crypto.randomUUID(),
		name,
		version: 1,
		occurredAt: (options.now ?? new Date()).toISOString(),
		source: normalizedSource,
		...(options.correlationId ? { correlationId: options.correlationId } : {}),
		payload,
	};
}

export type EventHandler<TEvent extends CannelleEvent = CannelleEvent> = (
	event: TEvent,
) => void | Promise<void>;

export interface EmitResult {
	delivered: number;
	errors: unknown[];
}

/** Bus local au runtime. La persistance et le transport restent à la charge du plugin hôte. */
export class CannelleEventBus {
	readonly #handlers = new Map<CannelleEventName, Set<EventHandler>>();

	on<TEvent extends CannelleEvent>(name: TEvent["name"], handler: EventHandler<TEvent>): () => void {
		const handlers = this.#handlers.get(name) ?? new Set<EventHandler>();
		handlers.add(handler as EventHandler);
		this.#handlers.set(name, handlers);
		return () => handlers.delete(handler as EventHandler);
	}

	async emit(event: CannelleEvent): Promise<EmitResult> {
		const handlers = [...(this.#handlers.get(event.name) ?? [])];
		const settled = await Promise.allSettled(
			handlers.map((handler) => Promise.resolve().then(() => handler(event))),
		);
		return {
			delivered: settled.filter((result) => result.status === "fulfilled").length,
			errors: settled
				.filter((result): result is PromiseRejectedResult => result.status === "rejected")
				.map((result) => result.reason),
		};
	}
}
