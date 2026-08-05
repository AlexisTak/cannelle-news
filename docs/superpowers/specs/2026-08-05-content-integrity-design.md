# Content Integrity — plugin anti-plagiat pour Cannelle News

**Date :** 2026-08-05
**Statut :** design validé, en attente d'implémentation
**Auteur(s) :** Claude (développeur senior TypeScript)
**Branche :** `feat/content-integrity`
**Plugin id :** `content-integrity`
**Package :** `@cannelle/plugin-content-integrity`

---

## 1. Contexte et objectif

Cannelle News produit des articles de presse. Trois questions se posent, que la rédaction adresse aujourd'hui par l'intuition ou par des services externes coûteux :

1. **Auto-plagiat** — un article en cours de rédaction réutilise-t-il un paragraphe d'archive ou une dépêche antérieure ?
2. **Doublons internes** — deux articles disent-ils la même chose sans qu'aucun ne signale l'autre ? (archives, reprise de communiqué, recyclage de brève)
3. **Vol entrant** — un confrère a-t-il repris notre texte sans nous citer ? (hors périmètre phase 1)
4. **Plagiat entrant** — ce brouillon reprend-il un texte existant ? (hors périmètre phase 1)

Les trois opérations se ramènent au même acte : **mesurer le recouvrement textuel entre un document et un corpus, et localiser les passages responsables**. Le plan initial (`plan_anti-plagia.md`, 2026-08-04) a arrêté l'architecture. Cette spec en est la déclinaison phase 1.

### Trois leçons du audit du dépôt

Trois findings du `audit.md` (2026-08-04) guident la conception :

- **SEC-6** — aucune route plugin ne déclare `permission`. Toutes les routes de la rédaction finissent par exiger `plugins:manage` (droit d'installer des plugins). Corrigé d'office ici.
- **SEC-1 / SEC-5** — `targetUrl` doit être assaini **à l'écriture**, pas au rendu. La défense au rendu a déjà été contournée trois fois. Phase 1 importe `safe-href.ts` du plugin `glossary-cards`.
- **OPT-1 / OPT-4 / OPT-5** — l'anti-pattern « charger tout, filtrer en mémoire » revient trois fois dans le workspace. Le plugin ne reproduit **jamais** ce motif.

### Règle qui prime sur toutes les autres

**Le plugin ne doit jamais empêcher un rédacteur d'écrire, d'enregistrer ou de publier.** Aucune action éditoriale n'est conditionnée par un constat. Tout est consultatif : routes, widgets, page admin. Pas de hook `beforePublish` (n'existe pas dans EmDash 0.30), pas de verrou, pas de relit automatique. Sans cette discipline, l'outil meurt d'indifférence en deux semaines.

---

## 2. Portée

### 2.1 Inclus — phase 1

- Indexation des articles de la collection `posts` (publiés uniquement) par hooks `content:*`.
- Empreinte MinHash + LSH stockée dans `ctx.storage`. Récupération des candidats en **une** requête sur colonne indexée.
- Trois modules purs sans dépendance EmDash : `text/`, `fingerprint/`, `compare/`. Tests Vitest colocalisés, sans mock.
- Quatre collections storage : `fingerprints`, `bands`, `matches`, `watch` (cette dernière vide en phase 1).
- Six routes : `check`, `matches`, `match`, `review`, `rebuild`, `settings`. Chacune déclare sa `permission`.
- Page admin `/integrity` (onglets Constats / Paramètres).
- Widget de tableau de bord (compteur de constats `new` + plus grave des 7 j).
- Widget de champ consultatif sur l'éditeur d'article.
- KV `settings:integrityConfig` + `settings:shingleDf` (fréquence documentaire).
- Critère de sortie : < 5 % de faux positifs sur le **golden set** (4 cas « NE DOIT PAS sortir »).

### 2.2 Exclu — phase 1 (mais documenté)

