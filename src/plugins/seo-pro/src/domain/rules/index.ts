import { titleLengthRule } from "./title-length";
import { metaDescriptionRule } from "./meta-description";
import { contentLengthRule } from "./content-length";
import { keywordDensityRule } from "./keyword-density";
import { readabilityRule } from "./readability";
import { headingStructureRule } from "./heading-structure";
import { imageAltRule } from "./image-alt";
import { linkBalanceRule } from "./link-balance";
import { canonicalRule } from "./canonical";
import type { SeoRule } from "./rule";

export interface RuleEntry {
	rule: SeoRule;
	weight: number;
}

/**
 * Le poids traduit l'impact SEO réel : titre, meta et longueur pèsent le plus,
 * la canonical le moins (elle est souvent générée automatiquement).
 * `calculateOverallScore()` s'en sert comme diviseur.
 */
export const rules: RuleEntry[] = [
	{ rule: titleLengthRule as SeoRule, weight: 1.5 },
	{ rule: metaDescriptionRule as SeoRule, weight: 1.5 },
	{ rule: contentLengthRule as SeoRule, weight: 1.5 },
	{ rule: readabilityRule as SeoRule, weight: 1.0 },
	{ rule: keywordDensityRule as SeoRule, weight: 1.0 },
	{ rule: headingStructureRule as SeoRule, weight: 1.0 },
	{ rule: linkBalanceRule as SeoRule, weight: 0.8 },
	{ rule: imageAltRule as SeoRule, weight: 0.8 },
	{ rule: canonicalRule as SeoRule, weight: 0.5 },
];

export * from "./rule";
