# Thème journalistique — plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Habiller cannelle-news d'un thème de presse en ligne façon *New York Times* — sérif de titraille, noir et blanc, filets fins, densité forte — sur les sept pages du site et les trois blocs éditoriaux fournis par les plugins.

**Architecture:** Tokens CSS globaux dans `src/styles/theme.css` sur `:root`, onze composants Astro dans `src/components/` portant chacun son `<style>` scoped qui consomme ces tokens, et une poignée d'utilitaires de formatage testables dans `src/utils/`. Les pages composent les composants et ne stylent plus rien elles-mêmes.

**Tech Stack:** Astro 7.1.6, EmDash 0.30, adaptateur Cloudflare (D1 + R2), API Fonts d'Astro (`fontProviders.google()`), Vitest 4, pnpm 11.

**Spec de référence:** `plan_design_ui-ux.md` à la racine du dépôt.

## Global Constraints

- **Aucune valeur hexadécimale, taille de police ou largeur en dur dans un composant.** Tout passe par un token de `theme.css`. Seule exception autorisée : les valeurs de repli dans `var(--token, repli)` du CSS des plugins.
- **`--radius: 0` partout.** Aucun coin arrondi, aucune ombre portée, aucun `box-shadow`, sur aucun élément.
- **Pas de mode sombre.** Toute variante `dark:` ou `prefers-color-scheme: dark` rencontrée est supprimée, pas adaptée.
- **Pas de pagination**, pas de temps de lecture. Hors périmètre.
- **Langue française.** `lang="fr"`, dates en `fr-FR`, tous les libellés d'interface en français.
- **Les tests unitaires doivent vivre dans un dossier `__tests__/`.** `vitest.config.ts` n'inclut que `src/**/__tests__/**/*.test.ts` et `src/plugins/**/*.test.ts`. Un fichier `src/utils/format.test.ts` ne serait **jamais exécuté**.
- **Les fichiers `.astro` ne sont pas testables** par Vitest (ils exigent le pipeline Astro et le binding `cloudflare:workers`). Leur vérification passe par `pnpm typecheck` et l'inspection du rendu en dev.
- **Commandes de vérification :** `pnpm typecheck` (`astro check`) et `pnpm test` (`vitest run`). Les deux doivent passer avant chaque commit.
- **Branche de travail :** `feat/glossaire-refonte-admin` (branche courante). Ne pas committer sur `master`.

## Structure des fichiers

| Fichier | Responsabilité | Tâche |
|---|---|---|
| `astro.config.mjs` | *Modifié* — déclaration des trois familles de polices | 1 |
| `src/styles/theme.css` | *Créé* — tokens `:root` + reset éditorial. Aucune règle de mise en page. | 1 |
| `src/layouts/Base.astro` | *Modifié* — `lang="fr"`, import du thème, `<Font>`, lien d'évitement, délégation à `SiteHeader`/`SiteFooter` | 1, 4 |
| `src/utils/format.ts` | *Créé* — formatage éditorial pur (dates, signatures, surtitres, décompte) | 2 |
| `src/utils/__tests__/format.test.ts` | *Créé* — tests de `format.ts` | 2 |
| `seed/seed.json` | *Modifié* — champs `kicker` et `dek` sur `posts` | 3 |
| `src/components/SiteHeader.astro` | *Créé* — bandeau-titre, navigation, recherche | 4 |
| `src/components/SiteFooter.astro` | *Créé* — pied de page + zone de widgets | 4 |
| `src/components/Kicker.astro` | *Créé* — surtitre de rubrique | 5 |
| `src/components/MetaLine.astro` | *Créé* — ligne de méta à séparateurs | 5 |
| `src/components/Byline.astro` | *Créé* — signature | 5 |
| `src/components/TagList.astro` | *Créé* — liste d'étiquettes | 5 |
| `src/components/SectionHeading.astro` | *Créé* — titre de section à filet | 5 |
| `src/components/CardGrid.astro` | *Créé* — grille à filets verticaux | 6 |
| `src/components/ArticleCard.astro` | *Créé* — carte d'article, 4 variantes | 6 |
| `src/components/ArticleHeader.astro` | *Créé* — en-tête d'article | 7 |
| `src/components/Prose.astro` | *Créé* — corps d'article, grille à sorties de colonne | 7 |
| `src/pages/posts/[slug].astro` | *Modifié* — composition de la page article | 8 |
| `src/pages/index.astro` | *Modifié* — accueil | 9 |
| `src/pages/posts/index.astro` | *Modifié* — listing | 10 |
| `src/pages/category/[slug].astro` | *Modifié* — listing de rubrique | 10 |
| `src/pages/tag/[slug].astro` | *Modifié* — listing d'étiquette | 10 |
| `src/pages/[slug].astro` | *Modifié* — page simple | 10 |
| `src/pages/404.astro` | *Modifié* — page 404 | 10 |
| `src/plugins/ai-editorial-assistant/src/astro/TldrBox.astro` | *Modifié* — tokens | 11 |
| `src/plugins/glossary-cards/src/astro/GlossaryStyles.astro` | *Modifié* — tokens avec repli | 11 |
| `src/plugins/research-paper-embed/src/astro/ResearchPaperCard.astro` | *Modifié* — réécriture complète | 12 |

---

## Task 1: Fondations — polices et tokens

**Files:**
- Modify: `astro.config.mjs`
- Create: `src/styles/theme.css`
- Modify: `src/layouts/Base.astro`

**Interfaces:**
- Consumes: rien.
- Produces: les variables CSS `--font-display`, `--font-body`, `--font-meta`, `--color-*`, `--fs-*`, `--lh-*`, `--sp-*`, `--w-*`, `--gutter`, `--radius` sur `:root`. **Toutes les tâches suivantes en dépendent.**

- [ ] **Step 1: Déclarer les trois familles dans `astro.config.mjs`**

Ajouter l'import en haut du fichier, à côté de `defineConfig` :

```js
import { defineConfig, fontProviders } from "astro/config";
```

Puis ajouter la clé `fonts` au niveau racine de l'objet passé à `defineConfig`, juste après le bloc `image`  :

```js
	fonts: [
		{
			provider: fontProviders.google(),
			name: "Playfair Display",
			cssVariable: "--font-display",
			weights: [700, 800],
			subsets: ["latin", "latin-ext"],
			display: "swap",
			fallbacks: ["Georgia", "Times New Roman", "serif"],
		},
		{
			provider: fontProviders.google(),
			name: "Source Serif 4",
			cssVariable: "--font-body",
			weights: [400, 600],
			styles: ["normal", "italic"],
			subsets: ["latin", "latin-ext"],
			display: "swap",
			fallbacks: ["Georgia", "serif"],
		},
		{
			provider: fontProviders.google(),
			name: "Inter",
			cssVariable: "--font-meta",
			weights: [500, 600, 700],
			subsets: ["latin", "latin-ext"],
			display: "swap",
			fallbacks: ["system-ui", "sans-serif"],
		},
	],
```

`latin-ext` est obligatoire : le français a besoin de `œ`, `Ÿ` et des capitales accentuées pour la titraille en majuscules.

- [ ] **Step 2: Créer `src/styles/theme.css`**

Fichier complet, à créer tel quel :

```css
/*
 * Thème journalistique — tokens et reset éditorial.
 *
 * Les tokens vivent sur `:root` et non dans un `<style>` scoped Astro :
 * le CSS `is:inline` des plugins (glossary-cards) doit pouvoir les lire, et
 * les sélecteurs d'un style scoped sont hachés.
 *
 * Ce fichier ne contient AUCUNE règle de mise en page. Les grilles et les
 * composants vivent dans `src/components/`.
 */

:root {
	/* Couleurs — ratios de contraste calculés sur fond blanc */
	--color-ink: #121212;              /* 18,8:1 — corps et titres      */
	--color-ink-soft: #363636;         /* 11,6:1 — chapeau              */
	--color-ink-muted: #666666;        /*  5,7:1 — méta, légendes  (AA) */
	--color-accent: #326891;           /*  5,5:1 — liens           (AA) */
	--color-accent-hover: #1d4b70;
	--color-accent-light: #8fb4d4;     /* liens sur fond sombre (infobulle) */
	--color-surface: #ffffff;
	--color-surface-alt: #f7f7f7;
	--color-rule: #dfdfdf;             /* filets décoratifs             */
	--color-border-interactive: #8f8f8f; /* 3,2:1 — WCAG 1.4.11         */

	/* Familles — les variables sont produites par l'API Fonts d'Astro */
	--font-display: var(--font-display-fallback, Georgia, serif);
	--font-body: var(--font-body-fallback, Georgia, serif);
	--font-meta: var(--font-meta-fallback, system-ui, sans-serif);

	/* Échelle typographique */
	--fs-display: clamp(2.25rem, 1.6rem + 3.2vw, 3.75rem);
	--fs-h1: clamp(2rem, 1.5rem + 2.2vw, 3rem);
	--fs-h2: 1.75rem;
	--fs-h3: 1.3125rem;
	--fs-card-lead: 1.5rem;
	--fs-card: 1.125rem;
	--fs-body: 1.125rem;
	--fs-dek: 1.125rem;
	--fs-meta: 0.75rem;
	--fs-caption: 0.8125rem;

	/* Interlignes */
	--lh-display: 1.05;
	--lh-title: 1.15;
	--lh-body: 1.65;
	--lh-meta: 1.3;

	/* Espacement, base 4 px */
	--sp-1: 0.25rem;
	--sp-2: 0.5rem;
	--sp-3: 0.75rem;
	--sp-4: 1rem;
	--sp-6: 1.5rem;
	--sp-8: 2rem;
	--sp-12: 3rem;
	--sp-16: 4rem;
	--sp-24: 6rem;

	/* Largeurs */
	--w-page: 1200px;
	--w-wide: 945px;
	--w-text: 660px;
	--gutter: clamp(1rem, 4vw, 2.5rem);

	/* Aucun arrondi : c'est ce qui sépare un thème de presse d'un thème SaaS */
	--radius: 0;
}

/* --- Reset éditorial ---------------------------------------------------- */

*,
*::before,
*::after {
	box-sizing: border-box;
}

html {
	-webkit-text-size-adjust: 100%;
}

body {
	margin: 0;
	background: var(--color-surface);
	color: var(--color-ink);
	font-family: var(--font-body);
	font-size: var(--fs-body);
	line-height: var(--lh-body);
	font-synthesis-weight: none;
}

h1,
h2,
h3,
h4,
h5,
h6 {
	margin: 0;
	font-family: var(--font-display);
	font-weight: 700;
	line-height: var(--lh-title);
	letter-spacing: -0.01em;
}

h1 { font-size: var(--fs-h1); }
h2 { font-size: var(--fs-h2); }
h3 { font-size: var(--fs-h3); }

p,
ul,
ol,
figure,
blockquote {
	margin: 0;
}

a {
	color: var(--color-accent);
	text-decoration: underline;
	text-underline-offset: 0.15em;
	text-decoration-thickness: from-font;
}

a:hover {
	color: var(--color-accent-hover);
}

img {
	display: block;
	max-width: 100%;
	height: auto;
}

/* Un contour visible au clavier, jamais supprimé sans remplaçant */
:focus-visible {
	outline: 2px solid var(--color-accent);
	outline-offset: 2px;
}

input,
button,
select {
	font: inherit;
	border-radius: var(--radius);
}

/* --- Utilitaires partagés ---------------------------------------------- */

/* Visible au focus clavier uniquement — sert au lien d'évitement */
.visually-hidden-focusable:not(:focus):not(:active) {
	position: absolute;
	width: 1px;
	height: 1px;
	overflow: hidden;
	clip-path: inset(50%);
	white-space: nowrap;
}

/* Le libellé en capitales Inter : rubriques, badges, méta */
.eyebrow {
	font-family: var(--font-meta);
	font-size: var(--fs-meta);
	font-weight: 600;
	line-height: var(--lh-meta);
	letter-spacing: 0.08em;
	text-transform: uppercase;
}

@media (prefers-reduced-motion: reduce) {
	*,
	*::before,
	*::after {
		animation-duration: 0.01ms !important;
		animation-iteration-count: 1 !important;
		transition-duration: 0.01ms !important;
		scroll-behavior: auto !important;
	}
}
```

