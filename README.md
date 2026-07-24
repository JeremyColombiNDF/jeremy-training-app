# Coach Jérémy — v0.5

Application web mobile de suivi sportif, optimisée pour iPhone et synchronisée entre appareils.

## Fonctionnalités principales

- séances ordonnées en Jour 1, Jour 2, etc. ;
- date réelle enregistrée uniquement à la clôture d’une séance ;
- séance non réalisée avec cause documentée ;
- charges, répétitions, séries, RPE, problèmes et commentaires ;
- chronomètre de repos ;
- bilan hebdomadaire et export structuré pour ChatGPT ;
- import JSON de la semaine suivante ;
- archivage des semaines et records de charge par exercice ;
- historique complet du poids avec courbe et journal de toutes les pesées ;
- stockage local hors connexion ;
- synchronisation automatique PC / iPhone avec Cloudflare D1 ;
- bouton de synchronisation manuelle et gestion des conflits ;
- sauvegarde et restauration JSON ;
- installation possible en PWA.

## Mise à jour du site

Remplacer le contenu du dépôt par celui de cette version, puis effectuer :

1. `Commit to main` dans GitHub Desktop ;
2. `Push origin`.

Cloudflare Pages republie automatiquement le site.

## Configuration Cloudflare Pages

- Build command : laisser vide
- Build output directory : `public`

Le dossier `functions` doit rester à la racine du dépôt : il contient l’API de synchronisation.

## Activer la synchronisation D1

La synchronisation nécessite une base Cloudflare D1 liée au projet Pages sous le nom exact `DB`.

Consulter le guide : [`docs/CONFIGURATION_SYNCHRONISATION.md`](docs/CONFIGURATION_SYNCHRONISATION.md).

La table est créée automatiquement au premier appel de l’application. Le fichier `migrations/0001_create_app_state.sql` est fourni comme référence et pour une éventuelle création manuelle.

## Fonctionnement hors connexion

Chaque changement est d’abord enregistré dans le navigateur. Si Internet est indisponible, les modifications restent locales et sont envoyées à la prochaine ouverture ou lorsque la connexion revient.

## Test local de l’interface

```bash
python3 -m http.server 8000 --directory public
```

Puis ouvrir `http://localhost:8000`.

L’API `/api/sync` ne fonctionne localement qu’avec un environnement Cloudflare Pages Functions configuré ; l’interface continue néanmoins à fonctionner intégralement en stockage local.
