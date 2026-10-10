# Spécification : deux roues (demande utilisateur, itération 12)

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
