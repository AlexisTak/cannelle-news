import { describe, expect, it, vi } from "vitest";
import { parseEditorFields } from "./editor";

describe("parseEditorFields", () => {
	it("conserve uniquement les emplacements activés", () => {
		const fields = parseEditorFields({
			field_0_enabled: true,
			field_0_id: "email",
			field_0_name: "email",
			field_0_label: "E-mail",
			field_0_type: "email",
			field_0_required: true,
			field_1_enabled: false,
			field_1_name: "ignored",
		});
		expect(fields).toEqual([{ id: "email", name: "email", label: "E-mail", type: "email", required: true }]);
	});

	it("convertit les options de liste et les limites", () => {
		const [field] = parseEditorFields({
			field_0_enabled: true,
			field_0_id: "topic",
			field_0_name: "topic",
			field_0_label: "Sujet",
			field_0_type: "select",
			field_0_required: false,
			field_0_min_length: "2",
			field_0_max_length: 20,
			field_0_min: "1",
			field_0_max: 5,
			field_0_options: "Support\nCommercial\n",
			field_0_validation_message: "Choisissez un sujet",
		});
		expect(field).toMatchObject({
			minLength: 2,
			maxLength: 20,
			min: 1,
			max: 5,
			validationMessage: "Choisissez un sujet",
			options: [{ label: "Support", value: "Support" }, { label: "Commercial", value: "Commercial" }],
		});
	});

	it("génère un identifiant pour un nouveau champ", () => {
		vi.spyOn(crypto, "randomUUID").mockReturnValue("00000000-0000-4000-8000-000000000000");
		expect(parseEditorFields({ field_0_enabled: true, field_0_name: "name", field_0_label: "Nom", field_0_type: "text" })[0].id)
			.toBe("00000000-0000-4000-8000-000000000000");
		vi.restoreAllMocks();
	});
});
