export type Severity = "error" | "warning" | "info";
export type Grade = "good" | "ok" | "poor";

export interface SeoReport {
	entryId: string;
	collection: string;
	locale: string | null;
	title: string;
	analyzedAt: string;
	engineVersion: string;
	score: number;
	grade: Grade;
	focusKeyword: string | null;
	focusKeywordSource: "manual" | "auto";
	suggestedKeywords: string[];
	metrics: SeoMetrics;
	issues: Issue[];
}

export interface SeoMetrics {
	wordCount: number;
	readingTimeMinutes: number;
	readability: {
		score: number;
		formula: "flesch-en" | "kandel-moles-fr";
		grade: string;
	};
	contentLength: {
		chars: number;
		words: number;
		// Les cinq paliers de `content-length.ts`. Le plan n'en listait que trois
		// ici, ce qui rendait `acceptable` et `very-long` inexprimables.
		verdict: "short" | "acceptable" | "ideal" | "long" | "very-long";
	};
	keywordDensity: number;
	keywordOccurrences: number;
	internalLinks: number;
	externalLinks: number;
	imagesTotal: number;
	imagesWithoutAlt: number;
	h2Count: number;
	h3Count: number;
}

export interface Issue {
	ruleId: string;
	severity: Severity;
	message: string;
	help?: string;
	weight: number;
}
