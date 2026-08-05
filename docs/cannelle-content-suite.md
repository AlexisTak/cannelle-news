# Suite Contenu Cannelle

La suite ajoute trois plugins standard EmDash, enregistrés dans `astro.config.mjs`.

## Cannelle Media

- Indexe automatiquement les téléversements et contrôle taille/type MIME.
- Gère titre, ALT, légende, tags, recherche plein texte, URL CDN et versions de métadonnées.
- Les traitements `ocr`, `alt` et `compress` sont placés dans une file de jobs, exécutée toutes les cinq minutes et appelant `processorEndpoint` avec un jeton Bearer optionnel. La réponse peut fournir `alt`, `ocrText`, `optimizedUrl` et `size`.
- EmDash 0.30 n’expose pas les octets d’un média existant aux plugins : le processeur externe télécharge l’URL source et réalise l’OCR ou la compression binaire. Chaque résultat crée une version avant mutation et les erreurs sont persistées.
- L’ALT initial dérive proprement du nom de fichier et reste éditable par un humain.

## Cannelle Fact Check

- Centralise affirmations, sources, verdict, justification et score de confiance (0–100).
- Une affirmation ne peut être publiée qu’après revue humaine, verdict explicite, justification et nombre minimal de sources.
- L’IA est une pré-analyse optionnelle via `aiEndpoint`; elle ne publie jamais seule. Sa sortie est bornée et normalisée, puis enregistrée avec l’état `ai_reviewed`.

## Cannelle Paywall

- Modes `soft`, `hard` et `metered`, préfixes d’URL protégés et nombre de lectures gratuites configurables.
- Modèles pour offres, abonnements, coupons, compteurs et factures.
- `checkout` appelle le fournisseur configuré avec le montant recalculé côté serveur. `webhook` exige une signature HMAC-SHA256 et traite les événements de façon idempotente.
- La route publique `access` décide l’accès; le fragment de page affiche l’appel à abonnement.
- `checkoutUrl` désigne la page publique des offres; `paymentEndpoint` crée une session de paiement chez le fournisseur.

### Limite de sécurité du rendu

Le fragment injecté sur les pages est une invitation commerciale et un compteur UX. Il ne constitue pas une protection cryptographique du contenu, puisqu’un navigateur reçoit déjà le HTML. Pour un mode `hard` protégeant réellement une publication, le layout Astro doit vérifier côté serveur une session utilisateur authentifiée et ne pas rendre le contenu sans droit actif. Ne mettez jamais un contenu confidentiel derrière le seul overlay JavaScript.

### Contrat webhook générique

Le corps est `{ event, signature }`. `signature` est le HMAC-SHA256 hexadécimal de `JSON.stringify(event)` avec `webhookSecret`. Les événements acceptés sont `subscription.active`, `subscription.past_due`, `subscription.cancelled`, `invoice.paid` et `invoice.failed`. L’identifiant `event.id` assure l’idempotence.

## Exploitation

Les plugins sont désactivés ou prudents par défaut : le paywall est désactivé, l’IA et l’OCR automatiques ne sont pas activés. Configurez-les dans l’administration EmDash, puis testez le parcours de paiement en environnement de test avant activation.
