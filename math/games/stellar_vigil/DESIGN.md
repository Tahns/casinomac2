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

## 8. État du calibrage (100 000 simulations par mode, après optimiseur)
| | Mode base | Mode achat « bonus » (coût 80x) |
|---|---|---|
| RTP | 96,0 % | 96,0 % |
| Gain moyen | 0,96x | 76,8x |
| Spins sans gain | 71,6 % | 0,1 % |
| Écart-type | 10,1 | 95,9 |
| Part des résultats sous la mise payée | 97,7 % | 65,4 % |
| Fréquence du gain max (10 000x) | environ 1 sur 10 millions | |

Lecture honnête : le gain max de 10 000x existe mais il est extrêmement rare (environ 1 sur 10 millions en jeu de base) ; il ne faut pas le présenter comme un gain courant.
Limites : 100 000 simulations valident le RTP et les distributions courantes, pas la queue extrême. Le coût du bonus buy (80x) et la table des gains restent provisoires.
Tests automatisés : `math/games/stellar_vigil/tests` (26 tests : logique du ciel, intégrité des books, cohérence de la roue, RTP des tables de poids, absence du mot « jackpot »).

## 9. Roue de sauvegarde (wager saver), ajoutée en v0.3
- Tourne **à la fin du bonus uniquement si le total du bonus est inférieur à ce que le joueur a payé pour y entrer** : la mise (1x) quand le bonus est déclenché, le prix d'achat (80x) quand il est acheté.
- 8 segments, 3 « sauvée » : si la roue s'arrête sur l'un d'eux, le total du bonus est relevé exactement au plancher ; sinon rien n'est ajouté.
- Résultat pré-généré dans le book (événement `saverWheel` : segments, segment, saved, floor, topUp, total) ; aucun choix du joueur.
- Effet réel : quasi absente en jeu de base (un bonus déclenché rapporte rarement moins de 1x), fréquente en achat de bonus (le plus souvent sous 80x).
- À formuler clairement dans les règles du jeu : elle ne garantit pas un remboursement, elle l'offre sur 3 segments sur 8.
