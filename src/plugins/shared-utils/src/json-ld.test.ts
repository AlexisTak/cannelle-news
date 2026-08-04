import { describe, expect, it } from "vitest";
import { toSafeJsonLd } from "./json-ld";

describe("toSafeJsonLd", () => {
	it("serializes normal objects", () => {
		expect(toSafeJsonLd({ a: 1 })).toBe('{"a":1}');
	});

	it("escapes angle brackets to prevent script injection", () => {
		expect(toSafeJsonLd({ title: "</script><script>alert(1)</script>" })).not.toContain("</script");
		expect(toSafeJsonLd({ title: "</script>" })).toContain("\\u003c/script>");
	});
});
