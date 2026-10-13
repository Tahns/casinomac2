# Stellar Vigil - Deux Roues (experience)

Copie d'experience de `stellar_vigil` avec huit bonus et deux roues independantes (voir `docs/TWO_WHEELS_SPEC.md`). Le jeu principal est inchange.

- **Roue des Bonus** (8 segments) choisit le bonus : Constellations 22 %, Cometes 13 %, Nova 13 %, Croix de Lune 11 %, Pluie d'Etoiles 11 %, Eclipse 9 %, Galaxie 8 %, Orbites 13 %.
- **Roue des Phases de Lune** (3 segments) choisit la richesse : croissant 60 %, quartier 30 %, pleine lune 10 % (versions `x`, `x+`, `x++`). Aucune roue ne mene a l'autre.
- Chaque couple (bonus, phase) est un **critere de l'optimiseur** (`p{phase}_{bonus}`, 24 criteres) avec son taux (`hr`) : les chances sont exactes dans la bibliotheque finale (mesure : `tools/wheel_odds.py`).
- Evenement de livre : `seasonWheel {wheel, tier, kind, variant, totalNights}` (avant les nuits). Le nombre de nuits fait foi dans `totalNights` (le `totalFs` du `freeSpinTrigger` est celui du profil A et ne doit pas etre affiche).
- Le livre wincap (0,1 %) est attribue a `p3_constellation` (seul bonus qui peut remplir le ciel).
- Orbites : chaque colonne est une orbite, ses etoiles valent leur somme multipliee par le nombre d'etoiles de la colonne ; l'evenement `constellationsUpdate` porte `orbits` (etoiles par colonne).

Lancer : `SV_SIMS=1e5 env/bin/python games/stellar_vigil_wheels/run.py` (depuis `math/`).
Etat (100 000 simulations) : RTP 96,00 % dans les deux modes, chances des roues exactes, 40 tests reussis. Aucune affirmation de conformite Stake ni d'absence de brevet : seuls un conseil en PI et Stake peuvent la faire.
