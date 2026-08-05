import { describe, expect, it } from "vitest";
import { createMockIntegrityContext } from "../test/mock-ctx";
import type { Match } from "./domain/types";
import { createPlugin } from "./index";

const commonText = "Cette enquête documentée repose sur plusieurs témoignages concordants recueillis et vérifiés séparément par notre rédaction pendant plusieurs semaines.";

function content(id: string) {
	return {
		id,
		slug: id,
		status: "published",
		data: {
			title: `Article ${id}`,
			content: [{ _type: "block", style: "normal", children: [{ _type: "span", text: commonText }] }],
		},
	};
}

describe("contrat EmDash du plugin", () => {
	it("relie les hooks de publication/retrait et la route de révision au stockage", async () => {
		const runtime = createPlugin() as unknown as {
			hooks: Record<string, { handler: (event: unknown, ctx: unknown) => Promise<unknown> }>;
			routes: Record<string, { handler: (ctx: unknown) => Promise<unknown> }>;
		};
		const { ctx, records } = createMockIntegrityContext();

		await runtime.hooks["content:afterPublish"].handler({ collection: "posts", content: content("a") }, ctx);
		await runtime.hooks["content:afterPublish"].handler({ collection: "posts", content: content("b") }, ctx);
		expect(records.matches.size).toBe(1);

		const [id] = records.matches.keys();
		const reviewed = await runtime.routes.review.handler({ ...ctx, input: { id, status: "dismissed" } }) as {
			ok: boolean;
			data: Match;
		};
		expect(reviewed.ok).toBe(true);
		expect(reviewed.data.status).toBe("dismissed");

		await runtime.hooks["content:afterUnpublish"].handler({ collection: "posts", content: content("a") }, ctx);
		expect(records.fingerprints.has("a")).toBe(false);
		expect(records.matches.size).toBe(0);
	});
});
