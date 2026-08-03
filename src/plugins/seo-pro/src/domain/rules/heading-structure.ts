import type { SeoDocument } from "../document";
import type { SeoRule, RuleEnv, RuleResult } from "./rule";

export const headingStructureRule: SeoRule<undefined> = {
	id: "heading-structure",
	label: "Heading structure",
	defaultConfig: undefined,
	analyze(doc: SeoDocument, _config: undefined, _env: RuleEnv): RuleResult {
		const h2Count = doc.headings.filter((h) => h.level === 2).length;
		const h3Count = doc.headings.filter((h) => h.level === 3).length;
		const issues: RuleResult["issues"] = [];

		let score: number;
		if (h2Count === 0) {
			score = 30;
			issues.push({
				ruleId: "heading-structure",
				severity: "error",
				message: "No H2 heading found.",
				help: "Split the article with H2 headings so readers and crawlers can scan it.",
				weight: 1.0,
			});
		} else if (h3Count === 0) {
			score = 70;
			issues.push({
				ruleId: "heading-structure",
				severity: "info",
				message: `${h2Count} H2 but no H3. Consider a deeper outline.`,
				weight: 1.0,
			});
		} else {
			score = 100;
		}

		return { score, issues, metrics: { h2Count, h3Count } };
	},
};
