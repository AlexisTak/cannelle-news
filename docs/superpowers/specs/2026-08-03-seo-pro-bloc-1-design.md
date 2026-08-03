# EmDash SEO Pro — Bloc 1 : Moteur d'analyse + Dashboard SEO + Audit

Date : 2026-08-03  
Statut : design validé, en attente d'implémentation  
Auteur(s) : Claude (développeur senior TypeScript)  

## 1. Contexte et objectif

Le site Cannelle News est un site de journalisme spécialisé dans l'intelligence artificielle, la recherche scientifique, la cybersécurité, les arnaques du web et l'open source. Il est bâti sur EmDash CMS (Astro + React admin + Cloudflare). Le plugin existant `@cannelle/plugin-research-paper-embed` a établi le pattern de plugin natif source-only utilisé dans le workspace.

Le cahier des charges initial décrit 7 sous-systèmes SEO. Ce document couvre le **Bloc 1** : le moteur d'analyse, le dashboard SEO et l'audit qualité. Les sous-systèmes publics (métadonnées, JSON-LD, sitemaps) et les sous-systèmes lourds (redirections 410, crawler de liens cassés, détection de contenu dupliqué, IA générative) seront traités dans des blocs ultérieurs.

### Pourquoi ce découpage ?

- Le dashboard et l'audit consomment **les mêmes métriques**. Il est critique de ne pas les implémenter deux fois.
- Le moteur d'analyse est la **fondation** des blocs suivants : IA (suggestions de mots-clés), génération de meta description, sitemap priorisé, etc.
- Les vérifications lourdes (liens cassés, duplicata) demandent du réseau arbitraire, un `cron`, du stockage et une empreinte de similarité : c'est un projet à part entière.

## 2. Portée

### Inclus dans le Bloc 1

Dashboard SEO affichant :

- SEO Score (/100)  
- Lisibilité (score et formule utilisée)  
- Longueur idéale (mots, avec plage recommandée)  
- Temps de lecture  
- Nombre de mots  
- Densité des mots-clés  
- Nombre de liens internes  
- Nombre de liens externes  
- Images sans ALT  
- Balises H2/H3 manquantes  

Métadonnées analysées (vérification, pas encore génération automatique) :

- Title trop long / trop court  
- Meta Description trop courte / trop longue  
- Canonical manquant  
- Keyword stuffing  

### Exclu du Bloc 1 (reporté aux blocs ultérieurs)

- Génération automatique de title, meta description, canonical, robots, OpenGraph, Twitter Card  
- Prévisualisations Google / Facebook / LinkedIn  
- JSON-LD (Article, NewsArticle, TechArticle, FAQ, Breadcrumb, Organization, Person, WebSite, SearchAction)  
- `sitemap.xml`, `news-sitemap.xml`, `image-sitemap.xml`, `robots.txt`  
- Redirections 301, 302, 410  
- IA (génération titre/meta, suggestions mots-clés, intentions de recherche, sujets connexes)  
- Liens cassés (crawler réseau)  
- Contenu dupliqué (similarité inter-articles)  

## 3. Contraintes

- **Plugin natif source-only** : le package compile via Vite/Astro, pas de build séparé (`dist/`).  
- **Zero dépendance runtime supplémentaire** : on réutilise `zod` et les peers existantes (`emdash`, `react`).  
- **UI admin avec `@emdash-cms/admin`** : pas de shadcn/ui, de Radix supplémentaire ni de Tailwind reset. Les composants visuels (jauge, barres) sont en CSS Modules scopés.  
- **Clean Architecture / SOLID** : le moteur est indépendant d'EmDash.  
- **Tests** : vitest, avec un `createMockCtx()` réutilisable.  
- **Français dominant** : la lisibilité utilise la formule Kandel & Moles adaptée au français, avec fallback Flesch pour l'anglais.  

## 4. Architecture

### 4.1 Structure du package

