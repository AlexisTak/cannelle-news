# Plan de développement des plugins EmDash

> État d'avancement : les MVP 0.1 de Cannelle Forms, Cannelle Analytics et Cannelle Newsletter sont implémentés dans `src/plugins/`. Voir `docs/cannelle-suite.md` pour l'architecture, les API, la confidentialité et les limites connues.

# Convention de nommage des plugins

> **Règle obligatoire :** tous les plugins officiels de l'écosystème EmDash doivent utiliser le préfixe **`Cannelle`** afin d'assurer une identité visuelle et technique cohérente.

Exemples :
- Cannelle Forms
- Cannelle Analytics
- Cannelle Newsletter
- Cannelle SEO
- Cannelle Media
- Cannelle Comments

Cette convention s'applique également aux packages, dépôts Git, identifiants techniques, namespaces, clés de configuration, événements, documentation et futurs plugins officiels.

---

## 1. Vision générale

L’objectif est de créer une suite de plugins professionnels pour EmDash CMS couvrant trois besoins essentiels :

- la création et la gestion de formulaires ;
- la mesure d’audience et de performance éditoriale ;
- la gestion de newsletters et de campagnes e-mail.

Les trois plugins doivent être conçus comme des modules autonomes, mais capables de fonctionner ensemble afin de proposer une expérience cohérente.

Suite cible :

- **Cannelle Forms**
- **Cannelle Analytics**
- **Cannelle Newsletter**

L’ensemble doit être pensé pour des sites professionnels, des médias, des associations, des entreprises et des créateurs de contenu.

---

# 2. Principes techniques communs

## 2.1 Architecture

Chaque plugin doit respecter les principes suivants :

- architecture modulaire ;
- séparation claire entre logique métier, interface, persistance et intégrations ;
- compatibilité avec le système d’extensions d’EmDash ;
- API documentée ;
- système d’événements internes ;
- permissions configurables ;
- prise en charge du multi-site si EmDash le permet ;
- migrations de base de données versionnées ;
- tests unitaires, tests d’intégration et tests end-to-end ;
- journalisation structurée ;
- mécanisme de désinstallation propre.

## 2.2 Standards de qualité

Chaque plugin doit inclure :

- TypeScript strict ;
- validation des entrées côté client et serveur ;
- gestion des erreurs centralisée ;
- interface accessible ;
- compatibilité responsive ;
- internationalisation ;
- documentation utilisateur ;
- documentation développeur ;
- changelog ;
- versionnage sémantique ;
- système de télémétrie désactivable ;
- politique de confidentialité ;
- conformité RGPD.

## 2.3 Sécurité

Exigences minimales :

- validation et assainissement des données ;
- protection CSRF ;
- protection XSS ;
- limitation de débit ;
- contrôle d’accès par rôles et permissions ;
- chiffrement des secrets ;
- journal d’audit ;
- prévention des injections ;
- rotation des clés d’API ;
- suppression et anonymisation des données ;
- politique de conservation configurable ;
- export des données personnelles ;
- protection contre le spam et les abus.

## 2.4 Expérience d’administration

Les interfaces doivent être cohérentes entre les plugins :

- navigation uniforme ;
- tableaux de bord lisibles ;
- filtres avancés ;
- recherche ;
- actions groupées ;
- états vides utiles ;
- confirmations avant suppression ;
- notifications de succès et d’erreur ;
- historique des actions ;
- aide contextuelle ;
- assistants de configuration.

---

# 3. Cannelle Forms

## 3.1 Objectif

Cannelle Forms doit permettre de créer des formulaires professionnels sans dépendre d’un service externe.

Le plugin doit couvrir les besoins suivants :

- formulaire de contact ;
- demande de devis ;
- inscription ;
- candidature ;
- sondage ;
- collecte de fichiers ;
- formulaire conditionnel ;
- formulaire multi-étapes ;
- formulaire connecté à des outils externes.

