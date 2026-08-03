/**
 * Représentation neutre d'une entrée de contenu, prête à être analysée.
 *
 * Aucune dépendance à EmDash : l'extraction depuis Portable Text vit dans
 * `content/portable-text.ts`, le chargement depuis le CMS dans
 * `infrastructure/content-loader.ts`. Le domaine ne voit que cette forme.
 */
export interface SeoDocument {
	entryId: string;
	collection: string;
	slug: string | null;
	locale: string | null;
	title: string;
	metaDescription: string | null;
	canonical: string | null;
	excerpt: string | null;
	featuredImage: ImageRef | null;
	plainText: string;
	headings: Array<{ level: 2 | 3 | 4; text: string }>;
	links: Array<{ href: string; text: string; internal: boolean }>;
	images: ImageRef[];
}

export interface ImageRef {
	src: string;
	alt: string | null;
}
