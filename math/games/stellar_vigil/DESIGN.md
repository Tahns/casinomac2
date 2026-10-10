# Stellar Vigil — conception (nom provisoire)

Slot original pour Stake Engine. Univers : un observatoire isolé, une nuit où le ciel s'ouvre.
Statut : v0.3, moteur de base + bonus + roue de sauvegarde, calibrés et validés sur 100 000 simulations par mode (voir §8). Les noms sont à vérifier (marques) avant publication.

## 1. Décisions
| Sujet | Choix |
|---|---|
| Univers | Observatoire et constellations (aucun lien avec Huff N' Puff) |
| Volatilité | Haute |
| Gain max | 10 000x la mise |
| Paliers de zone | **Multiplicateurs fixes** (multiples de la mise), jamais progressifs ; pas de vocabulaire « jackpot » (jeux Stake stateless) |
| Rémunération Stake | 7,5 % du GGR attendu (garanti, sans dette) |
| RTP cible | 96,0 % dans tous les modes (à ajuster si Stake impose une fourchette) |

## 2. Contraintes Stake Engine à respecter
- Résultats pré-générés : un bonus est une suite d'événements déterministe par « book ». Aucun choix du joueur en cours de bonus.
- Jeu sans état : pas de progressif, de gamble, de reprise ni de cashout anticipé.
- Jeu original, pas de personnage enfantin, Bet Replay obligatoire.
- Les maths sont figées après approbation : tout est à valider par simulation avant la soumission.
- Les CGU cèdent la PI du jeu à l'opérateur et durent 36 mois : à relire avant de signer.

## 3. Jeu de base
- Grille 5 colonnes x 4 rangées, 1 024 ways, gains de gauche à droite.
- Symboles élevés (placeholders, art à créer) : Astrolabe, Lune, Comète, Sablier.
- Symboles bas : A, K, Q, J.
- **Étoile Filante (wild)** : colonnes 2 à 4, remplace tout sauf Lunette.
- **Lunette (scatter)** : 3 ou plus déclenchent la Nuit des Constellations (10 nuits).
- **Étoile à valeur (symbole ST)** : peut tomber sur n'importe quelle bobine ; paie sur place 0,2x à 10x la mise (poids 40/30/18/8/3/1), en plus des gains ways.

## 4. Bonus : la Nuit des Constellations
Grille de ciel 5x5. **10 nuits fixes** (pas de compteur qui se remet à zéro). À chaque nuit, de nouvelles étoiles tombent, chacune avec une valeur.

### Cœur du système : l'adjacence
- Deux étoiles voisines (orthogonal ou diagonale) sont **reliées** et forment une constellation.
- Une constellation de n étoiles applique à chacune de ses étoiles un bonus de chaîne : +1 niveau de valeur par lien, plafonné à +3 (la valeur suit une échelle fixe de 0,2x à 50x, pas un multiplicateur global).
- Une étoile isolée garde sa valeur de base : c'est le risque et la tension de chaque nuit.
- Une nouvelle étoile qui fusionne deux constellations déclenche une « conjonction » : la chaîne fusionnée gagne un niveau supplémentaire.

### Multiplicateurs fixes par zones (jamais progressifs)
Compléter une zone du ciel paie immédiatement un palier. Les zones se cumulent.
| Palier | Zone à remplir | Gain fixe |
|---|---|---|
| Horizon | Une ligne du bas (Horizon) | 20x |
| Meridien | Colonne centrale (Méridien) | 100x |
| Quadrature | Les quatre coins | 1 000x |
| Firmament | Les 25 cases | 10 000x (gain max) |

### Fin de bonus
Les gains s'additionnent au fil des nuits ; la dernière nuit est jouée en intégralité (pas de révélation différée à la façon des maisons). Total plafonné à 10 000x.

### Bonus buy
Mode d'achat « Nuit étoilée » : le coût sera fixé après simulation pour tenir le RTP (ordre de grandeur 70x à 100x).

## 5. Pourquoi ce n'est pas une copie de Huff N' Puff
- Pas de cadres qui montent en paliers puis de révélation finale : ici la valeur se construit par adjacence et se paie en continu.
- Pas de déclencheur « 6 objets ». Le bonus se déclenche par 3 scatters.
- Pas de roue ni de sous-bonus à choix.
- Univers, symboles, sons et noms entièrement différents.
- Maths conçues de zéro, sans reconstitution des poids ou des RTP d'un jeu existant.

## 6. Points de vigilance
- **Brevets** : la chaîne d'adjacence avec échelle de valeurs et le compteur de nuits fixes restent à faire valider par un conseil en PI (liberté d'exploitation), notamment face aux brevets Hold & Spin d'Aristocrat.
- **Marques** : vérifier le titre et les noms de paliers (USPTO, EUIPO, WIPO).
- **Assets** : tout l'art, la musique et les sons doivent être créés ou licenciés par écrit. Garder les preuves.
- **Non trouvé côté Stake** : fourchette de RTP imposée, limites de taille de fichiers, exigences par juridiction. À confirmer auprès du support ou du Discord avant de finaliser les maths.

