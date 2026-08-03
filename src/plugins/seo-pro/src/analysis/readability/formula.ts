export interface ReadabilityInput {
	wordCount: number;
	sentenceCount: number;
	syllableCount: number;
}

export interface ReadabilityResult {
	score: number;
	formula: string;
}