## 3.2 Fonctionnalités principales

### Créateur de formulaires

- éditeur visuel par glisser-déposer ;
- aperçu en temps réel ;
- sauvegarde automatique ;
- duplication de formulaires ;
- modèles prédéfinis ;
- champs réutilisables ;
- sections ;
- colonnes ;
- groupes de champs ;
- formulaires multi-étapes ;
- barre de progression ;
- logique conditionnelle ;
- calculs automatiques ;
- champs dépendants ;
- préremplissage ;
- valeurs dynamiques ;
- URL de retour personnalisable.

### Types de champs

- texte ;
- texte long ;
- e-mail ;
- téléphone ;
- URL ;
- nombre ;
- date ;
- heure ;
- fichier ;
- image ;
- case à cocher ;
- bouton radio ;
- liste déroulante ;
- consentement ;
- signature ;
- notation ;
- adresse ;
- champ masqué ;
- champ calculé ;
- champ HTML ;
- champ personnalisé développé par extension.

### Validation

- champs obligatoires ;
- longueur minimale et maximale ;
- formats personnalisés ;
- expressions régulières ;
- validation asynchrone ;
- messages d’erreur personnalisables ;
- validation par étape ;
- validation côté serveur obligatoire.

### Soumissions

- stockage sécurisé ;
- consultation dans l’administration ;
- statut des soumissions ;
- notes internes ;
- assignation à un membre ;
- export CSV et JSON ;
- suppression groupée ;
- anonymisation ;
- rétention configurable ;
- recherche et filtres ;
- pièces jointes ;
- historique des modifications.

### Notifications

- notifications e-mail ;
- modèles de messages ;
- variables dynamiques ;
- accusé de réception ;
- notifications administrateur ;
- notifications conditionnelles ;
- webhooks ;
- intégration avec Cannelle Newsletter ;
- reprise automatique en cas d’échec.

### Anti-spam

- honeypot ;
- limitation de débit ;
- blocage IP configurable ;
- CAPTCHA optionnel ;
- détection comportementale ;
- liste noire ;
- scoring de risque ;
- modération manuelle ;
- journal des tentatives bloquées.

## 3.3 Intégrations

Intégrations prioritaires :

- Cannelle Newsletter ;
- Cannelle Analytics ;
- webhooks ;
- Zapier ;
- Make ;
- n8n ;
- Slack ;
- Discord ;
- CRM externes ;
- stockage S3 compatible ;
- SMTP ;
- API REST.

## 3.4 Modèle de données suggéré

Tables principales :

- `forms`
- `form_versions`
- `form_fields`
- `form_submissions`
- `form_submission_values`
- `form_files`
- `form_notifications`
- `form_webhooks`
- `form_spam_rules`
- `form_audit_logs`

## 3.5 API

Endpoints recommandés :

- `GET /api/forms`
- `POST /api/forms`
- `GET /api/forms/{id}`
- `PUT /api/forms/{id}`
- `DELETE /api/forms/{id}`
- `POST /api/forms/{id}/submit`
- `GET /api/forms/{id}/submissions`
- `GET /api/forms/{id}/export`
- `POST /api/forms/{id}/duplicate`
- `POST /api/forms/{id}/publish`

## 3.6 Événements internes

- `form.created`
- `form.updated`
- `form.published`
- `form.submitted`
- `form.submission.updated`
- `form.submission.deleted`
- `form.spam.detected`
- `form.notification.sent`
- `form.webhook.failed`

## 3.7 Permissions

- voir les formulaires ;
- créer un formulaire ;
- modifier un formulaire ;
- publier un formulaire ;
- supprimer un formulaire ;
- consulter les soumissions ;
- exporter les soumissions ;
- supprimer les soumissions ;
- gérer les intégrations ;
- gérer les paramètres de sécurité.

## 3.8 Indicateurs de performance

