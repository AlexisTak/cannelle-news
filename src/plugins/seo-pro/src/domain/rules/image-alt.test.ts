import { describe, it, expect } from "vitest";
import { imageAltRule } from "./image-alt";
import { makeDoc } from "../../../test/make-doc";

const env = { focusKeyword: null };
const config = imageAltRule.defaultConfig;

describe("image-alt", () => {
	it("scores 100 when every image has alt text", () => {
		const doc = makeDoc({ images: [{ src: "/a.jpg", alt: "A" }, { src: "/b.jpg", alt: "B" }] });
		const res = imageAltRule.analyze(doc, config, env);
		expect(res.score).toBe(100);
		expect(res.issues).toHaveLength(0);
	});

	it("treats no images as neutral, not a fault", () => {
		const res = imageAltRule.analyze(makeDoc({ images: [] }), config, env);
		expect(res.score).toBe(100);
		expect(res.issues).toHaveLength(0);
	});

	it("warns at or below the threshold", () => {
		const images = [
			{ src: "/a.jpg", alt: "A" },
			{ src: "/b.jpg", alt: "B" },
			{ src: "/c.jpg", alt: "C" },
			{ src: "/d.jpg", alt: null },
		];
		const res = imageAltRule.analyze(makeDoc({ images }), config, env);
		expect(res.score).toBe(80);
		expect(res.issues[0].severity).toBe("warning");
	});

	it("errors past the threshold", () => {
		const images = [{ src: "/a.jpg", alt: "A" }, { src: "/b.jpg", alt: null }];
		const res = imageAltRule.analyze(makeDoc({ images }), config, env);
		expect(res.score).toBe(40);
		expect(res.issues[0].severity).toBe("error");
	});

	it("counts a whitespace-only alt as missing", () => {
		const res = imageAltRule.analyze(makeDoc({ images: [{ src: "/a.jpg", alt: "   " }] }), config, env);
		expect(res.metrics).toMatchObject({ missing: 1 });
	});
});
