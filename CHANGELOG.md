# Historique des versions

## v0.5 — 24 juillet 2026

- Ajout de la synchronisation Cloudflare D1 entre le PC et l’iPhone.
- Synchronisation automatique à l’ouverture, après les modifications et au retour de la connexion.
- Ajout du bouton `Synchroniser maintenant` dans l’onglet Données.
- Statuts visibles : à jour, modifications en attente, synchronisation, hors connexion et configuration nécessaire.
- Conservation systématique du stockage local pour fonctionner hors connexion.
- Gestion des conflits avec choix entre la version en ligne et la version de l’appareil.
- Options avancées pour forcer l’envoi local ou récupérer la version en ligne.
- Ajout d’un onglet `Poids` dans l’historique.
- Courbe des 30 dernières pesées et journal exhaustif de toutes les pesées.
- Affichage de la dernière mesure, de la moyenne des sept dernières pesées et de l’évolution totale.
- L’API de synchronisation est exclue du cache du service worker.

## v0.4 — 24 juillet 2026

- Les séances sont désormais présentées en Jour 1, Jour 2, etc. ; le jour de la semaine n’est plus qu’une suggestion.
- La date réelle est enregistrée uniquement lors de la validation de la séance.
- Ajout d’une clôture « séance non réalisée » avec cause obligatoire dans le bilan exporté.
- Le bouton Réinitialiser efface uniquement l’avancement et les saisies de la semaine courante, sans toucher au programme ni à l’historique.
- Ajout d’un onglet Records dans l’historique : charge maximale, répétitions et date par exercice.
- Refonte visuelle inspirée du langage Liquid Glass d’iOS : bleu système, surfaces neutres et verre translucide.

## v0.3 — 24 juillet 2026

- Refonte mobile-first optimisée pour un iPhone 13 sous Chrome/iOS.
- Suppression du bandeau global pour libérer la hauteur utile.
- Consignes d’exécution et règle d’adaptation repliées par défaut.
- Actions `Conforme` et `Problème` compactes et réunies sur une ligne.
- Navigation basse et chronomètre en matériau translucide.

## v0.2 — 24 juillet 2026

- Carte de prochaine séance, saisie tactile, chronomètre, bilan prérempli, import avec aperçu et historique des semaines.

## v0.1 — 24 juillet 2026

- Première interface mobile, programme de démonstration, suivi des séries et import/export ChatGPT.