- taux de conversion ;
- taux d’abandon ;
- temps moyen de complétion ;
- erreurs par champ ;
- étapes les plus abandonnées ;
- appareils utilisés ;
- source du trafic ;
- campagnes associées.

---

# 4. Cannelle Analytics

## 4.1 Objectif

Cannelle Analytics doit fournir une solution de mesure d’audience respectueuse de la vie privée et directement intégrée au CMS.

Le plugin doit aider les équipes à comprendre :

- ce qui attire les visiteurs ;
- ce qui retient leur attention ;
- ce qui génère des conversions ;
- quels contenus fonctionnent ;
- quels formulaires et newsletters performent.

## 4.2 Positionnement

Le plugin doit proposer une alternative légère à Google Analytics pour les besoins éditoriaux et professionnels.

Priorités :

- simplicité ;
- confidentialité ;
- données exploitables ;
- intégration native à EmDash ;
- faible impact sur les performances ;
- possibilité de fonctionner sans cookies.

## 4.3 Fonctionnalités principales

### Tableau de bord

- visiteurs uniques ;
- pages vues ;
- sessions ;
- taux de rebond ;
- durée moyenne ;
- pages d’entrée ;
- pages de sortie ;
- sources de trafic ;
- campagnes ;
- appareils ;
- navigateurs ;
- pays et zones géographiques approximatives ;
- tendances ;
- comparaisons de périodes.

### Analytics éditorial

- articles les plus lus ;
- temps de lecture ;
- profondeur de lecture ;
- taux de complétion ;
- auteurs les plus performants ;
- catégories les plus consultées ;
- taux de retour ;
- performance dans le temps ;
- contenus en progression ;
- contenus en perte d’audience.

### Suivi des événements

- clics ;
- téléchargements ;
- lecture vidéo ;
- scroll ;
- recherche interne ;
- partages ;
- soumissions de formulaires ;
- inscriptions newsletter ;
- erreurs ;
- conversions personnalisées.

### Funnels

- création de tunnels ;
- étapes personnalisées ;
- taux de conversion ;
- abandon par étape ;
- comparaison par source ;
- comparaison par appareil ;
- attribution de campagne.

### Rapports

- rapports programmés ;
- export CSV ;
- export JSON ;
- export PDF à terme ;
- envoi par e-mail ;
- tableaux de bord personnalisés ;
- widgets configurables ;
- alertes sur variation anormale.

## 4.4 Respect de la vie privée

Le plugin doit proposer :

- mode sans cookies ;
- anonymisation IP ;
- géolocalisation approximative ;
- conservation configurable ;
- exclusion des administrateurs ;
- consentement configurable ;
- possibilité de ne collecter aucune donnée personnelle ;
- suppression sur demande ;
- export des données ;
- hébergement local des données ;
- documentation RGPD.

## 4.5 Collecte technique

Le système de collecte doit être :

- asynchrone ;
- léger ;
- résilient ;
- compatible avec les bloqueurs courants autant que possible ;
- capable de fonctionner côté serveur ;
- compatible avec une collecte par lot ;
- protégé contre les événements frauduleux ;
- capable d’ignorer les bots connus.

## 4.6 Modèle de données suggéré

Tables principales :

- `analytics_sites`
- `analytics_sessions`
- `analytics_pageviews`
- `analytics_events`
- `analytics_visitors`
- `analytics_campaigns`
- `analytics_goals`
- `analytics_funnels`
- `analytics_reports`
- `analytics_alerts`
- `analytics_exclusions`

Pour les gros volumes, prévoir :

- partitionnement ;
- agrégation journalière ;
- tables de synthèse ;
- politique d’archivage ;
- traitement asynchrone ;
- stockage analytique optionnel.

## 4.7 API

Endpoints recommandés :

- `POST /api/analytics/collect`
- `GET /api/analytics/overview`
- `GET /api/analytics/content`
- `GET /api/analytics/sources`
- `GET /api/analytics/events`
- `GET /api/analytics/goals`
- `POST /api/analytics/goals`
- `GET /api/analytics/funnels`
- `POST /api/analytics/funnels`
- `GET /api/analytics/reports`
- `POST /api/analytics/reports`

