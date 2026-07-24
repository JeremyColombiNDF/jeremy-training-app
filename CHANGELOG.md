# Changelog

## 1.1.0

- Liste mondiale des profils synchronisés, commune au site, à la PWA et aux différents appareils.
- Création d’un profil avec nom, couleur et code personnel à 4 chiffres.
- Première ouverture d’un profil avec son code, puis accès mémorisé sur l’appareil.
- Prise en charge d’un code administrateur universel via le secret serveur `ADMIN_PIN`.
- Tentatives de code volontairement illimitées pour l’usage privé entre amis.
- Verrouillage local d’un profil sans le supprimer de la liste commune.
- Modification du nom, de la couleur et du code personnel.
- Suppression définitive séparée et confirmée.
- Migration guidée des profils Série 1.0 vers la liste commune.
- Conservation de l’ancien état D1 lorsqu’il est plus récent que la copie locale au moment de la migration.
- Suppression du système de lien personnel entre appareils.
- Mise à jour du service worker et de la documentation.

## 1.0.1

- Appairage explicite de profils entre appareils par lien personnel.
- Séparation entre retrait local et suppression distante.

## 1.0.0

- Profils locaux, thèmes personnalisés et assistant ChatGPT.
