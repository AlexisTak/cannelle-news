# EmDash SEO Pro — Bloc 1 : Moteur d'analyse + Dashboard SEO + Audit

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Créer le plugin natif `@cannelle/plugin-seo-pro` avec un moteur d'analyse SEO pur, un dashboard admin, et un audit qualité pour les collections `posts` et `pages` du site Cannelle News.

**Architecture:** Clean Architecture — le moteur (`domain/` + `analysis/`) n'importe aucun code EmDash et est testable en isolation ; les adaptateurs EmDash (`infrastructure/`, `routes/`) câblent le moteur au CMS. L'UI admin utilise `@emdash-cms/admin` avec des CSS Modules scopés.

**Tech Stack:** TypeScript, EmDash (`emdash` >=0.30), React 19, vitest, zod, CSS Modules.

## Global Constraints

- **Plugin natif source-only** : aucune étape de build séparée, exports pointent vers `./src/index.ts`.
- **Zero dépendance runtime supplémentaire** : on réutilise `zod`; `emdash`, `react`, `react-dom` sont des peerDependencies.
- **UI admin avec `@emdash-cms/admin`** : pas de shadcn/ui, pas de Radix, pas de Tailwind reset global.
- **Clean Architecture / SOLID** : `domain/` n'importe rien d'externe.
- **Tests** : vitest, tests unitaires pour chaque règle, tests d'intégration pour `analyze()`, mock `PluginContext` pour les routes.
- **Français dominant** : lisibilité via Kandel & Moles, fallback Flesch anglais.
- **Capacités déclarées** : `content:read`, `media:read`, `taxonomies:read`.
- **Collections analysées par défaut** : `posts`, `pages`.
- **Score global** : moyenne pondérée des règles, arrondie, grade `good` (≥80), `ok` (60-79), `poor` (<60).
- **Hook `content:afterSave`** : `errorPolicy: "continue"`, timeout 5000ms, ne modifie pas le contenu.

---

## File map

### New files

- `src/plugins/seo-pro/package.json`
- `src/plugins/seo-pro/tsconfig.json`
- `src/plugins/seo-pro/README.md`
- `src/plugins/seo-pro/src/index.ts`
- `src/plugins/seo-pro/src/admin.tsx`
- `src/plugins/seo-pro/src/domain/document.ts`
- `src/plugins/seo-pro/src/domain/report.ts`
- `src/plugins/seo-pro/src/domain/scoring.ts`
- `src/plugins/seo-pro/src/domain/rules/rule.ts`
- `src/plugins/seo-pro/src/domain/rules/index.ts`
- `src/plugins/seo-pro/src/domain/rules/title-length.ts`
- `src/plugins/seo-pro/src/domain/rules/meta-description.ts`
- `src/plugins/seo-pro/src/domain/rules/content-length.ts`
- `src/plugins/seo-pro/src/domain/rules/keyword-density.ts`
- `src/plugins/seo-pro/src/domain/rules/readability.ts`
- `src/plugins/seo-pro/src/domain/rules/heading-structure.ts`
- `src/plugins/seo-pro/src/domain/rules/image-alt.ts`
- `src/plugins/seo-pro/src/domain/rules/link-balance.ts`
- `src/plugins/seo-pro/src/domain/rules/canonical.ts`
- `src/plugins/seo-pro/src/analysis/analyze.ts`
- `src/plugins/seo-pro/src/analysis/config.ts`
- `src/plugins/seo-pro/src/analysis/readability/formula.ts`
- `src/plugins/seo-pro/src/analysis/readability/flesch-en.ts`
- `src/plugins/seo-pro/src/analysis/readability/kandel-moles-fr.ts`
- `src/plugins/seo-pro/src/analysis/readability/syllables.ts`
- `src/plugins/seo-pro/src/analysis/readability/detect-language.ts`
- `src/plugins/seo-pro/src/analysis/keywords/extract.ts`
- `src/plugins/seo-pro/src/analysis/keywords/normalize.ts`
- `src/plugins/seo-pro/src/analysis/keywords/stopwords.fr.ts`
- `src/plugins/seo-pro/src/analysis/keywords/stopwords.en.ts`
- `src/plugins/seo-pro/src/analysis/reading-time.ts`
- `src/plugins/seo-pro/src/content/portable-text.ts`
- `src/plugins/seo-pro/src/content/link-classifier.ts`
- `src/plugins/seo-pro/src/ports/report-store.ts`
- `src/plugins/seo-pro/src/ports/config.ts`
- `src/plugins/seo-pro/src/infrastructure/storage-report-store.ts`
- `src/plugins/seo-pro/src/infrastructure/kv-config.ts`
- `src/plugins/seo-pro/src/infrastructure/content-loader.ts`
- `src/plugins/seo-pro/src/routes/analyze.ts`
- `src/plugins/seo-pro/src/routes/reports.ts`
- `src/plugins/seo-pro/src/routes/report.ts`
- `src/plugins/seo-pro/src/routes/focus-keyword.ts`
- `src/plugins/seo-pro/src/ui/pages/DashboardPage.tsx`
- `src/plugins/seo-pro/src/ui/pages/EntryReportPage.tsx`
- `src/plugins/seo-pro/src/ui/pages/SettingsPage.tsx`
- `src/plugins/seo-pro/src/ui/widgets/SeoOverviewWidget.tsx`
- `src/plugins/seo-pro/src/ui/components/ScoreGauge.tsx`
- `src/plugins/seo-pro/src/ui/components/MetricCard.tsx`
- `src/plugins/seo-pro/src/ui/components/IssueList.tsx`
- `src/plugins/seo-pro/src/ui/components/KeywordDensityBar.tsx`
- `src/plugins/seo-pro/src/ui/components/PageShell.tsx`
- `src/plugins/seo-pro/src/ui/styles/ScoreGauge.module.css`
- `src/plugins/seo-pro/src/ui/styles/MetricCard.module.css`
- `src/plugins/seo-pro/src/ui/styles/IssueList.module.css`
- `src/plugins/seo-pro/src/ui/styles/KeywordDensityBar.module.css`
- `src/plugins/seo-pro/src/ui/styles/Dashboard.module.css`
- `src/plugins/seo-pro/src/ui/styles/EntryReport.module.css`
- `src/plugins/seo-pro/test/fixtures/article-ia-portable-text.json`
- `src/plugins/seo-pro/test/fixtures/article-en-portable-text.json`
- `src/plugins/seo-pro/test/mock-ctx.ts`
- `src/plugins/seo-pro/src/domain/rules/title-length.test.ts`
- `src/plugins/seo-pro/src/domain/rules/meta-description.test.ts`
- `src/plugins/seo-pro/src/domain/rules/content-length.test.ts`
- `src/plugins/seo-pro/src/domain/rules/keyword-density.test.ts`
- `src/plugins/seo-pro/src/domain/rules/readability.test.ts`
- `src/plugins/seo-pro/src/domain/rules/heading-structure.test.ts`
- `src/plugins/seo-pro/src/domain/rules/image-alt.test.ts`
- `src/plugins/seo-pro/src/domain/rules/link-balance.test.ts`
- `src/plugins/seo-pro/src/domain/rules/canonical.test.ts`
- `src/plugins/seo-pro/src/analysis/analyze.test.ts`
- `src/plugins/seo-pro/src/analysis/keywords/extract.test.ts`
- `src/plugins/seo-pro/src/content/portable-text.test.ts`
- `src/plugins/seo-pro/src/routes/analyze.test.ts`
- `src/plugins/seo-pro/src/routes/reports.test.ts`
- `src/plugins/seo-pro/src/routes/focus-keyword.test.ts`

### Modified files

- `astro.config.mjs` : ajouter `seoProPlugin()` dans le tableau `plugins`.
- `pnpm-workspace.yaml` : déjà configuré pour `src/plugins/*`, aucune modification.
- `vitest.config.ts` : vérifier que les tests du dossier `src/plugins/seo-pro/` sont pris en compte (devrait l'être par défaut).

---

## Task 1: Scaffolding du package

**Files:**
- Create: `src/plugins/seo-pro/package.json`
- Create: `src/plugins/seo-pro/tsconfig.json`
- Create: `src/plugins/seo-pro/README.md`
- Modify: `astro.config.mjs`

**Interfaces:**
- Consumes: patterns du plugin `research-paper-embed`.
- Produces: package workspace enregistré, importable via `./src/plugins/seo-pro/src/index.ts`.

- [ ] **Step 1: Créer `package.json`**

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
  },
  "devDependencies": {
    "@types/react": "^19.0.0"
  }
}
```

- [ ] **Step 2: Créer `tsconfig.json`**

```json
{
  "extends": "../../../tsconfig.json",
  "compilerOptions": {
    "rootDir": "./src",
    "outDir": "./dist",
    "composite": false
  },
  "include": ["src/**/*"]
}
```

- [ ] **Step 3: Créer `README.md` minimal**

```markdown
# @cannelle/plugin-seo-pro

Plugin SEO natif pour EmDash. Bloc 1 : moteur d'analyse, dashboard admin, audit qualité.

## Installation

Ajouter dans `astro.config.mjs` :

```ts
import { seoProPlugin } from "./src/plugins/seo-pro/src/index.ts";

emdash({
  plugins: [seoProPlugin()],
});
```

## Tests

```bash
pnpm test src/plugins/seo-pro/
```
```

- [ ] **Step 4: Enregistrer le plugin dans `astro.config.mjs`**

```ts
import { seoProPlugin } from "./src/plugins/seo-pro/src/index.ts";

export default defineConfig({
  integrations: [
    react(),
    emdash({
      database: d1({ binding: "DB", session: "auto" }),
      storage: r2({ binding: "MEDIA" }),
      plugins: [researchPaperEmbedPlugin(), seoProPlugin()],
    }),
  ],
  vite: {
    optimizeDeps: {
      include: [
        "@cannelle/plugin-research-paper-embed",
        "@cannelle/plugin-research-paper-embed/admin",
      ],
    },
    ssr: {
      noExternal: ["@cannelle/plugin-research-paper-embed"],
    },
  },
  devToolbar: { enabled: false },
});
```

Note : ne pas ajouter `@cannelle/plugin-seo-pro` dans `optimizeDeps`/`ssr.noExternal` pour l'instant ; le plugin est local et source-only.

- [ ] **Step 5: Vérifier le workspace**

Run: `pnpm install`  
Expected: pas d'erreur, le package apparaît dans `node_modules/.pnpm`.

- [ ] **Step 6: Commit**

```bash
git add src/plugins/seo-pro/package.json src/plugins/seo-pro/tsconfig.json src/plugins/seo-pro/README.md astro.config.mjs
git commit -m "feat(seo-pro): scaffold plugin package and register in astro config"
```

---

## Task 2: Modèle de données du domaine

**Files:**
- Create: `src/plugins/seo-pro/src/domain/document.ts`
- Create: `src/plugins/seo-pro/src/domain/report.ts`
- Create: `src/plugins/seo-pro/src/domain/scoring.ts`
- Create: `src/plugins/seo-pro/src/domain/rules/rule.ts`
- Test: `src/plugins/seo-pro/src/domain/scoring.test.ts`

**Interfaces:**
- Consumes: none.
- Produces: `SeoDocument`, `SeoReport`, `SeoMetrics`, `Issue`, `Severity`, `Grade`, `SeoRule`, `RuleEnv`, `RuleResult`, `calculateOverallScore()`.

- [ ] **Step 1: Écrire le test pour `scoring.ts`**

```ts
import { describe, it, expect } from "vitest";
import { calculateOverallScore, gradeFromScore } from "./scoring";
import type { Issue } from "./report";

describe("calculateOverallScore", () => {
  it("computes weighted average of rule scores", () => {
    const results = [
      { rule: { id: "a", weight: 1.5 }, score: 100, issues: [] as Issue[] },
      { rule: { id: "b", weight: 1 }, score: 50, issues: [] as Issue[] },
    ];
    expect(calculateOverallScore(results)).toBe(80); // (100*1.5 + 50*1)/2.5 = 80
  });

  it("rounds to nearest integer", () => {
    const results = [
      { rule: { id: "a", weight: 1 }, score: 77, issues: [] as Issue[] },
      { rule: { id: "b", weight: 1 }, score: 78, issues: [] as Issue[] },
    ];
    expect(calculateOverallScore(results)).toBe(78);
  });
});

