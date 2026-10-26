# Q2: cost of the fallback pay rule, and whether to switch before the math freeze

Date 2026-10-26. Measurement and screening aid. NOT legal advice, NOT a clearance: a human IP attorney must read the claims. "Found nothing" is never "free to use". Reddit was not used (403 from this sandbox).
Tags: **[M]** measured here (proxy simulator or the real SDK, scripts in section 10). **[V]** Google Patents page fetched this session; the text passes through a summarising model and the USPTO PDF links returned 403, so no claim below is quoted from an official PDF (evidence "medium" at best). **[A]** engineering estimate. Evidence quality strong / medium / weak as in 01.

## 0. Bottom line
1. **Decision: keep the cluster rule for the math freeze; do not switch now.** Put two named-claim questions to counsel (section 8). Before the freeze, make the pay evaluator a config switch (about 0.5 day [A]) and pre-calibrate ONE non-adjacency fallback, pay-anywhere with per-symbol minimum counts, so a later switch costs about 5 to 8 working days [A] instead of a restart.
2. **New finding that changes 01 section 3.1 [V, medium].** Aristocrat US9558634B2 and its continuation US9886816B2 (priority 2012-08-08, Google "active", anticipated expiry 2033-08-07, 8th-year fees paid 2024-06-19 and 2025-07-24) have independent claims that, as summarised, pay when a group of at least THREE same "designated symbols" in display positions that share borders is formed. No "award based on quantity" element and no "no shared position" element is visible in them. 01 cited US9558634 only as a "Reel Power / 243 ways" snippet (S39): that is background text; the claims are adjacency groups. This is earlier, broader and longer-maintained than the 2014 family 01 flagged.
3. **Consequence for the fallbacks.** (a) shapes, (b) paths and (c) flat award all still pay a group of adjacent same symbols, so they stay inside that adjacency language; they re-tune cheaply but buy NO clear patent distance. Only (d) pay-anywhere and (d) ways drop adjacency. Pay-anywhere is the only one of the two that is affordable.
4. **Cost, measured [M].** With each paytable scaled so the natural base mean equals the cluster rule's (0.142x), the viable variants land close to the cluster rule on hit rate (14 to 21% vs 17.8%), base cv (3.5 to 4.5 vs 3.70), P(win > stake) (4.0 to 5.9% vs 4.33%) and bonus mean at the unchanged Mission Meter step (0.87x to 1.00x of the cluster's 37.9x). The pay table scale k is the price: flat x1.69, paths x1.34 to x1.72, shapes without the L x0.88, pay-anywhere x0.43.
5. **Where the real cost sits:** (i) uniform-threshold pay-anywhere and ways are not viable on these strips (hit 32 to 84%, meter step must fall to 0.3 to 2.2, i.e. the signature meter is switched off); (ii) the 02 layout package: pay-anywhere moves hit/mean by -80% to +2000% with board size and ways by up to +1266%, against -31% to +66% for cluster; tubes and hex only exist with adjacency; (iii) the 0.1x payout granularity breaks for shapes with the L (smallest pay 0.03x), pay-anywhere (0.04x) and ways (0.001 to 0.16x).
6. **Flip conditions (section 8):** counsel reads US9558634/US9886816 or US12094305 onto the min-5 cluster rule AND no licence or invalidity route exists. Then switch to pay-anywhere (calibration in section 3), accept the layout rework.

## 1. Method and validation
- Proxy engine = `docs/research2/02_gridsim.py` plus what Q2 needs: REAL strips BR0/FR0 and paytable, SDK stop windows and strip-going-upward refill, the real **Mission Meter** (free spins: start 1, +8 per winning step, cap 100, persists, retrigger on 3+ scatters of the FINAL board with the real table) and the real **bomb-timer wire** (8-cell self-avoiding path from reel 0, 1 cell burnt at reveal, +1 per winning step, one blast per spin on a dead board with 3+ burnt cells, burnt non-scatter cells vanish and refill, re-evaluation). Free-spin starts follow the weighted buy tiers (10/12/15/18/20 = 88.0/10.0/1.78/0.16/0.06%). Wincap 5000x applied to round totals.
- **Natural pool, not the weighted lookup table.** The published 96% comes from weights (hit 29.07%, trigger 1 in 200); the pay rule changes the natural pool the weights act on. The meter and wire do not change board dynamics, so each spin is stored as a list of raw step pays and the paytable scale k and meter step are applied afterwards (linear).
- **Iso-scaling.** k = cluster natural base mean / rule natural base mean. "Bonus at step 8" uses that k. s* = Mission Meter step that returns the cluster's bonus mean. Sample sizes: 400k base spins and 12k bonus rounds per rule (hit SE about 0.06 points; bonus mean SE about 2%); layouts 120k spins each.
- **Validation against the REAL SDK [M]** (scratch copy of `math/`, rejection filter off):

