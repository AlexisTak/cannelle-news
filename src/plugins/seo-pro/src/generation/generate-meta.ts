import type { SeoDocument } from "../domain/document";
import type { SeoConfig } from "../analysis/config";

export interface GeneratedMeta {
	title: string;
	description: string;
	openGraph: {
		title: string;
		description: string;
		type: string;
		url: string | null;
		image: string | null;
	};
	twitter: {
		card: "summary" | "summary_large_image";
		title: string;
		description: string;
		image: string | null;
	};
}

const TITLE_IDEAL_MIN = 30;
const TITLE_IDEAL_MAX = 60;
const DESCRIPTION_MAX = 155;

/**
 * Génère une proposition de title, meta description et tags sociaux à partir
 * du document analysé et du mot-clé cible.
 *
 * Le moteur d'analyse fournit déjà le mot-clé cible, la lisibilité et les
 * métriques ; cette couche s'occupe de formater des valeurs exploitables pour
 * le rédacteur.
 */
export function generateMeta(
	doc: SeoDocument,
	config: SeoConfig,
	focusKeyword?: string,
): GeneratedMeta {
	const baseTitle = doc.title.trim();
	const title = optimizeTitle(baseTitle, focusKeyword);

	const description = generateDescription(doc, focusKeyword);

	const pageUrl = doc.slug && config.siteUrl
		? `${config.siteUrl.replace(/\/$/, "")}/${doc.slug}`
		: null;

	const image = doc.featuredImage?.src ?? null;

	return {
		title,
		description,
		openGraph: {
			title,
			description,
			type: "article",
			url: pageUrl,
			image,
		},
		twitter: {
			card: image ? "summary_large_image" : "summary",
			title,
			description,
			image,
		},
	};
}

function optimizeTitle(baseTitle: string, focusKeyword?: string): string {
	let title = baseTitle;

	// Inclusion du mot-clé cible s'il est absent et qu'il reste de la place.
	if (focusKeyword && !title.toLowerCase().includes(focusKeyword.toLowerCase())) {
		const candidate = `${title} — ${focusKeyword}`;
		if (candidate.length <= TITLE_IDEAL_MAX) title = candidate;
	}

	// Ajustement de longueur : on tronque proprement si trop long, on laisse
	// tel quel si trop court (mieux vaut un titre naturel qu'un title bourré).
	if (title.length > TITLE_IDEAL_MAX) {
		title = truncateAtWordBoundary(title, TITLE_IDEAL_MAX);
	}
	if (title.length < TITLE_IDEAL_MIN) {
		// Aucune information fiable pour rallonger sans dénaturer : on conserve
		// le titre existant pour que le rédacteur complète manuellement.
	}

	return title;
}

function generateDescription(doc: SeoDocument, focusKeyword?: string): string {
	let text = (doc.excerpt ?? doc.plainText).trim();
	if (!text) return "";

	// Préfère une phrase complète si le texte est trop long.
	if (text.length > DESCRIPTION_MAX) {
		text = truncateAtWordBoundary(text, DESCRIPTION_MAX);
		// Coupe à la fin de phrase si possible, sans remonter trop loin.
		const lastSentenceEnd = Math.max(text.lastIndexOf("."), text.lastIndexOf("!"), text.lastIndexOf("?"));
		if (lastSentenceEnd > DESCRIPTION_MAX * 0.6) {
			text = text.slice(0, lastSentenceEnd + 1);
		}
	}

	// Inclusion naturelle du mot-clé cible en début de description.
	if (focusKeyword && !text.toLowerCase().includes(focusKeyword.toLowerCase())) {
		const prefix = `${capitalize(focusKeyword)}. `;
		if ((prefix + text).length <= DESCRIPTION_MAX) {
			text = prefix + text;
		}
	}

	return text;
}

function truncateAtWordBoundary(text: string, max: number): string {
	if (text.length <= max) return text;
	const slice = text.slice(0, max);
	const lastSpace = slice.lastIndexOf(" ");
	if (lastSpace > max * 0.7) return slice.slice(0, lastSpace).trimEnd();
	return slice.trimEnd();
}

function capitalize(text: string): string {
	if (!text) return text;
	return text[0].toUpperCase() + text.slice(1);
}
