# The Unleashed Mine — rapport maths

Mesuré sur les fichiers publiés `library/publish_files` (100 000 livres par mode, optimiseur Rust du SDK). Tests : `../../env/bin/python -m pytest tests -q` (7 passent).

## Grille et règles
- 6 rouleaux x 5 rangées, gains par amas (5 symboles identiques adjacents ou plus), cascades.
- Wild W (Pépite d'or) remplace les symboles payants, pas le scatter S (Dynamite).
- 4+ scatters : free spins « Unleashed Mine » : 4 → 10, 5 → 12, 6 → 15, 7 → 18, 8 → 20. Relance avec 3+ scatters : 3 → 5, 4 → 8, 5 → 10, 6 → 12, 7 → 15, 8 → 18.
- Veines à multiplicateurs (free spins seulement) : chaque case démarre à x4 ; chaque case d'un amas gagnant gagne +6 ; plafond x512 par case. Gain d'un amas = valeur de table x somme des multiplicateurs de ses cases.
- Gain max 5 000x la mise.

## Modes
| Mode | Coût | RTP | Gain max | Taux de gain | Médiane |
|---|---|---|---|---|---|
| base | 1x | 96,000 % | 5 000x (environ 1 / 5 000 000) | 29,1 % | 0x |
| bonus (UNLEASH) | 100x | 96,000 % | 5 000x (environ 1 / 50 000) | 100 % (plancher 30x) | 39,9x |

Tous les paiements sont des multiples de 0,1x. Deux modes (limite : 20).

## Répartition des gains — base (part des spins, part du RTP)
| Gain | Spins | Part du RTP |
|---|---|---|
| 0x | 70,9 % | 0 |
| 0 à 1x | 11,2 % | 5,6 % |
| 1 à 2x | 4,7 % | 6,7 % |
| 2 à 5x | 10,2 % | 33,3 % |
| 5 à 10x | 2,4 % | 13,3 % |
| 10 à 40x | 0,07 % | 1,9 % |
| 40 à 100x | 0,33 % | 22,7 % |
| 100 à 500x | 0,09 % | 11,7 % |
| 500x et plus | 0,001 % | 0,8 % |

## Répartition des gains — UNLEASH
| Gain | Achats | Part du RTP |
|---|---|---|
| 20 à 40x | 50,1 % | 17,4 pts |
| 40 à 60x | 31,5 % | 13,9 pts |
| 60 à 100x | 1,7 % | 1,4 pts |
| 100 à 200x | 4,2 % | 6,2 pts |
| 200 à 500x | 8,2 % | 26,9 pts |
| 500 à 1 000x | 3,9 % | 26,2 pts |
| 1 000x et plus | 0,33 % | 4,1 pts |

## Points faibles connus (à traiter dans la boucle SWOT)
- Mode UNLEASH : 81,6 % des achats rendent 20 à 60x pour 100x payés. La valeur vient surtout des 16,6 % d'achats à 100x et plus. Médiane 39,9x (le seuil de test a été réglé à 35x ; le but initial de 40x est manqué de 0,1x).
- Jeu de base : 70,9 % de spins à zéro ; un bonus déclenché environ 1 spin sur 200 (mesure du SWOT : 0,499 %).
- Gain max en base : environ 1 sur 5 millions.
- L'optimiseur n'est pas reproductible : régénérer les maths change légèrement les poids. Toujours relancer les tests.

## Régénérer
```
cd math/games/the_unleashed_mine
python3 tools/make_reels.py            # bandes de rouleaux
../../env/bin/python run.py            # voir PROGRESS.md pour les variables (SIMS_BASE, OPT, batching_size)
../../env/bin/python -m pytest tests -q
```
Mémoire : un lot de 1e5 simulations bonus a été tué par manque de mémoire ; `batching_size` est à 6250.
