# @cannelle/plugin-auto-internal-linker

Maillage interne assisté pour EmDash. Indexe les mots-clés des articles publiés, repère leurs occurrences dans l'article en cours, et propose au rédacteur des liens qu'il valide ou ignore.

## Installation

Ajouter dans `astro.config.mjs` :

```ts
import { autoInternalLinkerPlugin } from "./src/plugins/auto-internal-linker/src/index.ts";

emdash({
  plugins: [autoInternalLinkerPlugin()],
});
```

Puis déclarer le champ qui porte le widget sur la collection à mailler (`seed/seed.json`) :

```json
{
  "slug": "internal_links",
  "label": "Liens internes",
  "type": "json",
  "widget": "auto-internal-linker:suggestions"
}
```

## Fonctionnement

L'index (`ctx.storage.keywords`) associe un mot-clé à l'URL d'un article publié. Il est alimenté par quatre sources, départagées par poids : mots-clés manuels (100), titre (80), termes de taxonomie (50), extraction automatique du corps (20).

Dans l'éditeur, le widget appelle la route `suggest`, qui analyse la dernière version **enregistrée** de l'article — un widget de champ n'a pas accès au texte en cours de frappe. Le rédacteur coche ou refuse ; les décisions partent avec l'article dans la valeur du champ.

À l'enregistrement, `content:beforeSave` rescanne le corps courant et ne pose que les liens dont le mot-clé existe encore. Une décision dont le terme a disparu tombe en silence.

## Garde-fous anti-sur-optimisation

- Plafond de liens par article (défaut 5), incluant les liens internes déjà présents.
- Une seule occurrence liée par cible.
- Première occurrence seulement, jamais d'auto-lien.
- Aucun lien dans un lien existant, un intertitre, une citation ou un bloc de code.

## Réglages

Page admin **Maillage interne**. Plafond, longueur minimale, sources actives, collections analysées, motifs d'URL par collection, URL du site. Le bouton de reconstruction réindexe tous les articles publiés — nécessaire à l'amorçage sur un site déjà rempli, et après tout changement de source ou de motif d'URL.

## Tests

```bash
pnpm test src/plugins/auto-internal-linker/
```

## Design

[`docs/superpowers/specs/2026-08-04-auto-internal-linker-design.md`](../../../docs/superpowers/specs/2026-08-04-auto-internal-linker-design.md)
