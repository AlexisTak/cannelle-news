import type { ContentBylineCredit } from "emdash";

/** Rubrique résolue pour le surtitre d'un article. */
export interface ResolvedKicker {
	label: string;
	/** Absent quand le surtitre vient du champ libre : il ne pointe nulle part. */
	href?: string;
}

export interface KickerInput {
	/**
	 * Champ `kicker` de l'entrée. Typé `unknown` volontairement : tant que
	 * `emdash-env.d.ts` n'a pas été régénéré après l'ajout du champ, les pages
	 * y accèdent via un cast, et cette fonction est le point où la valeur est
	 * validée à l'exécution.
	 */
	kicker?: unknown;
	categories?: Array<{ label: string; slug: string }>;
}

const DATE_FORMAT = new Intl.DateTimeFormat("fr-FR", {
	day: "numeric",
	month: "long",
	year: "numeric",
});

/** « 4 août 2026 » */
export function formatArticleDate(date: Date): string {
	return DATE_FORMAT.format(date);
}

/** « Par Alexis Tak, Chloé Michon et Jean Dupont » — null si aucune signature. */
export function formatByline(credits: ContentBylineCredit[] | undefined): string | null {
	if (!credits || credits.length === 0) return null;

	const names = [...credits]
		.sort((a, b) => a.sortOrder - b.sortOrder)
		.map((credit) => credit.byline.displayName);

	if (names.length === 1) return `Par ${names[0]}`;

	const last = names[names.length - 1];
	const rest = names.slice(0, -1);
	return `Par ${rest.join(", ")} et ${last}`;
}

/**
 * Le champ `kicker` prime sur la catégorie. Un kicker vide, fait d'espaces ou
 * d'un type inattendu est ignoré au profit de la première catégorie.
 */
export function resolveKicker({ kicker, categories }: KickerInput): ResolvedKicker | null {
	if (typeof kicker === "string" && kicker.trim().length > 0) {
		return { label: kicker.trim() };
	}

	const first = categories?.[0];
	if (first) {
		return { label: first.label, href: `/category/${first.slug}` };
	}

	return null;
}

/** « 1 article » / « 4 articles ». En français, zéro commande le singulier. */
export function formatPostCount(count: number): string {
	return `${count} article${count > 1 ? "s" : ""}`;
}
