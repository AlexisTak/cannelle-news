import { describe, it, expect } from "vitest";
import { normalize } from "./normalize";

describe("normalize", () => {
  it("lowercases and strips punctuation but keeps offset table", () => {
    const input = "Hello, World!";
    const result = normalize(input);
    expect(result.words).toEqual(["hello", "world"]);
    // Offset of "world" = position of 'W' in original.
    expect(input.slice(result.offsets[1], result.offsets[1] + 5)).toBe("World");
  });

  it("strips diacritics via NFD", () => {
    const result = normalize("Café — thé glacé");
    expect(result.words).toEqual(["cafe", "the", "glace"]);
  });

  it("unifies apostrophes (curly, straight, narrow no-break)", () => {
    const result = normalize("l’eau d'où qu’il");
    expect(result.words).toEqual(["leau", "dou", "quil"]);
  });

  it("collapses whitespace", () => {
    const result = normalize("a   b\tc\nd");
    expect(result.words).toEqual(["a", "b", "c", "d"]);
  });

  it("returns empty doc for empty input", () => {
    const result = normalize("");
    expect(result.words).toEqual([]);
    expect(result.offsets).toEqual(new Uint32Array(0));
    expect(result.quoteSpans).toEqual([]);
  });
});
