# SWOT — Stellar Vigil

## v7 — fin de l'itération 5 (2026-10-10, 03:12-04:15 UTC)

**Corrigé et mesuré depuis la v6**
- **Marge du prix d'achat mesurée** : avant optimisation un bonus acheté vaut en moyenne **106x** (médiane 80x). Étude du prix : 80x et 90x donnent un profil sain ; 100x échoue deux fois sur deux aux garde-fous (médiane 47x puis 38x). On garde 80x.
- **Bruit de l'optimiseur chiffré** : deux exécutions à 100 000 simulations aux réglages identiques donnent une médiane du mode achat de 71,6x puis 51,2x ; les deux passent les garde-fous. Les documents donnent désormais des plages, pas un chiffre unique.
- **Fiabilité des contrôles** : le prix est une constante unique, lue depuis la configuration par les outils et les tests ; un test détecte une bibliothèque générée avec une autre configuration (cela m'est arrivé pendant les essais de prix). 39 tests passent.

### Forces
- Moteur complet, déterministe, mesuré par composante, validé à 100 000 simulations ; 39 tests verts avec garde-fous de forme et contrôle de cohérence.
- Chaîne d'outils reproductible (génération, mesures, gel et vérification, démo) ; le prix d'achat a été choisi sur des mesures.
- Mécanique originale ; bonus déterministe compatible avec les résultats pré-générés de Stake.
- Roue utile dans les deux modes ; démo jouable avec sons et règles.

### Faiblesses (restantes)
- **Optimiseur non reproductible**, avec une dispersion mesurée (médiane achat 51x à 72x) : atténué par les garde-fous et l'outil de gel, pas supprimé ; archive de ~85 Mo à héberger (question n°9).
- Le bonus naturel est plus riche que son prix (106x contre 80x) : la forme du mode achat dépend donc beaucoup de l'optimiseur, et la zone Quadrature (1 000x) est trop fréquente avant optimisation (à revoir côté profils de nuit si on veut un mode achat moins « écrasé »).
- Mode achat plus calme que le bonus déclenché (question n°10).
- Front-end Svelte/PixiJS non commencé ; art et sons de production absents.
- Table des gains toujours provisoire ; queue extrême non validée ; 71,6 % de spins sans gain en base.

### Opportunités
- Plateforme en croissance (chiffres rapportés par Engine, non vérifiés) ; aucun clone de Huff N' Puff trouvé dessus.
- Thème libre de licences ; déclinaisons possibles.
- Réduire la fréquence naturelle des zones Quadrature permettrait un mode achat plus fidèle au bonus déclenché sans écrasement par l'optimiseur.

### Menaces
- Brevets : persistance des étoiles et roue « jusqu'au plancher » à faire examiner par un conseil.
- CGU Stake : licence large pour 36 mois renouvelables ; clauses de résiliation/indemnisation non lues.
- Maths figées après approbation : une erreur découverte après coup ne se corrige pas (atténué par les tests et le gel).
- Règles Stake incomplètes (RTP min/max, fichiers, juridictions).
- Noms proches : Stellar Jackpots, Moon Princess Stargazing, « Vault ».
- Saturation du marché ; risque de ressemblance avec Huff N' Puff.

---

# SWOT — Stellar Vigil

## v6 — fin de l'itération 4 (2026-10-10, 00:12-00:50 UTC)

**Corrigé et mesuré depuis la v5**
- **Le moteur de simulation est prouvé déterministe** : 3 tests rejouent les mêmes simulations dans des moteurs neufs (bonus, roue et gain max inclus) et obtiennent les mêmes résultats ; l'ordre de simulation est sans effet ; des graines différentes donnent des résultats différents. Seul l'optimiseur reste non reproductible.
- **Les maths retenues peuvent être figées et vérifiées** : outil `freeze_maths.py` (refuse une exécution qui échoue aux garde-fous ; manifeste d'empreintes ; archive ; vérification). Testé : freeze, verify, et détection d'une altération d'un seul fichier. Aucun manifeste n'est commité tant que les maths ne sont pas définitives.
- **Démo reproductible** : `export_demo_books.py` régénère le fichier de la démo à l'identique (même empreinte).
- **README du jeu** : mise en place, génération, tests, outils, réglages. 36 tests passent.

### Forces
- Moteur complet, déterministe, mesuré par composante, validé à 100 000 simulations ; 36 tests verts avec garde-fous de forme.
- Chaîne d'outils reproductible : génération, mesures, gel et vérification, démo.
- Mécanique originale ; bonus déterministe compatible avec les résultats pré-générés de Stake.
- Roue utile dans les deux modes ; démo jouable avec sons et règles.

### Faiblesses (restantes)
- **Optimiseur non reproductible** : atténué (garde-fous + outil de gel) mais pas supprimé ; l'archive de ~85 Mo reste à héberger (question n°9).
- Mode achat nettement plus calme que le bonus déclenché (question n°10).
- Front-end Svelte/PixiJS non commencé ; art et sons de production absents.
- Coût de l'achat de bonus (80x) et table des gains toujours provisoires ; je n'ai pas pu mesurer la valeur naturelle du bonus avant optimisation (table de critères absente de la bibliothèque).
- Queue extrême non validée ; 71,6 % de spins sans gain en base.

### Opportunités
- Plateforme en croissance (chiffres rapportés par Engine, non vérifiés) ; aucun clone de Huff N' Puff trouvé dessus.
- Thème libre de licences ; déclinaisons possibles.
- Le gel vérifiable des maths peut servir de preuve de non-modification après approbation.

### Menaces
- Brevets : persistance des étoiles et roue « jusqu'au plancher » à faire examiner par un conseil.
- CGU Stake : licence large pour 36 mois renouvelables ; clauses de résiliation/indemnisation non lues.
- Maths figées après approbation : une erreur découverte après coup ne se corrige pas (atténué par les tests et le gel).
- Règles Stake incomplètes (RTP min/max, fichiers, juridictions).
- Noms proches : Stellar Jackpots, Moon Princess Stargazing, « Vault ».
- Saturation du marché ; risque de ressemblance avec Huff N' Puff.

---

# SWOT — Stellar Vigil

## v5 — fin de l'itération 3 (2026-10-09/10, réponse « Oui » de l'utilisateur)

**Corrigé et mesuré depuis la v4**
- **Roue de sauvegarde rendue utile** : plancher de 25x sur les bonus déclenchés (1 bonus sur 9 la fait tourner ; avant : 1 spin sur 330 000) ; 63 % des achats. Mesuré à 100 000 simulations, RTP 96,0 % dans les deux modes.
- **Régression évitée** : après ce changement, une exécution de l'optimiseur a rendu le mode achat très volatil (écart-type 210, 85 % des achats sous le prix). Corrigé en resserrant les bornes de volatilité (médiane 71,6x pour 80x, écart-type 65,6).
- **Découverte** : l'optimiseur n'est pas reproductible (mêmes réglages, poids différents). Garde-fous automatiques ajoutés (`test_quality_gates.py`) ; 33 tests passent.
- Démo : libellés de la roue distincts (« Mise sauvée » en achat, « Minimum de bonus atteint » en base), règles à jour.

### Forces
- Moteur complet, mesuré par composante, validé à 100 000 simulations, 33 tests verts, garde-fous de forme.
- Mécanique originale ; bonus déterministe compatible avec les résultats pré-générés de Stake.
- Roue visible dans les deux modes ; démo jouable avec sons et règles.

### Faiblesses (restantes)
- **Maths non reproductibles à l'identique** : il faut archiver les fichiers retenus (question n°9).
- Mode achat nettement plus calme que le bonus déclenché (question n°10).
- Front-end Svelte/PixiJS non commencé ; art et sons de production absents.
- Coût de l'achat de bonus (80x) et table des gains toujours provisoires.
- Queue extrême non validée (gain max environ 1 sur 10 millions en base) ; 71,6 % de spins sans gain.
- Le libellé « wager saver » ne s'applique strictement qu'en achat ; en base c'est un minimum de bonus.

### Opportunités
- Plateforme en croissance (chiffres rapportés par Engine, non vérifiés) ; aucun clone de Huff N' Puff trouvé dessus.
- Thème libre de licences ; déclinaisons possibles.
- La roue est maintenant un argument de rétention dans les deux modes.

### Menaces
- Brevets : persistance des étoiles et roue « jusqu'au plancher » (un award calculé à partir d'un total précédent) à faire examiner par un conseil.
- CGU Stake : licence large pour 36 mois renouvelables ; clauses de résiliation/indemnisation non lues.
- Maths figées après approbation, et non régénérables à l'identique (atténué par l'archivage et les garde-fous).
- Règles Stake incomplètes (RTP min/max, fichiers, juridictions).
- Noms proches : Stellar Jackpots, Moon Princess Stargazing, « Vault ».
- Saturation du marché ; risque de ressemblance avec Huff N' Puff.

