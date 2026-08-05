export type AnalyticsEventType = "pageview" | "click" | "download" | "scroll" | "search" | "form_submit" | "newsletter_subscribe" | "custom";

export interface AnalyticsEvent {
	id: string;
	type: AnalyticsEventType;
	name?: string;
	path: string;
	title?: string;
	visitorId: string;
	date: string;
	createdAt: string;
	source: string;
	device: "desktop" | "mobile" | "tablet" | "unknown";
	country?: string;
	properties: Record<string, string | number | boolean>;
}

export interface AnalyticsGoal {
	id: string;
	name: string;
	eventType: AnalyticsEventType;
	eventName?: string;
	createdAt: string;
}
