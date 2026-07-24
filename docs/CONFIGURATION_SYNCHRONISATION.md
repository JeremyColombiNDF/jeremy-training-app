# Synchronisation globale des profils avec Cloudflare D1

## 1. Liaison D1

Le projet Cloudflare Pages doit posséder une liaison D1 nommée exactement :

```text
DB
```

La base existante peut être conservée. Série 1.1 crée automatiquement les tables `shared_profiles` et `profile_sessions` au premier appel.

Les scripts SQL de référence se trouvent dans `migrations/`. Leur exécution manuelle n’est pas nécessaire dans le fonctionnement normal.

## 2. Code administrateur

Ajouter un secret serveur au projet Pages :

```text
Nom : ADMIN_PIN
Valeur : votre code administrateur
```

Ce secret doit être défini dans l’environnement de production utilisé par le site. Relancer ensuite un déploiement.

Le code n’est jamais envoyé au navigateur et ne doit pas être ajouté au dépôt GitHub.

## 3. Fonctionnement

La base contient deux niveaux :

### Répertoire commun

Pour chaque profil :

- identifiant ;
- nom ;
- couleur ;
- date de dernière mise à jour.

Cette partie est visible par tous les utilisateurs du lien de l’application afin que la même liste apparaisse partout.

### Données du profil

- programme actif ;
- résultats ;
- pesées ;
- historique ;
- records ;
- bilan hebdomadaire.

Ces données ne sont chargées qu’après déverrouillage du profil.

## 4. Codes et appareil mémorisé

Chaque profil possède un code personnel à 4 chiffres. Le code est demandé lors de la première ouverture sur un nouvel appareil.

Après validation, le serveur délivre un jeton d’appareil mémorisé dans le navigateur. Le code n’est pas conservé localement.

Le code administrateur défini dans `ADMIN_PIN` ouvre également n’importe quel profil.

Conformément au périmètre privé entre amis :

- les tentatives sont illimitées ;
- aucun blocage temporaire n’est appliqué ;
- aucun e-mail ni système de récupération n’est requis.

## 5. Conflits

Si deux appareils modifient le même profil hors connexion, l’application conserve le système existant :

- utiliser la version en ligne ;
- conserver la version de l’appareil ;
- télécharger une sauvegarde avant de choisir.

## 6. Migration depuis Série 1.0

Les anciennes données étaient enregistrées dans `profile_state` avec une clé par appareil.

Lors de la publication d’un ancien profil, Série 1.1 :

1. vérifie l’ancien accès ;
2. compare la copie locale et l’ancien état distant ;
3. conserve la version la plus récente ;
4. crée le profil dans le nouveau répertoire commun ;
5. attribue le code à 4 chiffres choisi par l’utilisateur.
