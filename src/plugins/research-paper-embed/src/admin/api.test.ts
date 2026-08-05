import { beforeEach, describe, expect, it, vi } from "vitest";

const { apiFetchMock } = vi.hoisted(() => ({ apiFetchMock: vi.fn() }));

vi.mock("@emdash-cms/admin", () => ({ apiFetch: apiFetchMock }));

import { lookupPaper } from "./api";

describe("lookupPaper", () => {
  beforeEach(() => apiFetchMock.mockReset());

  it("uses the EmDash API client and unwraps a successful response", async () => {
    const paper = {
      source: "arxiv" as const,
      sourceId: "2401.00001",
      title: "A paper",
      authors: ["Ada Lovelace"],
      publishedDate: "2024-01-01",
      abstract: "Abstract",
      pdfUrl: "https://arxiv.org/pdf/2401.00001",
      doi: null,
      fetchedAt: "2026-08-05T00:00:00.000Z",
    };
    apiFetchMock.mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: { ok: true, paper } }))
    );

    await expect(lookupPaper("https://arxiv.org/abs/2401.00001")).resolves.toEqual({
      ok: true,
      paper,
    });
    expect(apiFetchMock).toHaveBeenCalledWith(
      "/_emdash/api/plugins/research-paper-embed/lookup",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          url: "https://arxiv.org/abs/2401.00001",
          force: true,
        }),
      })
    );
  });

  it("surfaces an EmDash API error", async () => {
    apiFetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          success: false,
          error: { code: "FORBIDDEN", message: "Access denied" },
        })
      )
    );

    await expect(lookupPaper("https://example.com/paper")).rejects.toThrow("Access denied");
  });
});
