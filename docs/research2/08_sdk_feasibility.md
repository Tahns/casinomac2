# 08 SDK feasibility: variable boards, several bonuses, several buy modes (Agent Mambo v2)

Date 2026-10-26. Angle: can the Stake math SDK in `math/` carry the v2 brief, what does it cost, in what order. No patent content here (see 01/02/03); nothing in this file is legal advice. No web source was needed: evidence is repo code (file:line), runs in this sandbox (4 cores, 15 GB RAM, Python 3.13, env python of the repo) and one script, `docs/research2/08_poc_sdk.py`, which imports the real SDK and game classes in memory and writes no book or library file. Evidence tags: **M** measured here, **R** read in code, **A** assumption or engineering estimate. Web check: the official docs URLs tried (engine.stake.com/docs, stakeengine.github.io/math-sdk) returned 404 and a search found no published limit for bet-mode count, book-file size, minimum simulations or RTP spread between modes. That is a negative result only; the 20-mode and RTP 90-98 % figures come from the lead's brief.

## 0. Bottom line
1. **Everything asked is feasible in the stock SDK without editing `math/src`** (only the game subclass and tools), except two items that are expensive: interior blocked cells that do NOT collapse (custom tumble) and changing the reel count per spin (needs extra reel strips). [R, M]
2. **Variable shape per spin works.** The SDK reads `config.num_rows` / `num_reels` dynamically; a draw override that sets them per spin, plus a geometry-aware adjacency (the stock `Cluster.get_neighbours` raises IndexError on any jagged board, confirmed), ran 12 shapes (6x4 to 7x7, edge cuts, hourglass, interior holes, 8x4, 4x8) with zero errors. 6x5 geometry reproduces stock clusters exactly (0 mismatches in 300 random boards). [M]
3. **Several bonus types in one mode works.** A mission drawn at the trigger from `mission_weights` (distribution conditions), per-mission meter step / wire / pay timing, a banked "case" pay timing with correct reconciliation (0 errors, `finalWin == payoutMultiplier`), a force-record key `{"mission": id}`. About 25 lines per variant. [M]
4. **Several buy modes with equal RTP is a weights problem, not a simulation problem.** RTP is imposed by the lookup table. The existing exponential-tilt reweighter reproduces lambda = 0.000578 / RTP 0.96 in 1.8 s when it reads `force_record_*.json` instead of streaming 317 MB of books. The real limit is that each new rule set must be calibrated so its natural pool mean sits near price x RTP (a few 2000-book samples, about 15 s each on 4 cores). [M]
5. **Cost is dominated by book size and by floor rejection, not by CPU.** Bonus mode today: 27 ms per book, 10-11 min per 100k books on 4 threads, 317 MB at zstd level 3. A 6x7 board makes books 1.9x bigger, 7x7 about 4.9x (1.5 GB per 100k). Floor/tier rejection costs 2-4x on small boards (6x4: 9 attempts per accepted book, interior holes: 15). [M]
6. **Memory rule: about 270 KB of RAM per 30 KB bonus book (x9).** 4 threads x 6250 books = 6.7 GB. Larger boards need a smaller batch (6x7: 3125, 7x7: 1250). [M]
7. **Cheapest size lever: recompress at zstd level 15.** 3.1 KB to 1.3 KB per bonus book (2.4x), 5.8 s per 4000 books with 4 threads, decompression 0.1 s. Needs the verification sidecar hash refreshed. Whether Stake accepts any standard zstd level is unknown (A). [M]
8. **Recommended set: 7 of 20 modes** (base, surprise door, 5 mission doors at 100x), 100k books for base and surprise door, 50k for the niche doors, level-15 compression; about 80 min for a full rebuild (about 2 h with 100k books everywhere), 5-30 min for one mode (section 8). [M, A]
9. **Highest risks:** (a) front end hard-codes 6x5 in four files; (b) layout and mission shares in the rules page must be OUTPUT of the final weighted tables, not nominal draw weights; (c) per-mission calibration of two targets at once (natural-trigger pool without floor, buy pool with 30x floor); (d) unknown Stake limits on total upload size.