- **Filtre dépêches d'agence** (AFP, Reuters, etc.). Le schéma Sanity `posts` n'a pas de champ de source. Distinct des cas « citation » et « boilerplate maison ». Reporté hors phase 1.
- **Collections `pages` et `glossary`** dans le corpus. Risque de bruit (pages trop courtes) sans gain éditorial distinct. Pourront rejoindre en phase 1bis si besoin.
- **Phase 2 — entrant.** Rédacteur colle/colle-URL sa source, comparaison à son propre corpus + aux sources. La décision « colle/colle-URL » (plan §8.2) est prise dans un cycle dédié.
- **Phase 3 — sortant.** Cron quotidien, phrases-sondes les plus distinctives, Brave/SerpAPI, dossier de preuve. Exige `network:request` + clé + `email:send`.
- **Embeddings / modèles.** Coût CPU Worker + score non explicable.
- **Verrou de publication.** Pas de hook `beforePublish` (n'existe pas). Et c'est bien.
- **Crawl web.** On interroge des moteurs, on ne parcourt pas.
- **Envoi automatique de mise en demeure.** Le plugin rassemble la preuve ; l'action reste humaine.
- **Apprentissage** (faux positifs/négatifs confirmés). Phase 2+.
- **JSON-LD ou `set:html` exotiques.** Phase 1 = admin uniquement, aucune modification des pages publiques.

---

## 3. Contraintes

### 3.1 Contraintes du dépôt

- **Plugin natif source-only.** Comme les 5 plugins existants (`seo-pro`, `auto-internal-linker`, `glossary-cards`, `ai-editorial-assistant`, `research-paper-embed`). Format `native`, `entrypoint: @cannelle/plugin-content-integrity`, `adminEntry: @cannelle/plugin-content-integrity/admin`. Pas de `dist/`.
- **Pas de dépendance runtime ajoutée.** `zod` (transit via les autres plugins) + peers existantes (`emdash`, `react`, `@emdash-cms/admin`). Murmur3 plus rapide mais non justifié.
- **Architecture hexagonale.** `text/`, `fingerprint/`, `compare/`, `domain/` ignorent qu'EmDash existe. `infrastructure/` est la seule frontière. Tests unitaires = chaînes en dur, sans mock.
- **Tests Vitest colocalisés** (`*.test.ts`), `createMockCtx()` réutilisable depuis `seo-pro/test/` et `auto-internal-linker/test/`.
- **UI admin avec `@emdash-cms/admin`** et CSS Modules scopés. Pas de Tailwind, pas de Radix.
- **Workspace pnpm monorepo.** `package.json` avec `"name": "@cannelle/plugin-content-integrity"`, déclaration dans `pnpm-workspace.yaml` (déjà OK).
- **TS strict, pas de `any` implicite.**

### 3.2 Contraintes découvertes dans EmDash 0.30

Ces lectures du code ont dicté l'architecture. Consignées ici car non publiques.

- **`ctx.storage.where` n'accepte que des champs indexés.** `node_modules/emdash/src/plugins/storage-query.ts:79`. Tout index composé est déclaré dans `storage.<collection>.indexes`. Pas de `store.all()`.
- **Hooks contenu disponibles** : `beforeSave`, `afterSave`, `afterPublish`, `afterUnpublish`, `beforeDelete`, `afterDelete`, `afterRestore`. **Pas de `beforePublish`.** Le contrôle est donc consultatif, jamais verrou (`emdash/src/plugins/types.ts`).
- **`allowedHosts` figé à la construction du contexte.** `node_modules/emdash/dist/context-B6hc7zJL.mjs:790`. Récupérer une URL arbitraire exige `network:request:unrestricted`. N/A phase 1.
- **Permission par défaut d'une route plugin : `plugins:manage`.** `astro/routes/api/plugins/[pluginId]/[...path].ts:32`. Chaque route **doit** déclarer sa permission.
- **Widget de champ : props limitées.** `@emdash-cms/admin/dist/index.js:14456` (`FieldRenderer`) ne passe que `{ value, onChange, label, id, required, options, minimal }`. Pas d'accès au corps Portable Text ni à `entryId`. Le widget de champ doit :
  - tirer l'`entryId` de `useLocation()` (URL de l'éditeur),
  - appeler la route `check` pour lire le contenu côté serveur.
- **Crible CSRF.** Routes plugin exigent `X-EmDash-Request: 1` (`_...path_.mjs:38`). `apiFetch` de `@emdash-cms/admin` l'ajoute. Pas de `fetch` nu.
- **Budget CPU Worker borné, D1 paginé.** Cloudflare. Pas de travail O(corpus) dans une requête. Reconstruction par curseur.

### 3.3 Convention de nommage

Identique aux plugins existants : `PLUGIN_ID`, `PLUGIN_VERSION`, `createPlugin()`, `*Plugin()` factory. Pas de préfixe `Content` redondant dans les noms internes — `text/`, `fingerprint/`, `compare/`.

---

## 4. Architecture

### 4.1 Arborescence

