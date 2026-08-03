# EmDash Auto Internal Linker — Maillage interne assisté

Date : 2026-08-04
Statut : design validé, en attente d'implémentation
Auteur(s) : Claude (développeur senior TypeScript)

## 1. Contexte et objectif

Le site Cannelle News (EmDash CMS sur Astro + React admin + Cloudflare) veut renforcer son maillage interne pour le SEO. Aujourd'hui, poser un lien d'un article vers un autre suppose que le rédacteur se souvienne qu'un article existe sur le sujet, en retrouve l'URL, et pense à le faire. Rien dans le CMS ne l'y aide.

Le plugin `emdash-plugin-auto-internal-linker` maintient un index des mots-clés associés aux articles publiés, repère les occurrences de ces mots-clés dans l'article en cours de rédaction, et propose au rédacteur des suggestions de liens qu'il valide ou ignore une par une.

Deux plugins du workspace servent de référence :

- `@cannelle/plugin-seo-pro` — architecture hexagonale, `content/portable-text.ts`, `analysis/keywords/normalize.ts`, `infrastructure/kv-config.ts`, store sur `ctx.storage`, tests Vitest colocalisés. Le nouveau plugin reprend ce moule.
- `@cannelle/plugin-research-paper-embed` — pattern de plugin natif source-only (pas de `dist/`).

### Objectif de qualité

La règle qui prime sur toutes les autres : **le plugin ne doit jamais empêcher un rédacteur d'écrire ou d'enregistrer.** Toute défaillance — index vide, analyse en erreur, mot-clé disparu — dégrade la fonctionnalité, jamais le flux éditorial.

## 2. Portée

### Inclus

