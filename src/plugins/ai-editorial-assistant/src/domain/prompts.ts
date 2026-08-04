import {
	META_DESCRIPTION_MAX,
	SEO_TITLE_COUNT,
	TLDR_BULLET_COUNT,
	type ActionId,
	type AssistantDocument,
} from "./actions";

/**
 * Prompts de fond, surchargeables depuis l'admin (KV `settings:prompts`).
 *
 * Trois choix structurants :
 *
 * 1. **Sortie JSON imposée.** Un modèle laissé libre préfixe sa réponse
 *    (« Voici 5 titres : »), ce qui pollue l'insertion en un clic. Le JSON
 *    donne un point de rupture net au parsing — et `parse.ts` garde un plan B
 *    ligne à ligne parce qu'un Llama 8B local n'honore pas toujours la consigne.
 * 2. **Contraintes chiffrées plutôt que qualitatives.** « 50 à 60 caractères »
 *    est vérifiable ; « un bon titre » ne l'est pas. Les limites dures sont de
 *    toute façon réappliquées en code dans `validate.ts` : le prompt oriente,
 *    il ne garantit rien.
 * 3. **Interdictions explicites.** Les modèles produisent spontanément du
 *    clickbait et des formules d'enrobage (« cet article explique que… ») ;
 *    les nommer coûte moins cher que de les corriger à la main ensuite.
 */
export interface Prompts {
	seoTitles: string;
	tldr: string;
	metaDescription: string;
	vulgarize: string;
}

export const DEFAULT_PROMPTS: Prompts = {
	seoTitles: `Tu es secrétaire de rédaction d'un média francophone spécialisé en IA et en tech.
À partir de l'article fourni, propose ${SEO_TITLE_COUNT} titres optimisés pour le référencement.
Contraintes : 50 à 60 caractères, information concrète en tête, pas de superlatif creux,
pas de point final, pas de clickbait, vocabulaire technique conservé s'il est exact.
Réponds uniquement par un tableau JSON de ${SEO_TITLE_COUNT} chaînes.`,

	tldr: `Tu es secrétaire de rédaction d'un média francophone spécialisé en IA et en tech.
Résume l'article en exactement ${TLDR_BULLET_COUNT} points clés, un par puce.
Contraintes : une phrase complète par puce, 90 à 140 caractères, ordre d'importance
décroissante, aucune information absente de l'article, pas de « cet article explique ».
Réponds uniquement par un tableau JSON de ${TLDR_BULLET_COUNT} chaînes.`,

	metaDescription: `Tu es secrétaire de rédaction d'un média francophone spécialisé en IA et en tech.
Rédige la meta description de l'article.
Contraintes : ${META_DESCRIPTION_MAX - 5} caractères maximum espaces compris, une seule phrase,
verbe conjugué, sujet principal dans les 60 premiers caractères, pas de nom du site,
pas de guillemets, pas de troncature en milieu de mot.
Réponds uniquement par un objet JSON { "description": "..." }.`,

	vulgarize: `Tu es journaliste scientifique pour un média francophone grand public.
Reformule le passage fourni pour un lecteur non-expert.
Contraintes : conserve tous les faits et tous les chiffres, remplace le jargon par une
explication courte à la première occurrence, phrases de 25 mots maximum, aucun ajout
d'information, longueur finale comprise entre 80 % et 130 % de l'original.
Réponds uniquement par un objet JSON { "text": "..." }.`,
};

/**
 * Budget de contexte envoyé au modèle.
 *
 * ~8 000 caractères ≈ 2 500 tokens en français : assez pour couvrir un article
 * long de bout en bout, assez peu pour rester sous la fenêtre d'un modèle local
 * 8B sans faire exploser la latence. La troncature se fait à la fin — un
 * article de presse porte son information en tête.
 */
export const MAX_CONTEXT_CHARS = 8000;

export function mergePrompts(stored: Partial<Prompts> | null | undefined): Prompts {
	return { ...DEFAULT_PROMPTS, ...(stored ?? {}) };
}

/**
 * Consigne système effective, langue de sortie comprise.
 *
 * La directive de langue est ajoutée **en fin** de prompt plutôt qu'injectée
 * dans chaque texte : les prompts restent lisibles et surchargeables sans que
 * le rédacteur ait à penser à répéter la consigne de langue à chaque édition.
 */
export function buildSystemPrompt(prompt: string, language: "fr" | "en"): string {
	if (language === "fr") return prompt;
	return `${prompt}\n\nWrite every generated string in English.`;
}

/**
 * Message utilisateur envoyé au modèle pour une action donnée.
 *
 * `vulgarize` ne reçoit **que** le passage à reformuler, pas l'article : lui
 * donner le contexte complet le pousse à résumer l'ensemble au lieu de
 * reformuler le passage demandé.
 */
export function buildUserMessage(
	action: ActionId,
	doc: AssistantDocument,
	selectedText?: string,
): string {
	if (action === "vulgarize") {
		const passage = (selectedText ?? "").trim();
		return `Passage à reformuler :\n\n${passage}`;
	}

	const body = truncate(doc.plainText, MAX_CONTEXT_CHARS);
	return `Titre actuel : ${doc.title || "(sans titre)"}\n\nArticle :\n\n${body}`;
}

function truncate(text: string, max: number): string {
	if (text.length <= max) return text;
	return `${text.slice(0, max).trimEnd()}…`;
}
