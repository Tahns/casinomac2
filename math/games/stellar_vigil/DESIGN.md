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
- **Lunette (scatter)** : 3, 4 ou 5 déclenchent la Nuit des Constellations, de 10, 12 ou 15 nuits.
- **Étoile à valeur (symbole ST)** : peut tomber sur n'importe quelle bobine ; paie sur place 0,2x à 10x la mise (poids 40/30/18/8/3/1), en plus des gains ways.

## 4. Bonus : la Nuit des Constellations
Grille de ciel 5x5. **Nombre de nuits fixe** : 10, 12 ou 15 selon les Lunettes (pas de compteur qui se remet à zéro). À chaque nuit, de nouvelles étoiles tombent, chacune avec une valeur.

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

## 8. État du calibrage (100 000 simulations par mode, après optimiseur, v0.8, profil A)
| | Mode base | Mode achat « bonus » (coût 80x) |
|---|---|---|
| RTP | 96,0 % | 96,0 % |
| Gain moyen | 0,96x | 76,8x |
| Médiane | 0x | 44x à 64x sur les exécutions acceptées |
| Spins sans gain | 71,6 % | 0,1 % |
| Spins hors bonus qui paient au moins la mise | 6,1 % (1 sur 17) | sans objet |
| Écart-type | 9,0 | 65 à 85 selon l'exécution |
| Part des résultats sous la mise payée | 93,3 % | 62 à 70 % selon l'exécution |
| Fréquence du gain max (10 000x) | environ 1 sur 10 millions | environ 1 sur 125 000 achats |

Les colonnes « selon l'exécution » viennent de plusieurs exécutions à 100 000 simulations aux réglages identiques : l'optimiseur n'est pas reproductible (§10). `tools/reoptimize.py` redessine jusqu'à une exécution qui passe les garde-fous.
Lecture honnête : le gain max de 10 000x existe mais il est extrêmement rare en jeu normal ; il ne faut pas le présenter comme un gain courant.
Limites : 100 000 simulations valident le RTP et les distributions courantes, pas la queue extrême.
Tests automatisés : `math/games/stellar_vigil/tests` (41 tests : logique du ciel, intégrité des books, comptabilité, roue, RTP, garde-fous de forme du bonus et du jeu de base, déterminisme, cohérence bibliothèque/configuration/profil, absence du mot « jackpot »).

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




