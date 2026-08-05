import { describe, expect, it } from "vitest";
import { serializeJsonLd } from "./json-ld";

describe("serializeJsonLd", () => {
  it("neutralise une fermeture de script reçue dans les métadonnées", () => {
    const value = { headline: "</script><script>alert(1)</script>" };
    const serialized = serializeJsonLd(value);

    expect(serialized.toLowerCase()).not.toContain("</script");
    expect(JSON.parse(serialized)).toEqual(value);
  });
});
