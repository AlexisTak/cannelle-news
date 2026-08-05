import { describe, expect, it } from "vitest";
import type { PluginContext, SandboxedRouteContext } from "emdash/plugin";
import { collectRoute } from "./analytics/src/routes/collect";
import { createFormRoute, publishFormRoute } from "./forms/src/routes/forms";
import { submitFormRoute } from "./forms/src/routes/submissions";
import { campaignsRoute, processCampaigns, scheduleCampaignRoute } from "./newsletter/src/routes/campaigns";
import { confirmRoute, subscribeRoute } from "./newsletter/src/routes/subscribers";

type Document = Record<string, unknown>;

class MemoryCollection {
	items = new Map<string, Document>();
	async get(id: string) { return this.items.get(id) ?? null; }
	async put(id: string, data: Document) { this.items.set(id, structuredClone(data)); }
	async delete(id: string) { return this.items.delete(id); }
	async count(where?: Document) { return (await this.query({ where })).items.length; }
	async query(options: Document = {}) {
		const where = options.where as Document | undefined;
		const limit = Number(options.limit) || 100;
		const matches = [...this.items].filter(([, data]) => !where || Object.entries(where).every(([key, expected]) => {
			const actual = data[key];
			if (expected && typeof expected === "object") {
				const condition = expected as Document;
				if ("gte" in condition && String(actual) < String(condition.gte)) return false;
				if ("lt" in condition && String(actual) >= String(condition.lt)) return false;
				return true;
			}
			return actual === expected;
		}));
		return { items: matches.slice(0, limit).map(([id, data]) => ({ id, data: structuredClone(data) })), hasMore: matches.length > limit, cursor: undefined };
	}
}

function context(collectionNames: string[], emailMessages: Array<{ to: string; subject: string; text: string; html?: string }> = []) {
	const collections = Object.fromEntries(collectionNames.map((name) => [name, new MemoryCollection()]));
	const values = new Map<string, unknown>();
	const ctx = {
		storage: collections,
		kv: { get: async (key: string) => values.get(key) ?? null, set: async (key: string, value: unknown) => { values.set(key, value); }, delete: async (key: string) => values.delete(key), list: async () => [] },
		log: { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} },
		email: { send: async (message: { to: string; subject: string; text: string; html?: string }) => { emailMessages.push(message); } },
		cron: { schedule: async () => {}, cancel: async () => {}, list: async () => [] },
		plugin: { id: "test", version: "0.1.0" },
	} as unknown as PluginContext;
	return { ctx, collections, values };
}

function route(method: string, input: unknown, path = "/page"): SandboxedRouteContext {
	return {
		input,
		request: { url: `https://site.test${path}`, method, headers: { "user-agent": "Mozilla Firefox", referer: "https://site.test/page" } },
		requestMeta: { ip: "203.0.113.10", geo: { country: "FR" } },
	};
}

describe("parcours critique Cannelle Forms", () => {
	it("crée, publie et reçoit une soumission validée", async () => {
		const { ctx, collections } = context(["forms", "formVersions", "submissions", "auditLogs", "eventOutbox", "notificationJobs"]);
		const created = await createFormRoute(route("POST", { title: "Contact", slug: "contact", fields: [{ id: "email", name: "email", label: "E-mail", type: "email", required: true }] }), ctx);
		const formId = created.form.id;
		await publishFormRoute(route("POST", { id: formId }), ctx);
		const submitted = await submitFormRoute(route("POST", { formId, values: { email: "ada@example.com", ignored: "discarded" } }), ctx);
		expect(submitted.success).toBe(true);
		expect(submitted.submissionId).toBeTruthy();
		const stored = await collections.submissions.get(submitted.submissionId!);
		expect(stored?.values).toEqual({ email: "ada@example.com" });
		expect(collections.eventOutbox.items.size).toBeGreaterThanOrEqual(3);
	});
});

describe("parcours critique Cannelle Analytics", () => {
	it("collecte une page vue et une conversion sans stocker l'IP", async () => {
		const { ctx, collections, values } = context(["events", "goals", "goalCompletions", "auditLogs"]);
		values.set("settings:enabled", true); values.set("settings:respectDnt", true);
		await collectRoute(route("POST", { type: "pageview", path: "/article", properties: {} }, "/_emdash/api/plugins/cannelle-analytics/collect"), ctx);
		await collectRoute(route("POST", { type: "form_submit", path: "/article", properties: { formId: "contact" } }, "/_emdash/api/plugins/cannelle-analytics/collect"), ctx);
		expect(collections.events.items.size).toBe(2);
		for (const event of collections.events.items.values()) { expect(event).not.toHaveProperty("ip"); expect(String(event.visitorId)).toHaveLength(32); }
	});
});

describe("parcours critique Cannelle Newsletter", () => {
	it("confirme un abonné puis envoie une campagne traçable", async () => {
		const emails: Array<{ to: string; subject: string; text: string; html?: string }> = [];
		const { ctx, collections, values } = context(["subscribers", "lists", "campaigns", "deliveries", "consents", "templates", "suppressions"], emails);
		values.set("settings:doubleOptIn", true);
		await subscribeRoute(route("POST", { email: "ada@example.com", listId: "main", source: "website" }, "/_emdash/api/plugins/cannelle-newsletter/subscribe"), ctx);
		const confirmationUrl = emails[0].text.match(/https:\/\/\S+/)?.[0]; expect(confirmationUrl).toBeTruthy();
		const token = new URL(confirmationUrl!).searchParams.get("token"); await confirmRoute(route("GET", { token }), ctx);
		const subscriber = [...collections.subscribers.items.values()][0]; expect(subscriber.status).toBe("confirmed");
		const created = await campaignsRoute(route("POST", { name: "Août", subject: "Actualités", text: "Visitez https://example.com/article", listId: "main" }), ctx) as { campaign: { id: string } };
		await scheduleCampaignRoute(route("POST", { id: created.campaign.id, scheduledAt: new Date(0).toISOString() }), ctx);
		await processCampaigns(ctx, "https://site.test");
		expect(emails).toHaveLength(2); expect(emails[1].html).toContain("/_cannelle/click?");
		expect([...collections.deliveries.items.values()][0].status).toBe("sent");
	});
});