- [ ] **Step 3: Câbler le thème et les polices dans `src/layouts/Base.astro`**

Trois modifications, sans toucher au reste du fichier.

Ajouter en fin de bloc d'imports du frontmatter :

```astro
import { Font } from "astro:assets";
import "../styles/theme.css";
```

Remplacer `<html lang="en">` par :

```astro
<html lang="fr">
```

Ajouter dans le `<head>`, juste avant `<EmDashHead page={pageCtx} />` :

```astro
		<Font cssVariable="--font-body" preload />
		<Font cssVariable="--font-display" />
		<Font cssVariable="--font-meta" />
```

Un seul `preload`, sur le corps de texte : précharger les six fichiers saturerait la file de requêtes critiques et retarderait le LCP qu'ils sont censés servir. Le composant `Font` émet lui-même le `<style>` contenant les `@font-face` ; l'omettre échoue au build avec `FontFamilyNotFound`.

- [ ] **Step 4: Vérifier**

```bash
pnpm typecheck
pnpm test
```

Attendu : les deux passent. `astro check` doit rapporter 0 erreur.

Puis lancer le serveur de dev et charger `http://localhost:4321/` :

```bash
npx emdash dev
```

Attendu : le texte s'affiche en Source Serif 4, les titres en Playfair Display. Dans l'onglet Réseau, les fichiers `.woff2` sont servis depuis l'origine locale (`/_astro/fonts/…`), pas depuis `fonts.gstatic.com`. Le premier build télécharge les polices : une connexion réseau est nécessaire.

- [ ] **Step 5: Commit**

```bash
git add astro.config.mjs src/styles/theme.css src/layouts/Base.astro
git commit -m "feat(theme): tokens de design et polices auto-hébergées"
```

---

## Task 2: Utilitaires de formatage éditorial

**Files:**
- Create: `src/utils/format.ts`
- Create: `src/utils/__tests__/format.test.ts`

**Interfaces:**
- Consumes: le type `ContentBylineCredit` de `emdash` — forme `{ byline: { displayName: string; slug: string }, sortOrder: number, roleLabel: string | null }`.
- Produces:
  - `formatArticleDate(date: Date): string`
  - `formatByline(credits: ContentBylineCredit[] | undefined): string | null`
  - `resolveKicker(input: KickerInput): ResolvedKicker | null`
  - `formatPostCount(count: number): string`
  - types exportés `KickerInput` et `ResolvedKicker`

Le dossier `__tests__` n'est pas une préférence de style : `vitest.config.ts` n'inclut que `src/**/__tests__/**/*.test.ts` hors plugins. Un fichier posé ailleurs ne serait jamais exécuté et passerait pour « vert » à tort.

- [ ] **Step 1: Écrire les tests qui échouent**

Créer `src/utils/__tests__/format.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import {
	formatArticleDate,
	formatByline,
	formatPostCount,
	resolveKicker,
} from "../format";

describe("formatArticleDate", () => {
	it("formate en français long", () => {
		expect(formatArticleDate(new Date("2026-08-04T10:00:00Z"))).toBe("4 août 2026");
	});

	it("ne préfixe pas le jour d'un zéro", () => {
		expect(formatArticleDate(new Date("2026-01-09T10:00:00Z"))).toBe("9 janvier 2026");
	});
});

describe("formatByline", () => {
	const credit = (displayName: string, sortOrder: number) => ({
		byline: { displayName, slug: displayName.toLowerCase() },
		sortOrder,
		roleLabel: null,
	});

	it("retourne null sans signature", () => {
		expect(formatByline(undefined)).toBeNull();
		expect(formatByline([])).toBeNull();
	});

	it("préfixe une signature unique", () => {
		expect(formatByline([credit("Alexis Tak", 0)])).toBe("Par Alexis Tak");
	});

	it("joint deux signatures par « et »", () => {
		expect(formatByline([credit("Alexis Tak", 0), credit("Chloé Michon", 1)])).toBe(
			"Par Alexis Tak et Chloé Michon",
		);
	});

	it("joint trois signatures par virgules puis « et »", () => {
		expect(
			formatByline([
				credit("Alexis Tak", 0),
				credit("Chloé Michon", 1),
				credit("Jean Dupont", 2),
			]),
		).toBe("Par Alexis Tak, Chloé Michon et Jean Dupont");
	});

	it("respecte sortOrder plutôt que l'ordre du tableau", () => {
		expect(formatByline([credit("Chloé Michon", 1), credit("Alexis Tak", 0)])).toBe(
			"Par Alexis Tak et Chloé Michon",
		);
	});
});

describe("resolveKicker", () => {
	it("préfère le champ kicker quand il est renseigné", () => {
		expect(
			resolveKicker({
				kicker: "Enquête",
				categories: [{ label: "Science", slug: "science" }],
			}),
		).toEqual({ label: "Enquête" });
	});

	it("retombe sur la première catégorie et fournit son lien", () => {
		expect(
			resolveKicker({ categories: [{ label: "Science", slug: "science" }] }),
		).toEqual({ label: "Science", href: "/category/science" });
	});

	it("ignore un kicker vide ou fait d'espaces", () => {
		expect(
			resolveKicker({
				kicker: "   ",
				categories: [{ label: "Science", slug: "science" }],
			}),
		).toEqual({ label: "Science", href: "/category/science" });
	});

	it("ignore un kicker qui n'est pas une chaîne", () => {
		expect(resolveKicker({ kicker: 42, categories: [] })).toBeNull();
	});

	it("retourne null sans kicker ni catégorie", () => {
		expect(resolveKicker({})).toBeNull();
	});
});

describe("formatPostCount", () => {
	it("accorde le singulier", () => {
		expect(formatPostCount(1)).toBe("1 article");
	});

	it("accorde le pluriel", () => {
		expect(formatPostCount(4)).toBe("4 articles");
	});

	it("traite zéro comme un pluriel", () => {
		expect(formatPostCount(0)).toBe("0 article");
	});
});
```

Note sur le dernier cas : en français, zéro commande le singulier (« 0 article »), contrairement à l'anglais. C'est la règle typographique, pas une coquille.

- [ ] **Step 2: Lancer les tests pour vérifier qu'ils échouent**

```bash
pnpm test
```

Attendu : ÉCHEC — `Cannot find module '../format'`.

- [ ] **Step 3: Écrire l'implémentation minimale**

Créer `src/utils/format.ts` :

```ts
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
```

- [ ] **Step 4: Lancer les tests pour vérifier qu'ils passent**

```bash
pnpm test
pnpm typecheck
```

Attendu : les 14 assertions passent, `astro check` rapporte 0 erreur.

- [ ] **Step 5: Commit**

```bash
git add src/utils/format.ts src/utils/__tests__/format.test.ts
git commit -m "feat(utils): formatage éditorial français (dates, signatures, surtitres)"
```

---

## Task 3: Champs `kicker` et `dek` au schéma

**Files:**
- Modify: `seed/seed.json`

**Interfaces:**
- Consumes: rien.
- Produces: `post.data.kicker` (string, optionnel) et `post.data.dek` (text, optionnel) sur la collection `posts`.

- [ ] **Step 1: Ajouter les deux champs**

Dans `seed/seed.json`, la collection `posts` est le premier élément du tableau `collections`. Insérer les deux objets dans son tableau `fields`, **entre** l'entrée `title` et l'entrée `featured_image` — l'ordre du tableau pilote l'ordre d'affichage dans l'admin, et un surtitre se saisit juste après le titre :

```json
			{
				"slug": "kicker",
				"label": "Surtitre",
				"type": "string",
				"description": "Surtitre de rubrique affiché au-dessus du titre (ex. ENQUÊTE). À défaut, la première catégorie est utilisée."
			},
			{
				"slug": "dek",
				"label": "Chapeau",
				"type": "text",
				"description": "Chapeau éditorial affiché sous le titre. Distinct de l'extrait, qui reste réservé au SEO et aux cartes."
			},
```

Respecter l'indentation du fichier (tabulations) et la virgule de séparation JSON. Ajouts purement additifs : aucune migration destructive, aucun champ existant modifié.

- [ ] **Step 2: Vérifier que le JSON reste valide**

```bash
node -e "const s=require('./seed/seed.json'); const f=s.collections[0].fields.map(x=>x.slug); console.log(f.join(', ')); if(!f.includes('kicker')||!f.includes('dek')) process.exit(1)"
```

Attendu : `title, kicker, dek, featured_image, content, excerpt, tldr, ai_assistant, internal_links`, code de sortie 0.

- [ ] **Step 3: Régénérer les types**

```bash
npx emdash dev
```

Laisser démarrer, puis interrompre. Le démarrage applique le seed et régénère `emdash-env.d.ts`.

```bash
git diff --stat emdash-env.d.ts
```

Attendu : `emdash-env.d.ts` porte désormais `kicker?: string;` et `dek?: string;` sur l'interface `Post`.

Si la base locale est antérieure et que les champs n'apparaissent pas, les tâches suivantes accèdent aux deux valeurs via un cast — patron déjà en place pour `tldr` dans `src/pages/posts/[slug].astro` :

