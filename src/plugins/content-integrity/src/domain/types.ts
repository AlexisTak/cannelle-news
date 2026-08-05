export type Severity = "low" | "medium" | "high" | "critical";
export type MatchStatus = "new" | "confirmed" | "dismissed";

export interface Fingerprint {
	id: string; collection: string; title: string; slug: string; text: string; contentHash: string;
	shingleHashes: number[]; signature: number[]; updatedAt: string;
}

export interface Match {
	id: string; sourceId: string; targetId: string; sourceTitle: string; targetTitle: string;
	sourceSlug: string; targetSlug: string; score: number; severity: Severity; status: MatchStatus;
	sourceExcerpt: string; targetExcerpt: string; sourceHash: string; targetHash: string;
	createdAt: string; updatedAt: string;
}
