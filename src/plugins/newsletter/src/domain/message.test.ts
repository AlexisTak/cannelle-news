import { describe, expect, it } from "vitest";
import { trackedHtml } from "./message";

describe("trackedHtml", () => {
	it("échappe le HTML et remplace les liens", () => {
		const html = trackedHtml("Bonjour <script>\nhttps://example.com/page", "https://site.test", "track-token", "unsubscribe-token");
		expect(html).not.toContain("<script>"); expect(html).toContain("/_cannelle/click?"); expect(html).toContain("/open?token=track-token"); expect(html).toContain("/unsubscribe?token=unsubscribe-token");
	});
});