```ts
const raw = post.data as unknown as Record<string, unknown>;
const kicker = raw.kicker;
const dek = typeof raw.dek === "string" ? raw.dek : null;
```

`resolveKicker` valide déjà `kicker` à l'exécution, le cast est donc sûr.

- [ ] **Step 4: Vérifier**

```bash
pnpm typecheck
pnpm test
```

Attendu : les deux passent.

- [ ] **Step 5: Commit**

```bash
git add seed/seed.json emdash-env.d.ts
git commit -m "feat(schema): champs kicker et dek sur la collection posts"
```

---

## Task 4: Coque du site

**Files:**
- Create: `src/components/SiteHeader.astro`
- Create: `src/components/SiteFooter.astro`
- Modify: `src/layouts/Base.astro`

**Interfaces:**
- Consumes: les tokens de la tâche 1.
- Produces:
  - `SiteHeader` — props `{ siteTitle: string; siteLogo: { url: string; alt?: string } | null; menu: { items: Array<{ url: string; label: string; target?: string }> } | null; compact?: boolean }`
  - `SiteFooter` — props `{ siteTitle: string }`
  - `Base.astro` accepte une nouvelle prop optionnelle `compactHeader?: boolean`

- [ ] **Step 1: Créer `src/components/SiteHeader.astro`**

```astro
---
import LiveSearch from "emdash/ui/search";

interface MenuItem {
	url: string;
	label: string;
	target?: string | null;
}

interface Props {
	siteTitle: string;
	siteLogo: { url: string; alt?: string } | null;
	menu: { items: MenuItem[] } | null;
	/** Bandeau-titre réduit — utilisé partout sauf en accueil. */
	compact?: boolean;
}

const { siteTitle, siteLogo, menu, compact = false } = Astro.props;

// Comparaison sur le chemin seul : les paramètres de requête ne doivent pas
// empêcher la rubrique courante d'être marquée.
const currentPath = Astro.url.pathname;
const isCurrent = (url: string) =>
	url === "/" ? currentPath === "/" : currentPath.startsWith(url);
---

<header class:list={["masthead", { "is-compact": compact }]}>
	<div class="masthead__inner">
		<a class="masthead__wordmark" href="/">
			{
				siteLogo ? (
					<img src={siteLogo.url} alt={siteLogo.alt || siteTitle} />
				) : (
					siteTitle
				)
			}
		</a>
		<div class="masthead__search">
			<LiveSearch placeholder="Rechercher…" collections={["posts", "pages"]} />
		</div>
	</div>

	{
		menu && menu.items.length > 0 && (
			<nav class="sections" aria-label="Rubriques">
				<ul>
					{menu.items.map((item) => (
						<li>
							<a
								href={item.url}
								target={item.target ?? undefined}
								aria-current={isCurrent(item.url) ? "page" : undefined}
							>
								{item.label}
							</a>
						</li>
					))}
				</ul>
			</nav>
		)
	}
</header>

<style>
	.masthead {
		border-block-end: 1px solid var(--color-ink);
	}

	.masthead__inner {
		display: grid;
		grid-template-columns: 1fr auto;
		align-items: center;
		gap: var(--sp-4);
		max-width: var(--w-page);
		margin-inline: auto;
		padding: var(--sp-8) var(--gutter) var(--sp-6);
	}

	.masthead__wordmark {
		grid-column: 1 / -1;
		justify-self: center;
		font-family: var(--font-display);
		font-size: var(--fs-display);
		font-weight: 800;
		line-height: var(--lh-display);
		letter-spacing: -0.02em;
		color: var(--color-ink);
		text-decoration: none;
		text-align: center;
	}

	.masthead__wordmark img {
		max-height: 4rem;
		width: auto;
	}

	.masthead__search {
		grid-column: 1 / -1;
		justify-self: center;
		margin-block-start: var(--sp-4);
	}

	.is-compact .masthead__inner {
		grid-template-columns: 1fr auto;
		padding-block: var(--sp-4);
	}

	.is-compact .masthead__wordmark {
		grid-column: 1;
		justify-self: start;
		font-size: var(--fs-h2);
		text-align: start;
	}

	.is-compact .masthead__wordmark img {
		max-height: 2.5rem;
	}

	.is-compact .masthead__search {
		grid-column: 2;
		margin-block-start: 0;
	}

	.sections {
		border-block-start: 1px solid var(--color-rule);
	}

	.sections ul {
		display: flex;
		gap: var(--sp-6);
		max-width: var(--w-page);
		margin-inline: auto;
		padding-inline: var(--gutter);
		list-style: none;
		overflow-x: auto;
		scrollbar-width: none;
	}

	.sections ul::-webkit-scrollbar {
		display: none;
	}

	.sections a {
		display: block;
		/* 44 px de cible tactile obtenus par le padding, pas par la police */
		padding-block: var(--sp-3);
		font-family: var(--font-meta);
		font-size: var(--fs-meta);
		font-weight: 600;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		white-space: nowrap;
		color: var(--color-ink);
		text-decoration: none;
	}

	.sections a:hover {
		color: var(--color-accent);
	}

	.sections a[aria-current="page"] {
		box-shadow: inset 0 -2px 0 0 var(--color-ink);
	}
</style>
```

Le `box-shadow: inset` du lien courant est un soulignement épais, pas une ombre portée : il ne contrevient pas à la contrainte « aucune ombre ».

- [ ] **Step 2: Créer `src/components/SiteFooter.astro`**

```astro
---
import { WidgetArea } from "emdash/ui";

interface Props {
	siteTitle: string;
}

const { siteTitle } = Astro.props;
const year = new Date().getFullYear();
---

<footer class="site-footer">
	<div class="site-footer__inner">
		<WidgetArea name="sidebar" />
	</div>
	<p class="site-footer__legal">© {year} {siteTitle}</p>
</footer>

<style>
	.site-footer {
		margin-block-start: var(--sp-24);
		border-block-start: 3px solid var(--color-ink);
		background: var(--color-surface);
	}

	.site-footer__inner {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr));
		gap: var(--sp-8);
		max-width: var(--w-page);
		margin-inline: auto;
		padding: var(--sp-12) var(--gutter);
	}

	/* Les widgets sont rendus par EmDash : leurs éléments portent la portée
	   du composant WidgetArea, pas celle-ci. `:global()` est donc requis. */
	.site-footer__inner :global(h2),
	.site-footer__inner :global(h3) {
		font-family: var(--font-meta);
		font-size: var(--fs-meta);
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		margin-block-end: var(--sp-3);
		padding-block-end: var(--sp-2);
		border-block-end: 1px solid var(--color-rule);
	}

	.site-footer__inner :global(ul) {
		list-style: none;
		padding: 0;
	}

	.site-footer__inner :global(li) {
		padding-block: var(--sp-2);
		border-block-end: 1px solid var(--color-rule);
		font-size: var(--fs-caption);
	}

	.site-footer__legal {
		max-width: var(--w-page);
		margin-inline: auto;
		padding: var(--sp-6) var(--gutter) var(--sp-12);
		font-family: var(--font-meta);
		font-size: var(--fs-meta);
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--color-ink-muted);
	}
</style>
```

**Le `:global()` n'est pas optionnel.** Astro n'applique l'attribut de portée qu'aux éléments présents dans le *template du composant courant*. Le balisage produit par `<WidgetArea>` porte la portée de `WidgetArea`, donc un sélecteur `.site-footer__inner h2` compilé en `.site-footer__inner[data-astro-cid-X] h2[data-astro-cid-X]` ne matcherait jamais. Le même piège s'applique à `<slot />` (tâche 6) et à `<PortableText>` (tâche 7).

- [ ] **Step 3: Recâbler `src/layouts/Base.astro`**

Ajouter aux imports :

```astro
import SiteHeader from "../components/SiteHeader.astro";
import SiteFooter from "../components/SiteFooter.astro";
```

Retirer l'import devenu inutile de `LiveSearch` (il vit désormais dans `SiteHeader`) et retirer `WidgetArea` de l'import `emdash/ui` s'il n'y sert plus — garder `EmDashHead`, `EmDashBodyStart`, `EmDashBodyEnd`.

Ajouter `compactHeader` à l'interface `Props` et à la déstructuration :

```astro
	/** Bandeau-titre réduit. Vrai partout sauf en accueil. */
	compactHeader?: boolean;
```

```astro
const { title, pageTitle, description, image, canonical, content, compactHeader } = Astro.props;
```

Remplacer l'intégralité du contenu de `<body>` situé entre `<EmDashBodyStart …/>` et `<EmDashBodyEnd …/>` par :

```astro
		<a class="visually-hidden-focusable skip-link" href="#contenu">
			Aller au contenu
		</a>

		<SiteHeader
			siteTitle={siteTitle}
			siteLogo={siteLogo}
			menu={menu}
			compact={compactHeader}
		/>

		<main id="contenu" tabindex="-1">
			<slot />
		</main>

		<SiteFooter siteTitle={siteTitle} />
```

Ajouter en fin de fichier, après `</html>` :

```astro
<style>
	.skip-link:focus {
		position: fixed;
		z-index: 100;
		inset-block-start: var(--sp-2);
		inset-inline-start: var(--sp-2);
		padding: var(--sp-3) var(--sp-4);
		background: var(--color-ink);
		color: var(--color-surface);
		font-family: var(--font-meta);
		font-size: var(--fs-meta);
		letter-spacing: 0.08em;
		text-transform: uppercase;
		text-decoration: none;
	}
</style>
```

`tabindex="-1"` sur `<main>` est requis pour que le lien d'évitement y déplace effectivement le focus ; sans lui, le navigateur fait défiler sans déplacer le point de focus clavier.

- [ ] **Step 4: Vérifier**

```bash
pnpm typecheck
pnpm test
```

Attendu : les deux passent.

Puis, serveur de dev lancé, sur `http://localhost:4321/` :
1. Appuyer sur Tab depuis le haut de page → « Aller au contenu » apparaît en haut à gauche sur fond noir.
2. Appuyer sur Entrée → le focus atteint `<main>`.
3. La rubrique correspondant à l'URL courante porte un soulignement épais et `aria-current="page"` dans l'inspecteur.
4. Le pied de page affiche les widgets Recherche / Catégories / Articles récents en colonnes, titres en capitales.

- [ ] **Step 5: Commit**

```bash
git add src/components/SiteHeader.astro src/components/SiteFooter.astro src/layouts/Base.astro
git commit -m "feat(theme): coque du site — bandeau-titre, rubriques, pied de page, lien d'évitement"
```

---

## Task 5: Composants de méta

**Files:**
- Create: `src/components/Kicker.astro`
- Create: `src/components/MetaLine.astro`
- Create: `src/components/Byline.astro`
- Create: `src/components/TagList.astro`
- Create: `src/components/SectionHeading.astro`

