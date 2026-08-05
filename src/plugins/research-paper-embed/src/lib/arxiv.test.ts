import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fetchArxiv } from "./arxiv";
import type { PluginContext } from "./types";

const fixture = readFileSync(
  join(__dirname, "__tests__/fixtures/arxiv-entry.atom.xml"),
  "utf-8"
);

function mockCtx(body: string, status = 200): PluginContext {
  return {
    http: { fetch: vi.fn().mockResolvedValue(new Response(body, { status })) },
    log: { error: vi.fn() },
    plugin: { id: "research-paper-embed" },
  };
}

describe("fetchArxiv", () => {
  it("normalizes a successful response", async () => {
    const ctx = mockCtx(fixture);
    const result = await fetchArxiv("2301.12345v1", ctx);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.paper.source).toBe("arxiv");
    expect(result.paper.sourceId).toBe("2301.12345v1");
    expect(result.paper.title).toContain("Test Paper");
    expect(result.paper.authors).toEqual(["Alice Dupont", "Bob Martin"]);
    expect(result.paper.publishedDate).toBe("2023-01-15");
    expect(result.paper.abstract).toContain("cinnamon");
    expect(result.paper.pdfUrl).toBe("https://arxiv.org/pdf/2301.12345v1.pdf");
    expect(result.paper.doi).toBeNull();
  });

  it("returns not-found on 404", async () => {
    const ctx = mockCtx("not found", 404);
    const result = await fetchArxiv("9999.99999", ctx);
    expect(result).toEqual({ ok: false, reason: "not-found" });
  });

  it("returns network on other non-OK statuses", async () => {
    const ctx = mockCtx("internal server error", 500);
    const result = await fetchArxiv("9999.99999", ctx);
    expect(result).toEqual({ ok: false, reason: "network" });
  });

  it("returns parse on malformed XML", async () => {
    const ctx = mockCtx("<<<not xml>>>");
    const result = await fetchArxiv("2301.12345", ctx);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(["parse", "not-found"]).toContain(result.reason);
  });

  it("treats an arXiv error entry as not-found", async () => {
    const errorXml = `\n      <?xml version="1.0" encoding="utf-8"?>\n      <feed xmlns="http://www.w3.org/2005/Atom"\n            xmlns:arxiv="http://arxiv.org/schemas/atom"\n            xmlns:opensearch="http://a9.com/-/spec/opensearch/1.1/"\n            xmlns:api="http://export.arxiv.org/api/query?method=GET"\n      >\n        <entry>\n          <title>Error</title>\n          <summary>Unknown identifier: 9999.99999.</summary>\n        </entry>\n      </feed>\n    `;
    const ctx = mockCtx(errorXml);
    const result = await fetchArxiv("9999.99999", ctx);
    expect(result).toEqual({ ok: false, reason: "not-found" });
  });
});
