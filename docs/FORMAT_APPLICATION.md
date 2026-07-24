# Format d'import — Coach Jérémy

Version de schéma attendue : `1.0`

ChatGPT doit retourner un objet JSON compris entre les marqueurs :

```text
SPORT_APP_IMPORT_START
{ ... JSON valide ... }
SPORT_APP_IMPORT_END
```

## Structure obligatoire

```json
{
  "schema_version": "1.0",
  "athlete_profile": {
    "name": "Jérémy",
    "age": 26,
    "height_m": 1.79,
    "usual_frequency": "5 séances consécutives en semaine, 60 à 75 minutes",
    "current_goal": "Objectif actuel",
    "constraints": ["Contrainte 1", "Contrainte 2"]
  },
  "week": {
    "id": "bloc-x-week-2",
    "number": 2,
    "block_name": "Nom du bloc",
    "title": "Semaine 2",
    "objective": "Objectif synthétique de la semaine",
    "start_date": "2026-08-03",
    "sessions": [
      {
        "id": "week-2-monday-upper",
        "day": "Lundi",
        "title": "Upper force",
        "goal": "Objectif de la séance",
        "estimated_duration_min": 70,
        "general_notes": "Consigne générale",
        "exercises": [
          {
            "id": "week-2-bench-main",
            "name": "Développé couché",
            "instructions": "Consignes techniques courtes",
            "film_requested": true,
            "adaptation_rule": "Réduire la charge si le RPE dépasse la cible",
            "sets": [
              {
                "order": 1,
                "weight_kg": 120,
                "reps": 1,
                "target_rpe_min": 7,
                "target_rpe_max": 8,
                "rest_sec": 180
              }
            ]
          }
        ]
      }
    ]
  }
}
```

## Règles strictes

- Tous les identifiants `id` doivent être uniques dans la semaine.
- `weight_kg` est un nombre ou `null` pour le poids du corps / un exercice sans charge renseignée.
- Chaque série est listée individuellement dans `sets`.
- `reps`, `target_rpe_min`, `target_rpe_max`, `rest_sec` sont des nombres.
- `film_requested` est un booléen : `true` ou `false`.
- Aucun commentaire ne doit être ajouté dans le JSON.
- Ne pas utiliser de séries résumées du type `4x8` dans un champ texte à la place du tableau `sets`.