```
src/plugins/content-integrity/
├── package.json                              @cannelle/plugin-content-integrity
├── tsconfig.json
├── README.md
└── src/
    ├── index.ts                              descripteur (Vite) + createPlugin (runtime)
    ├── admin.tsx                             export { pages, fields, widgets }
    ├── text/                                 ── pur, sans I/O ──
    │   ├── normalize.ts                      texte + table d'offsets, retourne NormalizedDoc
    │   ├── portable-text.ts                  blocs → texte, extraction des blockquotes
    │   ├── quotes.ts                         repérage des zones citées (FR + droits)
    │   └── shingles.ts                       w-grammes de mots → entiers
    ├── fingerprint/                          ── pur ──
    │   ├── hash.ts                           FNV-1a 32 et 64 bits
    │   ├── minhash.ts                        k signatures MinHash
    │   ├── bands.ts                          découpage LSH
    │   └── document.ts                       texte → Fingerprint (orchestre les 3)
    ├── compare/                              ── pur ──
    │   ├── containment.ts                    recouvrement directionnel + Jaccard
    │   ├── align.ts                          localisation des passages
    │   └── verdict.ts                        seuils → { severity, status }
    ├── domain/
    │   ├── config.ts                         IntegrityConfig + mergeConfig
    │   ├── match.ts                          Constat, transitions d'état
    │   ├── boilerplate.ts                    fréquence documentaire, seuil de gabarit
    │   └── fingerprint.ts                    type Fingerprint côté domaine
    ├── infrastructure/
    │   ├── fingerprint-store.ts              ctx.storage.fingerprints
    │   ├── band-index.ts                     ctx.storage.bands
    │   ├── match-store.ts                    ctx.storage.matches
    │   ├── watch-store.ts                    ctx.storage.watch (vide en phase 1)
    │   ├── kv-config.ts                      settings:integrityConfig
    │   ├── kv-doc-frequency.ts               settings:shingleDf
    │   ├── content-loader.ts                 ContentItem → document du domaine
    │   └── hooks/
    │       ├── index-entry.ts                indexEntry(ctx, content, collection)
    │       ├── purge-entry.ts                purgeEntry(ctx, contentId)
    │       └── boilerplate.ts                DF computation pendant rebuild
    ├── ports/
    │   ├── config-store.ts                   ConfigStore
    │   ├── fingerprint-store.ts              FingerprintStore
    │   ├── band-index-store.ts               BandIndexStore
    │   ├── match-store.ts                    MatchStore
    │   └── safe-href.ts                      réexport depuis glossary-cards
    ├── routes/
    │   ├── check.ts
    │   ├── matches.ts
    │   ├── match.ts
    │   ├── review.ts
    │   ├── rebuild.ts
    │   ├── settings.ts
    │   └── result.ts                         enveloppe { ok, data } | { ok, message }
    └── ui/
        ├── api.ts                            client apiFetch + helpers
        ├── pages/
        │   └── IntegrityPage.tsx             page admin /integrity
        ├── widgets/
        │   └── IntegrityOverviewWidget.tsx   widget dashboard
        ├── fields/
        │   └── IntegrityField.tsx            widget de champ (consultatif)
        ├── components/
        │   ├── Primitives.tsx
        │   └── MatchDiff.tsx                 rendu en vis-à-vis
        ├── styles/
        │   └── Integrity.module.css
        ├── css-modules.d.ts
        └── entry-ref.ts
```

### 4.2 Capacités et déclarations

```ts
capabilities: ["content:read"]
```

Phase 1 = `content:read` uniquement. Pas de `content:write` (les statuts de constats vont dans `matches`, pas sur le contenu Sanity). Pas de `network:request`. Aucun hôte.

Les phases ultérieures ajouteront :

- Phase 2 : `content:write` (si appliqué pour bloquer une publication — peu probable, on a dit jamais bloquant).
- Phase 3 : `network:request` + `allowedHosts` + `email:send`.

### 4.3 Storage

```ts
storage: {
  fingerprints: {
    indexes: ["entryId", "collection", "contentHash", "indexedAt"],
  },
  bands: {
    indexes: ["bandHash", "entryId", ["bandHash", "collection"]],
  },
  matches: {
    indexes: [
      "status", "kind", "detectedAt",
      "sourceEntryId",
      ["status", "kind"],
      ["sourceEntryId", "status"],
    ],
  },
  watch: {
    indexes: ["nextCheckAt", "priority", ["provider", "nextCheckAt"]],
  },
}
```