## 4.8 Événements internes

- `analytics.event.received`
- `analytics.goal.completed`
- `analytics.form.converted`
- `analytics.newsletter.subscribed`
- `analytics.report.generated`
- `analytics.alert.triggered`
- `analytics.anomaly.detected`

## 4.9 Permissions

- voir le tableau de bord ;
- consulter les rapports ;
- exporter les données ;
- créer des objectifs ;
- gérer les funnels ;
- gérer les exclusions ;
- gérer la conservation ;
- gérer les paramètres de confidentialité ;
- gérer les alertes.

## 4.10 Indicateurs métier

- taux de conversion ;
- coût par conversion si campagnes renseignées ;
- revenu par contenu ;
- inscription newsletter par article ;
- formulaire soumis par source ;
- contenu assisté par conversion ;
- valeur moyenne par session ;
- fidélisation des lecteurs.

---

# 5. Cannelle Newsletter

## 5.1 Objectif

Cannelle Newsletter doit permettre de gérer des abonnés, créer des campagnes, automatiser des envois et mesurer les performances sans sortir du CMS.

Le plugin doit couvrir :

- newsletter éditoriale ;
- campagnes marketing ;
- séquences automatisées ;
- listes segmentées ;
- e-mails transactionnels simples ;
- synchronisation avec les formulaires.

## 5.2 Fonctionnalités principales

### Gestion des abonnés

- ajout manuel ;
- import CSV ;
- export CSV ;
- inscription via formulaire ;
- double opt-in ;
- désinscription ;
- statuts d’abonnement ;
- tags ;
- segments ;
- champs personnalisés ;
- historique ;
- consentements ;
- source d’acquisition ;
- suppression et anonymisation.

### Création de campagnes

- éditeur visuel ;
- éditeur HTML ;
- éditeur Markdown ;
- modèles réutilisables ;
- blocs de contenu ;
- prévisualisation ;
- test d’envoi ;
- responsive ;
- mode sombre ;
- variables dynamiques ;
- insertion d’articles EmDash ;
- personnalisation ;
- planification ;
- duplication ;
- brouillon ;
- validation avant envoi.

### Automatisations

- e-mail de bienvenue ;
- séquence d’onboarding ;
- envoi après soumission de formulaire ;
- relance après inactivité ;
- campagne anniversaire ;
- campagne basée sur un tag ;
- campagne basée sur un événement ;
- séquence éditoriale ;
- automatisation conditionnelle ;
- temporisation ;
- branchements logiques.

### Segmentation

Critères disponibles :

- tags ;
- source d’inscription ;
- date d’inscription ;
- activité ;
- campagnes ouvertes ;
- liens cliqués ;
- formulaires remplis ;
- contenu consulté ;
- pays approximatif ;
- champs personnalisés ;
- consentement ;
- statut d’abonnement.

### Délivrabilité

- configuration SMTP ;
- fournisseurs d’envoi ;
- SPF ;
- DKIM ;
- DMARC ;
- gestion des rebonds ;
- gestion des plaintes ;
- nettoyage des listes ;
- limitation de débit ;
- montée en charge progressive ;
- file d’attente ;
- reprise après erreur ;
- journal d’envoi.

### Statistiques

- taux de livraison ;
- taux d’ouverture ;
- taux de clic ;
- taux de désinscription ;
- taux de rebond ;
- conversions ;
- comparaison de campagnes ;
- performance par segment ;
- performance par lien ;
- performance par appareil ;
- revenus associés si disponibles.

## 5.3 Intégrations

Intégrations prioritaires :

- Cannelle Forms ;
- Cannelle Analytics ;
- SMTP ;
- Resend ;
- Brevo ;
- Mailgun ;
- Postmark ;
- Amazon SES ;
- webhooks ;
- API REST ;
- n8n ;
- Zapier ;
- Make.

