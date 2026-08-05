import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fetchCrossref } from "./crossref";
import type { PluginContext } from "./types";

const fixture = JSON.parse(
  readFileSync(join(__dirname, "__tests__/fixtures/crossref-work.json"), "utf-8")
);

function mockCtx(body: unknown, status = 200): PluginContext {
  return {
    http: { fetch: vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status })) },
    log: { error: vi.fn() },
    plugin: { id: "research-paper-embed" },
  };
}

function abortableCtx(): PluginContext {
  return {
    http: {
      fetch: vi.fn(async (_input: string | URL, init?: RequestInit) => {
        const signal = init?.signal as AbortSignal | undefined;
        return new Response(new ReadableStream({
          start(controller) {
            const abort = () => controller.error(new DOMException("The operation was aborted.", "AbortError"));
            if (signal?.aborted) abort();
            else signal?.addEventListener("abort", abort, { once: true });
          },
        }));
      }),
    },
    log: { error: vi.fn() },
    plugin: { id: "research-paper-embed" },
  };
}

describe("fetchCrossref", () => {
  it("normalizes a successful response", async () => {
    const ctx = mockCtx(fixture);
    const result = await fetchCrossref("10.1038/nature12373", ctx);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.paper.source).toBe("crossref");
    expect(result.paper.sourceId).toBe("10.1038/nature12373");
    expect(result.paper.title).toBe("Attention Is All You Need in Practice");
    expect(result.paper.authors).toEqual(["Alice Dupont", "Bob Martin"]);
    expect(result.paper.publishedDate).toBe("2023-01-15");
    expect(result.paper.abstract).not.toContain("<jats:");
    expect(result.paper.abstract).toContain("transformers");
    expect(result.paper.pdfUrl).toBe("https://example.com/paper.pdf");
    expect(result.paper.doi).toBe("10.1038/nature12373");
  });

  it("returns not-found on 404", async () => {
    const ctx = mockCtx({ status: "not-found" }, 404);
    const result = await fetchCrossref("10.9999/zzzzz", ctx);
    expect(result).toEqual({ ok: false, reason: "not-found" });
  });

  it("strips JATS tags from abstract", async () => {
    const ctx = mockCtx({
      status: "ok",
      message: { title: ["X"], author: [], abstract: "<jats:p>Plain <jats:italic>text</jats:italic></jats:p>" },
    });
    const result = await fetchCrossref("10.1/x", ctx);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.paper.abstract).toBe("Plain text");
  });

  it("returns network when body read aborts/times out", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const ctx = abortableCtx();
    const promise = fetchCrossref("10.1/x", ctx);
    await vi.advanceTimersByTimeAsync(5000 + 10);
    const result = await promise;
    expect(result).toEqual({ ok: false, reason: "network" });
    vi.useRealTimers();
  });

  it("prefers given + family over name for authors", async () => {
    const ctx = mockCtx({
      status: "ok",
      message: {
        title: ["X"],
        author: [
          { given: "Alice", family: "Dupont", name: "Dupont, Alice" },
          { given: "Bob", family: "Martin", name: "Martin, Bob" },
          { name: "Only Name" },
        ],
      },
    });
    const result = await fetchCrossref("10.1/x", ctx);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.paper.authors).toEqual(["Alice Dupont", "Bob Martin", "Only Name"]);
  });
});
