import { apiFetch } from "@emdash-cms/admin";
import type { SeoReport } from "../domain/report";
import type { ReportSummary } from "../routes/reports";
import type { SeoConfig } from "../analysis/config";
import type { GenerateMetaOutput } from "../routes/generate-meta";
import type { ApplyMetaOutput } from "../routes/apply-meta";

const BASE = "/_emdash/api/plugins/seo-pro";

/**
 * Appelle une route du plugin.
 *
 * `apiFetch` ajoute l'en-tête `X-EmDash-Request` exigé par la protection CSRF
 * d'EmDash (`astro/middleware/auth.ts:272`) : un `fetch` nu reçoit un 403.
 */
async function call<T>(route: string, body: unknown): Promise<T> {
	const res = await apiFetch(`${BASE}/${route}`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
	});
	const payload = (await res.json()) as
		| { success: true; data: T }
		| { success: false; error: { code: string; message: string } };

	if (!payload.success) throw new Error(payload.error.message || payload.error.code);
	return payload.data;
}

export interface ReportsPage {
	items: ReportSummary[];
	cursor: string | null;
	hasMore: boolean;
}

export function fetchReports(input: {
	collection?: string;
	limit?: number;
	sort?: "score" | "analyzedAt";
	grade?: "good" | "ok" | "poor";
}): Promise<ReportsPage> {
	return call<ReportsPage>("reports", input);
}

export function fetchReport(collection: string, id: string): Promise<SeoReport> {
	return call<SeoReport>("report", { collection, id });
}

export function reanalyze(collection: string, id: string): Promise<SeoReport> {
	return call<SeoReport>("analyze", { collection, id });
}

export function setFocusKeyword(
	collection: string,
	entryId: string,
	keyword: string | null,
): Promise<SeoReport> {
	return call<SeoReport>("focus-keyword", { collection, entryId, keyword });
}

export function fetchSeoConfig(): Promise<SeoConfig> {
	return call<SeoConfig>("settings", {});
}

export function saveSeoConfig(patch: {
	wordsPerMinute?: number;
	siteUrl?: string | null;
	analyzableCollections?: string[];
}): Promise<SeoConfig> {
	return call<SeoConfig>("settings", { patch });
}

export function generateMeta(collection: string, id: string): Promise<GenerateMetaOutput> {
	return call<GenerateMetaOutput>("generate-meta", { collection, id });
}

export function applyMeta(
	collection: string,
	id: string,
	meta: { title?: string; description?: string },
): Promise<ApplyMetaOutput> {
	return call<ApplyMetaOutput>("apply-meta", { collection, id, ...meta });
}

export type { SeoReport, ReportSummary, SeoConfig, GenerateMetaOutput };
