# Plan de design UI/UX — thème journalistique

**Projet** : cannelle-news (EmDash + Astro 7 + Cloudflare)
**Date** : 4 août 2026
**Statut** : spécification validée, prête pour plan d'implémentation

---

## 1. Intention

Habiller le site d'un thème de presse en ligne dans la lignée du *New York Times* : sérif de titraille, noir et blanc quasi total, un seul accent, densité forte, filets fins entre les colonnes.

Le template EmDash de départ est délibérément nu — pas de `theme.css`, tableau `fonts:` vide, `Base.astro` sans styles, pages en HTML brut. Le travail consiste donc à **ajouter** une couche de design, pas à en remplacer une.

Trois blocs éditoriaux issus des plugins déjà installés font partie intégrante du thème et ne peuvent pas être traités après coup :

- l'encadré TL;DR (`ai-editorial-assistant`),
- le terme de glossaire avec infobulle (`glossary-cards`),
- la carte d'article de recherche (`research-paper-embed`).

### Décisions de cadrage

| Sujet | Décision |
|---|---|
| Référence esthétique | *New York Times* — sérif classique |
| Portée | Thème complet, toutes les pages |
| Typographie | Playfair Display + Source Serif 4 + Inter |
| Langue | Passage du site en français |
| Schéma | Ajout des champs `kicker` et `dek` sur `posts` |
| Mode sombre | **Non** |
| Temps de lecture | **Non** |

### Architecture retenue

**Tokens globaux + composants Astro stylés.**

`src/styles/theme.css` ne contient que les tokens et le reset éditorial. Toute la mise en forme vit dans `src/components/`, chaque composant portant son `<style>` scoped qui consomme les tokens. Les pages composent, elles ne stylent presque plus.

Alternatives écartées :

- *Tout dans `theme.css` + `<style>` par page* — la carte d'article apparaît sur cinq pages ; son CSS serait dupliqué cinq fois, ou remonté en global, et `theme.css` deviendrait un fourre-tout.
- *Tailwind ou bibliothèque externe* — déconseillé par `AGENTS.md`, et un thème de presse repose sur une échelle typographique sur mesure : l'échelle par défaut serait entièrement à réécrire. Aucun gain.

---

## 2. Fondations

### 2.1 Couleurs

Définies sur `:root` dans `src/styles/theme.css` — **pas** dans un `<style>` scoped Astro, dont les sélecteurs sont hachés : le CSS `is:inline` des plugins doit pouvoir lire ces variables.

| Token | Valeur | Usage | Contraste sur blanc |
|---|---|---|---|
| `--color-ink` | `#121212` | corps, titres | 18,8:1 |
| `--color-ink-soft` | `#363636` | chapeau (dek) | 11,6:1 |
| `--color-ink-muted` | `#666666` | méta, légendes | 5,7:1 ✓ AA |
| `--color-accent` | `#326891` | liens | 5,5:1 ✓ AA |
| `--color-accent-hover` | `#1d4b70` | survol | — |
| `--color-accent-light` | `#8fb4d4` | liens sur fond sombre (infobulle) | 8,1:1 sur `--color-ink` ✓ AA |
| `--color-surface` | `#ffffff` | fond | — |
| `--color-surface-alt` | `#f7f7f7` | encadré TL;DR | — |
| `--color-rule` | `#dfdfdf` | filets décoratifs | décoratif |
| `--color-border-interactive` | `#8f8f8f` | champ de recherche, boutons | 3,2:1 ✓ WCAG 1.4.11 |

**Deux gris de filet, volontairement.** `#dfdfdf` sépare les colonnes : purement décoratif, exempté des règles de contraste. `#8f8f8f` borde les éléments interactifs, qui doivent tenir 3:1. Un gris unique ferait échouer l'un ou l'autre.

```css
--radius: 0;
```

Aucun coin arrondi, aucune ombre portée nulle part. C'est ce qui sépare visuellement un thème de presse d'un thème SaaS — et c'est le premier token que les plugins violent aujourd'hui (voir §5).

