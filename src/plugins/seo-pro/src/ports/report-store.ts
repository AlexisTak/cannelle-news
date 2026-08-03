import type { SeoReport } from "../domain/report";

export interface ReportQuery {
	collection?: string;
	limit: number;
	cursor?: string;
	sort?: "score" | "analyzedAt";
}

export interface ReportPage {
	items: SeoReport[];
	cursor: string | null;
	hasMore: boolean;
}

/**
 * Port de persistance des rapports. Le domaine et les routes ne connaissent que
 * cette interface — l'implémentation EmDash est interchangeable, et les tests
 * en fournissent une en mémoire.
 */
export interface ReportStore {
	get(entryId: string): Promise<SeoReport | null>;
	put(report: SeoReport): Promise<void>;
	query(options: ReportQuery): Promise<ReportPage>;
}
