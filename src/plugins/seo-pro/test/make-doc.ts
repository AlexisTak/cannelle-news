import type { SeoDocument } from "../src/domain/document";

/**
 * Document par défaut « qui passe toutes les règles ».
 *
 * Chaque test ne surcharge que le champ qu'il éprouve : un échec pointe donc
 * sans ambiguïté vers la règle testée, jamais vers un voisin mal configuré.
 */
export function makeDoc(overrides: Partial<SeoDocument> = {}): SeoDocument {
	return {
		entryId: "01TEST",
		collection: "posts",
		slug: "test-article",
		locale: "fr",
		title: "Titre par défaut",
		metaDescription: "Description par défaut de l'article de test.",
		canonical: "https://example.com/test-article",
		excerpt: "Extrait.",
		featuredImage: null,
		plainText:
			"Ceci est un article de test avec suffisamment de mots pour que la densité et la lisibilité soient calculables. ".repeat(
				40,
			),
		headings: [
			{ level: 2, text: "Introduction" },
			{ level: 3, text: "Contexte" },
		],
		links: [
			{ href: "/autre-article", text: "autre article", internal: true },
			{ href: "https://externe.com", text: "source externe", internal: false },
		],
		images: [
			{ src: "/img1.jpg", alt: "Image 1" },
			{ src: "/img2.jpg", alt: null },
		],
		...overrides,
	};
}
