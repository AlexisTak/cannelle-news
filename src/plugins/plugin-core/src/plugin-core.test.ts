import { describe, expect, it, vi } from "vitest";
import {
	CannelleEventBus,
	createAuditEntry,
	createCannelleEvent,
	hasPermission,
	isRetentionExpired,
	normalizeError,
	redactSensitive,
	validateRetentionPolicy,
} from "./index";

describe("événements Cannelle", () => {
	it("crée une enveloppe stable et corrélable", () => {
		const event = createCannelleEvent(
			"cannelle.form.submitted",
			"cannelle-forms",
			{ submissionId: "sub-1" },
			{ id: "evt-1", now: new Date("2026-08-05T10:00:00Z"), correlationId: "req-1" },
		);
		expect(event).toMatchObject({
			id: "evt-1",
			version: 1,
			occurredAt: "2026-08-05T10:00:00.000Z",
			correlationId: "req-1",
		});
	});

	it("isole l'échec d'un consommateur", async () => {
		const bus = new CannelleEventBus();
		const successful = vi.fn();
		bus.on("cannelle.form.created", successful);
		bus.on("cannelle.form.created", () => {
			throw new Error("indisponible");
		});

		const result = await bus.emit(
			createCannelleEvent("cannelle.form.created", "test", {}, { id: "evt-1" }),
		);
		expect(successful).toHaveBeenCalledOnce();
		expect(result).toMatchObject({ delivered: 1 });
		expect(result.errors).toHaveLength(1);
	});
});

describe("permissions", () => {
	it("accepte les droits précis et les jokers hiérarchiques", () => {
		expect(hasPermission(["cannelle.forms.view"], "cannelle.forms.view")).toBe(true);
		expect(hasPermission(["cannelle.forms.*"], "cannelle.forms.publish")).toBe(true);
		expect(hasPermission(["cannelle.*"], "cannelle.analytics.reports.view")).toBe(true);
	});

	it("n'accorde pas un domaine voisin", () => {
		expect(hasPermission(["cannelle.forms.*"], "cannelle.newsletter.campaigns.send")).toBe(false);
	});
});

describe("audit et erreurs", () => {
	it("masque les secrets imbriqués", () => {
		expect(redactSensitive({ email: "a@b.fr", auth: { apiKey: "secret" } })).toEqual({
			email: "a@b.fr",
			auth: { apiKey: "[REDACTED]" },
		});
	});

	it("construit une entrée d'audit sans secret", () => {
		const entry = createAuditEntry({
			id: "audit-1",
			now: new Date("2026-08-05T10:00:00Z"),
			action: " form.created ",
			actor: { id: "user-1", type: "user" },
			target: { id: "form-1", type: "form" },
			metadata: { token: "abc" },
		});
		expect(entry.action).toBe("form.created");
		expect(entry.metadata.token).toBe("[REDACTED]");
	});

	it("ne divulgue pas une erreur interne", () => {
		expect(normalizeError(new Error("mot de passe SQL")).toPublic()).toEqual({
			code: "internal_error",
			message: "Une erreur interne est survenue.",
		});
	});
});

describe("rétention", () => {
	it("détecte les données arrivées à expiration", () => {
		const now = new Date("2026-08-05T00:00:00Z");
		expect(isRetentionExpired("2026-07-01T00:00:00Z", { days: 30, mode: "delete" }, now)).toBe(true);
		expect(isRetentionExpired("2026-07-20T00:00:00Z", { days: 30, mode: "delete" }, now)).toBe(false);
	});

	it("refuse une politique dangereuse", () => {
		expect(() => validateRetentionPolicy({ days: 0, mode: "delete" })).toThrow(RangeError);
	});
});
