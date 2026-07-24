# Coach Jérémy — v0.4

Application web mobile de suivi sportif, sans framework et sans serveur.

## Fonctionnalités

- séances ordonnées en Jour 1, Jour 2, etc., avec le jour calendaire uniquement comme suggestion ;
- reprise immédiate d'une séance en cours ;
- poids quotidien, moyenne des sept dernières pesées et tendance ;
- validation rapide d'un exercice conforme ;
- modification des séries, charges et répétitions avec boutons `− / +` ;
- RPE de 5 à 10 par paliers de 0,5 ;
- validation série par série et chronomètre de repos ;
- signalement guidé des douleurs et problèmes techniques ;
- statuts manuels : réussi, partiel, échec, remplacé ou non réalisé ;
- indication des séries filmées ;
- progression visible pendant la séance ;
- bilan hebdomadaire calculé et export optimisé pour ChatGPT ;
- aperçu du programme avant import ;
- archivage automatique de la semaine remplacée ;
- historique consultable et exportable ;
- records de charge par exercice avec répétitions et date ;
- possibilité de clôturer une séance non réalisée en documentant la cause ;
- réinitialisation de l’avancement sans supprimer la structure du programme ;
- sauvegarde / restauration complète ;
- installation possible en PWA.

## Mise à jour depuis la v0.1

Remplacer les fichiers du dépôt par ceux de cette version, puis effectuer :

1. `Commit to main` dans GitHub Desktop ;
2. `Push origin`.

Cloudflare Pages republie automatiquement le site. Les données v0.1 déjà présentes dans le navigateur sont migrées vers le format v0.4 au premier chargement.

## Mise en ligne Cloudflare Pages

Le dossier à publier est `public`.

- Build command : laisser vide
- Build output directory : `public`

## Test local

Depuis le dossier du projet :

```bash
python3 -m http.server 8000 --directory public
```

Puis ouvrir `http://localhost:8000`.

## Stockage

Les données sont conservées dans le navigateur avec `localStorage`. Elles ne sont pas synchronisées entre appareils. Utiliser régulièrement le bouton de sauvegarde dans `Données`.
