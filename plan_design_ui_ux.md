# Plan design UI/UX — Thème journalistique Cannelle News

Date : 2026-08-04
Statut : validé, prêt pour implémentation

## 1. Vision

Thème éditorial dense inspiré des grands médias en ligne (Le Monde, Libération), avec une identité propre : palette en espace colorimétrique **OKLCH**, accent **vert éditorial**, typographie mixte serif/sans-serif. Pas de dark mode dans cette itération.

Références de style :
- **Densité** : proche du New York Times — beaucoup d'articles visibles dès le fold, hiérarchie visuelle forte par la taille des titres et le poids typographique.
- **Ton graphique** : proche de Le Monde / Libération — mélange serif (titres) / sans-serif (UI, méta), usage d'un accent couleur marqué pour structurer les rubriques.

## 2. Design tokens

### 2.1 Couleurs (OKLCH)

| Rôle | Token | Valeur OKLCH | Usage |
|---|---|---|---|
| Fond principal | `--color-bg` | `oklch(98% 0.008 90)` | fond de page, blanc cassé chaud |
| Fond alterné | `--color-bg-alt` | `oklch(96% 0.01 90)` | sections alternées, cards |
| Texte principal | `--color-text` | `oklch(22% 0 0)` | corps de texte, titres |
| Texte secondaire | `--color-text-muted` | `oklch(45% 0.005 90)` | méta, dates, légendes |
| Bordure/divider | `--color-border` | `oklch(85% 0.01 90)` | séparateurs, cadres |
| Accent principal | `--color-accent` | `oklch(48% 0.13 150)` | liens, boutons, éléments actifs |
| Accent clair | `--color-accent-light` | `oklch(88% 0.05 150)` | fonds de badges, hover léger |
| Accent foncé | `--color-accent-dark` | `oklch(38% 0.13 150)` | hover sur boutons/liens |
| Erreur/urgent | `--color-alert` | `oklch(52% 0.19 25)` | badge "dernière minute" |

Ces tokens sont déclarés en variables CSS natives (`:root`) et repris dans la config Tailwind via `theme.extend.colors` (fonction `oklch()` supportée nativement en CSS moderne, fallback géré par Tailwind v4).

### 2.2 Typographie

- **Titres (headlines)** : police serif éditoriale — `"Source Serif 4"` ou `"Georgia"` en fallback système, pas de dépendance Google Fonts obligatoire (auto-hébergement recommandé pour perf/RGPD).
- **Corps / UI** : sans-serif — `"Inter"` ou `"Helvetica Neue"` en fallback.
- Échelle typographique (rem, base 16px) :
  - `--text-hero`: 3.5rem / 1.05 (titre à la une)
  - `--text-h1`: 2.25rem / 1.1
  - `--text-h2`: 1.5rem / 1.2
  - `--text-h3`: 1.125rem / 1.3
  - `--text-body`: 1rem / 1.6
  - `--text-meta`: 0.8125rem / 1.4, uppercase, letter-spacing léger

### 2.3 Espacement & grille

- Grille conteneur principale : max-width `1280px`, colonnes 12 en desktop (Tailwind grid).
- Rythme vertical : échelle `4px` (tokens Tailwind par défaut suffisent, pas de surcouche custom).

## 3. Inventaire des composants

Nouveaux composants Astro dans `src/components/` :

| Composant | Rôle |
|---|---|
| `Header.astro` | Masthead (logo/titre site), nav principale, barre recherche (`LiveSearch` existant) |
| `Footer.astro` | Liens, widget area, mentions légales |
| `ArticleCard.astro` | Carte article, 3 variantes via prop `variant`: `hero` (grand format image + titre large), `standard` (image + titre + chapô), `compact` (liste texte seule) |
| `CategoryBadge.astro` | Badge rubrique coloré (accent vert par défaut, extensible par rubrique) |
| `ArticleHeader.astro` | En-tête article : catégorie, titre serif large, chapô, byline, date, image de une |
| `Byline.astro` | Auteur + date + temps de lecture |
| `RelatedArticles.astro` | Bloc "à lire aussi" en fin d'article |
| `Breadcrumb.astro` | Fil d'ariane (catégorie > article) |