---

# SWOT — Stellar Vigil

## v4 — fin de l'itération 2 (2026-10-09, 21:12-21:35 UTC)

**Corrigé et mesuré depuis la v3**
- **RTP réparti par composante, mesuré** sur 100 000 simulations (outil `tools/rtp_breakdown.py`, tableau dans `DESIGN.md` §10).
- **Comptabilité des événements garantie** : un test vérifie sur 200 000 books que ways + étoiles + nuits + top-up de la roue = paiement final (le front-end peut s'y fier). 28 tests au total.
- **Démo** : son synthétisé (aucun fichier audio, bouton couper/activer) et écran de règles honnête (RTP, gain max très rare, roue non garantie). Aucune erreur JavaScript détectée au chargement ; le rendu sonore lui-même n'a pas pu être écouté ici.

### Forces
- Moteur complet, reproductible et mesuré par composante ; tests verts ; RTP 96,0 % dans les deux modes.
- Mécanique originale ; bonus déterministe compatible avec les résultats pré-générés de Stake.
- Démo jouable avec roue, sons et règles.

### Faiblesses (restantes)
- **Découverte** : la roue de sauvegarde ne tourne quasiment jamais sur un bonus déclenché en jeu de base (1 spin sur 330 000), car son plancher (la mise, 1x) est presque toujours dépassé. Elle n'est réellement visible qu'en achat de bonus (67 % des achats). À trancher par l'utilisateur (voir `OPEN_QUESTIONS.md` n°8).
- Mode achat plus volatil que le bonus déclenché à moyenne comparable (zones 21,4 % contre 5,4 %).
- Front-end Svelte/PixiJS non commencé ; art et sons de production absents.
- Coût de l'achat de bonus (80x) et table des gains toujours provisoires.
- Queue extrême non validée ; 71,6 % de spins sans gain en jeu de base.

### Opportunités
- Plateforme en croissance (chiffres rapportés par Engine, non vérifiés) ; aucun clone de Huff N' Puff trouvé dessus.
- Thème libre de licences ; déclinaisons possibles.
- La roue peut devenir un vrai argument de rétention si son plancher est rendu pertinent en jeu de base.

### Menaces
- Brevets : persistance des étoiles et roue « jusqu'au plancher » à faire examiner par un conseil.
- CGU Stake : licence large pour 36 mois renouvelables ; clauses de résiliation/indemnisation non lues.
- Maths figées après approbation (atténué : tests + validation à 100 000 + mesure par composante).
- Règles Stake incomplètes (RTP min/max, fichiers, juridictions).
- Noms proches : Stellar Jackpots, Moon Princess Stargazing, « Vault ».
- Saturation du marché ; risque de ressemblance avec Huff N' Puff.

---

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
