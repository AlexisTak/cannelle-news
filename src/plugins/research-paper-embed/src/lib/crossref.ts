import striptags from "striptags";
import type { LookupResult, PaperMetadata, PluginContext } from "./types";

const TIMEOUT_MS = 5000;

function asArray<T>(v: T | T[] | undefined): T[] {
  if (v === undefined) return [];
  return Array.isArray(v) ? v : [v];
}

function pickPdfLink(links: Array<{ URL: string; "content-type"?: string }>): string | null {
  const match = links.find((l) => l["content-type"] === "application/pdf");
  return match?.URL ?? null;
}

function formatAuthors(
  authors: Array<{ given?: string; family?: string; name?: string }>
): string[] {
  return authors
    .map((a) => {
      const parts = [a.given, a.family].filter(Boolean).join(" ").trim();
      return parts || (a.name ? a.name.trim() : "");
    })
    .filter(Boolean);
}

function dateFromParts(parts: number[] | undefined): string | null {
  if (!parts || parts.length === 0) return null;
  const [y, m, d] = parts;
  if (!y) return null;
  return `${y}-${String(m ?? 1).padStart(2, "0")}-${String(d ?? 1).padStart(2, "0")}`;
}

export async function fetchCrossref(
  doi: string,
  ctx: PluginContext
): Promise<LookupResult> {
  const url = `https://api.crossref.org/works/${encodeURIComponent(doi)}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let response: Response;
  try {
    response = await ctx.http.fetch(url, {
      headers: { "User-Agent": "Cannelle-News/0.0.3 (mailto:contact@cannelle-news.example)" },
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    ctx.log.error("crossref network error", err);
    return { ok: false, reason: "network" };
  }

  if (response.status === 404) {
    clearTimeout(timer);
    return { ok: false, reason: "not-found" };
  }
  if (!response.ok) {
    clearTimeout(timer);
    ctx.log.error("crossref non-ok", { status: response.status });
    return { ok: false, reason: "network" };
  }

  let message: Record<string, unknown>;
  try {
    const body = await response.json();
    message = body?.message ?? {};
  } catch (err) {
    clearTimeout(timer);
    if (err instanceof Error && err.name === "AbortError") {
      ctx.log.error("crossref body-read timeout", err);
      return { ok: false, reason: "network" };
    }
    ctx.log.error("crossref parse error", err);
    return { ok: false, reason: "parse" };
  }
  clearTimeout(timer);

  const title = (asArray(message.title as string[])[0] ?? "").toString();
  const authors = formatAuthors(asArray(message.author as Array<{ given?: string; family?: string; name?: string }>));
  const rawAbstract = String(message.abstract ?? "");
  const abstract = striptags(rawAbstract).replace(/\s+/g, " ").trim();
  const links = asArray(message.link as Array<{ URL: string; "content-type"?: string }>);
  const pdfUrl = pickPdfLink(links);
  const issued = (message.issued as { "date-parts"?: number[][] } | undefined)?.["date-parts"]?.[0];
  const created = (message.created as { "date-parts"?: number[][] } | undefined)?.["date-parts"]?.[0];
  const publishedDate = dateFromParts(issued) ?? dateFromParts(created);
  const finalDoi = (message.DOI as string | undefined) ?? doi;

  const paper: PaperMetadata = {
    source: "crossref",
    sourceId: doi,
    title,
    authors,
    publishedDate,
    abstract,
    pdfUrl,
    doi: finalDoi,
    fetchedAt: new Date().toISOString(),
  };

  return { ok: true, paper };
}
