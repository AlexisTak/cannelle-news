import { describe, expect, it } from "vitest";
import { safePaperHref } from "./safe-href";

describe("safePaperHref", () => {
  it.each(["javascript:alert(1)", "data:text/html,<script>alert(1)</script>", "//evil.example/x"])(
    "refuse l'URL active %s",
    (value) => expect(safePaperHref(value)).toBeNull(),
  );

  it("accepte HTTP(S) et canonicalise un DOI nu", () => {
    expect(safePaperHref("https://arxiv.org/abs/2401.12345")).toBe("https://arxiv.org/abs/2401.12345");
    expect(safePaperHref("10.1000/example")).toBe("https://doi.org/10.1000/example");
  });
});
