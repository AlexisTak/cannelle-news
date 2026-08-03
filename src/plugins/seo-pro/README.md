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
