import { describe, expect, it } from "vitest";
import { createMockCtx } from "../../test/mock-ctx";
import { DEFAULT_CONFIG } from "../domain/config";
import { createKvConfigStore } from "./kv-config";

describe("createKvConfigStore", () => {
	it("rend les défauts quand rien n'est stocké", async () => {
		const { ctx } = createMockCtx();
		expect(await createKvConfigStore(ctx).get()).toEqual(DEFAULT_CONFIG);
	});

	it("fusionne un réglage partiel avec les défauts", async () => {
		const { ctx } = createMockCtx({ kv: { "settings:linkerConfig": { maxLinksPerEntry: 3 } } });
		const config = await createKvConfigStore(ctx).get();
		expect(config.maxLinksPerEntry).toBe(3);
		expect(config.urlPatterns).toEqual(DEFAULT_CONFIG.urlPatterns);
	});

	it("préserve les réglages non fournis lors d'une écriture partielle", async () => {
		const { ctx } = createMockCtx();
		const store = createKvConfigStore(ctx);

		await store.set({ maxLinksPerEntry: 8 });
		await store.set({ siteUrl: "https://cannelle.news" });

		const config = await store.get();
		expect(config.maxLinksPerEntry).toBe(8);
		expect(config.siteUrl).toBe("https://cannelle.news");
	});
});