| Metric, 6x5 cluster | Real SDK | Proxy |
|---|---|---|
| base hit (non-trigger pool) | 17.74% (200k) | 17.8% (400k) |
| base mean / cv | 0.1415x / 3.69 | 0.142x / 3.70 |
| P(base win > 1x) | 4.33% | 4.33% |
| 10-spin bonus mean / cv / P(>100x) | 37.6x / 2.06 / 9.05% (8k, includes the forced-scatter board) | 36.6x / 2.00 / 9.25% (24k, free spins only) |
| wire: pays after a blast | 4.1% weighted (MATH_REPORT) | 4.7% natural |
- Evaluator cross-check: on 3000 random BR0 boards the proxy totals for cluster, per-symbol scatter pays and ways (3+ and 4+ reels) equal the SDK classes `Cluster`, `Scatter`, `Ways` with 0 mismatches (513 / 479 / 1906 / 2476 boards had a win). The layout run reproduces 02's cluster deltas within 2 points (e.g. 6x6 +25% / +33% vs 02 +25% / +32%; hex +94% / +170% vs +92% / +169%).
- **Not validated:** the path and shape evaluators have no SDK counterpart (unit-tested on constructed boards only); every non-cluster paytable shape is my heuristic; strips are NOT re-cut for any rule (a real ways or pay-anywhere design would re-cut them).

## 2. Rules simulated
| id | Rule as coded | SDK support |
|---|---|---|
| cluster | 5+ orthogonal, wild joins any payer, tiers 5 / 6-8 / 9-12 / 13+ (the real table) | built-in |
| c_flat | (c) same detection; award = the symbol's 5-cluster value at every size, size is only a gate | paytable edit only |
| path_any | (b) longest self-avoiding path of one symbol (+wild), >= 5 cells, repeat greedily, pays by length 5 / 6-7 / 8-9 / 10-12; only path cells vanish | custom evaluator |
| path_wire4 | (b) as above but the path must start on reel 0 (a "wire run"), min length 4 (min 5 gives 5.6% hit: not viable) | custom |
| shape_steep | (a) the critic's set: L-tetromino, T-tetromino, row of 4 (H or V), plus (5 cells); award = symbol value x 1 / 2 / 4 / 10; greedy non-overlap per symbol | custom |
| shape_noL | (a) T, row of 4, plus only (x1 / 2 / 6); added because the L alone is 0.30 placements per spin | custom |
| scatter_ps5 | (d) pay anywhere, per-symbol minimum count H1 6, H2 7, H3 8, H4 8, L1 9, L2 10, L3 10, L4 12 (5% binomial tail on 30 cells), wilds count for every symbol, tiers min / +2 / +4 / +8 | SDK `Scatter`, per-symbol keys are allowed |
| scatter8/9/10 | (d) same minimum for all symbols | SDK `Scatter` |
| ways3..6 | (d) SDK `Ways`: from reel 0, consecutive reels, product of per-reel counts; per-way pay = 5-cluster value x (1,3,9,27) | SDK `Ways`; it never sets `explode`, tumble marking is custom |

## 3. Base game, 6x5, natural pool, paytable scaled to the cluster's mean
"Win steps" = winning tumble steps per spin (and per winning spin); evaluations = steps + 1 dead board (+1 after a blast). "Smallest pay" = 0.1x (L4, lowest tier) times k. "Below stake" = wins under 1x as a share of winning spins.

