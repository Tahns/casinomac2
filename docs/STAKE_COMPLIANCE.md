# Stake Engine : règles, CGU et noms (état au 2026-10-09)

Légende : [LU] lu sur une page officielle (via un outil de lecture qui résume) ; [TIERS] source non officielle ; [SUPPOSÉ] non confirmé.

## Règles d'approbation [LU] — stakeengine.org/docs/approval-guidelines
- Revue liée à une version précise du front **et** du math ; texte de présentation (thème, mécaniques) obligatoire.
- Jeux **strictement stateless** : pas de jackpots, de gamble, de continuation ni de cashout anticipé. [SUPPOSÉ] l'interdiction vise les jackpots progressifs/partagés ; par prudence on parle de « multiplicateurs fixes ».
- Jeu original (pas de titre licencié déjà publié ailleurs), pas de branding Stake Engine, rien qui attire les mineurs (pas de personnages enfantins), vocabulaire strict pour les marchés sociaux/régulés.
- Après sortie : petites corrections visuelles seulement, **aucun changement du modèle math**, de mode ou de mécanique.
- Checklist de soumission et exigences par juridiction : pages vides ou introuvables.

## Données chiffrées
- Fourchette de RTP, max win, limites de fichiers, nombre minimal de simulations, règle de coût du bonus buy : **non publiés** officiellement.
- [TIERS] skills.rest : RTP 90,0-98,0 %, écart entre modes < 0,5 %. Nous sommes à 96,0 % dans les deux modes.
- [TIERS] exemple du SDK : tous les modes partagent le même RTP cible ; bonus buy d'exemple à 100x.

## Rémunération [LU] — /docs/payments
10 % du GGR réel (dette reportée si mois négatif) ou 7,5 % du GGR attendu (sans dette). Paiement le 1er de chaque mois.

## CGU [LU, extrait seulement] — /docs/terms
- C'est une **licence** de la propriété intellectuelle du jeu (nom, graphismes, animations, logiciel, nouvelles versions) à l'opérateur, pas une cession. Durée 36 mois, renouvelable automatiquement par 36 mois, préavis de 3 mois.
- Redevance de 10 % du GGR, avec un mécanisme « Negative Rollover » (clause 8.1(e), texte non lu).
- **Non lu** : résiliation, garanties et indemnisation du développeur, retrait d'un jeu. À lire en entier dans le navigateur avant d'accepter.

## Noms
- « Stellar Vigil » : aucun résultat exact. Voisins : Stellar Jackpots, Stellar (AGames). Éviter « Stellar » + « Jackpot ».
- « Constellation Night » : aucun slot du même nom. Plus proche mécaniquement : Moon Princess Stargazing (Play'n GO).
- Paliers : « Vault » est encombré (Lucky Vault, Biggest Vault) ; c'est pourquoi les zones s'appellent Horizon, Meridien, Quadrature, Firmament. Bases de marques (EUIPO, INPI, USPTO) non interrogées : à faire.

## Règle de format découverte par les essais (lue dans le code du SDK, `utils/rgs_verification.py`)
Chaque paiement doit être un multiple de 0,1x la mise (« Payout values must be in increments of 10 », en centièmes). Conséquence : toute valeur de la table des gains, des étoiles, des paliers et de la roue doit être un multiple de 0,1x ; la granularité minimale d'un gain est 0,1x. Vérifié : la table actuelle passe la vérification de format ; une table mise à l'échelle sans arrondi échoue.
