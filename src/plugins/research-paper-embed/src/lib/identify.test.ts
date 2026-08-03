import { describe, it, expect } from "vitest";
import { identify } from "./identify";

describe("identify", () => {
  it("routes arxiv.org/abs URLs", () => {
    expect(identify("https://arxiv.org/abs/2301.12345")).toEqual({
      source: "arxiv",
      id: "2301.12345",
    });
  });

  it("routes arxiv.org/pdf URLs", () => {
    expect(identify("https://arxiv.org/pdf/2301.12345v2")).toEqual({
      source: "arxiv",
      id: "2301.12345v2",
    });
  });

  it("routes bare arXiv ids", () => {
    expect(identify("2301.12345")).toEqual({ source: "arxiv", id: "2301.12345" });
  });

  it("routes doi.org URLs", () => {
    expect(identify("https://doi.org/10.1038/nature12373")).toEqual({
      source: "crossref",
      id: "10.1038/nature12373",
    });
  });

  it("routes bare DOIs", () => {
    expect(identify("10.1038/nature12373")).toEqual({
      source: "crossref",
      id: "10.1038/nature12373",
    });
  });

  it("returns unrecognized for empty string", () => {
    expect(identify("")).toEqual({ source: null, id: "", reason: "unrecognized" });
  });

  it("returns unrecognized for plain text", () => {
    expect(identify("hello world")).toEqual({
      source: null,
      id: "hello world",
      reason: "unrecognized",
    });
  });
});