**Interfaces:**
- Consumes: `formatArticleDate`, `formatByline` de `src/utils/format.ts` (tâche 2) ; les tokens de la tâche 1.
- Produces:
  - `Kicker` — `{ label: string; href?: string }`
  - `MetaLine` — `{ date?: Date | null; align?: "start" | "center" }`, plus un `<slot />` pour des éléments additionnels
  - `Byline` — `{ credits: ContentBylineCredit[] | undefined }`
  - `TagList` — `{ tags: Array<{ label: string; slug: string }> }`
  - `SectionHeading` — `{ label: string; href?: string; level?: 2 | 3 }`

- [ ] **Step 1: Créer `src/components/Kicker.astro`**

```astro
---
interface Props {
	label: string;
	href?: string;
}

const { label, href } = Astro.props;
---

{
	href ? (
		<a class="kicker" href={href}>
			{label}
		</a>
	) : (
		<span class="kicker">{label}</span>
	)
}

<style>
	.kicker {
		display: block;
		margin-block-end: var(--sp-2);
		font-family: var(--font-meta);
		font-size: var(--fs-meta);
		font-weight: 700;
		line-height: var(--lh-meta);
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--color-accent);
		text-decoration: none;
	}

	a.kicker:hover {
		color: var(--color-accent-hover);
		text-decoration: underline;
	}
</style>
```

- [ ] **Step 2: Créer `src/components/MetaLine.astro`**

```astro
---
import { formatArticleDate } from "../utils/format";

interface Props {
	date?: Date | null;
	align?: "start" | "center";
}

const { date, align = "start" } = Astro.props;
---

<p class:list={["meta-line", `is-${align}`]}>
	{
		date && (
			<time datetime={date.toISOString()}>{formatArticleDate(date)}</time>
		)
	}
	<slot />
</p>

<style>
	.meta-line {
		display: flex;
		flex-wrap: wrap;
		gap: var(--sp-2);
		font-family: var(--font-meta);
		font-size: var(--fs-meta);
		font-weight: 500;
		line-height: var(--lh-meta);
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--color-ink-muted);
	}

	.is-center {
		justify-content: center;
	}

	/* Le séparateur est décoratif : aria-hidden n'est pas nécessaire sur un
	   pseudo-élément, qui n'est déjà pas exposé à l'arbre d'accessibilité. */
	.meta-line > * + *::before {
		content: "·";
		margin-inline-end: var(--sp-2);
	}
</style>
```

- [ ] **Step 3: Créer `src/components/Byline.astro`**

```astro
---
import type { ContentBylineCredit } from "emdash";
import { formatByline } from "../utils/format";

interface Props {
	credits: ContentBylineCredit[] | undefined;
}

const label = formatByline(Astro.props.credits);
---

{label && <span class="byline">{label}</span>}

<style>
	.byline {
		font-family: var(--font-meta);
		font-size: var(--fs-meta);
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--color-ink);
	}
</style>
```

- [ ] **Step 4: Créer `src/components/TagList.astro`**

```astro
---
interface Props {
	tags: Array<{ label: string; slug: string }>;
}

const { tags } = Astro.props;
---

{
	tags.length > 0 && (
		<nav class="tag-list" aria-label="Sujets liés">
			<span class="tag-list__label">Sujets</span>
			<ul>
				{tags.map((tag) => (
					<li>
						<a href={`/tag/${tag.slug}`}>{tag.label}</a>
					</li>
				))}
			</ul>
		</nav>
	)
}

<style>
	.tag-list {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: var(--sp-3);
		margin-block-start: var(--sp-12);
		padding-block-start: var(--sp-4);
		border-block-start: 1px solid var(--color-ink);
	}

	.tag-list__label {
		font-family: var(--font-meta);
		font-size: var(--fs-meta);
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--color-ink-muted);
	}

	.tag-list ul {
		display: flex;
		flex-wrap: wrap;
		gap: var(--sp-2);
		list-style: none;
		padding: 0;
	}

	.tag-list a {
		display: block;
		padding: var(--sp-1) var(--sp-3);
		border: 1px solid var(--color-border-interactive);
		border-radius: var(--radius);
		font-family: var(--font-meta);
		font-size: var(--fs-caption);
		color: var(--color-ink);
		text-decoration: none;
	}

	.tag-list a:hover {
		border-color: var(--color-ink);
		background: var(--color-ink);
		color: var(--color-surface);
	}
</style>
```

- [ ] **Step 5: Créer `src/components/SectionHeading.astro`**

```astro
---
interface Props {
	label: string;
	href?: string;
	level?: 2 | 3;
}

const { label, href, level = 2 } = Astro.props;
const Tag = `h${level}` as "h2" | "h3";
---

<div class="section-heading">
	<Tag>
		{href ? <a href={href}>{label}</a> : label}
	</Tag>
</div>

<style>
	.section-heading {
		margin-block: var(--sp-12) var(--sp-6);
		border-block-start: 3px solid var(--color-ink);
	}

	.section-heading :global(h2),
	.section-heading :global(h3) {
		margin-block-start: var(--sp-2);
		font-family: var(--font-meta);
		font-size: var(--fs-meta);
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	.section-heading :global(a) {
		color: var(--color-ink);
		text-decoration: none;
	}

	.section-heading :global(a:hover) {
		color: var(--color-accent);
	}
</style>
```

`Tag` étant une balise dynamique, Astro ne lui applique pas toujours l'attribut de portée de manière fiable ; `:global()` garantit que la règle s'applique quel que soit le niveau rendu.

- [ ] **Step 6: Vérifier**

```bash
pnpm typecheck
pnpm test
```

Attendu : les deux passent. Aucun rendu visuel à contrôler à ce stade — ces composants ne sont encore montés nulle part ; la tâche 6 les consomme.

- [ ] **Step 7: Commit**

```bash
git add src/components/Kicker.astro src/components/MetaLine.astro src/components/Byline.astro src/components/TagList.astro src/components/SectionHeading.astro
git commit -m "feat(theme): composants de méta — surtitre, ligne de méta, signature, étiquettes, titre de section"
```

---

## Task 6: Grille à filets et carte d'article

**Files:**
- Create: `src/components/CardGrid.astro`
- Create: `src/components/ArticleCard.astro`

**Interfaces:**
- Consumes: `Kicker`, `MetaLine` (tâche 5) ; `resolveKicker` (tâche 2) ; les tokens (tâche 1).
- Produces:
  - `CardGrid` — `{ columns?: 1 | 2 | 3 | 4 }` + `<slot />`
  - `ArticleCard` — `{ post: Post; variant?: "lead" | "standard" | "compact" | "list"; headingLevel?: 2 | 3 }`

- [ ] **Step 1: Créer `src/components/CardGrid.astro`**

```astro
---
interface Props {
	columns?: 1 | 2 | 3 | 4;
}

const { columns = 3 } = Astro.props;
---

<div class="card-grid" style={`--cols: ${columns};`}>
	<slot />
</div>

<style>
	.card-grid {
		display: grid;
		grid-template-columns: repeat(var(--cols, 3), 1fr);
		/* Pas de column-gap : le filet occupe la gouttière. Avec gap + border,
		   le filet colle au bord de la carte suivante et le décalage se voit. */
		column-gap: 0;
		row-gap: var(--sp-8);
		margin-inline: calc(var(--sp-6) / -2);
	}

	/* Le contenu vient du <slot /> : il porte la portée de la page appelante,
	   pas celle de ce composant. `:global()` est indispensable. */
	.card-grid > :global(*) {
		padding-inline: calc(var(--sp-6) / 2);
	}

	.card-grid > :global(* + *) {
		border-inline-start: 1px solid var(--color-rule);
	}

	@media (max-width: 900px) {
		.card-grid {
			grid-template-columns: 1fr;
			margin-inline: 0;
		}

		.card-grid > :global(*) {
			padding-inline: 0;
		}

		.card-grid > :global(* + *) {
			/* Sans cette remise à zéro, chaque carte empilée conserve un filet
			   vertical orphelin sur son flanc gauche. */
			border-inline-start: 0;
			border-block-start: 1px solid var(--color-rule);
			padding-block-start: var(--sp-6);
		}
	}
</style>
```

- [ ] **Step 2: Créer `src/components/ArticleCard.astro`**

```astro
---
import type { Post } from "../../emdash-env";
import { Image } from "emdash/ui";
import Kicker from "./Kicker.astro";
import MetaLine from "./MetaLine.astro";
import { resolveKicker } from "../utils/format";

interface Props {
	post: Post & { id: string };
	variant?: "lead" | "standard" | "compact" | "list";
	/**
	 * Niveau de titre du titre de carte. La même carte apparaît sous un `h1`
	 * en accueil et sous un `h2` de rubrique : sans cette prop la hiérarchie
	 * de titres est cassée sur toutes les pages de listing (WCAG 1.3.1).
	 */
	headingLevel?: 2 | 3;
}

const { post, variant = "standard", headingLevel = 2 } = Astro.props;
const Heading = `h${headingLevel}` as "h2" | "h3";

// Cast : `kicker` et `dek` peuvent manquer de `emdash-env.d.ts` tant que la
// base locale n'a pas été migrée. `resolveKicker` valide à l'exécution.
const raw = post.data as unknown as Record<string, unknown>;
const kicker = resolveKicker({
	kicker: raw.kicker,
	categories: post.data.terms?.category ?? [],
});

const summary =
	variant === "lead" && typeof raw.dek === "string" && raw.dek.trim().length > 0
		? raw.dek
		: post.data.excerpt;

const showImage = variant === "lead" || variant === "standard" || variant === "list";
const showSummary = variant === "lead" || variant === "standard";
const href = `/posts/${post.id}`;
---

<article class:list={["card", `card--${variant}`]}>
	{
		showImage && post.data.featured_image && (
			<a class="card__media" href={href} tabindex="-1" aria-hidden="true">
				<Image image={post.data.featured_image} />
			</a>
		)
	}

	<div class="card__body">
		{kicker && <Kicker label={kicker.label} href={kicker.href} />}

		<Heading class="card__title">
			<a href={href}>{post.data.title}</a>
		</Heading>

		{showSummary && summary && <p class="card__summary">{summary}</p>}

		{post.data.publishedAt && <MetaLine date={post.data.publishedAt} />}
	</div>
</article>

<style>
	.card {
		display: flex;
		flex-direction: column;
		gap: var(--sp-3);
	}

	.card__media {
		display: block;
		margin-block-end: var(--sp-1);
	}

	.card__media :global(img) {
		width: 100%;
		border-radius: var(--radius);
	}

	.card__title {
		font-family: var(--font-display);
		line-height: var(--lh-title);
	}

	.card__title :global(a) {
		color: var(--color-ink);
		text-decoration: none;
	}

	.card__title :global(a:hover) {
		color: var(--color-accent);
		text-decoration: underline;
	}

	.card__summary {
		color: var(--color-ink-soft);
		font-size: var(--fs-card);
	}

	.card--lead .card__title {
		font-size: var(--fs-display);
		letter-spacing: -0.02em;
	}

	.card--standard .card__title {
		font-size: var(--fs-card-lead);
	}

	.card--compact .card__title {
		font-size: var(--fs-card);
	}

	/* Variante en ligne : vignette à gauche, titre à droite. */
	.card--list {
		flex-direction: row;
		align-items: start;
		gap: var(--sp-4);
	}

	.card--list .card__media {
		flex: 0 0 6rem;
		margin-block-end: 0;
	}

	.card--list .card__title {
		font-size: var(--fs-card);
	}

	@media (max-width: 600px) {
		.card--lead .card__title {
			font-size: var(--fs-h1);
		}
	}
</style>
```

