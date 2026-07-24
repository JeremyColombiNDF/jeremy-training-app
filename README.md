# Série — version 1.1.0

Série transforme un programme sportif conçu dans ChatGPT en carnet d’entraînement interactif, sans imposer de méthode de programmation.

## Principe

1. L’utilisateur choisit ou crée un profil dans la liste commune.
2. Lors de la première ouverture sur un appareil, il saisit le code à 4 chiffres du profil.
3. Il copie le prompt de configuration depuis `Données > Connecter ChatGPT`.
4. ChatGPT convertit le dernier programme validé au format Série.
5. L’utilisateur importe la réponse, suit ses séances et exporte son bilan hebdomadaire.

ChatGPT reste le coach ou le générateur de programme. Série reste l’outil d’exécution, de saisie, d’historique et d’échange.

## Nouveautés de la version 1.1

- répertoire global de profils partagé entre tous les appareils ;
- apparition automatique d’un profil après sa création et sa synchronisation ;
- code personnel à 4 chiffres demandé uniquement lors de la première ouverture sur un appareil ;
- mémorisation de l’accès sur l’appareil ;
- code administrateur universel vérifié exclusivement côté serveur ;
- migration guidée des profils créés avec Série 1.0 ;
- conservation du programme, des pesées, de l’historique et des résultats ;
- suppression des liens personnels entre appareils.

## Fonctionnalités principales

- couleur principale propre à chaque profil ;
- synchronisation D1 isolée par profil ;
- assistant pédagogique de connexion à ChatGPT ;
- import de programmes en schéma `1.1` ;
- charges fixes, plages de répétitions, durée, distance, RPE, RIR, tempo et supersets ;
- mode séance immersif, validation rapide et chronomètre ;
- suivi des problèmes, douleurs, vidéos et séances non réalisées ;
- bilan hebdomadaire exportable vers ChatGPT ;
- historique des semaines, records et pesées ;
- graphique de poids avec moyenne mobile ;
- fonctionnement hors connexion après la première ouverture du profil ;
- mode clair et sombre automatiques ;
- sauvegarde et restauration JSON.

## Mise en ligne

Le projet est prévu pour Cloudflare Pages avec intégration GitHub.

- Build command : laisser vide
- Build output directory : `public`
- Production branch : `main`

Le dossier `functions` doit rester à la racine du dépôt.

## Configuration serveur indispensable

La base D1 doit être liée au projet Pages sous le nom exact `DB`.

Le code administrateur doit être ajouté comme secret serveur :

```text
ADMIN_PIN = votre code administrateur
```

Ne place pas ce code dans `app.js`, GitHub ou un fichier public. La fonction Cloudflare le lit uniquement côté serveur.

Après toute modification des bindings ou secrets, relancer un déploiement Cloudflare.

Voir [`docs/CONFIGURATION_SYNCHRONISATION.md`](docs/CONFIGURATION_SYNCHRONISATION.md).

## Migration depuis Série 1.0

Les anciens profils restent disponibles localement et apparaissent avec la mention `À publier`.

Lors de leur première sélection :

1. choisir un code personnel à 4 chiffres ;
2. publier le profil dans la liste commune ;
3. conserver automatiquement les données locales ou la version distante la plus récente de l’ancien système ;
4. retrouver ensuite le profil sur tous les appareils.

Voir [`docs/MIGRATION_SERIE_1_1.md`](docs/MIGRATION_SERIE_1_1.md).

## Structure du projet

```text
public/                    interface PWA
functions/api/profiles.js  répertoire, codes et sessions d’appareil
functions/api/sync.js      synchronisation des données du profil
migrations/                schémas SQL de référence
docs/                      guides et format d’import
```

## Test local

```bash
python3 -m http.server 8000 --directory public
```

L’interface locale fonctionne, mais la création, le déverrouillage et la synchronisation nécessitent l’environnement Cloudflare.
