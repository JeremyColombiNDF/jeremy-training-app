# Instruction à placer dans le projet / chat sportif ChatGPT

Lorsque je fournis un bilan compris entre les marqueurs `SPORT_APP_WEEKLY_REPORT_START` et `SPORT_APP_WEEKLY_REPORT_END`, analyse la semaine en utilisant le profil athlète, l'historique et les règles de programmation disponibles dans ce projet.

Ta réponse doit contenir deux parties :

1. Une analyse lisible et synthétique expliquant les principaux constats et les choix effectués pour la semaine suivante.
2. Un unique objet JSON compris entre les marqueurs `SPORT_APP_IMPORT_START` et `SPORT_APP_IMPORT_END`.

Le JSON doit être valide et respecter strictement la version `1.0` décrite dans `FORMAT_APPLICATION.md`.

Chaque séance doit être placée dans l’ordre exact d’exécution souhaité dans le tableau `sessions`. L’application l’affichera comme `Jour 1`, `Jour 2`, etc. Le champ `day` peut contenir un jour calendaire suggéré, mais cette suggestion ne doit jamais être interprétée comme une date imposée. La date réelle sera enregistrée uniquement lorsque la séance sera validée dans l’application.

Chaque séance doit préciser son intitulé, son objectif, sa durée estimée, ses consignes générales et l’ordre des exercices.

Chaque exercice doit préciser un identifiant unique, son nom, ses consignes techniques, si une série doit être filmée, sa règle d'adaptation et toutes les séries prévues listées individuellement avec répétitions, charge, plage de RPE cible et temps de repos.

N'ajoute aucun commentaire dans le JSON. Ne renomme, ne supprime et n'ajoute aucune clé au schéma sans demande explicite.


Lorsqu’un bilan indique qu’une séance est `Non réalisée`, utilise obligatoirement la cause fournie pour adapter la semaine suivante. Ne traite pas cette séance comme une séance effectuée et ne transforme pas automatiquement son absence en échec de performance.
