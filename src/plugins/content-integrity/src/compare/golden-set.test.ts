import { describe, expect, it } from "vitest";
import { compareSets } from "./containment";
import { DEFAULT_CONFIG } from "../domain/config";
import { fingerprintText } from "../fingerprint/document";

function overlap(left: string, right: string): number {
	const a = fingerprintText(left, DEFAULT_CONFIG);
	const b = fingerprintText(right, DEFAULT_CONFIG);
	const score = compareSets(a.shingleHashes, b.shingleHashes);
	return Math.max(score.sourceContainment, score.targetContainment);
}

describe("golden set éditorial français", () => {
	it("détecte une reprise verbatim substantielle", () => {
		const passage = "La rédaction a vérifié chaque document auprès de trois sources indépendantes avant de publier cette enquête détaillée.";
		expect(overlap(`Ouverture originale. ${passage} Première conclusion.`, `Autre introduction. ${passage} Seconde conclusion.`)).toBeGreaterThan(0.45);
	});

	it("ignore une citation de conférence commune", () => {
		const quote = "« Nous devons agir ensemble dès maintenant pour protéger durablement les habitants de cette région. »";
		const score = overlap(
			`Le conseil municipal examinera le budget mardi prochain. ${quote} Les élus publieront ensuite le détail des dépenses.`,
			`Une association organisait mercredi une réunion publique. ${quote} Les bénévoles préparent désormais une nouvelle campagne.`,
		);
		expect(score).toBeLessThan(DEFAULT_CONFIG.thresholds.ignore);
	});

	it("ignore deux angles indépendants sur un même fait", () => {
		const score = overlap(
			"Après les fortes pluies à Lyon, les transports scolaires reprendront progressivement lundi selon la préfecture.",
			"Les commerçants lyonnais évaluent leurs pertes tandis que les équipes municipales nettoient encore les rues inondées.",
		);
		expect(score).toBeLessThan(DEFAULT_CONFIG.thresholds.ignore);
	});

	it("ignore deux articles sans rapport", () => {
		const score = overlap(
			"Une sonde européenne transmet de nouvelles images détaillées des reliefs glacés autour de Jupiter.",
			"Le festival de jazz dévoile une programmation consacrée aux jeunes compositrices venues du bassin méditerranéen.",
		);
		expect(score).toBe(0);
	});
});
