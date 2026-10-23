# SWOT 1 - Math and player attractiveness (The Unleashed Mine)

Method: weighted stats from `library/publish_files/lookUpTable_{base,bonus}_0.csv` (payout column is x100), bonus flag from `library/lookup_tables/lookUpTableSegmented_base.csv`, 20 000 simulated sessions per row sampled by book weight (numpy).

## Measured baseline
| Metric | Measured | Norm |
|---|---|---|
| RTP base / buy | 96.000 % / 96.000 % | 96 |
| Hit frequency | 29.1 % (but 12 % of spins pay under 1x) | 25-35 % |
| Bonus frequency | 1 / 200.5 spins (MATH_REPORT's 1/230 is stale) | 1/120-200 |
| Natural bonus mean / median | 74.4x / 68.1x | 80-150x |
| Natural bonus P10 / P90 / P99 | 31 / 116 / 198x | - |
| Bonus share of RTP | 37 pts (base game 59 pts) | 50-70 |
| Std dev per spin | 6.7x | - |
| Win >= 100x / >= 1000x / 5000x | 1 per 1 100 / 1.13 M / 5 M spins | - |

Base sessions (1x bet):
| Spins | End above start | Median net | P10 / P90 | Saw bonus |
|---|---|---|---|---|
| 100 | 33.7 % | -29.6 | -53 / +74 | 39 % |
| 300 | 37.7 % | -31.6 | -127 / +121 | 78 % |
| 1000 | 37.4 % | -62.6 | -272 / +212 | 99 % |

Buy (100x): 83.4 % of buys return under 100x; quantiles P5/25/50/75/90/99 = 30.7/34.4/39.9/46.3/266/807x; 12.4 % reach 200x+, 0.33 % reach 1000x+. Ten buys: 39 % end above start, median net -145 bets.

## Strengths
- RTP exact 96.000 % in both modes; payouts multiples of 0.1x; 2 modes; cap 5000x in both (`game_config.py:36,114,168`).
- Hit frequency 29.1 % and bonus every ~200 spins are in the norm; 39 % of 100-spin and 78 % of 300-spin sessions see a bonus.
- Readable paytable ladder: H1 5x to 60x, L4 0.1x to 4x, four tiers (5, 6-8, 9-12, 13-36), steep jump at 13+ (`game_config.py:30-65`).
- Veins give instant feedback: first hit takes a cell from 4x to 10x (`game_config.py:91-94`, `game_executables.py:20-31`). Wild exists only in free-spin reels (FR0 3.3 %, BR0 0 %), so the bonus feels richer; retrigger needs only 3 scatters.
- Buy has a hard floor (min payout 30.0x): no dead buys.

## Weaknesses (with change)
1. Natural bonus too small: mean 74x vs 80-150x; 99 % end below 198x; bonus is only 37 % of RTP. Change: `game_optimization.py:26-29`, `basegame` rtp 0.589 to ~0.50, `freegame` rtp 0.37 to ~0.46. Expect mean ~92x, hit rate down 1-2 pts. Risk: optimizer not reproducible; re-verify RTP and cap.
2. Thin tail: only 1 % of bonuses reach 200x, 0.2 % reach 500x. Change: scaling rows `freegame` (150,500) x1.4 and (500,2000) x1.3; wincap quota 0.001 to 0.003 (`game_config.py:77`). Expect 200x+ bonuses ~3 %, 5000x about 1/1.7 M. Risk: higher variance, lower median.
3. Buy is a grey slab: 81.6 % of buys land 30-60x for 100x; median 39.9x, below the natural bonus median (68x). RTP honest, feel harsh (lose ~60 % on 83 % of buys). Change: `fgfloor` scaling (60,100) x0.5 and (100,200) x1.5, floor 30 to 20 (`game_config.py:92`, `game_optimization.py:73-96`). Target median 55-60x, 20-25 % of buys >= 100x. Risk: the "30x guaranteed" claim weakens.
4. False wins: 12 % of spins pay 0-1x (0-0.5x: 6.4 %, 0.5-1x: 5.6 %) while 1-2x is 4.4 %. Change: L3/L4 5-clusters 0.2/0.1 to 0.3/0.2 (`game_config.py:49-60`), re-optimize. Expect fewer sub-1x, more 1-2x. Risk: hit rate shifts.
5. Vein cap 512 is unreachable (85 hits per cell), so escalation is flat after the first hits; excitement comes from the 4x start only. Change (needs sim): start 3, step 8, cap 256. Risk: shifts RTP, full re-solve.
6. Max win unreachable in practice (1000x at 1 per 1.13 M spins); change 2 addresses it.

## Opportunities
- Changes 1-3 are optimizer-only, no reel edits.
- Base-game wild (1-2 % in BR0) for bigger clusters and marketing.
- Add buy median and share >= 100x to `tests` next to the 35x threshold.

## Threats
- Optimizer non-reproducible (MATH_REPORT): each change can drift the distribution.
- Regulators: 83 % of buys under price plus "30x floor" wording can mislead.
- Poor sessions: median net -30 at 100 spins; 22 % of 300-spin players never see a bonus.
- Tail boosts lower the hit rate and median; the 7 tests may break.

## Top 5 by gain per effort
1. Shift RTP base to bonus (0.589/0.37 to 0.50/0.46): 2 numbers, bonus mean 74x to ~92x.
2. Buy reshaping (floor 20x, scaling 60-200x): median 39.9x to ~55x.
3. Tail scaling 150-2000x on natural bonus: 200x+ bonuses 1 % to ~3 %.
4. Wincap quota 0.001 to 0.003: 5000x from 1/5 M to ~1/1.7 M.
5. L3/L4 pay lift to cut sub-1x false wins. Vein rework is last (largest feel gain, full re-solve).
