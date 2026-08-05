export interface Subscriber {
	id: string; email: string; emailHash: string; status: "pending" | "confirmed" | "unsubscribed";
	listId: string; source: string; confirmTokenHash: string; unsubscribeTokenHash: string;
	createdAt: string; confirmedAt?: string; unsubscribedAt?: string;
}
export interface NewsletterList { id: string; name: string; createdAt: string }
export interface Campaign {
	id: string; name: string; subject: string; text: string; listId: string;
	status: "draft" | "scheduled" | "sending" | "sent" | "failed"; createdAt: string;
	scheduledAt?: string; sentAt?: string; cursor?: string;
}
export interface Delivery { campaignId: string; subscriberId: string; status: "pending" | "sent" | "failed" | "bounced" | "complained"; createdAt: string; error?: string; trackingTokenHash?: string; openedAt?: string; clickedAt?: string; clickCount?: number }
export interface NewsletterTemplate { id: string; name: string; subject: string; text: string; createdAt: string }
