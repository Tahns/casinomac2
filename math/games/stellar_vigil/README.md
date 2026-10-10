# Stellar Vigil

Slot original pour Stake Engine : base 5x4 en 1 024 ways, bonus « Nuit des Constellations » (ciel 5x5, étoiles qui se relient), roue de sauvegarde en fin de bonus. Conception complète : [`DESIGN.md`](DESIGN.md). Suivi du projet : `../../../docs/` (SWOT, journal des itérations, questions ouvertes).

Toutes les commandes se lancent depuis `math/`.

## Mise en place
```
make setup                      # crée math/env (Python 3.12+, Rust/Cargo requis pour l'optimiseur)
```

## Générer les maths
```
env/bin/python games/stellar_vigil/run.py                  # 10 000 simulations par mode (~1,5 min)
SV_SIMS=1e5 env/bin/python games/stellar_vigil/run.py      # 100 000 simulations (~10 min), pour valider
```
Les sorties vont dans `games/stellar_vigil/library/` (ignoré par git). Les fichiers à publier sont dans `library/publish_files/`.

**Attention** : l'optimiseur Rust n'est pas reproductible (mêmes réglages, poids différents). Une exécution peut être de moins bonne qualité qu'une autre : toujours passer les tests avant d'accepter une exécution.

## Vérifier
```
env/bin/python -m pytest games/stellar_vigil/tests -q      # 46 tests (~3 min avec une bibliothèque à 100 000)
```
- `test_constellation.py` : logique du ciel (chaînes, conjonctions, zones, absence du mot « jackpot »).
- `test_books.py` : intégrité des résultats publiés (indices, paiements, comptabilité, roue, RTP).
- `test_quality_gates.py` : forme des distributions (médiane du mode achat, taux de gain). **Rejette une mauvaise exécution de l'optimiseur.**
- `test_reproducible.py` : le moteur de simulation est déterministe (même numéro de simulation, même résultat).

## Outils (`tools/`)
| Commande | Rôle |
|---|---|
| `tools/base_win_shape.py` | forme des gains du jeu de base, naturelle et optimisée (détecte les haltères) |
| `tools/session_sim.py [--sessions N]` | sessions simulées : probabilité d'être gagnant après N spins, médiane, ruine d'un budget |
| `tools/saver_odds.py` | mesure et publie les vraies chances de la roue de sauvegarde (`library/configs/saver_odds.json`) ; appelé par `reoptimize.py` et `run.py` |
| `tools/wheel_effect.py` | ce que la roue change réellement pour le joueur, avec et sans son rattrapage |
| `tools/rtp_breakdown.py [--natural]` | répartition du RTP par composante ; `--natural` : avant optimisation |
| `tools/reoptimize.py [--max-attempts N] [--no-stop] [--log FICHIER]` | relance seulement l'optimiseur jusqu'à une exécution qui passe les garde-fous ; `--no-stop --log` mesure la dispersion |
| `tools/payout_distribution.py [base\|bonus]` | percentiles et part de RTP par tranche de gain |
| `tools/freeze_maths.py freeze [--archive DIR]` | vérifie les garde-fous, écrit `frozen/MANIFEST.json` (empreintes) et archive les fichiers |
| `tools/freeze_maths.py verify [--dir PATH]` | échoue si des fichiers diffèrent du manifeste |
| `tools/export_demo_books.py` | régénère `../../../demo/books.js` pour la démo jouable |

Ne figer (`freeze`) qu'une exécution finale : le manifeste dit « ces maths sont celles qu'on soumet ».

## Démo jouable
Ouvrir `../../../demo/index.html` dans un navigateur (`books.js` doit rester à côté). La démo rejoue de vrais résultats ; elle n'est pas le front-end final.

## Réglages à connaître (`game_config.py`, `game_optimization.py`)
- `saver_floor` : plancher de la roue (25x en base, 80x en achat) ; `saver_segments` : 3 segments « sauvée » sur 8.
- Répartition du RTP base/bonus : `ACTIVE_RTP_SPLIT` ("default" ou "base_heavy", voir `DESIGN.md` §13).
- Profil de bonus : `ACTIVE_PROFILE` ("A" par défaut ; B, C, D en variantes, voir `DESIGN.md` §10) ; `library/profile.json` en garde la trace.
- Mode achat : coût 80x ; bornes de volatilité `min_m2m=1.5`, `max_m2m=3` (`game_optimization.py`).
- Plafond de gain : 10 000x (`wincap`).
