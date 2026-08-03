import type { SeoDocument } from "../document";
import type { SeoRule, RuleEnv, RuleResult } from "./rule";

export interface ContentLengthConfig {
	idealMinWords: number;
	idealMaxWords: number;
	acceptableMinWords: number;
	longMaxWords: number;
}

export type ContentVerdict = "short" | "acceptable" | "ideal" | "long" | "very-long";

/** Le domaine ne connaît que du texte brut : un mot est une suite non vide séparée par des blancs. */
export function countWords(text: string): number {
	const trimmed = text.trim();
	return trimmed === "" ? 0 : trimmed.split(/\s+/).length;
}

export const contentLengthRule: SeoRule<ContentLengthConfig> = {
	id: "content-length",
	label: "Content length",
	defaultConfig: {
		idealMinWords: 900,
		idealMaxWords: 2500,
		acceptableMinWords: 600,
		longMaxWords: 3500,
	},
	analyze(doc: SeoDocument, config: ContentLengthConfig, _env: RuleEnv): RuleResult {
		const words = countWords(doc.plainText);
		const issues: RuleResult["issues"] = [];

		let verdict: ContentVerdict;
		let score: number;
		if (words < config.acceptableMinWords) {
			verdict = "short";
			score = 20;
		} else if (words < config.idealMinWords) {
			verdict = "acceptable";
			score = 60;
		} else if (words <= config.idealMaxWords) {
			verdict = "ideal";
			score = 100;
		} else if (words <= config.longMaxWords) {
			verdict = "long";
			score = 60;
		} else {
			verdict = "very-long";
			score = 20;
		}

		if (verdict !== "ideal") {
			const tooShort = verdict === "short" || verdict === "acceptable";
			issues.push({
				ruleId: "content-length",
				severity: score === 20 ? "error" : "warning",
				message: tooShort
					? `Content is too short (${words} words). Ideal: ${config.idealMinWords}-${config.idealMaxWords}.`
					: `Content is too long (${words} words). Ideal: ${config.idealMinWords}-${config.idealMaxWords}.`,
				weight: 1.5,
			});
		}

		return {
			score,
			issues,
			metrics: { words, chars: doc.plainText.length, verdict },
		};
	},
};
