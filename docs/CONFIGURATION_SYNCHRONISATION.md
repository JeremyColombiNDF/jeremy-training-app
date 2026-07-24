# Activer la synchronisation PC / iPhone

La version v0.6 contient déjà tout le code nécessaire. Il reste uniquement à créer une base D1 et à la relier au projet Cloudflare Pages.

## 1. Mettre la v0.6 en ligne

Dans le dossier GitHub local :

1. remplacer les fichiers par ceux de la v0.6 ;
2. ouvrir GitHub Desktop ;
3. saisir `Passage à la version v0.6 — synchronisation et suivi du poids` ;
4. cliquer sur `Commit to main` ;
5. cliquer sur `Push origin`.

## 2. Créer la base D1

Dans le tableau de bord Cloudflare :

1. ouvrir `Workers & Pages` ;
2. ouvrir la rubrique `D1 SQL Database` ou `D1` ;
3. cliquer sur `Create database` ;
4. nommer la base `coach-jeremy-sync` ;
5. valider.

Il n’est pas nécessaire de créer la table manuellement : l’application la crée au premier appel. Le script SQL est néanmoins disponible dans `migrations/0001_create_app_state.sql`.

## 3. Relier D1 au projet Pages

1. revenir dans `Workers & Pages` ;
2. ouvrir le projet `jeremy-training-app` ;
3. ouvrir `Settings` ;
4. ouvrir `Bindings` ;
5. ajouter une liaison de type `D1 database` ;
6. saisir exactement `DB` dans `Variable name` / `Binding name` ;
7. sélectionner la base `coach-jeremy-sync` ;
8. enregistrer.

Le nom `DB` est obligatoire, car c’est celui utilisé par la fonction `/api/sync`.

## 4. Redéployer après la liaison

Une liaison n’est prise en compte que par un nouveau déploiement. Le plus simple :

1. dans GitHub Desktop, modifier légèrement `CHANGELOG.md` ou refaire un commit si nécessaire ;
2. `Commit to main` ;
3. `Push origin`.

Il est également possible de relancer le dernier déploiement depuis Cloudflare.

## 5. Première synchronisation

Procédure recommandée :

1. ouvrir d’abord l’appareil qui contient la version la plus complète de tes données ;
2. aller dans `Données` ;
3. appuyer sur `Synchroniser maintenant` ;
4. attendre le statut `Données à jour` ;
5. ouvrir ensuite l’application sur l’autre appareil ;
6. s’il affiche deux versions différentes, choisir `Utiliser la version en ligne`.

Avant le premier choix, le bouton de sauvegarde permet de télécharger la version locale.

## Statuts possibles

- `Données à jour` : PC, iPhone et Cloudflare utilisent la même version.
- `Modifications en attente` : les données sont sauvegardées localement et vont être envoyées.
- `Synchronisation…` : échange en cours.
- `Hors connexion` : l’application continue localement.
- `Configuration nécessaire` : la liaison D1 `DB` manque ou n’est pas encore active.
- `Choix nécessaire` : deux versions ont été modifiées séparément.
