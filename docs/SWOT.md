# SWOT — Stellar Vigil

## v17 — fin de l'itération 15 (2026-10-11, 09:11-09:35 UTC)

**Corrigé et mesuré depuis la v16**
- **La variante de ciel se voit dans la démo** : le fond du ciel prend une teinte selon le résultat des roues (Classique bleu, Long turquoise, Dense violet ; la version « + » est plus lumineuse). Vérifié par capture à 390 px (ciel turquoise après un Long+, 0 erreur console). Démo republiée au même lien. Livres inchangés : les 2 tests démo/bibliothèque passent toujours.

### Faiblesses (restantes)
- Adoption des roues dans le jeu principal non décidée ; roue de sauvegarde peu utile (n°15) ; jeu de base rude (n°14) ; optimiseur non reproductible (n°9) ; art IA non vérifié juridiquement ; sons absents ; front-end non commencé.

### Menaces
- **Brevets / ressemblance Huff N' Puff (deux roues)** : conseil requis (n°16). CGU Stake, règles non publiées, maths figées à l'approbation, marché saturé.

---

## v16 — fin de l'itération 14 (2026-10-11, 06:12-06:40 UTC)

**Corrigé et mesuré depuis la v15**
- **Test de cohérence démo/bibliothèque pour les deux roues** (`test_demo_wheels.py`, 2 tests) : les chances embarquées dans la démo égalent celles mesurées sur la bibliothèque ; chaque variante est présente dans les livres de la démo ; le nombre de nuits annoncé par la roue correspond aux nuits jouées. **Falsification vérifiée** : changer la chance « Classique » fait échouer le test ; fichier restauré. Copie d'expérience : 40 tests.
- **Bannière de déclenchement corrigée** : elle n'annonce plus un nombre de nuits périmé quand une roue décale la variante. Démo republiée au même lien.

### Faiblesses (restantes)
- La démo ne montre pas visuellement la variante de ciel ; adoption des roues dans le jeu principal non décidée ; roue de sauvegarde peu utile (n°15) ; jeu de base rude (n°14) ; optimiseur non reproductible (n°9) ; art IA non vérifié juridiquement ; sons absents ; front-end non commencé.

### Menaces
- **Brevets / ressemblance Huff N' Puff (structure à deux roues)** : conseil requis (n°16). CGU Stake, règles non publiées, maths figées à l'approbation, marché saturé.

---

## v15 — fin de l'itération 13 (2026-10-11, 03:11-03:50 UTC)

