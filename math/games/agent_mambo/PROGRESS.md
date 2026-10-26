# PROGRESS (Agent Mambo math agent)
Step 0: copied the_unleashed_mine (no library/). game_id agent_mambo. Veins removed; global multiplier meter (gm_start/gm_step/gm_cap in game_config); wire blast removes burnt non-scatter cells (fuseBlast cells w/o replaced, then tumbleBoard with padded rows). Smoke diag: bonus fgfloor4 natural mean (step1 cap50) 49.6, median 42.7 (old mine: 100/70). Next: choose gm_step/cap so that natural mean ~ tier target (~93x), then full run.
Step 1: gm_step 8 cap 100 (natural t4 mean ~100 at step8, 82 at step5). full run1 OPT=1 log /tmp/claude-0/mambo_run1.log pid 2473
Step 2: run1 done: RTP .96/.96 base hit 29.07 bonus median 44.0, 30-60x = 71%. copy /tmp/claude-0/pub_run1. Next: tiers check, tests, flatten tuning
Step 3: pytest 18 pass on run1 (tests adapted, tools/analyze.py written).
