# Passage de Coach Jérémy v0.6 à Série 1.0

La version 1.0 remplace l’application mono-profil par une application multi-profils, sans changer le domaine Cloudflare ni la liaison D1 existante.

## Avant la mise à jour

1. Ouvrir l’ancienne application sur l’appareil qui contient les données les plus complètes.
2. Aller dans `Données > Maintenance`.
3. Télécharger une sauvegarde JSON.
4. Vérifier que la synchronisation indique `À jour` lorsque D1 est déjà configuré.

## Mettre les fichiers à jour

1. Décompresser l’archive Série 1.0.
2. Copier son contenu à la racine du dépôt `jeremy-training-app`.
3. Remplacer les fichiers existants.
4. Dans GitHub Desktop, créer un commit, par exemple :

```text
Passage à Série 1.0 — profils et partage
```

5. Cliquer sur `Push origin`.
6. Attendre le déploiement automatique Cloudflare Pages.

## Configuration Cloudflare

Aucune nouvelle base n’est nécessaire lorsque la version précédente utilisait déjà D1.

Vérifier seulement que le projet Pages possède toujours une liaison D1 nommée exactement :

```text
DB
```

La nouvelle table `profile_state` est créée automatiquement au premier échange. L’ancienne table n’est pas supprimée.

## Premier lancement

1. Fermer complètement l’ancien onglet ou la PWA.
2. Rouvrir le site.
3. L’ancien état local est transformé automatiquement en profil.
4. Choisir ce profil dans l’écran d’accueil.
5. Vérifier le programme, l’historique, les pesées et les records.
6. Dans `Données`, lancer une synchronisation manuelle une première fois.

Les anciennes données locales restent disponibles sous leurs clés de migration. Une sauvegarde demeure néanmoins la protection principale.

## Inviter un ami

Utiliser `Données > Inviter un ami > Partager Série`.

Ce bouton partage uniquement le lien public de l’application. L’ami crée son propre profil, choisit sa couleur, copie le prompt ChatGPT et importe son programme.

Ne pas lui transmettre le bouton `Copier le lien pour un autre appareil` : ce lien contient la clé d’accès au profil actuellement ouvert.
