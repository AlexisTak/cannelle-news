import type { SeoDocument } from "../document";
import type { SeoRule, RuleEnv, RuleResult } from "./rule";

export interface TitleLengthConfig {
	idealMinChars: number;
	idealMaxChars: number;
	warningMinChars: number;
	warningMaxChars: number;
	maxPixelWidth: number;
	charPixelWidth: number;
}

export const titleLengthRule: SeoRule<TitleLengthConfig> = {
	id: "title-length",
	label: "Title length",
	defaultConfig: {
		idealMinChars: 30,
		idealMaxChars: 60,
		warningMinChars: 20,
		warningMaxChars: 70,
		maxPixelWidth: 600,
		charPixelWidth: 9.5,
	},
	analyze(doc: SeoDocument, config: TitleLengthConfig, _env: RuleEnv): RuleResult {
		const len = doc.title.length;
		const issues: RuleResult["issues"] = [];
		let score = 100;

		if (len < config.idealMinChars || len > config.idealMaxChars) {
			score = len >= config.warningMinChars && len <= config.warningMaxChars ? 80 : 40;
			const message =
				len < config.idealMinChars
					? `Title is too short (${len} chars). Ideal: ${config.idealMinChars}-${config.idealMaxChars}.`
					: `Title is too long (${len} chars). Ideal: ${config.idealMinChars}-${config.idealMaxChars}.`;
			issues.push({
				ruleId: "title-length",
				severity: score === 80 ? "warning" : "error",
				message,
				weight: 1.5,
			});
		}

		// La largeur en pixels prime sur le nombre de caractères : Google tronque
		// sur la largeur rendue, et « Illiillii » n'occupe pas la place de « WWWWWWWWW ».
		const pixelWidth = len * config.charPixelWidth;
		if (pixelWidth > config.maxPixelWidth && !issues.length) {
			issues.push({
				ruleId: "title-length",
				severity: "error",
				message: `Title may be truncated in SERP (${Math.round(pixelWidth)} px).`,
				weight: 1.5,
			});
			score = 40;
		}

		return { score, issues, metrics: { length: len, pixelWidth: Math.round(pixelWidth) } };
	},
};
