# SWOT — Stellar Vigil

## v3 — fin de l'itération 1 (2026-10-09)

**Corrigé et mesuré depuis la v2**
- Maths validées à **100 000 simulations par mode** : RTP 96,0 % dans les deux modes (tables de poids), zéro erreur de format.
- **26 tests automatisés passent** (logique du ciel, intégrité des books, roue, RTP, vocabulaire).
- **Variété ajoutée** : étoiles à valeur en jeu de base et roue de sauvegarde (wager saver) en fin de bonus, visible dans la démo.
- **Vocabulaire conforme à la règle Stake** : paliers renommés (Horizon, Meridien, Quadrature, Firmament), plus aucun « jackpot » dans le code ni les événements (vérifié par test).
- Dossier brevets et vérification des noms réalisés (voir `PATENT_BRIEF`-type résumé dans `OPEN_QUESTIONS.md`).

### Forces
- Moteur complet et reproductible (base + bonus + roue), tests verts, RTP identique entre modes.
- Mécanique originale, bonus déterministe compatible avec les résultats pré-générés de Stake.
- Démo jouable qui rejoue de vrais résultats, avec la roue animée.

### Faiblesses (restantes)
- Front-end Svelte/PixiJS non commencé ; art et sons absents (symboles SVG provisoires, pas d'audio).
- Paramètres encore provisoires : coût de l'achat de bonus (80x), table des gains, bobines ; la répartition du RTP entre base, étoiles, bonus, roue et paliers n'est pas encore mesurée.
- Queue extrême non validée : le gain max 10 000x survient environ 1 fois sur 10 millions.
- 71,6 % de spins sans gain en jeu de base : à surveiller côté rétention.
- Pas d'écran de règles (texte à rédiger, y compris pour la roue).

### Opportunités
- Plateforme en croissance (chiffres rapportés par Engine, non vérifiés) ; aucun clone de Huff N' Puff trouvé dessus.
- Thème libre de licences ; déclinaisons possibles (suites, autres modes d'achat).
- La roue de sauvegarde donne un argument de différenciation en mode achat.

### Menaces
- Brevets : le conseil doit juger si des étoiles persistantes sur grille échappent aux symboles « tenus » (Aristocrat). **Nouveau** : la roue relève le total « jusqu'au plancher », un award calculé à partir d'un total précédent ; à soumettre au conseil à côté du brevet « iterative awards ».
- CGU Stake : *licence* large de la PI du jeu pour 36 mois renouvelables ; clauses de résiliation/indemnisation non lues.
- Maths figées après approbation (atténué par les tests et la validation à 100 000).
- Règles Stake incomplètes (RTP min/max, fichiers, juridictions) ; fourchette communautaire 90-98 %, non officielle.
- Noms proches : Stellar Jackpots, Moon Princess Stargazing (mécanique voisine), « Vault ».
- Saturation du marché ; risque de ressemblance si l'on se rapproche de Huff N' Puff (la roue a été conçue comme un wager saver, pas comme une roue de jackpots).

---

## v2 — début de boucle (2026-10-09)

## Forces
- Moteur de maths fonctionnel de bout en bout (base + bonus + optimiseur), RTP 96,0 % mesuré sur 10 000 simulations par mode.
- Mécanique originale (adjacence + zones) ; paliers fixes, rien de progressif ; bonus déterministe compatible avec les résultats pré-générés.
- Étoiles à valeur ajoutées au jeu de base ; démo jouable qui rejoue de vrais résultats.
- Dossier brevets : risque apparent faible à moyen sur les 6 brevets Aristocrat lus ; le point sensible est la persistance des étoiles (voir `PATENT_BRIEF.md`).

## Faiblesses
- Maths validées sur 10 000 simulations seulement (queue et fréquence du bonus non fiables).
- Paramètres provisoires : coût de l'achat de bonus (80x), table des gains, bobines.
- Pas de roue / peu de variété (roue de sauvegarde en cours).
- Front-end Svelte/PixiJS non commencé ; art et sons absents (symboles SVG provisoires).
- Pas de tests automatisés.

## Opportunités
- Plateforme en croissance (chiffres rapportés par Engine, non vérifiés) ; aucun clone de Huff N' Puff trouvé dessus.
- Thème libre de licences ; déclinaisons possibles (suites, modes d'achat).

## Menaces
- Brevets : analyse par un conseil nécessaire (aucune garantie de liberté d'exploitation).
- CGU Stake : licence large de la PI du jeu pour 36 mois renouvelables ; clauses de résiliation/indemnisation non lues.
- Maths figées après approbation.
- Règles Stake incomplètes (RTP min/max, fichiers, juridictions) ; **les jeux doivent être stateless, sans « jackpots »** : vocabulaire à corriger (en cours : multiplicateurs fixes).
- Noms proches : « Stellar Jackpots », Moon Princess Stargazing (mécanique voisine), « Vault » encombré.
- Saturation du marché ; risque de ressemblance si on se rapproche de Huff N' Puff.