## 1. Baseline measured on the current build
| Item | Result | Tag |
|---|---|---|
| Base books, 1 core, ms per accepted book (attempts) | criteria `0` 1.1 (1.2); `basegame` 2.5 (5.4); `freegame` 7.0 (1.0, 104 events, 24 KB) | M |
| Bonus books, 1 core, ms (attempts) | fgfloor4 22-32 (3.0); fgfloor5 23 (2.4); fgfloor6 18 (1.8); fgfloor7 19 (1.5); 130-184 events, 30-42 KB raw JSON | M |
| Quota-weighted bonus book | about 27 ms, so 100k books = 2700 core-s = 11 min on 4 threads (published run logs: 663 s for base+bonus, 856 s on the first run) | M, R |
| Base 100k books | about 60-70 s on 4 threads | M, R |
| Rust optimizer, base (4 fences, defaults) | 72 s wall, 4 threads | M |
| Rust optimizer, bonus (5 fences, defaults) | 204 s wall (12 CPU-min). PROGRESS.md: `BSPINS` 1000-20000 aborted after 22 min; the optimizer cannot give a flat buy shape (70 % of buys at 30-60x whatever the knobs) | M, R |
| Reweight from `force_record_bonus.json` (18 MB, 997 records, loads in 0.2-0.6 s) | 1.8 s total, lambda 0.000578, RTP 0.9600000 | M |
| pytest suite (18 tests, 2 modes, reads books) | 101 s | M |
| Bytes per bonus book by event | `reveal` 53 %, `fusePath` 14 %, `winInfo` 8 %, `tumbleBoard` 7 %, everything else under 4 % each; 20.1 spins and 135 events per book | M |
| Compression of bonus books (4000 books, 133 MB raw) | level 3: 3.12 KB/book; 9: 2.29; 12: 1.93; 15: 1.30; 19: 1.09 (134 s single thread). Multi-thread level 15: 5.8 s | M |
| Fuse path generation | 35 us (len 8), 61 us (len 12), 145 us (len 14): negligible | M |

Notes: timings are single-core and vary about 30 % between runs on this sandbox; ratios matter more than absolutes. Per-win force records are not a CPU lever (records on or off: 20.6 vs 23.7 ms per book, within noise); they only make `force_record_*.json` big.

## 2. (a) Variable boards: what the SDK allows
### 2.1 Facts read in the code
- `config.num_rows` is a per-reel list read dynamically by `Board.create_board_reelstrips`, `force_board_from_reelstrips`, `Tumble.tumble_board`, `reveal_event` (uses `len(board[reel])`) and the game's `make_fuse_path`. `GameConfig` is a process-local singleton and `create_books` forks one process per thread, so a per-spin mutation stays inside the child. With `threads=1` or profiling it would leak into the parent, which writes `numRows` once into `config_fe_*.json` (`write_configs.py:250`): restore `[5]*6` in a `finally`. [R]
- `tumble.py:36` raises if a column length differs from `num_rows[reel]`: consistent per-spin values pass. [R, M]
- `cluster.py:28` `get_neighbours` adds `(reel+-1, row)` without checking the neighbour column length: any jagged board gives `IndexError`. [R, M]
- Wire: `make_fuse_path` uses compact row indices for adjacency, so on offset or holed boards it needs the same geometry map; fuse events are already in visible (unpadded) rows. [R]
- `force_special_board` (7-8 scatters) and anticipation work on any shape with at least 8 free cells. [R]
- Reel strips: columns beyond 6 need strip files (`BR*.csv`, `FR*.csv`) and entries in `self.reels`; reel sets are chosen per criteria in `reel_weights`. In the PoC strips were tiled to test 7 and 8 columns. [M]

### 2.2 Geometry model that keeps tumble stock (recommended)
Each reel has a sorted list of GEOMETRIC rows `cells[r]`. The SDK board column is the COMPACT list of those cells, so gravity, padding, reveal and tumble code is untouched. Adjacency compares geometric rows: handles shorter reels, bottom- or centre-aligned reels (integer offsets) and interior holes ("symbols fall past the hole"). Layout is drawn with the seeded `random` in `draw_board` from a `layout_weights` condition, announced by a `layout` event before `reveal`.