```text
src/plugins/seo-pro/
├── package.json
├── tsconfig.json
├── README.md
└── src/
    ├── index.ts                    # descriptor + definePlugin (composition root)
    ├── admin.tsx                   # map pages/widgets
    │
    ├── domain/                     # PUR : zero import externe
    │   ├── document.ts             # SeoDocument, ContentBlock, LinkRef, ImageRef
    │   ├── report.ts               # SeoReport, Metric, Issue, Severity
    │   ├── scoring.ts              # agrégation du score global
    │   └── rules/
    │       ├── rule.ts             # interface SeoRule
    │       ├── index.ts            # registre des règles
    │       ├── title-length.ts
    │       ├── meta-description.ts
    │       ├── content-length.ts
    │       ├── keyword-density.ts
    │       ├── readability.ts
    │       ├── heading-structure.ts
    │       ├── image-alt.ts
    │       ├── link-balance.ts
    │       └── canonical.ts
    │
    ├── analysis/                   # orchestration pure
    │   ├── analyze.ts              # analyze(doc, config, engineVersion)
    │   ├── config.ts               # SeoConfig, défauts, merge
    │   ├── readability/
    │   │   ├── formula.ts
    │   │   ├── flesch-en.ts
    │   │   ├── kandel-moles-fr.ts
    │   │   ├── syllables.ts
    │   │   └── detect-language.ts
    │   ├── keywords/
    │   │   ├── extract.ts
    │   │   ├── normalize.ts
    │   │   ├── stopwords.fr.ts
    │   │   └── stopwords.en.ts
    │   └── reading-time.ts
    │
    ├── content/                    # adaptateur entrée
    │   ├── portable-text.ts        # Portable Text → SeoDocument
    │   └── link-classifier.ts      # interne vs externe
    │
    ├── ports/                      # interfaces (DIP)
    │   ├── report-store.ts
    │   └── config.ts
    │
    ├── infrastructure/             # adaptateurs EmDash
    │   ├── storage-report-store.ts
    │   ├── kv-config.ts
    │   └── content-loader.ts
    │
    ├── routes/
    │   ├── analyze.ts
    │   ├── reports.ts
    │   ├── report.ts
    │   └── focus-keyword.ts
    │
    └── ui/
        ├── pages/
        │   ├── DashboardPage.tsx
        │   ├── EntryReportPage.tsx
        │   └── SettingsPage.tsx
        ├── widgets/
        │   └── SeoOverviewWidget.tsx
        ├── components/
        │   ├── ScoreGauge.tsx
        │   ├── MetricCard.tsx
        │   ├── IssueList.tsx
        │   ├── KeywordDensityBar.tsx
        │   └── PageShell.tsx
        └── styles/
            └── *.module.css
```

### 4.2 Règle de dépendances

```text
domain/
  ↑
analysis/        content/        ports/
  ↑               ↑               ↑
  └───────────────┴───────────────┘
                  ↑
          infrastructure/
                  ↑
              routes/
              ui/
                  ↑
              index.ts
```

Seul `index.ts` importe `emdash` / `definePlugin` et câble les adaptateurs. Les tests unitaires du moteur ne connaissent pas EmDash.

### 4.3 Modèle de données

```ts
// domain/document.ts
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
```

```ts
// domain/report.ts
export type Severity = "error" | "warning" | "info";
export type Grade = "good" | "ok" | "poor";

export interface SeoReport {
  entryId: string;
  collection: string;
  locale: string | null;
  analyzedAt: string;
  engineVersion: string;
  score: number;
  grade: Grade;
  focusKeyword: string | null;
  focusKeywordSource: "manual" | "auto";
  suggestedKeywords: string[];
  metrics: SeoMetrics;
  issues: Issue[];
}

export interface SeoMetrics {
  wordCount: number;
  readingTimeMinutes: number;
  readability: {
    score: number;
    formula: "flesch-en" | "kandel-moles-fr";
    grade: string;
  };
  contentLength: {
    chars: number;
    words: number;
    verdict: "short" | "ideal" | "long";
  };
  keywordDensity: number;
  keywordOccurrences: number;
  internalLinks: number;
  externalLinks: number;
  imagesTotal: number;
  imagesWithoutAlt: number;
  h2Count: number;
  h3Count: number;
}

export interface Issue {
  ruleId: string;
  severity: Severity;
  message: string;
  help?: string;
  weight: number;
}
```

### 4.4 Stockage

Plugin storage :

```ts
storage: {
  reports: {
    indexes: [
      "collection",
      "score",
      "analyzedAt",
      ["collection", "score"],
    ],
  },
}
```

- Clé = `entryId` (identifiant base de données, ULID).  
- Valeur = `SeoReport`.  
- Un rapport par entrée, écrasé à chaque `content:afterSave`.  

KV (données éditoriales) :

- `settings:rules` — configuration des seuils/poids.  
- `focus:<entryId>` — mot-clé focus manuel (`string | null`).  

`focus:<entryId>` est dans KV et pas dans storage car c'est une saisie humaine qui doit survivre aux recalculs et aux purges de rapports.

## 5. Moteur d'analyse

### 5.1 Interface d'une règle

