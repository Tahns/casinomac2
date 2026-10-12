# Dossier brevets pour un conseil en PI (aide à la décision, pas un avis juridique)

Origine : recherche web du 2026-10-09 sur patents.google.com. L'outil de lecture renvoie des **résumés** produits par un petit modèle, pas le texte verbatim : tout ce qui suit est une paraphrase de revendications indépendantes, **à vérifier sur le texte officiel** (USPTO Patent Center). Les revendications dépendantes n'ont été vues que partiellement. Les six brevets sont tous Aristocrat (famille Lightning Link / Dragon Link). Ce n'est pas une recherche d'antériorité exhaustive (autres titulaires à vérifier : Light & Wonder, IGT, Everi).

## Ce que fait Stellar Vigil (à comparer)
Base 5x4 en ways. Bonus déclenché par 3 Lunettes (scatters). Ciel 5x5, nombre **fixe** de nuits (10/12/15 selon le nombre de Lunettes), sans compteur remis à zéro. Chaque nuit, 0 à 3 étoiles tombent avec une valeur ; elles **restent sur la grille** (pas de respin avec verrouillage). Des étoiles voisines forment une constellation : chaque étoile gagne jusqu'à +3 niveaux selon la taille de la chaîne, +1 si une étoile relie deux chaînes. Compléter une zone paie un multiplicateur fixe. Roue de sauvegarde en fin de bonus (relève le total jusqu'au plancher). Aucun choix du joueur, aucun progressif, résultats pré-générés.

## Tableau de risque apparent
| Brevet | Titre | Risque apparent | Point le plus proche | Atténuation de conception |
|---|---|---|---|---|
| US11551509 | Hold and spin with build a bonus | faible à moyen | déclenchement par symboles + valeurs ; mais la revendication exige un hold and spin PUIS des jeux gratuits dont le nombre dépend des symboles accumulés | garder 10/12/15 nuits indépendant des symboles collectés |
| US11551508 | Hold and spin with iterative awards | faible à moyen | la conjonction (+1 niveau) et **la roue** (top-up calculé à partir du total) ressemblent à un second award fondé sur le premier | calculer chaque niveau par fonction pure de la taille de chaîne ; ne pas animer un award en deux temps dépendant du premier ; soumettre la roue au conseil |
| US11625982 | Hold and spin with reel expansion | faible | aucune expansion de zone active chez nous | grille 5x5 entièrement active dès le départ |
| US12424064 | Hold and spin with progressive play meters | faible | nombre de nuits fixé au déclenchement, sans compteur alimenté par des symboles du jeu de base | ne pas lier le nombre de nuits à un compteur persistant |
| US11798368 | Multiple triggerable respin features | faible | aucun choix du joueur chez nous | ne jamais ajouter un menu de choix (jeux vs seuil) |
| US12236754 | Hold and spin with mystery symbols | moyen | étoiles à valeur qui restent sur la grille ; résultat fondé sur la valeur de tous les symboles présents | éviter un symbole « mystère » dont la valeur est révélée après coup |

## Enjeu principal pour le conseil
Dans les revendications lues, le point commun est des symboles « configurables » **tenus** en place pendant un feature déclenché par un nombre de symboles. Notre bonus a ce squelette fonctionnel (symboles qui restent, valeurs) sans respin ni verrouillage. Le conseil doit dire si la simple persistance d'étoiles sur une grille échappe à « kept at its corresponding display position ».

## Éléments sans équivalent trouvé dans ces six brevets (recherche non exhaustive)
Bonus de constellation par adjacence avec niveaux de valeur ; multiplicateurs fixes par complétion de zone (à surveiller : un multiplicateur « grille pleine » apparaît dans les dépendantes du brevet 064 et un « Grand » à matrice pleine dans la description du 982).

## Changement itération 18 (deux roues indépendantes, sept bonus)
Le jeu n'a plus la structure « roue avant le bonus + roue d'amélioration conditionnelle » décrite dans `TWO_WHEELS_SPEC.md` (itérations 12 à 17).

**Ce qui s'éloigne :**
- Les deux roues sont indépendantes et tournent ensemble : la roue des Bonus choisit le bonus, la roue des Phases de Lune choisit sa richesse (niveau 1/2/3).
- Il n'y a plus de segment Upgrade : la seconde roue n'est ni déclenchée par la première, ni une amélioration conditionnelle d'un résultat précédent.
- Sept bonus au lieu de trois, aux formes différentes (croix, colonnes, diagonale, spirale).
- Toujours pas de déclenchement direct depuis le jeu de base, de grille agrandie, de jackpot, de cadres ni de casques.

**Ce qui reste proche :**
- Deux roues placées devant un bonus, chacune déterminant une partie de ce qui suit.
- Un bonus qui se joue sur une grille de symboles à valeur après tirage des roues.
- Les risques des six brevets Aristocrat du tableau ci-dessus (étoiles persistantes, roue de sauvegarde) sont inchangés.

**Limites, à lire avant toute conclusion :**
- Cette description ne dit pas que le jeu est libre de brevets ni conforme. Seul un conseil en propriété intellectuelle peut se prononcer, sur le texte officiel des revendications.
- La recherche ne couvre que six brevets Aristocrat. Elle ne couvre pas Light & Wonder (titulaire probable de brevets sur les structures à roues de type Huff N' Puff), ni IGT, Everi ou d'autres titulaires.
- Il n'existe pas de recherche d'antériorité exhaustive. Le conseil devrait recevoir `TWO_WHEELS_SPEC.md` (encadré itération 18) avec ce dossier.