| Shape class | Needs | Cost | Verdict |
|---|---|---|---|
| A. Edge cuts, different heights per reel, taller or shorter board (6x4, 6x6, 6x7, atrium, skyline, hourglass) | draw override + geometry adjacency | low (about 120 lines, PoC written in about 1 h) | **Recommended** |
| B. Interior holes with column compaction | same code; front end must animate a fall past the hole | PoC runs; 02 measured -60 % win mass, 15 attempts per book (97 ms) in my run | Possible, avoid for volume reasons |
| C. Interior blockers that stay and split a column into independent segments | custom tumble: one strip pointer and refill per segment | 1.5-3 days + new animation | Not recommended |
| D. Reel count per spin (8x4, 4x8, 7x7) | extra strip sets per reel count; `num_reels` per spin | medium; strip design and RTP retune | Only for mode-level layouts (fixed per mode) |
| E. Growth in the middle of a cascade (+1 row on every reel) | `grow_row()`: insert old top pad as new top cell, move strip pointer, new top pad | 3000 books, 0 errors, stock tumble keeps working | Cheap (about 15 lines) |

### 2.3 Measured cost per shape (bonus mode, criteria fgfloor4, 100 books each, 1 core, strips and paytable NOT retuned)
| Shape (cells) | ms/book | attempts | events | raw KB | zstd3 KB | mean win post-floor (n=100, noisy) |
|---|---|---|---|---|---|---|
| open 6x5 (30) | 24 | 3.2 | 156 | 33.9 | 3.0 | 106x |
| atrium, corners cut (26) | 33 | 5.5 | 138 | 28.7 | n/m | 75x |
| lobby 6x4 (24) | 53 | 9.1 | 130 | 26.5 | n/m | 67x |
| annex 6x6 (36) | 22 | 1.8 | 212 | 49.2 | 4.2 | 242x |
| penthouse 6x7 (42) | 30 | 1.35 | 261 | 63.8 | 5.7 | 470x |
| skyline 3-4-5-5-4-3 (24) | 58 | 9.4 | 122 | 24.7 | n/m | 61x |
| pyramid 2-4-6-6-4-2 (24) | 67 | 11.3 | 124 | 25.2 | n/m | 60x |
| hourglass 7-6-3-3-6-7 (38) | 38 | 4.1 | 176 | 39.5 | 3.6 | 90x |
| interior holes (26) | 97 | 15.5 | 138 | 29.5 | n/m | 62x |
| wide 8x4 (32, 8 reels) | 22 | 2.4 | 165 | 38.5 | 3.6 | 123x |
| tall 4x8 (32, 4 reels) | 27 | 3.8 | 136 | 28.8 | n/m | 93x |
| 7x7 (49, 7 reels) | 70 | 1.1 | 578 | 158 | 14.8 | 1424x |

Reading: (1) the same meter and paytable move the natural bonus mean by 0.6x to 14x with the shape: **each layout must be calibrated** (meter step, FR0 wild count, paytable scale) before it can sit in a mode whose price is 100x; the reweighter can only tilt moderately (lambda 0.0006 today) and cannot fix a pool whose mean is far from the target. (2) Small boards are expensive because the 30x floor and tier filter reject most attempts. (3) Big boards are expensive in bytes, not CPU. In base mode a 6x7 free-game book is 220 events / 54 KB against 117 / 26 KB for 6x5 in the same run (M). (4) Trigger odds in the published math are set by the base `freegame` fence (1 in 200), not by board size; per-layout trigger shares are therefore an OUTPUT of the optimizer.

### 2.4 Event and honesty requirements for shapes
- One `layout` event before every `reveal`: `{id, cols, rows, cells:[[geometric rows per reel]], links:[]}`. `reveal.board[r]` has `len(cells[r]) + 2` symbols (top and bottom pad), `anticipation` and `paddingPositions` have `cols` entries.
- Draw the real layout once: no cycling through other shapes (02 section 4, UK RTS 7 near-miss rule). Layout and scatter anticipation come from the actual board content. [R]
- Layout shares: a nominal `layout_weights` is only the draw frequency of the book pool. The optimizer then reweights books by payout, so the final per-layout frequency must be measured on the weighted lookup table (record `{"layout": id}` for the first reveal) and printed from that. To pin a share, make it a criterion/fence like `bonusTier`.

## 3. (b) Several bonuses: one mode with a random type, or one mode per type
| Option | SDK cost | Pros | Cons |
|---|---|---|---|
| 1. Random mission at trigger inside `base` and one buy mode | 1 extra mode | smallest upload; one reweight | RTP tuning coupled; mission shares must be pinned; players cannot choose |
| 2. One mode per mission (doors) | N extra modes, each its own books | exact RTP and shape per door; the only legitimate player choice (a mode) | N x book size, N reweights |
| 3. Hybrid (recommended): random mission on natural triggers and in one surprise door, plus pure doors | N+1 extra modes | covers both; the existing 316 MB `bonus` books stay valid as the pure Briefing door if kept as is | most criteria bookkeeping |