```ts
// domain/rules/rule.ts
export interface SeoRule<TConfig = unknown> {
  id: string;
  label: string;
  defaultConfig: TConfig;
  analyze(doc: SeoDocument, config: TConfig, env: RuleEnv): RuleResult;
}

export interface RuleEnv {
  focusKeyword: string | null;
}

export interface RuleResult {
  score: number;      // 0-100
  metrics?: Record<string, unknown>;
  issues: Issue[];
}
```

### 5.2 Registre et agrégation

`domain/rules/index.ts` expose le tableau ordonné des règles avec leurs poids par défaut :

| Règle | Poids | Idéal affiché |
|---|---|---|
| `title-length` | 1.5 | 50–60 caractères (~580 px) |
| `meta-description` | 1.5 | 120–158 caractères |
| `content-length` | 1.5 | 900–2500 mots |
| `readability` | 1.0 | score Kandel-Moles 60–90 |
| `keyword-density` | 1.0 | 0.5–1.5 % |
| `heading-structure` | 1.0 | ≥1 H2 et ≥1 H3 |
| `link-balance` | 0.8 | ≥2 internes, ≥1 externe |
| `image-alt` | 0.8 | 0 image sans ALT |
| `canonical` | 0.5 | présent |

**Score global** :

```ts
const totalWeight = results.reduce((s, r) => s + r.rule.weight, 0);
const weightedScore = results.reduce((s, r) => s + r.result.score * r.rule.weight, 0);
const score = Math.round(weightedScore / totalWeight);
```

**Grade** :

- `good` : score ≥ 80  
- `ok` : 60 ≤ score < 80  
- `poor` : score < 60  

### 5.3 Seuils par règle

#### title-length

| Titre (chars) | Score | Issue |
|---|---|---|
| 30–60 | 100 | — |
| 20–29 ou 61–70 | 80 | warning "Titre un peu court/long" |
| < 20 ou > 70 | 40 | error "Titre trop court/long" |

Approximation pixel : largeur moyenne 9.5 px/char, pli Google ~580 px. Si > 600 px, on marque `error`.

#### meta-description

| Longueur (chars) | Score | Issue |
|---|---|---|
| 120–158 | 100 | — |
| 100–119 ou 159–320 | 80 | warning "Description proche des limites" |
| < 100 | 50 | error "Meta description trop courte" |
| > 320 | 50 | warning "Meta description trop longue" |

#### content-length

| Mots | Verdict | Score |
|---|---|---|
| < 600 | short | 20 |
| 600–899 | acceptable | 60 |
| 900–2500 | ideal | 100 |
| 2501–3500 | long | 70 |
| > 3500 | very-long | 40 |

Justification : articles IA/science exigent ~1000+ mots pour couvrir le sujet. Au-delà de 3500, la fatigue de lecture pénalise l'engagement.

#### readability (Kandel-Moles)

```ts
score = 207 - 1.015 * motsParPhrase - 73.6 * syllabesParMot
```

| Score Kandel-Moles | Interprétation | Note |
|---|---|---|
| 60–90 | assez facile | 100 |
| 50–59 / 91–100 | standard / très facile | 70 |
| < 50 | difficile | 40 |

Détection de langue : heuristique locale par ratio de stopwords FR vs EN dans le `plainText`. Si indécis, défaut `fr`.

#### keyword-density

- Focus = mot-clé manuel via KV, ou auto-extraction (top-1 pondéré par présence dans le titre, H2, H3 et fréquence brute).  
- Densité = `occurrences / wordCount * 100`.  
- Normalisation : casse basse, accents retirés, mots composés conservés.  

| Densité | Score | Issue |
|---|---|---|
| 0.5–1.5 % | 100 | — |
| 1.6–2.5 % | 70 | warning "Densité élevée" |
| > 2.5 % | 30 | error "Keyword stuffing" |
| 0 % (focus défini mais absent) | 20 | warning "Mot-clé absent du contenu" |

#### heading-structure

| H2 | H3 | Score | Issue |
|---|---|---|---|
| ≥1 | ≥1 | 100 | — |
| ≥1 | 0 | 70 | warning "Ajouter au moins un H3" |
| 0 | * | 30 | error "Ajouter au moins un H2" |

#### image-alt

| % sans ALT | Score | Issue |
|---|---|---|
| 0 | 100 | — |
| ≤ 25 | 80 | warning |
| > 25 | 40 | error |

#### link-balance

| Internes | Externes | Score | Issue |
|---|---|---|---|
| ≥2 | ≥1 | 100 | — |
| ≥2 | 0 | 60 | info "Ajouter une source externe" |
| 0/1 | ≥1 | 60 | info "Ajouter du maillage interne" |
| <2 internes et <1 externe | 20 | warning "Maillage insuffisant" |