| rule | hit % | win steps / spin (per hit) | raw mean x | k | smallest pay | base cv | P(>1x) % | below stake % | S>=4 % | blast % / pays after % |
|---|---|---|---|---|---|---|---|---|---|---|
| cluster | 17.8 | 0.20 (1.12) | 0.142 | 1.00 | 0.100 | 3.70 | 4.33 | 76 | 0.068 | 1.8 / 4.7 |
| c_flat | 17.8 | 0.20 (1.12) | 0.084 | 1.69 | 0.169 | 3.84 | 5.89 | 67 | 0.068 | 1.8 / 4.7 |
| path_any | 14.5 | 0.16 (1.09) | 0.106 | 1.34 | 0.134 | 4.22 | 4.31 | 70 | 0.067 | 1.2 / 3.9 |
| path_wire4 | 14.4 | 0.16 (1.09) | 0.083 | 1.72 | 0.172 | 4.49 | 4.60 | 68 | 0.066 | 1.2 / 6.6 |
| path_wire (min 5) | 5.6 | 0.06 (1.03) | 0.037 | 3.82 | 0.382 | 7.27 | 3.36 | 40 | 0.062 | 0.2 / 2.9 |
| shape_steep (L,T,I4,plus) | 33.8 | 0.42 (1.24) | 0.452 | 0.31 | 0.031 | 2.94 | 3.59 | 89 | 0.078 | 6.1 / 9.9 |
| shape_noL | 20.9 | 0.23 (1.12) | 0.161 | 0.88 | 0.088 | 3.71 | 5.10 | 76 | 0.066 | 2.1 / 6.1 |
| 5-cell shapes (I5,V5,T5,plus) | 3.8 | 0.04 (1.02) | 0.027 | 5.34 | 0.534 | 7.54 | 3.24 | 16 | 0.061 | 0.1 / 1.5 |
| scatter_ps5 | 16.5 | 0.19 (1.12) | 0.328 | 0.43 | 0.043 | 3.51 | 3.99 | 76 | 0.072 | 1.6 / 7.2 |
| scatter_ps (3% tail) | 11.3 | 0.12 (1.09) | 0.160 | 0.89 | 0.089 | 4.25 | 5.47 | 52 | 0.070 | 0.8 / 4.8 |
| scatter_ps8 (8% tail) | 29.6 | 0.39 (1.33) | 0.607 | 0.23 | 0.023 | 2.51 | 4.53 | 85 | 0.108 | 5.9 / 12.7 |
| scatter 10+ (all symbols) | 14.4 | 0.16 (1.11) | 0.048 | 2.96 | 0.296 | 3.88 | 5.23 | 64 | 0.081 | 1.4 / 3.5 |
| scatter 9+ | 31.9 | 0.41 (1.30) | 0.168 | 0.85 | 0.085 | 2.53 | 3.87 | 88 | 0.120 | 6.8 / 8.0 |
| scatter 8+ | 57.7 | 1.04 (1.81) | 0.637 | 0.22 | 0.022 | 1.79 | 1.70 | 97 | 0.301 | 23.7 / 16.9 |
| ways 6 reels | 30.6 | 0.37 | 0.890 | 0.16 | 0.016 | n/a | n/a | n/a | n/a | n/a |
| ways 5+ | 46.0 | 0.65 (1.41) | 3.758 | 0.04 | 0.004 | 2.68 | 3.03 | 93 | 0.142 | 12.6 / 13.5 |
| ways 4+ | 63.1 | 1.19 (1.88) | 16.41 | 0.01 | 0.001 | 2.39 | 2.65 | 96 | 0.298 | 26.9 / 26.0 |
| ways 3+ | 83.8 | 2.88 (3.44) | 95.3 | 0.001 | 0.0001 | 2.04 | 1.98 | 98 | 1.225 | 55.3 / 49.7 |

