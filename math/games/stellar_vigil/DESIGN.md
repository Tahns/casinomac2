# Stellar Vigil — conception (nom provisoire)

Slot original pour Stake Engine. Univers : un observatoire isolé, une nuit où le ciel s'ouvre.
Statut : conception v0.1, aucun code de jeu encore. Les noms sont à vérifier (marques) avant publication.

## 1. Décisions
| Sujet | Choix |
|---|---|
| Univers | Observatoire et constellations (aucun lien avec Huff N' Puff) |
| Volatilité | Haute |
| Gain max | 10 000x la mise |
| Jackpots | **Paliers fixes** (multiples de la mise), jamais progressifs |
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
- **Étoiles à valeur** : en jeu de base, une étoile peut tomber seule avec une valeur (1x à 25x la mise), payée sur place. Elle sert d'amorce visuelle et d'anticipation du bonus.

## 4. Bonus : la Nuit des Constellations
Grille de ciel 5x5. **10 nuits fixes** (pas de compteur qui se remet à zéro). À chaque nuit, de nouvelles étoiles tombent, chacune avec une valeur.

### Cœur du système : l'adjacence
- Deux étoiles voisines (orthogonal ou diagonale) sont **reliées** et forment une constellation.
- Une constellation de n étoiles applique à chacune de ses étoiles un bonus de chaîne : +1 niveau de valeur par lien (la valeur suit une échelle fixe, pas un multiplicateur global).
- Une étoile isolée garde sa valeur de base : c'est le risque et la tension de chaque nuit.
- Une nouvelle étoile qui fusionne deux constellations déclenche une « conjonction » : la chaîne fusionnée gagne un niveau supplémentaire.

### Jackpots à paliers fixes, par zones
Compléter une zone du ciel paie immédiatement un palier. Les zones se cumulent.
| Palier | Zone à remplir | Gain fixe |
|---|---|---|
| Lueur | Une ligne du bas (Horizon) | 20x |
| Aurore | Colonne centrale (Méridien) | 100x |
| Zénith | Les quatre coins | 1 000x |
| Voûte | Les 25 cases | 10 000x (gain max) |

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
