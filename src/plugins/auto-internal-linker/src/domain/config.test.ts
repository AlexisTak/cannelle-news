import { describe, expect, it } from "vitest";
import { DEFAULT_CONFIG, buildTargetUrl, mergeConfig } from "./config";

describe("mergeConfig", () => {
	it("retourne les défauts sur un objet vide", () => {
		expect(mergeConfig({})).toEqual(DEFAULT_CONFIG);
	});

	it("fusionne `sources` champ à champ au lieu de la remplacer", () => {
		const merged = mergeConfig({ sources: { extracted: false } as never });
		expect(merged.sources).toEqual({
			manual: true,
			title: true,
			taxonomy: true,
			extracted: false,
		});
	});

	it("fusionne `urlPatterns` sans effacer les motifs non fournis", () => {
		const merged = mergeConfig({ urlPatterns: { posts: "/article/{slug}" } });
		expect(merged.urlPatterns).toEqual({ posts: "/article/{slug}", pages: "/{slug}" });
	});

	it("remplace les valeurs scalaires", () => {
		expect(mergeConfig({ maxLinksPerEntry: 3 }).maxLinksPerEntry).toBe(3);
	});
});

describe("buildTargetUrl", () => {
	it("interpole le slug dans le motif de la collection", () => {
		expect(buildTargetUrl("posts", "qu-est-ce-qu-un-llm", DEFAULT_CONFIG.urlPatterns)).toBe(
			"/posts/qu-est-ce-qu-un-llm",
		);
	});

	it("retourne null sans slug", () => {
		expect(buildTargetUrl("posts", null, DEFAULT_CONFIG.urlPatterns)).toBeNull();
	});

	it("retourne null pour une collection sans motif déclaré", () => {
		expect(buildTargetUrl("events", "salon-ia", DEFAULT_CONFIG.urlPatterns)).toBeNull();
	});

	it.each(["javascript:{slug}", "//evil.example/{slug}", "/posts/\\{slug}"])(
		"refuse un motif dangereux : %s",
		(pattern) => expect(buildTargetUrl("posts", "article", { posts: pattern })).toBeNull(),
	);

	it("n'accepte une URL absolue que sur l'origine configurée", () => {
		expect(buildTargetUrl("posts", "article", { posts: "https://news.example/{slug}" }, "https://news.example")).toBe("https://news.example/article");
		expect(buildTargetUrl("posts", "article", { posts: "https://evil.example/{slug}" }, "https://news.example")).toBeNull();
	});
});
