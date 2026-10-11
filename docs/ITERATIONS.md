# Journal des itérations

## Itération 0 (2026-10-09, avant la boucle)
- Moteur : base 5x4 ways + bonus « Nuit des Constellations » 5x5. RTP 96,0 % sur 10 000 simulations par mode.
- Ajouts : étoiles à valeur en jeu de base (pipeline relancé, formats vérifiés), démo jouable `demo/index.html`.
- Recherches : dossier brevets (6 brevets Aristocrat), règles Stake, conflits de noms.
- En cours au moment du lancement de la boucle : roue de sauvegarde (wager saver) et renommage des paliers hors du vocabulaire « jackpot ».

## Itération 1 (2026-10-09, 18:12-18:45 UTC)
- Wager saver : roue de sauvegarde en fin de bonus (plancher = mise payée pour entrer). Mesuré à 10 000 simulations : en achat, roue présente dans environ 78 % des books, « sauvée » dans environ 38 % d'entre elles.
- Paliers renommés hors vocabulaire « jackpot » ; étoiles à valeur en jeu de base.
- Validation à 100 000 simulations : RTP 96,0 % (base et bonus), spins sans gain 71,6 % en base, écart-type 10,1 (base) et 95,9 (achat).
- Tests : 26 passent. Le test de RTP lit seulement les tables de poids (0,2 s) ; le reste de la suite prend environ 100 s à 100 000 simulations.
- Démo : roue animée, étoiles à valeur, nouveaux noms ; books ré-exportés depuis la bibliothèque à 100 000.
- Incident : le worker a redémarré pendant l'itération ; la routine s'est déclenchée deux fois (15:12 et 18:12 UTC), une seule itération a été jouée. Une commande précédente, interrompue, avait déjà appliqué une partie des modifications : doublons nettoyés avant de relancer.
- Pour l'itération suivante : mesurer la répartition du RTP par composante (ways, étoiles, bonus, roue, zones), puis régler le coût du bonus buy et la table des gains ; audio procédural dans la démo ; texte de règles.

## Itération 2 (2026-10-09, 21:12-21:35 UTC)
- Mesure : répartition du RTP par composante sur 100 000 simulations (outil versionné `tools/rtp_breakdown.py`).
  Base : ways 43,3 %, étoiles 3,8 %, nuits 43,5 %, zones 5,4 % ; achat : nuits 71,7 %, zones 21,4 %, roue 1,0 %.
- Test de comptabilité (ways + étoiles + nuits + top-up = paiement) sur 200 000 books : passe. 28 tests au total.
- Démo : sons synthétisés avec bouton, écran de règles ; 0 erreur JavaScript détectée (le son n'a pas pu être écouté).
- Découverte : la roue ne tourne presque jamais sur un bonus déclenché en jeu de base. Aucun changement de maths fait : décision produit demandée (question n°8).
- Pour l'itération suivante : si la décision n'est pas donnée, préparer les deux variantes de plancher en configuration et mesurer leur coût en RTP sans les activer ; calage du coût de l'achat de bonus.

## Itération 3 (2026-10-09/10, déclenchée par la réponse « Oui » de l'utilisateur)
- Décision : « Oui » interprété comme option (b) : plancher de 25x sur les bonus déclenchés (config `saver_floor`).
- Mesuré à 100 000 simulations : roue en base 1 spin sur 1 309 (environ 1 bonus sur 9), 63 % des achats ; coût RTP 0,1 % (base) et 3,2 % (achat) ; RTP 96,0 % partout.
- Incident évité : une exécution de l'optimiseur a donné un mode achat très volatil (écart-type 210). Cause : optimiseur non reproductible. Correctif : bornes `min_m2m=1.5`, `max_m2m=3`. Résultat : médiane 71,6x, écart-type 65,6.
- Constat : deux lancements aux réglages identiques produisent des tables de poids différentes (empreintes différentes). Garde-fous ajoutés ; archivage à décider (question n°9).
- Outils ajoutés : `tools/payout_distribution.py`. Tests : 33 passent (+ garde-fous de forme, + roue atteignable en base).
- Pour l'itération suivante : construire le front-end ? (hors portée de ce passage : décision d'effort) ; sinon mesurer la sensibilité du coût d'achat (60x/80x/100x), tester des tables de gains alternatives, ajouter un test de reproductibilité des simulations (même graine, mêmes books).