## 7. Plan de réalisation
1. Math : configuration du jeu (symboles, paytable, bobines), moteur de ways pour le jeu de base.
2. Math : moteur de bonus (grille 5x5, adjacence, zones), génération des événements.
3. Calibrage : distributions, optimiseur Rust, RTP 96 % et volatilité haute, PAR sheet.
4. Front-end : application Svelte/PixiJS à partir de `web-sdk`, animations d'étoiles et de liaisons.
5. Bet Replay, tests de format, préparation de la soumission.

## 8. État du calibrage (100 000 simulations par mode, après optimiseur, v0.5)
| | Mode base | Mode achat « bonus » (coût 80x) |
|---|---|---|
| RTP | 96,0 % | 96,0 % |
| Gain moyen | 0,96x | 76,8x |
| Médiane | 0x | 51x à 72x selon l'exécution de l'optimiseur |
| Spins sans gain | 71,6 % | 0,1 % |
| Écart-type | 8,9 | 66 à 77 selon l'exécution |
| Part des résultats sous la mise payée | 97,8 % | 57 à 61 % selon l'exécution |
| Fréquence du gain max (10 000x) | environ 1 sur 10 millions | environ 1 sur 125 000 achats |

Les colonnes « selon l'exécution » viennent de deux exécutions à 100 000 simulations aux réglages identiques : l'optimiseur n'est pas reproductible (§10). Les deux passent les garde-fous.
Lecture honnête : le gain max de 10 000x existe mais il est extrêmement rare en jeu normal ; il ne faut pas le présenter comme un gain courant.
Limites : 100 000 simulations valident le RTP et les distributions courantes, pas la queue extrême. La table des gains reste provisoire.
Tests automatisés : `math/games/stellar_vigil/tests` (39 tests : logique du ciel, intégrité des books, comptabilité, roue, RTP, garde-fous de forme, déterminisme, cohérence bibliothèque/configuration, absence du mot « jackpot »).

## 9. Roue de sauvegarde (wager saver), v0.4
- Tourne à la fin du bonus **si le total est inférieur à un plancher** : 25x la mise pour un bonus **déclenché** en jeu normal (« minimum de bonus ») ; 80x, soit le prix payé, pour un bonus **acheté** (« mise sauvée »). Valeurs dans `game_config.py` (`saver_floor`).
- 8 segments, 3 « sauvée » : si la roue s'arrête sur l'un d'eux, le total du bonus est relevé exactement au plancher ; sinon rien n'est ajouté. Ce n'est pas un remboursement garanti.
- Résultat pré-généré dans le book (événement `saverWheel`) ; aucun choix du joueur.
- Mesuré à 100 000 simulations (deux exécutions) : environ 1 bonus déclenché sur 7 à 9 fait tourner la roue (1 spin sur 1 039 à 1 309) ; 63 à 64 % des achats. Coût en RTP : 0,1 % en base, 1,5 à 3,2 % en achat.
- Historique : en v0.3 le plancher était la mise (1x) pour les bonus déclenchés ; la roue n'y tournait que 1 fois sur 330 000 spins (décision utilisateur : la rendre utile).