**Corrigé et mesuré depuis la v14**
- **Les deux roues sont jouables dans la démo** (build séparé `stellar_vigil_demo_wheels.html`, livres de l'expérience) : Roue des Saisons puis, si Aurore, Roue de l'Aurore. Les parts des segments sont les chances réelles mesurées sur la bibliothèque (40/20/20/20 % ; 40/30/30 %), affichées à l'écran. Vérifié par captures à 390 px de large (les deux roues se dessinent, 0 erreur console). Publié en lien privé pour test sur téléphone ; le lien de la démo d'origine est inchangé.
- Export de livres dédié (`tools/export_demo_books.py` de la copie) : au moins 4 à 6 livres de chaque variante, plus les chances des roues.

### Faiblesses (restantes)
- La démo ne montre pas encore la différence de ciel entre variantes (seuls le nombre de nuits et la valeur des étoiles changent) ; pas de test automatique démo/bibliothèque pour la version à deux roues.
- La bannière du déclenchement affiche le nombre de nuits avant décalage de la variante ; celui de `nightStart` est juste.
- La roue de la partie « Aurore » est tirée par les critères, pas visuellement liée à la valeur du bonus.
- Adoption dans le jeu principal non décidée ; roue de sauvegarde peu utile (n°15) ; jeu de base rude (n°14) ; optimiseur non reproductible (n°9).
- Droits de l'art IA non vérifiés ; musique et sons absents ; front-end Svelte/PixiJS non commencé.

### Opportunités
- Variantes de ciel = rejouabilité ; mécanisme par critères réutilisable.

### Menaces
- **Brevets / ressemblance avec Huff N' Puff** (structure à deux roues) : conseil requis (n°16). CGU Stake, règles non publiées, maths figées à l'approbation, noms proches, marché saturé.

---

## v14 — fin de l'itération 12 (2026-10-11, 00:11-00:55 UTC)

**Corrigé et mesuré depuis la v13**
- **Deux roues construites (copie d'expérience `games/stellar_vigil_wheels`, jeu principal inchangé)**, après analyse de la vraie structure de Huff N' Puff (l'upgrade améliore le type de bonus, pas le total). Roue des Saisons (Classique 40 / Long 20 / Dense 20 / Aurore 20 %) puis Roue de l'Aurore (versions supérieures 40 / 30 / 30 %).
- **Chances exactes par construction** : chaque résultat est un critère de l'optimiseur avec son taux ; mesuré à 100 000 simulations dans les deux modes : 40,0 / 20,0 / 20,0 / 20,0 %. Les bonus passés par l'Aurore valent 86-96x contre 68-72x. RTP 96,00 % dans les deux modes, bonus 1 spin sur 150.
- **38 tests verts dans la copie (portes qualité comprises), à la première génération à 100 000 simulations.**
- **Défaut trouvé par les tests** : la roue de sauvegarde pouvait tourner quand un total flottant valait 79,99999 au lieu de 80. Corrigé (tolérance) dans la copie et dans le jeu principal ; la bibliothèque principale est saine (0 livre concerné sur 2 160 + 77 672).
- **Démo mise en ligne pour test sur téléphone** (lien privé), sans les nouvelles roues.

### Faiblesses (restantes)
- **Les deux roues ne sont pas dans la démo** (ni animation ni habillage) ; leur adoption dans le jeu principal n'est pas décidée.
- Les livres wincap sont rattachés à Aurore → dense+ (0,1 %).
- Le nombre de nuits du `freeSpinTrigger` ne tient pas compte du décalage de la variante (`seasonWheel.totalNights` fait foi).
- Roue de sauvegarde peu utile (n°15), jeu de base rude (n°14), optimiseur non reproductible (n°9), queue du mode achat mince (n°10).
- Droits de l'art IA non vérifiés ; musique et sons absents ; front-end Svelte/PixiJS non commencé.

### Opportunités
- Les variantes de ciel donnent de la rejouabilité sans toucher aux règles de base.
- Même mécanisme (critères) réutilisable pour une roue de sauvegarde généreuse.

### Menaces
- **Brevets / ressemblance : la structure « roue avant le bonus + roue d'upgrade » est la signature de Huff N' Puff** ; noms, thème et visuels originaux ne suffisent pas à garantir quoi que ce soit ; conseil en brevets requis (question n°16).
- CGU Stake, règles non publiées, maths figées après approbation, noms proches, saturation du marché.

---

## v13 — fin de l'itération 11 (2026-10-10, 21:11-21:40 UTC)

**Corrigé et mesuré depuis la v12**
- **Option (c) de la question n°15 chiffrée sans rien régénérer** : une roue qui sauve vraiment 37,5 % du temps coûterait environ **15 points de RTP** en mode achat (12,0x sur 80x, mesuré avant optimisation) ; le coût est à peu près proportionnel à la chance (4 points pour 10 %). Décision de produit mieux informée.
- **Démo, règles et bibliothèque verrouillées par des tests** : la démo embarque l'empreinte de la bibliothèque dont elle vient ; les règles doivent annoncer le vrai taux de gain (28 %), la vraie fréquence du bonus (1 spin sur 150), le bon nombre de nuits, le RTP et les multiplicateurs de zone. Un test échoue si la démo est périmée ; **vérifié par falsification** (changer « 150 » en « 100 » fait échouer le test). 50 tests au total.
- **Vérification des autres visuels de hasard** : aucun autre effet visuel n'annonce de probabilités ; les valeurs des étoiles viennent des événements réels.

### Forces
- Moteur complet, déterministe, mesuré de plusieurs façons (composantes, distributions, sessions, effet de chaque mécanique) ; 50 tests verts.
- Démo cohérente avec la bibliothèque et avec la configuration, vérifiée automatiquement ; visuels de hasard alignés sur les vraies probabilités.
- Nouvelle direction artistique (art IA) avec provenance documentée.
- Compromis chiffrés et réversibles par réglages.

### Faiblesses (restantes)
- **La roue de sauvegarde est presque sans valeur** (2,5 % de chance réelle en achat) ; la rendre généreuse coûterait 4 à 15 points de RTP (question n°15).
- **Expérience de session rude** (jeu de base) ; réglage plus doux disponible mais non adopté (question n°14).
- **Optimiseur toujours non reproductible** ; archive de ~85 Mo à héberger (question n°9).
- Queue du mode achat mince (question n°10).
- Droits sur l'art IA non vérifiés (`ART_PROVENANCE.md`) ; musique et sons de production absents ; front-end Svelte/PixiJS non commencé.

### Opportunités
- Plateforme en croissance (chiffres rapportés par Engine, non vérifiés) ; aucun clone de Huff N' Puff trouvé dessus.
- Supprimer la roue simplifierait le jeu et retirerait un risque de brevet.
- Un mode de jeu plus doux (base_heavy) pour les sessions courtes.

### Menaces
- Probabilités affichées : tout nouvel effet de hasard tiré avant pondération peut mentir (principe noté dans `STAKE_COMPLIANCE.md`).
- Brevets : persistance des étoiles et roue « jusqu'au plancher » à faire examiner par un conseil.
- Droits des images IA et conditions de Higgsfield à vérifier ; CGU Stake (licence large, 36 mois renouvelables, clauses non lues).
- Maths figées après approbation (atténué par les tests, l'acceptation et le gel).
- Règles Stake incomplètes ; noms proches (Stellar Jackpots, Moon Princess Stargazing, « Vault ») ; saturation du marché ; ressemblance avec Huff N' Puff.

---

# SWOT — Stellar Vigil

## v12 — fin de l'itération 10 (2026-10-10, 18:12-19:10 UTC)

**Corrigé et mesuré depuis la v11**
- **Roue de sauvegarde : tromperie sur les probabilités corrigée.** Le moteur annonçait 3 segments « sauvée » sur 8 (37,5 %) ; après pondération de l'optimiseur la chance réelle est de **2,5 % en achat** et **7,3 % sur un bonus déclenché**. Trouvé en mesurant l'effet réel de la roue. Corrigé : le moteur ne décide plus des segments ; les vraies chances sont mesurées sur la bibliothèque finale (`saver_odds.json`, avec empreinte des tables) et le front-end dessine la roue et les règles à partir d'elles. 46 tests passent.
- **Variante base_heavy confirmée à 100 000 simulations** (et corrigée à la baisse par rapport à l'estimation à 10 000) : ruine d'un budget de 100 mises à 200 spins 16,2 % (au lieu de 26,8 %), 1 spin hors bonus sur 14 paie la mise, gain moyen du bonus environ 61x.
- **Erreur de mon outil corrigée** : le « coût en RTP » de la roue en jeu de base était rapporté à une seule mise (8,78 %) alors qu'il est de 0,06 % de l'ensemble des spins.
- **Effet réel de la roue mesuré** : coût en RTP 0,83 % (achat) et 0,06 % (base) ; elle est surtout décorative (question n°15).

### Forces
- Moteur complet, déterministe, mesuré par composante, distribution, session et effet de chaque mécanique ; 46 tests verts.
- Les visuels de hasard sont désormais alignés sur les vraies probabilités, avec un mécanisme (fichier d'odds + test de fraîcheur) qui évite la dérive.
- Compromis de volatilité chiffrés et réversibles par réglages (profil, répartition, freinage).
- Mécanique originale ; démo jouable.

### Faiblesses (restantes)
- **La roue de sauvegarde est presque sans valeur** (2,5 % de chance réelle en achat) ; sa raison d'être est à trancher (question n°15).
- **Expérience de session rude** (jeu de base) ; réglage plus doux disponible mais non adopté (question n°14).
- **Optimiseur toujours non reproductible** ; géré par le retirage et les garde-fous ; archive de ~85 Mo à héberger (question n°9).
- Queue du mode achat mince ; mode achat plus calme que le bonus déclenché (question n°10).
- Front-end Svelte/PixiJS non commencé ; art de production et sons absents.

### Opportunités
- Plateforme en croissance (chiffres rapportés par Engine, non vérifiés) ; aucun clone de Huff N' Puff trouvé dessus.
- Retirer la roue ou la refaire sur des critères propres simplifierait le jeu et réduirait le risque de brevet.
- Un mode de jeu plus doux (base_heavy) peut cibler les sessions courtes sans toucher à l'identité du bonus.

### Menaces
- **Probabilités affichées** : toute mécanique dont le résultat est tiré avant la pondération de l'optimiseur peut afficher des chances fausses ; vérification à faire pour tout nouvel effet visuel (noté dans `STAKE_COMPLIANCE.md`).
- Brevets : persistance des étoiles et roue « jusqu'au plancher » à faire examiner par un conseil.
- CGU Stake : licence large pour 36 mois renouvelables ; clauses de résiliation/indemnisation non lues.
- Maths figées après approbation (atténué par les tests, l'acceptation et le gel).
- Règles Stake incomplètes (RTP min/max, fichiers, juridictions).
- Noms proches : Stellar Jackpots, Moon Princess Stargazing, « Vault ».
- Saturation du marché ; risque de ressemblance avec Huff N' Puff.

---

# SWOT — Stellar Vigil

## v11 — fin de l'itération 9 (2026-10-10, 15:12-15:40 UTC)

**Corrigé et mesuré depuis la v10**
- **Expérience joueur mesurée pour la première fois** (sessions simulées, 20 000 par ligne) : sur 20 spins, 22,5 % de sessions gagnantes et une médiane de -13 mises ; sur 200 spins, 26,8 % des sessions épuisent un budget de 100 mises ; en achat, 30,4 % épuisent 10 prix sur 100 achats. Chiffres dans `DESIGN.md` §13.
- **Levier de produit chiffré et rendu sélectionnable** : la répartition du RTP entre jeu de base et bonus (`ACTIVE_RTP_SPLIT`). Variante « base_heavy » : 1 spin hors bonus sur 9 paie la mise (au lieu de 1 sur 17) et la ruine à 200 spins passe de 26,8 % à 13,0 % (un seul tirage à 10 000 simulations, indicatif). Défaut inchangé.
- **Erreurs de mon outil trouvées avant publication des chiffres** : libellé en mises/prix d'achat et seuil de ruine du mode achat erronés (0 % partout) ; corrigés, et ajout de tests d'échantillonnage. 44 tests passent.
- Le tampon de génération couvre maintenant aussi la répartition du RTP.

### Forces
- Moteur complet, déterministe, mesuré par composante, par distribution et par session ; 44 tests verts.
- Chaîne d'outils reproductible : génération, acceptation automatique, RTP, distributions, forme du jeu de base, sessions, gel, démo.
- Compromis de volatilité chiffrés et réversibles par réglages (profil, répartition, freinage).
- Mécanique originale ; roue utile dans les deux modes ; démo jouable.

### Faiblesses (restantes)
- **Expérience de session rude** (jeu de base) : médiane de 20 spins à -13 mises ; le défaut actuel est le plus volatil des deux répartitions.
- **Optimiseur toujours non reproductible** ; géré par le retirage et les garde-fous ; archive de ~85 Mo à héberger (question n°9).
- Queue du mode achat mince ; mode achat plus calme que le bonus déclenché (question n°10).
- Front-end Svelte/PixiJS non commencé ; art et sons de production absents.
- La variante base_heavy n'est mesurée qu'à 10 000 simulations.

### Opportunités
- Plateforme en croissance (chiffres rapportés par Engine, non vérifiés) ; aucun clone de Huff N' Puff trouvé dessus.
- Un mode de jeu plus doux (base_heavy) peut cibler les joueurs à sessions courtes sans toucher à l'identité du bonus.
- Thème libre de licences ; déclinaisons possibles.

### Menaces
- Brevets : persistance des étoiles et roue « jusqu'au plancher » à faire examiner par un conseil.
- CGU Stake : licence large pour 36 mois renouvelables ; clauses de résiliation/indemnisation non lues.
- Maths figées après approbation (atténué par les tests, l'acceptation et le gel).
- Règles Stake incomplètes (RTP min/max, fichiers, juridictions) ; une règle de format (0,1x) n'a été découverte que par essai.
- Noms proches : Stellar Jackpots, Moon Princess Stargazing, « Vault ».
- Saturation du marché ; une expérience de session rude peut peser sur la rétention ; risque de ressemblance avec Huff N' Puff.

---

# SWOT — Stellar Vigil

## v10 — fin de l'itération 8 (2026-10-10, 12:12-13:30 UTC)

**Corrigé et mesuré depuis la v9**
- **Défaut majeur du jeu de base découvert et corrigé** : la table des gains était environ 6 fois trop généreuse (jeu de base naturel : 78 % de gain, 3,56x par gain). L'optimiseur devait tout écraser et produisait une distribution en haltères : seulement **1 spin hors bonus sur 64** payait au moins la mise. Après réduction de la table (arrondie aux multiples de 0,1x) et un réglage de forme plus fort : **1 sur 17** (6,06 %), dont 3,2 % entre 2x et 5x ; 93 % des spins rapportent moins que la mise (98 % avant). Mesuré à 100 000 simulations.
- **Nouvelle règle de format Stake identifiée** : tout paiement doit être un multiple de 0,1x. Découverte par un échec de vérification pendant les essais ; la table actuelle la respecte.
- **Nouveau garde-fou** sur la forme du jeu de base (au moins 6 % de spins hors bonus qui paient la mise) ; l'optimiseur le respecte une fois sur deux environ, l'outil de retirage règle le reste. 41 tests passent.
- **Freinage du mode achat** : valeur 0,5 testée contre 0,25 (8 tentatives) : 4 acceptables sur 8 contre 11 sur 14 ; 0,25 conservé.
- **Hausse de la fréquence de gain** testée (1 spin sur 3,0 et 2,7) : elle ajoute surtout des gains sous la mise (pertes déguisées en gains) ; non adoptée.

### Forces
- Moteur complet, déterministe, mesuré par composante, validé à 100 000 simulations ; 41 tests verts.
- Jeu de base nettement plus vivant (6 % de spins paient la mise, avec des gains de 2x à 5x) ; mode achat sans exécution catastrophique.
- Chaîne d'outils reproductible : génération, acceptation automatique, mesures (RTP, distribution, forme du jeu de base), gel, démo.
- Mécanique originale ; roue utile dans les deux modes ; démo jouable.

### Faiblesses (restantes)
- **Optimiseur toujours non reproductible**, y compris sur la forme du jeu de base (barbell une fois sur deux sans garde-fou) ; géré par le retirage ; archive de ~85 Mo à héberger (question n°9).
- Le jeu de base reste lent : 93 % des spins rapportent moins que la mise, 71,6 % sans gain ; la granularité de 0,1x limite la baisse supplémentaire de la table des gains.
- Queue du mode achat mince (conséquence du freinage) ; mode achat plus calme que le bonus déclenché (question n°10).
- Front-end Svelte/PixiJS non commencé ; art et sons de production absents.
- Queue extrême non validée.

### Opportunités
- Plateforme en croissance (chiffres rapportés par Engine, non vérifiés) ; aucun clone de Huff N' Puff trouvé dessus.
- Thème libre de licences ; déclinaisons possibles.
- Davantage de symboles de bas niveau (ou une grille 3 rangées) rendrait le jeu de base naturellement moins gagnant en fréquence et permettrait une table plus fine ; non testé.

### Menaces
- Brevets : persistance des étoiles et roue « jusqu'au plancher » à faire examiner par un conseil.
- CGU Stake : licence large pour 36 mois renouvelables ; clauses de résiliation/indemnisation non lues.
- Maths figées après approbation : une erreur découverte après coup ne se corrige pas (atténué par les tests, l'acceptation et le gel).
- Règles Stake incomplètes (RTP min/max, fichiers, juridictions) ; une règle de format (0,1x) n'a été découverte que par essai : d'autres peuvent exister.
- Noms proches : Stellar Jackpots, Moon Princess Stargazing, « Vault ».
- Saturation du marché ; risque de ressemblance avec Huff N' Puff.

---

# SWOT — Stellar Vigil

## v9 — fin de l'itération 7 (2026-10-10, 09:12-11:45 UTC)

**Corrigé et mesuré depuis la v8**
- **Le mode catastrophique de l'optimiseur est supprimé, mesuré** : l'optimiseur est bimodal (bonne exécution, ou exécution à médiane 22x-26x et 87 % d'achats sous le prix). Sans réglage : 5 exécutions catastrophiques sur 17. Avec un freinage de la plage 900x-1 500x dans le mode achat : **0 sur 14**, à 100 000 simulations (profils A et D). Coût : environ la moitié de la queue du mode achat. Échantillons petits (6 à 8 par ligne).
- **Profils C et D évalués** : D (A avec 10/11/12 nuits) garde la queue mais n'améliore pas la robustesse et affaiblit les bonus à 4 et 5 Lunettes ; C perd presque toute la queue. Défaut conservé : A.
- **Erreur de ma part corrigée** : j'avais d'abord adopté D après « 5 sur 5 acceptables à 10 000 simulations » ; à 100 000 il n'est acceptable que 4 fois sur 8 sans freinage. Je suis revenu à A et j'ai restauré tous les textes (10/12/15 nuits).
- **Outil de mesure** : `reoptimize.py --no-stop --log` enregistre chaque tentative (médiane, écart-type, part sous le prix).
- Explication d'un écart de mesure : ma simulation rapide sous-estimait Quadrature parce qu'elle ignorait que les bonus à 4 et 5 Lunettes durent 12 et 15 nuits ; vérifié en la corrigeant.
- 40 tests passent ; bibliothèque finale acceptée (médiane achat 52,9x, écart-type 74,9).

### Forces
- Moteur complet, déterministe, mesuré par composante, validé à 100 000 simulations ; 40 tests verts.
- Chaîne d'outils reproductible : génération, acceptation automatique, mesure de dispersion, gel, démo.
- Le mode catastrophique de l'optimiseur est neutralisé et chiffré ; les compromis (profils, freinage) sont documentés et réversibles par un réglage.
- Mécanique originale ; roue utile dans les deux modes ; démo jouable.

### Faiblesses (restantes)
- **Optimiseur toujours non reproductible** (environ 2 exécutions sur 6 tombent en quasi-échec à 36x-39x de médiane) ; géré par le retirage ; archive de ~85 Mo à héberger (question n°9).
- Queue du mode achat très mince : gains de 500x à 2 000x environ 1 achat sur 1 300 à 4 800 (conséquence du freinage et de l'écrasement) ; mode achat nettement plus calme que le bonus déclenché (question n°10).
- Front-end Svelte/PixiJS non commencé ; art et sons de production absents.
- Table des gains provisoire ; queue extrême non validée ; 71,6 % de spins sans gain en base.

### Opportunités
- Plateforme en croissance (chiffres rapportés par Engine, non vérifiés) ; aucun clone de Huff N' Puff trouvé dessus.
- Thème libre de licences ; déclinaisons possibles.
- Un freinage moins fort (par exemple 0,5) pourrait garder plus de queue en restant sans mode catastrophique ; non testé.

### Menaces
- Brevets : persistance des étoiles et roue « jusqu'au plancher » à faire examiner par un conseil.
- CGU Stake : licence large pour 36 mois renouvelables ; clauses de résiliation/indemnisation non lues.
- Maths figées après approbation : une erreur découverte après coup ne se corrige pas (atténué par les tests, l'acceptation et le gel).
- Règles Stake incomplètes (RTP min/max, fichiers, juridictions).
- Noms proches : Stellar Jackpots, Moon Princess Stargazing, « Vault ».
- Saturation du marché ; risque de ressemblance avec Huff N' Puff.

---

# SWOT — Stellar Vigil

## v8 — fin de l'itération 6 (2026-10-10, 06:12-08:00 UTC)

**Corrigé et mesuré depuis la v7**
- **Cause de l'écrasement du mode achat expliquée** : avant optimisation, la zone Quadrature (1 000x) pèse plus d'un tiers de la valeur naturelle du bonus (106x pour un prix de 80x). Outil `rtp_breakdown.py --natural` pour le voir.
- **Variante testée** (profil B : ciel plus clairsemé, étoiles plus riches) : valeur naturelle ramenée à environ 86x, mais la dispersion de l'optimiseur ne diminue pas (médianes 51x à 67x) et les gains de 1 000x et plus presque disparaissent (0,2 % du RTP en base contre environ 2 %). **Non adoptée** : elle sacrifie la volatilité haute. Conservée comme réglage sélectionnable, décision laissée à l'utilisateur (question n°12).
- **Dispersion de l'optimiseur mesurée sur 4 exécutions à 100 000** : médiane achat 71,6x, 51,2x, 37,5x puis 55,4x ; une sur quatre rejetée par les garde-fous (qui fonctionnent donc comme prévu).
- **Outil d'acceptation** `reoptimize.py` : relance seulement l'optimiseur (environ 110 s contre 10 min) jusqu'à une exécution acceptable ; essayé pour de vrai (rejet puis acceptation).
- **Tampon de génération** (`library/profile.json`) et test associé : une bibliothèque issue d'un autre profil ou prix est détectée. 40 tests passent.
- **Erreur corrigée en route** : l'outil `reoptimize.py` laissait `stats_summary.json` périmé (même écart-type que l'exécution rejetée) ; corrigé et rafraîchi.

### Forces
- Moteur complet, déterministe, mesuré par composante, validé à 100 000 simulations ; 40 tests verts.
- Chaîne d'outils reproductible : génération, acceptation automatique, mesures, gel, démo.
- Le compromis volatilité / fidélité du mode achat est chiffré et réversible (un réglage).
- Mécanique originale ; roue utile dans les deux modes ; démo jouable avec sons et règles.

### Faiblesses (restantes)
- **Optimiseur non reproductible** et très dispersé (médiane achat 37x à 72x) : géré par garde-fous et acceptation, pas supprimé ; archive de ~85 Mo à héberger (question n°9).
- Mode achat nettement plus calme que le bonus déclenché (question n°10) ; arbitrage A/B ouvert (question n°12).
- Front-end Svelte/PixiJS non commencé ; art et sons de production absents.
- Table des gains toujours provisoire ; queue extrême non validée ; 71,6 % de spins sans gain en base.

### Opportunités
- Plateforme en croissance (chiffres rapportés par Engine, non vérifiés) ; aucun clone de Huff N' Puff trouvé dessus.
- Thème libre de licences ; déclinaisons possibles.
- Une seconde série de profils intermédiaires (entre A et B) pourrait offrir un meilleur compromis ; non testée.

### Menaces
- Brevets : persistance des étoiles et roue « jusqu'au plancher » à faire examiner par un conseil.
- CGU Stake : licence large pour 36 mois renouvelables ; clauses de résiliation/indemnisation non lues.
- Maths figées après approbation : une erreur découverte après coup ne se corrige pas (atténué par les tests, l'acceptation et le gel).
- Règles Stake incomplètes (RTP min/max, fichiers, juridictions).
- Noms proches : Stellar Jackpots, Moon Princess Stargazing, « Vault ».
- Saturation du marché ; risque de ressemblance avec Huff N' Puff.

---

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
