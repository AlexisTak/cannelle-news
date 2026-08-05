import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { lookupHandler } from "../index";
import type { PluginContext } from "./types";

const arxivFixture = readFileSync(
  join(__dirname, "__tests__/fixtures/arxiv-entry.atom.xml"),
  "utf-8"
);
const crossrefFixture = JSON.parse(
  readFileSync(join(__dirname, "__tests__/fixtures/crossref-work.json"), "utf-8")
);

function mockCtx(map: Record<string, { body: string | object; status?: number }>): PluginContext {
  const kv = new Map<string, unknown>();
  return {
    http: {
      fetch: vi.fn().mockImplementation((url: string | URL) => {
        const u = typeof url === "string" ? url : url.toString();
        const entry = map[u];
        if (!entry) return Promise.resolve(new Response("not found", { status: 404 }));
        const body = typeof entry.body === "string" ? entry.body : JSON.stringify(entry.body);
        return Promise.resolve(new Response(body, { status: entry.status ?? 200 }));
      }),
    },
    kv: {
      get: async <T,>(key: string) => (kv.get(key) as T | undefined) ?? null,
      set: async (key: string, value: unknown) => { kv.set(key, value); },
    },
    log: { error: vi.fn() },
    plugin: { id: "research-paper-embed" },
  };
}

describe("lookup route", () => {
  it("routes arxiv URL to arXiv fetcher", async () => {
    const ctx = mockCtx({
      "https://export.arxiv.org/api/query?id_list=2301.12345": { body: arxivFixture },
    });
    const result = await lookupHandler({ url: "https://arxiv.org/abs/2301.12345" }, ctx);
    expect(result.ok).toBe(true);
  });

  it("routes DOI URL to CrossRef fetcher", async () => {
    const ctx = mockCtx({
      "https://api.crossref.org/works/10.1038%2Fnature12373": { body: crossrefFixture },
    });
    const result = await lookupHandler({ url: "https://doi.org/10.1038/nature12373" }, ctx);
    expect(result.ok).toBe(true);
  });

  it("returns unrecognized for unparseable input", async () => {
    const ctx = mockCtx({});
    const result = await lookupHandler({ url: "not a paper" }, ctx);
    expect(result).toEqual({ ok: false, reason: "unrecognized" });
  });

  it("réutilise le cache frais et force le rafraîchissement à la demande", async () => {
    const ctx = mockCtx({
      "https://export.arxiv.org/api/query?id_list=2301.12345": { body: arxivFixture },
    });
    await lookupHandler({ url: "https://arxiv.org/abs/2301.12345" }, ctx);
    await lookupHandler({ url: "https://arxiv.org/abs/2301.12345" }, ctx);
    expect(ctx.http.fetch).toHaveBeenCalledTimes(1);
    await lookupHandler({ url: "https://arxiv.org/abs/2301.12345", force: true }, ctx);
    expect(ctx.http.fetch).toHaveBeenCalledTimes(2);
  });
});
