import type { SeoDocument } from "../document";
import type { SeoRule, RuleEnv, RuleResult } from "./rule";

export interface ImageAltConfig {
	warningThresholdPercent: number;
}

export const imageAltRule: SeoRule<ImageAltConfig> = {
	id: "image-alt",
	label: "Image alt text",
	defaultConfig: { warningThresholdPercent: 25 },
	analyze(doc: SeoDocument, config: ImageAltConfig, _env: RuleEnv): RuleResult {
		const total = doc.images.length;
		const missing = doc.images.filter((img) => !img.alt || img.alt.trim() === "").length;
		const issues: RuleResult["issues"] = [];

		// Aucune image n'est un état neutre, pas une faute : rien à reprocher.
		if (total === 0) {
			return { score: 100, issues, metrics: { total: 0, missing: 0, missingPercent: 0 } };
		}

		const missingPercent = (missing / total) * 100;
		let score: number;
		if (missing === 0) {
			score = 100;
		} else if (missingPercent <= config.warningThresholdPercent) {
			score = 80;
		} else {
			score = 40;
		}

		if (missing > 0) {
			issues.push({
				ruleId: "image-alt",
				severity: score === 80 ? "warning" : "error",
				message: `${missing} of ${total} images have no alt text (${Math.round(missingPercent)}%).`,
				help: "Describe each image for screen readers and image search.",
				weight: 0.8,
			});
		}

		return {
			score,
			issues,
			metrics: { total, missing, missingPercent: Math.round(missingPercent) },
		};
	},
};
