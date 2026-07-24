# Protocole Série ↔ ChatGPT

Le protocole complet est généré automatiquement par l’application afin d’inclure le prénom du profil et la version exacte du schéma.

Dans Série :

1. ouvrir `Données` ;
2. aller dans `Connecter ChatGPT` ;
3. choisir `Copier le prompt de configuration` ;
4. le coller dans la conversation ChatGPT qui contient déjà le programme et son historique.

Le prompt demande à ChatGPT de :

- conserver le fond du coaching existant ;
- retrouver le dernier programme complet et validé ;
- le convertir sans demander de ressaisie ;
- retourner le programme entre `SPORT_APP_IMPORT_START` et `SPORT_APP_IMPORT_END` ;
- accepter ensuite les bilans entre `SPORT_APP_WEEKLY_REPORT_START` et `SPORT_APP_WEEKLY_REPORT_END` ;
- générer chaque semaine suivante dans le même schéma `1.1`.

Le fichier [`FORMAT_APPLICATION.md`](FORMAT_APPLICATION.md) décrit le schéma technique.

Il n’est pas nécessaire d’ajouter ce document à ChatGPT : le bouton de l’application fournit directement la version prête à coller.