L'image porte `tabindex="-1"` et `aria-hidden="true"` : elle mène à la même destination que le titre, et sans ça chaque carte impose deux tabulations pour un seul article — bruit de navigation clavier classique sur les listings de presse.

- [ ] **Step 3: Vérifier**

```bash
pnpm typecheck
pnpm test
```

Attendu : les deux passent.

Si `astro check` signale que `Post` n'est pas exporté par `../../emdash-env`, c'est que la base n'a pas encore été migrée : lancer `npx emdash dev` une fois pour régénérer `emdash-env.d.ts`, puis relancer.

- [ ] **Step 4: Commit**

```bash
git add src/components/CardGrid.astro src/components/ArticleCard.astro
git commit -m "feat(theme): grille à filets et carte d'article à quatre variantes"
```

---

## Task 7: En-tête d'article et corps de texte

**Files:**
- Create: `src/components/ArticleHeader.astro`
- Create: `src/components/Prose.astro`

**Interfaces:**
- Consumes: `Kicker`, `MetaLine`, `Byline` (tâche 5) ; `resolveKicker` (tâche 2).
- Produces:
  - `ArticleHeader` — `{ post: Post & { edit: Record<string, unknown> } }`
  - `Prose` — `<slot />` uniquement ; porte la grille à sorties de colonne et les styles éditoriaux du corps

- [ ] **Step 1: Créer `src/components/ArticleHeader.astro`**

```astro
---
import type { Post } from "../../emdash-env";
import { Image } from "emdash/ui";
import Kicker from "./Kicker.astro";
import MetaLine from "./MetaLine.astro";
import Byline from "./Byline.astro";
import { resolveKicker } from "../utils/format";

interface Props {
	post: Post & { edit: Record<string, Record<string, unknown>> };
}

const { post } = Astro.props;

const raw = post.data as unknown as Record<string, unknown>;
const kicker = resolveKicker({
	kicker: raw.kicker,
	categories: post.data.terms?.category ?? [],
});
const dek = typeof raw.dek === "string" && raw.dek.trim().length > 0 ? raw.dek : null;
---

<header class="article-header">
	<div class="article-header__text">
		{kicker && <Kicker label={kicker.label} href={kicker.href} />}

		<h1 {...post.edit.title}>{post.data.title}</h1>

		{dek && <p class="article-header__dek">{dek}</p>}

		<MetaLine date={post.data.publishedAt}>
			<Byline credits={post.data.bylines} />
		</MetaLine>
	</div>

	{
		post.data.featured_image && (
			<figure class="article-header__media" {...post.edit.featured_image}>
				<Image image={post.data.featured_image} />
				{post.data.featured_image.alt && (
					<figcaption>{post.data.featured_image.alt}</figcaption>
				)}
			</figure>
		)
	}
</header>

<style>
	.article-header {
		max-width: var(--w-wide);
		margin-inline: auto;
		padding-inline: var(--gutter);
		padding-block-start: var(--sp-12);
	}

	.article-header__text {
		max-width: var(--w-text);
		margin-inline: auto;
	}

	.article-header h1 {
		font-size: var(--fs-h1);
		letter-spacing: -0.02em;
	}

	.article-header__dek {
		margin-block-start: var(--sp-4);
		font-size: var(--fs-dek);
		line-height: 1.45;
		color: var(--color-ink-soft);
	}

	.article-header :global(.meta-line) {
		margin-block-start: var(--sp-6);
		padding-block: var(--sp-3);
		border-block: 1px solid var(--color-rule);
	}

	.article-header__media {
		margin-block-start: var(--sp-8);
	}

	.article-header__media :global(img) {
		width: 100%;
		border-radius: var(--radius);
	}

	.article-header__media figcaption {
		margin-block-start: var(--sp-2);
		font-family: var(--font-meta);
		font-size: var(--fs-caption);
		line-height: 1.4;
		color: var(--color-ink-muted);
	}
</style>
```

`MetaLine` est un composant enfant : sa classe `.meta-line` porte la portée de `MetaLine`, d'où `:global(.meta-line)` pour l'ajuster depuis l'en-tête.

- [ ] **Step 2: Créer `src/components/Prose.astro`**

```astro
---
/**
 * Corps d'article. Porte la grille à sorties de colonne : le texte se lit sur
 * `--w-text`, mais un enfant marqué `.is-wide` ou `.is-full` peut déborder.
 *
 * Tous les sélecteurs visant le contenu sont en `:global()` : le balisage vient
 * de `<PortableText>` et porte la portée de ce composant-là, pas celle-ci.
 */
---

<div class="prose">
	<slot />
</div>

<style>
	.prose {
		display: grid;
		grid-template-columns:
			[full-start] minmax(var(--gutter), 1fr)
			[wide-start] minmax(0, calc((var(--w-wide) - var(--w-text)) / 2))
			[text-start] min(100% - var(--gutter) * 2, var(--w-text)) [text-end]
			minmax(0, calc((var(--w-wide) - var(--w-text)) / 2)) [wide-end]
			minmax(var(--gutter), 1fr) [full-end];
		margin-block-start: var(--sp-12);
	}

	/* Les paires [text-start]/[text-end] créent la zone nommée `text` : pas
	   d'indices de colonne à recompter si une colonne est ajoutée. */
	.prose > :global(*) {
		grid-column: text;
	}

	.prose > :global(.is-wide) {
		grid-column: wide;
	}

	.prose > :global(.is-full) {
		grid-column: full;
	}

	.prose > :global(* + *) {
		margin-block-start: var(--sp-6);
	}

	.prose :global(p) {
		font-size: var(--fs-body);
		line-height: var(--lh-body);
	}

	.prose > :global(h2) {
		margin-block-start: var(--sp-12);
		font-size: var(--fs-h2);
	}

	.prose > :global(h3) {
		margin-block-start: var(--sp-8);
		font-size: var(--fs-h3);
	}

	.prose :global(ul),
	.prose :global(ol) {
		padding-inline-start: var(--sp-6);
	}

	.prose :global(li) {
		margin-block-start: var(--sp-2);
	}

	.prose :global(ul) {
		list-style: square;
	}

	.prose > :global(blockquote) {
		padding-inline-start: var(--sp-6);
		border-inline-start: 3px solid var(--color-ink);
		font-family: var(--font-display);
		font-size: var(--fs-card-lead);
		line-height: 1.3;
	}

	.prose :global(figure) :global(img) {
		width: 100%;
		border-radius: var(--radius);
	}

	.prose :global(figcaption) {
		margin-block-start: var(--sp-2);
		font-family: var(--font-meta);
		font-size: var(--fs-caption);
		line-height: 1.4;
		color: var(--color-ink-muted);
	}
</style>
```

- [ ] **Step 3: Vérifier**

```bash
pnpm typecheck
pnpm test
```

Attendu : les deux passent.

- [ ] **Step 4: Commit**

```bash
git add src/components/ArticleHeader.astro src/components/Prose.astro
git commit -m "feat(theme): en-tête d'article et corps de texte à sorties de colonne"
```

---

## Task 8: Page article

**Files:**
- Modify: `src/pages/posts/[slug].astro`

**Interfaces:**
- Consumes: `ArticleHeader`, `Prose` (tâche 7), `TagList` (tâche 5), `CardGrid`, `ArticleCard` (tâche 6), `SectionHeading` (tâche 5).
- Produces: rien pour les tâches suivantes.

- [ ] **Step 1: Ajouter les imports et la requête « À lire ensuite »**

Dans le frontmatter de `src/pages/posts/[slug].astro`, ajouter aux imports existants :

```astro
import { getEmDashCollection } from "emdash";
import ArticleHeader from "../../components/ArticleHeader.astro";
import Prose from "../../components/Prose.astro";
import TagList from "../../components/TagList.astro";
import SectionHeading from "../../components/SectionHeading.astro";
import CardGrid from "../../components/CardGrid.astro";
import ArticleCard from "../../components/ArticleCard.astro";
```

`getEmDashCollection` s'ajoute à l'import `emdash` existant, qui devient :

```astro
import {
	getEmDashEntry,
	getEmDashCollection,
	getSeoMeta,
	decodeSlug,
	getSiteSettings,
} from "emdash";
```

Puis, après la ligne `const categories = post.data.terms?.category ?? [];`, ajouter :

```astro
// « À lire ensuite » : les plus récents hors article courant, limité à 3.
const { entries: recent } = await getEmDashCollection("posts", {
	orderBy: { published_at: "desc" },
});
const alsoRead = recent.filter((p) => p.id !== post.id).slice(0, 3);
```

- [ ] **Step 2: Remplacer le corps du template**

Remplacer tout ce qui se trouve entre `<GlossaryScript slot="head" />` et la fermeture `</Base>` par :

```astro
	<article>
		<ArticleHeader post={post} />

		<Prose>
			<TldrBox bullets={(post.data as unknown as Record<string, unknown>).tldr} />

			<PortableText
				value={post.data.content}
				components={{
					types: { ...blockComponents, ...aiBlockComponents },
					marks: glossaryMarkComponents,
				}}
			/>
		</Prose>

		<div class="article-footer">
			<TagList tags={tags} />
		</div>

		<GlossaryJsonLd blocks={post.data.content ?? []} />
		<ResearchPaperJsonLd blocks={post.data.content ?? []} />
	</article>

	{
		alsoRead.length > 0 && (
			<section class="also-read">
				<SectionHeading label="À lire ensuite" />
				<CardGrid columns={3}>
					{alsoRead.map((p) => (
						<ArticleCard post={p} variant="standard" headingLevel={3} />
					))}
				</CardGrid>
			</section>
		)
	}

	<style>
		.article-footer,
		.also-read {
			max-width: var(--w-text);
			margin-inline: auto;
			padding-inline: var(--gutter);
		}

		.also-read {
			max-width: var(--w-page);
		}
	</style>
```

