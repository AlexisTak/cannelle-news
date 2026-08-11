# Cannelle Notes — notes d'équipe pour le panel admin

**Date :** 2026-08-11
**Statut :** design validé, en attente d'implémentation
**Auteur(s) :** Claude (développeur senior TypeScript)
**Branche :** `feature/cannelle-notes-plugin`
**Plugin id :** `cannelle-notes`
**Package :** `@cannelle/plugin-notes`

---

## 1. Contexte et objectif

La rédaction n'a aucun endroit dans le panel admin pour laisser des notes internes à l'équipe — rappels, idées, choses à vérifier, tâches courtes assignées à quelqu'un. Aujourd'hui ça part dans Slack ou nulle part. Cannelle Notes ajoute un tableau de notes partagé, visible par toute l'équipe admin, avec statut (à faire / fait) et assignation à un membre réel de l'équipe.

Portée volontairement étroite : ce n'est pas un outil de gestion de projet. Pas de sous-tâches, pas de deadline, pas de priorité, pas de pièces jointes. Un post-it avec un nom dessus et une case à cocher.

## 2. Portée

### 2.1 Inclus

- Notes générales d'équipe (titre + corps), pas rattachées à un article ou une page.
- Auteur et assigné choisis dans l'annuaire réel des comptes EmDash (`ctx.users`), pas de texte libre.
- Statut `todo` / `done`, bascule en un clic.
- Épingler une note en haut de liste.
- Suppression avec confirmation.
- Page admin dédiée (Block Kit), listée dans le hub admin sous une nouvelle catégorie « Équipe ».

### 2.2 Exclu (hors scope, pas dans cette phase)

- Notes attachées à un article/page spécifique.
- Commentaires / fil de discussion sur une note.
- Notifications (email, etc.) à l'assignation.
- Édition du corps d'une note après création (v1 = créer / changer statut / épingler / supprimer ; pas de "modifier le texte").
- Historique des modifications, audit log dédié.
- Catégories, tags, couleurs.

## 3. Contraintes

- **Plugin sandboxé**, comme `forms`, `analytics`, `newsletter`, `paywall`, `fact-check` (format standard du dépôt pour les plugins CRUD simples — cf. `src/plugins/fact-check/src/sandbox-entry.ts`). Pas de plugin natif : pas besoin de React admin custom, Block Kit suffit.
- **Pas de session utilisateur dans le contexte de route sandboxée.** `SandboxedRouteContext` = `{ input, request, requestMeta }` (doc EmDash, confirmé — pas de `ctx.session` ni équivalent). L'auteur d'une note est donc choisi dans un menu déroulant au moment de la création, pas déduit automatiquement de la session. Même niveau de confiance que le reste de l'admin (route privée = `plugins:manage`, authentification déjà exigée par le dispatcher).
- **Annuaire réel via `ctx.users`** (capability `users:read` → `ctx.users.get()/getByEmail()/list()`), pas de champ texte libre pour "assigné à".
- **Convention de nommage** : préfixe `Cannelle` obligatoire (`plan_plugin.md` §Convention de nommage) → "Cannelle Notes".
- **UI Block Kit uniquement** : `table`, `section`, `actions`, `form`, `button` (avec confirmation). Pas de drag & drop, pas de table à boutons intégrés par ligne (non documenté / non utilisé ailleurs dans le dépôt) — chaque note se rend comme un bloc `section` (texte) + `actions` (boutons) juxtaposés, motif proche de ce que fait `fact-check` pour son formulaire de création + liste.
- **TS strict**, tests Vitest colocalisés, `mock-ctx` réutilisable du motif des autres plugins sandboxés.

## 4. Architecture

### 4.1 Arborescence

```
src/plugins/notes/
├── package.json                    @cannelle/plugin-notes
├── README.md
├── CHANGELOG.md
└── src/
    ├── index.ts                    descripteur du plugin (manifest, capabilities, storage)
    ├── domain.ts                   type Note + fonctions pures (tri, filtre)
    ├── domain.test.ts
    ├── sandbox-entry.ts            routes + hooks + dashboard Block Kit
    └── sandbox-entry.test.ts
```

Motif identique à `fact-check`/`paywall` : un seul fichier `sandbox-entry.ts` regroupe routes + dashboard (ces plugins sont volontairement compacts, pas de sur-découpage pour un CRUD simple).

### 4.2 Capacités déclarées

```ts
capabilities: ["users:read"]
```

Rien d'autre. Pas de `content:*`, `network:*`, `email:send` — les notes ne touchent ni contenu ni réseau.

### 4.3 Storage

```ts
storage: {
  notes: {
    indexes: ["status", "pinned", "assigneeId", "updatedAt"],
  },
}
```

### 4.4 Modèle de données — `Note`

```ts
interface Note {
  id: string;               // ULID
  title: string;             // 1..150
  body: string;               // 1..5000
  authorId: string;
  authorName: string;         // dénormalisé — évite un lookup à chaque affichage
  assigneeId: string | null;
  assigneeName: string | null;
  status: "todo" | "done";
  pinned: boolean;
  createdAt: string;          // ISO
  updatedAt: string;          // ISO
}
```

