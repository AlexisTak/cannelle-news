import { validateBlocks } from "@emdash-cms/blocks/server";
import { expect, it } from "vitest";
import { newsletterDashboard } from "./blocks";

it("produit un tableau de bord valide", () => {
	const response = newsletterDashboard({ confirmed: 10, pending: 2, unsubscribed: 1 }, [{ id: "c1", name: "Août", subject: "Actualités", text: "Bonjour", listId: "main", status: "draft", createdAt: "2026-08-05T00:00:00Z" }]);
	expect(validateBlocks(response.blocks)).toEqual({ valid: true, errors: [] });
});
