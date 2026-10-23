# The Unleashed Mine: three original feature proposals (design only)

Status: design proposal. No code was edited. **Nothing here is legally cleared; every mechanic is flagged for an IP attorney.** Prototype: `/tmp/claude-0/-home-user-casinomac2/7b6d4e3c-4140-541e-8b57-6588f412d4ca/scratchpad/proto.py` (outputs `out1.txt`, `out2.txt`, `out3.txt` in the same folder).

## How the numbers were measured
Standalone Python cascade (6x5, orthogonal clusters of 5+, wild joins any payer, same paytable, gravity and refill, win cap 5000x). Refill is i.i.d. from the symbol frequencies of `BR0.csv` (base) and `FR0.csv` (free spins, with veins: start x4, +6 per winning cell, cap 512). 150k to 200k spins per variant. Caveat: this proxy gives a base hit rate of 19.0%, versus 29.1% in the real strips, and a free-spin mean of 7.4x per spin. So read the **relative** deltas, not the absolute values. "FS" below means a free spin, not a whole bonus. Final RTP will be re-balanced by the optimizer, so every extra return listed here must be taken back from reel weights or the paytable.

## 1. Fuse Line (recommended first)
**Player text.** A lit fuse is drawn across the board at the start of the spin, and it burns a little further each time you win. When the board goes quiet, the burnt cells blow up into Gold Nuggets and the board scores again.

**Rules.**
- At reveal, generate one self-avoiding path of N cells, as board coordinates. It starts in a random cell of reel 0. Each step goes right with weight 2, and up or down with weight 1 each (no cell is visited twice). The path is in the book and is shown at once, so the player sees the whole route.
- `burn` starts at b0 (the first cell is lit at reveal). After each winning step, once the tumble refill has landed, `burn += adv` (capped at N).
- Detonation happens once per spin, when an evaluation returns 0 and `burn >= detmin`. Every path cell with index below `burn` that is not S becomes W (Gold Nugget) in place. The board is evaluated again. If that pays, normal cascades continue. The fuse is spent.
- If `burn < detmin` the fuse fizzles (cosmetic).
- Free spins: one fresh fuse per spin. Wilds sit on veins, so the cluster mult sum includes the vein values of the cells they bridge (this is where the tail comes from). A retrigger changes nothing.
- Base game: same rules, no veins, so the effect is small.

**Front end (Old Gus).** Reveal: Gus strikes a match. A dotted fuse draws across the cells with a spark at the head. Each win: Gus shuffles a step, the spark crawls `adv` cells and the cells blacken. Quiet board: Gus covers his ears (the 1960s cartoon beat), a camera shake follows, the burnt cells pop into nuggets, and a "KA-BLOOM" word balloon appears. Fizzle: a limp puff of smoke and Gus shrugs.

**Events (new).**
- `fusePath {index, type:"fusePath", cells:[{reel,row}], burned:int}` (after `reveal`)
- `fuseBurn {index, type:"fuseBurn", burned:int, newCells:[{reel,row}]}` (after each `tumbleBoard`)
- `fuseBlast {index, type:"fuseBlast", cells:[{reel,row,replaced:symbolName}]}` or `fuseFizzle {index, type:"fuseFizzle", burned:int}` (at the dead board, before the re-evaluation `winInfo`; the blast carries the replaced symbols so the renderer needs no board diffing)

**Measured effect (FS spin, vs 7.42x mean, sd 23.6; base hit 18.96%).**

| Params (N, b0, adv, detmin) | Fire rate (base spin / FS spin) | Base hit | FS mean | FS sd | Base mean |
|---|---|---|---|---|---|
| 6, 0, 1, 2 (fuse_a) | 2.0% / 4.0% | +0.0 pts | 8.64 (+16%) | 34.2 | 0.127 (+8%) |
| 8, 1, 1, 3 (fuse_c) | 2.0% / 4.1% | -0.1 pts | 12.26 (+65%) | 59.1 | 0.162 (+38%) |
| 7, 0, 2, 4 (fuse_b) | 2.0% / 4.1% | +0.0 pts | 22.89 (+208%) | 130.0 | 0.265 (+125%) |

