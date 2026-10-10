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
