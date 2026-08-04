# Plan — plugin anti-plagiat

**Nom de travail :** `content-integrity`
**Date :** 2026-08-04
**État :** plan, avant écriture de code

---

## 1. Objectif

Deux problèmes distincts, un seul moteur :

| | Question posée | Qui la pose |
|---|---|---|
| **Sortant** | « Qui a republié mon article sans autorisation ? » | Direction, juridique |
| **Entrant** | « Ce brouillon reprend-il un texte existant ? » | Rédaction en chef |
| **Interne** | « Ces deux articles disent-ils la même chose ? » | SEO, archives |

Les trois se ramènent à la même opération : *mesurer le recouvrement textuel entre un document et un corpus, et localiser les passages responsables*. Le corpus change, pas le moteur.

## 2. Décisions arrêtées

1. **Les deux directions, en phases.** Socle commun d'abord, surfaces ensuite.
2. **Hors-ligne d'abord.** Le moteur et la détection interne ne font aucun appel réseau. La surveillance web existe mais reste inerte tant qu'aucune clé n'est renseignée — le plugin est utile dès l'installation, sans compte ni budget.

Conséquence directe sur l'ordre de construction : la phase 1 livre de la valeur seule. Si les phases 2 et 3 ne sont jamais faites, le plugin reste justifiable.

## 3. Contraintes du terrain

Vérifiées dans le runtime EmDash 0.30 installé, pas supposées :

| Contrainte | Source | Conséquence de conception |
|---|---|---|
| `where` accepte `{ in: [...] }`, `{ startsWith }`, `{ gte/lte }` — **sur champ indexé uniquement** | `emdash/src/plugins/storage-query.ts:39,79` | L'index LSH se requête en **une** requête. Ne jamais charger l'index en mémoire. |
| `ctx.cron` toujours disponible, scopé au plugin | `emdash/src/plugins/types.ts:509` | La surveillance sortante ne demande aucune infrastructure externe. |
| Hooks contenu disponibles : `beforeSave`, `afterSave`, `afterPublish`, `afterUnpublish`, `beforeDelete`, `afterDelete`, `afterRestore` | `emdash/src/plugins/types.ts` | **Pas de `beforePublish`.** Le contrôle avant publication est donc consultatif (route + widget), pas un verrou. |
| `allowedHosts` figé à la construction du contexte | `emdash/dist/context-B6hc7zJL.mjs:790` | Récupérer une URL arbitraire exige `network:request:unrestricted`. Décision § 8.2. |
| Permission par défaut d'une route plugin : `plugins:manage` | `astro/routes/api/plugins/[pluginId]/[...path].ts:32` | Déclarer `permission` sur **chaque** route dès le premier jour (cf. SEC-6 de `audit.md`). |
| Budget CPU Worker borné, D1 paginé | Cloudflare | Pas de travail O(corpus) dans une requête. Reconstruction par curseur. |

Convention du dépôt (`AGENTS.md`) : pas de librairie de composants, CSS Modules, tests Vitest, architecture hexagonale comme `seo-pro` et `auto-internal-linker`.

---

## 4. Le moteur

### 4.1 Normalisation

Portable Text → texte plat, en réutilisant le motif de `seo-pro/src/content/portable-text.ts`.

```
blocs → texte plat → minuscules → NFD sans diacritiques
      → apostrophes typographiques unifiées → espaces compactés
      → ponctuation retirée → tableau de mots + table d'offsets bruts
```

La table d'offsets est ce qui permet de remonter du mot normalisé au caractère d'origine — sans elle, impossible de surligner le passage dans l'article. Même technique que `auto-internal-linker/src/matching/normalize.ts` (`normalizeWithOffsets`).

### 4.2 Shingles

w-grammes de **mots**, `w = 6` par défaut, réglable de 4 à 12.

Le choix de `w` est le seul curseur qui compte vraiment :

