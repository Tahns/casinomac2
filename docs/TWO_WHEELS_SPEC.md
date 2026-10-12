> **MISE À JOUR (itération 18, demande de l'utilisateur : « un truc qui ne gêne pas les brevets »).** Les deux roues sont remplacées par **un seul tirage de cartes du ciel** : une bande de cartes défile et s'arrête sur l'un des **sept bonus** (Constellations, Comètes, Nova, Croix de Lune, Pluie d'Étoiles, Éclipse, Galaxie). **La version « + » ne vient plus d'une seconde roue : elle dépend du nombre de Lunettes** (3 ou 4 = normal, 5 = « + »). Plus de segment « Upgrade », plus de roue d'amélioration, plus de déclenchement direct. Chaque résultat reste un critère de l'optimiseur (chances exactes). Ce n'est pas un avis juridique : à faire valider par un conseil en brevets. Les maths sont modifiées (`game_config.py`) ; la bibliothèque et `demo/books_wheels.js` sont à régénérer (`run.py`, puis `tools/export_demo_books.py`).

# Spécification : deux roues (demande utilisateur, itération 12)

> **MISE À JOUR (itération 17, d'après la capture de Huff N' Puff fournie par l'utilisateur : deux roues empilées au-dessus de la grille, chacune menant à des bonus différents et à leurs versions Super).** Les roues ne choisissent plus des « variantes » du même bonus mais **trois bonus différents**, chacun avec sa version Supérieure :
> - **Nuit des Constellations** (bonus d'origine) / Constellations+ ;
> - **Pluie de Comètes** : chaque nuit une comète traverse une ligne ou une colonne et pose une étoile sur chaque case libre / Comètes+ ;
> - **Grande Nova** : chaque nuit un bloc 2x2 d'étoiles se pose d'un coup / Nova+.
> Roue des Saisons : Constellations 35 %, Comètes 25 %, Nova 25 %, Aurore 15 %. Roue de l'Aurore : versions « + » 40 / 30 / 30 %. Pas de jackpots, pas de noms ni de visuels de la franchise. **Non fait** : déclenchement par un symbole spécial (par exemple une Lunette dorée qui ouvre directement la Roue de l'Aurore) ; il demande un nouveau symbole dans la grille de base et des critères de génération dédiés.

> **CORRECTION (analyse de Huff N' Puff, sources : FanDuel, casinos.com, gambling.com, Indian Gaming).** Dans H&P la roue 1 (3+ scies) mène à un bonus (Buzz Saw / Mansions / Mega Hat), à un prix fixe ou à un segment *Upgrade*. La roue 2 (« Super/Ultra Wheel », déclenchée par scies + scie dorée ou par le segment Upgrade) ne contient que les versions *Super* des bonus et les gros prix. L'upgrade améliore donc **le type de bonus**, pas le total final. La section « Roue 2 » ci-dessous (multiplicateur sur gros total) était une mauvaise lecture : à remplacer par « roue d'Aurore = versions Supérieures des variantes de ciel » (ex. Ciel Dense+ : plus d'étoiles par nuit, niveaux riches). Les sources divergent sur les détails exacts de déclenchement.

Demande : « une roue au dessus des bonus et une autre roue avec upgrade des gros bonus » (structure à deux roues, comme dans Huff N' Puff). Version originale pour Stellar Vigil. Rien n'est implémenté dans le jeu par défaut : tout se fait derrière un réglage (`TWO_WHEELS = False` par défaut).

## Roue 1 : « Roue des Saisons » (avant le bonus)
- Tourne quand 3/4/5 Lunettes déclenchent le bonus (et à l'achat).
- Elle choisit la **variante du ciel** du bonus, via des réglages qui existent déjà (profils de `game_config.py`) :
  - Ciel Classique (profil A actuel)
  - Ciel Long (plus de nuits, étoiles plus faibles)
  - Ciel Dense (moins de nuits, étoiles plus fortes)
  - Ciel Brillant (niveaux riches, plus volatil)
- Pas de gain direct. Pas de noms ni de symboles de la franchise de référence.

## Roue 2 : « Roue de l'Aurore » (après le bonus, seulement pour les gros bonus)
- Ne tourne que si le total du bonus dépasse un seuil (mesuré : ~100–150x, soit environ 6 à 19 % des bonus déclenchés selon le seuil).
- Segments : multiplicateur fixe du total (x1,5 / x2 / x3 / x5), jamais progressif, plafonné par le gain max 10 000x.

## Probabilités honnêtes (règle non négociable)
Le tirage ne doit pas être décidé avant la pondération de l'optimiseur (sinon les chances affichées sont fausses, voir DESIGN.md §9). Deux méthodes :
1. **Critères** : un critère d'optimiseur par variante / par segment, avec `hr` et quota propres. Chances exactes par construction.
2. **Chances mesurées** : publier les chances réelles de la bibliothèque finale (mécanisme `tools/saver_odds.py`) et tirer la roue à l'écran dessus.
Méthode 1 recommandée pour la roue 1 (elle change la nature du bonus) ; méthode 2 acceptable pour la roue 2.

## Coût et risques
- RTP : l'upgrade ajoute du RTP sur les gros bonus ; il faut le retirer ailleurs (le recalibrage passe par l'optimiseur, qui n'est pas reproductible : portes qualité + `tools/reoptimize.py`).
- Volatilité : plus haute (queue épaisse).
- **Risque PI : la structure « roue avant le bonus + roue d'amélioration après » est la signature de Huff N' Puff.** Noms et visuels originaux ne suffisent pas à écarter le risque ; à faire valider par un conseil en brevets (ajouté à PATENT_BRIEF). Ce n'est pas un avis juridique.
- Stake : jeu sans état, pas de « jackpot », gains multiples de 0,1x.

## Plan
1. Copie d'expérience du jeu (autre `game_id`), roue 2 d'abord (plus simple, méthode 2).
2. Mesurer RTP / distribution / garde-fous, puis roue 1 par critères.
3. Adoption dans le jeu principal seulement si les portes qualité passent et sur accord de l'utilisateur.
