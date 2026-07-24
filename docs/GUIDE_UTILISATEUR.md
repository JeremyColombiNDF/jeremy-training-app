# Guide utilisateur — version 0.6

## Démarrer une séance

1. Saisir le poids du matin sur l’accueil.
2. Appuyer sur la carte de prochaine séance.
3. Ajuster l’énergie avec les boutons `− / +`.

Les séances sont affichées en `Jour 1`, `Jour 2`, etc. Le jour de semaine est uniquement une suggestion. La date réelle n’est enregistrée que lorsque la séance est terminée ou déclarée non réalisée.

## Renseigner un exercice

### Lorsque tout est conforme

1. Appuyer sur `Conforme`.
2. Sélectionner le RPE de l’exercice.
3. Appuyer sur `Valider l’exercice`.

Les séries prévues sont reprises automatiquement et l’exercice suivant s’ouvre.

### Lorsque le réalisé diffère du programme

1. Appuyer sur `Ajuster`.
2. Modifier la charge et les répétitions avec `− / +` ou par saisie directe.
3. Cocher les séries terminées ; le chronomètre démarre automatiquement.
4. Sélectionner le RPE.
5. Valider l’exercice.

Le statut est calculé automatiquement : réussi si tout correspond, partiel en cas d’écart ou échec si aucune série n’est validée.

### Actions complémentaires

Le bouton `•••` permet de :

- signaler un problème ;
- indiquer qu’une série a été filmée ;
- marquer l’exercice comme remplacé ;
- marquer l’exercice comme non réalisé.

## Chronomètre et fin de séance

Le dock inférieur permet de passer d’un exercice à l’autre et de gérer le temps de repos. Après validation de tous les exercices, il affiche le bouton `Terminer`.

La feuille de clôture demande la durée réelle, le RPE global et un commentaire éventuel. La date et l’heure sont enregistrées à cet instant.

Pour ne pas réaliser une séance, ouvrir le menu `•••` en haut à droite puis expliquer la cause.

## Historique

- `Semaines` : bilans archivés lors de chaque nouvel import.
- `Records` : charge la plus lourde validée par exercice, répétitions et date.
- `Poids` : graphique et liste complète des pesées.

Le graphique du poids propose :

- les 30 derniers jours ;
- les trois derniers mois ;
- toute la période.

La courbe orange en pointillés correspond à la moyenne mobile des sept dernières pesées. Les mesures sont regroupées par mois.

## Bilan hebdomadaire

1. Ouvrir `Bilan`.
2. Vérifier les indicateurs automatiques.
3. Compléter sommeil, énergie, faim, protéines, pas, cardio et ressenti.
4. Appuyer sur `Copier le bilan pour ChatGPT`.
5. Coller le contenu dans le chat sportif.

## Importer la semaine suivante

1. Copier la réponse de ChatGPT contenant `SPORT_APP_IMPORT_START` et `SPORT_APP_IMPORT_END`.
2. Ouvrir `Données`.
3. Appuyer sur `Importer une nouvelle semaine`.
4. Contrôler l’aperçu.
5. Valider l’import.

Le contenu JSON brut reste replié. Il peut être ouvert manuellement lorsque l’accès au presse-papiers est refusé.

## Synchronisation PC / iPhone

Lorsque Cloudflare D1 est configuré, la synchronisation se lance automatiquement :

- à l’ouverture de l’application ;
- après une modification ;
- au retour de la connexion Internet.

L’icône de nuage dans `Données` permet de forcer la synchronisation. Les données restent aussi enregistrées localement pour continuer hors connexion.

## Réinitialisation et sauvegarde

`Réinitialiser` conserve le programme et l’historique ; seules les validations, saisies et pesées de la semaine courante sont effacées.

Télécharger ponctuellement une sauvegarde JSON depuis `Données`, notamment avant une restauration ou une modification importante.

## Apparence

L’application suit automatiquement le mode clair ou sombre défini sur l’iPhone. La navigation disparaît pendant une séance et lorsque le clavier est ouvert afin de maximiser l’espace utile.