Le nom (`authorName`/`assigneeName`) est dénormalisé à l'écriture depuis `ctx.users.get(id)` — évite de refaire un lookup annuaire à chaque rendu de liste, et garde un nom lisible même si le compte est désactivé plus tard.

## 5. Surfaces

### 5.1 Routes

| Route | Permission | Rôle |
|---|---|---|
| `notes` (GET) | `plugins:read` | Liste triée : épinglées d'abord, puis `updatedAt` desc. Filtre `status` optionnel. |
| `create` | `plugins:manage` | Crée une note. Valide `title`, `body`, `authorId` (doit exister dans `ctx.users`), `assigneeId` optionnel. |
| `update` | `plugins:manage` | Patch partiel : `status`, `pinned`, `assigneeId`. Pas d'édition de `title`/`body` en v1 (cf. portée). |
| `delete` | `plugins:manage` | Supprime par id. |
| `admin` | `plugins:manage` | Dashboard Block Kit (page_load + interactions). |

Toutes déclarent leur `permission` explicitement (pas de route sans permission — leçon des autres plugins du dépôt).

### 5.2 Dashboard Block Kit (`admin`)

1. `blocks.stats` — total, à faire, fait.
2. `blocks.form` (blockId `note`) — champs : `title` (text), `body` (text multiline), `assigneeId` (select, options = `ctx.users.list()`), submit `actionId: "create_note"`. L'auteur = utilisateur choisi dans un select séparé `authorId` (même source), pas de champ texte libre.
3. Section « À faire » : pour chaque note `status === "todo"`, un `blocks.section(title + body + assigné)` suivi d'un `blocks.actions([...])` avec boutons `Marquer fait` (`toggle_status:<id>`), `Épingler`/`Désépingler` (`toggle_pin:<id>`), `Supprimer` (`delete:<id>`, avec confirmation).
4. Section « Terminé » : même motif, bouton `Marquer à faire` à la place de `Marquer fait`.

Interactions gérées dans le handler `admin` (motif `fact-check`/`paywall`) :

```ts
if (i.type === "form_submit" && i.action_id === "create_note") { … }
if (i.type === "block_action" && i.action_id?.startsWith("toggle_status:")) { … }
if (i.type === "block_action" && i.action_id?.startsWith("toggle_pin:")) { … }
if (i.type === "block_action" && i.action_id?.startsWith("delete:")) { … }
```

### 5.3 Admin-hub

Nouvelle catégorie dans `src/plugins/admin-hub/src/catalog.ts` :

```ts
{
  id: "team",
  name: "Équipe",
  description: "Coordination et suivi interne.",
  tools: [
    { id: "notes", name: "Notes", description: "Notes d'équipe, statut et assignation.", page: pluginPage("cannelle-notes", "/notes") },
  ],
}
```

`AdminCategory["id"]` (union type) étendu avec `"team"`.

## 6. Sécurité

- Toutes les routes privées exigent `plugins:manage` ou `plugins:read` (jamais de route sans `permission` déclarée).
- `assigneeId`/`authorId` validés contre `ctx.users.get(id)` à l'écriture (`create`/`update`) — pas d'id arbitraire stocké sans correspondance réelle.
- Pas de rendu HTML public : le contenu (`title`/`body`) n'est jamais exposé hors admin, donc pas de surface XSS публique. Dans l'admin, Block Kit échappe le texte (même motif que `fact-check`).
- Longueurs bornées (`title` 150, `body` 5000) — pas de champ non borné écrit en storage.

## 7. Tests

```
domain.test.ts          — tri (épinglées d'abord, puis updatedAt desc), filtre par statut
sandbox-entry.test.ts   — create (validation + lookup ctx.users), update (patch partiel),
                           delete, dashboard (page_load + les 4 interactions), permissions
                           par route (plugins:read vs plugins:manage)
```

Mock-ctx du motif des autres plugins sandboxés (`ctx.storage`, `ctx.users` avec une liste de comptes fictifs).

## 8. Critère de sortie

| Critère | Mesure |
|---|---|
| `pnpm test` au vert | CI locale |
| `pnpm run typecheck` sans erreur | CI locale |
| `pnpm build` sans erreur | CI locale |
| Créer / assigner / marquer fait / épingler / supprimer une note depuis le dashboard | Vérification manuelle en dev |
| Entrée visible dans le hub admin sous « Équipe » | Vérification manuelle en dev |

## 9. Prochaine étape

Implémentation via plan d'exécution détaillé (compétence `writing-plans`).

`──────────────────────────────────────────────`
Fin de la spec. Spec self-review : placeholders (aucun), cohérence (modèle de données ↔ routes ↔ dashboard ↔ admin-hub), scope (v1 volontairement minimale — pas d'édition de texte, pas de fil de discussion, documenté en §2.2), ambiguïté (auteur/assigné = annuaire réel, jamais texte libre ; tri de liste explicite).
