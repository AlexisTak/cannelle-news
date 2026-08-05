import { z } from "zod";
import type { AnalyticsEventType } from "./types";

export const collectInputSchema = z.object({
	type: z.enum(["pageview", "click", "download", "scroll", "search", "form_submit", "newsletter_subscribe", "custom"]).default("pageview"),
	name: z.string().trim().min(1).max(100).optional(),
	path: z.string().trim().min(1).max(2048).refine((path) => path.startsWith("/")),
	title: z.string().trim().max(300).optional(),
	properties: z.record(z.string().max(50), z.union([z.string().max(500), z.number(), z.boolean()])).refine((value) => Object.keys(value).length <= 20).default({}),
	dnt: z.boolean().optional(),
});

export function classifyDevice(userAgent: string): "desktop" | "mobile" | "tablet" | "unknown" {
	if (!userAgent) return "unknown";
	if (/ipad|tablet|kindle|silk/i.test(userAgent)) return "tablet";
	if (/mobile|iphone|ipod|android/i.test(userAgent)) return "mobile";
	return "desktop";
}

export function isKnownBot(userAgent: string): boolean {
	return /bot|crawler|spider|slurp|headless|lighthouse|preview|facebookexternalhit/i.test(userAgent);
}

export function trafficSource(referer: string | null, currentOrigin: string): string {
	if (!referer) return "direct";
	try {
		const url = new URL(referer);
		if (url.origin === currentOrigin) return "internal";
		const host = url.hostname.replace(/^www\./, "");
		if (/google\.|bing\.|duckduckgo\.|ecosia\.|qwant\./i.test(host)) return "search";
		if (/facebook\.|instagram\.|linkedin\.|x\.com$|twitter\.|tiktok\./i.test(host)) return "social";
		return host.slice(0, 100);
	} catch {
		return "unknown";
	}
}

export function isAnalyticsEventType(value: string): value is AnalyticsEventType {
	return ["pageview", "click", "download", "scroll", "search", "form_submit", "newsletter_subscribe", "custom"].includes(value);
}