## 5.4 Modèle de données suggéré

Tables principales :

- `newsletter_subscribers`
- `newsletter_lists`
- `newsletter_segments`
- `newsletter_tags`
- `newsletter_campaigns`
- `newsletter_templates`
- `newsletter_messages`
- `newsletter_deliveries`
- `newsletter_events`
- `newsletter_automations`
- `newsletter_automation_steps`
- `newsletter_consents`
- `newsletter_suppressions`

## 5.5 API

Endpoints recommandés :

- `GET /api/newsletter/subscribers`
- `POST /api/newsletter/subscribers`
- `PUT /api/newsletter/subscribers/{id}`
- `DELETE /api/newsletter/subscribers/{id}`
- `GET /api/newsletter/campaigns`
- `POST /api/newsletter/campaigns`
- `POST /api/newsletter/campaigns/{id}/test`
- `POST /api/newsletter/campaigns/{id}/schedule`
- `POST /api/newsletter/campaigns/{id}/send`
- `GET /api/newsletter/campaigns/{id}/stats`
- `GET /api/newsletter/automations`
- `POST /api/newsletter/automations`

## 5.6 Événements internes

- `newsletter.subscriber.created`
- `newsletter.subscriber.confirmed`
- `newsletter.subscriber.unsubscribed`
- `newsletter.campaign.created`
- `newsletter.campaign.scheduled`
- `newsletter.campaign.sent`
- `newsletter.email.delivered`
- `newsletter.email.opened`
- `newsletter.email.clicked`
- `newsletter.email.bounced`
- `newsletter.email.complained`
- `newsletter.automation.started`
- `newsletter.automation.completed`

## 5.7 Permissions

- voir les abonnés ;
- ajouter des abonnés ;
- importer des abonnés ;
- exporter des abonnés ;
- créer une campagne ;
- modifier une campagne ;
- programmer une campagne ;
- envoyer une campagne ;
- gérer les automatisations ;
- gérer les modèles ;
- consulter les statistiques ;
- gérer les fournisseurs d’envoi ;
- gérer les consentements.

---

# 6. Intégration entre les trois plugins

## 6.1 Cannelle Forms vers Cannelle Newsletter

Cas d’usage :

- ajout automatique d’un contact après consentement ;
- attribution de tags ;
- ajout à une liste ;
- déclenchement d’une séquence ;
- personnalisation selon les réponses ;
- double opt-in ;
- journalisation du consentement.

## 6.2 Cannelle Forms vers Cannelle Analytics

Événements à suivre :

- affichage du formulaire ;
- début de saisie ;
- changement d’étape ;
- erreur de validation ;
- abandon ;
- soumission réussie ;
- soumission bloquée comme spam ;
- conversion associée à une campagne.

## 6.3 Cannelle Newsletter vers Cannelle Analytics

Événements à synchroniser :

- inscription ;
- confirmation ;
- ouverture ;
- clic ;
- conversion ;
- désinscription ;
- rebond ;
- plainte ;
- consultation d’un article après clic.

## 6.4 Tableau de bord unifié

Le tableau de bord global doit afficher :

- nombre de soumissions ;
- nouveaux abonnés ;
- taux de conversion ;
- campagnes récentes ;
- formulaires les plus performants ;
- contenus générant le plus d’inscriptions ;
- alertes de délivrabilité ;
- anomalies d’audience ;
- erreurs d’intégration.

---

# 7. Architecture fonctionnelle recommandée

## 7.1 Noyau commun

Créer un package partagé :

`@emdash/plugin-core`

Responsabilités :

- gestion des permissions ;
- bus d’événements ;
- audit logs ;
- configuration ;
- chiffrement ;
- files d’attente ;
- tâches planifiées ;
- webhooks ;
- gestion des erreurs ;
- composants UI communs ;
- utilitaires RGPD ;
- connecteurs externes.