Reading [M]:
1. **The natural pool shape does not separate the viable rules.** cluster, c_flat, paths (any / from reel 0 with min 4), shape_noL and scatter_ps5 all give hit 14 to 21%, cv 3.5 to 4.5, P(>1x) 4.0 to 5.9%. Weighted references from MATH_REPORT: hit 29.07%, P(>1x) 10.8%, P(buy > 100x) 28.8%; the tables lift the natural figures by about 1.6x, 2.5x and 3x for every rule alike.
2. **Flat award (c) costs almost nothing in distribution** (cv 3.84 vs 3.70) because most clusters are size 5; the size ladder carries 40% of the base mean (k = 1.69) but little of the shape. It is a paytable edit (the SDK range keys (5,36) get one value).
3. **The L-tetromino breaks the critic's shape set**: 0.30 placements per spin, hit 33.8% (1.9x), 2.1x the tumble steps, k = 0.31 and 89% of wins below the stake. Without the L the set is a parity rule (20.9%, k = 0.88). 5-cell shapes alone hit 3.8%: not viable.
4. **Uniform-threshold pay-anywhere does not fit these strips.** L4 is 20% of cells, H1 5.8%: 8+ hits 57.7%, 10+ hits 14.4% but wins come almost only from low symbols. Per-symbol minimums (SDK keys are (count, symbol), so allowed) restore parity: scatter_ps5 hit 16.5%, cv 3.51.
5. **Ways cannot reach a 0.1x granularity on this grid.** With 5 rows x 6 reels the product of counts makes the natural mean 3.8x to 95x at the 5-cluster values; matching 0.142x needs a per-way pay of 0.0001 to 0.016x. Even 6-reel-only ways needs 0.016x. A viable ways game needs re-cut strips and fewer rows (outside this question).
6. **Winning spins below the stake** are 76% for the cluster rule; shapes with the L, ways and 8+/9+ pay-anywhere push it to 85 to 98%: more small celebrated wins (a responsible-gaming wording issue, not a patent one).
7. **Natural trigger (S>=4 on the FINAL board) rises with tumble steps** (0.068% cluster, 0.12% scatter 9+, 0.30% ways 4+, 1.2% ways 3+) because scatters stay and refills add more. The table pins 1 in 200 anyway, but retrigger odds follow (section 4).

## 4. Free spins: bonus, Mission Meter, wire (6x5, start mix as the buy)
Columns "at k, step 8" use the base-matched k and the unchanged meter. s* is the step that restores the cluster bonus mean (37.9x natural). Cluster natural references: floor rejection = share of rounds under 30x.

| rule | spins / round | spins with a win % | win steps / round | rounds at cap x100 % | mean at k, step 8 (ratio) | cv | P(>100x) % | under 30x % | s* | cv at s* | P(>100x) at s* % |
|---|---|---|---|---|---|---|---|---|---|---|---|
| cluster | 13.7 | 24 | 3.6 | 0.6 | 37.9 (1.00) | 1.97 | 9.7 | 67 | 8.0 | 1.97 | 9.7 |
| c_flat | 13.7 | 24 | 3.6 | 0.6 | 33.1 (0.87) | 2.03 | 8.1 | 72 | 9.3 | 2.01 | 10.0 |
| path_any | 13.5 | 20 | 2.9 | 0.2 | 33.1 (0.87) | 2.10 | 8.2 | 72 | 9.3 | 2.08 | 9.9 |
| path_wire4 | 13.3 | 18 | 2.7 | 0.1 | 35.7 (0.94) | 2.21 | 9.6 | 73 | 8.6 | 2.21 | 10.3 |
| shape_steep | 14.2 | 40 | 7.0 | 9.3 | 67.4 (1.78) | 1.65 | 19.3 | 51 | 4.2 | 1.84 | 8.7 |
| shape_noL | 13.6 | 26 | 3.9 | 1.1 | 37.9 (1.00) | 2.05 | 9.7 | 69 | 8.0 | 2.05 | 9.7 |
| scatter_ps5 | 14.2 | 18 | 2.9 | 0.5 | 37.0 (0.97) | 2.17 | 10.0 | 71 | 8.2 | 2.17 | 10.3 |
| scatter_ps (3% tail) | 13.6 | 13 | 2.0 | 0.1 | 23.9 (0.63) | 2.58 | 5.9 | 80 | 13.3 | 2.54 | 10.3 |
| scatter_ps8 | 15.9 | 34 | 7.2 | 12.9 | 99.3 (2.62) | 1.65 | 27.7 | 44 | 2.6 | 2.00 | 9.1 |
| scatter 10+ | 14.0 | 22 | 3.4 | 0.7 | 51.3 (1.35) | 2.07 | 13.9 | 62 | 5.8 | 2.10 | 9.5 |
| scatter 9+ | 16.3 | 41 | 8.2 | 16.8 | 114.9 (3.03) | 1.53 | 31.0 | 37 | 2.2 | 1.92 | 9.0 |
| scatter 8+ | 27.3 | 65 | 29.4 | 71.0 | 318 (8.39) | 1.34 | 64.0 | 12 | 0.3 | 2.82 | 8.4 |
| ways 5+ | 16.2 | 45 | 10.5 | 27.2 | 132 (3.47) | 1.47 | 36.8 | 32 | 1.8 | 2.06 | 8.6 |
| ways 4+ | 20.1 | 62 | 22.9 | 68.4 | 219 (5.77) | 1.23 | 56.5 | 16 | 0.6 | 2.30 | 8.5 |
| ways 3+ | 70.0 | 81 | 169.8 | 98.4 | 806 (21.2) | 1.46 | 79.4 | 4 | 0 (cannot match) | 2.64 | 13.2 |