PoC (08_poc_sdk.py missions, n=300 books each, fgfloor4, strips unchanged):
| Mission (parameters) | ms/book | attempts | events | raw KB | mean / median / p90 post-floor | note |
|---|---|---|---|---|---|---|
| briefing (step 8, wire 8) | 21-24 | 3.1 | 136 | 30.5 | 108 / 70 / 217 | today's rules |
| demolition (step 2, wire 12, 5 burnt at reveal, +2 per step) | 49 | 3.5 | 216 | 55.2 | 91 / 63 / 168 | 24 blasts per book: cost x2.1, books x1.8 |
| case (step 7, bank at x1 then pay x meter when the board is dead) | 15-16 | 2.3 | 130 | 28.4 | 110 / 76 / 224 | 0 reconcile errors, `caseOpen` event |

Findings: (i) The mission is drawn in `run_freespin_from_base` with `get_random_outcome(conditions["mission_weights"])` and recorded with `self.record({"mission": m})`; the key appears in `force_record` so reweighting can pin shares. (ii) Per-mission parameters are plain lookups in `bump_global_mult`, `make_fuse_path` / `fuse_params`, `evaluate_clusters_with_grid` and `cascade`; no SDK edit. (iii) Banking uses the SDK's `WinManager.set_spin_win`; call `evaluate_wincap()` after multiplying, otherwise the cap check runs on unmultiplied totals. (iv) Every new multiplier path must keep payouts at multiples of 0.1x: integer multipliers only, `round(x, 2)` as already done, never x1.5. (v) Strip-changing missions (Cover Blown) can swap `self.reelstrip` mid-spin because refills read it at each tumble, but stage strips must keep the same length per reel or `reel_positions` become invalid [R, A]. (vi) A pick screen after the trigger cannot affect the outcome; only a reveal is allowed (03 section 3).

## 4. (c) Several buy modes with equal RTP
- **Mechanism.** `BetMode.rtp` is a label; the real RTP is `sum(w x pay) / sum(w) / cost` of `lookUpTable_<mode>_0.csv`. The reweighter (`tools/reweight_bonus.py`) solves lambda for exactly 96.000 % with pinned tier shares and P(5000x) = 1/50000. Generalised to `(mission, tier)` cells it gives every door 96.000 % by construction (spread 0), far inside the SDK's own warning threshold (`rgs_verification.py:304`, 0.05 absolute) and the unofficial 0.5-point figure in STAKE_COMPLIANCE.md.
- **Feasibility window (A).** With one lambda per mode the natural pool mean (after floor and tier mix) should sit within about +-25 % of price x RTP (96x at 100x). Today lambda = 0.00058 (mild). A pool mean of 70x needs a negative lambda and fattens the tail. PoC means at fgfloor4: briefing 108, demolition 91, case 110, i.e. all inside the window with untuned parameters (n=300, standard error about 6 %).
- **Price.** Same price for all doors (100x) keeps the 5000x cap at 50x the price. A cheaper door (25x) makes the cap 200x the price and pushes `etl40b` (wins above 40 x price, limit 0.9) and `cvar` (limit 800) towards the warning limits in `rgs_verification.py:180`; these are warnings, not blocks. [R]
- **Reweighter changes.** Read tier and mission from `force_record_<mode>.json` (bookIds per key, set intersections), not from the 317 MB book stream; one lambda per mode; assert RTP and 0.1x multiples; write `lookUpTable_<mode>_0.csv`. 2 s per mode instead of a streaming pass. [M]
- **Flags.** Both existing modes are `is_feature=True, is_buybonus=False` (`game_config.py:110,167`). The SDK docs describe `is_feature` as "repeat the last mode without interaction" and `is_buybonus` as "mode purchased directly". For the 100x doors `is_feature=False, is_buybonus=True` matches the docs' own bonus sample and is what a jurisdiction switch would key on; the RGS exposes only `socialCasino`, `disabledTurbo`, `disabledFullscreen` (RGS.md:254) in the documented auth response, so how Stake hides buy modes per jurisdiction is unknown (A). Decide with the lead before building.
- **Win levels.** `Config.get_win_level` has fixed thresholds in multiples of the bet; a 60x result of a 100x door is level 6 ("endFeature") although it is a net loss. The front end already divides by cost (`index.js:683` `x / (S.cost || 1)`), but add a price-relative key (for example `endFeatureBuy`) so the book field cannot be read as a celebration of a loss. [R]

