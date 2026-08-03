import type { Grade, Issue } from "./report";

export interface WeightedRuleResult {
	rule: { id: string; weight: number };
	score: number;
	issues: Issue[];
}

/**
 * Moyenne pondérée des scores de règles, arrondie à l'entier.
 *
 * Le garde `totalWeight === 0` couvre le cas où toutes les règles sont
 * désactivées via la configuration : sans lui, la division rendrait `NaN`.
 */
export function calculateOverallScore(results: WeightedRuleResult[]): number {
	const totalWeight = results.reduce((sum, r) => sum + r.rule.weight, 0);
	if (totalWeight === 0) return 0;
	const weighted = results.reduce((sum, r) => sum + r.score * r.rule.weight, 0);
	return Math.round(weighted / totalWeight);
}

export function gradeFromScore(score: number): Grade {
	if (score >= 80) return "good";
	if (score >= 60) return "ok";
	return "poor";
}
