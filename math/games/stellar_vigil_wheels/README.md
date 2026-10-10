# Stellar Vigil - Deux Roues (experience)

Copie d'experience de `stellar_vigil` avec les deux roues de `docs/TWO_WHEELS_SPEC.md`. Le jeu principal est inchange.

- **Roue des Saisons** (avant le bonus) : Classique 40 % / Long 20 % / Dense 20 % / Aurore 20 %.
- **Roue de l'Aurore** (apres un segment Aurore) : Classique+ 40 % / Long+ 30 % / Dense+ 30 % (versions superieures : etoiles plus riches).
- Chaque resultat est un **critere de l'optimiseur** (`wheel1_*`, `wheel2_*`, recherche par `variant`) avec son taux (`hr`) : les chances sont exactes dans la bibliotheque finale (mesure : `tools/wheel_odds.py`).
- Evenement de livre : `seasonWheel {wheel, season, variant, totalNights}` (avant les nuits). Le nombre de nuits du `freeSpinTrigger` est celui du declenchement ; `totalNights` du `seasonWheel` fait foi.
- Les livres wincap (0,1 %) sont attribues a Aurore -> dense+.

Lancer : `SV_SIMS=1e5 env/bin/python games/stellar_vigil_wheels/run.py` (depuis `math/`).
Etat (20 000 simulations) : generation + optimisation OK, RTP 96,00 % dans les deux modes, chances des roues exactes. Portes qualite et tests a 100 000 simulations : a faire.