## 5. (d) Criteria, quotas and optimizer fences
| Mode | Criteria (quota) | Conditions new | Optimizer |
|---|---|---|---|
| `base` | wincap .001, freegame .10, 0 .40, basegame .50 (unchanged) | `layout_weights` per gametype (same weights in all criteria so the draw is layout-neutral); `mission_weights` in `freegame` | Rust, 4 fences, 72 s. Optional per-mission fences `fg_<mission>` (search `{"mission": m}`, hr and rtp per mission): +40 s each, pins mission shares |
| `bonus` / doors | wincap .001, fgfloor4 .55, fgfloor5 .25, fgfloor6 .12, fgfloor7 .079 (unchanged, tier pool oversampling) | `mission_weights` (single mission for pure doors, the pinned mix for the surprise door); `layout_weights` for the bonus gametype | none; `reweight` only (the Rust bonus pass is formal) |

Rules that bit or would bite (R unless stated):
1. **Every mode needs an `opt_params` entry** even if only reweighted. `make_temp_math_config` (`write_configs.py:95-102`) never resets `opt_mode`, so a mode missing from `opt_params` is written into `math_config.json` with the previous mode's fences; the Rust program indexes fences, dresses, bias and bet modes by mode name and panics when a name is missing. `verify_optimization_input` requires the condition RTPs of each mode to sum to the mode RTP (use the existing `TIER_RTP`).
2. **Quota minimums.** `get_sim_splits` gives every criterion at least 1 book. Rare cells must be oversampled: with 100k books, mission x tier cells of 1 % need about 1000 books to be usable; wincap .001 = 100 books (50 at 50k).
3. **Order of `conditions`**: wincap first (exclusive id pools in the Rust program). A mission fence must come before the generic `freegame` fence.
4. **Natural-pool means.** The base `freegame` fence is hr 200 / rtp .37, so its average is 74x; the natural pool mean is about 88x. Each mission needs its no-floor mean near that, while the buy pool needs its post-floor mean near 96x: two targets from the same rules. Tune the meter step first (changes both), then the fence RTP split.
5. **Seeds.** Seeds are the simulation index, criteria shuffles are seeded identically, so two modes with equal quotas replay the same random stream (identical trigger boards until the rules diverge). Add a per-mode offset in `run_spin`: `reset_seed(sim + MODE_OFFSET)`. Low risk, cosmetic. [R]
6. **Partial runs.** `create_books` accepts a dict with only some modes, `force.json` and manifests merge, but `generate_configs` hashes the books, lookup and force files of EVERY configured mode (`write_configs.py:339,366` unguarded): a new `BetMode` without files breaks it. Run new modes in the same invocation or filter `bet_modes` and assemble the final manifest with `SIMS=0`. Book counts should be multiples of `threads x batch`: `create_books` rounds the repeat count and can silently drop a few sims (70 000 books give 69 996).
7. **Force keys** `layout`, `mission` also feed `force.json`, which is what Stake QA uses to force outcomes: useful for testers, but bookIds lists grow `force_record` size (18 MB per bonus mode now).

