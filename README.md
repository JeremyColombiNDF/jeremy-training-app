# Série — version 1.0

Série transforme un programme sportif conçu dans ChatGPT en carnet d’entraînement interactif, sans imposer de méthode de programmation.

## Principe

1. L’utilisateur crée un profil dans l’application.
2. Il copie le prompt de configuration depuis `Données > Connecter ChatGPT`.
3. Il colle ce prompt dans sa conversation ChatGPT habituelle.
4. ChatGPT convertit le dernier programme validé au format Série.
5. L’utilisateur importe la réponse et suit ses séances.
6. En fin de semaine, Série génère un bilan structuré à redonner à ChatGPT.

ChatGPT reste le coach ou le générateur de programme. Série reste l’outil d’exécution, de saisie, d’historique et d’échange.

## Fonctionnalités

- plusieurs profils sur un même appareil ;
- couleur principale propre à chaque profil ;
- sélection du profil au lancement ;
- création de profil sans compte ni mot de passe ;
- lien personnel de récupération et d’accès sur un autre appareil ;
- synchronisation D1 isolée par profil ;
- partage du lien public de l’application à un ami, sans partager son propre profil ;
- assistant pédagogique de connexion à ChatGPT ;
- prompt de configuration et demande de conversion copiables ;
- import de programmes en schéma `1.1` ;
- programmes de longueur libre ;
- charges fixes, répétitions, plages de répétitions, durée, distance, RPE, RIR, tempo et supersets ;
- mode séance immersif ;
- validation rapide ou saisie détaillée ;
- chronomètre de repos ;
- problèmes, douleurs, vidéo et non-réalisation documentés ;
- bilan hebdomadaire exportable vers ChatGPT ;
- historique des semaines, records et pesées ;
- graphique de poids avec moyenne mobile ;
- fonctionnement hors connexion ;
- mode clair et sombre automatiques ;
- sauvegarde et restauration JSON.

## Mise en ligne

Le projet est prévu pour Cloudflare Pages avec intégration GitHub.

- Build command : laisser vide
- Build output directory : `public`
- Production branch : `main`

Le dossier `functions` doit rester à la racine du dépôt. Il contient l’API de synchronisation.

Après remplacement des fichiers :

1. ouvrir GitHub Desktop ;
2. effectuer un commit ;
3. cliquer sur `Push origin` ;
4. laisser Cloudflare Pages redéployer automatiquement.

## Synchronisation Cloudflare D1

La base D1 doit être liée au projet Pages sous le nom exact `DB`. Si la version précédente était déjà synchronisée, aucune nouvelle liaison n’est nécessaire. La table multi-profils est créée automatiquement au premier échange.

Voir [`docs/CONFIGURATION_SYNCHRONISATION.md`](docs/CONFIGURATION_SYNCHRONISATION.md).

## Compatibilité avec les anciennes données

Au premier lancement de la version 1.0 :

- les données locales de l’ancienne application sont converties en profil ;
- le programme, l’historique, les pesées et les résultats sont conservés ;
- les appareils possédant le même ancien état génèrent le même identifiant de migration afin de retrouver une synchronisation commune.

Une sauvegarde préalable reste recommandée.

Le pas-à-pas de mise à jour se trouve dans [`docs/MIGRATION_V1.md`](docs/MIGRATION_V1.md).

## Structure du projet

```text
public/                 interface PWA
functions/api/sync.js   API Cloudflare Pages Functions
migrations/             schémas SQL de référence
docs/                   guides et format d’import
```

## Test local

```bash
python3 -m http.server 8000 --directory public
```

Puis ouvrir `http://localhost:8000`. La synchronisation distante nécessite l’environnement Cloudflare ; toutes les fonctions locales restent utilisables sans lui.
