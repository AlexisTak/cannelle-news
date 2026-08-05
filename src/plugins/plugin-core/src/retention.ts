export interface RetentionPolicy {
	days: number;
	mode: "delete" | "anonymize";
}

export function validateRetentionPolicy(policy: RetentionPolicy): RetentionPolicy {
	if (!Number.isInteger(policy.days) || policy.days < 1 || policy.days > 3650) {
		throw new RangeError("Retention days must be an integer between 1 and 3650");
	}
	return { ...policy };
}

export function retentionCutoff(policy: RetentionPolicy, now = new Date()): Date {
	validateRetentionPolicy(policy);
	return new Date(now.getTime() - policy.days * 86_400_000);
}

export function isRetentionExpired(
	createdAt: string | Date,
	policy: RetentionPolicy,
	now = new Date(),
): boolean {
	const created = createdAt instanceof Date ? createdAt : new Date(createdAt);
	if (Number.isNaN(created.getTime())) throw new TypeError("Invalid creation date");
	return created.getTime() < retentionCutoff(policy, now).getTime();
}
