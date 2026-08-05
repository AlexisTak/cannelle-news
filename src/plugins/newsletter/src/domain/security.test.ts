import { describe, expect, it, vi } from "vitest";
import { createToken, hashValue, normalizeEmail } from "./security";

describe("sécurité newsletter", () => {
	it("normalise les e-mails", () => expect(normalizeEmail(" Ada@Example.COM ")).toBe("ada@example.com"));
	it("produit un hash déterministe sans exposer la valeur", async () => {
		const hash = await hashValue("ada@example.com"); expect(hash).toHaveLength(64); expect(hash).not.toContain("ada"); expect(await hashValue("ada@example.com")).toBe(hash);
	});
	it("crée un jeton suffisamment long", () => {
		vi.spyOn(crypto, "randomUUID").mockReturnValueOnce("11111111-1111-4111-8111-111111111111").mockReturnValueOnce("22222222-2222-4222-8222-222222222222");
		expect(createToken()).toHaveLength(64); vi.restoreAllMocks();
	});
});
