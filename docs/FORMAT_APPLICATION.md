# Format d’import Série

Version actuelle : `1.1`

L’application accepte les schémas `1.0` et `1.1`, puis normalise les données vers `1.1`.

La réponse de ChatGPT doit contenir un objet JSON entre les marqueurs :

```text
SPORT_APP_IMPORT_START
{ ... JSON valide ... }
SPORT_APP_IMPORT_END
```

Le JSON ne doit pas être entouré de triples accents graves.

## Schéma

```json
{
  "schema_version": "1.1",
  "athlete_profile": {
    "name": "facultatif",
    "current_goal": "facultatif",
    "constraints": ["facultatif"]
  },
  "week": {
    "id": "week-unique-id",
    "number": 1,
    "block_name": "Nom du bloc",
    "title": "Semaine 1",
    "objective": "Objectif général",
    "start_date": "",
    "sessions": [
      {
        "id": "session-1",
        "day": "Lundi",
        "title": "Titre de la séance",
        "goal": "Objectif de la séance",
        "estimated_duration_min": 60,
        "general_notes": "Consignes générales facultatives",
        "exercises": [
          {
            "id": "exercise-1",
            "name": "Nom de l’exercice",
            "instructions": "Consignes techniques facultatives",
            "film_requested": false,
            "adaptation_rule": "Règle d’adaptation facultative",
            "superset_group": "A",
            "weight_step_kg": 2.5,
            "sets": [
              {
                "order": 1,
                "weight_kg": 100,
                "reps": 5,
                "reps_min": null,
                "reps_max": null,
                "duration_sec": null,
                "distance_m": null,
                "target_rpe_min": 7,
                "target_rpe_max": 8,
                "target_rir": null,
                "rest_sec": 120,
                "tempo": "",
                "notes": ""
              }
            ]
          }
        ]
      }
    ]
  }
}
```

## Types de prescriptions

### Répétitions fixes

```json
{ "weight_kg": 100, "reps": 5, "reps_min": null, "reps_max": null }
```

### Plage de répétitions

```json
{ "weight_kg": 24, "reps": null, "reps_min": 8, "reps_max": 12 }
```

### Travail au temps

```json
{ "weight_kg": null, "reps": null, "duration_sec": 45 }
```

### Travail à la distance

```json
{ "weight_kg": null, "reps": null, "distance_m": 400 }
```

### RPE ou RIR

Utiliser soit :

```json
{ "target_rpe_min": 7, "target_rpe_max": 8, "target_rir": null }
```

soit :

```json
{ "target_rpe_min": null, "target_rpe_max": null, "target_rir": 2 }
```

## Règles

- L’ordre du tableau `sessions` détermine Jour 1, Jour 2, etc.
- `day` est uniquement une suggestion calendaire.
- La date réelle est enregistrée par l’application à la clôture de la séance.
- Le nombre de séances et d’exercices est libre.
- Chaque série doit être un objet distinct.
- Tous les identifiants doivent être uniques dans la semaine.
- Pour le poids du corps ou une charge libre, utiliser `weight_kg: null`.
- Les champs numériques non utilisés doivent être `null`.
- Les champs texte non utilisés doivent être des chaînes vides.
- `superset_group` peut relier plusieurs exercices avec la même valeur.
- `weight_step_kg` est facultatif et contrôle les boutons de charge.
- Une série doit posséder au moins une mesure : répétitions, durée ou distance.
