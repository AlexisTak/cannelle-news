import type { SeoDocument } from "../document";
import type { SeoRule, RuleEnv, RuleResult } from "./rule";

export interface LinkBalanceConfig {
	minInternal: number;
	minExternal: number;
}

export const linkBalanceRule: SeoRule<LinkBalanceConfig> = {
	id: "link-balance",
	label: "Link balance",
	defaultConfig: { minInternal: 2, minExternal: 1 },
	analyze(doc: SeoDocument, config: LinkBalanceConfig, _env: RuleEnv): RuleResult {
		const internal = doc.links.filter((l) => l.internal).length;
		const external = doc.links.filter((l) => !l.internal).length;
		const issues: RuleResult["issues"] = [];

		const lacksInternal = internal < config.minInternal;
		const lacksExternal = external < config.minExternal;

		let score: number;
		if (!lacksInternal && !lacksExternal) {
			score = 100;
		} else if (lacksInternal && lacksExternal) {
			score = 20;
			issues.push({
				ruleId: "link-balance",
				severity: "warning",
				message: `Too few links: ${internal} internal (min ${config.minInternal}), ${external} external (min ${config.minExternal}).`,
				help: "Link to related articles and cite outside sources.",
				weight: 0.8,
			});
		} else {
			score = 60;
			issues.push({
				ruleId: "link-balance",
				severity: "info",
				message: lacksInternal
					? `Only ${internal} internal link(s). Aim for at least ${config.minInternal}.`
					: `Only ${external} external link(s). Aim for at least ${config.minExternal}.`,
				weight: 0.8,
			});
		}

		return { score, issues, metrics: { internal, external } };
	},
};