### 4.4 Admin

```ts
admin: {
  entry: "@cannelle/plugin-content-integrity/admin",
  pages: [{ path: "/integrity", label: "Intégrité", icon: "shield-check" }],
  widgets: [
    {
      id: "integrity-overview",
      title: "Intégrité éditoriale",
      size: "half",
    },
  ],
  fieldWidgets: [
    {
      // Phase 1 = widget inséré via fieldWidgets sans champ dans le schéma
      // (cf. §7.3). Si l'approche échoue, fallback : ajouter un champ `json`
      // optionnel `integrity_panel` sur `posts` et y attacher ce widget.
      name: "integrity",
      label: "Intégrité",
      fieldTypes: ["json"],
    },
  ],
}
```

### 4.5 Routes

| Route | Permission | Limites |
|---|---|---|
| `check` | `content:read` | `limit: 200` sur les candidats |
| `matches` | `content:read` | pagination via `cursor` |
| `match` | `content:read` | — |
| `review` | `content:read` + `content:write` | — |
| `rebuild` | `plugins:manage` | 50 articles par tick |
| `settings` (GET) | `plugins:manage` | — |
| `settings` (POST) | `plugins:manage` | — |

### 4.6 Hooks

```
content:afterPublish    → indexEntry()         (priority 100, errorPolicy continue, timeout 5000)
content:afterSave       → indexEntry() si status==="published", court-circuit contentHash
content:afterUnpublish  → purgeEntry()
content:afterDelete     → purgeEntry()         (corbeille comprise, leçon auto-internal-linker)
content:afterRestore    → indexEntry() si status==="published"
content:beforeSave      → AUCUN                (consultatif)
cron                    → AUCUN                (phase 3)
```

---

## 5. Moteur

### 5.1 Pipeline

```
texte brut (Portable Text)
   ↓ text/portable-text.ts       blocs → texte, marque les zones citées (blockquotes + guillemets)
   ↓ text/normalize.ts           minuscules, NFD sans diacritiques, apostrophes unifiées,
                                  ponctuation retirée, espaces compactés
       sortie : NormalizedDoc { words: string[], offsets: Uint32Array, quoteSpans: [start,end][] }
   ↓ text/shingles.ts            w-grammes de mots (w = 6 par défaut), FNV-1a 32 bits
       sortie : number[]         (shingles normalisés)
   ↓ fingerprint/document.ts
       MinHash k=128 sur l'ensemble des shingles
       LSH : 32 bandes de 4 lignes, bandHash = FNV-1a(bandIndex<<32 | min(tranche))
       sortie : Fingerprint { contentHash, wordCount, shingleCount, minhash: number[128], bands: number[32] }
```

### 5.2 Paramètres par défaut

| Param | Valeur | Notes |
|---|---|---|
| `w` (shingle size) | 6 | Réglable 4..12. Compromis presse FR : détecte reformulations légères, ignore les tournures de dépêche communes |
| `k` (MinHash) | 128 | Standard |
| `b` (bandes) | 32 | Standard |
| `r` (lignes/bande) | 4 | Seuil LSH ≈ 45 % Jaccard |
| `boilerplateThreshold` | 0.02 | Fréquence documentaire > 2 % → gabarit |
| `severities.ignore` | 0.15 | < 15 % containment |
| `severities.low` | 0.35 | 15–35 % |
| `severities.medium` | 0.60 | 35–60 % |
| `severities.high` | 1.00 | > 60 % |

Réglage de `w` = seul vrai curseur. Sera calibré sur le corpus en §11.

### 5.3 Exclusions — appliquées **avant** le shingling

| Exclusion | Source | Effet |
|---|---|---|
| Citations entre guillemets français « … » et droits "…" | Regex sur texte normalisé | Mots retirés de `words` avant shingling |
| Contenu des blocs `blockquote` Portable Text | `portable-text.ts` | Bloc exclu entièrement |
| Boilerplate maison | Fréquence documentaire (seuil 2 %) | Shingle retiré de l'index mais pas de la détection |

La fréquence documentaire est recalculée à chaque `rebuild` (par curseur), stockée dans `settings:shingleDf`.

### 5.4 Scoring

```
containment(A → B) = |shingles(A) ∩ shingles(B) après exclusion boilerplate|
                    / |shingles(A) après exclusion boilerplate|
containment(B → A) = symétrique
jaccard             = |A ∩ B| / |A ∪ B|          (information de contexte, jamais seuil)
```