- Index de mots-clés → URLs d'articles publiés, persisté et maintenu par hooks.
- Quatre sources de mots-clés : titre, termes de taxonomie, mots-clés manuels, extraction automatique du corps.
- Moteur d'analyse du corps Portable Text (normalisation, trie, garde-fous).
- Widget de champ dans l'éditeur d'article : liste de suggestions, validation en un clic, ignore individuel.
- Application des liens acceptés au moment de l'enregistrement, via `content:beforeSave`.
- Page de réglages (plafonds, sources actives, collections analysées, motifs d'URL).
- Route de reconstruction complète de l'index.

### Exclu

- Dashboard d'audit du maillage sur tout le site (articles orphelins, cibles jamais liées). Envisageable en v2 ; hors périmètre ici.
- Suggestions de liens **sortants** (vers des sites externes).
- Suggestions par IA / plongements sémantiques. Le rapprochement est lexical, pas sémantique.
- Réécriture ou suppression de liens existants. Le plugin ajoute, il ne retire jamais.
- Maillage inter-locales.

## 3. Contraintes

- **Plugin natif source-only.** Le format natif est imposé par le besoin d'un widget de champ React ; compilation via Vite/Astro, pas de `dist/`.
- **Zéro dépendance runtime supplémentaire.** On réutilise `zod` et les peers existantes (`emdash`, `react`, `@emdash-cms/admin`).
- **Budget CPU Cloudflare Workers (50 ms).** Le coût de l'analyse doit dépendre de la longueur du texte, pas du nombre de mots-clés indexés.
- **Architecture hexagonale.** `domain/` et `matching/` ignorent qu'EmDash existe ; `infrastructure/` est la seule frontière.
- **Tests Vitest colocalisés** (`*.test.ts`), avec un `createMockCtx()` réutilisable, comme seo-pro.
- **UI admin avec `@emdash-cms/admin`** et CSS Modules scopés. Pas de Tailwind, pas de Radix supplémentaire.

### Contraintes découvertes dans le code d'EmDash 0.30.0

Deux lectures du code ont dicté l'architecture. Elles sont consignées ici parce qu'elles ne sont pas dans la documentation.

**Les props d'un widget de champ sont limitées.** `@emdash-cms/admin@0.30.0/dist/index.js:14456` (`FieldRenderer`) ne passe au composant du plugin que :

```js
{ value, onChange, label, id, required, options, minimal }
```

Le widget n'a donc accès ni au corps Portable Text de l'article, ni à son identifiant, et son `onChange` n'écrit que dans la valeur de son propre champ. Il ne peut ni lire ni réécrire le corps. Conséquences directes : l'identifiant de l'article vient de l'URL de l'éditeur, les suggestions viennent d'une route serveur, et l'écriture des liens se fait dans un hook.

**Un lien n'est pas un nœud inline.** Dans `node_modules/emdash/src/content/converters/types.ts:28-45`, un lien est une entrée `markDefs` au niveau du bloc (`{ _type: "link", _key, href }`), référencée par le tableau `marks` d'un span. Poser un lien = créer le markDef, découper le span, donner la clé au morceau du milieu.

> Note : `extractLinks()` dans `seo-pro/src/infrastructure/content-loader.ts` lit `n.children` sur un markDef, qui n'en a pas — le texte d'ancre y ressort toujours vide. Ce plugin ne reprend pas cette partie-là. Le défaut de seo-pro n'est pas corrigé ici, il est hors périmètre.

## 4. Architecture

### 4.1 Arborescence

```text
src/plugins/auto-internal-linker/
├── package.json                  @cannelle/plugin-auto-internal-linker
├── tsconfig.json
├── README.md
└── src/
    ├── index.ts                  descripteur (Vite, build) + definePlugin (runtime)
    ├── admin.tsx                 export { pages, fields }
    ├── domain/
    │   ├── keyword-entry.ts      IndexedKeyword, KeywordSource, SOURCE_WEIGHTS
    │   ├── suggestion.ts         Occurrence, Suggestion, LinkerFieldValue
    │   ├── config.ts             LinkerConfig + mergeConfig()
    │   └── rules/
    │       ├── zones.ts          zones interdites du corps
    │       ├── caps.ts           plafonds et unicité
    │       └── index.ts
    ├── matching/
    │   ├── normalize.ts          normalizeWithOffsets()
    │   ├── trie.ts               buildTrie() + scanTrie()
    │   ├── scan.ts               Portable Text → Occurrence[]
    │   └── select.ts             Occurrence[] → Suggestion[]
    ├── indexing/
    │   ├── derive-keywords.ts    entrée + termes → IndexedKeyword[]
    │   └── variants.ts           titre → variantes réduites
    ├── content/
    │   ├── spans.ts              parcours blocs/spans avec clés et offsets
    │   └── apply-link.ts         markDef + découpe de span
    ├── infrastructure/
    │   ├── keyword-index-store.ts   ctx.storage.keywords
    │   ├── kv-config.ts             settings:linkerConfig
    │   └── content-loader.ts        ContentItem → entrée plate
    ├── ports/
    │   ├── config.ts             ConfigStore
    │   └── keyword-index.ts      KeywordIndexStore
    ├── routes/
    │   ├── suggest.ts
    │   ├── rebuild.ts
    │   └── settings.ts
    └── ui/
        ├── api.ts
        ├── fields/SuggestionsField.tsx
        ├── pages/SettingsPage.tsx
        ├── css-modules.d.ts
        └── styles/*.module.css
```

### 4.2 Capacités et déclarations

```ts
capabilities: ["content:read", "taxonomies:read"]
```

`content:write` n'est **pas** demandé : le plugin n'écrit jamais par `ctx.content.update()`. Il modifie le corps en retournant le `content` transformé depuis `content:beforeSave`, ce qui reste dans le flux d'enregistrement normal et ne peut pas écraser l'état d'un éditeur ouvert.

```ts
storage: {
  keywords: { indexes: ["normalized", "targetId", "source", ["normalized", "weight"]] },
}
```

```ts
admin: {
  entry: "@cannelle/plugin-auto-internal-linker/admin",
  pages: [{ path: "/settings", label: "Maillage interne", icon: "link" }],
  fieldWidgets: [{
    name: "suggestions",
    label: "Suggestions de liens internes",
    fieldTypes: ["json"],
  }],
}
```

Pas de widget de tableau de bord : le maillage se pilote depuis l'éditeur, une carte de dashboard n'apporterait rien qu'on sache déjà utiliser.

### 4.3 Flux d'ensemble

```text
PUBLICATION D'UN ARTICLE
  content:afterPublish
    → derive-keywords (titre + taxonomies + manuels + extraits)
    → keywordIndexStore.replaceForTarget(targetId, keywords)

OUVERTURE DE L'ÉDITEUR
  SuggestionsField (widget)
    → route suggest({ collection, entryId })
        → charge l'entrée enregistrée
        → buildTrie(index sans targetId === entryId)
        → scan(corps) → Occurrence[]
        → select(occurrences, config, liens existants) → Suggestion[]
    ← affichage, cases cochées par défaut

DÉCISION DU RÉDACTEUR
  onChange → LinkerFieldValue { accepted, ignored, manualKeywords }
    (persisté avec l'article, dans le champ internal_links)

ENREGISTREMENT
  content:beforeSave
    → relit accepted
    → RESCANNE le corps courant (ré-ancrage)
    → applyLink() pour chaque décision encore valide
    ← content modifié
```

## 5. Index de mots-clés

### 5.1 Modèle

```ts
type KeywordSource = "manual" | "title" | "taxonomy" | "extracted";

interface IndexedKeyword {
  normalized: string;         // "llm"                     — forme comparable
  display: string;            // "LLM"                     — pour l'UI
  targetId: string;           // ULID de l'article cible
  targetCollection: string;   // "posts"
  targetSlug: string;         // "qu-est-ce-qu-un-llm"
  targetTitle: string;        // "Qu'est-ce qu'un LLM ?"
  targetUrl: string;          // "/posts/qu-est-ce-qu-un-llm"
  source: KeywordSource;
  weight: number;
  updatedAt: string;          // ISO 8601
}

const SOURCE_WEIGHTS: Record<KeywordSource, number> = {
  manual: 100,
  title: 80,
  taxonomy: 50,
  extracted: 20,
};
```

Identifiant de document : `` `${targetId}:${normalized}` ``. L'upsert est idempotent par construction, et la purge d'un article se fait par requête sur l'index `targetId`.

### 5.2 Les quatre sources

Elles cohabitent par **poids**, pas par exclusion. Un mot-clé issu de plusieurs sources conserve le poids le plus élevé.

| Source | Ce qui est indexé | Remarque |
| --- | --- | --- |
| `title` | Le titre entier, plus une variante réduite sans mots vides ni ponctuation | « Qu'est-ce qu'un LLM ? » indexe aussi « llm ». Réutilise les listes de mots vides FR/EN de seo-pro. |
| `taxonomy` | Les libellés des termes `category` et `tag` attachés à l'article | Via `ctx.taxonomies.getEntryTerms()`. Un tag partagé par vingt articles produit des collisions, arbitrées par la règle de 5.3. |
| `manual` | `LinkerFieldValue.manualKeywords` de l'article | Synonymes, sigles, pluriels. Poids maximal : c'est la saisie explicite du rédacteur. |
| `extracted` | `extractKeywords(plainText, title, headings)`, plafonné à 5 candidats | Poids minimal, délibérément. Un article qui *mentionne* un terme ne doit pas battre un article qui *traite* ce terme. |

`minKeywordLength` (défaut 3) écarte les mots-clés trop courts issus des sources **automatiques** — `extracted` et les variantes réduites de `title`. Il ne s'applique **ni** à `manual` **ni** à `taxonomy` : « IA » est un sigle légitime sur ce site, et un rédacteur qui saisit un mot-clé de deux caractères sait ce qu'il fait. Le seuil filtre le bruit machine, pas l'intention humaine.

(Il ne sert pas à éviter les correspondances en milieu de mot : les frontières de mot du §6.2 s'en chargent déjà.)

L'algorithme d'extraction est repris de `seo-pro/src/analysis/keywords/extract.ts` (pondération titre 4 / intertitre 2 / corps 1, n-grammes de 2 à 3 mots). Il est recopié dans ce plugin plutôt qu'importé : les deux plugins sont indépendants, un import croisé créerait un couplage que ni l'un ni l'autre ne veut.

Chaque source est activable dans les réglages. Un site qui juge l'extraction automatique trop bruyante la coupe sans toucher au code.

### 5.3 Arbitrage des collisions

Deux articles réclament « LLM ». Un seul peut gagner : une suggestion nomme une cible unique.

Ordre de tri, appliqué dans `select.ts` :

1. `weight` décroissant
2. `updatedAt` décroissant
3. `targetId` croissant

Entièrement déterministe, donc testable. Le troisième critère n'a pas de sens éditorial ; il existe pour qu'aucune exécution ne dépende de l'ordre de retour du stockage.

### 5.4 Construction de l'URL cible

Motif configurable par collection, `urlPatterns`, défaut :

```ts
{ posts: "/posts/{slug}", pages: "/{slug}" }
```

Le cahier des charges initial citait `/article/{slug}` ; le site sert `/posts/{slug}` (`src/pages/posts/[slug].astro`). Le réglage tranche sans modification de code. Un article sans `slug` n'est pas indexé — il n'a pas d'URL stable.

### 5.5 Cycle de vie

| Événement | Action |
| --- | --- |
| `content:afterPublish` | `replaceForTarget(targetId, derive(entry))` — purge puis insertion |
| `content:afterSave`, si l'article est déjà publié | Même action. Sans ce second déclencheur, corriger le titre ou les mots-clés manuels d'un article **déjà en ligne** laisserait l'index sur l'ancienne version : `afterPublish` ne se déclenche qu'à la transition de statut, pas à chaque enregistrement. |
| `content:afterUnpublish` | `purgeTarget(targetId)` |
| `content:afterDelete` | `purgeTarget(targetId)` |
| route `rebuild` | Balayage paginé de `ctx.content.list({ where: { status: "published" } })` sur toutes les collections analysées, puis `replaceForTarget` article par article |

Les deux premiers déclencheurs appellent la même fonction d'indexation, qui vérifie elle-même que l'article est publié et possède un slug. Un déclenchement en double sur un même enregistrement est sans conséquence : `replaceForTarget` est idempotent.

Les hooks d'indexation portent `errorPolicy: "continue"` et `timeout: 5000`. Une indexation ratée ne bloque pas une publication.

La route `rebuild` sert à deux choses : l'amorçage sur un site déjà rempli, et le rattrapage après un changement de réglages (activation d'une source, changement de motif d'URL). Elle est appelable depuis la page de réglages et depuis le widget quand l'index est vide.

## 6. Moteur d'analyse

Trois étages, chacun une fonction pure, testable sans EmDash.

### 6.1 `normalizeWithOffsets(raw)`

```ts
interface NormalizedText {
  normalized: string;   // minuscules, sans accents
  map: number[];        // map[i] = offset BRUT du i-ème caractère normalisé
}
```

La carte d'offsets est ce qui permet de repasser d'une correspondance trouvée dans le texte normalisé aux bornes exactes du texte d'origine, seules utilisables pour découper un span.

Cas limite qui casse toute implémentation naïve : `œ` → `oe` et `æ` → `ae` produisent **deux** caractères normalisés pour **un** caractère brut. Les deux entrées de `map` pointent alors sur le même offset brut. Ce cas a son test dédié.

La table d'accents et la philosophie de normalisation sont reprises de `seo-pro/src/analysis/keywords/normalize.ts` : apostrophes et tirets survivent, parce que « aujourd'hui » et « porte-parole » sont des unités lexicales.

### 6.2 `buildTrie(index)` / `scanTrie(normalized, trie)`

Le trie est construit une fois par appel à partir des entrées d'index, puis le texte est balayé en une passe. Coût **O(longueur du texte)**, indépendant du nombre de mots-clés — c'est ce qui tient dans le budget CPU de Cloudflare quand l'index atteint quelques centaines d'entrées.

- **Correspondance la plus longue.** « intelligence artificielle » l'emporte sur « intelligence ».
- **Frontières de mot.** Une correspondance n'est retenue que si les caractères qui l'encadrent sont hors de `[a-z0-9'-]`, alphabet cohérent avec la normalisation.

### 6.3 `scan(blocks, trie)` → `Occurrence[]`

```ts
interface Occurrence {
  blockKey: string;
  spanIndex: number;
  start: number;      // offset BRUT dans le texte du span
  end: number;
  keyword: IndexedKeyword;
  context: string;    // ± 60 caractères autour, pour l'UI
}
```

Les zones interdites sont écartées **ici**, à la source, pas filtrées après coup :

| Zone | Motif d'exclusion |
| --- | --- |
| Span portant déjà un mark `link` | Un lien dans un lien est du Portable Text invalide. Exclusion technique, non négociable. |
| Bloc de `style` `h2`, `h3`, `h4`, `h5`, `h6`, `blockquote` | Un lien dans un intertitre nuit à la lecture et à la structure sémantique. |
| Bloc de `_type` `code`, `htmlBlock` | Le contenu n'est pas de la prose. |

Le parcours des blocs et spans vit dans `content/spans.ts`, distinct de `matching/scan.ts` : l'un connaît la forme du Portable Text d'EmDash, l'autre connaît l'algorithme.

### 6.4 `select(occurrences, config, existingLinks)` → `Suggestion[]`

Les quatre garde-fous, appliqués dans cet ordre :

1. **Jamais d'auto-lien.** Les entrées dont `targetId === entryId` sont retirées avant même la construction du trie — inutile de scanner pour rejeter ensuite.
2. **Première occurrence seulement.** Pour un mot-clé donné, seule sa première apparition dans le corps est proposée.
3. **Une seule occurrence liée par cible.** Si l'article pointe déjà vers `/posts/qu-est-ce-qu-un-llm` — par un lien existant ou par une suggestion déjà retenue — aucun autre mot-clé visant cette cible n'est proposé. C'est la règle qui évite le pire du *keyword stuffing* : cinq liens vers la même page.
4. **Plafond global** (`maxLinksPerEntry`, défaut 5), **comptant les liens internes déjà présents** dans le corps. Sans ce décompte, le plafond ne veut rien dire sur un article déjà maillé à la main.

Les liens existants sont classés interne/externe par une reprise de `seo-pro/src/content/link-classifier.ts`, qui a besoin de `siteUrl` : sans lui, une URL absolue vers le site propre est comptée externe, et le plafond est sous-estimé.

## 7. Interaction dans l'éditeur

### 7.1 Le champ

Un champ `internal_links` est ajouté à la collection `posts` dans `seed/seed.json` :

```json
{
  "name": "internal_links",
  "type": "json",
  "label": "Liens internes",
  "widget": "auto-internal-linker:suggestions"
}
```

### 7.2 Valeur du champ

```ts
interface LinkerFieldValue {
  version: 1;
  manualKeywords: string[];
  accepted: { keyword: string; targetId: string; targetUrl: string }[];
  ignored: string[];   // formes normalisées refusées
}
```

Le champ `version` existe pour qu'une évolution future de la forme puisse être migrée en lecture sans casser les articles déjà enregistrés.

Les mots-clés manuels vivent donc dans la valeur du champ, enregistrée avec l'article. L'indexeur les relit depuis `event.content.internal_links` au `content:afterPublish`. Aucun store supplémentaire, et la sauvegarde des mots-clés suit exactement le cycle de vie de l'article — y compris ses révisions.

### 7.3 Le widget

Deux sections dans `SuggestionsField.tsx`.

**Suggestions.** Chaque ligne rend la formulation demandée au cahier des charges :

> Créer un lien sur le terme **« LLM »** vers **Qu'est-ce qu'un LLM ?**

avec en dessous la phrase de contexte (± 60 caractères) et le terme surligné, pour que le rédacteur juge sur pièces. Case cochée par défaut. Deux boutons : « Tout valider », « Tout ignorer ».

Ignorer une suggestion inscrit sa forme normalisée dans `ignored` : elle ne réapparaîtra plus sur cet article, y compris aux sessions suivantes. C'est le mécanisme qui permet au rédacteur de refuser durablement un rapprochement qu'il juge mauvais.

**Mots-clés de cet article.** Saisie libre des `manualKeywords` — synonymes, sigles, pluriels — qui pointeront vers l'article courant depuis les autres.

### 7.4 Obtention de `collection` et `entryId`

Le widget ne les reçoit pas en props (voir §3). Il les lit via `useParams()` de `@emdash-cms/admin`, avec repli sur l'analyse de `window.location.pathname`.

**À vérifier en début d'implémentation** : que `useParams()` expose bien `collection` et `id` depuis l'intérieur de l'éditeur de contenu. Si ce n'est pas le cas, le repli sur `pathname` devient le chemin principal. Cette vérification est la première tâche du plan d'implémentation, parce qu'elle conditionne l'ensemble du widget.

### 7.5 Ce que le rédacteur voit, et quand

Les suggestions sont calculées sur la dernière version **enregistrée** de l'article. C'est le prix de la contrainte §3 : le widget n'a pas accès au texte en cours de frappe. Concrètement, le rédacteur écrit, enregistre, et la liste se rafraîchit. Le widget affiche explicitement l'horodatage de l'analyse pour que ce décalage soit lisible plutôt que subi.

Un bouton « Réanalyser » relance la route `suggest` sans attendre un enregistrement.

## 8. Écriture des liens

### 8.1 Ré-ancrage au `content:beforeSave`

Le hook lit `accepted`, puis **rescanne le corps courant**. Une décision n'est appliquée que si son mot-clé est encore présent dans une zone autorisée. Si le rédacteur a réécrit le paragraphe entre la suggestion et l'enregistrement, la décision tombe en silence — c'est délibéré : une ancre posée à côté de son contexte est pire que pas d'ancre.

### 8.2 `applyLink(block, spanIndex, start, end, href)`

Poser un lien :

1. Créer `{ _type: "link", _key: <nouvelle clé>, href }` dans `block.markDefs`.
2. Découper le span en trois : `[0, start)`, `[start, end)`, `[end, ∞)`.
3. Ajouter la clé du markDef aux `marks` du morceau du milieu.
4. Reporter les `marks` d'origine (`strong`, `em`, autres liens) **sur les trois morceaux** — sans quoi une mise en gras serait perdue au passage.

Les morceaux vides (mot-clé en début ou en fin de span) ne sont pas insérés.

Quand plusieurs liens tombent dans le même span, ils sont appliqués **par offsets décroissants**, pour que les découpes successives n'invalident pas les offsets restants.

### 8.3 Idempotence

Rejouer le hook ne double rien : la règle « une seule occurrence liée par cible » (§6.4) voit le lien déjà posé au tour précédent et écarte la décision. Aucun état n'a besoin d'être muté dans le hook, et `accepted` peut rester tel quel entre deux enregistrements.

### 8.4 Politique d'erreur

| Chemin | Politique |
| --- | --- |
| `content:afterPublish` / `afterUnpublish` / `afterDelete` | `errorPolicy: "continue"`, `timeout: 5000` |
| `content:beforeSave` | `try`/`catch` interne, `ctx.log.error`, retourne le `content` **intact** |
| route `suggest`, index vide | `{ suggestions: [], indexEmpty: true }` → le widget propose « Reconstruire l'index » |
| route `suggest`, article introuvable | Erreur 404 explicite, affichée dans le widget |
| widget, route en échec | Message d'erreur inline + bouton « Réessayer ». Le champ reste éditable. |

`content:beforeSave` peut annuler un enregistrement en levant une exception. Ce plugin ne le fait jamais : c'est la traduction directe de l'objectif de qualité du §1.

## 9. Réglages

Stockés sous `settings:linkerConfig` via `ctx.kv`, avec le pattern `kv-config.ts` de seo-pro (`get()` fusionne avec les défauts, `set()` fusionne avec l'existant).

```ts
interface LinkerConfig {
  analyzableCollections: string[];              // défaut ["posts"]
  maxLinksPerEntry: number;                     // défaut 5
  minKeywordLength: number;                     // défaut 3
  sources: Record<KeywordSource, boolean>;      // toutes actives par défaut
  urlPatterns: Record<string, string>;          // { posts: "/posts/{slug}", pages: "/{slug}" }
  siteUrl: string | null;                       // pour classer les liens existants
}
```

`SettingsPage.tsx` expose ces valeurs et le bouton « Reconstruire l'index », qui affiche le nombre d'articles traités et de mots-clés indexés.

## 10. Tests

Vitest, fichiers colocalisés `*.test.ts`, `createMockCtx()` réutilisable calqué sur seo-pro.

| Unité | Ce qui est vérifié |
| --- | --- |
| `normalize.ts` | Carte d'offsets correcte ; cas `œ`/`æ` (deux caractères normalisés, un offset brut) ; apostrophes et tirets préservés |
| `trie.ts` | Correspondance la plus longue ; frontières de mot ; absence de faux positif en milieu de mot (« llm » dans « allmande ») |
| `scan.ts` | Exclusion des spans déjà liés, des intertitres, des blocs de code ; offsets bruts corrects sur du texte accentué ; contexte extrait |
| `select.ts` | Chacun des quatre garde-fous, isolément puis combinés ; arbitrage de collision déterministe |
| `derive-keywords.ts` | Les quatre sources ; désactivation par réglage ; article sans slug non indexé ; poids retenu quand un mot-clé vient de deux sources |
| `apply-link.ts` | Découpe en trois ; marks d'origine reportés ; morceaux vides omis ; liens multiples dans un même span appliqués par offsets décroissants |
| `index.ts` (hooks) | `beforeSave` ré-ancre après réécriture du corps ; `beforeSave` renvoie le contenu intact quand l'analyse jette ; idempotence sur double enregistrement |
| `keyword-index-store.ts` | `replaceForTarget` purge avant d'insérer ; `purgeTarget` ne touche pas les autres cibles |

## 11. Intégration au site

`astro.config.mjs` :

- `autoInternalLinkerPlugin()` ajouté au tableau `plugins`.
- `@cannelle/plugin-auto-internal-linker` et `/admin` ajoutés à `vite.optimizeDeps.include`.
- `@cannelle/plugin-auto-internal-linker` ajouté à `vite.ssr.noExternal`.

`seed/seed.json` : champ `internal_links` sur la collection `posts`.

**À vérifier en début d'implémentation** : que le format de seed accepte la clé `widget` sur un champ `json`. `node_modules/emdash/src/api/schemas/schema.ts:118` la déclare côté API ; la validation du seed doit être confirmée. À défaut, le champ est créé via l'admin (Content Type Builder) et le seed documente l'étape.

## 12. Décision laissée au rédacteur du code

L'arbitrage de collision du §5.3 est implémenté comme une fonction de comparaison isolée dans `select.ts`. Le tri par poids de source est un défaut raisonnable, mais le choix « quel article mérite le mot-clé quand deux le réclament » est éditorial avant d'être technique. La fonction, sa signature et son commentaire d'intention seront préparés ; la règle elle-même est à écrire par l'auteur du site.