Reading [M]:
1. **Mission Meter.** The meter is what pays the bonus (78.7% of bonus RTP at x20+ in the weighted math), so winning steps per round is the variable that matters: 3.6 for the cluster rule. A rule with 2x the steps (shapes with the L: 7.0, 9.3% of rounds at the x100 cap) needs step 4.2; rules with 8 to 170 steps per round need 0.3 to 2.6, i.e. the "+8 per win" signature is gone. Parity variants keep step 8.0 to 9.3.
2. **Wire.** Blasts need two winning steps before a dead board, so they track chain length: 1.8% of base spins for the cluster rule, 6.1% for shapes with the L, 0.8 to 1.6% for pay-anywhere, 1.2% for paths. A blast pays in 4 to 7% of cases for the parity rules (9.9% shapes). The wire stays decorative everywhere except in the shape rule; pay-anywhere neither helps nor hurts it. An anchored path (reel 0) rhymes with the wire's start but changes no number.
3. **Retrigger.** Scatters accumulate during tumbles, so rules with long chains retrigger a lot: spins per round 13.7 (cluster) vs 27 (scatter 8+) and 70 (ways 3+). Parity rules stay within 13.3 to 14.2.
4. **Buy floor.** The 30x floor rejects 67% of natural rounds for the cluster rule (about 3 attempts per book, 08); at s* the parity rules reject 67 to 73%, so book-generation time stays within about +10% [M, A].
5. **Variance of the bonus.** At s* the bonus cv is 1.97 (cluster) vs 2.05 to 2.21 for the parity rules, 2.54 for the 3%-tail pay-anywhere, and the tail P(>100x) stays 9 to 10%: no rule changes the shape of the buy distribution by itself; the reweighter (lambda about 0.0006) can follow as long as the natural mean is near the target.

## 5. Layout deltas against 02 (hit % / mean change vs the same rule on 6x5; no wire, meter x1)
| layout (cells) | cluster | c_flat | path_any | path_wire4 | shape_steep | scatter_ps | ways 5+ |
|---|---|---|---|---|---|---|---|
| 6x4 (24) | -26 / -31 | -26 / -29 | -26 / -31 | -25 / -28 | -21 / -28 | -80 / -78 | -47 / -77 |
| 6x6 (36) | +25 / +33 | +25 / +31 | +26 / +33 | +23 / +28 | +19 / +29 | +203 / +291 | +46 / +276 |
| 6x7 (42) | +49 / +66 | +49 / +63 | +50 / +66 | +46 / +56 | +37 / +58 | +480 / +2000 | +78 / +1266 |
| corners cut (26) | -15 / -16 | -15 / -15 | -17 / -18 | -34 / -38 | -17 / -18 | -66 / -66 | -25 / -63 |
| 4 interior holes (26) | -63 / -66 | -63 / -61 | -64 / -66 | -65 / -66 | -50 / -52 | -62 / -60 | -45 / -70 |
| 8 cols x 4 (32) | +6 / 0 | +6 / 0 | +7 / +2 | -25 / -25 | +8 / +5 | +53 / +60 | -46 / -73 |
| 4 cols x 8 (32) | +7 / +9 | +7 / +13 | +5 / +7 | +67 / +74 | +5 / +10 | +40 / +33 | none (<5 reels) |
| 2 tube pairs (30) | +24 / +37 | +24 / +31 | +21 / +32 | +21 / +33 | 0 (ignored) | 0 | 0 |
| hex adjacency (30) | +94 / +170 | +94 / +147 | +125 / +253 | +100 / +217 | n/a | 0 | 0 |
Reading [M]:
- The cluster rule absorbs layout change (one row = +25% hit, +33% mean). Pay-anywhere and ways are 4 to 20 times more sensitive because counts and products scale with cell number: every Floor Plan layout would need its own threshold or pay table. 02's "neutral by construction" layout mix (point 4 of its section 3) does not carry over.
- With pay-anywhere, interior holes cost no more than edge cuts (-62% vs -66%: only the cell count matters) but a 4-row board loses 80% of hits.
- **Concepts C3 Pneumatic Post (tubes) and C7 Honeycomb (hex) exist only with adjacency**; they survive (a) to (c) for paths and flat award, not for shapes (tubes ignored) and not for (d).
- Mission Select grids with 4 reels (4x8) are impossible under 5+ reel ways.