### 2.2 Typographie

Trois familles, servies par l'API Fonts d'Astro (self-hosting, aucune requête vers Google au runtime).

```js
// astro.config.mjs
import { fontProviders } from "astro/config";

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
]
```

`latin-ext` est requis : le français a besoin de `œ`, `Ÿ` et des capitales accentuées pour la titraille en majuscules.

Chaque famille doit être déclarée dans le `<head>` de `Base.astro` :

```astro
import { Font } from "astro:assets";
...
<Font cssVariable="--font-body" preload />
<Font cssVariable="--font-display" />
<Font cssVariable="--font-meta" />
```

Le composant `Font` émet lui-même le `<style>` contenant les `@font-face`. L'omettre échoue au build avec `FontFamilyNotFound` plutôt que silencieusement — garde-fou utile.

**Un seul preload**, sur le corps de texte. Précharger les six fichiers saturerait la file de requêtes critiques et retarderait le LCP qu'ils sont censés servir.

### 2.3 Échelle typographique

Fluide en `clamp()`, bornes en pixels indiquées pour référence.

| Token | Valeur | Usage |
|---|---|---|
| `--fs-display` | `clamp(2.25rem, 1.6rem + 3.2vw, 3.75rem)` | 36 → 60 px — titre de une |
| `--fs-h1` | `clamp(2rem, 1.5rem + 2.2vw, 3rem)` | 32 → 48 px — titre d'article |
| `--fs-h2` | `1.75rem` | 28 px — titre de section |
| `--fs-h3` | `1.3125rem` | 21 px — intertitre |
| `--fs-card-lead` | `1.5rem` | 24 px |
| `--fs-card` | `1.125rem` | 18 px |
| `--fs-body` | `1.125rem` | 18 px, interligne 1,65 |
| `--fs-dek` | `1.125rem` | chapeau |
| `--fs-meta` | `0.75rem` | 12 px, Inter 600, capitales, `letter-spacing: .08em` |
| `--fs-caption` | `0.8125rem` | 13 px — légendes |

Interlignes : `--lh-display: 1.05`, `--lh-title: 1.15`, `--lh-body: 1.65`, `--lh-meta: 1.3`.

### 2.4 Espacement et largeurs

Échelle de 4 px : `--sp-1` .25rem, `--sp-2` .5rem, `--sp-3` .75rem, `--sp-4` 1rem, `--sp-6` 1.5rem, `--sp-8` 2rem, `--sp-12` 3rem, `--sp-16` 4rem, `--sp-24` 6rem.