## 6. (e) Simulation cost, memory, book size
**Time.** `wall = books x ms_per_book / threads`. Table values are weighted over the tier quotas and scaled from the PoC ratios (A for modes not yet written).
| Mode (100k books) | ms/book (1 core) | wall, 4 threads | raw JSON GB | zstd3 / zstd15 MB |
|---|---|---|---|---|
| base, layout mix | 2.5-3.5 | 1-1.5 min | 0.4 | 37-50 / about 25 (A) |
| bonus Briefing 6x5 (exists) | 27 | 11 min | 3.3 | 317 / 130 |
| Demolition Run | about 55 | about 23 min | 6 | about 560 / about 230 |
| Locked Case | about 20 | about 8 min | 3 | about 300 / about 125 |
| Searchlight (A: Briefing + 5 %) | about 28 | about 12 min | 3.4 | about 330 / about 135 |
| Cover Blown (03: 18 % floor pass) | about 50 | about 20 min | 3.4 | about 330 / about 135 |
| 6x7 growth bonus (per spin layout) | 30-60 | 12-25 min | 6.4 | about 570 / about 240 |
| 7x7 bonus | 70+ | 30 min+ | 16 | about 1500 / about 640 |
Optimizer 1.2 min (base) to about 4 min with 10 fences; reweight 2 s per mode; tests about 1 min per 100k-book mode; recompress level 15 about 2.5 min per 100k bonus books (4 threads).
**Memory.** RAM per bonus book is 270 KB for 30 KB raw (x9; 400 books: 273 KB, 2000 books: 266 KB). Peak is `threads x batch x 270 KB x (raw/30 KB)`, plus about 25 % for the JSON dump. 4 x 6250 x 270 KB = 6.7 GB (15 GB machine, safe); 25 000 per thread would need 27 GB (the OOM in PROGRESS). Rule: batch = 6250 x 30 / raw_KB, e.g. 3125 for 6x7 and Demolition, 1250 for 7x7. `create_books` takes one batch value per call: call it once per mode.
**Size levers, in order of effect:** compression level 15 (x2.4, A: accepted by Stake), fewer books per niche door (50k halves everything; fewer unique outcomes, so more repeats), smaller boards in buy modes, dropping `fusePath` for spins without a burn (14 % of bytes, front-end contract change), shorter symbol objects (53 % in `reveal`, breaks the SDK format: no). Level change point: `write_data.py:149` (final merge) and `:303` (per batch); either patch `zstd.ZstdCompressor` in `run.py` (inherited by forks) or run a post step that also rewrites `file_hash` in `books_<mode>.verification.json` and `config.json` sha256, otherwise the fast-path test fails.

## 7. (f) Front-end event contract: what must change
Current rule (frontend_mambo/CONTRACT.md, fixtures/EVENTS.md): 6x5, padded rows 1..5 in `reveal/winInfo/tumbleBoard/freeSpinTrigger`, visible rows 0..4 in `fuse*`. The renderer's `handle()` ignores unknown event types (`default: return null`, `render/index.js:693`), so new events never crash an old renderer; they are simply not drawn.
| Event | Status | Fields and rule |
|---|---|---|
| `layout` | NEW, before every `reveal` | `{id, cols, rows, cells:[[geo rows]], links:[]}`; sets board size, offsets, holes, tubes |
| `reveal` | CHANGED | column length `len(cells[r]) + 2`; `anticipation` and `paddingPositions` have `cols` entries |
| `winInfo`, `tumbleBoard`, `freeSpinTrigger/Retrigger` positions | SAME format | stay COMPACT padded (`compactIndex + 1`, SDK emitters untouched); front end maps with `cells[r][p-1]` (identity for top-aligned shapes) |
| `fusePath/Burn/Blast` | CHANGED | cells in GEOMETRIC visible rows; path length may differ per mission (8 or 12); path generated on geometry |
| `missionAssigned` | NEW, after `freeSpinTrigger` and before the first `updateGlobalMult` | `{mission, totalFs}` |
| `updateGlobalMult` | SAME | step is mission dependent (2, 7, 8): the front end must not assume +8 (tests currently assert it) |
| `caseOpen` | NEW (Locked Case) | `{bank, mult, win}` in 1/100 x; replaces per-step payment display; `winInfo.meta.globalMult` is 1 |
| `gridGrow` | NEW (growth) | `{rows, cells, newSymbols}`; geometry after growth |
| `lightRoute`, `coverBlown`, `wallBreach`, `tubeUsed` | NEW (only if those concepts ship) | geometric rows |
| `wincap` | SAME | none of the new events after `wincap`; remaining spins listed capped as today |
| config `numRows`, `numReels` in `config_fe_*.json` | NOT authoritative | keep `[5]*6`; the layout event is the truth |
Front-end files affected: `render/index.js:13` (`COLS=6, ROWS=5`, used on about 40 lines: grid, outlines `viewBox`, tumble, fillHoles), `wire.js:5`, `fuse.js:4`, `devbooks.js:2`; `tools/gen_rules_data.mjs` (parses `gm_*`, `fuse_params`, `BetMode(name,cost)`, must read missions, layouts and FINAL shares from the tables); `fixtures/EVENTS.md`, `CONTRACT.md`. Math-side tests hard-code 6, 5, 7 and `COST = {base, bonus}` (`tests/test_math.py`): generalise to layout-driven replay and a per-mode cost map. `event_config_<mode>.json` (written by the SDK) lists every event type present: use it as a CI check that the renderer handles all of them.