L'`<aside>` contenant `<WidgetArea name="sidebar" />` disparaît : les widgets vivent désormais dans le pied de page. Retirer `WidgetArea` de l'import `emdash/ui` de ce fichier — `Image` et `PortableText` y restent nécessaires.

`headingLevel={3}` sur les cartes « À lire ensuite » : elles sont subordonnées au `h2` du `SectionHeading`, lui-même sous le `h1` de l'article.

- [ ] **Step 3: Passer le bandeau-titre en version réduite**

Ajouter `compactHeader` à l'appel de `<Base>` de ce fichier :

```astro
<Base
	title={seo.title}
	pageTitle={seo.ogTitle}
	description={seo.description}
	canonical={seo.canonical}
	image={seo.ogImage}
	content={{ collection: "posts", id: post.data.id, slug }}
	compactHeader
>
```

- [ ] **Step 4: Vérifier**

```bash
pnpm typecheck
pnpm test
```

Attendu : les deux passent.

Serveur de dev lancé, ouvrir un article :
1. Surtitre en bleu capitales, titre Playfair, chapeau gris, ligne de méta encadrée de deux filets fins.
2. Le corps se lit sur une colonne d'environ 660 px, centrée.
3. L'image d'ouverture est plus large que le texte (jusqu'à 945 px).
4. Les étiquettes s'affichent sous un filet noir en bas d'article.
5. « À lire ensuite » présente trois cartes séparées par des filets verticaux.
6. Réduire la fenêtre sous 900 px : les filets verticaux deviennent horizontaux, aucun filet orphelin à gauche.

- [ ] **Step 5: Commit**

```bash
git add src/pages/posts/\[slug\].astro
git commit -m "feat(theme): mise en page de la page article"
```

---

## Task 9: Page d'accueil

**Files:**
- Modify: `src/pages/index.astro`

**Interfaces:**
- Consumes: `ArticleCard`, `CardGrid` (tâche 6), `SectionHeading` (tâche 5).
- Produces: rien.

- [ ] **Step 1: Réécrire `src/pages/index.astro`**

Remplacer l'intégralité du fichier :

```astro
---
import { getEmDashCollection, getSiteSettings } from "emdash";
import { WidgetArea } from "emdash/ui";
import Base from "../layouts/Base.astro";
import ArticleCard from "../components/ArticleCard.astro";
import CardGrid from "../components/CardGrid.astro";
import SectionHeading from "../components/SectionHeading.astro";
import { resolveStarterSiteIdentity } from "../utils/site-identity";

const { entries: posts, cacheHint } = await getEmDashCollection("posts", {
	orderBy: { published_at: "desc" },
});
const { siteTitle, siteTagline } = resolveStarterSiteIdentity(await getSiteSettings());
if (Astro.cache?.enabled) Astro.cache.set(cacheHint);

// Découpage piloté par la date de publication, pas par les rubriques : le seed
// ne garantit aucune rubrique peuplée.
const [lead, ...rest] = posts;
const secondary = rest.slice(0, 3);
const remainder = rest.slice(3);
---

<Base title={siteTitle} description={siteTagline}>
	{
		posts.length === 0 ? (
			<p class="empty">
				Aucun article pour le moment.{" "}
				<a href="/_emdash/admin/content/posts/new">En créer un</a>.
			</p>
		) : (
			<div class="home">
				<section class="home__top">
					<div class="home__lead">
						<ArticleCard post={lead} variant="lead" headingLevel={2} />
					</div>
					<aside class="home__rail" aria-label="En complément">
						<WidgetArea name="sidebar" />
					</aside>
				</section>

				{secondary.length > 0 && (
					<section>
						<SectionHeading label="À la une" />
						<CardGrid columns={3}>
							{secondary.map((post) => (
								<ArticleCard post={post} variant="standard" headingLevel={3} />
							))}
						</CardGrid>
					</section>
				)}

				{remainder.length > 0 && (
					<section>
						<SectionHeading label="Plus d'articles" href="/posts" />
						<CardGrid columns={4}>
							{remainder.map((post) => (
								<ArticleCard post={post} variant="compact" headingLevel={3} />
							))}
						</CardGrid>
					</section>
				)}
			</div>
		)
	}
</Base>

<style>
	.home {
		max-width: var(--w-page);
		margin-inline: auto;
		padding: var(--sp-12) var(--gutter) 0;
	}

	.home__top {
		display: grid;
		grid-template-columns: 2fr 1fr;
		column-gap: 0;
		margin-inline: calc(var(--sp-8) / -2);
	}

	.home__lead,
	.home__rail {
		padding-inline: calc(var(--sp-8) / 2);
	}

	.home__rail {
		border-inline-start: 1px solid var(--color-rule);
	}

	/* Les widgets sont rendus par EmDash : portée étrangère, donc :global(). */
	.home__rail :global(h2),
	.home__rail :global(h3) {
		font-family: var(--font-meta);
		font-size: var(--fs-meta);
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		margin-block-end: var(--sp-3);
		padding-block-end: var(--sp-2);
		border-block-end: 2px solid var(--color-ink);
	}

	.home__rail :global(ul) {
		list-style: none;
		padding: 0;
	}

	.home__rail :global(li) {
		padding-block: var(--sp-3);
		border-block-end: 1px solid var(--color-rule);
		font-size: var(--fs-caption);
		line-height: 1.35;
	}

	.home__rail :global(a) {
		color: var(--color-ink);
		text-decoration: none;
	}

	.home__rail :global(a:hover) {
		color: var(--color-accent);
		text-decoration: underline;
	}

	.empty {
		max-width: var(--w-text);
		margin-inline: auto;
		padding: var(--sp-24) var(--gutter);
		text-align: center;
	}

	@media (max-width: 900px) {
		.home__top {
			grid-template-columns: 1fr;
			margin-inline: 0;
		}

		.home__lead,
		.home__rail {
			padding-inline: 0;
		}

		.home__rail {
			border-inline-start: 0;
			border-block-start: 3px solid var(--color-ink);
			margin-block-start: var(--sp-8);
			padding-block-start: var(--sp-6);
		}
	}
</style>
```

L'accueil ne passe pas `compactHeader` : c'est la seule page où le bandeau-titre s'affiche en grand.

- [ ] **Step 2: Vérifier**

```bash
pnpm typecheck
pnpm test
```

Attendu : les deux passent.

Serveur de dev lancé, sur `/` :
1. Bandeau-titre centré en grand, filet noir en dessous, barre de rubriques.
2. Article de une sur deux tiers de largeur, rail de widgets sur un tiers, séparés par un filet vertical.
3. « À LA UNE » en capitales sous un filet noir épais, trois cartes séparées par des filets.
4. Sous 900 px : tout s'empile, le rail passe sous l'article de une avec un filet horizontal.
5. Un seul `h1` dans le document — celui du bandeau-titre est un lien, pas un titre : vérifier dans l'inspecteur qu'aucun `h1` concurrent n'existe.

- [ ] **Step 3: Commit**

```bash
git add src/pages/index.astro
git commit -m "feat(theme): mise en page de la page d'accueil"
```

---

## Task 10: Listings, page simple et 404

**Files:**
- Modify: `src/pages/posts/index.astro`
- Modify: `src/pages/category/[slug].astro`
- Modify: `src/pages/tag/[slug].astro`
- Modify: `src/pages/[slug].astro`
- Modify: `src/pages/404.astro`

**Interfaces:**
- Consumes: `ArticleCard`, `CardGrid` (tâche 6), `SectionHeading` (tâche 5), `Prose` (tâche 7), `formatPostCount` (tâche 2).
- Produces: rien.

- [ ] **Step 1: Réécrire `src/pages/posts/index.astro`**

```astro
---
import { getEmDashCollection } from "emdash";
import Base from "../../layouts/Base.astro";
import ArticleCard from "../../components/ArticleCard.astro";
import CardGrid from "../../components/CardGrid.astro";
import SectionHeading from "../../components/SectionHeading.astro";

const { entries: posts, cacheHint } = await getEmDashCollection("posts", {
	orderBy: { published_at: "desc" },
});
if (Astro.cache?.enabled) Astro.cache.set(cacheHint);
---

<Base title="Tous les articles" compactHeader>
	<div class="listing">
		<SectionHeading label="Tous les articles" level={2} />
		{
			posts.length === 0 ? (
				<p>Aucun article pour le moment.</p>
			) : (
				<CardGrid columns={3}>
					{posts.map((post) => (
						<ArticleCard post={post} variant="standard" headingLevel={3} />
					))}
				</CardGrid>
			)
		}
	</div>
</Base>

<style>
	.listing {
		max-width: var(--w-page);
		margin-inline: auto;
		padding: var(--sp-8) var(--gutter) 0;
	}
</style>
```

La requête groupée `getTermsForEntries` disparaît : `ArticleCard` n'affiche pas d'étiquettes, la donnée n'est plus consommée. Retirer `getTermsForEntries` et `Image` des imports, tous deux devenus inutiles ici.

- [ ] **Step 2: Réécrire `src/pages/category/[slug].astro`**

```astro
---
import { getTerm, getEmDashCollection, decodeSlug } from "emdash";
import Base from "../../layouts/Base.astro";
import ArticleCard from "../../components/ArticleCard.astro";
import CardGrid from "../../components/CardGrid.astro";
import { formatPostCount } from "../../utils/format";

const slug = decodeSlug(Astro.params.slug);
const term = slug ? await getTerm("category", slug) : null;

if (!term) {
	return Astro.redirect("/404");
}

const { entries: posts } = await getEmDashCollection("posts", {
	where: { category: term.slug },
	orderBy: { published_at: "desc" },
});
---

<Base
	title={`${term.label} — articles`}
	description={`Articles de la rubrique ${term.label}`}
	compactHeader
>
	<div class="listing">
		<header class="listing__header">
			<h1>{term.label}</h1>
			<p class="listing__count">{formatPostCount(posts.length)}</p>
		</header>

		{
			posts.length === 0 ? (
				<p>Aucun article dans cette rubrique pour le moment.</p>
			) : (
				<CardGrid columns={3}>
					{posts.map((post) => (
						<ArticleCard post={post} variant="standard" headingLevel={2} />
					))}
				</CardGrid>
			)
		}
	</div>
</Base>

<style>
	.listing {
		max-width: var(--w-page);
		margin-inline: auto;
		padding: var(--sp-8) var(--gutter) 0;
	}

	.listing__header {
		margin-block-end: var(--sp-8);
		padding-block-end: var(--sp-4);
		border-block-end: 3px solid var(--color-ink);
	}

	.listing__header h1 {
		font-size: var(--fs-h1);
	}

	.listing__count {
		margin-block-start: var(--sp-2);
		font-family: var(--font-meta);
		font-size: var(--fs-meta);
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--color-ink-muted);
	}
</style>
```

`headingLevel={2}` ici, contre `3` sur la page `/posts` : les cartes sont directement sous le `h1` de la rubrique, sans `SectionHeading` intermédiaire.

- [ ] **Step 3: Réécrire `src/pages/tag/[slug].astro`**

Identique à l'étape 2, à quatre différences près : `getTerm("tag", …)`, le titre, la description, et le texte de vide.

```astro
---
import { getTerm, getEmDashCollection, decodeSlug } from "emdash";
import Base from "../../layouts/Base.astro";
import ArticleCard from "../../components/ArticleCard.astro";
import CardGrid from "../../components/CardGrid.astro";
import { formatPostCount } from "../../utils/format";

const slug = decodeSlug(Astro.params.slug);
const term = slug ? await getTerm("tag", slug) : null;

if (!term) {
	return Astro.redirect("/404");
}

const { entries: posts } = await getEmDashCollection("posts", {
	where: { tag: term.slug },
	orderBy: { published_at: "desc" },
});
---

<Base
	title={`Articles sur « ${term.label} »`}
	description={`Articles portant l'étiquette ${term.label}`}
	compactHeader
>
	<div class="listing">
		<header class="listing__header">
			<p class="listing__eyebrow">Sujet</p>
			<h1>{term.label}</h1>
			<p class="listing__count">{formatPostCount(posts.length)}</p>
		</header>

		{
			posts.length === 0 ? (
				<p>Aucun article sur ce sujet pour le moment.</p>
			) : (
				<CardGrid columns={3}>
					{posts.map((post) => (
						<ArticleCard post={post} variant="standard" headingLevel={2} />
					))}
				</CardGrid>
			)
		}
	</div>
</Base>

<style>
	.listing {
		max-width: var(--w-page);
		margin-inline: auto;
		padding: var(--sp-8) var(--gutter) 0;
	}

	.listing__header {
		margin-block-end: var(--sp-8);
		padding-block-end: var(--sp-4);
		border-block-end: 3px solid var(--color-ink);
	}

	.listing__eyebrow {
		font-family: var(--font-meta);
		font-size: var(--fs-meta);
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--color-accent);
	}

	.listing__header h1 {
		font-size: var(--fs-h1);
	}

	.listing__count {
		margin-block-start: var(--sp-2);
		font-family: var(--font-meta);
		font-size: var(--fs-meta);
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--color-ink-muted);
	}
