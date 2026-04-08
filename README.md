# Dungeon Generator Studio

Un générateur procédural RPG orienté exploration, redesigné en **studio web complet** avec:

- panneau de configuration avancée,
- presets rapides (donjon, frontière, capitale, citadelle),
- historique des seeds,
- analyse de répartition des tuiles,
- export JSON prêt pour du tooling ou du game design.

## Structure du projet

```text
.
├── docs/
│   └── ARCHITECTURE.md
├── src/
│   ├── scripts/
│   │   └── app.js
│   └── styles/
│       └── main.css
├── index.html
├── README.md
└── .github/
    └── workflows/
        └── static-check.yml
```

## Démarrage rapide

Aucune dépendance externe.

```bash
python -m http.server 8080
```

Puis ouvre `http://localhost:8080`.

## Raccourcis clavier

- `R` : régénérer la carte.
- `C` : copier le JSON de la carte actuelle.

## Roadmap possible

- Export PNG/SVG
- Biomes modulaires via plugins
- Génération multi-zones (macro + micro)