| Token | Valeur | Rôle |
|---|---|---|
| `--w-page` | `1200px` | largeur maximale de page |
| `--w-wide` | `945px` | sortie de colonne large (images d'ouverture) |
| `--w-text` | `660px` | colonne de lecture |
| `--gutter` | `clamp(1rem, 4vw, 2.5rem)` | marge latérale |

Points de rupture : 600 px, 900 px, 1200 px.

### 2.5 Schéma de contenu

Ajout de deux champs optionnels sur la collection `posts` dans `seed/seed.json` :

- `kicker` — *string*, surtitre de rubrique libre (« ENQUÊTE », « ANALYSE »). À défaut, on retombe sur la première catégorie de l'entrée.
- `dek` — *text*, chapeau éditorial, distinct de `excerpt` qui reste dédié au SEO et aux cartes.

Ajouts purement additifs : aucune migration destructive.

`emdash-env.d.ts` étant régénéré au démarrage du dev server, `astro check` échouera sur une base pas encore migrée. Le dépôt porte déjà le contournement pour `tldr` dans `src/pages/posts/[slug].astro` — accès élargi via `Record<string, unknown>` avec validation à l'exécution. On applique le même patron pour `kicker` et `dek`, puis on le retire une fois `npx emdash types` passé.

### 2.6 Passage en français

- `lang="fr"` sur `<html>` dans `Base.astro`.
- Dates en `fr-FR`, format `{ day: "numeric", month: "long", year: "numeric" }` → « 4 août 2026 ». Trois emplacements aujourd'hui en `en-US` : `src/pages/index.astro`, `src/pages/posts/[slug].astro`, et les listings de catégorie/tag.
- Libellés d'interface traduits : « Articles récents », « Rechercher… », « À lire ensuite », « Aucun article pour le moment », textes de la page 404.

---

## 3. Grilles

### 3.1 Grille de listing à filets

Les filets verticaux entre colonnes sont la signature visuelle, davantage que les cartes elles-mêmes.

```css
.card-grid {
  display: grid;
  grid-template-columns: repeat(var(--cols, 3), 1fr);
  column-gap: 0;                              /* le filet occupe la gouttière */
  margin-inline: calc(var(--sp-6) / -2);      /* annule le padding des colonnes de bord */
}
.card-grid > * { padding-inline: calc(var(--sp-6) / 2); }
.card-grid > * + * { border-inline-start: 1px solid var(--color-rule); }

@media (max-width: 900px) {
  .card-grid { --cols: 1; margin-inline: 0; }
  .card-grid > * { padding-inline: 0; }
  .card-grid > * + * {
    border-inline-start: 0;                   /* sinon filet orphelin à gauche */
    border-block-start: 1px solid var(--color-rule);
    padding-block-start: var(--sp-6);
  }
}
```

`column-gap: 0` avec le padding réparti de part et d'autre est ce qui fait tomber le filet exactement au milieu de la gouttière. Avec `gap` + `border`, le filet colle au bord de la carte suivante et le désalignement se voit.

La bascule `border-inline-start: 0` en mobile n'est pas optionnelle : sans elle, chaque carte empilée garde un filet vertical orphelin sur son flanc gauche.

### 3.2 Grille d'article à sorties de colonne

Le corps se lit sur 660 px, mais l'image d'ouverture et les blocs plugin doivent pouvoir déborder.

```css
.prose {
  display: grid;
  grid-template-columns:
    [full-start] minmax(var(--gutter), 1fr)
    [wide-start] minmax(0, calc((var(--w-wide) - var(--w-text)) / 2))
    [text-start] min(100% - var(--gutter) * 2, var(--w-text)) [text-end]
    minmax(0, calc((var(--w-wide) - var(--w-text)) / 2)) [wide-end]
    minmax(var(--gutter), 1fr) [full-end];
}
.prose > *        { grid-column: text; }
.prose > .is-wide { grid-column: wide; }
.prose > .is-full { grid-column: full; }
```

Les paires `[text-start]` / `[text-end]` créent implicitement la zone nommée `text`, d'où `grid-column: text` sans avoir à compter les lignes — les indices n'ont pas à être recalculés quand une colonne est ajoutée.

---

## 4. Composants

Onze composants dans `src/components/`, chacun avec son `<style>` scoped consommant les tokens. **Aucune valeur hexadécimale ni taille en dur dans un composant** — c'est la règle qui empêche l'architecture de se déliter.

| Composant | Props notables | Rôle |
|---|---|---|
| `SiteHeader.astro` | `compact?: boolean` | Bandeau-titre centré, filet, nav de rubriques depuis `getMenu("primary")`, `LiveSearch`. Version réduite hors accueil. |
| `SiteFooter.astro` | — | Rend `WidgetArea name="sidebar"` en colonnes |
| `SectionHeading.astro` | `label`, `href?` | Filet pleine largeur + libellé Inter capitales |
| `CardGrid.astro` | `columns: 1..4` | La grille à filets du §3.1 |
| `ArticleCard.astro` | `post`, `variant`, `headingLevel: 2\|3` | `variant: "lead" \| "standard" \| "compact" \| "list"` |
| `ArticleHeader.astro` | `post` | Kicker, `h1`, dek, byline, date, image d'ouverture + légende |
| `Byline.astro` | `bylines` | Lit `post.data.bylines` (`ContentBylineCredit[]`) → « Par A. Tak et B. Doe » |
| `Kicker.astro` | `label`, `href?` | Rubrique en capitales, lien vers `/category/[slug]` |
| `MetaLine.astro` | `date`, `items?` | Date `fr-FR`, séparateurs `·` |
| `TagList.astro` | `tags` | Puces à filet — pas de pilules arrondies |
| `Prose.astro` | `blocks` | Enveloppe `PortableText`, porte la grille du §3.2 |

**`headingLevel` sur `ArticleCard` n'est pas cosmétique.** La même carte apparaît sous un `h1` en accueil et sous un `h2` de rubrique. Sans cette prop, la hiérarchie de titres est cassée sur toutes les pages de listing — échec WCAG 1.3.1, et première chose que remonte un audit automatisé.

### Styles éditoriaux dans `Prose`

Portés par `theme.css` sur les descendants de `.prose` : paragraphes en `--fs-body`, intertitres `h2`/`h3` en Playfair, citations en sérif large avec barre verticale 3 px `--color-ink` (pas de guillemets décoratifs), listes à puces carrées, figures avec légende en `--fs-caption` / `--color-ink-muted`, liens soulignés en `--color-accent`.

---

## 5. Réconciliation des plugins

Trois plugins, trois états différents, trois traitements distincts.

### 5.1 `ai-editorial-assistant` — `TldrBox.astro`

Déjà sain : `<style>` scoped, `currentColor`, `color-mix`, capitales à `letter-spacing: .08em`. Il tombe déjà sur le style de méta retenu.

Action : substituer `var(--fs-caption, .8125rem)` à la taille en dur et `var(--font-meta, inherit)` à la police du titre. Environ quatre lignes.

### 5.2 `glossary-cards` — `GlossaryStyles.astro`

Injecte du CSS `is:inline` avec des valeurs en dur : `background: #1f2937`, `color: #f9fafb`, liens `#93c5fd`, `border-radius: 8px`, `box-shadow: 0 10px 25px -5px rgba(0,0,0,.25)`.

`is:inline` désactive le traitement Astro : ni scoping, ni bundling, ni ordre garanti vis-à-vis de `theme.css`. Chercher à surcharger depuis le thème par spécificité est fragile.

Action : réécrire chaque valeur en `var(--token, valeur-actuelle)`. Le fallback préserve le rendu du plugin utilisé hors de ce thème, tandis que le thème reprend la main quand les tokens existent. Cibles : fond de l'infobulle en `--color-ink`, texte en `--color-surface`, liens en une variante claire de l'accent, rayon en `--radius`, ombre supprimée.

### 5.3 `research-paper-embed` — `ResearchPaperCard.astro`

**Cassé aujourd'hui.** Le composant est écrit intégralement en classes Tailwind (`rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 …`) alors que Tailwind n'est présent ni dans `node_modules`, ni dans aucun `package.json` du workspace. Ces classes ne résolvent rien : la carte s'affiche en HTML nu. Ce n'est pas un écart de thème, c'est un défaut de rendu préexistant.

Action : réécriture complète en `<style>` scoped Astro — encadré à filet `--color-rule`, badge « ÉTUDE » en Inter capitales sur `--color-surface-alt`, titre en Playfair, auteurs en italique `--color-ink-muted`, résumé en `--fs-caption`, boutons à filet `--color-border-interactive`, `--radius: 0`.

Les variantes `dark:*` disparaissent au passage : le mode sombre est hors périmètre, elles ne servaient rien.

---

## 6. Mise en page des pages

| Page | Fichier | Composition |
|---|---|---|
| Accueil | `src/pages/index.astro` | `posts[0]` en `lead` sur 8 colonnes ; `WidgetArea sidebar` sur 4 colonnes avec filet vertical ; puis `posts[1..3]` en `CardGrid columns=3` variante `standard` ; puis le reste en `columns=4` variante `compact` |
| Tous les articles | `src/pages/posts/index.astro` | `SectionHeading` « Tous les articles » + `CardGrid columns=3` |
| Article | `src/pages/posts/[slug].astro` | `ArticleHeader` en sortie `wide`, `Prose`, `TagList`, « À lire ensuite » en `CardGrid columns=3` |
| Catégorie | `src/pages/category/[slug].astro` | En-tête de rubrique (nom + nombre d'articles) + `CardGrid columns=3` |
| Tag | `src/pages/tag/[slug].astro` | Idem catégorie |
| Page | `src/pages/[slug].astro` | Colonne `--w-text` seule, sans rail |
| 404 | `src/pages/404.astro` | Colonne texte centrée, retour à l'accueil |

L'accueil est piloté par la date de publication, pas par les rubriques : le seed ne garantit aucune rubrique peuplée.

Le rail de l'accueil réutilise les widgets `core:recent-posts` et `core:categories` déjà déclarés dans `seed/seed.json` — on les restyle plutôt que d'en écrire de nouveaux.

**Pas de pagination.** Aucune n'existe aujourd'hui et rien n'indique un volume qui la justifie. À ajouter le jour où un listing dépasse une cinquantaine d'entrées.

---

## 7. Accessibilité

Critères vérifiables, pas déclaratifs.

- **Lien d'évitement** vers `<main>`, visible au focus uniquement.
- **`:focus-visible`** : contour 2 px `--color-accent`, `outline-offset: 2px`. Jamais `outline: none` sans remplaçant.
- **Hiérarchie de titres** : un seul `h1` par page ; `ArticleCard` reçoit son niveau par prop.
- **`aria-current="page"`** sur la rubrique active du menu.
- **Cibles tactiles ≥ 44 px** dans la navigation — obtenues par padding vertical, pas par la taille de police.
- **`prefers-reduced-motion: reduce`** neutralise les transitions de l'infobulle de glossaire.
- **Contrastes** : voir le tableau du §2.1, tous calculés et conformes AA.

---

## 8. Performance

- Un seul `preload` de police, sur `--font-body`.
- `fallbacks` renseignés par famille pour limiter le décalage de métriques au moment du swap.
- `<Image>` d'`emdash/ui` partout — déjà le cas ; `layout: "constrained"` est déjà configuré dans `astro.config.mjs`.
- Aucune ombre portée ni filtre : rien qui déclenche une couche de composition supplémentaire.

---

## 9. Phases

Chaque phase est livrable seule et vérifiée avant la suivante.

| # | Phase | Contenu |
|---|---|---|
| 1 | Fondations | `src/styles/theme.css`, `fonts:` dans `astro.config.mjs` + `<Font>` dans `Base.astro`, champs `kicker`/`dek` au seed, passage en français |
| 2 | Coque | `Base.astro`, `SiteHeader`, `SiteFooter`, lien d'évitement |
| 3 | Composants | Les neuf composants restants, dont `CardGrid` et ses filets |
| 4 | Page article | `ArticleHeader`, `Prose`, grille à sorties de colonne, « À lire ensuite » |
| 5 | Listings | Accueil, `/posts`, catégorie, tag, 404 |
| 6 | Plugins | Les trois réconciliations du §5 |
| 7 | Audit | Contrastes, hiérarchie de titres, parcours clavier, Lighthouse |

### Vérification

À chaque phase, les deux commandes doivent passer avant de déclarer la phase terminée :

```bash
pnpm typecheck   # astro check
pnpm test        # vitest
```

La phase 6 touche des plugins couverts par une quarantaine de fichiers de tests — `pnpm test` y est particulièrement significatif.

---

## 10. Hors périmètre

Explicitement écartés de ce plan.

- **Mode sombre.** Doublerait chaque token de couleur et imposerait de revalider les trois plugins.
- **Temps de lecture.**
- **Pagination des listings.**
- **Espaces fines insécables** avant `: ; ! ?` et guillemets `« »`. Le CSS ne peut pas les produire ; cela demanderait une transformation serveur du Portable Text. À traiter séparément le cas échéant.