## 6. Re-tuning effort [A]
Grounded in: `game_executables.get_clusters_update_wins` is the single call site (`win_type` in game_config.py is set but never read); SDK `Scatter` and `Ways` exist; winInfo carries a position list and the renderer draws `outlinePath(cells)` for any cell set (`frontend_mambo/src/render/index.js:339-368`), so no event change; 08 timings (full pipeline about 35 min, reweight 1.8 s, tests 101 s, 15 s per 2000-book calibration sample).
| option | math code | table / strips | meter, wire | optimizer, books | front end | total, risk |
|---|---|---|---|---|---|---|
| keep cluster | none | none | none | none | none | 0; patent question open |
| (c) flat gate | paytable edit | k 1.69, smallest pay 0.17x | step 8 to 9.3 | one full run + reweight | rules text | 1 day; low; no relief |
| (b) path | evaluator about 100 lines + brute-force test | k 1.34 (any) / 1.72 (reel 0, min 4) | step 9.3 / 8.6 | same | optional path highlight | 4 to 6 days; medium |
| (a) shapes without L | placement tables per layout, greedy rule | k 0.88, smallest pay 0.088: round to 0.1x and re-measure | step 8 | same | shape badge | 4 to 6 days; medium. With the L: +2 days (pays 0.03x, step 4.2) |
| (d) pay-anywhere, per-symbol minimums | SDK `Scatter` (explode already set) | k 0.43: rebuild the table around the 0.1x floor; thresholds per layout | step 8.2 | same; floor rejection 71% vs 67% | counter badge, disjoint outlines | 5 to 8 days + 1 to 2 days per layout; medium-high |
| (d) ways | custom explode/tumble marking | strips redesign; 0.1x impossible at 6x5 | step 0.6 to 1.8 | same | rework | 10 to 15 days or more; high |
Switching AFTER the freeze adds about 1 to 2 days for books, hash and regression (bonus books 10 to 11 min per 100k on 4 threads, 08); it does not multiply the above.

