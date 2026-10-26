# Agent Mambo (math)
6x5 cluster pays with tumbles (min cluster 5), wild W, scatter S.
Free spins (4+ scatters, 3+ retrigger): global multiplier meter x1 -> +8 per winning step (cap x100), persists through the feature.
Bomb-timer wire (8-cell path, burns 1 cell per winning step): on a dead board with >= 3 burnt cells the burnt non-scatter cells vanish, new symbols drop in and the board is evaluated again.
Bonus (cost 100) weights come from tools/reweight_bonus.py, base weights from the Rust optimizer. See MATH_REPORT.md.
