import type { SeoDocument } from "../document";
import type { SeoRule, RuleEnv, RuleResult } from "./rule";
import { normalizeToken } from "../../analysis/keywords/normalize";
import { countWords } from "./content-length";

export interface KeywordDensityConfig {
	idealMinDensity: number;
	idealMaxDensity: number;
	warningMaxDensity: number;
}

/**
 * Retire l'article élidé collé au mot : « l'ia » devient « ia ».
 *
 * Sans ça, aucune occurrence française d'un focus précédé d'une élision ne
 * serait comptée — et l'élision est la règle, pas l'exception, devant voyelle.
 * La liste est restreinte aux particules réelles pour que « aujourd'hui » ou
 * « prud'homme » restent intacts.
 */
const ELISION = /^(?:[ldjmtscn]|qu)'/;

/** Normalise une expression entière en conservant la séparation des mots. */
function normalizePhrase(phrase: string): string {
	return phrase
		.split(/\s+/)
		.map(normalizeToken)
		.map((token) => token.replace(ELISION, ""))
		.filter(Boolean)
		.join(" ");
}

/**
 * Compte les occurrences exactes du focus, bornées aux limites de mots.
 *
 * Sans bornes, « IA » matcherait « biais » ou « médiatique » et la densité
 * exploserait sur des faux positifs.
 */
export function countOccurrences(plainText: string, focusKeyword: string): number {
	const needle = normalizePhrase(focusKeyword);
	if (!needle) return 0;

	const haystack = normalizePhrase(plainText);
	const needleWords = needle.split(" ");
	const haystackWords = haystack.split(" ");

	let count = 0;
	for (let i = 0; i <= haystackWords.length - needleWords.length; i++) {
		if (needleWords.every((w, j) => haystackWords[i + j] === w)) count++;
	}
	return count;
}

export const keywordDensityRule: SeoRule<KeywordDensityConfig> = {
	id: "keyword-density",
	label: "Keyword density",
	defaultConfig: {
		idealMinDensity: 0.5,
		idealMaxDensity: 1.5,
		warningMaxDensity: 2.5,
	},
	analyze(doc: SeoDocument, config: KeywordDensityConfig, env: RuleEnv): RuleResult {
		const issues: RuleResult["issues"] = [];

		if (!env.focusKeyword) {
			issues.push({
				ruleId: "keyword-density",
				severity: "warning",
				message: "No focus keyword set for this entry.",
				help: "Set a focus keyword to measure how well the content targets it.",
				weight: 1.0,
			});
			return { score: 20, issues, metrics: { density: 0, occurrences: 0 } };
		}

		const words = countWords(doc.plainText);
		const occurrences = countOccurrences(doc.plainText, env.focusKeyword);
		const density = words === 0 ? 0 : (occurrences / words) * 100;

		let score: number;
		if (density >= config.idealMinDensity && density <= config.idealMaxDensity) {
			score = 100;
		} else if (density <= config.warningMaxDensity) {
			score = 70;
		} else {
			score = 30;
		}

		if (score !== 100) {
			const stuffing = density > config.warningMaxDensity;
			issues.push({
				ruleId: "keyword-density",
				severity: stuffing ? "error" : "warning",
				message: stuffing
					? `Keyword stuffing detected (${density.toFixed(2)}%). Keep it under ${config.warningMaxDensity}%.`
					: `Keyword density is ${density.toFixed(2)}%. Ideal: ${config.idealMinDensity}-${config.idealMaxDensity}%.`,
				weight: 1.0,
			});
		}

		return {
			score,
			issues,
			metrics: { density: Number(density.toFixed(2)), occurrences },
		};
	},
};