## 8. Recommended mode list (<= 20; 7 now, room for 13)
| # | Mode | Cost | Content | Books | Sim wall | Upload (zstd15, A) |
|---|---|---|---|---|---|---|
| 1 | `base` | 1x | layout mix (3-4 layouts), mission by pinned weights at trigger | 100k | 1.5 min + 1.2-4 min optimizer | about 25 MB |
| 2 | `bonus` | 100x | surprise door: mission by the pinned mix | 100k | 12-20 min | about 130 MB |
| 3 | `entrance_briefing` | 100x | pure Briefing (current rules; if `bonus` stays Briefing-only, this is the existing book and costs nothing) | 50-100k | 0-11 min | 65-130 MB |
| 4 | `entrance_demolition` | 100x | pure Demolition Run | 50k | 11 min | about 115 MB |
| 5 | `entrance_case` | 100x | pure Locked Case | 50k | 4 min | about 65 MB |
| 6 | `entrance_searchlight` | 100x | pure Searchlight | 50k | 6 min | about 70 MB |
| 7 | `entrance_cover` | 100x | pure Cover Blown (after strip work and counsel) | 50k | 10 min | about 70 MB |
Total about 0.5-0.7 GB at level 15 (1.9 GB at level 3 with 100k books everywhere). Full rebuild with 50k niche doors: about 58 min of simulation + 11 min recompress + 5 min tests + 4 min optimizer = about 80 min (about 2 h with 100k books in every mode); one mode 5-30 min. Modes 8-11 (optional, A): four 1x base variants pinning one mission each (each +25 MB, +1.5 min, +72 s optimizer) are cheap for the SDK but of low value (a bonus appears 1 spin in 200, 03 section 3). Per-mission growth layouts (6x7 in bonus) double bonus bytes: keep them out of buy modes unless the size limit is known.
Naming: modes must not contain "buy"/"bonus buy" words in social mode (03 section 1); `bonus` is the existing name and a safe keep for index.json continuity.

## 9. Implementation plan (file level, order of work)
| Step | Files in `math/games/agent_mambo` | Work | Estimate (A, PoC-informed) |
|---|---|---|---|
| 0 | `tools/bench.py`, `tools/calib.py` | harness: ms/book, attempts, natural mean per (mission, layout) over 2000 books on 4 procs (about 15 s per cell) | 0.5 d |
| 1 Geometry | new `layouts.py`; `game_calculations.py`; `game_executables.py`; `game_override.py`; `game_events.py` | `LAYOUTS` table + validator (connected, >= 24 cells, holes only on edges unless class B); `get_clusters` using geometry (no monkeypatch of `Cluster`); `draw_board` override: draw layout, set `num_rows/num_reels`, emit `layout`, restore defaults in `finally`; geometry-aware `make_fuse_path` and fuse events; `reset_book` resets geometry | 1-1.5 d |
| 2 Missions | new `missions.py`; `game_override.py`; `gamestate.py`; `game_executables.py` | `MISSIONS` table (step, wire, pay timing, spins, layout weights); draw + `record` + `missionAssigned`; per-mission `bump_global_mult`, wire; `check_repeat` floor per mission | 1 d |
| 3 Mechanics | `gamestate.py` `cascade` variants, `game_calculations.py` | Case (PoC done), Demolition (config), Searchlight (route generator + lens in `evaluate_clusters_with_grid`), growth (`grow_row`), Cover Blown last (stage strips) | 0.5-1 d each; Cover Blown 2+ d |
| 4 Modes | `game_config.py`, `game_optimization.py`, `run.py` | helper `bonus_mode(name, mission_weights, books)`; `opt_params` for every mode; `MODES=` env filter and per-mode `batching_size`; seed offset; extra reel files only if class D | 1 d |
| 5 Reweight | `tools/reweight_bonus.py` -> `tools/reweight.py` | read `force_record`, (mission, tier) cells, one lambda per mode, write `_0.csv`, assertions | 1 d |
| 6 Calibrate | `reels/*.csv`, `game_config.py` constants | per layout / mission: tune meter step, wild count, paytable scale until natural pool mean (no floor, base) is about 74-90x and buy pool (floor) about 96x; 3-5 loops of 2000 books (1-2 min each) | 1-3 d, the real schedule risk |
| 7 Tools | `tools/recompress.py`, `tools/make_fixtures.py`, `tests/test_math.py`, `tools/final_checks.py` | level-15 recompress + sidecar hash; fixtures per layout/mission; tests by mode cost map, shape-aware replay, 0.1x multiples, cap, pinned shares | 1 d |
| 8 Contract | `frontend_mambo/CONTRACT.md`, `fixtures/EVENTS.md` (lead/FE owners) | sections of section 7 | 0.5 d |
Gates: after step 1, re-run `08_poc_sdk.py equiv` as a unit test (0 mismatches) and a property test (tumble conserves cell count on every layout); after step 4, one full 5k-book smoke run per mode (about 1-2 min) before any 100k run; after step 6, only then the 100k runs. Regeneration is not bit-exact for `base` (Rust optimizer is not reproducible, MATH_REPORT) and the new random draws change every book: keep window-style tests.

