# EmDash AI Editorial Assistant — Assistant rédactionnel dans l'éditeur

Date : 2026-08-03  
Statut : implémenté  
Auteur(s) : Claude (développeur senior TypeScript)  

## 1. Contexte et objectif

Cannelle News est un site d'actualité spécialisé en IA, recherche, cybersécurité et open source, bâti sur EmDash (Astro + admin React + Cloudflare). L'équipe de rédaction produit plusieurs articles par jour et répète quatre tâches à chaque publication : trouver un titre optimisé, résumer l'article, rédiger la meta description, reformuler un passage technique pour un public non-expert. Ces tâches sont aujourd'hui faites dans un onglet ChatGPT séparé, puis recopiées à la main dans le CMS.

Objectif : rendre ces quatre actions accessibles **depuis l'éditeur**, avec insertion en un clic dans les champs correspondants, et un fournisseur de modèle configurable — dont une option locale pour que le contenu d'un article sous embargo ne quitte pas l'infrastructure.

Le plugin `@cannelle/plugin-seo-pro` a établi le patron de plugin natif du workspace (ports/adapters, routes zod, UI en CSS Modules, tests vitest co-localisés). Ce plugin le suit à la lettre.

## 2. Portée

### Inclus

- Les quatre actions du cahier des charges : 5 titres SEO, TL;DR en 3 puces, meta description ≤ 155 caractères, vulgarisation d'un passage.
- Trois fournisseurs : Ollama (local), Anthropic, OpenAI.
- Configuration : fournisseur, modèle, URL Ollama, clés API en stockage write-only, budget de tokens, langue de sortie.
- Prompts de fond éditables depuis l'admin, avec réinitialisation par prompt.
- Rendu public du TL;DR : encadré issu du champ, et bloc Portable Text insérable dans le corps.
- Tests unitaires du domaine, des adaptateurs, des routes et du parsing d'URL admin.

### Exclu

- Streaming des réponses (l'UI affiche un état d'attente, les sorties font quelques centaines de tokens).
- Historique des générations et suivi de coût par requête.
- Traduction, génération d'images, réécriture d'article complet.
- Actions en masse depuis la liste de contenus.

## 3. Contraintes de plateforme

Quatre faits vérifiés dans EmDash 0.30 — pas supposés — ont déterminé l'architecture. Ils invalident l'approche intuitive « un bouton dans la barre d'outils de l'éditeur ».

**3.1 — Aucun point d'extension « toolbar » ni « panneau latéral ».** Les seules surfaces disponibles dans l'éditeur sont le widget de champ, le bloc Portable Text et la page admin séparée. `PluginAdminModule` vaut `{ pages?, widgets?, fields? }` (`@emdash-cms/admin/dist/index.d.ts:74`), et un plugin « ne peut mounter que sous son propre espace de noms, il ne peut pas remplacer les écrans du cœur ».

**3.2 — Un widget de champ ne reçoit que sept props** : `value`, `onChange`, `label`, `id`, `required`, `options`, `minimal` (`@emdash-cms/admin/dist/index.js:14462-14472`). Ni les champs voisins, ni le corps de l'article, ni l'identifiant de l'entrée, ni l'état du formulaire. Conséquences directes : le contenu est lu **côté serveur** depuis l'entrée enregistrée, et l'entrée est identifiée en analysant l'URL de l'éditeur (`readEntryRef`).

**3.3 — La clé réservée `seo` de `ContentWriteInput` écrit dans `_emdash_seo`, table séparée de `data`** (`emdash/dist/types-BvB7gDOD.d.mts:300-308`). Un `ctx.content.update(coll, id, { seo })` ne touche donc aucun champ de contenu : le brouillon non enregistré ouvert dans l'éditeur survit à l'opération. C'est ce qui rend l'insertion « un clic » sûre pour le titre SEO et la meta description. Le composant `SeoPanel` reste du cœur, non extensible, et ne se rafraîchit qu'au rechargement.