### Étude des profils de bonus (mesuré)
Avant optimisation, la valeur naturelle du bonus acheté se décompose ainsi (`rtp_breakdown.py --natural`) : nuits 51,5x, zones environ 38x (dont presque tout vient de Quadrature, 1 000x, présente dans environ 3,6 % des bonus), roue 12x, ways 1,4x. La zone Quadrature pèse donc plus d'un tiers de la valeur naturelle, et l'optimiseur doit la réduire fortement.
| | Profil A (par défaut) | Profil B (variante) |
|---|---|---|
| Étoiles par nuit (0/1/2/3) | 30/40/22/8 % | 42/38/15/5 % |
| Regroupement des étoiles | 1,5 | 3,0 |
| Valeur naturelle du bonus acheté | 106x (116x avec les livres de gain max) | environ 86x (98x avec les livres de gain max) |
| Zone Quadrature naturelle | 2 à 4 % | environ 0,4 % |
| Médiane du mode achat après optimisation | 37x à 72x (4 exécutions à 100 000) | 51x à 67x (3 exécutions à 10 000) |
| Part du RTP en base venant des zones | 4 à 5 % | 0,6 % |
| Gains de 1 000x et plus en base (part du RTP) | environ 2 % | environ 0,2 % |
Conclusion : B rapproche la valeur naturelle du prix, mais **ne réduit pas la dispersion de l'optimiseur** et fait presque disparaître les gains de 1 000x et plus, donc l'identité « volatilité haute ». A reste le défaut. Choix de produit : voir `OPEN_QUESTIONS.md` n°12. On bascule avec `ACTIVE_PROFILE` dans `game_config.py` (un tampon `library/profile.json` permet de détecter une bibliothèque générée avec l'autre profil).

### Outil d'acceptation
`tools/reoptimize.py` relance seulement l'optimiseur (environ 110 s à 100 000 simulations, contre 10 minutes pour tout régénérer) jusqu'à ce que les garde-fous passent. Essai réel : première exécution rejetée (3 garde-fous en échec), deuxième acceptée.

### Profils C et D, et dispersion de l'optimiseur (mesuré, 2026-10-10)
Mélange des durées : les bonus à 4 et 5 Lunettes durent 12 et 15 nuits ; ils gonflent la valeur naturelle et la zone Quadrature (3,1 % des bonus en simulation contre 2,05 % si tous duraient 10 nuits).
| Profil | Description | Valeur naturelle (ciel + zones) | Quadrature | Part du RTP en base au-delà de 1 000x |
|---|---|---|---|---|
| A (défaut) | ciel dense, 10/12/15 nuits | 93x | 3,1 % | environ 2,1 % |
| B | ciel clairsemé, étoiles riches | 76x | 0,7 % | environ 0,2 % |
| C | intermédiaire | 84x | 1,5 % | 0,35 % |
| D | A avec 10/11/12 nuits | 77x | 2,4 % | 1,7 % |
Le profil D garde la queue de A, mais **n'améliore pas la robustesse de l'optimiseur** à 100 000 simulations et affaiblit les bonus à 4 et 5 Lunettes : non adopté (sélectionnable).

Dispersion de l'optimiseur, mesurée avec `reoptimize.py --no-stop --log` (100 000 simulations) :
| Configuration | Tentatives | Acceptables | Mode catastrophique (médiane 22x à 26x, écart-type 210) | Quasi-échecs (médiane 36x à 39x) |
|---|---|---|---|---|
| Profil A, sans freinage | 9 | 6 | 3 | 0 |
| Profil D, sans freinage | 8 | 4 | 2 | 2 |
| Profil D, avec freinage | 8 | 7 | 0 | 1 |
| Profil A, avec freinage | 6 | 4 | 0 | 2 |
L'optimiseur est **bimodal** : une bonne exécution (médiane 46x à 74x) ou une exécution catastrophique (87 % des achats sous le prix). Aucun cas intermédiaire n'est observé entre les deux, sauf les quasi-échecs à 36x-39x.

### Réglage retenu : freinage de la plage 900x-1 500x
Dans `game_optimization.py`, mode achat : mise à l'échelle de 0,25 sur la plage de gains 900x-1 500x (livres de la zone Quadrature) dans les distributions candidates de l'optimiseur. Effet mesuré : plus aucune exécution catastrophique sur 14 tentatives (A et D), contre 5 sur 17 sans freinage. Coût : environ la moitié de la queue du mode achat (gains de 500x à 2 000x : environ 0,08 % des achats contre 0,17 %) ; le jeu de base garde sa queue (2,9 % du RTP au-delà de 1 000x). Échantillons petits (6 à 8 tentatives par ligne) : à reconfirmer si les profils ou la table des gains changent.


## 11. Répartition du RTP par composante (100 000 simulations, `tools/rtp_breakdown.py`, exécution acceptée courante)
| Composante | Mode base (part de la mise) | Mode achat (part du prix d'achat) |
|---|---|---|
| Gains ways | 39,5 % | 0,8 % |
| Étoiles à valeur (jeu de base) | 6,9 % | 0,1 % |
| Nuits du bonus (étoiles et constellations) | 44,4 % | 81,5 % |
| Multiplicateurs de zone | 5,2 % | 12,0 % |
| Roue de sauvegarde | 0,1 % | 1,6 % |
| **Total** | **96,0 %** | **96,0 %** |

Autres mesures : bonus déclenché 1 spin sur 150 ; spins gagnants 28,4 % (1 sur 3,5) ; roue tournée 1 spin sur 1 302 en base et 65 % des achats. La part de zones et de roue varie d'une exécution à l'autre. `rtp_breakdown.py --natural` donne la répartition avant optimisation.
`tools/payout_distribution.py` donne les percentiles et la part de RTP par tranche de gain ; `tools/base_win_shape.py` la forme des gains du jeu de base.

## 12. Table des gains et forme du jeu de base (v0.8)
Constat (mesuré) : avec la première table, le jeu de base naturel gagnait 78 % du temps avec 3,56x par gain (RTP de base naturel de l'ordre de 280 % pour une cible de 45 %). L'optimiseur devait tout écraser et produisait une distribution **en haltères** : 26,4 % de micro-gains sous la mise, presque rien de 1x à 5x (0,16 % des spins), et seulement 1 spin hors bonus sur 64 qui payait au moins la mise.
Corrections :
- **Table des gains réduite d'environ un tiers**, arrondie aux multiples de 0,1x (le format Stake rejette tout autre paiement : « Payout values must be in increments of 10 »). Gain naturel moyen par gain : 1,49x (cible 1,64x).
- **Mise à l'échelle des gains de 1x à 5x** : facteur 8 dans les candidats de l'optimiseur et biais de distribution sur 1x-5x (poids 0,7). L'exemple du SDK poussait au contraire les gains de 10x à 20x, ce qui alimente les haltères.
- **Garde-fou** : au moins 6 % des spins hors bonus doivent payer la mise (test `test_base_game_pays_mid_sized_wins`) ; l'optimiseur le respecte environ une fois sur deux.
Résultat à 100 000 simulations : 6,06 % des spins hors bonus paient au moins la mise (1 sur 17, contre 1 sur 64) ; 3,2 % paient de 2x à 5x ; 93 % des spins rapportent moins que la mise (98 % avant).
Une table encore plus basse (×0,3) donnait 8,9 % mais viole la règle des 0,1x : la limite de granularité du format est un plafond à cette approche.
Hit rate : relever la fréquence de gain (1 spin sur 3,0 ou 2,7) augmente surtout les gains sous la mise (pertes déguisées en gains) ; non adopté.

## 13. Ce que vit le joueur : sessions simulées (`tools/session_sim.py`)
Sessions simulées à partir des tables publiées, comme le fait le RGS (20 000 sessions par ligne, bibliothèque à 100 000 simulations, profil A, répartition du RTP « default »).
**Jeu de base** (mise fixe, résultat en mises, budget de départ 100 mises) :
| Spins | Sessions gagnantes | Médiane | 10 % pires | 10 % meilleures | Budget épuisé | Voit le bonus |
|---|---|---|---|---|---|---|
| 20 | 22,5 % | -13,1 | -18,4 | +31,6 | 0 % | 12,5 % |
| 50 | 29,1 % | -22,0 | -41,2 | +65,8 | 0 % | 28,4 % |
| 200 | 38,5 % | -30,8 | -121,0 | +127,1 | 26,8 % | 73,8 % |
| 1 000 | 37,5 % | -75,7 | -330,8 | +260,9 | 73,3 % | 99,9 % |
**Achat de bonus** (résultat en prix d'achat, budget de départ 10 achats) : 1 achat : 37,9 % gagnant, médiane -0,2 ; 20 achats : 36,4 %, médiane -1,1 ; 100 achats : 28,0 %, médiane -4,4, budget épuisé dans 30,4 % des cas.
Lecture honnête : le RTP de 96 % est une moyenne dominée par des événements rares. Une session typique de 20 spins perd environ les deux tiers de la mise ; la moitié du RTP vient du bonus, qu'une session courte ne voit que 1 fois sur 8. C'est le profil d'une slot à bonus rare et haute volatilité, à communiquer comme tel.

### Levier de produit : répartition du RTP entre jeu de base et bonus
`ACTIVE_RTP_SPLIT` dans `game_config.py` (un tampon dans `library/profile.json` en garde la trace).
| | default (45,9 % base / 50,0 % bonus) | base_heavy (54,9 % / 41,0 %) |
|---|---|---|
| Spins hors bonus qui paient la mise | 1 sur 17 | 1 sur 9 |
| Session de 20 spins : gagnante / médiane | 22,5 % / -13,1 | 24,0 % / -9,4 |
| Session de 200 spins : budget de 100 mises épuisé | 26,8 % | 13,0 % |
| Session de 1 000 spins : budget épuisé | 73,3 % | 66,3 % |
| Gain moyen d'un bonus déclenché | environ 75x | environ 61x |
`base_heavy` a été mesuré sur une seule exécution à 10 000 simulations (indicatif : un seul tirage de l'optimiseur, 6 000 sessions) ; à reconfirmer à 100 000 avant adoption. Il adoucit l'expérience sans supprimer la volatilité (le bonus garde 38 % du RTP) mais réduit le gain moyen du bonus et donc le spectacle des gros gains. Choix de produit : voir `OPEN_QUESTIONS.md` n°13 et n°14.
