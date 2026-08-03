# Conventions

## Style

- Tabs for indentation, double quotes, semicolons. `.astro` frontmatter order: `emdash` imports, then `emdash/ui`, then local layouts/utils.

## Page composition

Every page follows the shape in `src/pages/posts/[slug].astro`:

1. `const slug = decodeSlug(Astro.params.slug)` — always decode; bail with `Astro.redirect("/404")` if falsy.
2. Query via `getEmDashEntry(collection, slug)` → destructure `{ entry, cacheHint }`; missing entry → `/404`.
3. `if (Astro.cache?.enabled) Astro.cache.set(cacheHint);`
4. Site identity ONLY via `resolveStarterSiteIdentity(await getSiteSettings())` (`src/utils/site-identity.ts`) — never read settings fields inline. Returns `{ siteTitle, siteTagline, siteLogo }` with defaults applied.
5. SEO via `getSeoMeta(entry, { siteTitle, siteUrl: Astro.url.origin, path })`; spread the result into `Base`'s `title` / `pageTitle` / `description` / `canonical` / `image` props.
6. Wrap output in `Base`. On content pages pass `content={{ collection, id: entry.data.id, slug }}` — required for plugin page contributions and visual editing. Omit it on custom pages (`Base` switches `kind` to `"custom"`).
7. Taxonomy terms are already hydrated: `entry.data.terms?.tag ?? []`, `entry.data.terms?.category ?? []`. No extra fetch.
8. Visual editing: spread `{...entry.edit.<field>}` on the element wrapping each rendered field.
9. Widget slots via `<WidgetArea name="sidebar" />`; body via `<PortableText value={entry.data.content} />`.

`Base.astro` owns `<head>`/`<body>` wiring (`EmDashHead`, `EmDashBodyStart`, `EmDashBodyEnd`, `createPublicPageContext`), the `primary` menu, and `LiveSearch` over `["posts", "pages"]`. Don't duplicate that per page.

## Design posture

Template is intentionally unstyled: no `src/styles/theme.css`, empty `fonts:` array, no `components/` directory, no CSS framework. Styling work means adding a theme (CSS variables in a new `theme.css` imported from `Base.astro`, fonts declared in `astro.config.mjs` with `cssVariable` bindings, per-page `<style>` blocks). Do not pull in Tailwind UI / shadcn / component libraries to fill the gap.
