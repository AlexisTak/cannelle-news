import GlossaryJsonLd from "./GlossaryJsonLd.astro";
import GlossaryScript from "./GlossaryScript.astro";
import GlossaryStyles from "./GlossaryStyles.astro";
import GlossaryTooltip from "./GlossaryTooltip.astro";

export const blockComponents = {};
export const markComponents = {
	glossaryTerm: GlossaryTooltip,
};

export { GlossaryJsonLd, GlossaryScript, GlossaryStyles, GlossaryTooltip };
