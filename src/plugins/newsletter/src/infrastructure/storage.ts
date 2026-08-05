import type { PluginContext } from "emdash/plugin";
import type { Campaign, Delivery, NewsletterList, NewsletterTemplate, Subscriber } from "../domain/types";
interface Item<T> { id: string; data: T } interface Result<T> { items: Array<Item<T>>; cursor?: string; hasMore: boolean }
interface Collection<T> { get(id: string): Promise<T | null>; put(id: string, data: T): Promise<void>; delete(id: string): Promise<boolean>; query(options?: Record<string, unknown>): Promise<Result<T>>; count(where?: Record<string, unknown>): Promise<number> }
export const newsletterStorage = (ctx: PluginContext) => ({
	subscribers: ctx.storage.subscribers as Collection<Subscriber>, lists: ctx.storage.lists as Collection<NewsletterList>,
	campaigns: ctx.storage.campaigns as Collection<Campaign>, deliveries: ctx.storage.deliveries as Collection<Delivery>,
	consents: ctx.storage.consents as Collection<Record<string, unknown>>,
	templates: ctx.storage.templates as Collection<NewsletterTemplate>, suppressions: ctx.storage.suppressions as Collection<{ emailHash: string; reason: "bounce" | "complaint"; createdAt: string }>,
});