## 7. Patent proximity of the fallback rules (screening, not an opinion)
Google's status and dates are Google's assumptions. "Claims" = what the summariser showed.
| rule | closest documents | claims visible? | tag |
|---|---|---|---|
| all adjacency rules ((a),(b),(c) and cluster) | **US9558634B2 / US9886816B2**, Aristocrat, priority 2012-08-08, active to 2033-08-07 (fees paid 2024, 2025). Claim 1 / 11 / 21 / 31 (and 1 / 8 / 15): first position shows a designated symbol; surrounding positions sharing common borders also show it; third positions likewise; group displays at least three designated symbols: credit balance increased, payout made. Dependent: 6 (pays for 3 up to 3+N), 7/8 (positions with 3 or 4 shared borders), 10 (position = reel). "Designated symbol" = any pay-table symbol; the wild is not recited. Citing families: two Ainsworth documents. [V] | yes, claims 1 to about 22 of 31 and all of 9886816's independents | ATTORNEY HIGH |
| cluster, (c) | **US12094305B2** (priority 2014-09-29, est. expiry 2035-09-29) claim 1: every position adjacent to at least one other, no display position shared by multiple winning clusters, award based on the quantity of the same symbol. The siblings US10964173, US11468746, US12536877 as in 01. [V] | claim 1 yes (in segments); independents 11 and 16 not read | ATTORNEY HIGH; (c) has a textual argument on "award based on quantity" for THIS family only, none for 9558634 |
| (a) shapes | adjacency families above. Shape-specific: US6604999 Aristocrat (T, cross, tick shaped paylines in the description; claim 1 is a payline using fewer columns; priority 2000-07-28, expired 2021-07-18 per Google); US6336860 (dice patterns, expired 2019); CA2277547 pattern-based award (snippet only) [V/S] | US6604999 claims 1-14 fully; others no | ATTORNEY HIGH (adjacency); shape-specific art looks old |
| (b) paths by length | adjacency families above. US7785191 IGT/PTT "Power Pays" contiguous symbols, priority 2000-08-28, expired 2025-06-14, claims not visible; US20200226884 King Show Games, path continuity with passing/blocking indicators, abandoned, claims 1/11/17 visible and a different mechanic; US9633511 IGT, random path populates symbols, award from the positions included, active to 2032-09-27, claims not visible [V] | partly | ATTORNEY HIGH (adjacency) |
| (d) pay-anywhere | No patent found whose claims read on a count-threshold pay-anywhere plus tumble (negative result, weak). WMS US8152623 (priority 2004-06-18, active to 2028-05-29) only acknowledges that scatter pays in any visible position are known; IGT US7740536 (active to 2027-11-06) claims player-picked areas, not ours. Widely marketed by others (Gates of Olympus, Sugar Rush, Starlight Princess per trade pages) [V/S] | yes for 8152623/7740536 | ATTORNEY MEDIUM; unscreened beyond this |
| (d) ways | **IGT US8562416B2** (priority 2005-08-26, adj. expiry 2032-04-21): independents 1, 5, 10, 15, 20, 24; wagered-on symbol positions, adjacent reel columns forming a string of related symbols, claim 24 a wager-dependent active-position set; **US8012011B2** (same priority, 2028-12-02) claims not reachable (page 390k characters); **US11954977B2** (priority 2021-09-20, 2041-09-20) independents 1/9/13 recite a RANDOM quantity of active positions and ways from it. A fixed all-positions-active ways game is not literally these, but claim 20 of 8562416 ("wagered on symbol positions", adjacent columns) may read on all-ways wagering. Atronic US7347777 (selectable ways) expired 2025-08-14, claim 1 is a player-designated position. [V] | 8562416 and 11954977 yes; 8012011 no | ATTORNEY MEDIUM-HIGH |
Also unread and flagged for counsel (tumble side, not Q2): Aristocrat US8771055B2 (priority 2010-08-10, adj. expiry 2032-01-04): claim 1 begins with several sets of symbols and "repeatedly apply a modification rule ... until no winning combination remains" (cut off).
Validity pointers only: the 47 citations listed on US9558634 include IGT US8012011 and Japanese "same symbols adjoin" documents but, in the list read, not IGT/PTT Power Pays US7785191 or US7744458 (contiguous-symbol awards, priority 2000). Whether that matters is for counsel.

## 8. Decision and gates
**Keep cluster for the freeze** because: (1) the three adjacency fallbacks cost 1 to 6 days but give no claim distance from US9558634/US9886816 (and only an arguable one from US12094305 for (c)); (2) the two non-adjacency fallbacks cost 5 to 15 days, break the 02 layout package and carry their own unscreened exposure; (3) the cluster rule is the only rule whose numbers are already in the SDK, the optimizer and the front end; (4) switching later is bounded (section 6).
**Do before the freeze (cheap):** (i) config switch for the evaluator in `game_executables.py` (about 0.5 day); (ii) keep layout thresholds/pay tables parameterised per layout; (iii) one calibration pass of scatter_ps5 on the real SDK (1 to 2 days) so the fallback is measured, not estimated; (iv) never celebrate wins below the stake (76% of natural wins).
**Questions for counsel (name the claims):**
1. Do claims 1/11/21/31 of US9558634 and claims 1/8/15 of US9886816 (group of at least three same designated symbols sharing borders, credit increase) read on a min-5 orthogonal cluster with wild substitution, on a path, a plus/T/row shape, and a flat-award gate? Validity over Power Pays (US7785191) and the cited art; licence terms (Aristocrat licensed Ainsworth in 2026, 01).
2. Same for US12094305 claim 1 and independents 11/16: does a wild shared by clusters of two symbols avoid "no position shared", does a flat award avoid "based on the quantity"?
3. Is a fixed 6x5 ways or per-symbol pay-anywhere game outside US8562416, US8012011, US11954977 and the cluster claims, in the target markets (EP, AU, GB, CA not checked)?
**Switch triggers:** counsel says (1) or (2) reads on us AND no licence or invalidity route within the freeze window -> pay-anywhere (scatter_ps5 minimums, k about 0.43 rebuilt around the 0.1x floor, step about 8.2, per-layout thresholds, drop tubes/hex). Do not use (a), (b), (c) as a patent response.

