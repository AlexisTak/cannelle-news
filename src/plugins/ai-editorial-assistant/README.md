# @cannelle/plugin-ai-editorial-assistant

Assistant rédactionnel IA natif pour EmDash : quatre actions accessibles depuis
l'éditeur de contenu, avec insertion en un clic dans les champs correspondants.

| Action | Où | Insertion |
| --- | --- | --- |
| Générer 5 titres SEO | champ `ai_assistant` | panneau SEO natif, ou copie |
| Rédiger la meta description (≤ 155 car.) | champ `ai_assistant` | panneau SEO natif, ou copie |
| Vulgariser un passage | champ `ai_assistant` | copie |
| Créer le TL;DR (3 puces) | champ `tldr` | le champ lui-même |

Fournisseurs : **Ollama** (local, par défaut), **Anthropic**, **OpenAI**.

## Installation

Le plugin est enregistré dans `astro.config.mjs` :

```js
import { aiEditorialAssistantPlugin } from "./src/plugins/ai-editorial-assistant/src/index.ts";

emdash({
  plugins: [aiEditorialAssistantPlugin({ ollamaHost: "localhost" })],
});
```

`ollamaHost` alimente `allowedHosts`. La liste est figée à la construction du
contexte : un réglage d'admin ne peut pas l'élargir après coup.

Champs à ajouter à la collection `posts` (présents dans `seed/seed.json`) :

```json
{ "slug": "tldr", "type": "json", "widget": "ai-editorial-assistant:tldr" },
{ "slug": "ai_assistant", "type": "json", "widget": "ai-editorial-assistant:panel" }
```

Sur une base existante, les créer via **Content Types → Posts** avec le même
`widget`, sans quoi les widgets ne sont jamais montés.

## Configuration

- **Plugins → AI Editorial Assistant** : fournisseur, modèle, URL Ollama, clés
  API, budget de tokens, langue. Les clés sont des champs `secret` : EmDash ne
  les renvoie jamais au navigateur, seulement un booléen « renseignée ».
- **Prompts IA** (page du plugin) : les quatre consignes système. Les limites
  dures — cinq titres, trois puces, 155 caractères — sont réappliquées en code
  après la réponse du modèle, quel que soit le prompt.

## Ce que le plugin ne peut pas faire

EmDash 0.30 n'expose ni barre d'outils d'éditeur, ni API de sélection, et un
widget de champ ne reçoit que sa propre valeur — pas les champs voisins, pas le
brouillon en cours. Conséquences assumées :

- les actions travaillent sur la **dernière version enregistrée** ; l'UI affiche
  laquelle ;
- « Vulgariser » ne lit pas la sélection : le passage se choisit dans la liste
  des paragraphes ou se colle à la main ;
- la reformulation n'est pas réinjectée dans le corps de l'article (écrire dans
  `content` écraserait le brouillon ouvert) ;
- l'écriture SEO est sûre parce que la clé réservée `seo` va dans une table
  séparée de `data` — mais le panneau SEO natif ne se rafraîchit qu'au
  rechargement de l'éditeur.

## Endpoints

Base : `/_emdash/api/plugins/ai-editorial-assistant/`

| Route | Entrée | Sortie |
| --- | --- | --- |
| `generate` | `{ collection, id, action, paragraphIndex?, text? }` | `{ result, model, provider, updatedAt }` |
| `apply-seo` | `{ collection, id, title?, description? }` | `{ applied }` |
| `paragraphs` | `{ collection, id }` | `{ items, updatedAt }` |
| `prompts` | `{ patch? }` | `{ prompts, defaults, overridden }` |

## Développement

Le paquet figure dans `optimizeDeps.include` d'`astro.config.mjs` : Vite le
**prébundle**, et ce prébundle ne s'invalide pas quand la source change. Après
une modification du plugin, un simple redémarrage du dev server ne suffit pas —
il sert l'ancien code :

```sh
npx astro dev stop
rm -rf node_modules/.vite
npx astro dev
```

Les tests, eux, lisent toujours la source : `pnpm test` reflète l'état réel.

## Tests

```sh
pnpm test src/plugins/ai-editorial-assistant/
```

Aucun accès réseau : les adaptateurs reçoivent leur `fetch` en paramètre, et
`test/mock-ctx.ts` fournit un `PluginContext` en mémoire.