Classification interne/externe : un lien est interne si son host correspond au `siteUrl` configuré dans EmDash, ou s'il commence par `/` ou `#`.

#### canonical

| Présent | Score | Issue |
|---|---|---|
| oui | 100 | — |
| non | 50 | error "Canonical manquant" |

### 5.5 Extraction des mots-clés

Algorithme local, sans dépendance NLP :

1. Tokenisation : split sur espaces, ponctuation, apostrophes.  
2. Filtrage : retrait stopwords FR+EN, tokens < 3 chars.  
3. N-grams : 1-grams, 2-grams, 3-grams.  
4. Pondération :  
   - dans `title` : ×4  
   - dans `headings` H2 : ×3  
   - dans `headings` H3 : ×2  
   - dans `plainText` : ×1  
5. Agrégation et tri par score pondéré.  
6. Retourne `suggestedKeywords` (top 5) ; le top 1 devient `focusKeyword` si pas d'override manuel.

## 6. Intégration EmDash

### 6.1 Capabilities

```ts
capabilities: [
  "content:read",
  "media:read",
  "taxonomies:read",
]
```

Pas de `network:request` dans ce bloc (les vérifications réseau sont exclues). Pas besoin de `content:write` car le hook `content:afterSave` ne modifie pas le contenu.

### 6.2 Hooks

```ts
hooks: {
  "content:afterSave": {
    priority: 100,
    errorPolicy: "continue",
    handler: async (event, ctx) => {
      if (!isAnalyzableCollection(event.collection)) return;
      const doc = await loadSeoDocument(ctx, event.content, event.collection);
      const config = await loadConfig(ctx);
      const focus = await ctx.kv.get<string | null>(`focus:${event.content.id}`);
      const report = analyze(doc, config, focus ?? undefined, ENGINE_VERSION);
      await ctx.storage.reports.put(event.content.id, report);
    },
  },
}
```

- `errorPolicy: "continue"` : une erreur d'analyse ne doit jamais bloquer la sauvegarde d'un article.  
- Timeout implicite 5s (au-delà, le hook est abandonné et loggué).  
- Collections analysées : `posts` et `pages` (configurable via `settings:analyzableCollections`).  

### 6.3 Routes API

#### POST analyze

```http
POST /_emdash/api/plugins/seo-pro/analyze
{
  "collection": "posts",
  "id": "<entry-id>"
}
```

Retourne le `SeoReport` complet, recalculé à la demande.

#### GET reports

```http
GET /_emdash/api/plugins/seo-pro/reports?collection=posts&limit=20&cursor=&sort=score&grade=poor
```

Retourne :

```json
{
  "items": [
    { "entryId": "...", "collection": "posts", "title": "...", "score": 72, "grade": "ok", "analyzedAt": "..." }
  ],
  "cursor": "...",
  "hasMore": true
}
```

#### GET report

```http
GET /_emdash/api/plugins/seo-pro/report?id=<entry-id>
```

Retourne le rapport stocké ; s'il est manquant ou que `engineVersion` diffère, recalcule et sauvegarde.

#### POST focus-keyword

```http
POST /_emdash/api/plugins/seo-pro/focus-keyword
{
  "entryId": "<entry-id>",
  "keyword": "intelligence artificielle generative"
}
```

`keyword: null` revient à l'auto. La route met à jour KV, recalcule le rapport et le sauvegarde.

## 7. UI admin

### 7.1 Pages

| Chemin | Label | Rôle |
|---|---|---|
| `/dashboard` | SEO Dashboard | vue d'ensemble et liste des rapports  |
| `/entry/:collection/:id` | Analyse article | rapport détaillé d'une entrée  |
| `/settings` | SEO Settings | configuration des seuils  |

### 7.2 Widgets

- `seo-overview` (half) : score moyen du site, nombre d'articles `poor`, top 3 issues les plus fréquentes.  

### 7.3 Composants

- `ScoreGauge` : jauge SVG semi-circulaire colorée par grade.  
- `MetricCard` : valeur, libellé, plage idéale, indicateur visuel.  
- `IssueList` : issues groupées par sévérité, avec liens vers l'éditeur EmDash.  
- `KeywordDensityBar` : barre 0–5% avec zone idéale 0.5–1.5%.  
- `PageShell` : en-tête de page plugin, breadcrumb.

### 7.4 Interactions

- Clic sur un article dans le dashboard → `/admin/plugins/seo-pro/entry/posts/<id>`.  
- Issue "Ajouter un H2" → lien vers `/admin/content/posts/<id>` ancré sur l'éditeur.  
- Bouton "Définir le mot-clé focus" → champ inline + POST `focus-keyword` + rechargement du rapport.