## 7.2 Packages suggérés

- `@emdash/forms-core`
- `@emdash/forms-ui`
- `@emdash/forms-api`
- `@emdash/analytics-core`
- `@emdash/analytics-ui`
- `@emdash/analytics-collector`
- `@emdash/newsletter-core`
- `@emdash/newsletter-ui`
- `@emdash/newsletter-worker`
- `@emdash/plugin-core`
- `@emdash/plugin-sdk`

## 7.3 Traitements asynchrones

Utiliser une file d’attente pour :

- envoi d’e-mails ;
- génération de rapports ;
- exports ;
- traitement des pièces jointes ;
- webhooks ;
- agrégation analytique ;
- nettoyage des données ;
- automatisations newsletter ;
- gestion des rebonds ;
- alertes.

## 7.4 Observabilité

Prévoir :

- logs structurés ;
- métriques ;
- traces ;
- taux d’erreur ;
- temps de traitement ;
- état des files d’attente ;
- statut des webhooks ;
- statut des fournisseurs e-mail ;
- alertes administrateur ;
- tableau de santé des plugins.

---

# 8. Roadmap de développement

## Phase 0 — Fondations

Objectifs :

- définir le système de plugins ;
- créer le noyau commun ;
- définir les conventions ;
- mettre en place permissions et événements ;
- créer les composants UI partagés ;
- préparer CI/CD ;
- définir les standards de tests ;
- documenter l’architecture.

Livrables :

- SDK plugin ;
- système de migrations ;
- bus d’événements ;
- système de permissions ;
- audit logs ;
- composants UI ;
- documentation développeur.

## Phase 1 — Cannelle Forms MVP

Périmètre :

- création de formulaire ;
- champs principaux ;
- validation ;
- soumissions ;
- notifications e-mail ;
- export CSV ;
- anti-spam basique ;
- permissions ;
- API publique ;
- widget d’intégration.

Critères de sortie :

- création d’un formulaire en moins de cinq minutes ;
- soumission fiable ;
- validation serveur ;
- zéro donnée perdue ;
- export fonctionnel ;
- tests end-to-end critiques.

## Phase 2 — Cannelle Analytics MVP

Périmètre :

- script de collecte ;
- pages vues ;
- visiteurs ;
- sources ;
- appareils ;
- contenus populaires ;
- événements personnalisés ;
- objectifs ;
- mode sans cookies ;
- conservation configurable.

Critères de sortie :

- collecte légère ;
- tableau de bord exploitable ;
- conformité RGPD documentée ;
- données agrégées ;
- exclusion des bots et administrateurs ;
- intégration Forms.

## Phase 3 — Cannelle Newsletter MVP

Périmètre :

- abonnés ;
- listes ;
- double opt-in ;
- import et export ;
- campagnes ;
- modèles ;
- SMTP ;
- planification ;
- désinscription ;
- statistiques de base ;
- intégration Forms.

Critères de sortie :

- inscription complète ;
- envoi test ;
- envoi programmé ;
- gestion des rebonds ;
- consentement traçable ;
- conformité des liens de désinscription.

## Phase 4 — Intégrations avancées

Périmètre :

- automatisations newsletter ;
- funnels analytics ;
- logique conditionnelle avancée ;
- webhooks configurables ;
- segmentation comportementale ;
- tableaux de bord croisés ;
- alertes ;
- rapports programmés.

## Phase 5 — Version professionnelle

Périmètre :

- haute disponibilité ;
- multi-site ;
- rôles avancés ;
- fournisseurs multiples ;
- tests A/B ;
- formulaires multi-étapes avancés ;
- délivrabilité avancée ;
- exports volumineux ;
- archivage ;
- supervision ;
- SLA interne.

---

# 9. Stratégie de versions

## Version 0.1

- prototype technique ;
- architecture validée ;
- premières interfaces ;
- API expérimentale.

## Version 0.5

