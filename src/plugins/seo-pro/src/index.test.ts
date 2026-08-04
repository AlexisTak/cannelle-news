import { describe, it, expect } from "vitest";
import { seoProPlugin, createPlugin, ENGINE_VERSION } from "./index";
import { createMockCtx } from "../test/mock-ctx";
import type { PluginContext } from "emdash";

/**
 * Le hook reçoit un `ContentHookEvent`, dont `content` est **plat** — contrairement
 * au `ContentItem` imbriqué que rend `ctx.content.get()`. C'est la seule
 * différence entre les deux chemins d'entrée, donc le seul point que les tests
 * de routes ne couvrent pas.
 */
const flatEvent = (collection: string) => ({
	collection,
	isNew: false,
	content: {
		id: "01HOOK",
		slug: "article-du-hook",
		locale: "fr",
		title: "Un titre suffisamment long pour la règle",
		content: [
			{ _type: "block", style: "normal", children: [{ text: "Du texte de corps. " }] },
			{ _type: "block", style: "h2", children: [{ text: "Une partie" }] },
		],
	} as Record<string, unknown>,
});

function hookHandler(name: "content:afterSave" | "content:afterUnpublish" | "content:afterDelete") {
	const plugin = createPlugin() as unknown as {
		hooks: Record<
			string,
			{ handler: (e: unknown, c: PluginContext) => Promise<void> }
		>;
	};
	return plugin.hooks[name].handler;
}

describe("seoProPlugin descriptor", () => {
	it("declares bare specifiers that resolve to this package", () => {
		const d = seoProPlugin();
		expect(d.entrypoint).toBe("@cannelle/plugin-seo-pro");
		expect(d.adminEntry).toBe("@cannelle/plugin-seo-pro/admin");
		expect(d.format).toBe("native");
	});

	it("only navigates to pages that work without parameters", () => {
		// `/entry` est délibérément absent : EmDash résout les pages de plugin
		// par égalité stricte de clé, l'article ciblé passe donc en query
		// string et un lien de barre latérale nu n'afficherait qu'une erreur.
		const d = seoProPlugin();
		expect(d.adminPages?.map((p) => p.path)).toEqual(["/dashboard", "/settings"]);
		expect(d.adminWidgets?.[0].id).toBe("seo-overview");
	});
});

describe("createPlugin", () => {
	it("declares the capabilities the code actually uses", () => {
		const plugin = createPlugin() as unknown as { capabilities: string[] };
		expect(plugin.capabilities).toContain("content:read");
		expect(plugin.capabilities).toContain("content:write");
	});

	it("registers every route the admin UI calls", () => {
		const plugin = createPlugin() as unknown as { routes: Record<string, unknown> };
		expect(Object.keys(plugin.routes).sort()).toEqual([
			"analyze",
			"apply-meta",
			"focus-keyword",
			"generate-meta",
			"report",
			"reports",
			"settings",
		]);
	});
});

describe("content:afterSave hook", () => {
	it("stores a report for an analysable collection", async () => {
		const { ctx, reports } = createMockCtx();
		await hookHandler("content:afterSave")(flatEvent("posts"), ctx);

		const stored = reports.get("01HOOK") as { entryId: string; engineVersion: string } | undefined;
		expect(stored).toBeDefined();
		expect(stored!.entryId).toBe("01HOOK");
		expect(stored!.engineVersion).toBe(ENGINE_VERSION);
	});

	it("reads the flat event shape without a .data unwrap", async () => {
		const { ctx, reports } = createMockCtx();
		await hookHandler("content:afterSave")(flatEvent("posts"), ctx);
		const stored = reports.get("01HOOK") as { title: string; metrics: { h2Count: number } };
		expect(stored.title).toBe("Un titre suffisamment long pour la règle");
		expect(stored.metrics.h2Count).toBe(1);
	});

	it("skips a collection outside analyzableCollections", async () => {
		const { ctx, reports } = createMockCtx();
		await hookHandler("content:afterSave")(flatEvent("authors"), ctx);
		expect(reports.size).toBe(0);
	});

	it("honours a manual focus keyword stored in KV", async () => {
		const { ctx, reports } = createMockCtx({ kv: { "focus:01HOOK": "partie" } });
		await hookHandler("content:afterSave")(flatEvent("posts"), ctx);
		const stored = reports.get("01HOOK") as { focusKeyword: string; focusKeywordSource: string };
		expect(stored.focusKeyword).toBe("partie");
		expect(stored.focusKeywordSource).toBe("manual");
	});

	it("does nothing when the entry has no id", async () => {
		const { ctx, reports } = createMockCtx();
		const event = flatEvent("posts");
		delete event.content.id;
		await hookHandler("content:afterSave")(event, ctx);
		expect(reports.size).toBe(0);
	});
});

describe("content:afterUnpublish hook", () => {
	it("purges the stored report", async () => {
		const { ctx, reports } = createMockCtx();
		reports.set("01HOOK", { entryId: "01HOOK" });
		await hookHandler("content:afterUnpublish")(flatEvent("posts"), ctx);
		expect(reports.has("01HOOK")).toBe(false);
	});
});

describe("content:afterDelete hook", () => {
	it("purges the stored report by event id", async () => {
		const { ctx, reports } = createMockCtx();
		reports.set("01DEL", { entryId: "01DEL" });
		await hookHandler("content:afterDelete")({ id: "01DEL" }, ctx);
		expect(reports.has("01DEL")).toBe(false);
	});
});
