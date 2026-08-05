import { apiFetch } from "@emdash-cms/admin";
import type { IntegrityConfig } from "../domain/config";
import type { Match, MatchStatus } from "../domain/types";
import type { RouteResult } from "../routes/result";
import type { RebuildOutput } from "../routes/rebuild";

const BASE = "/_emdash/api/plugins/content-integrity";

async function call<T>(route: string, body: unknown): Promise<T> {
	const response = await apiFetch(`${BASE}/${route}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
	const outer = await response.json() as { success: true; data: RouteResult<T> } | { success: false; error: { message: string } };
	if (!outer.success) throw new Error(outer.error.message);
	if (!outer.data.ok) throw new Error(outer.data.message);
	return outer.data.data;
}

export const fetchMatches = (status?: MatchStatus, cursor?: string) => call<{ items: Array<{ id: string; data: Match }>; cursor?: string; hasMore: boolean }>("matches", { status, cursor, limit: 100 });
export const review = (id: string, status: MatchStatus) => call<Match>("review", { id, status });
export const fetchSettings = () => call<{ config: IntegrityConfig; indexSize: number; matchCount: number }>("settings", {});
export const saveSettings = (patch: Partial<IntegrityConfig>) => call<{ config: IntegrityConfig; indexSize: number; matchCount: number }>("settings", { patch });
export async function rebuildAll(): Promise<Extract<RebuildOutput, { status: "complete" }>> {
	const jobId = crypto.randomUUID();
	for (;;) {
		const result = await call<RebuildOutput>("rebuild", { jobId });
		if (result.status === "busy") {
			throw new Error("Une reconstruction est déjà en cours. Réessayez dans quelques secondes.");
		}
		if (result.status === "complete") return result;
	}
}
export const checkEntry = (collection: string, entryId: string) => call<Match[]>("check", { collection, entryId });
