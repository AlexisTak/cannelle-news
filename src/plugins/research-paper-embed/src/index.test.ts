import { describe, expect, it } from "vitest";
import { researchPaperEmbedPlugin } from "./index";

describe("researchPaperEmbedPlugin", () => {
  it("declares its Portable Text block in the build descriptor", () => {
    expect(researchPaperEmbedPlugin().portableTextBlocks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "researchPaper" }),
      ])
    );
  });
});