**Les deux directions sont remontées.** `containment(court → long) = 0,95` est le signal ; Jaccard le manque.

### 5.5 Localisation des passages

Une fois une paire candidate identifiée (candidats ramenés par LSH), on travaille sur **deux** documents. Plus de structure approchée :

```
1. table de hachage {shingle → [positions]} sur le document A
2. balayage de B ; chaque shingle de A trouvé ouvre ou prolonge une piste
3. pistes contiguës fusionnent en passages
4. passages < w+2 mots → écartés (artefacts)
5. offsets normalisés → offsets bruts via la table d'offsets du normalisateur
6. sortie : passages avec positions dans les deux textes originaux
```

C'est ce qui permet à un rédacteur de **voir** la reprise, pas un score.

### 5.6 Trois garde-fous systémiques

| Garde-fou | Pourquoi | Coût si oublié |
|---|---|---|
| `contentHash` (FNV-1a 64 bits) court-circuite `indexEntry` | Un save sans changement de corps ne déclenche aucun travail | CPU Worker explosé |
| `bandHash` indexé avec `bandIndex` salé dans le hash | Récupération des candidats LSH en **une** requête `IN` sur colonne indexée | OPT-1 reproduit |
| `contentHashAtDetection` + `sourceContentHashAtDetection` sur chaque constat | Un constat écarté ne reparaît que si les deux textes ont bougé | Bruit en 2 semaines → outil mort |

---

## 6. Modèle de données

### 6.1 `fingerprints`

```ts
{
  id: `${collection}:${entryId}`,     // ex: "posts:welcome"
  entryId: string,
  collection: "posts",                // figé en phase 1
  contentHash: string,                // FNV-1a 64 bits du texte normalisé
  wordCount: number,
  shingleCount: number,
  minhash: number[128],               // k signatures
  language: "fr" | null,
  indexedAt: string,                  // ISO
}
```

### 6.2 `bands`

```ts
{
  id: `${entryId}:${bandIndex}`,      // 32 lignes par article
  bandHash: number,                   // FNV-1a 32 bits de (bandIndex<<32 | min(tranche))
  bandIndex: 0..31,
  entryId: string,
  collection: "posts",
}
```

**Volume.** 32 lignes × N articles. À 5 000 articles → 160 000 lignes. D1 encaisse. À 50 000 → revoir `b` ou partitionner.

**Récupération des candidats** = une seule requête :

```ts
const candidates = await ctx.storage.bands.query({
  where: { bandHash: { in: fingerprint.bands } },
  limit: 200,
});
```

### 6.3 `matches`

```ts
{
  id: string,                         // ULID
  kind: "internal",                   // phase 1 uniquement
  sourceCollection: "posts",
  sourceEntryId: string,
  targetEntryId: string,              // = interne en phase 1
  targetUrl: string | null,           // assaini à l'écriture
  targetTitle: string | null,
  targetFetchedAt: string | null,
  containmentSource: number,          // 0..1, B → A (court → long)
  containmentTarget: number,          // 0..1, A → B
  jaccard: number,
  passages: Array<{
    sourceStart: number; sourceEnd: number;
    targetStart: number; targetEnd: number;
    text: string;
  }>,
  status: "new" | "reviewed" | "dismissed" | "confirmed" | "allowed",
  severity: "ignore" | "low" | "medium" | "high",
  detectedAt: string,
  reviewedAt: string | null,
  reviewedBy: string | null,
  contentHashAtDetection: string,
  sourceContentHashAtDetection: string,
}
```

**Le couple `contentHashAtDetection` x2** est la mémoire des rejets. Sans lui, le constat écarté ressurgit à chaque réindexation.

### 6.4 `watch` — créé vide en phase 1

```ts
{
  id: string,                         // entryId
  collection: "posts",
  probes: string[],
  priority: number,
  lastCheckedAt: string | null,
  nextCheckAt: string | null,
  provider: string | null,
  lastStatus: string | null,
}
```

### 6.5 KV `settings:integrityConfig`

```ts
{
  enabled: true,
  analyzedCollections: ["posts"],
  shingleSize: 6,                     // 4..12
  bandCount: 32,                      // 16, 32, 64
  rowsPerBand: 4,                     // 1..8
  boilerplateThreshold: 0.02,
  severities: { ignore: 0.15, low: 0.35, medium: 0.60 },
  enableRebuild: true,
}
```