## 10. Volatilité du mode achat et reproductibilité de l'optimiseur
- L'optimiseur Rust n'est **pas reproductible** : deux lancements aux réglages identiques donnent des poids différents (empreintes des tables différentes). Une exécution a même donné un mode achat très volatil (écart-type 210, 85 % des achats sous le prix) alors que rien n'avait changé côté achat.
- Réglage retenu : bornes `min_m2m=1.5`, `max_m2m=3` pour le mode achat (au lieu de 4 à 8). Résultat à 100 000 simulations, deux exécutions aux réglages identiques : médiane 71,6x puis 51,2x pour 80x payés ; écart-type 65,6 puis 77,5 ; 57 % puis 61 % des achats sous le prix.
- Garde-fous : `tests/test_quality_gates.py` rejette une exécution dont le mode achat a une médiane sous la moitié du prix, un rapport moyenne/médiane au-dessus de 2, plus de 75 % d'achats sous le prix, ou un taux de gain en base hors de 22-40 %.
- **Avant soumission** : choisir une exécution qui passe les garde-fous, puis **archiver ses fichiers de publication** (ils ne se régénèrent pas à l'identique).
- Conséquence de conception : le mode achat est plus calme que le bonus déclenché en jeu normal (où 18 % du RTP vient de gains de 100x à 1 000x et 2 % de gains au-dessus de 1 000x). Ce n'est pas interdit, mais l'écart est à assumer côté communication.

### Étude du prix d'achat (mesuré, 10 000 simulations par essai)
Avant optimisation, un bonus acheté vaut en moyenne **106x** (médiane 80x, 1,1 % de résultats au-dessus de 1 000x à cause de la zone Quadrature) : le prix de 80x oblige l'optimiseur à réduire fortement la queue.
| Prix | Médiane | Moyenne/médiane | Garde-fous |
|---|---|---|---|
| 80x | 51x à 72x (3 exécutions) | 1,07 à 1,5 | passent |
| 90x | 77,5x (1 exécution) | 1,11 | passent |
| 100x | 47x puis 38x (2 exécutions) | 2,0 puis 2,5 | **échouent deux fois sur deux** |
Conclusion : un prix de 100x ou plus rapproche le prix de la valeur naturelle ; l'optimiseur garde alors la queue de gros gains et la médiane s'effondre sous la moitié du prix. On garde 80x (la valeur de 90x a l'air équivalente mais n'a été vue qu'une fois).


## 11. Répartition du RTP par composante (100 000 simulations, `tools/rtp_breakdown.py`, exécution courante)
| Composante | Mode base (part de la mise) | Mode achat (part du prix d'achat) |
|---|---|---|
| Gains ways | 43,0 % | 2,0 % |
| Étoiles à valeur (jeu de base) | 4,0 % | 0,1 % |
| Nuits du bonus (étoiles et constellations) | 44,1 % | 75,9 % |
| Multiplicateurs de zone | 4,9 % | 16,6 % |
| Roue de sauvegarde | 0,1 % | 1,5 % |
| **Total** | **96,0 %** | **96,0 %** |

Autres mesures : bonus déclenché 1 spin sur 150 ; spins gagnants 28,4 % (1 sur 3,5) ; roue tournée 1 spin sur 1 039 en base (environ 1 bonus sur 7) et 64 % des achats. La part de zones et de roue varie d'une exécution à l'autre.
`tools/payout_distribution.py` donne les percentiles et la part de RTP par tranche de gain.
