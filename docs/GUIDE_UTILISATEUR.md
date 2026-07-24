# Guide utilisateur — version 0.5

## Démarrer une séance

1. Saisir le poids du matin sur l’accueil.
2. Appuyer sur la carte de prochaine séance.
3. Renseigner l’énergie avant la séance.

Les séances sont affichées en `Jour 1`, `Jour 2`, etc. Le jour de semaine indiqué dans le programme est uniquement une suggestion. La date réelle est enregistrée quand la séance est clôturée.

## Renseigner un exercice

### Lorsque tout est conforme

1. Sélectionner le RPE de l’exercice.
2. Appuyer sur `Conforme`.

Les séries prévues sont validées et l’exercice suivant s’ouvre automatiquement.

### Lorsque le réalisé diffère du programme

1. Ouvrir le détail des séries.
2. Modifier la charge et les répétitions avec `− / +` ou par saisie directe.
3. Cocher chaque série terminée ; le chronomètre de repos démarre automatiquement.
4. Modifier le statut si nécessaire.
5. Valider l’exercice.

### Signaler un problème

Appuyer sur `Problème`, puis sélectionner une ou plusieurs causes. Les champs de douleur ou de technique apparaissent uniquement lorsque nécessaires.

## Clôturer ou passer une séance

Après l’entraînement, compléter la durée, le RPE global et un commentaire éventuel, puis appuyer sur `Terminer la séance`.

Si la séance n’est pas effectuée, utiliser `Je ne fais pas cette séance` et expliquer la cause. Cette information sera reprise dans l’export ChatGPT.

## Historique

- `Semaines` : bilans archivés lors de chaque nouvel import.
- `Records` : charge la plus lourde validée par exercice, répétitions et date.
- `Poids` : courbe des dernières pesées et liste exhaustive de toutes les mesures.

## En fin de semaine

1. Ouvrir `Bilan`.
2. Vérifier les statistiques automatiques.
3. Compléter sommeil, énergie, faim, protéines, pas, cardio et ressenti.
4. Appuyer sur `Copier pour ChatGPT`.
5. Coller le bilan dans le chat sportif.

## Importer la semaine suivante

1. Copier la réponse de ChatGPT contenant `SPORT_APP_IMPORT_START` et `SPORT_APP_IMPORT_END`.
2. Ouvrir `Données`.
3. Coller puis appuyer sur `Vérifier`.
4. Contrôler l’aperçu.
5. Appuyer sur `Archiver la semaine actuelle et importer`.

## Synchronisation PC / iPhone

Lorsque Cloudflare D1 est configuré, la synchronisation se lance automatiquement :

- à l’ouverture de l’application ;
- après une modification ;
- au retour de la connexion Internet.

Le bouton `Synchroniser maintenant` permet de forcer l’opération. Toutes les données restent aussi enregistrées localement, ce qui permet de continuer hors connexion.

Lors de la première utilisation sur un deuxième appareil, si deux versions différentes existent, l’application demande laquelle conserver. Télécharger une sauvegarde avant le choix lorsque les deux versions contiennent des données utiles.

## Réinitialisation et sauvegarde

`Réinitialiser` conserve le programme et l’historique ; seules les validations, les saisies et les pesées de la semaine courante sont effacées.

La synchronisation ne remplace pas la sauvegarde JSON. Télécharger ponctuellement une sauvegarde depuis `Données`, notamment avant un changement important ou une restauration.
