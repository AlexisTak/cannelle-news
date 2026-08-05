import { describe, expect, it } from "vitest";
import { alignPassages } from "./compare/align";
import { compareSets } from "./compare/containment";
import { severityFor } from "./compare/verdict";
import { DEFAULT_CONFIG } from "./domain/config";
import { createBands } from "./fingerprint/bands";
import { fingerprintText } from "./fingerprint/document";
import { minhash } from "./fingerprint/minhash";
import { createShingles } from "./text/shingles";

describe("moteur d'intégrité", () => {
	it("produit des shingles glissants stables", () => {
		const shingles = createShingles(["un", "deux", "trois", "quatre"], 3);
		expect(shingles).toHaveLength(2);
		expect(shingles[0].hash).not.toBe(shingles[1].hash);
	});

	it("produit une signature MinHash et 32 bandes", () => {
		const signature = minhash([1, 2, 3, 4], 128);
		expect(signature).toEqual(minhash([4, 3, 2, 1], 128));
		expect(createBands(signature, 4)).toHaveLength(32);
	});

	it("mesure le containment de façon asymétrique", () => {
		const score = compareSets([1, 2], [1, 2, 3, 4]);
		expect(score.sourceContainment).toBe(1);
		expect(score.targetContainment).toBe(0.5);
	});

	it("retrouve un passage déplacé", () => {
		const passage = "ce long passage commun contient assez de mots pour être détecté sans aucune ambiguïté dans les deux articles";
		expect(alignPassages(`Introduction différente ${passage} conclusion`, `Autre angle conclusion ${passage} fin`, 8)).toHaveLength(1);
	});

	it("classe un recouvrement fort et stabilise les empreintes", () => {
		const text = "Une rédaction indépendante vérifie ses sources avant de publier chaque information importante pour ses lecteurs.";
		expect(fingerprintText(text, DEFAULT_CONFIG)).toEqual(fingerprintText(text, DEFAULT_CONFIG));
		expect(severityFor(0.5, DEFAULT_CONFIG)).toBe("critical");
	});
});
