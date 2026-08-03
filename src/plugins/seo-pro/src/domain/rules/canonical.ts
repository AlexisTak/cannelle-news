import type { SeoDocument } from "../document";
import type { SeoRule, RuleEnv, RuleResult } from "./rule";

export const canonicalRule: SeoRule<undefined> = {
	id: "canonical",
	label: "Canonical URL",
	defaultConfig: undefined,
	analyze(doc: SeoDocument, _config: undefined, _env: RuleEnv): RuleResult {
		const canonical = doc.canonical?.trim() ?? "";
		if (canonical !== "") {
			return { score: 100, issues: [], metrics: { canonical } };
		}

		return {
			score: 50,
			issues: [
				{
					ruleId: "canonical",
					severity: "error",
					message: "No canonical URL set.",
					help: "A canonical URL tells search engines which version of the page to index.",
					weight: 0.5,
				},
			],
			metrics: { canonical: null },
		};
	},
};
