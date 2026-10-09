# Questions ouvertes (décisions humaines)

1. **Brevets** : faire valider par un conseil en brevets le dossier `docs/PATENT_BRIEF.md`. Enjeu principal : une grille d'étoiles qui persistent d'une nuit à l'autre échappe-t-elle à la notion de symboles « tenus » des brevets Aristocrat ?
2. **CGU Stake Engine** : lire les 17 sections complètes (résiliation, garanties, indemnisation, retrait d'un jeu, clause 8.1(e) « Negative Rollover »). L'extrait lu parle d'une *licence* de la PI du jeu à l'opérateur, pour 36 mois renouvelables.
3. **Règles Stake non publiées** : fourchette de RTP (source communautaire non officielle : 90-98 %, écart entre modes < 0,5 %), max win, limites de fichiers, exigences par juridiction. À demander au support / Discord.
4. **Marques** : vérifier le titre « Stellar Vigil » et les noms de paliers à l'EUIPO / INPI / USPTO. Noms proches repérés : Stellar Jackpots, Moon Princess Stargazing (mécanique voisine), « Vault » (très utilisé).
5. **Art, musique, sons** : à créer ou licencier par écrit ; garder les preuves. Aucune génération payante sans accord.

6. **Roue de sauvegarde** : à soumettre au conseil en brevets avec le brevet « iterative awards » (award calculé à partir d'un total précédent). Et à décrire sans ambiguïté dans les règles : elle ne garantit pas le remboursement.
7. **Gain max** : 10 000x existe mais survient environ 1 fois sur 10 millions ; décider si le supprimer de la communication ou le rendre plus accessible (changement de maths).

8. ~~**Roue de sauvegarde en jeu de base**~~ **Tranché (itération 3)** : l'utilisateur a répondu « Oui » sans préciser l'option ; interprété comme « la rendre utile » → option (b), plancher de 25x sur les bonus déclenchés (voir `DESIGN.md` §9). À confirmer ou changer (un seul paramètre : `saver_floor`). Texte d'origine : **Roue de sauvegarde en jeu de base** : elle ne tourne presque jamais sur un bonus déclenché (plancher = 1x). Options : (a) laisser tel quel, la roue est une fonction du mode achat ; (b) plancher fixe sur les bonus déclenchés (par ex. 25x), plus visible mais ce n'est plus une « mise sauvée » au sens strict (à renommer, ex. « minimum de bonus ») ; (c) plancher proportionnel au nombre de Lunettes. Ça modifie les maths et le coût en RTP ; à décider avant la soumission.
9. **Archivage des maths** : l'optimiseur n'est pas reproductible. Avant toute soumission, choisir une exécution qui passe `tests/test_quality_gates.py` puis archiver ses fichiers de publication ; décider où (dépôt privé, stockage).
10. **Mode achat plus calme que le bonus déclenché** (médiane 71,6x pour 80x payés, très peu de gains au-dessus de 500x). Faut-il rendre le mode achat plus ambitieux (plus de volatilité, donc plus de risque pour l'acheteur) ou garder ce profil ? Choix de produit.