**3.4 — Les réglages `type: "secret"` sont écrits sous `plugin:<id>:settings:<clé>`** (`emdash/dist/api-b8WIiGU4.mjs:2373`) et le préfixe du KV de plugin est `plugin:<id>:` (`context-B6hc7zJL.mjs:357`). Donc `ctx.kv.get("settings:openaiApiKey")` relit la valeur côté serveur, alors que l'API admin ne renvoie qu'un booléen `secretsSet` (`api-b8WIiGU4.mjs:2419-2426`). C'est le seul mécanisme write-only de la plateforme ; aucun autre plugin du dépôt ne l'utilisait.

**3.5 — L'UI d'édition d'un bloc Portable Text est du Block Kit déclaratif**, pas du React. Un bloc ne peut donc pas porter de bouton « Générer ».

**3.6 — Le message d'une exception levée par une route n'atteint jamais le navigateur.** `PluginRouteHandler.invoke` ne le conserve que si l'erreur est `instanceof PluginRouteError` (`emdash/src/plugins/routes.ts:182`), et ce test échoue **même en levant un vrai `PluginRouteError`** : en développement le runtime EmDash s'exécute depuis ses sources tandis que l'import du plugin résout le bundle `dist/`, soit deux objets de classe distincts. Constaté en conditions réelles — message correct dans les logs serveur, « Plugin route error » dans la réponse. Les échecs attendus voyagent donc dans la charge utile (`routes/result.ts`), pas par une exception.

## 4. Architecture

### Structure du package

```
src/plugins/ai-editorial-assistant/src/
  index.ts            descripteur + definePlugin
  admin.tsx           { pages, fields }
  settings-schema.ts  formulaire de réglages auto
  domain/             actions, config, prompts, parse, validate
  providers/          port LlmProvider + openai / anthropic / ollama + factory
  infrastructure/     portable-text, content-loader, kv-config
  routes/             generate, apply-seo, paragraphs, prompts
  ui/                 api, entry-ref, fields/, pages/, components/, styles/
  astro/              TldrBlock.astro, TldrBox.astro, blockComponents
```

### Règle de dépendances

`domain/` et `providers/` n'importent rien d'EmDash. Seul `infrastructure/` connaît `PluginContext`. Les routes orchestrent. Cette règle est ce qui permet de tester les quatre actions et les trois fournisseurs sans démarrer de serveur ni appeler de modèle : les adaptateurs reçoivent leur `fetch` en paramètre.

### Surfaces admin

| Surface | Mécanisme | Actions |
| --- | --- | --- |
| Champ `ai_assistant` (json) | widget `ai-editorial-assistant:panel` | titres SEO, meta description, vulgarisation |
| Champ `tldr` (json) | widget `ai-editorial-assistant:tldr` | TL;DR en 3 puces |
| Bloc `aiTldr` | `portableTextBlocks` + `componentsEntry` | encadré TL;DR dans le corps |
| Page `/prompts` | `admin.pages` | édition des prompts de fond |
| Formulaire auto | `admin.settingsSchema` | fournisseur, clés, modèle, tokens, langue |

Le champ `ai_assistant` n'est qu'un point d'ancrage : `onChange` n'y est jamais appelé, la valeur reste `null` en base. Le panneau produit des textes destinés au panneau SEO ou au presse-papier — rien qui mérite d'être conservé dans le contenu. Désinstaller le plugin ne laisse aucune donnée orpheline.

### Chaîne d'une action

```
widget React (admin)
  -> apiFetch POST /_emdash/api/plugins/ai-editorial-assistant/generate
  -> ctx.content.get()          contenu ENREGISTRÉ
     -> loadAssistantDocument   Portable Text -> texte + paragraphes
     -> loadConfig / loadSecrets / loadPrompts
     -> resolveProvider         échoue AVANT le réseau si la clé manque
     -> ctx.http.fetch          hôte validé contre allowedHosts
     -> parse + validate        5 titres / 3 puces / <= 155 car.
  -> propositions affichées
  -> insertion :
       tldr        onChange()            champ propre, part avec le Save
       titre/meta  POST apply-seo        table _emdash_seo, jamais data
       vulgarisé   bouton Copier
```