Fusion avec défauts par `mergeConfig` (motif auto-internal-linker).

### 6.6 KV `settings:shingleDf`

Table `Map<shingle, count>`, recalculée à chaque `rebuild`. Clef fixe, écrasée entièrement.

### 6.7 Assainissement `targetUrl` à l'écriture

`safe-href.ts` de `glossary-cards/src/lib/safe-href.ts` appliqué à **l'écriture** dans `matches.targetUrl`. Schémas acceptés : `https:`, `http:` (réécrit en `https:`), `mailto:`. Tout le reste → `null`.

---

## 7. Surfaces

### 7.1 Routes — chaque route déclare sa `permission`

| Route | Permission | Rôle | Charge utile |
|---|---|---|---|
| `check` | `content:read` | Analyse une entrée contre le corpus | `{ collection, entryId }` → `{ matches, severityByTarget }` |
| `matches` | `content:read` | Liste paginée, filtrée | `{ status?, kind?, severity?, limit, cursor }` → `{ items, cursor, hasMore }` |
| `match` | `content:read` | Un constat avec passages | `{ id }` → `{ ...fullMatch, sourceTitle, sourceUrl, targetTitle, targetUrl }` |
| `review` | `content:read` + `content:write` | Changer le statut d'un constat | `{ id, status }` → `{ ...match }` |
| `rebuild` | `plugins:manage` | Réindexation par curseur | `{ cursor? }` → `{ cursor, processed, indexed, hasMore }` |
| `settings` | `plugins:manage` | Lire/écrire les réglages | `{ patch? }` → `{ config, dfSize }` |

### 7.2 Hooks — gratuité par `contentHash`

```
content:afterPublish     → indexEntry()
content:afterSave        → indexEntry() si status==="published", court-circuit contentHash
content:afterUnpublish   → purgeEntry()
content:afterDelete      → purgeEntry()         (corbeille comprise)
content:afterRestore     → indexEntry() si status==="published"
content:beforeSave       → AUCUN
cron                     → AUCUN
```

Tous en `errorPolicy: "continue"`, `timeout: 5000`, `priority: 100`.

**`indexEntry` se décompose** :

1. charger `fingerprints` ligne `${collection}:${entryId}`.
2. si `contentHash` === nouvel hash → `return` (zéro travail).
3. charger `bands` où `entryId` → supprimer.
4. calculer nouvelle empreinte.
5. `putMany` 32 nouvelles bandes.
6. `put` nouvelle empreinte.
7. purger les constats existants où `sourceEntryId === entryId || targetEntryId === entryId` ET `contentHashAtDetection !== nouveauHash || sourceContentHashAtDetection !== nouveauSourceHash`.

### 7.3 Widget de champ (consultatif)

Approche choisie : widget read-only, pas de champ dans le schéma Sanity. L'`entryId` est tiré de `useLocation()` (URL de l'éditeur). Le contenu est lu côté serveur via `check`.

**Si l'approche échoue** (le widget ne peut être inséré sans champ), fallback : ajouter un champ `json` optionnel `integrity_panel` sur `posts` avec widget `content-integrity:integrity`. À confirmer pendant l'implémentation.

### 7.4 Page admin `/integrity`

Trois onglets :

- **Constats.** Tableau paginé : source, cible, gravité, statut, date. Filtres latéraux (statut, gravité, kind). Clic sur ligne → vue détaillée en vis-à-vis.
- **Paramètres.** Seuils, taille des shingles, état de l'index (N entrées, M constats en attente, dernier rebuild). Bouton « Reconstruire » qui appelle `rebuild` et reboucle sur le curseur.
- **Apprentissage.** (Phase 2) — pas en phase 1.

**Vue détaillée en vis-à-vis.** Source à gauche, cible à droite. Passages surlignés, couleur par gravité. Le rédacteur en chef **tranche** là.

### 7.5 Widget de tableau de bord

```ts
{
  id: "integrity-overview",
  title: "Intégrité éditoriale",
  size: "half",
}
```

Affiche : nombre de constats `new` non traités ; le plus grave des 7 derniers jours ; lien vers la page admin filtrée.

---

## 8. Sécurité

### 8.1 Règles appliquées

