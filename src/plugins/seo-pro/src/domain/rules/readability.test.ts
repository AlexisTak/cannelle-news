import { describe, it, expect } from "vitest";
import { readabilityRule, countSentences, readabilityGrade } from "./readability";
import { makeDoc } from "../../../test/make-doc";

const env = { focusKeyword: null };
const config = readabilityRule.defaultConfig;

describe("countSentences", () => {
	it("splits on strong punctuation", () => {
		expect(countSentences("Un. Deux ! Trois ?")).toBe(3);
	});

	it("ignores trailing punctuation with no sentence after it", () => {
		expect(countSentences("Une seule phrase.")).toBe(1);
	});

	it("returns 0 for blank text", () => {
		expect(countSentences("   ")).toBe(0);
	});
});

describe("readabilityGrade", () => {
	it("labels the easy end", () => expect(readabilityGrade(95)).toBe("très facile"));
	it("labels the middle", () => expect(readabilityGrade(55)).toBe("moyen"));
	it("labels the hard end", () => expect(readabilityGrade(10)).toBe("très difficile"));
});

describe("readability", () => {
	it("uses the French formula on French text", () => {
		const plainText = "Le chat dort. Le chien court. La rue est calme. Le ciel est bleu. ".repeat(10);
		const res = readabilityRule.analyze(makeDoc({ plainText }), config, env);
		expect(res.metrics).toMatchObject({ formula: "kandel-moles-fr" });
	});

	it("does not award full marks to text simpler than the ideal band", () => {
		// Phrases de 3-4 mots : Kandel-Moles dépasse 90, donc hors de la bande
		// idéale 60-90 par le haut. Un texte télégraphique n'est pas un bon texte.
		const plainText = "Le chat dort. Le chien court. La rue est calme. Le ciel est bleu. ".repeat(10);
		const res = readabilityRule.analyze(makeDoc({ plainText }), config, env);
		expect(res.metrics!.readingEase as number).toBeGreaterThan(config.idealMaxScore);
		expect(res.score).toBe(70);
	});

	it("awards full marks to ordinary French prose", () => {
		// Mesuré à 79/100 : ~10 mots par phrase, ~1.6 syllabe par mot — le
		// registre de presse que la bande 60-90 vise justement.
		const plainText = (
			"Le conseil municipal a voté le budget annuel. " +
			"Les élus réclament des travaux rapides dans les quartiers du nord. " +
			"Le maire promet un premier chantier avant la fin de l'année. "
		).repeat(8);
		const res = readabilityRule.analyze(makeDoc({ plainText }), config, env);
		const readingEase = res.metrics!.readingEase as number;
		expect(readingEase).toBeGreaterThanOrEqual(config.idealMinScore);
		expect(readingEase).toBeLessThanOrEqual(config.idealMaxScore);
		expect(res.score).toBe(100);
	});

	it("picks the English formula on English text", () => {
		const plainText =
			"The cat sleeps on the mat. The dog runs in the park. The sky is blue and the street is calm. ".repeat(10);
		const res = readabilityRule.analyze(makeDoc({ plainText }), config, env);
		expect(res.metrics).toMatchObject({ formula: "flesch-en" });
	});

	it("penalises long convoluted sentences", () => {
		const plainText =
			"L'incompréhensible démultiplication des considérations administratives supplémentaires " +
			"engendre invariablement une désorganisation particulièrement problématique des " +
			"infrastructures institutionnelles contemporaines internationalement reconnues. ".repeat(10);
		const res = readabilityRule.analyze(makeDoc({ plainText }), config, env);
		expect(res.score).toBe(40);
		expect(res.issues[0].severity).toBe("warning");
	});

	it("clamps the score into 0-100", () => {
		const res = readabilityRule.analyze(makeDoc({ plainText: "Va. " .repeat(30) }), config, env);
		const readingEase = res.metrics!.readingEase as number;
		expect(readingEase).toBeGreaterThanOrEqual(0);
		expect(readingEase).toBeLessThanOrEqual(100);
	});
});
