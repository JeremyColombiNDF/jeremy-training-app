# Coach Jérémy — v0.1

Application web mobile de suivi sportif, sans framework et sans serveur.

## Fonctionnalités

- semaine de cinq séances préchargée ;
- poids quotidien ;
- suivi prévu / réalisé série par série ;
- charge, répétitions et RPE modifiables ;
- statuts et problèmes d'exécution ;
- indication des séries filmées ;
- bilan hebdomadaire ;
- export texte optimisé pour ChatGPT ;
- import JSON de la semaine suivante ;
- sauvegarde / restauration ;
- installation possible en PWA.

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

## Important

Les données de cette version sont conservées dans le navigateur avec `localStorage`. Elles ne sont pas synchronisées entre appareils.