| Règle | Origine | Application |
|---|---|---|
| `permission` par route | SEC-6 audit | Toutes les routes |
| `targetUrl` assaini à l'écriture | SEC-1, SEC-5 audit | `safe-href.ts` dans `match-store.ts` |
| Pas de `set:html` exotique | SEC-2 audit | Phase 1 = admin uniquement |
| Pas de `network:*` | Délibéré | Phase 3 seulement |
| HTML tiers jamais rendu | Plan §10 | Phase 3 seulement |
| Clés API hors des types de route | Plan §10 | Phase 3 seulement |

### 8.2 Surface d'attaque phase 1

- Storage plugin (4 collections). Risque = pollution des index. Mitigation : `contentHash` empêche les incohérences.
- Routes admin (6). Risque = abus de权限. Mitigation : `permission` déclarée.
- Hooks. Risque = réindexation excessive. Mitigation : `contentHash` + filtre `status === "published"`.
- UI admin. Risque = XSS via rendu de constats. Mitigation : `Escape` systématique ; les passages viennent du contenu Sanity mais c'est du texte d'origine auteur, pas hostile.

Pas de réseau, pas de `set:html`, pas de markup tierce. Surface minimale.

---

## 9. Performance

### 9.1 Objectifs mesurables

| Opération | Cible | Moyen |
|---|---|---|
| Indexation d'un article (hook) | < 150 ms | `contentHash` court-circuit + `putMany(32 bandes)` + 1 `put` empreinte |
| `check` d'un article | < 400 ms | 1 requête LSH + chargement empreintes candidates + lectures textes (N bornées par `limit: 200`) + comparaisons exactes |
| Requêtes D1 par `check` | ≤ 4 | bandes + empreintes candidates + config + constats existants |
| `rebuild` par tick de curseur | < 150 ms / article | 1 article par tick, l'UI reboucle |
| `matches` paginé | < 100 ms | Index composé `["status", "kind"]` |

### 9.2 Pagination du `rebuild` — règle dure

Le `rebuild` ne réindexe **jamais** tout le corpus dans une requête. La route renvoie `{ cursor, processed, indexed, hasMore }`. L'UI reboucle en POST successifs. Une page = 50 articles. Coût total étalé, chaque tick sous la cible CPU.

### 9.3 Interdits explicites

- `ctx.storage.<x>.all()` sur `fingerprints` ou `bands`. **Jamais.**
- `JSON.stringify(body)` pour détecter un changement. Rôle de `contentHash`.
- Recharger la config par article dans une boucle. (OPT-4)
- Filtrer côté JS après pagination. (OPT-5)
- Charger l'index LSH en mémoire. (OPT-1)

---

## 10. Tests

### 10.1 Unitaires (modules purs — la majorité)

Chaînes en dur, pas de mock. Couvre la moitié du code (en LoC) et toute la complexité algorithmique.

```
text/normalize.test.ts            — conserve les offsets, normalise apostrophes/diacritiques
text/portable-text.test.ts        — extrait les blockquotes, gère blocs vides
text/shingles.test.ts             — respecte w, fenêtre glissante correcte
text/quotes.test.ts               — guillemets FR + droits, imbrication
fingerprint/hash.test.ts          — FNV-1a : valeurs connues, stabilité inter-plateforme
fingerprint/minhash.test.ts       — stabilité, symétrie
fingerprint/bands.test.ts         — découpage sans perte, sel bandIndex
fingerprint/document.test.ts      — pipeline complet
compare/containment.test.ts       — ensembles connus, asymétrie
compare/align.test.ts             — passage inséré, déplacé, deux textes indépendants
compare/verdict.test.ts           — chaque seuil → gravité attendue
domain/boilerplate.test.ts        — fréquence documentaire, seuil de gabarit
domain/config.test.ts             — mergeConfig (défauts + patch)
ports/safe-href.test.ts           — schémas acceptés/refusés
infrastructure/...                — avec mock-ctx : putMany/query/deleteMany
routes/...                        — handler complet + envelope result
```

### 10.2 Golden set — étalon interne

6 paires étiquetées à la main en français, dans `compare/__fixtures__/` :

```
verbatim-reprise.json          — A et B partagent un paragraphe → DOIT sortir
reformulation-synonymes.json   — un paragraphe reformulé → DOIT sortir en gravité moindre
depeche-meme.json              — AFP reprise par 2 titres → NE DOIT PAS sortir (cas non implémenté phase 1, sera compté en faux positif attendu)
citation-presse.json           — même citation de conférence → NE DOIT PAS sortir
deux-angles.json               — 2 articles sur même fait, écrits séparément → NE DOIT PAS sortir
independants.json              — 2 articles sans rapport → NE DOIT PAS sortir
```

