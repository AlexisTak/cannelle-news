import type { PluginContext } from "emdash/plugin";
import type { MediaAsset, MediaJob } from "./domain";

export interface ProcessorResult { alt?: string; ocrText?: string; optimizedUrl?: string; size?: number }

export async function callMediaProcessor(job: MediaJob, asset: MediaAsset, ctx: PluginContext): Promise<ProcessorResult> {
	const endpoint = (await ctx.kv.get<string>("settings:processorEndpoint"))?.trim();
	if (!endpoint) throw new Error("Aucun processeur média configuré");
	if (!ctx.http) throw new Error("Accès réseau indisponible");
	const secret = (await ctx.kv.get<string>("settings:processorSecret"))?.trim();
	const response = await ctx.http.fetch(endpoint, {
		method: "POST",
		headers: { "content-type": "application/json", ...(secret ? { authorization: `Bearer ${secret}` } : {}) },
		body: JSON.stringify({ job: { id: job.id, type: job.type }, asset: { id: asset.id, url: asset.sourceUrl, filename: asset.filename, mimeType: asset.mimeType } }),
	});
	if (!response.ok) throw new Error(`Le processeur média a répondu ${response.status}`);
	const body = await response.json() as Record<string, unknown>;
	return { alt: typeof body.alt === "string" ? body.alt.slice(0, 500) : undefined, ocrText: typeof body.ocrText === "string" ? body.ocrText.slice(0, 200_000) : undefined, optimizedUrl: typeof body.optimizedUrl === "string" ? body.optimizedUrl : undefined, size: typeof body.size === "number" && body.size >= 0 ? body.size : undefined };
}