## 9. Limits and what was not done
- Proxy, unweighted pool; weighted RTP/hit per rule needs the real optimizer (not run: 35 min per rule, and it would be rule-specific work).
- Paytables for non-cluster rules are my heuristics scaled by one factor; the 0.1x rounding of every entry is not simulated; strips untouched.
- Path DFS is budgeted (40k nodes, length cap 12); greedy repeat; shapes use greedy non-overlap. No SDK counterpart to validate them.
- Layout runs have no wire or meter, one pass of 120k spins; 8-column layouts reuse strips 0 and 1 as in 02.
- Patents: summaries of Google pages, claims 23 to 31 of US9558634 only partly seen, US8012011 and US9633511 claims unreachable, no official PDFs (403), no EP/AU/GB/CA, no maintenance or litigation docket check beyond Google's legal-event list, no search for Pragmatic/Push/Hacksaw filings (absence proves nothing).
- Correction to carry into 01: S39 (US9558634 as Reel Power) and section 3.1 (add the 2012 family).

## 10. Reproduce
```
# scratch copy of math/ without library/ for the SDK runs; repo venv python
MAMBO_SDK_COPY=<copy> math/env/bin/python docs/research2/gap_02_Q2_sdk_check.py natural base 200000
MAMBO_SDK_COPY=<copy> math/env/bin/python docs/research2/gap_02_Q2_sdk_check.py natural bonus 8000
MAMBO_SDK_COPY=<copy> math/env/bin/python docs/research2/gap_02_Q2_sdk_check.py xcheck 3000
RULES=cluster,c_flat,path_any,path_wire4,shape_steep,shape_noL,scatter_ps5,ways5 python3 docs/research2/gap_02_Q2_rules_sim.py main 400000 12000 main.pkl
RULES=cluster,c_flat,path_any,path_wire4,shape_steep,scatter_ps,ways5 python3 docs/research2/gap_02_Q2_rules_sim.py layout 120000 layout.pkl
python3 docs/research2/gap_02_Q2_analyse.py main.pkl layout.pkl
```
(`MAMBO_REELS` overrides the strip directory; `LAYOUTS="6x5 (30)|2 tube pairs (30)"` limits layouts; path rules were re-run for tubes after a patch, see the source.)

## 11. Sources
Patent pages (patents.google.com, fetched this session through a summariser; claims as summarised):
- US9558634B2 https://patents.google.com/patent/US9558634B2/en ; US9886816B2 https://patents.google.com/patent/US9886816B2/en
- US12094305B2 https://patents.google.com/patent/US12094305B2/en (claims at offset 100000)
- US8562416B2 https://patents.google.com/patent/US8562416B2/en (claims at offset 280000); US8012011B2 https://patents.google.com/patent/US8012011B2/en ; US11954977B2 https://patents.google.com/patent/US11954977B2/en (claims at offset 200000)
- US7347777B2 https://patents.google.com/patent/US7347777B2/en ; US7740536B2 https://patents.google.com/patent/US7740536B2/en ; US8152623B2 https://patents.google.com/patent/US8152623B2/en
- US7785191B2 https://patents.google.com/patent/US7785191B2/en ; US6604999B2 https://patents.google.com/patent/US6604999B2/en ; US6336860B1 https://patents.google.com/patent/US6336860B1/en
- US20200226884A1 https://patents.google.com/patent/US20200226884A1/en ; US9633511B2 https://patents.google.com/patent/US9633511B2/en ; US9349241B2 https://patents.google.com/patent/US9349241B2/en ; US8771055B2 https://patents.google.com/patent/US8771055B2/en
Search snippets only (weak): Pragmatic pay-anywhere titles https://focusgn.com/pragmatic-play-fires-up-viking-forge , https://europeangaming.eu/portal/latest-news/2023/10/30/146232/pragmatic-play-fires-up-viking-forge/ ; CA2277547 https://brevets-patents.ic.gc.ca/opic-cipo/cpd/eng/patent/2277547/summary.html ; USPTO PDF links (all 403): https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/9558634
Repo: `math/games/agent_mambo/{game_config,game_executables,gamestate,game_override,MATH_REPORT,PROGRESS}`, `math/src/calculations/{cluster,scatter,ways,tumble,board}.py`, `docs/research2/{01_patent_zones,02_gridsim.py,02_variable_grids,08_sdk_feasibility}`, `frontend_mambo/src/render/index.js`, scripts `docs/research2/gap_02_Q2_{rules_sim,analyse,sdk_check}.py`.