Reading: Fuse Line is a pure volatility and tail lever. It leaves the hit rate untouched and moves 0.8 to 2.7 of the RTP into rare multi-wild blasts inside free spins. Start with fuse_c (N=8, b0=1, adv=1, detmin=3), with fuse_a as the soft fallback, and let the optimizer trim `FR0` frequencies.

**Complexity.** 4 days math plus 4 days front end, about 8 total.

**Originality.** A telegraphed path that grows across the cascade chain is not in the known list. The nearest cousins are bomb or dynamite symbols that convert cells (Pragmatic style) and wild-conversion features in general. Differences: the player sees the full path before any outcome, nothing is a symbol on the grid, and the payload depends on how long the cascade chain ran. Flag for the attorney: "converting cells along a path into wilds" and any claim on "pre-displayed paths".

**Risks.** Concentrated tail (optimizer needs a wincap-friendly fit). Wilds fall with gravity, so the renderer must show them dropping. S cells on the path stay untouched (say so in the rules).

## 2. Shaft Lift
**Player text.** The mine cage waits at a row on the right of the board. If your spin finds nothing, the cage lifts and turns a stretch of that row into the same ore.

**Rules.**
- Before the spin, a cage row `r` (0..4, weighted equally) and a span start column are chosen and shown (the cage is parked beside row r with a 4-cell bracket over the span).
- Once per spin, on the first evaluation that returns 0 (including the opening board), with probability p the cage fires. In the span (L consecutive cells of row r), all non-S, non-W cells become the **majority payer symbol in the span** (tie goes to the higher payer). The board is re-evaluated, and cascades continue.
- Free spins: same rules each spin (veins stay on cells). Hit rate moves by at most p.

**Front end.** Gus pulls the cage lever (bell ding, cable twang). The cage rattles up, stops at the row, the span symbols dissolve into the target ore with a pickaxe-swing flourish.

**Events.** `cagePark {index, type:"cagePark", row, startReel, span}` (after `reveal`), `cageLift {index, type:"cageLift", row, startReel, span, symbol, replaced:[{reel,row,symbol}]}` (before the re-evaluation `winInfo`).

**Measured (base hit 18.96%, FS mean 7.42x).**

| Params (p, span, rule) | Fire rate | Base hit | Base mean | FS mean | FS sd |
|---|---|---|---|---|---|
| 0.03, 4, majority (lift_a) | 3.1% | +1.3 pts (+7%) | +26% | 8.50 (+15%) | 27.1 |
| 0.06, 4, majority (lift_b) | 6.1% | +2.8 pts (+15%) | +53% | 9.65 (+30%) | 31.1 |
| 0.04, 5, majority (lift_c) | 4.1% | +2.1 pts (+12%) | +73% | 10.56 (+42%) | 35.5 |

A "best present symbol" rule was far too strong (FS +169%), so majority is the dial. Lift is the only one of the three that is a hit-rate lever (about 1 added hit per p-point of fire rate), with a mild volatility rise.

**Complexity.** 3 days math plus 3 days front end, about 6 total. Simplest.

**Originality.** Overlaps with "symbol transform" or "morph" features that are common (a row turns to one symbol). The cage and the telegraphed row are what is new. Flag: anything resembling Nolimit "mystery reel" or Aristocrat symbol conversion.

**Risks.** Feels like a free reroll if it fires too often; a 2-2 split span needs a clear tie rule.

## 3. Cave-In Shear
**Player text.** After a win, the mine can shudder: rows slide in opposite directions by one cell and fresh rock tumbles in at the edge. The new neighbours can pay again.

**Rules.**
- After a winning chain ends (the board is dead and the spin has paid at least once), with probability p a "cave-in" fires, up to M times per spin.
- Shear: rows 0, 2, 4 slide one cell left, rows 1, 3 slide one cell right. The vacated edge cell of each row is filled from the reel strip. S and W slide like any symbol; veins stay with the **cell** (not with the symbol). The new board is evaluated, and cascades go on.

**Front end.** The headframe creaks and the tilt-o-meter on the cart wobbles, then rows slide with dust puffs. Gus hangs on to his hat and says "Whoa!" in a word balloon.

**Events.** `caveIn {index, type:"caveIn", n:int, newBoard:[[symbolObj]], entering:[{reel,row,symbol}]}`.