## 10. Risks and zones to avoid
1. **Front end hard-codes 6x5** (four files). Nothing in section 2 reaches players until the renderer is shape-driven. High, owner FE.
2. **Calibration is the schedule risk**: every layout and mission shifts the natural mean by up to an order of magnitude (section 2.3). A tilt cannot repair a far-off pool. Plan 1-3 days; limit layouts to 3-4 and missions to 3-4 for v1.
3. **Honest shares**: layout and mission frequencies, trigger odds per layout and door results must be printed from the final weighted tables (03 section 5.3, 02 section 4). Nominal weights are not shares.
4. **Book size and Stake limits unknown** (no published figure found). Mitigation: level 15, 50k books for niche doors, no big boards in buy modes. Fallback: single ladder bonus (03 section 4.3).
5. **Small boards and interior holes multiply rejection cost** (9-15 attempts). Do not use class B/C shapes in the buy modes; keep them rare in base if at all.
6. **SDK pitfalls**: jagged IndexError, config leak into `numRows`, missing `opt_params` entry, `generate_configs` needing every mode's files, silently dropped sims when counts are not multiples, same seeds across modes.
7. **Zones to avoid (math scope):** non-integer multipliers, any multiplier path without `evaluate_wincap()`, a cheaper door than 50x (tail share and `etl40b`), layout-dependent trigger tables without disclosure, stage strips with different lengths, per-mode threads above RAM (OOM).
8. **Flags unverified:** `is_feature`/`is_buybonus` semantics and jurisdiction hiding of buy modes on Stake's side.

## 11. Open questions
1. Stake: maximum size per books file and per game, minimum books per mode, mode count above 20, accepted zstd levels, whether `numRows` in the front-end config must match the shapes shown, whether review accepts per-spin layouts.
2. Lead: does `bonus` stay Briefing-only (no re-simulation, existing weights stay valid) or become the surprise door? Which concepts from 02/03 ship (decides class D/E and the strip work)?
3. FE owners: compact-plus-map versus all-geometric positions in `winInfo/tumbleBoard` (this file recommends compact for SDK events to keep emitters stock).
4. Compliance: `is_buybonus` flag values and the price-relative win level key.

## 12. Evidence and reproduction
- PoC: `docs/research2/08_poc_sdk.py` (subcommands `equiv`, `shapes`, `missions`, `grow`, `mem`; commands in its header, each one core, run with `math/env/bin/python`). It creates an empty `math/games/agent_mambo/library/temp_multi_threaded_files` (gitignored) via `OutputFiles`: delete it after use.
- Repo code read: `math/src/{calculations/{board,cluster,tumble}.py, config/{config,betmode,distributions}.py, events/events.py, state/{state,run_sims}.py, write_data/{write_data,write_configs}.py}`, `math/utils/rgs_verification.py`, `math/optimization_program/src/{main.rs,exes.rs}`, `math/games/agent_mambo/*` incl. PROGRESS.md and MATH_REPORT.md, `frontend_mambo/{CONTRACT.md, fixtures/EVENTS.md, src/render/index.js}`, sibling reports 02 and 03.
- Runs (this sandbox): baseline ms/book per criteria; shape, mission and growth PoCs; RAM per book; zstd levels on 4000 existing bonus books; Rust optimizer for base (72 s) and bonus (204 s) in a scratch copy of `math/` (library untouched); reweight from `force_record`; pytest (101 s) read-only on the live library.
- Not done: no 100k-book run of any new design, no Searchlight or Cover Blown code, no RTP calibration of any layout, no test of Stake's upload.
