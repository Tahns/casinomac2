# Agent Mambo: math report

Measured on the published files `library/publish_files` (100 000 books per mode, weighted by the lookup tables). Tests: `../../env/bin/python -m pytest tests -q` (18 pass), SDK `tools/final_checks.py` (execute_all_tests) passes. Game id `agent_mambo`, re-theme of `the_unleashed_mine` (left untouched as the fallback).

## Rules
- 6 reels x 5 rows, cluster pays (5+ adjacent), tumble, wild W substitutes (not scatter S). Wilds only come from the reel strips (BR0 3 per reel, FR0 4 per reel); no mechanic creates a wild.
- Scatters: 4+ trigger free spins 4 -> 10, 5 -> 12, 6 -> 15, 7 -> 18, 8 -> 20 (9+ pay as 8). Retrigger with 3+: 3 -> 5, 4 -> 8, 5 -> 10, 6 -> 12, 7 -> 15, 8 -> 18.
- **Global multiplier meter** (free spins only, `gm_start=1`, `gm_step=8`, `gm_cap=100` in `game_config.py`): starts at x1 when the feature starts; each winning tumble step (also the one after a wire blast) is paid with the CURRENT value, then the value rises by 8 (capped at 100) and `updateGlobalMult` is emitted. It persists over all spins and retriggers of the feature. Base game: always x1. No per-cell multiplier any more.
- **Bomb-timer wire** (`fuse_params`: 8 cells, 1 lit at reveal, +1 per winning step, blast if >= 3 burnt, base and free spins): a self-avoiding path from reel 0. On a dead board with >= 3 burnt cells the burnt non-scatter cells VANISH, new symbols drop in (`fuseBlast`, `tumbleBoard`) and the board is evaluated again; otherwise `fuseFizzle`. Scatters are untouched, no wild is created.
- Two modes: base (cost 1) and bonus (cost 100, direct entry). Wincap 5000x both. Payouts are multiples of 0.1x.

## Results
| Mode | Cost | RTP | Max win (odds) | Hit rate | Median |
|---|---|---|---|---|---|
| base | 1x | 96.000 % | 5000x (1 / 5 000 002) | 29.07 % | 0x |
| bonus | 100x | 96.000 % | 5000x (1 / 50 000) | 100 % (floor 30x) | 64.1x |

Free-spin trigger from the base game: 1 spin in 200 (0.500 %). Mean free spins played per purchase: 17.2 (retriggers are frequent: a 10-spin start plays 17 on average).

### Starting free spins in UNLEASH (buy), weighted
| Spins | 10 | 12 | 15 | 18 | 20 |
|---|---|---|---|---|---|
| Share | 87.999 % | 10.001 % | 1.780 % | 0.161 % | 0.059 % |

### Base distribution (tools/buckets.py)
| Win | Spins | RTP points |
|---|---|---|
| 0x | 70.93 % | 0 |
| 0-1x | 18.3 % | 9.3 |
| 1-2x | 2.7 % | 3.1 |
| 2-5x | 3.5 % | 11.6 |
| 5-10x | 3.15 % | 22.4 |
| 10-20x | 0.96 % | 12.9 |
| 20-40x | 0.060 % | 1.9 |
| 40-60x | 0.104 % | 5.2 |
| 60-100x | 0.213 % | 16.5 |
| 100-200x | 0.066 % | 8.7 |
| 200-500x | 0.014 % | 3.9 |
| 500x+ | 0.001 % | 0.5 |
(the 40-200x part is the free-spin triggers; non-trigger base wins stay under about 20x.)

### Buy distribution (UNLEASH, cost 100x)
| Win | Buys | RTP points |
|---|---|---|
| 30-40x | 20.0 % | 6.9 |
| 40-60x | 26.1 % | 12.8 |
| 60-100x | 25.1 % | 19.3 |
| 100-200x | 19.6 % | 27.0 |
| 200-500x | 8.25 % | 23.7 |
| 500-1000x | 0.86 % | 5.5 |
| 1000-2000x | 0.057 % | 0.7 |
| 5000x | 0.002 % | 0.1 |
30-60x: 46.1 % of buys (target <= 60 %; mining math: 76 %); 60-300x: 50 %; 300x+: 3.8 %. Median 64.1x (>= 40x). Mean 96x.

### Multiplier meter statistics (bonus, weighted)
- Share of buys whose meter reaches x25 / x50 / x100 (cap): 99.2 % / 31.8 % / 1.8 %.
- Mean highest meter by payout class: under 100x: x41.7; 100-500x: x64.6; 500x and more: x95.0. 78.7 % of the RTP of the mode is paid at a meter of x20 or more, so the tail comes from the meter.
- Free spins have a win in 30.5 % of the cases; winning steps in one spin: 1 step 26.8 %, 2 steps 3.2 %, 3 steps 0.45 %, 4+ 0.04 % (longest 11). Long chains are rare, the high meter comes from many winning spins, not from one chain.
- Highest meter reached (share of buys): x17 0.8 %, x25 7.1 %, x33 18 %, x41 23 %, x49 19 %, x57 12 %, x65 7.7 %, x73 4.6 %, x81 2.7 %, x89 1.7 %, x97 1.1 %, x100 1.8 %.

