import type { SeoDocument } from "../document";
import type { SeoRule, RuleEnv, RuleResult } from "./rule";

function sameOrigin(a: URL, b: URL): boolean {
	return a.protocol === b.protocol && a.host === b.host;
}

export const canonicalRule: SeoRule<undefined> = {
	id: "canonical",
	label: "Canonical URL",
	defaultConfig: undefined,
	analyze(doc: SeoDocument, _config: undefined, env: RuleEnv): RuleResult {
		const canonical = doc.canonical?.trim() ?? "";
		if (canonical === "") {
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
		}

		let url: URL;
		try {
			url = new URL(canonical);
		} catch {
			return {
				score: 0,
				issues: [
					{
						ruleId: "canonical",
						severity: "error",
						message: `Canonical URL is not a valid URL: ${canonical}.`,
						help: "Use an absolute URL starting with http:// or https://.",
						weight: 0.5,
					},
				],
				metrics: { canonical },
			};
		}

		if (env.siteUrl) {
			let siteUrl: URL;
			try {
				siteUrl = new URL(env.siteUrl);
			} catch {
				// Si l'URL du site est elle-même invalide, on ne pénalise pas la règle.
				return { score: 100, issues: [], metrics: { canonical } };
			}
			if (!sameOrigin(url, siteUrl)) {
				return {
					score: 0,
					issues: [
						{
							ruleId: "canonical",
							severity: "error",
							message: `Canonical URL must share the site origin (${siteUrl.origin}), got ${url.origin}.`,
							help: "A canonical URL on a different origin can dilute authority and confuse search engines.",
							weight: 0.5,
						},
					],
					metrics: { canonical },
				};
			}
		}

		return { score: 100, issues: [], metrics: { canonical } };
	},
};