## Itération 4 (2026-10-10, 00:12-00:50 UTC)
- Test de déterminisme du moteur de simulation (`test_reproducible.py`, 3 tests) : vérifié que le test exerce de vrais bonus avec roue et gain max, qu'il passe et qu'il détecte des graines différentes.
- Outil `freeze_maths.py` (freeze / verify) : testé sur la bibliothèque courante ; une altération d'une ligne d'un fichier est détectée. Le manifeste de test a été supprimé (maths non définitives).
- Outil `export_demo_books.py` : régénère `demo/books.js` à l'identique (même md5).
- README du jeu. 36 tests passent (110 s à 100 000 simulations).
- Non fait : calage du coût d'achat (la table de critères n'est pas dans la bibliothèque, donc pas de mesure de la valeur naturelle du bonus).
- Pour l'itération suivante : exporter la table de critères pour mesurer la marge du coût d'achat ; tester des tables de gains alternatives (taux de gain en base) ; relire l'écran de règles ; ne pas démarrer le front-end Svelte sans décision d'effort de l'utilisateur.

## Itération 5 (2026-10-10, 03:12-04:15 UTC)
- Mesure : avant optimisation, bonus acheté = 106x en moyenne (médiane 80x) pour un prix de 80x ; la zone Quadrature (1 000x) est dans environ 1 % des bonus naturels.
- Étude du prix d'achat : 80x (3 exécutions) et 90x (1) passent les garde-fous ; 100x échoue 2 fois sur 2 (médiane 47x puis 38x). Prix conservé : 80x.
- Bruit de l'optimiseur : médiane du mode achat 71,6x puis 51,2x sur deux exécutions à 100 000 simulations identiques en réglages. Docs mis à jour avec des plages.
- Refactor : constante unique `BONUS_BUY_COST` ; outils et tests lisent les coûts depuis la configuration/l'index. Nouveau test de cohérence bibliothèque/configuration. 39 tests passent (148 s).
- Démo : `books.js` régénéré depuis la nouvelle bibliothèque ; texte des règles ajusté ; 0 erreur JavaScript.
- Pour l'itération suivante : tester une réduction de la fréquence de la zone Quadrature dans les profils de nuit (sans changer les zones) et mesurer l'effet sur la forme du mode achat ; table des gains alternative (taux de gain en base) ; ne pas démarrer le front-end Svelte sans décision d'effort de l'utilisateur.