</style>
```

- [ ] **Step 4: Adapter `src/pages/[slug].astro`**

Ajouter l'import :

```astro
import Prose from "../components/Prose.astro";
```

Ajouter `compactHeader` à l'appel de `<Base>`, et remplacer le contenu de l'`<article>` par :

```astro
	<article class="page">
		<header class="page__header">
			<h1 {...page.edit.title}>{page.data.title}</h1>
		</header>

		<Prose>
			<PortableText value={page.data.content} />
		</Prose>
	</article>

	<style>
		.page__header {
			max-width: var(--w-text);
			margin-inline: auto;
			padding: var(--sp-16) var(--gutter) 0;
		}

		.page__header h1 {
			font-size: var(--fs-h1);
			letter-spacing: -0.02em;
		}
	</style>
```

- [ ] **Step 5: Réécrire `src/pages/404.astro`**

```astro
---
import Base from "../layouts/Base.astro";
---

<Base title="Page introuvable" compactHeader>
	<div class="not-found">
		<p class="not-found__code">Erreur 404</p>
		<h1>Page introuvable</h1>
		<p class="not-found__body">
			La page que vous cherchez n'existe pas ou a été déplacée.
		</p>
		<a class="not-found__home" href="/">Retour à l'accueil</a>
	</div>
</Base>

<style>
	.not-found {
		max-width: var(--w-text);
		margin-inline: auto;
		padding: var(--sp-24) var(--gutter);
		text-align: center;
	}

	.not-found__code {
		font-family: var(--font-meta);
		font-size: var(--fs-meta);
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--color-accent);
	}

	.not-found h1 {
		margin-block-start: var(--sp-4);
		font-size: var(--fs-h1);
	}

	.not-found__body {
		margin-block-start: var(--sp-4);
		color: var(--color-ink-soft);
	}

	.not-found__home {
		display: inline-block;
		margin-block-start: var(--sp-8);
		padding: var(--sp-3) var(--sp-6);
		border: 1px solid var(--color-border-interactive);
		border-radius: var(--radius);
		font-family: var(--font-meta);
		font-size: var(--fs-meta);
		font-weight: 600;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--color-ink);
		text-decoration: none;
	}

	.not-found__home:hover {
		background: var(--color-ink);
		border-color: var(--color-ink);
		color: var(--color-surface);
	}
</style>
```

- [ ] **Step 6: Vérifier**

```bash
pnpm typecheck
pnpm test
```

Attendu : les deux passent.

Serveur de dev lancé, visiter `/posts`, une page de rubrique, une page d'étiquette, `/about` et une URL inexistante. Contrôler sur chacune :
- bandeau-titre en version réduite (titre à gauche, recherche à droite) ;
- aucun texte anglais résiduel ;
- un seul `h1` ;
- les grilles s'empilent proprement sous 900 px.

- [ ] **Step 7: Commit**

```bash
git add src/pages/posts/index.astro src/pages/category/\[slug\].astro src/pages/tag/\[slug\].astro src/pages/\[slug\].astro src/pages/404.astro
git commit -m "feat(theme): mise en page des listings, page simple et 404"
```

---

## Task 11: Alignement des plugins TL;DR et glossaire

**Files:**
- Modify: `src/plugins/ai-editorial-assistant/src/astro/TldrBox.astro`
- Modify: `src/plugins/glossary-cards/src/astro/GlossaryStyles.astro`

**Interfaces:**
- Consumes: les tokens de la tâche 1.
- Produces: rien.

Chaque valeur est écrite sous la forme `var(--token, valeur-actuelle)`. Le repli préserve le rendu du plugin utilisé hors de ce thème — les deux plugins sont des paquets `workspace:*` réutilisables, casser leur rendu autonome serait une régression.

- [ ] **Step 1: Aligner `TldrBox.astro`**

Dans le bloc `<style>`, remplacer les trois règles suivantes.

`.ai-tldr` devient :

```css
	.ai-tldr {
		margin: var(--sp-8, 1.5rem) 0;
		padding: var(--sp-4, 1rem) var(--sp-6, 1.25rem);
		border-left: 3px solid currentColor;
		background: var(--color-surface-alt, color-mix(in srgb, currentColor 4%, transparent));
	}
```

`.ai-tldr__title` devient :

```css
	.ai-tldr__title {
		margin: 0 0 var(--sp-2, 0.5rem);
		font-family: var(--font-meta, inherit);
		font-size: var(--fs-caption, 0.8125rem);
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}
```

`.ai-tldr__list` devient :

```css
	.ai-tldr__list {
		margin: 0;
		padding-left: 1.1rem;
		display: flex;
		flex-direction: column;
		gap: var(--sp-2, 0.4rem);
		line-height: 1.5;
	}
