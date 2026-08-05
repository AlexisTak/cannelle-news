import { describe, expect, it } from "vitest";
import { readBodyLimited } from "./http";

describe("readBodyLimited", () => {
  it("refuse un Content-Length supérieur au plafond", async () => {
    const response = new Response("small", { headers: { "Content-Length": "100" } });
    await expect(readBodyLimited(response, 10)).rejects.toThrow("too large");
  });

  it("interrompt une réponse streamée qui dépasse le plafond", async () => {
    const response = new Response("12345678901");
    await expect(readBodyLimited(response, 10)).rejects.toThrow("too large");
  });
});