## 8. Tests

### 8.1 Couverture cible

- Moteur pur (`domain/`, `analysis/`, `content/`) : 100% des règles avec cas limite.  
- Routes : mock `PluginContext` via helper `test/mock-ctx.ts`.  
- Composants UI : tests légers uniquement si logique conditionnelle significative.  

### 8.2 Fixtures

- `test/fixtures/article-ia-portable-text.json` : vrai extrait d'article tech/français.  
- `test/fixtures/article-en-portable-text.json` : version anglaise pour test Flesch.  

### 8.3 Exemples de tests unitaires

```ts
it("scores a 45-char title as ideal", () => {
  const doc = makeDoc({ title: "L'IA générative bouleverse la cybersécurité" });
  const res = titleLengthRule.analyze(doc, defaultConfig, { focusKeyword: null });
  expect(res.score).toBe(100);
  expect(res.issues).toHaveLength(0);
});

it("flags keyword stuffing above 2.5%", () => {
  const doc = makeDoc({ plainText: repeat("intelligence artificielle", 40) + " " + filler(1000) });
  const res = keywordDensityRule.analyze(doc, defaultConfig, { focusKeyword: "intelligence artificielle" });
  expect(res.score).toBeLessThan(50);
  expect(res.issues.some(i => i.ruleId === "keyword-density" && i.severity === "error")).toBe(true);
});
```

## 9. Packaging et enregistrement

### 9.1 package.json

```json
{
  "name": "@cannelle/plugin-seo-pro",
  "version": "0.1.0",
  "type": "module",
  "private": true,
  "main": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts",
    "./admin": "./src/admin.tsx"
  },
  "peerDependencies": {
    "emdash": ">=0.30.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "dependencies": {
    "zod": "^3.23.8"
  }
}
```

### 9.2 astro.config.mjs

```ts
import { seoProPlugin } from "./src/plugins/seo-pro/src/index.ts";

emdash({
  plugins: [
    researchPaperEmbedPlugin(),
    seoProPlugin(),
  ],
})
```

### 9.3 tsconfig.json

Hérite du workspace root, avec `composite: false` car pas de build séparé.

## 10. Blocs suivants (non planifiés ici)

| Bloc | Fonctionnalités |
|---|---|
| Bloc 2 | Title, meta description, canonical, robots, OpenGraph, Twitter Card générés/auto-complétés via `page:metadata` |
| Bloc 3 | JSON-LD : Article/NewsArticle/TechArticle/FAQ/Breadcrumb/Organization/Person/WebSite/SearchAction |
| Bloc 4 | Sitemaps (`sitemap.xml`, `news-sitemap.xml`, `image-sitemap.xml`) + `robots.txt` |
| Bloc 5 | Redirections 301/302 et 410 via middleware plugin |
| Bloc 6 | Vérifications lourdes : liens cassés, contenu dupliqué, avec cron et stockage |
| Bloc 7 | IA générative : titre SEO, meta description, suggestions de mots-clés, intentions, sujets connexes |

## 11. Risques et mitigations

| Risque | Mitigation |
|---|---|
| `content:afterSave` ralentit la sauvegarde | analyse purement CPU, pas de réseau ; timeout 5s ; `errorPolicy: "continue"` |
| Divergence entre hook et route | une seule fonction `analyze()` appelée des deux côtés |
| Rapports obsolètes après ajout d'une règle | champ `engineVersion` dans `SeoReport` ; UI signale et recalcule |
| UI plugin différente de l'admin EmDash | utilisation de `@emdash-cms/admin` + CSS Modules scopés |
| Densité mot-clé fausse sur du contenu mixte FR/EN | normalisation + stopwords combinés FR+EN |

## 12. Critères de réussite

- [ ] Plugin s'enregistre sans erreur dans `astro.config.mjs`  
- [ ] Sauvegarder un article génère un rapport dans `ctx.storage.reports`  
- [ ] Dashboard affiche la liste paginée triée par score  
- [ ] Score, lisibilité, longueur, temps de lecture, densité, liens, ALT, H2/H3 conformes aux seuils  
- [ ] Issues title/meta/canonical/heading/ALT remontent correctement  
- [ ] Override du mot-clé focus met à jour le rapport en temps réel  
- [ ] Tests vitest passent (`pnpm test src/plugins/seo-pro/`)  
- [ ] Typecheck propre (`pnpm -F @cannelle/plugin-seo-pro exec tsc --noEmit`)  