Sert d'**étalon interne** pendant le dev, pas de test runtime (trop couplé à `w`). Exécuté manuellement avant la sortie de phase 1.

### 10.3 Intégration

`test/mock-ctx.ts` (motif partagé) :

```
indexEntry → détection automatique des constats nouveaux
dismiss → réindexation sans changement → constat rejeté ne réapparaît PAS
dismiss + édition du corps → constat réapparaît (hash changé)
unpublish → cible retirée → constats où elle apparaît disparaissent
delete   → corbeille comprise → constats purgés
review status → transition d'état correcte
```

---

## 11. Critère de sortie de phase 1

| Critère | Mesure | Source |
|---|---|---|
| Pas de régression sur l'existant | `pnpm test` au vert | CI locale |
| Build | `pnpm build` sans erreur | CI locale |
| Coût CPU `afterSave` mesuré | < 150 ms p95 sur 50 enregistrements | Bench local instrumenté |
| Faux positifs sur golden set | < 5 % sur les 4 cas « NE DOIT PAS sortir » | Manuel |
| Sécurité | Aucun `set:html`, pas de `network:*`, permissions par route | Code review |

**Règle de calibrage** : si les seuils sont atteints en trichant (abaisser `w` jusqu'à 0 %, ou monter les seuils de gravité), c'est un échec. Les seuils sont recalibrés sur le **vrai** corpus, pas ajustés à la cible.

Si > 5 % de FP, on règle `w` et les exclusions **avant** de passer à la phase 2.

---

## 12. Process d'arrêt

Si pendant l'implémentation on se retrouve à devoir :

- ajouter une dépendance runtime,
- ouvrir `network:request` ou `content:write` en phase 1,
- baisser les seuils de gravité sous `{ ignore: 0.05 }`,
- construire un fallback de calcul d'empreinte côté UI,
- modifier le schéma Sanity,

**on s'arrête et on revient vers l'utilisateur.** Ces frontières sont ce qui maintient l'engagement de qualité de la phase 1.

---

## 13. Phases ultérieures — gelé hors phase 1

| Phase | Périmètre | Statut |
|---|---|---|
| Phase 2 — Entrant | Rédacteur colle/colle-URL sa source, comparaison à son propre corpus + aux sources. Décision « colle/colle-URL » (plan §8.2) dans cycle dédié | Reporté |
| Phase 3 — Sortant | Cron quotidien, phrases-sondes les plus distinctives, Brave/SerpAPI, dossier de preuve. Exige `network:request` + clé + `email:send` | Reporté |

Les phases 2 et 3 ne sont pas construites en phase 1. Si elles ne sont jamais faites, le plugin reste livrable et utile (auto-plagiat, doublons, recyclage d'archives).

---

## 14. Risques résiduels

| Risque | Probabilité | Effet | Traitement |
|---|---|---|---|
| `w=6` mal calibré pour le français de presse | MOYEN | Bruit ou silence | Critère de sortie phase 1 — golden set |
| `bands` trop volumineux à 50 000 articles | BASSE | Coût D1 | 32 lignes/article, revoir `b` ; partition par collection possible |
| `allowedHosts` figé bloque la phase 2 | HAUTE | Mode URL indisponible | Mode « coller » par défaut, déjà acquis |
| `content:afterSave` trop bavard | MOYEN | CPU | Filtre `status === "published"` + `contentHash` court-circuit |
| Édition fréquente d'un même post | MOYEN | Réindexations inutiles | `contentHash` court-circuit — doit suffire |
| Widget de champ sans accès à `entryId` | HAUTE | UX dégradée | Fallback `useLocation()` + route `check` |
| Désaccord rédaction sur l'utilité | MOYEN | Outil mort | Critère de sortie : < 5 % FP, sinon on n'ouvre pas |
| Volumétrie `matches` | BASSE | Coût UI | Index `["status","kind"]` + pagination |

---

## 15. Prochaine étape

Implémentation via plan d'exécution détaillé (compétence `writing-plans`). Le plan découpe les modules `(a) → (f)` de la §6.1 en tâches testables, dans l'ordre, avec critères de vérification de chacune.

`──────────────────────────────────────────────`
Fin de la spec. Spec self-review : placeholders (aucun), cohérence (modules ↔ modèle de données ↔ routes ↔ hooks), scope (focus phase 1), ambiguïté (assainissements, paramètres, critères de sortie tous explicites).
