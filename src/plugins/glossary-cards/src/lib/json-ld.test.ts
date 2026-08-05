import { describe, expect, it } from "vitest";
import { serializeJsonLd } from "./json-ld";

describe("serializeJsonLd", () => {
	it("neutralise une fermeture de script tout en conservant les données", () => {
		const value = { description: "</script><script>alert(1)</script> & test" };
		const serialized = serializeJsonLd(value);

		expect(serialized.toLowerCase()).not.toContain("</script");
		expect(JSON.parse(serialized)).toEqual(value);
	});
});
