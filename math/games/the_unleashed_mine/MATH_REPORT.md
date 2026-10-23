# The Unleashed Mine — rapport maths

Mesuré sur les fichiers publiés `library/publish_files` (100 000 livres par mode, optimiseur Rust du SDK). Tests : `../../env/bin/python -m pytest tests -q` (13 passent).

## Grille et règles
- 6 rouleaux x 5 rangées, gains par amas (5 symboles identiques adjacents ou plus), cascades.
- Wild W (Pépite d'or) remplace les symboles payants, pas le scatter S (Dynamite).
- 4+ scatters : free spins « Unleashed Mine » : 4 → 10, 5 → 12, 6 → 15, 7 → 18, 8 → 20 (9 et plus paient comme 8). Relance avec 3+ scatters : 3 → 5, 4 → 8, 5 → 10, 6 → 12, 7 → 15, 8 → 18.
- Veines à multiplicateurs (free spins seulement) : chaque case démarre à x3 ; chaque case d'un amas gagnant gagne +3 ; plafond x512 par case. Gain d'un amas = valeur de table x somme des multiplicateurs de ses cases.
- Gain max 5 000x la mise.

## Modes
| Mode | Coût | RTP | Gain max | Taux de gain | Médiane |
|---|---|---|---|---|---|
| base | 1x | 96,000 % | 5 000x (environ 1 / 5 000 000) | 29,07 % | 0x |
| bonus (UNLEASH) | 100x | 96,000 % | 5 000x (1 / 50 000) | 100 % (plancher 30x) | 42,6x |

Tous les paiements sont des multiples de 0,1x. Deux modes (limite : 20). Mesuré sur 100 000 livres par mode.

## UNLEASH : nombre de scatters (changement v4)
Exigence : à l'achat, le minimum de scatters (4 → 10 free spins) est la règle, plus de scatters est rare.
Part pondérée des achats par nombre de free spins de départ (livres x table de poids, outil `trig.py`) :

| Free spins | 10 (4 scat.) | 12 (5) | 15 (6) | 18 (7) | 20 (8) |
|---|---|---|---|---|---|
| Part des achats | 88,00 % | 10,00 % | 1,78 % | 0,17 % | 0,05 % |

Comment : (1) un critère par palier (`fgfloor4`..`fgfloor7`, quotas de simulation 0,55 / 0,25 / 0,12 / 0,079, plancher 30x) ; (2) chaque livre enregistre une clé de force `bonusTier` (nombre de scatters, 7 pour 7 et plus) et l'optimiseur définit une clôture par palier (`game_optimization.py`, `TIER_SHARE` fixe la part par `hr`, `TIER_RTP` le RTP du palier) ; (3) `check_repeat` ne garde que les livres dont le nombre réel de scatters au déclenchement (après cascades) est celui du palier ; (4) le SDK ne sait forcer qu'un scatter par rouleau (6 max) et bouclait sans fin pour 7-8 : `force_special_board` est surchargé (6 forcés, les autres Dynamite posés sur des cases au hasard).

Compensation : le RTP cible est obtenu avec des veines plus douces (x3 / +3 au lieu de x4 / +6). Moyenne naturelle d'un palier 10 spins (plancher 30x) : 101x (médiane 69x), contre 139x (médiane 89x) avec x4 / +6 ; l'optimiseur n'a donc qu'à raboter environ 8 % au lieu d'environ 30 %. Moyenne visée par palier : 93,6x / 109x / 135x / 138x.

## Répartition des gains — base, VERSION v4 (sans fuse ; voir la section Fuse Line pour v5)
| Gain | Spins | Part du RTP |
|---|---|---|
| 0x | 70,9 % | 0 |
| 0 à 1x | 10,4 % | 5,6 % |
| 1 à 2x | 5,7 % | 7,7 % |
| 2 à 5x | 10,4 % | 33,8 % |
| 5 à 10x | 2,1 % | 11,9 % |
| 10 à 40x | 0,09 % | 2,5 % |
| 40 à 100x | 0,32 % | 22,0 % |
| 100 à 500x | 0,08 % | 11,8 % |
| 500x et plus | 0,001 % | 0,8 % |

## Répartition des gains — UNLEASH, VERSION v4 (sans fuse)
| Gain | Achats | Part du RTP |
|---|---|---|
| 30 à 40x | 31,9 % | 11,2 pts |
| 40 à 60x | 38,1 % | 16,8 pts |
| 60 à 100x | 7,6 % | 6,1 pts |
| 100 à 200x | 10,2 % | 14,2 pts |
| 200 à 500x | 9,8 % | 31,1 pts |
| 500 à 1 000x | 2,4 % | 15,4 pts |
| 1 000x et plus | 0,10 % | 1,2 pts |
(la tranche 20-40 de `buckets.py` ne contient que 30-40x : plancher 30x.)

## Points faibles connus
- UNLEASH : 70 % des achats rendent 30 à 60x pour 100x payés (avant : 82 % à 20-60x, 50 % à 20-40x). La médiane monte de 39,9x à 43,6x, mais l'optimiseur donne toujours une forme bimodale (amas 40-50x et queue 200-1 000x) quel que soit le réglage essayé (moyenne naturelle plus basse x2/+3, échelle de fenêtre 30-45 x0,5, test_spins 10/20/50 ou 50/100/200) ; seul le nombre de scatters est maintenant maîtrisé.
- Jeu de base : 70,9 % de spins à zéro ; un bonus déclenché environ 1 spin sur 200.
- Gain max en base : environ 1 sur 5 millions.
- L'optimiseur n'est pas reproductible : régénérer les maths change légèrement les poids (médiane 43,3 à 44,5x sur les essais). Toujours relancer les tests.
- Fichier books_bonus.jsonl.zst : 262 Mo (100 000 livres).

## Régénérer
```
cd math/games/the_unleashed_mine
python3 tools/make_reels.py            # bandes de rouleaux
../../env/bin/python run.py            # voir PROGRESS.md pour les variables (SIMS_BASE, OPT, batching_size)
../../env/bin/python -m pytest tests -q
```
Mémoire : un lot de 1e5 simulations bonus a été tué par manque de mémoire ; `batching_size` est à 6250.


## Fuse Line (v5)
Règles implémentées (docs/ORIGINAL_FEATURES.md, front : frontend/NOTES_fuse.md). Paramètres dans `game_config.fuse_params` (par type de partie, base et free spins identiques) : N = 8 cases, b0 = 1 case brûlée au reveal, adv = 1 case par pas gagnant, detmin = 3.
- À chaque spin (base et chaque free spin), juste après `reveal`, un chemin auto-évitant de 8 cases est tiré avec le `random` du SDK (reproductible par graine) : départ sur une case au hasard du rouleau 0, puis droite (poids 2), haut (1), bas (1), sans repasser par une case (reprise du tirage si impasse). Il est annoncé par `fusePath`.
- Chaque `tumbleBoard` d'un pas gagnant est suivi d'un `fuseBurn` (burned + 1, plafonné à 8 ; rien n'est émis si le plafond est atteint).
- Quand l'évaluation ne paie plus (et sans plafond de gain atteint) : si burned >= 3, les cases brûlées (indices < burned) qui ne sont ni S ni W deviennent W, `fuseBlast` est émis, le plateau est réévalué et les cascades reprennent s'il paie ; sinon `fuseFizzle`. Le fusible est ensuite consommé. Une mèche sans aucune case convertible (cases brûlées toutes S/W) donne un `fuseFizzle` même avec burned >= 3 (cas très rare).
- Spin sans gain : `fuseFizzle {burned: 1}` (le fusible est toujours refermé). Si le plafond de gain tombe en cours de spin, aucun événement de fin n'est émis (les free spins restants du livre sont révélés sans évaluation, comme avant).
- Dans les free spins les W posés sur des veines profitent de leurs multiplicateurs (somme des cases du groupe), c'est la source de la queue.

### Événements émis (champ par champ, identiques au front)
Convention de lignes : **lignes visibles 0..4** (haut = 0), PAS les lignes avec marge (1..5) qu'utilisent `winInfo`, `tumbleBoard` et `freeSpinTrigger` du SDK (`include_padding`). Le front traite un événement comme paddé seulement si une ligne vaut 5 ou plus, ce qui n'arrive jamais ici.
- `{index, type:"fusePath", cells:[{reel,row} x8], burned:1}` (index 1 : juste après `reveal`, avant `updateGrid` en free spins)
- `{index, type:"fuseBurn", burned:int, newCells:[{reel,row}]}` (après `tumbleBoard`)
- `{index, type:"fuseBlast", cells:[{reel,row,replaced:"H1"...}]}` (jamais S ni W ; avant le `winInfo` de la réévaluation)
- `{index, type:"fuseFizzle", burned:int}`
Aucune divergence avec NOTES_fuse.md.

### Résultats mesurés (publish_files, 100 000 livres par mode, pondérés par la table)
| Mesure | Valeur |
|---|---|
| Blast, spin de base (modes base) | 8,7 % des spins de base (cascades réelles plus longues que le proxy du doc : 2 %) |
| Blast, free spin | 2,2 % des free spins (doc : 4 %) ; fizzle 97,8 % |
| Moyenne naturelle UNLEASH palier 10 spins (diag, 400 spins, plancher 30x) | 100x sans fuse, 153x avec (médiane 70x, 86x) ; l'optimiseur ramène à 96x |
| Moyenne naturelle spin de base (critère basegame) | 0,47x sans, 0,64x avec |
| RTP base / bonus | 96,000 % / 96,000 % |
| Taux de gain base | 29,07 % |
| Gain max | 5 000x les deux modes (1 / 5 000 002 en base, 1 / 50 000 en bonus) |
| UNLEASH médiane | 42,6x |
| Parts des achats 10 / 12 / 15 / 18 / 20 free spins | 88,00 / 10,00 / 1,78 / 0,17 / 0,05 % |

Choix : le fusible agit en base et en free spins. Le doc le donne comme levier de volatilité surtout en free spins ; en base il ajoute surtout des gains 10-60x (cascade longue puis blast), sans changer le taux de gain. Les valeurs fuse_c du doc n'ont pas été modifiées (le test d'ajustement n'était pas nécessaire : l'optimiseur absorbe le surplus de 50 %).

Réglage optimiseur (base uniquement) : les échelles de fenêtre du jeu de base passent de {(1,2) x1,2 ; (10,20) x1,5} à {(1,2) x1,2 ; (2,5) x1,5 ; (10,20) x0,5} ; sinon la première optimisation donnait 2,1 % de spins à 10-20x (29 % du RTP) et seulement 0,6 % à 2-5x.

### Répartition des gains avec fuse (tools/buckets.py)
Base : 0x 70,9 % ; 0-1x 19,9 % (9,2 pts de RTP) ; 1-2x 3,1 % ; 2-5x 1,8 % ; 5-10x 2,4 % (18,0 pts) ; 10-20x 1,1 % (15,4 pts) ; 20-40x 0,37 % (9,5 pts) ; 40-100x 0,29 % (20,6 pts) ; 100-200x 0,11 % (13,6 pts) ; 200x et plus environ 0,001 % (1 pt).
UNLEASH (tranche 20-40 = 30-40x, plancher 30x) : 30-40x 36,4 % (12,8 pts) ; 40-60x 40,1 % (17,6) ; 60-100x 6,0 % (4,8) ; 100-200x 7,7 % (10,5) ; 200-500x 5,9 % (19,1) ; 500-1000x 3,4 % (23,1) ; 1000x et plus 0,61 % (7,9). Environ 76 % des achats rendent 30 à 60x (v4 : 70 %), la forme reste bimodale.

### Tests ajoutés (tests/test_math.py, 13 passent)
Événements fuse bien formés (chemin de 8 cases adjacentes, sans doublon, départ rouleau 0, lignes 0..4, burned monotone et conforme à newCells, blast seulement si burned >= 3 et cases dans les cases brûlées, jamais S ni W, fusible toujours refermé sauf plafond), fenêtre du taux de blast en free spins (1,2 à 6 %), blast suivi d'une réévaluation, gain final = payoutMultiplier.

### Sauvegarde
Les maths v4 (index, CSV et livres) sont dans `library/publish_files_v4_backup`.

### Points faibles (v5)
- Le fizzle apparaît sur plus de 90 % des spins (tout spin sans cascade longue) : à l'écran, le fusible est tiré à chaque spin et s'éteint le plus souvent sans effet.
- Base : la queue 10-40x vient surtout de blasts ; le jeu de base a plus de petits gains (0-1x : 19,9 % contre 10,4 %).
