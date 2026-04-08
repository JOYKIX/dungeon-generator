# Architecture

## Vue d'ensemble

Le projet est une application front-end statique, sans build step.

- `index.html` : squelette de l'interface studio.
- `src/styles/main.css` : système visuel (layout responsive, thèmes, tuiles).
- `src/scripts/app.js` : moteur procédural + interactions UI.

## Flux d'exécution

1. Lecture des paramètres UI.
2. Seed + biome -> RNG déterministe.
3. Génération de la grille (algorithme par biome).
4. Rendu DOM de la carte.
5. Mise à jour analytics (stats, breakdown, historique).

## Moteur procédural

Biomes supportés:
- cave,
- forêt,
- ville,
- ruines,
- marais.

Chaque biome expose:
- une `map` 2D,
- une `palette` (classe CSS par type),
- une `legend`.

## Maintenabilité

Pour ajouter un biome:
1. ajouter ses tuiles dans `TILE`;
2. créer `generate<Biome>` dans `app.js`;
3. brancher le biome dans `buildMap`;
4. ajouter ses classes CSS dans `main.css`;
5. ajouter l'option dans le `<select>` HTML.
