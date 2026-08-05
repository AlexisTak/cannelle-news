import { XMLParser } from "fast-xml-parser";
import type { LookupResult, PaperMetadata, PluginContext } from "./types";
import { readBodyLimited } from "./http";

const PARSER = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "" });
const TIMEOUT_MS = 5000;

function asArray<T>(v: T | T[] | undefined): T[] {
  if (v === undefined) return [];
  return Array.isArray(v) ? v : [v];
}

function collapse(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

export async function fetchArxiv(
  id: string,
  ctx: PluginContext
): Promise<LookupResult> {
  const url = `https://export.arxiv.org/api/query?id_list=${encodeURIComponent(id)}`;
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
    ctx.log.error("arxiv network error", err);
    return { ok: false, reason: "network" };
  }

  if (response.status === 404) {
    clearTimeout(timer);
    return { ok: false, reason: "not-found" };
  }
  if (!response.ok) {
    clearTimeout(timer);
    ctx.log.error("arxiv non-ok", { status: response.status });
    return { ok: false, reason: "network" };
  }

  let xml: string;
  try {
    xml = await readBodyLimited(response);
  } catch (err) {
    clearTimeout(timer);
    ctx.log.error("arxiv network error", err);
    return { ok: false, reason: "network" };
  }
  clearTimeout(timer);

  let entry: Record<string, unknown> | undefined;
  try {
    const parsed = PARSER.parse(xml);
    const feed = parsed?.feed ?? {};
    const entries = asArray(feed.entry);
    entry = entries[0];
    if (!entry) return { ok: false, reason: "not-found" };
  } catch (err) {
    ctx.log.error("arxiv parse error", err);
    return { ok: false, reason: "parse" };
  }

  const title = collapse(String(entry.title ?? ""));
  const summary = collapse(String(entry.summary ?? ""));
  const authors = asArray(entry.author).map((a) => collapse(String((a as { name?: string }).name ?? "")));
  const published = String(entry.published ?? "");
  const publishedDate = published ? published.slice(0, 10) : null;
  const doiRaw = (entry as Record<string, unknown>)["arxiv:doi"];
  const doi = typeof doiRaw === "string" && doiRaw.trim() ? doiRaw : null;

  const paper: PaperMetadata = {
    source: "arxiv",
    sourceId: id,
    title,
    authors,
    publishedDate,
    abstract: summary,
    pdfUrl: `https://arxiv.org/pdf/${id}.pdf`,
    doi,
    fetchedAt: new Date().toISOString(),
  };

  return { ok: true, paper };
}
