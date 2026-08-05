# Cannelle Forms

Premier MVP du plugin de formulaires pour EmDash.

## Routes

Les routes sont exposées sous `/_emdash/api/plugins/cannelle-forms/` :

- `create` — création authentifiée d'un brouillon ;
- `get` — lecture authentifiée ;
- `publish` — publication authentifiée ;
- `submit` — soumission publique d'un formulaire publié.
- `list` — liste authentifiée et paginée des formulaires ;
- `submissions` — soumissions authentifiées d'un formulaire ;
- `export` — export CSV ou JSON jusqu'à 1 000 soumissions par lot ;
- `admin` — interface déclarative Block Kit.
- `public` — définition publique et mise en cache d'un formulaire publié.

La route publique applique une validation serveur pilotée par la définition du formulaire, un honeypot (`_cannelle_website`) et une limitation par adresse IP hachée. Les valeurs inconnues ne sont jamais stockées.

Les événements destinés aux autres plugins sont écrits dans `eventOutbox` avant traitement asynchrone ultérieur.

La page d'administration permet de créer un brouillon depuis les modèles Contact, Demande de devis et Inscription, puis de consulter les formulaires et leurs soumissions.

L'éditeur permet d'activer, retirer et configurer jusqu'à 12 champs par formulaire. Chaque sauvegarde crée une version immuable et remet le formulaire en brouillon avant republication. Les formulaires peuvent aussi être dupliqués ou archivés.

Les notifications administrateur et accusés de réception utilisent le pipeline e-mail EmDash. Les échecs sont conservés et repris automatiquement toutes les cinq minutes avec temporisation exponentielle.

Une tâche quotidienne applique la politique RGPD configurée : anonymisation par défaut après 365 jours, ou suppression définitive si ce mode est choisi.

## Intégration dans une page Astro

```astro
---
import CannelleForm from "../../components/CannelleForm.astro";
---

<CannelleForm formId="identifiant-du-formulaire" />
```
