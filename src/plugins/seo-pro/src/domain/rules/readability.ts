import type { SeoDocument } from "../document";
import type { SeoRule, RuleEnv, RuleResult } from "./rule";
import { detectLanguage } from "../../analysis/readability/detect-language";
import { kandelMolesFr } from "../../analysis/readability/kandel-moles-fr";
import { fleschEn } from "../../analysis/readability/flesch-en";
import { countSyllables } from "../../analysis/readability/syllables";
import type { ReadabilityInput } from "../../analysis/readability/formula";

export interface ReadabilityConfig {
	idealMinScore: number;
	idealMaxScore: number;
	acceptableMinScore: number;
}

export type ReadabilityFormula = "flesch-en" | "kandel-moles-fr";

/**
 * Découpe en phrases sur la ponctuation forte.
 *
 * Le ratio mots/phrase est la moitié de la formule : sans découpage, tout le
 * texte compterait pour une seule phrase et le score s'effondrerait.
 */
export function countSentences(text: string): number {
	const matches = text.split(/[.!?…]+/).filter((s) => s.trim().length > 0);
	return matches.length;
}

export function buildReadabilityInput(text: string, lang: "fr" | "en"): ReadabilityInput {
	const words = text.trim() === "" ? [] : text.trim().split(/\s+/);
	return {
		wordCount: words.length,
		sentenceCount: countSentences(text),
		syllableCount: words.reduce((sum, w) => sum + countSyllables(w, lang), 0),
	};
}

/** Paliers usuels de Flesch, réutilisés pour Kandel & Moles qui partage l'échelle. */
export function readabilityGrade(score: number): string {
	if (score >= 90) return "très facile";
	if (score >= 70) return "facile";
	if (score >= 60) return "assez facile";
	if (score >= 50) return "moyen";
	if (score >= 30) return "difficile";
	return "très difficile";
}

export interface ReadabilityReading {
	readingEase: number;
	formula: ReadabilityFormula;
	grade: string;
	input: ReadabilityInput;
}

/**
 * Source unique du calcul de lisibilité.
 *
 * La règle l'utilise pour noter, `analyze()` pour remplir `SeoMetrics`. Deux
 * implémentations séparées finiraient par diverger et le dashboard afficherait
 * un score contredisant son propre message d'alerte.
 */
export function computeReadability(text: string): ReadabilityReading {
	const lang = detectLanguage(text);
	const formula: ReadabilityFormula = lang === "en" ? "flesch-en" : "kandel-moles-fr";
	const input = buildReadabilityInput(text, lang);
	const raw = lang === "en" ? fleschEn(input) : kandelMolesFr(input);
	// Les deux formules peuvent sortir de [0, 100] sur des textes extrêmes.
	const readingEase = Math.max(0, Math.min(100, Math.round(raw)));
	return { readingEase, formula, grade: readabilityGrade(readingEase), input };
}

export const readabilityRule: SeoRule<ReadabilityConfig> = {
	id: "readability",
	label: "Readability",
	defaultConfig: {
		idealMinScore: 60,
		idealMaxScore: 90,
		acceptableMinScore: 50,
	},
	analyze(doc: SeoDocument, config: ReadabilityConfig, _env: RuleEnv): RuleResult {
		const { readingEase, formula, input } = computeReadability(doc.plainText);
		const issues: RuleResult["issues"] = [];

		let score: number;
		if (readingEase >= config.idealMinScore && readingEase <= config.idealMaxScore) {
			score = 100;
		} else if (readingEase >= config.acceptableMinScore) {
			score = 70;
		} else {
			score = 40;
		}

		if (readingEase < config.acceptableMinScore) {
			issues.push({
				ruleId: "readability",
				severity: "warning",
				message: `Text is hard to read (${readingEase}/100, ${readabilityGrade(readingEase)}).`,
				help: "Shorten sentences and prefer common words.",
				weight: 1.0,
			});
		} else if (score !== 100) {
			issues.push({
				ruleId: "readability",
				severity: "info",
				message: `Readability is ${readingEase}/100 (${readabilityGrade(readingEase)}). Ideal: ${config.idealMinScore}-${config.idealMaxScore}.`,
				weight: 1.0,
			});
		}

		return {
			score,
			issues,
			metrics: {
				readingEase,
				formula,
				grade: readabilityGrade(readingEase),
				wordCount: input.wordCount,
				sentenceCount: input.sentenceCount,
			},
		};
	},
};