## Itération 6 (2026-10-10, 06:12-08:00 UTC)
- Mesure : décomposition naturelle (poids égaux) du bonus acheté : nuits 51,5x, zones environ 38x (Quadrature), roue 12x, ways 1,4x. Quadrature = plus d'un tiers de la valeur naturelle.
- Variante B (ciel plus clairsemé, étoiles plus riches), mesurée par Monte Carlo puis par le moteur complet : valeur naturelle environ 86x, Quadrature 0,4 %. Trois exécutions à 10 000 : médianes 64x, 51x, 67x (dispersion inchangée). En base : zones 0,6 % du RTP, gains de 1 000x et plus 0,2 %. Non adoptée ; profil A conservé par défaut.
- Quatre exécutions du profil A à 100 000 : médianes achat 71,6x, 51,2x, 37,5x, 55,4x. La 37,5x est rejetée par les garde-fous (médiane et rapport moyenne/médiane).
- Outils : `reoptimize.py` (optimiseur seul, environ 110 s), `rtp_breakdown.py --natural`. Tampon `library/profile.json` + test. 40 tests passent.
- Incident : `reoptimize.py` ne rafraîchissait pas `stats_summary.json` (chiffres de l'exécution rejetée) ; corrigé et rafraîchi avant d'écrire les docs.
- Pour l'itération suivante : tester un ou deux profils intermédiaires entre A et B ; lancer `reoptimize.py` plus de fois pour caractériser la dispersion (histogramme des médianes) ; réexaminer la table des gains (taux de gain en base). Pas de front-end Svelte sans décision de l'utilisateur.

## Itération 7 (2026-10-10, 09:12-11:45 UTC)
- Dispersion de l'optimiseur mesurée (`reoptimize.py --no-stop --log`, 100 000 simulations) : profil A sans freinage 9 tentatives (6 acceptables, 3 catastrophiques, médianes 22x-24x et écart-type 210-217) ; profil D sans freinage 8 (4, 2 catastrophiques, 2 quasi-échecs 37,9x et 38,3x) ; profil D avec freinage 8 (7, 0, 1) ; profil A avec freinage 6 (4, 0, 2 quasi-échecs 36,6x et 39,5x).
- Changement retenu : freinage 0,25 de la plage 900x-1 500x dans le mode achat (`game_optimization.py`). Coût mesuré : gains de 500x à 2 000x d'environ 0,17 % à 0,08 % des achats ; base inchangée (2,9 % du RTP au-delà de 1 000x).
- Profils C et D ajoutés (sélectionnables). D (10/11/12 nuits) n'a pas été adopté : pas de gain de robustesse à 100 000 ; adopté puis annulé en cours d'itération, textes restaurés.
- Simulation Monte Carlo : le mélange de durées 10/12/15 explique l'écart Quadrature entre ma simulation rapide (2,2 %) et le moteur (3,5 %).
- 40 tests passent ; bibliothèque finale acceptée (médiane achat 52,9x, écart-type 74,9, 62 % sous le prix). Démo régénérée.
- Pour l'itération suivante : tester un freinage plus faible (0,5) pour garder plus de queue ; revoir la table des gains (taux de gain en base, 71,6 % de spins sans gain) ; pas de front-end sans décision de l'utilisateur.

## Itération 8 (2026-10-10, 12:12-13:30 UTC)
- Freinage du mode achat 0,5 (8 tentatives à 100 000) : 4 acceptables, 4 quasi-échecs (34x-38x), 0 catastrophique ; 0,25 reste meilleur (11 sur 14).
- Fréquence de gain 1 sur 3,0 et 1 sur 2,7 (10 000 simulations) : gains en plus surtout sous la mise ; non adoptée.
- Découverte : jeu de base naturel à 78 % de gain et 3,56x par gain ; optimisé : 26,4 % de micro-gains, 0,16 % de gains 1x-5x, 1 spin hors bonus sur 64 paie la mise (outil `base_win_shape.py`).
- Essais de table des gains : ×0,5 et ×0,3 échouent à la vérification de format Stake (paiements non multiples de 0,1x) mais montrent la tendance (4,0 % et 8,9 % de spins hors bonus à la mise ou plus). Table calibrée à la main, multiples de 0,1x, adoptée.
- Réglage de forme du jeu de base : facteur 8 sur 1x-5x et biais de distribution 1x-5x (poids 0,7) ; essai avec facteur 3 : 0 tentative sur 4 atteint 6 % ; avec facteur 8 : 3 sur 4.
- Résultat à 100 000 simulations (exécution acceptée) : 6,06 % des spins hors bonus paient la mise, RTP 96,0 % partout, médiane achat 64,4x. 41 tests passent.
- Incident : un lancement de l'outil de retirage a été coupé par mon propre délai pendant une écriture ; relancé en arrière-plan avant d'utiliser la bibliothèque (acceptation à la première tentative).
- Pour l'itération suivante : revoir la durée et la fréquence des Lunettes dans le jeu de base ; tester davantage de symboles de bas niveau (si faisable sans casser les 1 024 ways) ; mesurer la variance d'un échantillon de 20 spins consécutifs (expérience du joueur) ; pas de front-end sans décision de l'utilisateur.

## Itération 9 (2026-10-10, 15:12-15:40 UTC)
- Nouvel outil `session_sim.py` (sessions simulées à partir des tables, échantillonnage comme le RGS). Deux erreurs de mon outil corrigées avant d'utiliser ses chiffres (libellé des unités en mode achat, seuil de ruine du mode achat). 3 tests ajoutés (échantillonnage = RTP des tables, seuil de ruine).
- Mesures (20 000 sessions, profil A, répartition default) : 20 spins 22,5 % gagnantes / médiane -13,1 ; 50 spins 29,1 % / -22,0 ; 200 spins 38,5 % / -30,8 / ruine 26,8 % ; 1 000 spins 37,5 % / -75,7 / ruine 73,3 % ; achat : 1 achat 37,9 % gagnant, 100 achats ruine 30,4 %.
- Variante `base_heavy` (RTP base 54,9 % / bonus 41,0 %), 10 000 simulations, un tirage de l'optimiseur, 6 000 sessions : hors bonus ≥ mise 1 sur 9, 20 spins 24,0 % / -9,4, 200 spins ruine 13,0 %, 1 000 spins ruine 66,3 %. Adoucit l'expérience ; bonus moyen 61x au lieu de 75x. Non adoptée (volatilité haute demandée) ; sélectionnable par `ACTIVE_RTP_SPLIT`.
- Le tampon `library/profile.json` inclut `rtp_split` ; la bibliothèque courante (accepte, 100 000) est stampée « default ». 44 tests passent.
- Pour l'itération suivante : confirmer base_heavy à 100 000 simulations avec plusieurs tirages de l'optimiseur ; mesurer l'effet de la roue de sauvegarde sur les sessions en mode achat ; ne pas démarrer le front-end sans décision de l'utilisateur.

## Itération 10 (2026-10-10, 18:12-19:10 UTC)
- Variante base_heavy à 100 000 simulations (5 tirages de l'optimiseur : 2 acceptables) : hors bonus ≥ mise 1 sur 14 (7,2 %), 20 spins 27,1 % gagnantes / médiane -11,0, 200 spins ruine 16,2 %, 1 000 spins ruine 65,3 %. L'estimation à 10 000 était trop optimiste (13,0 %, 1 sur 9).
- Outil `wheel_effect.py` : a révélé que la chance réelle de « sauvée » est de 2,5 % en achat et 7,3 % sur bonus déclenché (nominalement 37,5 %). Cause : l'optimiseur écrase les livres où la roue sauve (ils paient exactement le plancher). Outil corrigé (dénominateur du coût en RTP).
- Correction : `saver_segments` supprimé des maths ; événement `saverWheel` réduit à `saved/floor/topUp/total` ; `saver_odds.py` mesure et publie les vraies chances (avec empreinte des tables) ; `reoptimize.py` et `run.py` l'appellent ; démo dessinée à partir des vraies chances (40 segments) ; règles dynamiques. 2 tests ajoutés (fraîcheur et validité des odds) ; 46 passent (161 s).
- Régénération complète à 100 000 simulations, acceptée à la première tentative (médiane achat 53,9x, 6,28 % des spins hors bonus paient la mise).
- Pour l'itération suivante : si la question n°15 n'est pas tranchée, chiffrer l'option (c) en prototype sur une copie (critères distincts pour la roue) ; vérifier qu'aucun autre effet visuel n'annonce de fausses probabilités ; ne pas démarrer le front-end sans décision de l'utilisateur.

## Itération 11 (2026-10-10, 21:11-21:40 UTC)
- Mesure sans régénération : coût en RTP d'une roue à 37,5 % de chance = 15,0 % du prix d'achat (12,0x sur 80x, avant optimisation), proportionnel à la chance ; à comparer aux 0,83 % actuels (2,5 % de chance réelle). Ajouté à `DESIGN.md` §9 et à la question n°15.
- Tests de cohérence démo/bibliothèque/configuration (`test_demo_consistency.py`, 4 tests) : empreinte de la bibliothèque embarquée dans `books.js`, taux de gain (28 %) et fréquence du bonus (1 sur 150) dans les règles, nombre de nuits, RTP et multiplicateurs. Mutation vérifiée : un chiffre falsifié fait échouer le test ; fichier restauré.
- Vérification : aucun autre visuel de hasard n'annonce de probabilités.
- Aucun crédit Higgsfield dépensé (le solde reste 153,43).
- Pour l'itération suivante : rien de neuf à régénérer ; relire les garde-fous du dépôt (hygiène : taille des fichiers versionnés, historique) ; si aucune décision n'arrive sur les questions n°9 à n°15, préparer le dossier de décision complet (une page) plutôt que d'ajouter des mesures.

## Itération 12 (2026-10-11, 00:11-00:55 UTC)
- Copie d'expérience `games/stellar_vigil_wheels` : 6 critères d'optimiseur (`wheel1_*`, `wheel2_*`, recherche par `variant`), événement `seasonWheel`, outil `tools/wheel_odds.py`, tests `test_wheel_odds.py`. Génération à 100 000 simulations : RTP 96,00 % (base et achat), chances des roues exactes (40/20/20/20 %), bonus aurore 86-96x contre 68-72x, 38 tests verts.
- Défaut corrigé : tolérance flottante sur le plancher de la roue de sauvegarde (copie et jeu principal ; aucun livre principal concerné).
- Démo publiée en artefact privé pour test sur téléphone (sans les deux roues).
- Pour l'itération suivante : dessiner les deux roues dans la démo (copie des livres de l'expérience), et seulement ensuite décider de l'adoption dans le jeu principal ; ne pas démarrer le front-end sans décision.

## Itération 13 (2026-10-11, 03:11-03:50 UTC)
- Démo : `seasonWheel` géré (deux roues, segments dimensionnés par les chances réelles `window.WHEEL_ODDS`), `?auto=season` pour les captures, build `python3 demo/build_single.py wheels` -> `stellar_vigil_demo_wheels.html` (2,4 Mo, ignoré par git), `books_wheels.js` généré par `tools/export_demo_books.py` de la copie. Captures 390 px vérifiées, 0 erreur console. Publiée en artefact privé.
- Pour l'itération suivante : test de cohérence démo/bibliothèque pour les deux roues ; afficher la variante de ciel (couleur/fond) ; si rien n'est décidé par l'utilisateur sur n°9 à n°16, préparer le dossier de décision d'une page. Fin de boucle à 13:00 UTC.

## Itération 14 (2026-10-11, 06:12-06:40 UTC)
- `tests/test_demo_wheels.py` (2 tests, mutation vérifiée), bannière de déclenchement sans nombre de nuits périmé, démo des deux roues republiée.
- Pour l'itération suivante : afficher la variante de ciel ; sinon préparer le dossier de décision d'une page. Fin de boucle à 13:00 UTC ; 3 itérations d'affilée sans amélioration possible = arrêt.

## Itération 15 (2026-10-11, 09:11-09:35 UTC)
- Démo : teinte du ciel selon la variante (variables CSS --skyc et --skyb), capture 390 px vérifiée ; démo republiée.
- Pour l'itération suivante : plus de travail autonome à forte valeur ; préparer le dossier de décision d'une page (questions n°9 à n°16) ou arrêter la boucle à 13:00 UTC.
