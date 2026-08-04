import type { SeoDocument } from "../domain/document";
import type { SeoReport, SeoMetrics, Issue } from "../domain/report";
import { rules } from "../domain/rules";
import type { SeoRule, RuleEnv } from "../domain/rules/rule";
import { calculateOverallScore, gradeFromScore } from "../domain/scoring";
import { countWords } from "../domain/rules/content-length";
import { countOccurrences } from "../domain/rules/keyword-density";
import { computeReadability } from "../domain/rules/readability";
import type { SeoConfig } from "./config";
import { getRuleConfig } from "./config";
import { calculateReadingTime } from "./reading-time";
import { extractKeywords } from "./keywords/extract";

/**
 * Exécute toutes les règles sur un document et assemble le rapport.
 *
 * Les métriques réutilisent les helpers des règles (`countWords`,
 * `countOccurrences`, `computeReadability`) plutôt que de les réimplémenter :
 * sinon le dashboard afficherait une densité calculée autrement que celle qui
 * a déclenché l'alerte, et les deux chiffres se contrediraient à l'écran.
 */
export function analyze(
	doc: SeoDocument,
	config: SeoConfig,
	manualFocusKeyword?: string,
	engineVersion = config.engineVersion,
): SeoReport {
	const now = new Date().toISOString();
	const wordCount = countWords(doc.plainText);
	const readingTimeMinutes = calculateReadingTime(wordCount, config.wordsPerMinute);

	const candidates = extractKeywords(
		doc.plainText,
		doc.title,
		doc.headings.map((h) => h.text),
		5,
	);
	// Un focus manuel vide ("" saisi puis effacé) doit retomber sur l'automatique.
	const manual = manualFocusKeyword?.trim() ? manualFocusKeyword.trim() : null;
	const autoFocus = candidates[0]?.keyword ?? null;
	const focusKeyword = manual ?? autoFocus;
	const focusKeywordSource: SeoReport["focusKeywordSource"] = manual ? "manual" : "auto";

	const env: RuleEnv = { focusKeyword, siteUrl: config.siteUrl };

	const ruleResults = rules.map(({ rule, weight }) => {
		const ruleConfig = getRuleConfig(config, rule as SeoRule);
		const result = rule.analyze(doc, ruleConfig, env);
		return { rule: { id: rule.id, weight }, score: result.score, issues: result.issues };
	});

	const score = calculateOverallScore(ruleResults);
	const grade = gradeFromScore(score);
	const issues: Issue[] = ruleResults.flatMap((r) => r.issues);

	const reading = computeReadability(doc.plainText);
	const internalLinks = doc.links.filter((l) => l.internal).length;
	const externalLinks = doc.links.length - internalLinks;
	const imagesWithoutAlt = doc.images.filter((img) => !img.alt || img.alt.trim() === "").length;

	const occurrences = focusKeyword ? countOccurrences(doc.plainText, focusKeyword) : 0;

	const metrics: SeoMetrics = {
		wordCount,
		readingTimeMinutes,
		readability: {
			score: reading.readingEase,
			formula: reading.formula,
			grade: reading.grade,
		},
		contentLength: {
			chars: doc.plainText.length,
			words: wordCount,
			verdict: deriveVerdict(wordCount),
		},
		keywordDensity: wordCount > 0 ? Number(((occurrences / wordCount) * 100).toFixed(2)) : 0,
		keywordOccurrences: occurrences,
		internalLinks,
		externalLinks,
		imagesTotal: doc.images.length,
		imagesWithoutAlt,
		h2Count: doc.headings.filter((h) => h.level === 2).length,
		h3Count: doc.headings.filter((h) => h.level === 3).length,
	};

	return {
		entryId: doc.entryId,
		collection: doc.collection,
		locale: doc.locale,
		title: doc.title,
		analyzedAt: now,
		engineVersion,
		score,
		grade,
		focusKeyword,
		focusKeywordSource,
		suggestedKeywords: candidates.map((c) => c.keyword),
		metrics,
		issues,
	};
}

/** Mêmes seuils que `contentLengthRule.defaultConfig` — voir `content-length.ts`. */
function deriveVerdict(words: number): SeoMetrics["contentLength"]["verdict"] {
	if (words < 600) return "short";
	if (words < 900) return "acceptable";
	if (words <= 2500) return "ideal";
	if (words <= 3500) return "long";
	return "very-long";
}