Composants existants réutilisés tels quels : `LiveSearch` (emdash/ui), `WidgetArea`, `EmDashHead/BodyStart/BodyEnd`.

## 4. Layouts par page

### 4.1 `index.astro` (accueil)
- Bandeau "à la une" : 1 article hero (grande image + titre `--text-hero`) + 2-3 articles secondaires en colonne latérale (variant `standard`).
- Sections par rubrique en dessous : titre de section + grille 3-4 colonnes d'`ArticleCard` (`standard`/`compact` mélangés pour créer une hiérarchie dense façon NYT).
- Pas de sidebar permanente sur la home (contrairement à l'article).

### 4.2 `posts/[slug].astro` (article)
- `ArticleHeader` en pleine largeur (catégorie, titre, chapô, byline, image de une).
- Corps en 2 colonnes desktop : texte (colonne principale ~70%) + sidebar (~30%) avec sommaire (ancres H2/H3) et liens internes (plugin `auto-internal-linker` déjà en place).
- `RelatedArticles` en pied de page.
- Intégration existante à préserver : glossary tooltips (`glossary-cards`), JSON-LD SEO (`seo-pro`, `research-paper-embed` si applicable).

### 4.3 `posts/index.astro` (liste chronologique)
- Liste verticale d'`ArticleCard` variant `compact`/`standard`, pagination simple.

### 4.4 `category/[slug].astro`
- En-tête rubrique avec `CategoryBadge` en grand + description.
- Grille d'articles filtrés, même logique que sections home.

### 4.5 `tag/[slug].astro`
- Liste simple, réutilise layout `posts/index.astro`.

### 4.6 `glossaire/index.astro`
- Grille de termes (composant déjà existant côté plugin `glossary-cards`), habillage visuel aligné sur les nouveaux tokens.

### 4.7 `[slug].astro` (page statique) et `404.astro`
- Layout simple centré, typographie cohérente avec le reste du thème.

## 5. Stack technique

- **Ajout** : Tailwind CSS (`@astrojs/tailwind` ou intégration Tailwind v4 native Vite) comme nouvelle dépendance.
- `src/styles/tokens.css` : déclaration des design tokens (`:root { --color-bg: oklch(...); ... }`), importé globalement dans `Base.astro`.
- `tailwind.config.ts` (ou config CSS-first Tailwind v4 dans `tokens.css` via `@theme`) : mapping des tokens vers les classes utilitaires (`bg-accent`, `text-muted`, etc.).
- `Base.astro` : refactorisé pour utiliser `Header.astro` / `Footer.astro` au lieu du HTML inline actuel, tout en conservant les hooks emdash (`EmDashHead`, `EmDashBodyStart/End`, `WidgetArea`, `createPublicPageContext`).
- Aucun changement requis côté plugins (`auto-internal-linker`, `glossary-cards`, `research-paper-embed`, `seo-pro`, `ai-editorial-assistant`) — le thème consomme leurs sorties existantes (routes, composants) sans toucher à leur logique.

## 6. Ordre d'implémentation

1. Setup Tailwind + `tokens.css` (design tokens OKLCH, config Tailwind).
2. `Header.astro` + `Footer.astro`, refactor `Base.astro`.
3. `ArticleCard.astro` (3 variantes) + `CategoryBadge.astro`.
4. Page d'accueil (`index.astro`) avec sections par rubrique.
5. `ArticleHeader.astro` + `Byline.astro` + `RelatedArticles.astro` + `Breadcrumb.astro` → page article (`posts/[slug].astro`).
6. `category/[slug].astro` et `tag/[slug].astro`.
7. `glossaire/index.astro` (habillage visuel).
8. `posts/index.astro`, `[slug].astro`, `404.astro`.
9. Passe responsive (mobile/tablette) sur l'ensemble.

## 7. Hors périmètre (cette itération)

- Dark mode.
- Refonte des plugins existants (admin UI, logique métier).
- Système de rubriques multi-couleurs avancé (une seule teinte accent pour l'instant, extensible plus tard).
