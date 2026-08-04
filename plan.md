# Plan d'action — Audit plugins (2026-08-04)

Suite à l'audit complet des 5 plugins (`ai-editorial-assistant`, `auto-internal-linker`, `glossary-cards`, `research-paper-embed`, `seo-pro`).

## 🔴 Priorité 1 — Sécurité / bugs bloquants

- [x] **XSS JSON-LD** — `glossary-cards/src/astro/GlossaryJsonLd.astro:34` et `research-paper-embed/src/astro/ResearchPaperJsonLd.astro:34` échappent pas `<` dans `JSON.stringify()` injecté via `set:html`. Créer un helper partagé `toSafeJsonLd()` (remplace `<` → `<`), réutiliser dans les deux plugins.
- [x] **glossary-cards storage cassé** — `glossary-store.ts:41` fait `query({where:{id}})` sur un champ non indexé (index déclaré = `["term"]` seulement). Throw en storage réel, faux vert en tests (mock n'impose pas la contrainte d'index). Remplacer par `collection.get/put/delete` direct.
- [x] **glossary-cards collision slug** — nouvel ID = `slugify(term)` non vérifié. Deux termes proches → écrasement silencieux. Ajouter détection de collision.

## 🟠 Priorité 2 — Fiabilité / scaling

- [x] **seo-pro** — pas de hook `afterDelete`/`afterUnpublish` : rapports SEO d'articles supprimés restent en base indéfiniment. Copier le pattern déjà résolu dans `auto-internal-linker`.
- [x] **auto-internal-linker** — `rebuild` (routes/rebuild.ts:29-62) ne purge pas les entrées orphelines et boucle en synchrone sans budget CPU (risque timeout Workers sur gros site). Chunker + purger le delta.
- [x] **auto-internal-linker** — `suggest`/`beforeSave` chargent l'index entier à chaque appel (O(taille index)). À revoir avant que le site grossisse.
- [x] **seo-pro** — filtre `grade` appliqué après pagination (`routes/reports.ts:39-53`) → résultats filtrés invisibles si peu nombreux. Pousser le filtre dans la requête storage.
- [x] **seo-pro** — `canonical.ts:8-27` valide juste la présence, pas que l'URL est bien formée / même origine que `siteUrl`.

## 🟡 Priorité 3 — Correctifs mineurs

- [x] **research-paper-embed** — arXiv retourne HTTP 200 même sur ID invalide (`<entry>` titre "Error"), pas détecté comme échec.
- [x] **research-paper-embed** — `staleDays` (refresh auto) accepté mais jamais utilisé nulle part — feature morte, implémenter ou retirer.
- [x] **research-paper-embed** — `RefreshButton.tsx` n'est importé nulle part dans l'éditeur de bloc — inaccessible.
- [x] **research-paper-embed** — fetch arXiv en `http://`, passer en `https://`.
- [x] **glossary-cards** — dépendance `zod` déclarée mais jamais importée (utilise `astro/zod`) — dead dependency.
- [x] **glossary-cards** — pas d'édition de terme dans l'UI (retype complet pour modifier).
- [x] **seo-pro** — capacités `media:read`/`taxonomies:read` déclarées mais jamais utilisées.

## 🟢 Idées d'ajout (au-delà des bugs)

- [x] Dashboard santé d'index pour `auto-internal-linker` (nombre indexé vs publié réel).
- [x] Audit d'articles orphelins / jamais liés (`auto-internal-linker`, scopé v2 dans le spec — hors périmètre Bloc 1). Route `audit`, widget `linker-audit`, page `/audit` avec seuils configurables.
- [x] `seo-pro` Bloc 2 — génération auto title/meta/OpenGraph/Twitter via routes `generate-meta` + `apply-meta` et UI dans `EntryReportPage`. Le rendu final des tags sociaux dans `<head>` dépend des templates Astro / du panneau SEO natif.
- [x] Builder JSON-LD partagé entre `glossary-cards`, `research-paper-embed`, futur Bloc 3 `seo-pro` — évite triplication + centralise le fix XSS.
- [x] Widget dashboard "articles sans TL;DR/meta" (`ai-editorial-assistant`, déjà scopé au spec §11).