- MVP interne ;
- fonctionnalités principales ;
- tests utilisateurs ;
- corrections UX.

## Version 0.9

- bêta publique ;
- documentation complète ;
- migration stable ;
- sécurité renforcée ;
- compatibilité vérifiée.

## Version 1.0

- fonctionnalités stables ;
- API versionnée ;
- documentation complète ;
- tests critiques ;
- conformité RGPD ;
- support de migration ;
- changelog ;
- politique de maintenance.

---

# 10. Tests

## 10.1 Tests unitaires

Couvrir :

- règles métier ;
- validation ;
- permissions ;
- segmentation ;
- calculs analytiques ;
- automatisations ;
- normalisation des données ;
- gestion des erreurs.

## 10.2 Tests d’intégration

Tester :

- API ;
- base de données ;
- files d’attente ;
- e-mails ;
- webhooks ;
- événements inter-plugins ;
- stockage des fichiers ;
- fournisseurs externes.

## 10.3 Tests end-to-end

Scénarios prioritaires :

- création et publication d’un formulaire ;
- soumission d’un formulaire ;
- inscription à une newsletter ;
- confirmation double opt-in ;
- envoi d’une campagne ;
- suivi d’un clic ;
- attribution d’une conversion ;
- export des données ;
- suppression RGPD ;
- contrôle des permissions.

## 10.4 Tests non fonctionnels

- performance ;
- montée en charge ;
- sécurité ;
- accessibilité ;
- résilience ;
- reprise après échec ;
- compatibilité navigateurs ;
- compatibilité mobile ;
- volumétrie.

---

# 11. Documentation

## Documentation utilisateur

- installation ;
- configuration ;
- premiers pas ;
- création de formulaires ;
- lecture des statistiques ;
- création d’une campagne ;
- gestion du consentement ;
- résolution des problèmes ;
- bonnes pratiques.

## Documentation développeur

- architecture ;
- API ;
- événements ;
- hooks ;
- permissions ;
- création de champs ;
- création de widgets ;
- connecteurs ;
- webhooks ;
- tests ;
- migrations ;
- contribution.

---

# 12. Critères de réussite

## Cannelle Forms

- faible taux d’abandon ;
- création rapide ;
- intégration simple ;
- aucune perte de soumission ;
- protections anti-spam efficaces ;
- export fiable.

## Cannelle Analytics

- faible impact sur les performances ;
- données compréhensibles ;
- respect de la vie privée ;
- attribution correcte ;
- rapports réellement exploitables.

## Cannelle Newsletter

- bonne délivrabilité ;
- gestion claire des consentements ;
- création de campagne rapide ;
- automatisations fiables ;
- statistiques cohérentes ;
- faible taux d’erreur d’envoi.

## Suite globale

- cohérence UX ;
- API stable ;
- événements fiables ;
- sécurité élevée ;
- documentation complète ;
- maintenance simple ;
- compatibilité avec les futures extensions EmDash.

---

# 13. Ordre de priorité recommandé

1. créer le noyau commun ;
2. développer Cannelle Forms ;
3. connecter Forms au bus d’événements ;
4. développer Cannelle Analytics ;
5. suivre les conversions des formulaires ;
6. développer Cannelle Newsletter ;
7. connecter les inscriptions Forms vers Newsletter ;
8. synchroniser les campagnes avec Analytics ;
9. ajouter les automatisations ;
10. créer le tableau de bord unifié.

---

# 14. Conclusion

La meilleure stratégie consiste à ne pas construire trois plugins isolés, mais une suite cohérente reposant sur un noyau commun.

**Cannelle Forms** collecte les données.

**Cannelle Analytics** mesure les usages et les conversions.

**Cannelle Newsletter** transforme les contacts en audience récurrente.

Cette architecture permet à EmDash de proposer une alternative professionnelle aux assemblages WordPress composés de multiples plugins incompatibles, tout en conservant une expérience moderne, performante, sécurisée et respectueuse de la vie privée.
