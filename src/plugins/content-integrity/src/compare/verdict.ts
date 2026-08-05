import type { IntegrityConfig } from "../domain/config";
import type { Severity } from "../domain/types";

export function severityFor(score: number, config: IntegrityConfig): Severity | null {
	if (score < config.thresholds.ignore) return null;
	if (score >= config.thresholds.high) return "critical";
	if (score >= config.thresholds.medium) return "high";
	if (score >= config.thresholds.low) return "medium";
	return "low";
}