## 5. Décisions de conception

**5.1 — Les contraintes sont appliquées en code, pas seulement demandées au modèle.** `validate.ts` impose exactement cinq titres, exactement trois puces et 155 caractères maximum. Un prompt *demande* ; seul le code *garantit*. Une liste trop longue est tronquée (les modèles classent spontanément par pertinence décroissante), une liste trop courte est refusée : un TL;DR à deux puces publié sans que personne le remarque est pire qu'une erreur visible.

**5.2 — Trois stratégies de parsing en cascade.** JSON strict, puis objet enveloppant un tableau, puis lignes à puces. Un modèle local 8B ignore régulièrement la consigne JSON ; échouer sur une réponse exploitable serait un défaut du plugin, pas du modèle. L'extraction du littéral JSON balaie avec un compteur de profondeur en traversant les chaînes, pour qu'une accolade dans un titre ne casse pas le découpage.

**5.3 — La troncature de la meta description coupe sur une frontière de mot** et retire la ponctuation orpheline laissée par la coupe. C'est le détail qui trahit une description générée.

**5.4 — La reformulation n'est pas réinjectée dans le corps.** Écrire dans `content` écraserait le brouillon ouvert. Le rédacteur copie et remplace lui-même, ce qui lui laisse aussi le contrôle du passage exact.

**5.5 — L'UI dit toujours sur quelle version elle a travaillé.** `updatedAt` de l'entrée lue remonte jusqu'au widget. C'est la contrepartie honnête de la contrainte 3.2.

**5.6 — Les erreurs sont capturées et rendues dans le widget.** Une exception qui remonterait déclencherait `PluginFieldErrorBoundary` et remplacerait le champ par un message générique : le rédacteur perdrait l'accès à l'outil pour une clé API expirée. Les messages sont écrits pour une personne sans accès aux logs (« clé API refusée », « `ollama pull <modèle>` »).

## 6. Intégration EmDash

- **Capabilities** : `content:read`, `content:write`, `network:request`. `content:write` ne sert qu'à `apply-seo`, qui n'écrit que la clé `seo`.
- **allowedHosts** : `api.openai.com`, `api.anthropic.com`, plus l'hôte Ollama passé en option depuis `astro.config.mjs`. La liste est figée à la construction du contexte HTTP (`context-B6hc7zJL.mjs:790`) : un réglage d'admin ne peut pas l'élargir. La validation porte sur le nom d'hôte seul, le port est ignoré.
- **Hooks** : aucun. Toutes les actions sont déclenchées par le rédacteur.
- **Stockage** : aucune collection. Seulement le KV, pour les prompts.
- **Types non exportés** : `SettingField` et `FieldWidgetConfig` ne sont pas exposés par les points d'entrée publics d'`emdash`. Ils sont dérivés structurellement de `PluginDescriptor`, qui l'est — le contrôle de type reste complet sans import de chemin interne.

## 7. Routes

| Route | Entrée | Sortie |
| --- | --- | --- |
| `generate` | `{ collection, id, action, paragraphIndex?, text? }` | `{ result, model, provider, updatedAt }` |
| `apply-seo` | `{ collection, id, title?, description? }` | `{ applied }` |
| `paragraphs` | `{ collection, id }` | `{ items, updatedAt }` |
| `prompts` | `{ patch? }` | `{ prompts, defaults, overridden }` |

Aucune route n'est `public`. Les schémas viennent d'`astro/zod`. Les handlers prennent **un seul argument** : `RouteContext` étend `PluginContext`. Les erreurs sont des `Error` préfixées `ai-editorial-assistant:`, sérialisées par EmDash et déballées par `ui/api.ts`.