### Wire statistics
- Base spins: wire burns (>= 1 `fuseBurn`, i.e. what the front end draws) 28.6 %; reaches >= 3 burnt and blasts 5.9 %; fizzle on all others.
- Free spins (weighted by buys): burns 30.5 %, blasts 3.7 %.
- A blast removes 3 cells in 81 % of cases (4: 12 %, 5+: 2 %), and only 4.1 % of base blasts (5.0 % in free spins) are followed by a paying re-evaluation.

### Sessions from the base table (100 000 sessions, bet 1, no bonus buy)
| Spins | Ends above start | Median net | Mean net | 10th / 90th percentile | Lost over half |
|---|---|---|---|---|---|
| 100 | 32.9 % | -26.8 | -4.4 | -59 / +75 | 21.0 % |
| 300 | 37.1 % | -35.5 | -12.1 | -133 / +136 | 5.0 % |

## What changed versus the mining math, and why
1. Veins (per cell, x3 / +3, cap 512) -> one global meter. Wins no longer depend on cell memory (patent screen: per-position persistence was a risk zone). Step 8 was chosen because it makes the natural mean of a 10-spin buy (about 100x) match the 96x target: step 5 gave 82x, step 1 only 50x (needs a heavy upward re-weighting, i.e. a fatter tail). Cap 100 is reached by 1.8 % of buys.
2. Fuse Line (burnt cells become wild) -> bomb-timer wire (burnt cells vanish). Same path rules. No wild creation. The blast is a weak source of wins (see above), so the wire is mostly a spectacle: in the mining math the wild blast fed the tail, here the meter does.
3. Base strip BR0 got 3 wilds per reel (0 before). Without the wild-creating blast the base game had no 5-20x wins (natural mean 0.47x, p99 2.3x, max 5.4x in 23 000 spins); with 3 wilds: mean 0.79x, p99 5.0x, 10-20x wins 0.96 % of spins.
4. Buy weights are NOT produced by the Rust optimizer any more (`tools/reweight_bonus.py`, run automatically by `run.py`). Reason: the optimizer builds gaussian mixtures with a forced low bump (x150 on [floor, mean/2]) and puts about 70-75 % of the buys at 30-60x whatever we tried: mean-to-median bounds 1.6-3 instead of 4-8, distribution bias towards 60-300x, pmb_rtp 1.3, window scales (30,40) x0.7, test_spins up to 20 000 (too slow, aborted after 22 min). The natural pool of books has only about 40 % at 30-60x. The reweighting keeps the natural shape: a pinned share per scatter tier, one exponential tilt exp(-lambda * win) (lambda = 0.00058, mild), P(5000x) pinned to 1/50 000, lambda solved so that RTP = 96.000 %. Weights are integers (scale 1e15). The shape is then set by the game parameters (step, cap, floor, strips), which is what a designer can reason about. The base mode still uses the Rust optimizer.
5. Result for the buy shape: 46 % at 30-60x instead of 76 %; median 64x instead of 42.6x.

## Weak points (honest)
- 69.5 % of free spins pay nothing (strips unchanged), so the meter climbs slowly and a buy of 10 spins is decided by how many winning spins happen. About 70 % of the 100x buys return less than 100x; the minimum is 30x.
- Meter steps of 8 (x1, x9, x17...) look odd and the first winning step of the feature is always paid at x1; a smaller step needs a heavier tail (or more free-spin hits) to keep 96 %.
- The blast pays rarely (4-5 %): it is mostly a cosmetic event. Larger blasts (burn 2 cells per step) would pay more but change the agreed path rules.
- Base: 10-40x wins are rare (1 % of spins), the 40-200x band is the free-spin triggers; non-trigger base wins stay small.
- Retriggers are frequent (17.2 spins played from 10), which makes the "10 / 12 / 15 spins" tiers less distinguishable than their shares suggest.
- The Rust optimizer (base) is not reproducible: regenerating can move the base shape slightly. The bonus weights are deterministic given the books.
- Books are 316 MB (bonus, zst).

## Regenerate
```
cd math/games/agent_mambo
python3 tools/make_reels.py                        # strips (BR0 W count via BRW, default 3)
OPT=1 ../../env/bin/python run.py                  # sims + Rust optimizer (base) + reweight_bonus + SDK checks (about 35 min)
../../env/bin/python -m pytest tests -q
../../env/bin/python tools/analyze.py              # meter / wire / session statistics
../../env/bin/python tools/make_fixtures.py        # frontend_mambo/fixtures
```
Memory: batching_size 6250 (1e5 bonus books were OOM-killed with larger batches). `SIMS=0 FORCE_REWEIGHT=1 python run.py` re-applies only the bonus reweighting.