- `w = 4` : détecte les reformulations légères, mais toute tournure de presse (« a déclaré lors d'une conférence de presse ») devient une correspondance.
- `w = 8` : quasi aucun faux positif, mais un plagiaire qui change un mot tous les six perd la trace.
- `w = 6` : le compromis retenu. À valider sur le corpus réel en phase 1.

Chaque shingle est réduit à un entier 32 bits (FNV-1a, sans dépendance).

### 4.3 Empreinte : MinHash + bandes LSH

Pour chaque document : `k = 128` valeurs MinHash à partir de l'ensemble de ses shingles.

Ces 128 valeurs sont découpées en `b = 32` bandes de `r = 4` lignes. Chaque bande est hachée **avec son propre index** dans l'entrée du hash — un seul champ `bandHash` indexé suffit alors, sans risque de collision entre bandes.

La récupération de candidats devient :

```ts
const bandHashes = fingerprint.bands;             // 32 entiers
const candidates = await storage.bands.query({
  where: { bandHash: { in: bandHashes } },        // 1 requête, champ indexé
  limit: 200,
});
```

**C'est le cœur du plan.** Sans banding, comparer un article au corpus impose de lire tout le corpus — exactement le défaut relevé en OPT-1 dans `audit.md`. Avec banding, le coût est constant en taille de corpus.

Le réglage `b = 32, r = 4` place le seuil de détection LSH autour de 45 % de similarité Jaccard : deux documents plus proches que ça ressortent presque toujours candidats, en dessous ils ressortent rarement. Réglable si le corpus dit autre chose.

### 4.4 Scoring : recouvrement, pas Jaccard

Décision importante. Jaccard pénalise les écarts de longueur : 300 mots volés dans un article de 2 000 donnent un Jaccard de ~0,15 — sous n'importe quel seuil utile — alors que c'est un vol caractérisé.

On calcule donc le **recouvrement directionnel** :

```
containment(A → B) = |shingles(A) ∩ shingles(B)| / |shingles(A)|
```

Et on remonte les **deux** directions. `containment(court → long) = 0,95` est le signal ; Jaccard l'aurait manqué.

Jaccard reste calculé et affiché, mais comme information de contexte, jamais comme seuil de décision.

### 4.5 Localisation des passages

Une fois une paire candidate identifiée, on ne travaille plus que sur **deux** documents. Plus besoin de structure approchée : comparaison exacte.

```
1. table de hachage shingle → positions, sur le document A
2. balayage de B ; chaque shingle présent dans A ouvre ou prolonge une piste
3. les pistes contiguës fusionnent en passages
4. passages plus courts que `w + 2` mots : écartés
5. offsets normalisés → offsets bruts via la table d'offsets
```

Sortie : une liste de passages avec leurs positions dans les deux textes. C'est ce que voit le rédacteur — pas un pourcentage, mais du texte surligné en vis-à-vis.

### 4.6 Exclusions — la partie qui décide de l'adoption

Un détecteur de plagiat qui ignore les usages du journalisme signale tout, donc n'est plus lu. Trois filtres, appliqués **avant** le calcul d'empreinte :

**Citations.** Le contenu des blocs `blockquote`, et les passages entre guillemets français (« … ») ou droits, sont retirés du jeu de shingles. Deux journaux qui citent la même déclaration ne se plagient pas.

**Boilerplate maison.** On tient une fréquence documentaire des shingles sur son propre corpus. Un shingle présent dans plus de 2 % des articles est du gabarit — signature, mention légale, formule de relance — et sort de l'index. Calculé pendant la reconstruction, stocké dans `settings:shingleDf`.

**Dépêches d'agence.** Une liste de sources autorisées (AFP, Reuters, domaines syndiqués). Une correspondance dont le passage provient d'un texte marqué « dépêche » est enregistrée mais classée d'emblée en `allowed`, non en `new`.

Le troisième filtre suppose que les dépêches sont identifiables dans le CMS. Si ce n'est pas le cas, la phase 1 se limite aux deux premiers et la liste de sources autorisées attend un champ de collection.

---

## 5. Modèle de données

Quatre collections de stockage plugin. Les index sont déclarés — sans quoi `storage-query` refuse la requête (`storage-query.ts:79`).

### `fingerprints` — une entrée par article indexé

```ts
{
  id: `${collection}:${entryId}`,
  entryId, collection,
  contentHash,        // court-circuit : texte inchangé, on ne recalcule rien
  wordCount, shingleCount,
  minhash: number[],  // 128 valeurs
  language,
  indexedAt,
}
indexes: ["entryId", "collection", "contentHash", "indexedAt"]
```

### `bands` — l'index LSH

```ts
{
  id: `${entryId}:${bandIndex}`,
  bandHash,           // hash de (bandIndex, tranche minhash)
  bandIndex, entryId, collection,
}
indexes: ["bandHash", "entryId", ["bandHash", "collection"]]
```

32 lignes par article. 5 000 articles → 160 000 lignes, taille parfaitement tenable sur D1, et la seule requête de lecture est un `IN` sur colonne indexée.

### `matches` — les constats

```ts
{
  id,
  kind: "internal" | "inbound" | "external",
  sourceCollection, sourceEntryId,
  targetEntryId: string | null,      // interne
  targetUrl: string | null,          // externe — assaini à l'écriture
  targetTitle, targetFetchedAt,
  containmentSource, containmentTarget, jaccard,
  passages: Array<{ sourceStart, sourceEnd, targetStart, targetEnd, text }>,
  status: "new" | "reviewed" | "dismissed" | "confirmed" | "allowed",
  detectedAt, reviewedAt, reviewedBy,
  contentHashAtDetection,            // rouvre le constat si le texte change
}
indexes: ["status", "kind", "detectedAt", "sourceEntryId",
          ["status", "kind"], ["sourceEntryId", "status"]]
```

`contentHashAtDetection` porte la mémoire des rejets : un constat écarté le reste tant que l'article n'a pas bougé. Sans ce champ, chaque réindexation ressort les mêmes faux positifs et l'outil devient du bruit en deux semaines.

### `watch` — file de surveillance (phase 3)

```ts
{
  id: entryId,
  collection, probes: string[],      // phrases-sondes, cf. § 8.3
  priority, lastCheckedAt, nextCheckAt,
  provider, lastStatus,
}
indexes: ["nextCheckAt", "priority", ["provider", "nextCheckAt"]]
```

---

## 6. Architecture des modules

Même découpage hexagonal que `seo-pro` — le domaine ne sait pas qu'EmDash existe.

```
src/plugins/content-integrity/src/
├── index.ts                     descripteur + définition runtime
├── settings-schema.ts
│
├── text/                        ── pur, sans I/O ──
│   ├── normalize.ts             texte plat + table d'offsets
│   ├── portable-text.ts         blocs → texte, extraction des citations
│   ├── shingles.ts              w-grammes → entiers
│   └── quotes.ts                repérage des zones citées
│
├── fingerprint/                 ── pur ──
│   ├── hash.ts                  FNV-1a 32 bits
│   ├── minhash.ts               k signatures
│   ├── bands.ts                 découpage LSH
│   └── document.ts              texte → Fingerprint
│
├── compare/                     ── pur ──
│   ├── containment.ts           recouvrement directionnel + Jaccard
│   ├── align.ts                 localisation des passages
│   └── verdict.ts               seuils → gravité
│
├── domain/
│   ├── config.ts                réglages + fusion avec les défauts
│   ├── match.ts                 le constat, ses transitions d'état
│   └── boilerplate.ts           fréquence documentaire, seuil de gabarit
│
├── infrastructure/              ── I/O ──
│   ├── fingerprint-store.ts
│   ├── band-index.ts            requête LSH, insertion, purge
│   ├── match-store.ts
│   ├── watch-store.ts
│   ├── kv-config.ts
│   └── content-loader.ts        ContentItem → document du domaine
│
├── providers/                   ── phase 3, réseau ──
│   ├── types.ts                 port SearchProvider
│   ├── brave.ts
│   ├── serpapi.ts
│   └── factory.ts
│
├── routes/                      check, matches, match, rebuild, settings, scan
└── ui/                          page admin, widget de champ, widget dashboard
```

Règle de dépendance : `text/`, `fingerprint/`, `compare/` n'importent **rien** d'EmDash. Ils se testent avec des chaînes de caractères, sans mock de contexte — ce sont eux qui portent la complexité, ils doivent être les plus faciles à tester.

---

## 7. Surfaces

### Routes

Chacune déclare sa `permission` — corrige d'emblée SEC-6 de `audit.md`.

| Route | Permission | Rôle |
|---|---|---|
| `check` | `content:update` | Analyser une entrée contre le corpus, à la demande |
| `matches` | `content:update` | Liste paginée, filtrée par statut et gravité |
| `match` | `content:update` | Un constat avec ses passages, pour l'affichage en vis-à-vis |
| `review` | `content:update` | Changer le statut d'un constat |
| `rebuild` | `plugins:manage` | Réindexation, **par curseur** |
| `settings` | `plugins:manage` | Lire/écrire les réglages |
| `scan` | `plugins:manage` | Déclencher un balayage web (phase 3) |

`rebuild` renvoie son curseur et l'UI reboucle. La réindexation d'un corpus entier dans une seule requête dépasserait le budget CPU du Worker — c'est le défaut OPT-4 relevé dans `audit.md`, à ne pas reproduire.

### Hooks

```ts
"content:afterPublish"  → indexer
"content:afterSave"     → indexer si status === "published", court-circuit sur contentHash
"content:afterUnpublish"→ retirer de l'index (un article dépublié n'est plus une cible)
"content:afterDelete"   → purger empreinte + bandes + constats
"content:afterRestore"  → réindexer si publié
"cron"                  → phase 3 : dépiler `watch`
```

Le court-circuit `contentHash` est ce qui rend le hook gratuit : un enregistrement qui ne touche pas au corps ne déclenche ni shingling ni écriture.

Ne **pas** indexer les brouillons. Un brouillon change à chaque sauvegarde ; l'indexer réécrirait 32 lignes de bandes à chaque fois pour un document qui n'est encore la cible de rien.

### Admin

**Page « Intégrité »** — file de constats, triée par gravité, filtrable par statut et par type. Chaque ligne : article source, cible, recouvrement, date. Ouvrir un constat affiche les passages **en vis-à-vis, surlignés** — la seule représentation sur laquelle un rédacteur en chef peut trancher. Un pourcentage seul ne se juge pas.

**Widget de champ** sur l'éditeur — état d'intégrité de l'article ouvert, bouton « Vérifier maintenant ». Consultatif : il n'y a pas de hook `beforePublish`, et même s'il y en avait un, bloquer la publication sur un score serait une erreur (§ 9).

**Widget de tableau de bord** — nombre de constats non traités, et le plus grave des sept derniers jours.

---

## 8. Phases

### 8.1 Phase 1 — Socle et détection interne

**Aucun réseau. Livrable autonome.**

Contenu : `text/`, `fingerprint/`, `compare/`, les trois stores, les hooks d'indexation, les routes `check` / `matches` / `match` / `review` / `rebuild` / `settings`, la page admin, le widget de champ.

Ce que ça résout dès la mise en service :
- auto-plagiat entre articles maison (recyclage de paragraphes d'archives) ;
- contenu dupliqué qui pénalise le référencement ;
- doublons créés par un import ou une migration.

Critère de sortie : sur le corpus réel, moins de 5 % de faux positifs sur un échantillon relu à la main de 50 constats. Si le taux dépasse ça, `w` et les exclusions se règlent avant de passer à la suite.

### 8.2 Phase 2 — Contrôle avant publication (entrant)

Le rédacteur déclare ses sources sur l'article, et le plugin compare le brouillon à ces sources plus au corpus interne.

**Deux modes d'apport de la source, et le choix n'est pas anodin :**

*Coller le texte* — aucun réseau, aucune capacité supplémentaire, fonctionne partout. Le rédacteur colle le texte consulté dans un champ dédié.

*Récupérer l'URL* — confortable, mais `allowedHosts` est figé à la construction du contexte : récupérer une URL arbitraire impose la capacité `network:request:unrestricted`. C'est un élargissement réel de la surface d'attaque du plugin, à accorder en connaissance de cause.

**Recommandation : coller par défaut, récupération par URL en option explicite**, désactivée tant qu'un administrateur ne l'a pas activée, et signalée comme telle dans les réglages.

### 8.3 Phase 3 — Surveillance sortante

Cron quotidien. Pour chaque article de la file, par ordre de priorité :

**Choix des phrases-sondes.** On ne cherche pas l'article entier — on cherche ce qui ne peut appartenir qu'à lui. Les shingles de **plus faible fréquence documentaire** sont les plus distinctifs : c'est exactement la statistique déjà calculée pour la suppression du boilerplate (§ 4.6). Trois sondes de 8 à 12 mots par article, prises hors citations.

**Interrogation.** Requête exacte auprès du fournisseur configuré (Brave Search ou SerpAPI ; port `SearchProvider`, adaptateurs interchangeables comme les fournisseurs LLM de `ai-editorial-assistant`).

**Vérification.** Chaque URL candidate est récupérée, réduite à du texte, empreinte calculée, recouvrement mesuré. Au-dessus du seuil, un `match` de type `external` est ouvert.

**Alerte.** `ctx.email` si la capacité `email:send` est accordée et un fournisseur configuré. Sinon le constat attend en file.

**Dossier de preuve.** Une route qui produit un rapport daté : date de publication d'origine, URL canonique, passages en correspondance, taux de recouvrement, horodatage de constatation, et copie textuelle de la page incriminée. Utilisable en pièce jointe d'une mise en demeure ou d'une notification DMCA. Le plugin ne prétend pas à la valeur probante — il rassemble et date, un conseil juridique tranche.

Les domaines syndiqués et le domaine propre figurent dans une liste d'exclusion, sinon chaque scan remonte ses propres reprises autorisées.

---

## 9. Faux positifs — la contrainte qui décide de tout

Ce type d'outil meurt d'une seule cause : trop d'alertes, plus personne ne les ouvre. Quatre décisions vont contre cette pente :

1. **Jamais bloquant.** Le contrôle est consultatif. Un rédacteur qui cite longuement une source ne doit pas se battre contre l'outil pour publier.
2. **Les rejets sont mémorisés**, indexés sur le hash du contenu. Un constat écarté ne reparaît que si l'article change.
3. **Les citations sortent du calcul**, pas du rapport. Elles restent visibles à la relecture, mais ne pèsent pas dans le score.
4. **Seuils de gravité, pas seuil unique.** `< 15 %` ignoré · `15–35 %` signalé, faible · `35–60 %` à relire · `> 60 %` grave. Le recouvrement d'un passage court dans un long texte compte davantage qu'un taux global.

Le seuil retenu doit être calibré sur le corpus réel avant l'ouverture aux rédacteurs, pas fixé à l'avance depuis la littérature.

---

## 10. Sécurité — d'emblée, pas après coup

Les défauts relevés dans `audit.md` sur les cinq plugins existants viennent tous d'un même manque : la validation est faite au rendu, pas à l'écriture. Ce plugin manipule du contenu récupéré sur des sites hostiles par construction — l'ordre inverse s'impose.

| Règle | Motif |
|---|---|
| `permission` déclarée sur chaque route | SEC-6 : le défaut `plugins:manage` force à donner les droits d'installation de plugins à toute la rédaction |
| `targetUrl` assaini **à l'écriture** dans `matches`, pas seulement à l'affichage | SEC-1 / SEC-5 : réutiliser `glossary-cards/src/lib/safe-href.ts` |
| `https:` uniquement pour toute récupération externe | SEC-3 : sans quoi un intermédiaire réseau contrôle le contenu analysé |
| HTML tiers **jamais rendu** — extraction texte, échappement, puis affichage | La page d'un contrefacteur est une entrée hostile ; l'afficher brut dans l'admin serait une XSS offerte |
| Aucun `set:html` recevant du `JSON.stringify` sans échapper `<` | SEC-2 |
| Taille de réponse plafonnée à la récupération (1 Mo), délai 5 s, redirections bornées | Une cible peut servir une réponse démesurée |
| Clés API dans `ProviderSecrets`, jamais dans un type retourné par une route | Séparation déjà appliquée dans `ai-editorial-assistant/src/domain/config.ts` |

---

## 11. Budget de performance

Objectifs, à mesurer et non à supposer :

| Opération | Cible | Moyen |
|---|---|---|
| Indexation d'un article au hook | < 150 ms | Court-circuit `contentHash`, un seul `putMany` |
| `check` d'un article contre le corpus | < 400 ms | Une requête LSH, comparaison exacte sur ≤ 20 candidats |
| Requêtes D1 par `check` | ≤ 4 | Bandes (1) + empreintes candidates (1) + config (1) + constats existants (1) |
| Page `rebuild` | 50 articles | Par curseur, l'UI reboucle |

**Interdits explicites**, hérités des défauts constatés à l'audit :
- pas de `store.all()` sur `fingerprints` ni sur `bands` ;
- pas de relecture de configuration par article dans une boucle (OPT-4) ;
- pas de `JSON.stringify` du corps entier pour détecter un changement (OPT-2) — c'est le rôle de `contentHash` ;
- pas de filtrage après pagination (OPT-5) : le statut et le type sont indexés, donc filtrables côté stockage.

---

## 12. Tests

Vitest, comme le reste du dépôt.

**Unitaires, sans mock — la majorité du travail.** `normalize` conserve les offsets ; `shingles` respecte `w` et les bornes ; `minhash` est stable et symétrique ; `bands` découpe sans perte ; `containment` sur ensembles connus ; `align` trouve un passage inséré, un passage déplacé, et ne trouve rien sur deux textes indépendants.

**Golden set.** Un jeu de paires étiquetées à la main, en français :
- reprise verbatim → doit sortir ;
- reprise avec synonymes → doit sortir en gravité moindre ;
- même dépêche d'agence chez deux titres → ne doit **pas** sortir ;
- même citation de conférence de presse → ne doit **pas** sortir ;
- deux articles sur le même fait, écrits séparément → ne doit **pas** sortir.

Les trois derniers cas sont les plus importants du plan : ce sont eux qui disent si l'outil est utilisable en rédaction.

**Intégration**, avec `test/mock-ctx.ts` sur le modèle des plugins existants : cycle indexer → détecter → rejeter → réindexer sans changement → le constat rejeté ne revient pas.

---

## 13. Ce qu'on ne construit pas

- **Pas d'embeddings ni de modèle.** Budget CPU du Worker, et surtout : un score lexical s'explique devant un avocat ou un rédacteur en chef, un score de proximité vectorielle non.
- **Pas de détection translingue.** Autre problème, autre outil.
- **Pas de service tiers de détection.** Décision § 2.
- **Pas de verrou de publication.** § 9.
- **Pas de crawl.** On interroge un moteur de recherche, on ne parcourt pas le web.
- **Pas d'envoi automatique de mise en demeure.** Le plugin rassemble la preuve ; l'action reste humaine.

---

## 14. Risques et inconnues

| Risque | Effet | Traitement |
|---|---|---|
| `w = 6` mal calibré pour du français de presse | Bruit ou silence | Critère de sortie de phase 1 : relecture manuelle de 50 constats |
| Volume de `bands` sur un très gros corpus | Coût D1 | 32 lignes/article ; à 50 000 articles, revoir `b` à la baisse ou partitionner par collection |
| Dépêches non identifiables dans le CMS | Filtre d'agence inapplicable | Repli sur les deux premiers filtres ; le troisième attend un champ de collection |
| Quota et coût de l'API de recherche | Phase 3 limitée | Priorisation de la file ; quota configurable ; le plugin reste utile sans |
| `network:request:unrestricted` refusée par la politique du site | Phase 2 sans récupération d'URL | Le mode « coller le texte » est le défaut, pas un repli |
| Absence de `beforePublish` | Pas de contrôle bloquant possible | Assumé, et souhaitable (§ 9) |

---

## 15. Prochaine étape

Ce document est un plan, pas une spécification d'implémentation. Avant d'écrire du code :

1. **Valider le périmètre de la phase 1** — est-ce le bon premier livrable ?
2. **Trancher deux points ouverts** : les dépêches d'agence sont-elles identifiables dans le schéma actuel ? quelles collections entrent dans le corpus ?
3. **Écrire le plan d'implémentation** — découpage en tâches testables, dans l'ordre, avec les critères de vérification de chacune.

Le point 3 relève de la compétence `superpowers:writing-plans` et suppose les points 1 et 2 réglés.
