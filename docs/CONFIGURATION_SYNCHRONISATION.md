# Synchronisation multi-profils avec Cloudflare D1

## Configuration requise

Le projet Cloudflare Pages doit posséder une liaison D1 nommée exactement :

```text
DB
```

Si cette liaison existait déjà dans la version précédente, elle peut être conservée telle quelle. La version 1.0 crée automatiquement la nouvelle table `profile_state` dans la même base.

## Créer une base D1

Dans Cloudflare :

1. ouvrir `Storage & databases` puis `D1` ;
2. créer une base, par exemple `serie-sync` ;
3. ouvrir le projet Pages ;
4. aller dans `Settings` puis `Bindings` ;
5. ajouter une liaison de type `D1 database` ;
6. saisir `DB` comme nom de variable ;
7. sélectionner la base ;
8. enregistrer et relancer un déploiement.

Les scripts SQL de référence se trouvent dans `migrations/`. Il n’est pas nécessaire de les exécuter manuellement : la fonction Pages crée la table au premier appel.

## Fonctionnement par profil

Chaque profil possède :

- un identifiant aléatoire ;
- une clé personnelle aléatoire ;
- un état indépendant dans D1 ;
- une révision indépendante pour détecter les conflits.

La clé n’est jamais stockée en clair dans D1 : seule son empreinte SHA-256 est enregistrée.

## Utiliser un profil sur un autre appareil

Dans `Données > Profil` :

1. choisir `Copier le lien pour un autre appareil` ;
2. envoyer ou ouvrir ce lien sur l’autre appareil ;
3. le profil est ajouté puis récupéré depuis D1.

Le lien contient la clé du profil dans son fragment d’URL. Il doit être traité comme une clé d’accès : toute personne qui le possède peut lire et modifier ce profil.

## Inviter un ami sans partager son profil

Utiliser `Données > Inviter un ami > Partager Série`. Ce bouton partage uniquement l’adresse publique de l’application. L’ami crée ensuite son propre profil et sa propre clé.

## Conflits

Si deux appareils modifient le même profil hors connexion, l’application n’écrase rien silencieusement. Elle propose :

- utiliser la version en ligne ;
- conserver la version de l’appareil ;
- télécharger une sauvegarde avant de choisir.

## Anciennes données

Lors de la migration depuis la version mono-profil, l’application crée un identifiant stable à partir de l’ancien état. Deux appareils possédant le même état initial retrouvent ainsi le même profil de migration.
