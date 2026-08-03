# Pipeline média EmDash — contraintes non évidentes

Faits vérifiés dans `node_modules/emdash/src` (v0.30.0). Coûteux à redécouvrir.

## Les hooks média ne peuvent pas transformer un fichier

- `media:beforeUpload` ne reçoit que `{ name, type, size }` — **aucun octet** (`plugins/hooks.ts:770`).
- Il s'exécute dans `handleMediaCreate`, donc **après** `storage.upload()` (`astro/routes/api/media.ts:171` puis `:198`). Les octets sont déjà dans R2.
- Lever avec `errorPolicy: "abort"` annule l'enregistrement en base ; la route supprime alors l'objet (`media.ts:216`).
- `media:afterUpload` ne reçoit **pas** `storageKey` ni `contentHash` — impossible de corréler avec une écriture de stockage.
- Capacités requises pour enregistrer les hooks : `media:write` pour beforeUpload, `media:read` pour afterUpload (`plugins/hooks.ts:290`).

## `storage.upload()` est le seul goulot d'étranglement

Toutes les voies serveur y convergent : route multipart, outil MCP `media_upload`, import WordPress, seed, upload depuis un plugin. **Mais aussi les sauvegardes** (`application/json`) et les bundles marketplace (`application/javascript`) — un filtre aveugle sur cette méthode casserait les sauvegardes. Discriminer sur `contentType` via `GLOBAL_UPLOAD_ALLOWLIST` (`api/handlers/media-allowlist.ts`).

L'adaptateur est remplaçable : `r2()` renvoie un `StorageDescriptor { entrypoint, config }` dont l'`entrypoint` est injecté tel quel dans un module virtuel Vite (`astro/integration/virtual-modules.ts:140`). Un chemin racine-relatif (`/src/...`) y est résolu — vérifié par un build réussi. Même mécanisme pour l'`entrypoint` d'un plugin (`:272`).

## Les messages d'exception n'atteignent jamais le rédacteur

`handleError()` (`api/error.ts:73`) journalise puis renvoie un message générique en 500. Pour afficher une raison précise, il faut intercepter en middleware et renvoyer soi-même une réponse. Les middlewares d'EmDash sont en `order: "pre"` (`astro/integration/index.ts:557`), donc un `src/middleware.ts` s'exécute après l'authentification.

## Divers

- `R2Storage.getSignedUploadUrl()` lève `NOT_SUPPORTED` (`@emdash-cms/cloudflare/src/storage/r2.ts:132`) : pas d'upload direct navigateur→R2 sur ce projet.
- La table `media` a un schéma fixe sans colonne libre (`database/repositories/media.ts:44`). Un plugin ne peut pas y ajouter de champ ; passer par une collection `ctx.storage`.
- Déduplication par hachage de contenu **avant** tout traitement (`media.ts:158`) : un fichier déjà présent est renvoyé tel quel, sans repasser par le stockage.
- Aucun traitement d'image natif : pas de `sharp`. EmDash n'embarque que du JS pur (`image-size`, `jpeg-js`, `upng-js`, `blurhash`) — voir `media/enrich.ts`.

Le plugin `exif-cleaner` appliquait concrètement tout ceci (enveloppe de `storage.upload()` + middleware `src/middleware.ts` pour le message d'erreur). Il a été **supprimé le 2026-08-03** : plus aucun assainissement des métadonnées n'est en place, `astro.config.mjs` passe désormais `r2()` nu. Le code compilé du plugin reste lisible dans `dist/server/chunks/middleware_DLrJ1nR1.mjs` (bundle non minifié, marqueurs `//#region src/plugins/exif-cleaner/*.ts`) si une restauration est un jour nécessaire.