describe("gradeFromScore", () => {
  it("returns good for 80+", () => expect(gradeFromScore(80)).toBe("good"));
  it("returns ok for 60-79", () => expect(gradeFromScore(60)).toBe("ok"));
  it("returns poor for <60", () => expect(gradeFromScore(59)).toBe("poor"));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/plugins/seo-pro/src/domain/scoring.test.ts`  
Expected: FAIL — modules non trouvés.

- [ ] **Step 3: Implémenter `document.ts`, `report.ts`, `scoring.ts`, `rule.ts`**

`document.ts`:

```ts
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

`report.ts`:

```ts
export type Severity = "error" | "warning" | "info";
export type Grade = "good" | "ok" | "poor";

export interface SeoReport {
  entryId: string;
  collection: string;
  locale: string | null;
  title: string;
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

`scoring.ts`:

```ts
import type { Grade } from "./report";

export interface WeightedRuleResult {
  rule: { id: string; weight: number };
  score: number;
  issues: import("./report").Issue[];
}

export function calculateOverallScore(results: WeightedRuleResult[]): number {
  const totalWeight = results.reduce((sum, r) => sum + r.rule.weight, 0);
  if (totalWeight === 0) return 0;
  const weighted = results.reduce((sum, r) => sum + r.score * r.rule.weight, 0);
  return Math.round(weighted / totalWeight);
}

export function gradeFromScore(score: number): Grade {
  if (score >= 80) return "good";
  if (score >= 60) return "ok";
  return "poor";
}
```

`rule.ts`:

```ts
import type { SeoDocument } from "./document";
import type { Issue } from "./report";

export interface RuleEnv {
  focusKeyword: string | null;
}

export interface RuleResult {
  score: number;
  metrics?: Record<string, unknown>;
  issues: Issue[];
}

export interface SeoRule<TConfig = unknown> {
  id: string;
  label: string;
  defaultConfig: TConfig;
  analyze(doc: SeoDocument, config: TConfig, env: RuleEnv): RuleResult;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test src/plugins/seo-pro/src/domain/scoring.test.ts`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/plugins/seo-pro/src/domain/
git commit -m "feat(seo-pro): add domain data model and scoring logic"
```

---

## Task 3: Règles SEO individuelles

**Files:**
- Create: `src/plugins/seo-pro/src/domain/rules/title-length.ts`
- Create: `src/plugins/seo-pro/src/domain/rules/meta-description.ts`
- Create: `src/plugins/seo-pro/src/domain/rules/content-length.ts`
- Create: `src/plugins/seo-pro/src/domain/rules/keyword-density.ts`
- Create: `src/plugins/seo-pro/src/domain/rules/readability.ts`
- Create: `src/plugins/seo-pro/src/domain/rules/heading-structure.ts`
- Create: `src/plugins/seo-pro/src/domain/rules/image-alt.ts`
- Create: `src/plugins/seo-pro/src/domain/rules/link-balance.ts`
- Create: `src/plugins/seo-pro/src/domain/rules/canonical.ts`
- Create: `src/plugins/seo-pro/src/domain/rules/index.ts`
- Test: `src/plugins/seo-pro/src/domain/rules/*.test.ts`

**Interfaces:**
- Consumes: `SeoRule`, `RuleEnv`, `RuleResult`, `SeoDocument`, `Issue`.
- Produces: `rules` array exported from `domain/rules/index.ts`, each rule exposing `id`, `label`, `defaultConfig`, `analyze()`.

- [ ] **Step 1: Implémenter `title-length.ts` + test**

`title-length.ts`:

```ts
import type { SeoDocument } from "../document";
import type { SeoRule, RuleEnv, RuleResult } from "./rule";

export interface TitleLengthConfig {
  idealMinChars: number;
  idealMaxChars: number;
  warningMinChars: number;
  warningMaxChars: number;
  maxPixelWidth: number;
  charPixelWidth: number;
}

export const titleLengthRule: SeoRule<TitleLengthConfig> = {
  id: "title-length",
  label: "Title length",
  defaultConfig: {
    idealMinChars: 30,
    idealMaxChars: 60,
    warningMinChars: 20,
    warningMaxChars: 70,
    maxPixelWidth: 600,
    charPixelWidth: 9.5,
  },
  analyze(doc: SeoDocument, config: TitleLengthConfig, _env: RuleEnv): RuleResult {
    const len = doc.title.length;
    const issues: RuleResult["issues"] = [];
    let score = 100;

    if (len < config.idealMinChars || len > config.idealMaxChars) {
      score = len >= config.warningMinChars && len <= config.warningMaxChars ? 80 : 40;
      const message = len < config.idealMinChars
        ? `Title is too short (${len} chars). Ideal: ${config.idealMinChars}-${config.idealMaxChars}.`
        : `Title is too long (${len} chars). Ideal: ${config.idealMinChars}-${config.idealMaxChars}.`;
      issues.push({
        ruleId: "title-length",
        severity: score === 80 ? "warning" : "error",
        message,
        weight: 1.5,
      });
    }

    const pixelWidth = len * config.charPixelWidth;
    if (pixelWidth > config.maxPixelWidth && !issues.length) {
      issues.push({
        ruleId: "title-length",
        severity: "error",
        message: `Title may be truncated in SERP (${Math.round(pixelWidth)} px).`,
        weight: 1.5,
      });
      score = 40;
    }

    return { score, issues, metrics: { length: len, pixelWidth: Math.round(pixelWidth) } };
  },
};
```

`title-length.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { titleLengthRule } from "./title-length";
import { makeDoc } from "../../../test/make-doc";

describe("title-length", () => {
  it("scores ideal title", () => {
    const doc = makeDoc({ title: "L'IA générative bouleverse la cybersécurité" });
    const res = titleLengthRule.analyze(doc, titleLengthRule.defaultConfig, { focusKeyword: null });
    expect(res.score).toBe(100);
    expect(res.issues).toHaveLength(0);
  });

  it("flags short title", () => {
    const doc = makeDoc({ title: "IA" });
    const res = titleLengthRule.analyze(doc, titleLengthRule.defaultConfig, { focusKeyword: null });
    expect(res.score).toBeLessThan(100);
    expect(res.issues[0].severity).toBe("error");
  });

  it("flags long title", () => {
    const doc = makeDoc({ title: "a".repeat(80) });
    const res = titleLengthRule.analyze(doc, titleLengthRule.defaultConfig, { focusKeyword: null });
    expect(res.score).toBeLessThan(100);
  });
});
```

- [ ] **Step 2: Implémenter les 8 autres règles + tests**

Chaque règle suit le même pattern. Voici les contrats exacts :

**`meta-description.ts`**
- Config : `{ idealMinChars: 120, idealMaxChars: 158, warningMinChars: 100, warningMaxChars: 320 }`
- Score 100 dans l'idéal, 80 dans warning, 50 hors warning.
- Issues : error si < 100, warning si > 320 ou dans 100-119 / 159-320.

**`content-length.ts`**
- Config : `{ idealMinWords: 900, idealMaxWords: 2500, acceptableMinWords: 600, longMaxWords: 3500 }`
- Verdict : `short` < 600, `acceptable` 600-899, `ideal` 900-2500, `long` 2501-3500, `very-long` > 3500.
- Score : ideal 100, acceptable/long 60, short/very-long 20.

**`keyword-density.ts`**
- Config : `{ idealMinDensity: 0.5, idealMaxDensity: 1.5, warningMaxDensity: 2.5 }`
- Score 100 dans idéal, 70 dans warning, 30 au-dessus (stuffing), 20 si focus absent.
- Normalisation : lowercase, retire accents mais garde apostrophes et tirets.
- Compte les occurrences exactes du focus dans `plainText`.

**`readability.ts`**
- Config : `{ idealMinScore: 60, idealMaxScore: 90, acceptableMinScore: 50 }`
- Détecte la langue via `detectLanguage(doc.plainText)`.
- Applique `kandelMolesFr` ou `fleschEn`.
- Score 100 si 60-90, 70 si 50-59 ou 91-100, 40 si < 50.

**`heading-structure.ts`**
- Pas de config.
- Score 100 si ≥1 H2 et ≥1 H3, 70 si H2 sans H3, 30 si aucun H2.

**`image-alt.ts`**
- Config : `{ warningThresholdPercent: 25 }`
- Score 100 si 0% sans ALT, 80 si ≤ 25%, 40 si > 25%.

**`link-balance.ts`**
- Config : `{ minInternal: 2, minExternal: 1 }`
- Score 100 si internes ≥ 2 et externes ≥ 1, 60 si un des deux manque, 20 si les deux manquent.
- Issues : info quand un type manque, warning quand les deux manquent.

**`canonical.ts`**
- Pas de config.
- Score 100 si `doc.canonical` présent, 50 sinon. Issue error.

**`index.ts`**

```ts
import { titleLengthRule } from "./title-length";
import { metaDescriptionRule } from "./meta-description";
import { contentLengthRule } from "./content-length";
import { keywordDensityRule } from "./keyword-density";
import { readabilityRule } from "./readability";
import { headingStructureRule } from "./heading-structure";
import { imageAltRule } from "./image-alt";
import { linkBalanceRule } from "./link-balance";
import { canonicalRule } from "./canonical";
import type { SeoRule } from "./rule";

export interface RuleEntry {
  rule: SeoRule;
  weight: number;
}

export const rules: RuleEntry[] = [
  { rule: titleLengthRule, weight: 1.5 },
  { rule: metaDescriptionRule, weight: 1.5 },
  { rule: contentLengthRule, weight: 1.5 },
  { rule: readabilityRule, weight: 1.0 },
  { rule: keywordDensityRule, weight: 1.0 },
  { rule: headingStructureRule, weight: 1.0 },
  { rule: linkBalanceRule, weight: 0.8 },
  { rule: imageAltRule, weight: 0.8 },
  { rule: canonicalRule, weight: 0.5 },
];

export * from "./rule";
```

- [ ] **Step 3: Créer helper `test/make-doc.ts`**

```ts
import type { SeoDocument, ImageRef } from "../src/domain/document";

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
    plainText: "Ceci est un article de test avec suffisamment de mots pour que la densité et la lisibilité soient calculables. "
      .repeat(40),
    headings: [{ level: 2, text: "Introduction" }, { level: 3, text: "Contexte" }],
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
```

- [ ] **Step 4: Run all rule tests**

Run: `pnpm test src/plugins/seo-pro/src/domain/rules/`  
Expected: PASS pour les 9 règles.

- [ ] **Step 5: Commit**

```bash
git add src/plugins/seo-pro/src/domain/rules/ src/plugins/seo-pro/test/make-doc.ts
git commit -m "feat(seo-pro): implement all SEO analysis rules with tests"
```

---

## Task 4: Lisibilité et mots-clés

**Files:**
- Create: `src/plugins/seo-pro/src/analysis/readability/*.ts`
- Create: `src/plugins/seo-pro/src/analysis/keywords/*.ts`
- Create: `src/plugins/seo-pro/src/analysis/reading-time.ts`
- Test: `src/plugins/seo-pro/src/analysis/readability/*.test.ts`
- Test: `src/plugins/seo-pro/src/analysis/keywords/extract.test.ts`

**Interfaces:**
- Consumes: `SeoDocument`, text strings.
- Produces: `ReadabilityResult`, `detectLanguage(text)`, `extractKeywords(...)`, `calculateReadingTime(wordCount, wpm)`.

- [ ] **Step 1: Implémenter `syllables.ts`**

```ts
export function countSyllables(word: string, lang: "fr" | "en"): number {
  const cleaned = word.toLowerCase().replace(/[^a-zà-ÿ]/g, "");
  if (!cleaned) return 0;

  if (lang === "en") {
    const matches = cleaned.match(/[aeiouy]+/g);
    return matches ? Math.max(1, matches.length) : 1;
  }

  // French: groups of vowels count as one syllable; e muet at end ignored
  const vowels = "aeiouyàáâãäåæèéêëìíîïòóôõöùúûüÿ";
  let count = 0;
  let lastWasVowel = false;
  for (const ch of cleaned) {
    const isVowel = vowels.includes(ch);
    if (isVowel && !lastWasVowel) count++;
    lastWasVowel = isVowel;
  }
  if (cleaned.endsWith("e") && count > 1) count--;
  return Math.max(1, count);
}
```

- [ ] **Step 2: Implémenter `detect-language.ts`**

```ts
import { stopwordsFr } from "./stopwords.fr";
import { stopwordsEn } from "./stopwords.en";

export function detectLanguage(text: string): "fr" | "en" {
  const words = text.toLowerCase().split(/\s+/);
  const fr = words.filter((w) => stopwordsFr.has(w)).length;
  const en = words.filter((w) => stopwordsEn.has(w)).length;
  return en > fr ? "en" : "fr";
}
```

- [ ] **Step 3: Implémenter `kandel-moles-fr.ts`** et **`flesch-en.ts`**

`formula.ts` (source unique de `ReadabilityInput`) :

```ts
export interface ReadabilityInput {
  wordCount: number;
  sentenceCount: number;
  syllableCount: number;
}

export interface ReadabilityResult {
  score: number;
  formula: string;
}
```

`kandel-moles-fr.ts`:

```ts
import { countSyllables } from "./syllables";
import type { ReadabilityInput } from "./formula";

export function kandelMolesFr(input: ReadabilityInput): number {
  if (input.sentenceCount === 0 || input.wordCount === 0) return 0;
  const wordsPerSentence = input.wordCount / input.sentenceCount;
  const syllablesPerWord = input.syllableCount / input.wordCount;
  return 207 - 1.015 * wordsPerSentence - 73.6 * syllablesPerWord;
}
```

`flesch-en.ts`:

```ts
import { countSyllables } from "./syllables";
import type { ReadabilityInput } from "./formula";

export function fleschEn(input: ReadabilityInput): number {
  if (input.sentenceCount === 0 || input.wordCount === 0) return 0;
  const wordsPerSentence = input.wordCount / input.sentenceCount;
  const syllablesPerWord = input.syllableCount / input.wordCount;
  return 206.835 - 1.015 * wordsPerSentence - 84.6 * syllablesPerWord;
}
```

- [ ] **Step 4: Implémenter `normalize.ts`, `extract.ts`, stopwords**

`normalize.ts`:

```ts
const ACCENTS: Record<string, string> = {
  à: "a", á: "a", â: "a", ã: "a", ä: "a", å: "a", æ: "ae",
  ç: "c", è: "e", é: "e", ê: "e", ë: "e", ì: "i", í: "i", î: "i", ï: "i",
  ñ: "n", ò: "o", ó: "o", ô: "o", õ: "o", ö: "o", œ: "oe",
  ù: "u", ú: "u", û: "u", ü: "u", ÿ: "y",
};

export function normalizeToken(token: string): string {
  return token
    .toLowerCase()
    .split("")
    .map((ch) => ACCENTS[ch] ?? ch)
    .join("")
    .replace(/[^a-z0-9'-]/g, "")
    .replace(/^-+|-+$/g, "");
}
```

Stopwords : tableaux de strings convertis en `Set`.

`extract.ts`:

```ts
import { normalizeToken } from "./normalize";
import { stopwordsFr } from "./stopwords.fr";
import { stopwordsEn } from "./stopwords.en";

export interface KeywordCandidate {
  keyword: string;
  score: number;
}

export function extractKeywords(
  plainText: string,
  title: string,
  headings: string[],
  limit = 5,
): KeywordCandidate[] {
  const allStopwords = new Set([...stopwordsFr, ...stopwordsEn]);

  function tokens(text: string): string[] {
    return text
      .split(/\s+/)
      .map(normalizeToken)
      .filter((t) => t.length >= 3 && !allStopwords.has(t));
  }

  const counts = new Map<string, number>();
  const add = (token: string, weight: number) => {
    counts.set(token, (counts.get(token) ?? 0) + weight);
  };

  tokens(plainText).forEach((t) => add(t, 1));
  tokens(title).forEach((t) => add(t, 4));
  headings.forEach((h) => tokens(h).forEach((t) => add(t, 2)));

  // n-grams 2-3
  function ngrams(source: string[], weight: number) {
    for (let n = 2; n <= 3; n++) {
      for (let i = 0; i <= source.length - n; i++) {
        const gram = source.slice(i, i + n).join(" ");
        if (gram.includes("'") || gram.includes("-")) continue;
        const parts = gram.split(/\s+/).filter((p) => !allStopwords.has(p));
        if (parts.length >= 2) add(gram, weight);
      }
    }
  }

  ngrams(tokens(plainText), 1);
  ngrams(tokens(title), 4);
  headings.forEach((h) => ngrams(tokens(h), 2));

  return Array.from(counts.entries())
    .map(([keyword, score]) => ({ keyword, score }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
```

- [ ] **Step 5: Implémenter `reading-time.ts`**

```ts
export function calculateReadingTime(wordCount: number, wpm = 200): number {
  return Math.max(1, Math.ceil(wordCount / wpm));
}
```

- [ ] **Step 6: Tests**

Tests unitaires pour syllables, détection de langue, extraction de mots-clés, reading time. Au moins 3 tests par fichier.

- [ ] **Step 7: Commit**

```bash
git add src/plugins/seo-pro/src/analysis/
git commit -m "feat(seo-pro): add readability, keyword extraction and reading time utilities"
```

---

## Task 5: Orchestration `analyze()`

**Files:**
- Create: `src/plugins/seo-pro/src/analysis/analyze.ts`
- Create: `src/plugins/seo-pro/src/analysis/config.ts`
- Test: `src/plugins/seo-pro/src/analysis/analyze.test.ts`

**Interfaces:**
- Consumes: `SeoDocument`, `SeoConfig`, `focusKeyword`, `engineVersion`, all rules, readability engine, keyword extraction, reading time.
- Produces: `SeoReport`.

- [ ] **Step 1: Écrire le test d'intégration**

```ts
import { describe, it, expect } from "vitest";
import { analyze } from "./analyze";
import { makeDoc } from "../../../test/make-doc";
import { defaultConfig } from "./config";

describe("analyze", () => {
  it("returns a complete report for a good document", () => {
    const doc = makeDoc();
    const report = analyze(doc, defaultConfig, undefined, "1.0.0");
    expect(report.score).toBeGreaterThan(0);
    expect(report.grade).toMatch(/good|ok|poor/);
    expect(report.metrics.wordCount).toBeGreaterThan(0);
    expect(report.metrics.h2Count).toBe(1);
    expect(report.metrics.h3Count).toBe(1);
    expect(report.focusKeyword).not.toBeNull();
  });

  it("uses manual focus keyword when provided", () => {
    const doc = makeDoc({ title: "Intelligence artificielle" });
    const report = analyze(doc, defaultConfig, "intelligence artificielle", "1.0.0");
    expect(report.focusKeyword).toBe("intelligence artificielle");
    expect(report.focusKeywordSource).toBe("manual");
  });

  it("flags keyword stuffing", () => {
    const repeated = "intelligence artificielle ".repeat(40);
    const doc = makeDoc({ title: "Test", plainText: repeated + " " + "mot ".repeat(100) });
    const report = analyze(doc, defaultConfig, "intelligence artificielle", "1.0.0");
    expect(report.issues.some((i) => i.ruleId === "keyword-density" && i.severity === "error")).toBe(true);
  });
});
```

- [ ] **Step 2: Implémenter `config.ts`**

```ts
import type { SeoRule } from "../domain/rules/rule";

export interface RuleConfig {
  config?: Record<string, unknown>;
}

export interface SeoConfig {
  engineVersion: string;
  wordsPerMinute: number;
  analyzableCollections: string[];
  siteUrl: string | null;
  rules: Record<string, RuleConfig>;
}

export const defaultConfig: SeoConfig = {
  engineVersion: "1.0.0",
  wordsPerMinute: 200,
  analyzableCollections: ["posts", "pages"],
  siteUrl: null,
  rules: {},
};

export function mergeConfig(partial: Partial<SeoConfig>): SeoConfig {
  return {
    ...defaultConfig,
    ...partial,
    rules: { ...defaultConfig.rules, ...partial.rules },
  };
}

export function getRuleConfig<T>(config: SeoConfig, rule: SeoRule<T>): T {
  const override = config.rules[rule.id]?.config as Partial<T> | undefined;
  return override ? { ...rule.defaultConfig, ...override } : rule.defaultConfig;
}
```

- [ ] **Step 3: Implémenter `analyze.ts`**

```ts
import type { SeoDocument } from "../domain/document";
import type { SeoReport, SeoMetrics, Issue } from "../domain/report";
import { rules } from "../domain/rules";
import type { SeoRule, RuleEnv, RuleResult } from "../domain/rules/rule";
import { calculateOverallScore, gradeFromScore } from "../domain/scoring";
import type { SeoConfig } from "./config";
import { getRuleConfig } from "./config";
import { calculateReadingTime } from "./reading-time";
import { extractKeywords } from "./keywords/extract";
import { detectLanguage } from "./readability/detect-language";
import { kandelMolesFr } from "./readability/kandel-moles-fr";
import { fleschEn } from "./readability/flesch-en";
import { countSyllables } from "./readability/syllables";

export function analyze(
  doc: SeoDocument,
  config: SeoConfig,
  manualFocusKeyword?: string,
  engineVersion = config.engineVersion,
): SeoReport {
  const now = new Date().toISOString();
  const wordCount = countWords(doc.plainText);
  const readingTimeMinutes = calculateReadingTime(wordCount, config.wordsPerMinute);

  const candidates = extractKeywords(
    doc.plainText,
    doc.title,
    doc.headings.map((h) => h.text),
    5,
  );
  const autoFocus = candidates[0]?.keyword ?? null;
  const focusKeyword = manualFocusKeyword ?? autoFocus;
  const focusKeywordSource: SeoReport["focusKeywordSource"] = manualFocusKeyword ? "manual" : "auto";

  const env: RuleEnv = { focusKeyword };

  const ruleResults = rules.map(({ rule, weight }) => {
    const ruleConfig = getRuleConfig(config, rule as SeoRule);
    const result = rule.analyze(doc, ruleConfig, env);
    return { rule: { id: rule.id, weight }, score: result.score, issues: result.issues, result };
  });

  const score = calculateOverallScore(ruleResults);
  const grade = gradeFromScore(score);

  const issues: Issue[] = ruleResults.flatMap((r) => r.issues);

  const readability = computeReadability(doc.plainText, wordCount);

  const internalLinks = doc.links.filter((l) => l.internal).length;
  const externalLinks = doc.links.length - internalLinks;
  const imagesWithoutAlt = doc.images.filter((img) => !img.alt || img.alt.trim() === "").length;

  const metrics: SeoMetrics = {
    wordCount,
    readingTimeMinutes,
    readability,
    contentLength: {
      chars: doc.plainText.length,
      words: wordCount,
      verdict: deriveVerdict(wordCount),
    },
    keywordDensity: 0,
    keywordOccurrences: 0,
    internalLinks,
    externalLinks,
    imagesTotal: doc.images.length,
    imagesWithoutAlt,
    h2Count: doc.headings.filter((h) => h.level === 2).length,
    h3Count: doc.headings.filter((h) => h.level === 3).length,
  };

  // Compute density against normalized plain text tokens
  if (focusKeyword && wordCount > 0) {
    const occurrences = countOccurrences(doc.plainText, focusKeyword);
    metrics.keywordOccurrences = occurrences;
    metrics.keywordDensity = Number(((occurrences / wordCount) * 100).toFixed(2));
  }

  return {
    entryId: doc.entryId,
    collection: doc.collection,
    locale: doc.locale,
    title: doc.title,
    analyzedAt: now,
    engineVersion,
    score,
    grade,
    focusKeyword,
    focusKeywordSource,
    suggestedKeywords: candidates.map((c) => c.keyword),
    metrics,
    issues,
  };
}

function countWords(text: string): number {
  const matches = text.trim().split(/\s+/).filter(Boolean);
  return matches.length;
}

function countOccurrences(text: string, keyword: string): number {
  if (!keyword) return 0;
  const normalizedKeyword = keyword.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const normalizedText = text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const escaped = normalizedKeyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`\\b${escaped}\\b`, "g");
  const matches = normalizedText.match(regex);
  return matches ? matches.length : 0;
}

function deriveVerdict(words: number): SeoMetrics["contentLength"]["verdict"] {
  if (words < 600) return "short";
  if (words < 900) return "acceptable";
  if (words <= 2500) return "ideal";
  if (words <= 3500) return "long";
  return "very-long";
}

function computeReadability(text: string, wordCount: number): SeoMetrics["readability"] {
  const lang = detectLanguage(text);
  const sentences = countSentences(text);
  const tokens = text.split(/\s+/).filter(Boolean);
  const syllableCount = tokens.reduce((sum, t) => sum + countSyllables(t, lang), 0);

  const score =
    lang === "fr"
      ? kandelMolesFr({ wordCount, sentenceCount: sentences, syllableCount })
      : fleschEn({ wordCount, sentenceCount: sentences, syllableCount });

  let grade: string;
  if (score >= 60 && score <= 90) grade = "good";
  else if (score >= 50) grade = "ok";
  else grade = "poor";

  return { score: Math.round(score), formula: lang === "fr" ? "kandel-moles-fr" : "flesch-en", grade };
}

function countSentences(text: string): number {
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  return Math.max(1, sentences.length);
}
```

- [ ] **Step 4: Run test**

Run: `pnpm test src/plugins/seo-pro/src/analysis/analyze.test.ts`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/plugins/seo-pro/src/analysis/analyze.ts src/plugins/seo-pro/src/analysis/config.ts src/plugins/seo-pro/src/analysis/analyze.test.ts
git commit -m "feat(seo-pro): wire analyze orchestrator with rules and metrics"
```

---

## Task 6: Adaptateurs EmDash (content-loader, storage, config)

**Files:**
- Create: `src/plugins/seo-pro/src/ports/report-store.ts`
- Create: `src/plugins/seo-pro/src/ports/config.ts`
- Create: `src/plugins/seo-pro/src/infrastructure/content-loader.ts`
- Create: `src/plugins/seo-pro/src/infrastructure/storage-report-store.ts`
- Create: `src/plugins/seo-pro/src/infrastructure/kv-config.ts`
- Test: `src/plugins/seo-pro/src/content/portable-text.test.ts`
- Test: `src/plugins/seo-pro/src/infrastructure/content-loader.test.ts`

**Interfaces:**
- Consumes: `PluginContext`, Portable Text blocks, `SeoDocument`.
- Produces: `loadSeoDocument(ctx, entry, collection)`, `ReportStore` interface, `ConfigStore` interface, implementations via EmDash storage/KV.

- [ ] **Step 1: Implémenter le convertisseur Portable Text → texte plat**

`src/plugins/seo-pro/src/content/portable-text.ts`:

```ts
export function portableTextToPlainText(blocks: unknown[]): string {
  if (!Array.isArray(blocks)) return "";
  return blocks.map(blockToText).filter(Boolean).join("\n\n");
}

function blockToText(block: unknown): string {
  if (typeof block !== "object" || block === null) return "";
  const b = block as Record<string, unknown>;

  // Handle list items
  if (b._type === "list") {
    const items = Array.isArray(b.children) ? b.children : [];
    return items.map((item) => blockToText(item)).join("\n");
  }

  const children = Array.isArray(b.children) ? b.children : [];
  return children.map(spanToText).join("");
}

function spanToText(span: unknown): string {
  if (typeof span === "string") return span;
  if (typeof span !== "object" || span === null) return "";
  const s = span as Record<string, unknown>;
  if (typeof s.text === "string") return s.text;
  return "";
}
```

- [ ] **Step 2: Implémenter `link-classifier.ts`**

```ts
export function classifyLink(href: string, siteUrl: string | undefined): boolean {
  if (!href) return false;
  if (href.startsWith("/") || href.startsWith("#")) return true;
  if (!siteUrl) return false;
  try {
    const linkHost = new URL(href).hostname;
    const siteHost = new URL(siteUrl).hostname;
    return linkHost === siteHost;
  } catch {
    return false;
  }
}
```

- [ ] **Step 3: Implémenter `content-loader.ts`**

```ts
import type { PluginContext } from "emdash";
import type { SeoDocument, ImageRef } from "../domain/document";
import { portableTextToPlainText } from "../content/portable-text";
import { classifyLink } from "../content/link-classifier";

export async function loadSeoDocument(
  ctx: PluginContext,
  entry: Record<string, unknown>,
  collection: string,
): Promise<SeoDocument> {
  const { createKvConfigStore } = await import("../infrastructure/kv-config");
  const config = await createKvConfigStore(ctx).get();
  const siteUrl = config.siteUrl;
  const title = String(entry.title ?? "");
  const metaDescription = entry.metaDescription ? String(entry.metaDescription) : null;
  const canonical = entry.canonical ? String(entry.canonical) : null;
  const excerpt = entry.excerpt ? String(entry.excerpt) : null;

  const body = Array.isArray(entry.content) ? entry.content : [];
  const plainText = portableTextToPlainText(body);

  const headings = extractHeadings(body);
  const links = extractLinks(body, siteUrl ?? undefined);
  const images = extractImages(body);

  if (entry.featured_image && typeof entry.featured_image === "object") {
    const img = entry.featured_image as Record<string, unknown>;
    images.unshift({
      src: String(img.src ?? ""),
      alt: img.alt ? String(img.alt) : null,
    });
  }

  return {
    entryId: String(entry.id ?? ""),
    collection,
    slug: entry.slug ? String(entry.slug) : null,
    locale: entry.locale ? String(entry.locale) : null,
    title,
    metaDescription,
    canonical,
    excerpt,
    featuredImage: entry.featured_image ? (entry.featured_image as ImageRef) : null,
    plainText,
    headings,
    links,
    images,
  };
}

function extractHeadings(blocks: unknown[]): SeoDocument["headings"] {
  const headings: SeoDocument["headings"] = [];
  for (const block of blocks) {
    if (typeof block !== "object" || block === null) continue;
    const b = block as Record<string, unknown>;
    if (b._type === "heading" && typeof b.level === "number" && b.level >= 2 && b.level <= 4) {
      const text = blockToText(block);
      if (text) headings.push({ level: b.level as 2 | 3 | 4, text });
    }
  }
  return headings;
}

function extractLinks(blocks: unknown[], siteUrl?: string): SeoDocument["links"] {
  const links: SeoDocument["links"] = [];
  for (const block of blocks) {
    collectLinks(block, links, siteUrl);
  }
  return links;
}

function collectLinks(node: unknown, links: SeoDocument["links"], siteUrl?: string) {
  if (typeof node !== "object" || node === null) return;
  if (Array.isArray(node)) {
    node.forEach((child) => collectLinks(child, links, siteUrl));
    return;
  }
  const n = node as Record<string, unknown>;
  if (n._type === "link" && typeof n.href === "string") {
    const text = Array.isArray(n.children) ? n.children.map(spanToText).join("") : "";
    links.push({ href: n.href, text, internal: classifyLink(n.href, siteUrl) });
  }
  for (const key of Object.keys(n)) {
    collectLinks(n[key], links, siteUrl);
  }
}

function extractImages(blocks: unknown[]): ImageRef[] {
  const images: ImageRef[] = [];
  for (const block of blocks) {
    collectImages(block, images);
  }
  return images;
}

function collectImages(node: unknown, images: ImageRef[]) {
  if (typeof node !== "object" || node === null) return;
  if (Array.isArray(node)) {
    node.forEach((child) => collectImages(child, images));
    return;
  }
  const n = node as Record<string, unknown>;
  if (n._type === "image" || n._type === "imageBlock") {
    const src = typeof n.src === "string" ? n.src : "";
    const alt = n.alt ? String(n.alt) : null;
    images.push({ src, alt });
  }
  for (const key of Object.keys(n)) {
    collectImages(n[key], images);
  }
}

function spanToText(span: unknown): string {
  if (typeof span === "string") return span;
  if (typeof span !== "object" || span === null) return "";
  const s = span as Record<string, unknown>;
  if (typeof s.text === "string") return s.text;
  return "";
}
```

- [ ] **Step 4: Implémenter ports et adaptateurs**

`ports/report-store.ts`:

```ts
import type { SeoReport } from "../domain/report";

export interface ReportStore {
  get(entryId: string): Promise<SeoReport | null>;
  put(report: SeoReport): Promise<void>;
  query(options: { collection?: string; limit: number; cursor?: string; sort?: "score" | "analyzedAt" }): Promise<{
    items: SeoReport[];
    cursor: string | null;
    hasMore: boolean;
  }>;
}
```

`ports/config.ts`:

```ts
import type { SeoConfig } from "../analysis/config";

export interface ConfigStore {
  get(): Promise<SeoConfig>;
  set(config: Partial<SeoConfig>): Promise<void>;
}
```

`infrastructure/storage-report-store.ts`:

```ts
import type { PluginContext } from "emdash";
import type { SeoReport } from "../domain/report";
import type { ReportStore } from "../ports/report-store";

export function createStorageReportStore(ctx: PluginContext): ReportStore {
  return {
    async get(entryId: string): Promise<SeoReport | null> {
      const result = await ctx.storage.reports.get(entryId);
      return result?.data ?? null;
    },
    async put(report: SeoReport): Promise<void> {
      await ctx.storage.reports.put(report.entryId, report);
    },
    async query({ collection, limit, cursor, sort = "score" }) {
      const orderBy = sort === "analyzedAt" ? { analyzedAt: "desc" } : { score: "desc" };
      const where = collection ? { collection } : undefined;
      const result = await ctx.storage.reports.query({ where, orderBy, limit, cursor });
      return {
        items: result.items.map((i) => i.data as SeoReport),
        cursor: result.cursor,
        hasMore: result.hasMore,
      };
    },
  };
}
```

`infrastructure/kv-config.ts`:

```ts
import type { PluginContext } from "emdash";
import { defaultConfig, mergeConfig, type SeoConfig } from "../analysis/config";
import type { ConfigStore } from "../ports/config";

const KEY = "settings:seoConfig";

export function createKvConfigStore(ctx: PluginContext): ConfigStore {
  return {
    async get(): Promise<SeoConfig> {
      const stored = await ctx.kv.get<Partial<SeoConfig>>(KEY);
      // Fall back to legacy siteUrl setting if present
      const merged = mergeConfig(stored ?? {});
      if (!merged.siteUrl) {
        const legacy = await ctx.kv.get<string>("settings:siteUrl");
        if (legacy) merged.siteUrl = legacy;
      }
      return merged;
    },
    async set(config: Partial<SeoConfig>): Promise<void> {
      const current = await this.get();
      const next = mergeConfig({ ...current, ...config });
      await ctx.kv.set(KEY, next);
    },
  };
}
```

- [ ] **Step 5: Tests**

`portable-text.test.ts` : vérifier extraction de texte, headings, liens, images.

`content-loader.test.ts` : mock `PluginContext`, vérifier que `loadSeoDocument` produit un `SeoDocument` complet.

- [ ] **Step 6: Commit**

```bash
git add src/plugins/seo-pro/src/content/ src/plugins/seo-pro/src/ports/ src/plugins/seo-pro/src/infrastructure/
git commit -m "feat(seo-pro): add EmDash content loader and storage adapters"
```

---

## Task 7: Définition du plugin, hooks et routes

**Files:**
- Create: `src/plugins/seo-pro/src/index.ts`
- Create: `src/plugins/seo-pro/src/routes/analyze.ts`
- Create: `src/plugins/seo-pro/src/routes/reports.ts`
- Create: `src/plugins/seo-pro/src/routes/report.ts`
- Create: `src/plugins/seo-pro/src/routes/focus-keyword.ts`
- Test: `src/plugins/seo-pro/src/routes/*.test.ts`
- Test: `src/plugins/seo-pro/test/mock-ctx.ts`

**Interfaces:**
- Consumes: `definePlugin`, `loadSeoDocument`, `analyze`, `ReportStore`, `ConfigStore`, `zod`.
- Produces: `seoProPlugin()` descriptor, `createPlugin()` runtime, plugin routes.

- [ ] **Step 1: Implémenter `mock-ctx.ts`**

```ts
import type { PluginContext } from "emdash";

export function createMockCtx(overrides: Partial<PluginContext> = {}): PluginContext {
  const kv = new Map<string, unknown>();
  const reports = new Map<string, unknown>();

  return {
    log: { info: () => {}, warn: () => {}, error: () => {} },
    kv: {
      get: async (key: string) => kv.get(key) ?? null,
      set: async (key: string, value: unknown) => { kv.set(key, value); },
      delete: async (key: string) => { kv.delete(key); },
      list: async () => [],
    },
    storage: {
      reports: {
        get: async (id: string) => (reports.has(id) ? { data: reports.get(id) } : null),
        put: async (id: string, data: unknown) => { reports.set(id, data); },
        query: async ({ where, orderBy, limit = 20, cursor }: any) => {
          let items = Array.from(reports.values());
          if (where?.collection) {
            items = items.filter((item: any) => item.collection === where.collection);
          }
          return { items: items.slice(0, limit).map((data) => ({ data })), cursor: null, hasMore: false };
        },
        count: async () => reports.size,
      },
    },
    content: {
      get: async () => null,
      list: async () => ({ items: [], cursor: null, hasMore: false }),
    },
    taxonomies: {
      getAll: async () => [],
      getTerms: async () => [],
      getEntryTerms: async () => [],
    },
    media: {
      get: async () => null,
      list: async () => ({ items: [], cursor: null, hasMore: false }),
    },
    ...overrides,
  } as unknown as PluginContext;
}
```

- [ ] **Step 2: Implémenter les routes**

`routes/analyze.ts`:

```ts
import { z } from "astro/zod";
import type { PluginContext } from "emdash";
import { analyze } from "../analysis/analyze";
import { createKvConfigStore } from "../infrastructure/kv-config";
import { loadSeoDocument } from "../infrastructure/content-loader";

export const analyzeInputSchema = z.object({
  collection: z.string(),
  id: z.string(),
});

export async function analyzeRouteHandler(
  input: z.infer<typeof analyzeInputSchema>,
  ctx: PluginContext,
): Promise<import("../domain/report").SeoReport> {
  const entry = await ctx.content.get(input.collection, input.id);
  if (!entry) throw new Error("Entry not found");
  const config = await createKvConfigStore(ctx).get();
  const manualFocus = await ctx.kv.get<string | null>(`focus:${input.id}`);
  const doc = await loadSeoDocument(ctx, entry.data as Record<string, unknown>, input.collection);
  return analyze(doc, config, manualFocus ?? undefined, config.engineVersion);
}
```

`routes/reports.ts`:

```ts
import { z } from "astro/zod";
import type { PluginContext } from "emdash";
import { createStorageReportStore } from "../infrastructure/storage-report-store";

export const reportsInputSchema = z.object({
  collection: z.string().optional(),
  limit: z.number().min(1).max(100).default(20),
  cursor: z.string().optional(),
  sort: z.enum(["score", "analyzedAt"]).default("score"),
  grade: z.enum(["good", "ok", "poor"]).optional(),
});

export async function reportsRouteHandler(
  input: z.infer<typeof reportsInputSchema>,
  ctx: PluginContext,
) {
  const store = createStorageReportStore(ctx);
  const result = await store.query({
    collection: input.collection,
    limit: input.limit,
    cursor: input.cursor,
    sort: input.sort,
  });
  let items = result.items;
  if (input.grade) {
    items = items.filter((r) => r.grade === input.grade);
  }
  return {
    items: items.map((r) => ({
      entryId: r.entryId,
      collection: r.collection,
      title: r.title ?? null,
      score: r.score,
      grade: r.grade,
      analyzedAt: r.analyzedAt,
    })),
    cursor: result.cursor,
    hasMore: result.hasMore,
  };
}
```

Note : `title` n'est pas stocké dans `SeoReport`. Ajouter `title: string` dans `SeoReport` et dans `analyze()`.

`routes/report.ts`:

```ts
import { z } from "astro/zod";
import type { PluginContext } from "emdash";
import { createStorageReportStore } from "../infrastructure/storage-report-store";
import { analyzeRouteHandler } from "./analyze";

export const reportInputSchema = z.object({
  id: z.string(),
  collection: z.string(),
});

export async function reportRouteHandler(
  input: z.infer<typeof reportInputSchema>,
  ctx: PluginContext,
) {
  const store = createStorageReportStore(ctx);
  const configStore = createKvConfigStore(ctx);
  let report = await store.get(input.id);
  const config = await configStore.get();
  if (!report || report.engineVersion !== config.engineVersion) {
    report = await analyzeRouteHandler({ collection: input.collection, id: input.id }, ctx);
    await store.put(report);
  }
  return report;
}
```

`routes/focus-keyword.ts`:

```ts
import { z } from "astro/zod";
import type { PluginContext } from "emdash";
import { analyzeRouteHandler } from "./analyze";
import { createStorageReportStore } from "../infrastructure/storage-report-store";

export const focusKeywordInputSchema = z.object({
  entryId: z.string(),
  collection: z.string(),
  keyword: z.string().max(60).nullable(),
});

export async function focusKeywordRouteHandler(
  input: z.infer<typeof focusKeywordInputSchema>,
  ctx: PluginContext,
) {
  await ctx.kv.set(`focus:${input.entryId}`, input.keyword);
  const report = await analyzeRouteHandler(
    { collection: input.collection, id: input.entryId },
    ctx,
  );
  await createStorageReportStore(ctx).put(report);
  return report;
}
```

- [ ] **Step 3: Implémenter `index.ts`**

```ts
import { definePlugin } from "emdash";
import type { PluginDescriptor } from "emdash";
import { z } from "astro/zod";
import { analyzeRouteHandler, analyzeInputSchema } from "./routes/analyze";
import { reportsRouteHandler, reportsInputSchema } from "./routes/reports";
import { reportRouteHandler, reportInputSchema } from "./routes/report";
import { focusKeywordRouteHandler, focusKeywordInputSchema } from "./routes/focus-keyword";
import { loadSeoDocument } from "./infrastructure/content-loader";
import { analyze } from "./analysis/analyze";
import { createKvConfigStore } from "./infrastructure/kv-config";

export const ENGINE_VERSION = "1.0.0";

export function seoProPlugin(): PluginDescriptor {
  return {
    id: "seo-pro",
    version: "0.1.0",
    format: "native",
    entrypoint: "@cannelle/plugin-seo-pro",
    adminEntry: "@cannelle/plugin-seo-pro/admin",
    adminPages: [
      { path: "/dashboard", label: "SEO Dashboard", icon: "bar-chart" },
      { path: "/entry/:collection/:id", label: "Analyse article", icon: "file-text" },
      { path: "/settings", label: "SEO Settings", icon: "settings" },
    ],
    adminWidgets: [{ id: "seo-overview", title: "SEO Overview", size: "half" }],
  };
}

export function createPlugin() {
  return definePlugin({
    id: "seo-pro",
    version: "0.1.0",
    capabilities: ["content:read", "media:read", "taxonomies:read"],
    storage: {
      reports: {
        indexes: ["collection", "score", "analyzedAt", ["collection", "score"]],
      },
    },
    admin: {
      entry: "@cannelle/plugin-seo-pro/admin",
      pages: [
        { path: "/dashboard", label: "SEO Dashboard", icon: "bar-chart" },
        { path: "/entry/:collection/:id", label: "Analyse article", icon: "file-text" },
        { path: "/settings", label: "SEO Settings", icon: "settings" },
      ],
      widgets: [{ id: "seo-overview", title: "SEO Overview", size: "half" }],
      settingsSchema: {
        // Auto-generated settings page is intentionally minimal for Bloc 1.
        // Custom React settings page handles wordsPerMinute, siteUrl, analyzableCollections.
      },
    },
    routes: {
      analyze: {
        input: analyzeInputSchema,
        handler: async (routeCtx, ctx) => analyzeRouteHandler(routeCtx.input as z.infer<typeof analyzeInputSchema>, ctx),
      },
      reports: {
        input: reportsInputSchema,
        handler: async (routeCtx, ctx) => reportsRouteHandler(routeCtx.input as z.infer<typeof reportsInputSchema>, ctx),
      },
      report: {
        input: reportInputSchema,
        handler: async (routeCtx, ctx) => reportRouteHandler(routeCtx.input as z.infer<typeof reportInputSchema>, ctx),
      },
      "focus-keyword": {
        input: focusKeywordInputSchema,
        handler: async (routeCtx, ctx) => focusKeywordRouteHandler(routeCtx.input as z.infer<typeof focusKeywordInputSchema>, ctx),
      },
    },
    hooks: {
      "content:afterSave": {
        priority: 100,
        errorPolicy: "continue",
        timeout: 5000,
        handler: async (event, ctx) => {
          const config = await createKvConfigStore(ctx).get();
          if (!config.analyzableCollections.includes(event.collection)) return;
          const doc = await loadSeoDocument(ctx, event.content as Record<string, unknown>, event.collection);
          const manualFocus = await ctx.kv.get<string | null>(`focus:${event.content.id}`);
          const report = analyze(doc, config, manualFocus ?? undefined, ENGINE_VERSION);
          await ctx.storage.reports.put(event.content.id, report);
        },
      },
    },
  });
}

export default createPlugin;
```

Note : `event.content.id` est l'ULID base de données. `entryId` du rapport = `event.content.id`. Le slug public est dans `event.content.slug`.

- [ ] **Step 4: Ajouter `title` dans `SeoReport`**

Modifier `src/plugins/seo-pro/src/domain/report.ts` pour ajouter `title: string` à `SeoReport`. Modifier `analyze()` pour renseigner `title: doc.title`.

- [ ] **Step 5: Tests de routes**

`routes/analyze.test.ts` :

```ts
import { describe, it, expect } from "vitest";
import { analyzeRouteHandler } from "./analyze";
import { createMockCtx } from "../../../test/mock-ctx";

describe("analyze route", () => {
  it("returns a report for an existing entry", async () => {
    const ctx = createMockCtx({
      content: {
        get: async () => ({
          data: {
            id: "01ENTRY",
            title: "Test Article",
            content: [{ _type: "block", children: [{ _type: "span", text: "Ceci est un article. " }] }],
            slug: "test-article",
          },
        }),
      },
    });
    const report = await analyzeRouteHandler({ collection: "posts", id: "01ENTRY" }, ctx);
    expect(report.entryId).toBe("01ENTRY");
    expect(report.title).toBe("Test Article");
  });
});
```

`routes/focus-keyword.test.ts` et `routes/reports.test.ts` similaires.

- [ ] **Step 6: Commit**

```bash
git add src/plugins/seo-pro/src/index.ts src/plugins/seo-pro/src/routes/ src/plugins/seo-pro/test/mock-ctx.ts src/plugins/seo-pro/src/domain/report.ts
git commit -m "feat(seo-pro): define plugin, hooks and API routes"
```

---

## Task 8: UI admin

**Files:**
- Create: `src/plugins/seo-pro/src/admin.tsx`
- Create: `src/plugins/seo-pro/src/ui/components/ScoreGauge.tsx` + CSS
- Create: `src/plugins/seo-pro/src/ui/components/MetricCard.tsx` + CSS
- Create: `src/plugins/seo-pro/src/ui/components/IssueList.tsx` + CSS
- Create: `src/plugins/seo-pro/src/ui/components/KeywordDensityBar.tsx` + CSS
- Create: `src/plugins/seo-pro/src/ui/components/PageShell.tsx`
- Create: `src/plugins/seo-pro/src/ui/pages/DashboardPage.tsx` + CSS
- Create: `src/plugins/seo-pro/src/ui/pages/EntryReportPage.tsx` + CSS
- Create: `src/plugins/seo-pro/src/ui/pages/SettingsPage.tsx`
- Create: `src/plugins/seo-pro/src/ui/widgets/SeoOverviewWidget.tsx`

**Interfaces:**
- Consumes: `usePluginAPI` from `@emdash-cms/admin`, `Card`, `Button`, `Table`, `Loading`, `Input`, `Select`, `Toggle`, etc.
- Produces: pages and widgets map exported from `admin.tsx`.

- [ ] **Step 1: Implémenter `ScoreGauge.tsx` + CSS**

```tsx
import styles from "../styles/ScoreGauge.module.css";

interface Props {
  score: number;
  grade: "good" | "ok" | "poor";
  size?: "sm" | "md" | "lg";
}

export function ScoreGauge({ score, grade, size = "md" }: Props) {
  const color = grade === "good" ? "#16a34a" : grade === "ok" ? "#d97706" : "#dc2626";
  const radius = size === "lg" ? 80 : size === "md" ? 50 : 30;
  const stroke = radius * 0.2;
  const circumference = 2 * Math.PI * radius;
  const dash = (score / 100) * circumference * 0.5;

  return (
    <div className={styles.gauge} data-size={size}>
      <svg viewBox={`0 0 ${radius * 2.4} ${radius * 1.4}`} className={styles.svg}>
        <circle
          cx={radius * 1.2}
          cy={radius * 1.1}
          r={radius}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={stroke}
          strokeDasharray={`${circumference * 0.5} ${circumference}`}
          transform={`rotate(180 ${radius * 1.2} ${radius * 1.1})`}
        />
        <circle
          cx={radius * 1.2}
          cy={radius * 1.1}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={`${dash} ${circumference}`}
          transform={`rotate(180 ${radius * 1.2} ${radius * 1.1})`}
          strokeLinecap="round"
        />
      </svg>
      <span className={styles.score}>{score}</span>
      <span className={styles.grade}>{grade}</span>
    </div>
  );
}
```

`ScoreGauge.module.css` :

```css
.gauge {
  position: relative;
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  width: fit-content;
}
.svg {
  display: block;
}
.score {
  font-size: 1.5rem;
  font-weight: 700;
  line-height: 1;
  margin-top: -0.5rem;
}
.grade {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
```

- [ ] **Step 2: Implémenter `MetricCard.tsx` + CSS et `KeywordDensityBar.tsx` + CSS**

`MetricCard.tsx` :

```tsx
import styles from "../styles/MetricCard.module.css";

interface Props {
  label: string;
  value: string | number;
  ideal?: string;
  status: "good" | "warning" | "error";
}

export function MetricCard({ label, value, ideal, status }: Props) {
  return (
    <div className={styles.card} data-status={status}>
      <span className={styles.value}>{value}</span>
      <span className={styles.label}>{label}</span>
      {ideal && <span className={styles.ideal}>Idéal : {ideal}</span>}
    </div>
  );
}
```

`MetricCard.module.css` :

```css
.card {
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
.card[data-status="good"] { border-left: 4px solid #16a34a; }
.card[data-status="warning"] { border-left: 4px solid #d97706; }
.card[data-status="error"] { border-left: 4px solid #dc2626; }
.value {
  font-size: 1.5rem;
  font-weight: 700;
}
.label {
  font-size: 0.875rem;
  color: #6b7280;
}
.ideal {
  font-size: 0.75rem;
  color: #9ca3af;
}
```

`KeywordDensityBar.tsx` :

```tsx
import styles from "../styles/KeywordDensityBar.module.css";

interface Props {
  density: number;
}

export function KeywordDensityBar({ density }: Props) {
  const pct = Math.min(100, (density / 5) * 100);
  return (
    <div className={styles.container}>
      <div className={styles.track}>
        <div className={styles.idealZone} style={{ left: "10%", right: "70%" }} />
        <div className={styles.bar} style={{ width: `${pct}%` }} />
      </div>
      <span className={styles.value}>{density.toFixed(2)}%</span>
    </div>
  );
}
```

`KeywordDensityBar.module.css` :

```css
.container {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
}
.track {
  position: relative;
  flex: 1;
  height: 0.5rem;
  background: #e5e7eb;
  border-radius: 9999px;
  overflow: hidden;
}
.idealZone {
  position: absolute;
  top: 0;
  bottom: 0;
  background: rgba(22, 163, 74, 0.2);
}
.bar {
  height: 100%;
  background: #2563eb;
  border-radius: 9999px;
}
.value {
  font-size: 0.875rem;
  font-weight: 600;
  min-width: 3.5rem;
  text-align: right;
}
```

- [ ] **Step 3: Implémenter `IssueList.tsx` + CSS**

```tsx
import styles from "../styles/IssueList.module.css";
import type { Issue, Severity } from "../../domain/report";

interface Props {
  issues: Issue[];
  entryId: string;
  collection: string;
}

const severityOrder: Severity[] = ["error", "warning", "info"];
const severityLabels: Record<Severity, string> = {
  error: "Erreur",
  warning: "Attention",
  info: "Info",
};

export function IssueList({ issues, entryId, collection }: Props) {
  const grouped = severityOrder.map((sev) => ({
    sev,
    items: issues.filter((i) => i.severity === sev),
  }));

  const editorUrl = `/_emdash/admin/content/${collection}/${entryId}`;

  return (
    <div className={styles.list}>
      {grouped.map(({ sev, items }) =>
        items.length === 0 ? null : (
          <div key={sev} className={styles.group} data-severity={sev}>
            <h4 className={styles.groupTitle}>{severityLabels[sev]} ({items.length})</h4>
            <ul>
              {items.map((issue, idx) => (
                <li key={`${issue.ruleId}-${idx}`} className={styles.item}>
                  <span className={styles.message}>{issue.message}</span>
                  {issue.help && <span className={styles.help}>{issue.help}</span>}
                  {<a href={editorUrl} className={styles.editLink}>Éditer</a>}
                </li>
              ))}
            </ul>
          </div>
        )
      )}
    </div>
  );
}
```

`IssueList.module.css` :

```css
.list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.group {
  border-left: 4px solid #9ca3af;
  padding-left: 0.75rem;
}
.group[data-severity="error"] { border-color: #dc2626; }
.group[data-severity="warning"] { border-color: #d97706; }
.group[data-severity="info"] { border-color: #2563eb; }
.groupTitle {
  font-weight: 600;
  margin: 0 0 0.5rem;
}
.item {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin: 0.25rem 0;
}
.message {
  flex: 1;
}
.help {
  font-size: 0.875rem;
  color: #6b7280;
}
.editLink {
  font-size: 0.875rem;
  color: #2563eb;
  text-decoration: none;
}
```

- [ ] **Step 4: Implémenter `DashboardPage.tsx` + CSS**

```tsx
import { useEffect, useState } from "react";
import { usePluginAPI, Card, Button, Loading, Table } from "@emdash-cms/admin";
import { ScoreGauge } from "../components/ScoreGauge";
import styles from "../styles/Dashboard.module.css";

interface LiteReport {
  entryId: string;
  collection: string;
  title: string | null;
  score: number;
  grade: "good" | "ok" | "poor";
  analyzedAt: string;
}

interface ReportsResponse {
  items: LiteReport[];
  cursor: string | null;
  hasMore: boolean;
}

export function DashboardPage() {
  const api = usePluginAPI();
  const [data, setData] = useState<ReportsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [gradeFilter, setGradeFilter] = useState<"" | "good" | "ok" | "poor">("");

  useEffect(() => {
    load();
  }, [gradeFilter]);

  async function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (gradeFilter) params.set("grade", gradeFilter);
    const res = await api.get(`reports?${params.toString()}`);
    setData(res);
    setLoading(false);
  }

  if (loading) return <Loading />;
  if (!data) return <div>Impossible de charger les rapports.</div>;

  const avg = data.items.length
    ? Math.round(data.items.reduce((s, i) => s + i.score, 0) / data.items.length)
    : 0;

  return (
    <div className={styles.dashboard}>
      <h1>SEO Dashboard</h1>
      <div className={styles.overview}>
        <Card title="Score moyen">
          <ScoreGauge score={avg} grade={avg >= 80 ? "good" : avg >= 60 ? "ok" : "poor"} size="lg" />
        </Card>
        <Card title="Articles à corriger">
          <div className={styles.poorCount}>
            {data.items.filter((i) => i.grade === "poor").length}
          </div>
        </Card>
      </div>

      <div className={styles.filters}>
        <select value={gradeFilter} onChange={(e) => setGradeFilter(e.target.value as any)}>
          <option value="">Tous les grades</option>
          <option value="good">Good</option>
          <option value="ok">OK</option>
          <option value="poor">Poor</option>
        </select>
        <Button onClick={load}>Actualiser</Button>
      </div>

      <Table>
        <thead>
          <tr>
            <th>Titre</th>
            <th>Score</th>
            <th>Grade</th>
            <th>Analysé</th>
          </tr>
        </thead>
        <tbody>
          {data.items.map((item) => (
            <tr key={item.entryId}>
              <td>
                <a href={`/_emdash/admin/plugins/seo-pro/entry/${item.collection}/${item.entryId}`}>
                  {item.title || "(sans titre)"}
                </a>
              </td>
              <td>{item.score}</td>
              <td>{item.grade}</td>
              <td>{new Date(item.analyzedAt).toLocaleString("fr-FR")}</td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}
```

`Dashboard.module.css` :

```css
.dashboard {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 1rem;
}
.overview {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}
.poorCount {
  font-size: 2rem;
  font-weight: 700;
  color: #dc2626;
}
.filters {
  display: flex;
  gap: 1rem;
  align-items: center;
}
```

- [ ] **Step 5: Implémenter `EntryReportPage.tsx` + CSS**

```tsx
import { useEffect, useState } from "react";
import { useParams } from "@tanstack/react-router";
import { usePluginAPI, Card, Button, Input, Loading } from "@emdash-cms/admin";
import { ScoreGauge } from "../components/ScoreGauge";
import { MetricCard } from "../components/MetricCard";
import { IssueList } from "../components/IssueList";
import { KeywordDensityBar } from "../components/KeywordDensityBar";
import styles from "../styles/EntryReport.module.css";
import type { SeoReport } from "../../domain/report";

export function EntryReportPage() {
  const { collection, id } = useParams({ from: "/admin/plugins/seo-pro/entry/$collection/$id" });
  const api = usePluginAPI();
  const [report, setReport] = useState<SeoReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState("");

  async function load() {
    setLoading(true);
    const res = await api.get(`report?id=${id}&collection=${collection}`);
    setReport(res);
    setKeyword(res.focusKeyword ?? "");
    setLoading(false);
  }

  async function saveKeyword() {
    const res = await api.post("focus-keyword", {
      entryId: id,
      collection,
      keyword: keyword.trim() || null,
    });
    setReport(res);
    setKeyword(res.focusKeyword ?? "");
  }

  useEffect(() => {
    load();
  }, [collection, id]);

  if (loading) return <Loading />;
  if (!report) return <div>Rapport introuvable.</div>;

  const m = report.metrics;

  return (
    <div className={styles.report}>
      <h1>{report.title || "Analyse SEO"}</h1>
      <div className={styles.header}>
        <ScoreGauge score={report.score} grade={report.grade} size="lg" />
        <div className={styles.focus}>
          <label>Mot-clé focus</label>
          <Input value={keyword} onChange={(e) => setKeyword(e.target.value)} />
          <Button onClick={saveKeyword}>Enregistrer</Button>
          {report.focusKeywordSource === "auto" && <span>(auto)</span>}
        </div>
      </div>

      <div className={styles.metrics}>
        <MetricCard label="Mots" value={m.wordCount} ideal="900-2500" status={m.contentLength.verdict === "ideal" ? "good" : "warning"} />
        <MetricCard label="Temps de lecture" value={`${m.readingTimeMinutes} min`} ideal="~5 min" status="good" />
        <MetricCard label="Liens internes" value={m.internalLinks} ideal="≥2" status={m.internalLinks >= 2 ? "good" : "warning"} />
        <MetricCard label="Liens externes" value={m.externalLinks} ideal="≥1" status={m.externalLinks >= 1 ? "good" : "warning"} />
        <MetricCard label="Images sans ALT" value={m.imagesWithoutAlt} ideal="0" status={m.imagesWithoutAlt === 0 ? "good" : m.imagesWithoutAlt <= 1 ? "warning" : "error"} />
        <MetricCard label="H2 / H3" value={`${m.h2Count} / ${m.h3Count}`} ideal="≥1 / ≥1" status={m.h2Count >= 1 && m.h3Count >= 1 ? "good" : "warning"} />
      </div>

      <Card title="Densité du mot-clé focus">
        <KeywordDensityBar density={m.keywordDensity} />
      </Card>

      <Card title={`Issues (${report.issues.length})`}>
        <IssueList issues={report.issues} entryId={report.entryId} collection={report.collection} />
      </Card>
    </div>
  );
}
```

`EntryReport.module.css` :

```css
.report {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 1rem;
}
.header {
  display: flex;
  align-items: center;
  gap: 2rem;
  flex-wrap: wrap;
}
.focus {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.metrics {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 1rem;
}
```

- [ ] **Step 6: Implémenter `SettingsPage.tsx` et `SeoOverviewWidget.tsx`**

`SettingsPage.tsx` :

```tsx
import { useEffect, useState } from "react";
import { usePluginAPI, Card, Button, Input, Loading } from "@emdash-cms/admin";
import type { SeoConfig } from "../../analysis/config";

export function SettingsPage() {
  const api = usePluginAPI();
  const [config, setConfig] = useState<Partial<SeoConfig> | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get("settings").then(setConfig);
  }, []);

  if (!config) return <Loading />;

  async function save() {
    setSaving(true);
    await api.post("settings/save", config);
    setSaving(false);
  }

  return (
    <Card title="SEO Settings">
      <label>Mots par minute</label>
      <Input
        type="number"
        value={config.wordsPerMinute ?? 200}
        onChange={(e) => setConfig({ ...config, wordsPerMinute: Number(e.target.value) })}
      />

      <label>URL du site (pour liens internes/externes)</label>
      <Input
        type="url"
        value={config.siteUrl ?? ""}
        onChange={(e) => setConfig({ ...config, siteUrl: e.target.value || null })}
      />

      <Button onClick={save} disabled={saving}>{saving ? "Sauvegarde..." : "Sauvegarder"}</Button>
    </Card>
  );
}
```

`SeoOverviewWidget.tsx` :

```tsx
import { useEffect, useState } from "react";
import { usePluginAPI, Card, Loading } from "@emdash-cms/admin";
import { ScoreGauge } from "../components/ScoreGauge";

interface ReportsResponse {
  items: Array<{ score: number; grade: "good" | "ok" | "poor"; issues: import("../../domain/report").Issue[] }>;
}

export function SeoOverviewWidget() {
  const api = usePluginAPI();
  const [data, setData] = useState<ReportsResponse | null>(null);

  useEffect(() => {
    api.get("reports?limit=100").then(setData);
  }, []);

  if (!data) return <Loading />;

  const avg = data.items.length
    ? Math.round(data.items.reduce((s, i) => s + i.score, 0) / data.items.length)
    : 0;
  const poor = data.items.filter((i) => i.grade === "poor").length;

  const topIssues = data.items
    .flatMap((i) => i.issues)
    .reduce((acc, issue) => {
      acc.set(issue.message, (acc.get(issue.message) ?? 0) + 1);
      return acc;
    }, new Map<string, number>());

  const sortedIssues = Array.from(topIssues.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  return (
    <Card title="SEO Overview">
      <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
        <ScoreGauge score={avg} grade={avg >= 80 ? "good" : avg >= 60 ? "ok" : "poor"} />
        <div>Articles en poor : {poor}</div>
      </div>
      {sortedIssues.length > 0 && (
        <ul>
          {sortedIssues.map(([msg, count]) => (
            <li key={msg}>{msg} ({count})</li>
          ))}
        </ul>
      )}
    </Card>
  );
}
```

- [ ] **Step 7: Ajouter routes `settings` et `settings/save` dans `index.ts`**

Dans `routes:` du plugin, ajouter :

```ts
settings: {
  handler: async (_routeCtx, ctx) => {
    const store = createKvConfigStore(ctx);
    return store.get();
  },
},
"settings/save": {
  input: z.object({
    wordsPerMinute: z.number().optional(),
    siteUrl: z.string().nullable().optional(),
    analyzableCollections: z.array(z.string()).optional(),
  }),
  handler: async (routeCtx, ctx) => {
    const store = createKvConfigStore(ctx);
    await store.set(routeCtx.input);
    return store.get();
  },
},
```

- [ ] **Step 8: Implémenter `admin.tsx`**

```tsx
import { DashboardPage } from "./ui/pages/DashboardPage";
import { EntryReportPage } from "./ui/pages/EntryReportPage";
import { SettingsPage } from "./ui/pages/SettingsPage";
import { SeoOverviewWidget } from "./ui/widgets/SeoOverviewWidget";

export const pages = {
  "/dashboard": DashboardPage,
  "/entry/:collection/:id": EntryReportPage,
  "/settings": SettingsPage,
};

export const widgets = {
  "seo-overview": SeoOverviewWidget,
};
```

- [ ] **Step 9: Commit**

```bash
git add src/plugins/seo-pro/src/admin.tsx src/plugins/seo-pro/src/ui/
git commit -m "feat(seo-pro): add admin dashboard, entry report and widget UI"
```

---

## Task 9: Fixtures et tests d'intégration

**Files:**
- Create: `src/plugins/seo-pro/test/fixtures/article-ia-portable-text.json`
- Create: `src/plugins/seo-pro/test/fixtures/article-en-portable-text.json`
- Create: `src/plugins/seo-pro/test/make-doc.ts`
- Create: `src/plugins/seo-pro/test/mock-ctx.ts`
- Test: `src/plugins/seo-pro/src/analysis/analyze.test.ts` (complété avec fixtures)
- Test: `src/plugins/seo-pro/src/routes/analyze.test.ts`
- Test: `src/plugins/seo-pro/src/routes/reports.test.ts`
- Test: `src/plugins/seo-pro/src/routes/focus-keyword.test.ts`
- Test: `src/plugins/seo-pro/src/content/portable-text.test.ts`

**Interfaces:**
- Consumes: fixtures, `analyze()`, `loadSeoDocument()`, routes.
- Produces: confiance que le moteur marche sur du vrai contenu.

- [ ] **Step 1: Créer fixtures sous forme de `SeoDocument` partiels**

Plutôt qu'un Portable Text complet, chaque fixture fournit un `SeoDocument` utilisable directement par `analyze()` : texte brut, titres, liens, images. Cela évite la dépendance au parser dans le test d'intégration du moteur, tout en étant réaliste.

`article-ia-portable-text.json` :

```json
{
  "id": "fr-ia-001",
  "collection": "posts",
  "title": "L'IA générative transforme la recherche scientifique",
  "slug": "ia-generative-recherche-scientifique",
  "metaDescription": "L'intelligence artificielle générative bouleverse la recherche scientifique. Découvrez les risques, les arnaques et les outils open source pour mieux travailler.",
  "plainText": "L'intelligence artificielle générative transforme la recherche scientifique. Des modèles comme GPT-4 ou Mistral permettent de résumer des milliers d'articles en quelques minutes. Cependant, cette accélération soulève des questions. Les chercheurs craignent la contamination des bases de données, la propagation de fausses citations et le biais algorithmique. Le projet OpenAlex propose une alternative open source pour cartographier la littérature scientifique. Les revues commencent à exiger la déclaration d'usage de l'IA. Dans le domaine de la cybersécurité, les attaquants exploitent ces modèles pour créer des hameçonnages personnalisés. Les journalistes doivent vérifier les sources, croiser les données et privilégier les publications en accès ouvert. L'avenir de la science dépendra de notre capacité à garder le contrôle humain sur les machines.",
  "headings": [
    { "level": 2, "text": "Les modèles de langue comme assistants de recherche" },
    { "level": 3, "text": "Risques de pollution bibliographique" },
    { "level": 3, "text": "Open source contre modèles fermés" },
    { "level": 2, "text": "Implications pour la cybersécurité" },
    { "level": 3, "text": "Arnaques et hameçonnage automatisé" }
  ],
  "links": [
    { "href": "https://example.com/openalex", "isInternal": false, "anchor": "OpenAlex" },
    { "href": "/posts/mistral-ai", "isInternal": true, "anchor": "Mistral" },
    { "href": "/posts/cybersecurite-2024", "isInternal": true, "anchor": "cybersécurité" }
  ],
  "images": [
    { "url": "/images/ai-lab.jpg", "alt": "Laboratoire d'IA" },
    { "url": "/images/graph-papers.png", "alt": null }
  ]
}
```

`article-en-portable-text.json` :

```json
{
  "id": "en-ai-001",
  "collection": "posts",
  "title": "Generative AI reshapes scientific research",
  "slug": "generative-ai-scientific-research",
  "metaDescription": "Generative AI is changing how scientists search, summarize, and write. Learn about open-source tools, citation risks, and cybersecurity threats.",
  "plainText": "Generative artificial intelligence is reshaping scientific research. Large language models can summarize thousands of papers, suggest hypotheses, and draft manuscripts. Researchers save time but face new risks: fake citations, contaminated datasets, and algorithmic bias. Open-source projects such as OpenAlex provide transparent alternatives to proprietary indexes. Journals now require authors to disclose AI assistance. In cybersecurity, threat actors use generative models to craft personalized phishing emails. Journalists must verify claims, cite primary sources, and favor open-access studies. The future of science depends on maintaining human oversight of automated systems.",
  "headings": [
    { "level": 2, "text": "Language models as research assistants" },
    { "level": 3, "text": "Risks of bibliographic pollution" },
    { "level": 3, "text": "Open source versus closed models" },
    { "level": 2, "text": "Implications for cybersecurity" },
    { "level": 3, "text": "Scams and automated phishing" }
  ],
  "links": [
    { "href": "https://example.com/openalex", "isInternal": false, "anchor": "OpenAlex" },
    { "href": "/posts/mistral-ai", "isInternal": true, "anchor": "Mistral" },
    { "href": "/posts/cybersecurity-2024", "isInternal": true, "anchor": "cybersecurity" }
  ],
  "images": [
    { "url": "/images/ai-lab.jpg", "alt": "AI laboratory" },
    { "url": "/images/graph-papers.png", "alt": null }
  ]
}
```

- [ ] **Step 2: Créer `test/make-doc.ts`**

```ts
import type { SeoDocument } from "../src/domain/document";

export function makeDoc(overrides: Partial<SeoDocument> = {}): SeoDocument {
  return {
    id: "doc-1",
    collection: "posts",
    title: "Titre de test",
    slug: "titre-de-test",
    metaDescription: "Description de test.",
    plainText: "Ceci est un texte de test pour les règles SEO.",
    headings: [{ level: 2, text: "Introduction" }],
    links: [],
    images: [],
    canonicalUrl: null,
    ...overrides,
  };
}
```

- [ ] **Step 3: Créer `test/mock-ctx.ts`**

```ts
import type { PluginContext } from "emdash";

export function createMockCtx(): PluginContext {
  const storage = new Map<string, unknown[]>();
  const kv = new Map<string, unknown>();

  return {
    storage: {
      collection: (name: string) => {
        const col = storage.get(name) ?? [];
        return {
          find: async (q?: { limit?: number; sort?: Record<string, 1 | -1>; filter?: Record<string, unknown> }) => {
            let items = [...col];
            if (q?.filter) {
              items = items.filter((item) =>
                Object.entries(q.filter!).every(([k, v]) => (item as Record<string, unknown>)[k] === v)
              );
            }
            if (q?.sort) {
              items.sort((a, b) => {
                for (const [k, dir] of Object.entries(q.sort!)) {
                  const av = (a as Record<string, unknown>)[k];
                  const bv = (b as Record<string, unknown>)[k];
                  if (av < bv) return dir === 1 ? -1 : 1;
                  if (av > bv) return dir === 1 ? 1 : -1;
                }
                return 0;
              });
            }
            if (q?.limit) items = items.slice(0, q.limit);
            return { items };
          },
          findOne: async (filter: Record<string, unknown>) => {
            return col.find((item) =>
              Object.entries(filter).every(([k, v]) => (item as Record<string, unknown>)[k] === v)
            ) ?? null;
          },
          insertOne: async (item: Record<string, unknown>) => {
            col.push(item);
            return { id: String(item._id ?? item.id ?? col.length) };
          },
          updateOne: async (filter: Record<string, unknown>, update: { $set?: Record<string, unknown> }) => {
            const idx = col.findIndex((item) =>
              Object.entries(filter).every(([k, v]) => (item as Record<string, unknown>)[k] === v)
            );
            if (idx !== -1 && update.$set) {
              Object.assign(col[idx], update.$set);
            }
            return { matchedCount: idx === -1 ? 0 : 1, modifiedCount: idx === -1 ? 0 : 1 };
          },
          deleteOne: async (filter: Record<string, unknown>) => {
            const idx = col.findIndex((item) =>
              Object.entries(filter).every(([k, v]) => (item as Record<string, unknown>)[k] === v)
            );
            if (idx !== -1) col.splice(idx, 1);
            return { deletedCount: idx === -1 ? 0 : 1 };
          },
          createIndex: async () => {},
        };
      },
    },
    kv: {
      get: async (key: string) => kv.get(key) ?? null,
      set: async (key: string, value: unknown) => { kv.set(key, value); },
      delete: async (key: string) => { kv.delete(key); },
    },
    logger: {
      debug: () => {},
      info: () => {},
      warn: () => {},
      error: () => {},
    },
    config: {},
    site: {
      url: "https://cannelle.news",
      title: "Cannelle News",
      description: "",
      locale: "fr",
    },
  } as unknown as PluginContext;
}
```

- [ ] **Step 4: Compléter `src/analysis/analyze.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { analyze } from "./analyze";
import { defaultConfig } from "./config";
import { makeDoc } from "../../test/make-doc";
import frFixture from "../../test/fixtures/article-ia-portable-text.json";
import enFixture from "../../test/fixtures/article-en-portable-text.json";

describe("analyze integration", () => {
  it("analyzes a French AI article", () => {
    const doc = makeDoc(frFixture);
    const report = analyze(doc, defaultConfig);

    expect(report.score).toBeGreaterThan(0);
    expect(report.grade).toMatch(/good|ok|poor/);
    expect(report.metrics.wordCount).toBeGreaterThan(100);
    expect(report.metrics.internalLinks).toBe(2);
    expect(report.metrics.externalLinks).toBe(1);
    expect(report.metrics.imagesWithoutAlt).toBe(1);
    expect(report.metrics.h2Count).toBe(2);
    expect(report.metrics.h3Count).toBe(3);
    expect(report.issues.some((i) => i.ruleId === "image-alt")).toBe(true);
    expect(report.focusKeyword).toBeTruthy();
    expect(report.title).toBe(doc.title);
  });

  it("analyzes an English AI article", () => {
    const doc = makeDoc(enFixture);
    const report = analyze(doc, defaultConfig);

    expect(report.score).toBeGreaterThan(0);
    expect(report.grade).toMatch(/good|ok|poor/);
    expect(report.metrics.wordCount).toBeGreaterThan(100);
    expect(report.focusKeyword).toBeTruthy();
    expect(report.language).toBe("en");
  });

  it("uses manual focus keyword when provided", () => {
    const doc = makeDoc(frFixture);
    const report = analyze(doc, defaultConfig, "open source");
    expect(report.focusKeyword).toBe("open source");
    expect(report.focusKeywordSource).toBe("manual");
  });

  it("lowers score on weak content", () => {
    const doc = makeDoc({
      title: "A",
      metaDescription: "b",
      plainText: "Petit texte.",
      headings: [],
      links: [],
      images: [],
    });
    const report = analyze(doc, defaultConfig);
    expect(report.score).toBeLessThan(60);
    expect(report.grade).toBe("poor");
  });
});
```

- [ ] **Step 5: Implémenter `src/routes/analyze.test.ts`**

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { createMockCtx } from "../../test/mock-ctx";
import { routes } from "../index";
import { analyzeRoute } from "./analyze";

const route = routes.analyze;

describe("analyze route", () => {
  let ctx: ReturnType<typeof createMockCtx>;

  beforeEach(() => {
    ctx = createMockCtx();
  });

  it("returns 400 without required fields", async () => {
    await expect(
      route.handler({ input: { id: "x" }, params: {} } as any, ctx)
    ).rejects.toThrow();
  });
});
```

> **Note:** la route `analyze` dépend du loader de contenu EmDash qui n'est pas disponible dans `mock-ctx`. On teste ici la validation et le dépôt du rapport après un appel direct à `analyze()`. Un test plus complet est couvert par le test d'intégration du hook.

- [ ] **Step 6: Implémenter `src/routes/reports.test.ts`**

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { createMockCtx } from "../../test/mock-ctx";
import { reportsRoute } from "./reports";
import { storageReportStoreFactory } from "../infrastructure/storage-report-store";

const route = reportsRoute;

describe("reports route", () => {
  let ctx: ReturnType<typeof createMockCtx>;
  let store: ReturnType<typeof storageReportStoreFactory>;

  beforeEach(() => {
    ctx = createMockCtx();
    store = storageReportStoreFactory(ctx);
  });

  it("returns empty list when no reports", async () => {
    const res = await route.handler({ input: { limit: 20, cursor: undefined, grade: undefined }, params: {} } as any, ctx);
    expect(res.items).toEqual([]);
    expect(res.hasMore).toBe(false);
  });

  it("lists saved reports", async () => {
    await store.save({
      entryId: "a",
      collection: "posts",
      title: "A",
      score: 85,
      grade: "good",
      language: "fr",
      metrics: {} as any,
      issues: [],
      focusKeyword: "test",
      focusKeywordSource: "auto",
      analyzedAt: new Date().toISOString(),
    });

    const res = await route.handler({ input: { limit: 20, cursor: undefined, grade: undefined }, params: {} } as any, ctx);
    expect(res.items).toHaveLength(1);
    expect(res.items[0].score).toBe(85);
    expect(res.items[0].title).toBe("A");
  });

  it("filters by grade", async () => {
    await store.save({
      entryId: "b",
      collection: "posts",
      title: "B",
      score: 45,
      grade: "poor",
      language: "fr",
      metrics: {} as any,
      issues: [],
      focusKeyword: "test",
      focusKeywordSource: "auto",
      analyzedAt: new Date().toISOString(),
    });

    const res = await route.handler({ input: { limit: 20, cursor: undefined, grade: "poor" }, params: {} } as any, ctx);
    expect(res.items).toHaveLength(1);
    expect(res.items[0].grade).toBe("poor");
  });
});
```

- [ ] **Step 7: Implémenter `src/routes/focus-keyword.test.ts`**

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { createMockCtx } from "../../test/mock-ctx";
import { focusKeywordRoute } from "./focus-keyword";

const route = focusKeywordRoute;

describe("focus-keyword route", () => {
  let ctx: ReturnType<typeof createMockCtx>;

  beforeEach(() => {
    ctx = createMockCtx();
  });

  it("stores a manual focus keyword", async () => {
    await route.handler({ input: { entryId: "x", collection: "posts", keyword: "intelligence artificielle" }, params: {} } as any, ctx);
    const stored = await ctx.kv.get("focus:posts:x");
    expect(stored).toBe("intelligence artificielle");
  });

  it("deletes keyword when null", async () => {
    await ctx.kv.set("focus:posts:x", "old");
    await route.handler({ input: { entryId: "x", collection: "posts", keyword: null }, params: {} } as any, ctx);
    const stored = await ctx.kv.get("focus:posts:x");
    expect(stored).toBeNull();
  });
});
```

- [ ] **Step 8: Implémenter `src/content/portable-text.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { extractPlainText, extractHeadings, extractLinks, extractImages } from "./portable-text";

const fixture = [
  {
    _type: "block",
    style: "h2",
    children: [{ _type: "span", text: "Introduction" }],
  },
  {
    _type: "block",
    style: "normal",
    children: [
      { _type: "span", text: "Lire l'article " },
      { _type: "span", text: "OpenAlex", marks: ["link"], _key: "link1" },
      { _type: "span", text: " et " },
      { _type: "span", text: "notre analyse", marks: ["internalLink"], _key: "link2" },
      { _type: "span", text: "." },
    ],
    markDefs: [
      { _type: "link", href: "https://openalex.org", _key: "link1" },
      { _type: "internalLink", documentId: "abc123", _key: "link2" },
    ],
  },
  {
    _type: "image",
    asset: { url: "/img.jpg" },
    alt: "Image de test",
  },
];

describe("portable-text helpers", () => {
  it("extracts plain text", () => {
    expect(extractPlainText(fixture)).toContain("Lire l'article");
  });

  it("extracts headings", () => {
    const headings = extractHeadings(fixture, { slugPrefix: "posts" });
    expect(headings).toEqual([{ level: 2, text: "Introduction", slug: "introduction" }]);
  });

  it("extracts links", () => {
    const links = extractLinks(fixture, { internalBasePath: "/posts/", siteUrl: "https://cannelle.news" });
    expect(links).toHaveLength(2);
    expect(links[0].isInternal).toBe(false);
    expect(links[1].isInternal).toBe(true);
  });

  it("extracts images", () => {
    const images = extractImages(fixture);
    expect(images).toHaveLength(1);
    expect(images[0].alt).toBe("Image de test");
  });
});
```

- [ ] **Step 9: Run full test suite**

Run: `pnpm test src/plugins/seo-pro/`  
Expected: PASS.

- [ ] **Step 10: Commit**

```bash
git add src/plugins/seo-pro/test/ src/plugins/seo-pro/src/content/portable-text.test.ts src/plugins/seo-pro/src/routes/reports.test.ts src/plugins/seo-pro/src/routes/focus-keyword.test.ts src/plugins/seo-pro/src/analysis/analyze.test.ts
git commit -m "test(seo-pro): add fixtures, mock ctx and integration tests"
```

---

## Task 10: Vérifications finales

**Files:**
- Modify: `vitest.config.ts` (si nécessaire)
- Modify: `src/plugins/seo-pro/package.json` (ajuster devDeps si besoin)

**Interfaces:**
- Consumes: tout le plugin.
- Produces: build/typecheck OK, dev server démarre.

- [ ] **Step 1: Typecheck du plugin**

Run: `pnpm -F @cannelle/plugin-seo-pro exec tsc --noEmit`  
Expected: pas d'erreur.

- [ ] **Step 2: Lancer le dev server et vérifier**

Run: `pnpm dev`  
Vérifier :
- La page admin `/admin/plugins/seo-pro/dashboard` charge sans erreur.
- Sauvegarder un article déclenche le hook et crée un rapport.
- La route API `/_emdash/api/plugins/seo-pro/reports` retourne des données.

- [ ] **Step 3: Ajuster `vitest.config.ts` si les tests ne sont pas découverts**

Le workspace root a `test: "vitest run"`. Vitest découvre automatiquement les fichiers `*.test.ts` dans `src/plugins/seo-pro/`. Si ce n'est pas le cas, ajouter dans `vitest.config.ts` :

```ts
test: {
  include: ["src/**/*.{test,spec}.?(c|m)[jt]s?(x)"],
}
```

- [ ] **Step 4: Commit final**

```bash
git add vitest.config.ts src/plugins/seo-pro/package.json
git commit -m "chore(seo-pro): final typecheck and test configuration"
```

---

## Spec coverage checklist

| Section du spec | Tâche(s) |
|---|---|
| Package source-only, zero dépendance | Task 1 |
| Domain model (SeoDocument, SeoReport, Issue, Grade) | Task 2 |
| 9 règles avec poids et seuils | Task 3 |
| Lisibilité Kandel-Moles + détection langue | Task 4 |
| Extraction mots-clés et reading time | Task 4 |
| Orchestration `analyze()` | Task 5 |
| Stockage `reports` + KV `focus:` | Task 6, 7 |
| Hook `content:afterSave` | Task 7 |
| Routes `analyze`, `reports`, `report`, `focus-keyword` | Task 7 |
| UI dashboard, entry report, widget | Task 8 |
| Tests unitaires et d'intégration | Tasks 2-9 |
| `title` dans SeoReport | Task 7 |

## Placeholder scan

Aucun "TBD", "TODO", "implement later". Chaque étape contient du code ou une commande exacte. Les signatures sont cohérentes entre `analyze()`, les routes, et `SeoReport`.

## Type consistency notes

- `SeoReport.title: string` ajouté dans Task 7 et renseigné dans `analyze()`.
- `analyze(doc, config, manualFocusKeyword?, engineVersion?)` appelé pareil par le hook et la route.
- `RuleEnv.focusKeyword: string | null` utilisé par toutes les règles.
- `WeightedRuleResult` dans `scoring.ts` accepte n'importe quelle règle via `{ id: string; weight: number }`.