Cas d'erreur explicitement couverts : capability absente, entrée introuvable, article vide, fournisseur non configuré, HTTP 401/404/429/5xx, sortie inparsable, sortie hors contrat, index de paragraphe périmé.

## 8. Schéma de contenu

Deux champs ajoutés à `posts` dans `seed/seed.json` :

```json
{ "slug": "tldr", "type": "json", "widget": "ai-editorial-assistant:tldr" },
{ "slug": "ai_assistant", "type": "json", "widget": "ai-editorial-assistant:panel" }
```

`tldr` stocke un `string[]` nu — pas d'objet enveloppe, pas de métadonnée de génération : désinstaller le plugin laisse un contenu valide, et le rendu Astro n'a rien à déballer.

Le seed ne s'applique qu'à une base neuve. Sur une base existante, les champs se créent via **Content Types → Posts** avec le même `widget`. Tant qu'ils n'existent pas, `emdash-env.d.ts` ne connaît pas `tldr` : l'accès est élargi dans `src/pages/posts/[slug].astro`, avec `TldrBox` qui valide la valeur à l'exécution.

## 9. Tests

92 tests répartis sur 9 fichiers, aucun accès réseau ni base.

- `domain/parse.test.ts` — JSON préfacé, accolade dans une chaîne, littéral mal formé, puces, doublons.
- `domain/validate.test.ts` — comptes exacts, troncature à 155 sur frontière de mot, ponctuation orpheline, normalisation.
- `providers/providers.test.ts` — les trois adaptateurs, forme des requêtes, messages d'erreur HTTP, repli de modèle.
- `infrastructure/portable-text.test.ts` — sur `fixtures/article-ia.json` : intertitres, images et blocs courts exclus, index de bloc conservé.
- `routes/*.test.ts` — via `test/mock-ctx.ts` : contexte en mémoire avec `kv`, `content`, `http`. `ctx.content.update` y reproduit la séparation `seo` / `data`, ce qui permet de tester que le brouillon n'est pas écrasé.
- `ui/entry-ref.test.ts` — analyse de l'URL de l'éditeur, cas `new`.

Les surfaces non implémentées du contexte sont laissées absentes : une route qui commencerait à lire `ctx.media` doit échouer bruyamment.

## 10. Risques et limites

| Risque | Mitigation |
| --- | --- |
| Génération sur une version antérieure au brouillon | `updatedAt` affiché dans l'UI ; l'autosave d'EmDash couvre le cas courant |
| Panneau SEO non rafraîchi après écriture | message explicite « rechargez l'éditeur » |
| Modèle local qui ignore le format demandé | parsing en cascade (dont objet de chaînes) + `format: "json"` côté Ollama |
| Modèle à raisonnement qui épuise le budget en `thinking` | `think: false` sur Ollama + message dédié sur `done_reason: "length"` |
| Prébundle Vite périmé après édition du plugin | `rm -rf node_modules/.vite` documenté dans le README |
| Clé API exposée | champs `secret`, jamais renvoyés par l'API ; aucune route ne les lit |
| Hôte Ollama changé après déploiement | `allowedHosts` est figé au build ; documenté dans le README |
| Coût d'un fournisseur distant | `maxTokens` plafonné, contexte tronqué à 8 000 caractères |

## 11. Suites possibles

- Réinjection de la vulgarisation dans le corps, si EmDash expose un jour une API d'édition du Portable Text depuis un widget.
- Action « suggérer des tags » branchée sur les taxonomies existantes.
- Widget de tableau de bord : articles publiés sans TL;DR ni meta description.

## 12. Critères de réussite

- Les quatre actions produisent un résultat conforme au contrat sur un article réel, avec les trois fournisseurs.
- Aucune action ne peut faire perdre une modification non enregistrée.
- Une clé API saisie dans l'admin n'est jamais relisible depuis le navigateur.
- `pnpm test` et `astro check` passent ; `astro build` réussit.
