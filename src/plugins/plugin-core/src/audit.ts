const SENSITIVE_KEY = /(?:password|secret|token|authorization|cookie|api[-_]?key)/i;

export interface AuditActor {
	id: string;
	type: "user" | "system" | "api";
}

export interface AuditEntry {
	id: string;
	action: string;
	actor: AuditActor;
	target: { type: string; id: string };
	occurredAt: string;
	correlationId?: string;
	metadata: Record<string, unknown>;
}

export interface CreateAuditEntryInput extends Omit<AuditEntry, "id" | "occurredAt" | "metadata"> {
	id?: string;
	now?: Date;
	metadata?: Record<string, unknown>;
}

export function redactSensitive(value: unknown): unknown {
	if (Array.isArray(value)) return value.map(redactSensitive);
	if (!value || typeof value !== "object") return value;

	return Object.fromEntries(
		Object.entries(value).map(([key, child]) => [
			key,
			SENSITIVE_KEY.test(key) ? "[REDACTED]" : redactSensitive(child),
		]),
	);
}

export function createAuditEntry(input: CreateAuditEntryInput): AuditEntry {
	if (!input.action.trim()) throw new TypeError("Audit action must not be empty");
	return {
		id: input.id ?? crypto.randomUUID(),
		action: input.action.trim(),
		actor: input.actor,
		target: input.target,
		occurredAt: (input.now ?? new Date()).toISOString(),
		...(input.correlationId ? { correlationId: input.correlationId } : {}),
		metadata: redactSensitive(input.metadata ?? {}) as Record<string, unknown>,
	};
}
