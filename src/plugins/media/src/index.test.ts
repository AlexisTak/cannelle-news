import { describe, expect, it } from "vitest";
import { cannelleMediaPlugin } from "./index";

describe("cannelleMediaPlugin", () => {
	it("ne déclare que des capacités reconnues par EmDash", () => {
		expect(cannelleMediaPlugin().capabilities).toEqual([
			"media:read",
			"media:write",
			"network:request:unrestricted",
		]);
	});
});
