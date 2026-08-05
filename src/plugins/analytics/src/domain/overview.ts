import type { AnalyticsEvent } from "./types";

export interface Overview {
	pageviews: number;
	visitors: number;
	events: number;
	conversions: number;
	topPages: Array<{ path: string; views: number }>;
	sources: Array<{ source: string; visits: number }>;
	devices: Array<{ device: string; visits: number }>;
}

function ranked(events: readonly AnalyticsEvent[], key: "path" | "source" | "device", label: string) {
	const counts = new Map<string, number>();
	for (const event of events) counts.set(event[key], (counts.get(event[key]) ?? 0) + 1);
	return [...counts].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([value, count]) => ({ [label]: value, [label === "path" ? "views" : "visits"]: count }));
}

export function calculateOverview(events: readonly AnalyticsEvent[]): Overview {
	return {
		pageviews: events.filter((event) => event.type === "pageview").length,
		visitors: new Set(events.map((event) => event.visitorId)).size,
		events: events.length,
		conversions: events.filter((event) => event.type === "form_submit" || event.type === "newsletter_subscribe").length,
		topPages: ranked(events.filter((event) => event.type === "pageview"), "path", "path") as Overview["topPages"],
		sources: ranked(events.filter((event) => event.type === "pageview"), "source", "source") as Overview["sources"],
		devices: ranked(events.filter((event) => event.type === "pageview"), "device", "device") as Overview["devices"],
	};
}