**Measured.**

| Params (p, M) | Fire rate (base spin / FS spin) | Base hit | Base mean | FS mean | FS sd |
|---|---|---|---|---|---|
| 0.35, 2 (tilt_a) | 9.0% / 14.1% | +0.1 pts | +6% | 7.99 (+8%) | 25.4 |
| 0.7, 2 (tilt_c) | 22.5% / 35.3% | -0.1 pts | +10% | 8.83 (+19%) | 27.7 |

Reading: it never changes the hit rate (it only fires after a win), and its value is a longer cascade chain (+0.03 to 0.06 chain steps). It is spectacle more than math.

**Complexity.** 2 days math plus 4 days front end (sliding animation), about 6 total.

**Originality.** Overlaps with reel nudges (xNudge style) and shifting grids in the sense that symbols move sideways. Differences: alternating rows, per-row refill, and it is a cascade axis rather than a reel feature. The attorney should check "shifting rows of a cluster grid".

**Risks.** Hard to read at 400x225; weak return for the animation cost.

## Other candidates (measured, not recommended)
- **(d) Assay Office** (lowest symbol upgrades one tier for the rest of the spin, cap 1): FS +118% (7.44 to 16.14), base hit unchanged (+0.0). Strong, but symbol upgrade-for-the-spin is a common idea, and the first evaluation is unaffected.
- **(f) Rail Switch** (1 wild in one of two columns, p=0.10 per board): FS +12%, base hit +1.1 pts; p=0.30: +36%, hit +3.3 pts. Reads as a generic wild drop.
- **(e) Lantern Reveal** (3x3 turns to one mid symbol, p=0.03): base hit +2.4 pts, FS +88%. A guaranteed 9-cluster block; close to the area/mystery claims in the patent brief.

## Ranking (originality, fun, implementability, low overlap)
1. Fuse Line: best score on telegraphing and fun; modest overlap with wild-conversion; moderate effort (8 d).
2. Shaft Lift: simplest and the only hit-rate lever; overlaps with "symbol transform" (6 d).
3. Cave-In Shear: pretty but weak math and close to nudge mechanics (6 d).
4. Assay Office: strong numbers, common idea.
5. Rail Switch: generic wild drop.
6. Lantern Reveal: closest to area or mystery symbols in the patent brief.

## Recommendation and step plan: Fuse Line
Math (`math/games/the_unleashed_mine`):
1. `game_config.py`: add `fuse_len=8, fuse_b0=1, fuse_adv=1, fuse_detmin=3` and a per-mode toggle so base and bonus can differ.
2. `game_events.py`: add `fuse_path_event`, `fuse_burn_event`, `fuse_blast_event`, `fuse_fizzle_event` (schemas above), each with `index = len(book.events)` like `update_grid_mult_event`.
3. `game_executables.py`: add `make_fuse_path()` (use the SDK's seeded `random`, never a new RNG, so books replay), `advance_fuse()`, `detonate_fuse()` (replace non-S cells with `W`, emit the event).
4. `gamestate.py`: in `run_spin` and `run_freespin`, call `make_fuse_path()` after `draw_board`, `advance_fuse()` inside the tumble loop, and `detonate_fuse()` when `totalWin == 0`; if the blast leaves a win, re-enter the tumble loop. Keep `wincap_triggered` checks in that loop.
5. Run the real SDK sims (`SIMS_BASE`, batching 6250), compare to the prototype, then let the optimizer re-fit `FR0` weights and quotas. Add pytest checks: fire rate, all payouts multiples of 0.1, max win 5000x in both modes.

Front end (`frontend/src/render/index.js`, switch at about line 600):
6. Add cases `fusePath`, `fuseBurn`, `fuseBlast`, `fuseFizzle` next to `updateGrid`; draw the fuse in `scene.js` or `fx.js`; add Gus poses (match, ears) in `mascot.js`. Give each a skip-able, turbo-aware `sleep`. Add devbook fixtures in `devbooks.js`.

Rules text:
7. `rules.js` and the i18n strings: "A fuse is lit at the start of each spin ..." with N, burn per win and the detonation rule; state that the fuse never touches Dynamite; regenerate `data/rules_data.json`. Social wording must avoid the restricted words.