```

- [ ] **Step 2: Aligner `GlossaryStyles.astro`**

Dans le bloc `<style is:inline>`, remplacer les règles portant des valeurs en dur.

```css
  .glossary-tooltip {
    position: absolute;
    z-index: 50;
    max-width: 320px;
    padding: var(--sp-3, 12px) var(--sp-4, 14px);
    border-radius: var(--radius, 8px);
    background: var(--color-ink, #1f2937);
    color: var(--color-surface, #f9fafb);
    font-family: var(--font-meta, inherit);
    font-size: var(--fs-caption, 0.875rem);
    line-height: 1.5;
    pointer-events: none;
    opacity: 0;
    transform: translateY(6px);
    transition: opacity 0.15s ease, transform 0.15s ease;
  }
```

La déclaration `box-shadow` est **supprimée**, pas remplacée : la contrainte globale interdit les ombres portées.

```css
  .glossary-tooltip::after {
    content: "";
    position: absolute;
    top: 100%;
    left: 50%;
    margin-left: -6px;
    border-width: 6px;
    border-style: solid;
    border-color: var(--color-ink, #1f2937) transparent transparent transparent;
  }
```

```css
  .glossary-tooltip a {
    color: var(--color-accent-light, #93c5fd);
    text-decoration: underline;
    pointer-events: auto;
  }
```

`--color-accent-light` (`#8fb4d4`) existe précisément pour ce cas : `--color-accent` (`#326891`) sur le fond `--color-ink` (`#121212`) tomberait à 2,6:1, sous le seuil AA. La variante claire atteint 8,1:1.

Le `transition` reste en place : la règle `prefers-reduced-motion` de `theme.css` la neutralise déjà avec `!important`, et ce CSS `is:inline` n'échappe pas à cette règle puisqu'elle cible `*`.

- [ ] **Step 3: Vérifier**

```bash
pnpm typecheck
pnpm test
```

Attendu : les deux passent — la quarantaine de fichiers de tests des plugins ne touche pas au CSS, mais leur passage confirme qu'aucun module n'a été cassé.

Serveur de dev lancé, ouvrir un article contenant un terme de glossaire et un bloc TL;DR :
1. L'infobulle est noire à angles vifs, sans ombre, texte en Inter.
2. Le lien de l'infobulle est bleu clair et lisible.
3. L'encadré TL;DR est sur fond gris clair avec une barre verticale, titre en capitales Inter.

- [ ] **Step 4: Commit**

```bash
git add src/plugins/ai-editorial-assistant/src/astro/TldrBox.astro src/plugins/glossary-cards/src/astro/GlossaryStyles.astro
git commit -m "fix(plugins): aligner l'encadré TL;DR et l'infobulle de glossaire sur les tokens du thème"
```

---

## Task 12: Réécriture de la carte d'article de recherche

**Files:**
- Modify: `src/plugins/research-paper-embed/src/astro/ResearchPaperCard.astro`

**Interfaces:**
- Consumes: les tokens de la tâche 1.
- Produces: rien.

Le composant est écrit intégralement en classes Tailwind alors que Tailwind n'est présent ni dans `node_modules`, ni dans aucun `package.json` du workspace. Ces classes ne résolvent rien : la carte s'affiche aujourd'hui en HTML nu. C'est un défaut de rendu préexistant, pas seulement un écart de thème.

- [ ] **Step 1: Confirmer le diagnostic**

```bash
ls node_modules | grep -i tailwind; echo "code=$?"
grep -rn "tailwind" package.json src/plugins/*/package.json
```

Attendu : aucune sortie de `grep`, `code=1` — Tailwind absent partout. Si Tailwind s'avérait présent, **arrêter** et signaler : le diagnostic de cette tâche serait faux et la réécriture inutile.

- [ ] **Step 2: Remplacer tout le balisage et ajouter le bloc de styles**

Remplacer l'intégralité du template (tout ce qui suit la clôture du frontmatter `---`) par :

Le frontmatter reste **inchangé** : `badge`, `dateLabel`, `hasMetadata`, `authorsLabel` et `abstractPreview` sont tous conservés et réutilisés. Seuls le balisage et les styles changent.

```astro
<article class="paper-card">
	<header class="paper-card__head">
		<span class="paper-card__badge">{badge}</span>
		{dateLabel && <time datetime={value.publishedDate}>{dateLabel}</time>}
	</header>

	{
		hasMetadata ? (
			<h3 class="paper-card__title">
				<a href={value.url} rel="noopener">
					{value.title}
				</a>
			</h3>
		) : (
			<p class="paper-card__fallback">
				Métadonnées non récupérées. <a href={value.url} rel="noopener">Lien direct</a>.
			</p>
		)
	}

	{authorsLabel && <p class="paper-card__authors">{authorsLabel}</p>}

	{
		hasMetadata && abstractPreview && (
			<div class="paper-card__abstract">
				<p>{abstractPreview}</p>
				{value.abstract.length > 200 && (
					<details>
						<summary>Lire la suite</summary>
						<p>{value.abstract}</p>
					</details>
				)}
			</div>
		)
	}

	<footer class="paper-card__actions">
		<a class="paper-card__button" href={value.url} rel="noopener">
			Consulter l'étude
		</a>
		{
			value.pdfUrl && (
				<a
					class="paper-card__button paper-card__button--ghost"
					href={value.pdfUrl}
					rel="noopener"
				>
					PDF
				</a>
			)
		}
	</footer>
</article>

<style>
	.paper-card {
		margin-block: var(--sp-8, 2rem);
		padding: var(--sp-6, 1.5rem);
		border: 1px solid var(--color-rule, #dfdfdf);
		border-block-start: 3px solid var(--color-ink, #121212);
		border-radius: var(--radius, 0);
		background: var(--color-surface, #fff);
	}

	.paper-card__head {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--sp-3, 0.75rem);
		margin-block-end: var(--sp-3, 0.75rem);
	}

	.paper-card__head time {
		font-family: var(--font-meta, inherit);
		font-size: var(--fs-meta, 0.75rem);
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--color-ink-muted, #666);
	}

	.paper-card__badge {
		display: inline-block;
		padding: var(--sp-1, 0.25rem) var(--sp-2, 0.5rem);
		background: var(--color-surface-alt, #f7f7f7);
		font-family: var(--font-meta, inherit);
		font-size: var(--fs-meta, 0.75rem);
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--color-ink-muted, #666);
	}

	.paper-card__title {
		margin: 0 0 var(--sp-2, 0.5rem);
		font-family: var(--font-display, Georgia, serif);
		font-size: var(--fs-h3, 1.3125rem);
		line-height: 1.2;
	}

	.paper-card__title a {
		color: var(--color-ink, #121212);
		text-decoration: none;
	}

	.paper-card__title a:hover {
		color: var(--color-accent, #326891);
		text-decoration: underline;
	}

	.paper-card__fallback,
	.paper-card__authors {
		margin: 0 0 var(--sp-3, 0.75rem);
		font-size: var(--fs-caption, 0.8125rem);
		color: var(--color-ink-muted, #666);
	}

	.paper-card__authors {
		font-style: italic;
	}

	.paper-card__abstract {
		margin-block-end: var(--sp-4, 1rem);
		font-size: var(--fs-caption, 0.8125rem);
		line-height: 1.55;
		color: var(--color-ink-soft, #363636);
	}

	.paper-card__abstract summary {
		cursor: pointer;
		font-family: var(--font-meta, inherit);
		font-size: var(--fs-meta, 0.75rem);
		font-weight: 600;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--color-ink-muted, #666);
	}

	.paper-card__abstract summary:hover {
		color: var(--color-ink, #121212);
	}

	.paper-card__abstract details {
		margin-block-start: var(--sp-2, 0.5rem);
	}

	.paper-card__abstract details p {
		margin-block-start: var(--sp-3, 0.75rem);
	}

	.paper-card__actions {
		display: flex;
		flex-wrap: wrap;
		gap: var(--sp-2, 0.5rem);
	}

	.paper-card__button {
		display: inline-block;
		padding: var(--sp-3, 0.75rem) var(--sp-6, 1.5rem);
		background: var(--color-ink, #121212);
		border-radius: var(--radius, 0);
		font-family: var(--font-meta, inherit);
		font-size: var(--fs-meta, 0.75rem);
		font-weight: 600;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--color-surface, #fff);
		text-decoration: none;
	}

	.paper-card__button:hover {
		background: var(--color-accent, #326891);
	}

	.paper-card__button--ghost {
		background: transparent;
		border: 1px solid var(--color-border-interactive, #8f8f8f);
		color: var(--color-ink, #121212);
	}

	.paper-card__button--ghost:hover {
		background: var(--color-ink, #121212);
		border-color: var(--color-ink, #121212);
		color: var(--color-surface, #fff);
	}
</style>
```

Toutes les variantes `dark:*` disparaissent — le mode sombre est hors périmètre.

Le bouton PDF est conservé : `value.pdfUrl` pointe vers une destination distincte de `value.url`, ce n'est pas un doublon. Il devient la variante bordée `--ghost`, secondaire au bouton plein.

- [ ] **Step 3: Vérifier**

```bash
pnpm typecheck
pnpm test
```

Attendu : les deux passent. Les tests du plugin `research-paper-embed` couvrent l'extraction des métadonnées, pas le rendu — leur passage confirme qu'aucun symbole du frontmatter n'a été cassé.

Serveur de dev lancé, ouvrir un article contenant un bloc d'étude :
1. La carte a un filet fin sur trois côtés et un filet noir épais en haut.
2. Le badge (`arXiv`, `DOI` ou `Manual`) est en capitales Inter sur fond gris clair, la date de publication à côté.
3. Le titre est en Playfair.
4. Le résumé est tronqué à 200 caractères, avec « Lire la suite » qui déplie le texte intégral.
5. Le bouton « Consulter l'étude » est noir à angles vifs et devient bleu au survol ; sur une étude avec `pdfUrl`, un second bouton « PDF » bordé apparaît à côté.
6. Aucun coin arrondi, aucune ombre.

- [ ] **Step 4: Commit**

```bash
git add src/plugins/research-paper-embed/src/astro/ResearchPaperCard.astro
git commit -m "fix(research-paper-embed): remplacer les classes Tailwind non résolues par des styles du thème"
```

---

## Task 13: Audit final

**Files:**
- Modify: tout fichier où l'audit révèle un défaut.

**Interfaces:**
- Consumes: l'ensemble des tâches précédentes.
- Produces: rien.

- [ ] **Step 1: Vérifier l'absence de valeurs en dur**

```bash
grep -rnE "#[0-9a-fA-F]{3,8}\b" src/components/ src/layouts/ src/pages/ src/styles/ --include="*.astro" --include="*.css" | grep -v "src/styles/theme.css"
```

Attendu : **aucune sortie**. Toute occurrence est une violation de la contrainte globale : la remplacer par le token correspondant.

```bash
grep -rn "box-shadow\|border-radius: [1-9]" src/components/ src/pages/ src/layouts/ --include="*.astro"
```

Attendu : une seule sortie, le `box-shadow: inset 0 -2px 0 0` de `SiteHeader.astro`, qui est un soulignement et non une ombre portée.

- [ ] **Step 2: Vérifier qu'il ne reste pas de texte anglais**

```bash
grep -rnE "\b(Posts|Recent|Search|Not Found|Go home|No posts|All Posts|post[s]? yet)\b" src/pages/ src/components/ src/layouts/ --include="*.astro"
```

Attendu : aucune sortie. Les identifiants de collection (`"posts"`, `"pages"`) passés à `getEmDashCollection` sont des slugs techniques et ne comptent pas — s'ils apparaissent, les ignorer.

```bash
grep -rn "en-US\|lang=\"en\"" src/ --include="*.astro" --include="*.ts"
```

Attendu : aucune sortie.

- [ ] **Step 3: Vérifier la hiérarchie de titres sur chaque page**

Serveur de dev lancé, sur chacune des sept pages (`/`, `/posts`, un article, une rubrique, une étiquette, `/about`, une URL inexistante), exécuter dans la console du navigateur :

```js
[...document.querySelectorAll("h1,h2,h3,h4,h5,h6")].map((h) => `${h.tagName} ${h.textContent.trim().slice(0, 40)}`)
```

Attendu sur chaque page : exactement un `H1`, et aucun saut de niveau (jamais un `H4` directement après un `H2`).

- [ ] **Step 4: Vérifier le parcours clavier**

Sur la page d'accueil puis sur un article, naviguer uniquement au clavier :
1. Premier Tab → lien d'évitement visible.
2. Chaque élément focalisé porte un contour bleu de 2 px nettement décalé du texte.
3. Aucune carte n'exige deux tabulations pour un seul article (l'image est retirée de l'ordre de tabulation).
4. Le `<details>` du résumé d'étude s'ouvre à la barre d'espace.

- [ ] **Step 5: Vérifier le rendu compilé**

```bash
pnpm build
```

Attendu : build réussi. Puis :

```bash
grep -rl "font-face" dist/ | head -3
```

Attendu : au moins un fichier CSS compilé contenant les déclarations `@font-face` — confirme que les polices sont bien auto-hébergées et non chargées depuis `fonts.gstatic.com`.

```bash
grep -rn "gstatic\|fonts.googleapis" dist/ | head
```

Attendu : aucune sortie.

- [ ] **Step 6: Passer Lighthouse**

Serveur de prévisualisation lancé (`pnpm preview`), exécuter un audit Lighthouse sur la page d'accueil et sur un article, en mode mobile.

Attendu : Accessibilité ≥ 95, Bonnes pratiques ≥ 95, SEO ≥ 95. Corriger tout point signalé avant de clore la tâche. Si Performance passe sous 90, contrôler en priorité le décalage cumulé de mise en page sur l'image d'ouverture et le nombre de fichiers de police préchargés.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "fix(theme): corrections issues de l'audit accessibilité et performance"
```

S'il n'y a rien à corriger, ne pas produire de commit vide — passer directement à la clôture.

---

## Vérification finale

```bash
pnpm typecheck
pnpm test
pnpm build
```

Les trois doivent passer. Le thème est alors complet sur les sept pages et les trois blocs éditoriaux de plugin.
