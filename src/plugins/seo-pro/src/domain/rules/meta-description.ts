import type { SeoDocument } from "../document";
import type { SeoRule, RuleEnv, RuleResult } from "./rule";

export interface MetaDescriptionConfig {
	idealMinChars: number;
	idealMaxChars: number;
	warningMinChars: number;
	warningMaxChars: number;
}

export const metaDescriptionRule: SeoRule<MetaDescriptionConfig> = {
	id: "meta-description",
	label: "Meta description",
	defaultConfig: {
		idealMinChars: 120,
		idealMaxChars: 158,
		warningMinChars: 100,
		warningMaxChars: 320,
	},
	analyze(doc: SeoDocument, config: MetaDescriptionConfig, _env: RuleEnv): RuleResult {
		const description = doc.metaDescription ?? "";
		const len = description.length;
		const issues: RuleResult["issues"] = [];

		if (len === 0) {
			issues.push({
				ruleId: "meta-description",
				severity: "error",
				message: "Meta description is missing.",
				help: `Write ${config.idealMinChars}-${config.idealMaxChars} characters summarising the page.`,
				weight: 1.5,
			});
			return { score: 50, issues, metrics: { length: 0 } };
		}

		if (len >= config.idealMinChars && len <= config.idealMaxChars) {
			return { score: 100, issues, metrics: { length: len } };
		}

		const withinWarning = len >= config.warningMinChars && len <= config.warningMaxChars;
		const score = withinWarning ? 80 : 50;
		issues.push({
			ruleId: "meta-description",
			severity: len < config.warningMinChars ? "error" : "warning",
			message:
				len < config.idealMinChars
					? `Meta description is too short (${len} chars). Ideal: ${config.idealMinChars}-${config.idealMaxChars}.`
					: `Meta description is too long (${len} chars). Ideal: ${config.idealMinChars}-${config.idealMaxChars}.`,
			weight: 1.5,
		});

		return { score, issues, metrics: { length: len } };
	},
};
