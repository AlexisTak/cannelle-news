# @cannelle/plugin-research-paper-embed

Emdash native plugin. Adds a `researchPaper` Portable Text block that auto-fetches metadata from arXiv or CrossRef (DOI) and renders a card + `ScholarlyArticle` JSON-LD.

## Register

In `astro.config.mjs`:

```ts
import { researchPaperEmbedPlugin } from "@cannelle/plugin-research-paper-embed";

emdash({
  plugins: [researchPaperEmbedPlugin()],
})
```

## Slash command

Type `/research-paper` in the article editor.
