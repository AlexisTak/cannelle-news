# Suite Cannelle pour EmDash

## Architecture

La suite comprend quatre packages workspace :

| Package | Rôle |
| --- | --- |
| `@cannelle/plugin-core` | Contrats d'événements, permissions, audit, erreurs et rétention |
| `@cannelle/plugin-forms` | Formulaires, soumissions, exports et notifications |
| `@cannelle/plugin-analytics` | Collecte sans cookie, audience, événements et objectifs |
| `@cannelle/plugin-newsletter` | Abonnés, consentements, campagnes et livraisons |

Les trois plugins EmDash utilisent le format standard : descriptor sans effet de bord dans `src/index.ts` et runtime isolable dans `src/sandbox-entry.ts`. Le stockage est automatiquement cloisonné par EmDash.

## Intégrations

- `CannelleForm.astro` émet `cannelle:form-submitted` après une soumission réussie.
- Le tracker Analytics convertit cet événement navigateur en `form_submit`.
- Avec `newsletterListId`, `newsletterEmailField` et `newsletterConsentField`, le composant Forms inscrit le contact uniquement si le champ de consentement vaut `true`.
- `CannelleNewsletterSignup.astro` émet `cannelle:newsletter-subscribed`, collecté comme conversion Analytics.
- Les traitements nécessitant une livraison fiable utilisent des collections persistantes : outbox Forms, notifications, livraisons Newsletter et complétions d'objectifs Analytics.

## API

Toutes les routes commencent par `/_emdash/api/plugins/<plugin-id>/`.

### Cannelle Forms

- Publiques : `public`, `submit`.
- Administration : `create`, `get`, `list`, `update`, `publish`, `duplicate`, `archive`, `submissions`, `export`, `admin`.

### Cannelle Analytics

- Publique : `collect`.
- Administration : `overview`, `goals`, `admin`.

### Cannelle Newsletter

- Publiques : `subscribe`, `confirm`, `unsubscribe`.
- Administration : `subscribers`, `subscribers/import`, `subscribers/export`, `campaigns`, `campaign/test`, `campaign/schedule`, `campaign/stats`, `admin`.
- Catalogue : `lists`, `templates` ; délivrabilité : webhook public signé `delivery-event`.

Les lectures non sensibles (`Forms get/list/submissions`, `Analytics overview`, statistiques de campagne) demandent `plugins:read`. Les mutations, exports de données personnelles et interfaces d'administration demandent `plugins:manage`. Toutes les routes privées exigent également session ou jeton administrateur et protection CSRF EmDash. Les routes publiques appliquent leur propre validation et leurs protections métier.

## Confidentialité et RGPD

### Forms

- collecte limitée aux champs déclarés ;
- honeypot et limitation de débit par IP hachée ;
- durée de conservation configurable ;
- anonymisation par défaut ou suppression planifiée ;
- exports CSV/JSON ;
- secrets masqués dans l'audit.

### Analytics

- aucun cookie ;
- aucune adresse IP enregistrée ;
- pseudonyme quotidien calculé à partir d'un secret local ;
- géolocalisation limitée au code pays fourni par la plateforme ;
- respect de Do Not Track ;
- filtrage des robots et requêtes cross-origin ;
- suppression automatique des événements expirés.

### Newsletter

- e-mail normalisé et indexé par empreinte ;
- double opt-in activé par défaut ;
- jetons de confirmation et désinscription stockés uniquement sous forme hachée ;
- historique séparé des consentements ;
- import autorisé uniquement avec confirmation explicite du consentement ;
- lien de désinscription inclus dans chaque campagne.

## Exploitation

Le fournisseur e-mail se configure dans EmDash. Forms et Newsletter demandent uniquement la capacité `email:send` et ne stockent aucun secret SMTP.

Tâches planifiées :

- Forms : reprise des notifications toutes les cinq minutes et rétention quotidienne ;
- Analytics : rétention quotidienne ;
- Newsletter : envoi des campagnes chaque minute, par lots de 500 abonnés.

Les campagnes volumineuses reprennent au curseur suivant. Les erreurs de livraison sont conservées dans `deliveries` et apparaissent dans les statistiques de campagne.

## Développement

```bash
pnpm test
pnpm run test:cannelle-e2e
pnpm run typecheck
pnpm run build
```

L'administration est disponible dans `/_emdash/admin`. Les pages des plugins apparaissent dans la navigation après leur enregistrement dans `astro.config.mjs`.

## Limites de la version 0.1

- éditeur Forms limité à 12 champs par formulaire dans l'interface Block Kit ; l'API accepte davantage de champs sans les tronquer ;
- exports interactifs limités à 1 000 enregistrements par lot ;
- aperçu Analytics interactif limité à 5 000 événements ;
- campagnes Newsletter en texte brut ;
- le fournisseur doit appeler le webhook signé `delivery-event` pour remonter les rebonds et plaintes ; le mapping spécifique à chaque fournisseur reste externe au plugin.
