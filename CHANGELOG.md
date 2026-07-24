# Historique des versions

## v1.0 — profils et ouverture à plusieurs utilisateurs

- Nouveau nom générique : **Série**.
- Sélection du profil à chaque lancement.
- Création de profils sans compte ni mot de passe.
- Palette de huit couleurs contrôlées et thème dynamique par profil.
- Programme, historique, pesées, bilan et synchronisation séparés pour chaque profil.
- Lien personnel contenant une clé de récupération pour ouvrir un profil sur un autre appareil.
- Avertissement explicite : toute personne possédant ce lien peut accéder au profil.
- Partage distinct du lien public de l’application pour inviter un ami sans lui donner accès à son profil.
- Migration automatique des données locales v0.6 vers un profil.
- Identifiants de migration déterministes afin de conserver la continuité entre appareils déjà synchronisés.
- Nouvelle table D1 `profile_state`, avec clé hachée, révision et gestion des conflits par profil.
- Écran pédagogique `Connecter ChatGPT` en trois étapes.
- Prompt complet de configuration copiable depuis l’application.
- Demande de conversion seule copiable pour les conversations déjà configurées.
- Assistant affiché à la création d’un profil.
- État vide propre, sans programme ni données de démonstration personnelles.
- Schéma d’import `1.1` générique.
- Compatibilité avec les anciens imports `1.0`.
- Prise en charge des répétitions fixes, plages de répétitions, durées, distances, RPE, RIR, tempo, notes et groupes de supersets.
- Contrôles de saisie adaptés automatiquement au type de prescription.
- Bilan exporté en RPE ou RIR selon le programme.
- Historique et bilan vides rendus pédagogiques avant le premier import.
- Suppression des données de démonstration personnelles du code public.
- Stockage mémoire de secours lorsque le stockage local du navigateur est indisponible.
- Protection contre les réponses de synchronisation tardives lors d’un changement rapide de profil.
- Délai maximal de synchronisation afin d’éviter une interface bloquée sur un réseau instable.
- Icônes PWA dédiées et identité visuelle générique.

## v0.6 — refonte iOS et fluidité

- Mode séance immersif, interface compactée, cartes d’exercices simplifiées.
- CSS harmonisé, mode sombre, safe areas et navigation adaptée au clavier.
- Historique du poids enrichi et écran Données simplifié.

## v0.5 — synchronisation et poids

- Synchronisation Cloudflare D1 entre appareils.
- Fonctionnement hors connexion et gestion des conflits.
- Historique et graphique du poids.

## v0.4 — séances séquentielles et records

- Séances en Jour 1, Jour 2, etc.
- Date réelle enregistrée à la clôture.
- Séances non réalisées avec cause.
- Records de charge par exercice.

## v0.1 à v0.3

- Première interface mobile, suivi des séries, import/export ChatGPT, chronomètre et optimisation iPhone.
