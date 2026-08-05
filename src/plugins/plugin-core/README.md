# Cannelle Plugin Core

Socle partagé de la suite Cannelle pour EmDash. Ce package fournit des contrats sans effet de bord et compatibles avec les plugins sandboxés :

- enveloppes d'événements versionnées et bus local ;
- catalogue et vérification des permissions ;
- erreurs publiques normalisées ;
- entrées d'audit avec masquage des secrets ;
- politiques de rétention RGPD.

## Utilisation

```ts
import { createCannelleEvent, hasPermission } from "@cannelle/plugin-core";

const event = createCannelleEvent("cannelle.form.submitted", "cannelle-forms", {
  submissionId: "01K...",
});

const allowed = hasPermission(user.permissions, "cannelle.forms.submissions.view");
```

Le bus fourni est volontairement local au runtime. Un plugin doit persister les événements qui exigent une livraison garantie dans son stockage EmDash avant de les transmettre à d'autres systèmes.
