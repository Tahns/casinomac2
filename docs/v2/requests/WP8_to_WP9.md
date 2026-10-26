# WP8 (MATH-MISSIONS) to WP9 (MATH-PIPELINE): modes, knobs, tools, numbers

Everything below was measured on the real SDK code in this checkout (see PROGRESS.md for stamps). Nothing under `library/` was touched by WP8:
all runs that write files used a scratch game id (`games/wp8_smoke`, `games/wp8_opt`) that the tools remove afterwards.

## 1. Modes (4 of 20) and what to run
| mode | cost | books | criteria (quota) | notes |
|---|---|---|---|---|
| `base` | 1 | 93 750 or 112 500 (multiple of 3 threads x 6250) | `BASE_PROFILE` v1: wincap .001, freegame .1, 0 .4, basegame .5. v2: wincap .001, fg_briefing .04, fg_orders .03, fg_blackout .03, 0 .4, bg_sub .24, bg_mid .24, bg_big .019 | BASE_PROFILE v2 is the default |
| `bonus` (Stage Door) | 100 | the 100k PUBLISHED v1 books are reused unchanged | unchanged (wincap, fgfloor4..7) | do NOT re-simulate; `SIMS=0` + reweight only |
| `entrance_orders` | 100 | 50 000 (seed offset 1 000 000) | wincap .001, fgfloor4 .55, fgfloor5 .25, fgfloor6 .12, fgfloor7 .079 | one mission, no random draw |
| `entrance_blackout` | 100 | 50 000 (seed offset 2 000 000) | same | |
Flags: doors `is_feature=False, is_buybonus=True`; base unchanged. Names contain no buy / bet / super. `generate_configs` hashes the files of EVERY mode:
run the three missing modes in one invocation (or in `run.py` order) and `generate_configs` last. Counts: threads x batch multiples; with 3 threads and batch 6250
that is 18 750 (50k is NOT a multiple: use 56 250 = 3 x 6250 x 3 or 46 875 = 3 x 3125 x 5; for 50 000 `create_books` rounds the repeats and silently drops 5 books, 49 995 are written).
`config.seed_offsets` (missions.SEED_OFFSETS): base 0, bonus 0 (the published books are defined by it), orders 1 000 000, blackout 2 000 000, fuse 3 000 000.

## 2. Calibration knobs (calib_params.py, you create it; every name is read with a default; env `AM_CALIB` JSON beats it)
| name | meaning | default |
|---|---|---|
| `DIAL_STEP` | `{mission: step}` partial dicts keep the other missions | `{'briefing': 8, 'orders': 7, 'blackout': 3, 'fuse': 2}` (briefing: config.gm_step) |
| `DIAL_START`, `DIAL_CAP` | dial start / cap of every mission | config.gm_start (1), gm_cap (100) |
| `LENS_MULT` | Blackout multiplier, INTEGER >= 2 (payouts stay multiples of 0.1x) | 4 |
| `LENS_SIZE`, `ROUTE_LEN` | Blackout window, entries of a `lightRoute` | (2, 2), 6 |
| `FUSE_PARAMS` | `{mission: {len, b0, adv, detmin}}` wire override (briefing / orders / blackout use config.fuse_params) | fuse: 12 / 5 / 2 / 3 |
| `PAYTABLE_SCALE` | float or `{symbol: float}`; every entry rounded to 0.1x, min 0.1x | 1.0 |
| `MISSION_WEIGHTS` | mission mix of `base` (also the v2 criteria quotas and fence shares) | 40 / 30 / 30 |
| `LAYOUT_WEIGHTS` | base floor-plan draw | 50 / 22 / 14 / 14 |
| `THIRD_MISSION` | `'blackout'` or `'fuse'` (the Long Fuse fallback: door `entrance_fuse`) | blackout |
| `BASE_PROFILE` | `'v1'` (shipped criteria / fences) or `'v2'` (one criterion per pinned fence) | v2 (the optimizer experiment met the targets, PROGRESS.md) |
| `BASE_BUCKET_EDGES` | edges of the win buckets sub / mid / big | (1.0, 5.0) |
| `WILD_COUNT` | `{'BR0': n, 'FR0': n}` for tools/make_reels.py only (the game code does not read it) | 3 / 4 |
Run-level: `AM_MISSION_WEIGHTS` (flat or per mode JSON) and `AM_LAYOUT_WEIGHTS` beat every config. `{"briefing":1}` + `{"mezzanine":1}` = v1 books bit for bit.

## 3. Force keys you can read (force_record_<mode>.json, one record per `record()` call)
`{"mission": id}` (base and the new doors; NOT bonus), `{"layout": id}` (base), `{"bonusTier": n}` (doors), `{"bw": sub|mid|big}` (base non-trigger winners, profile v2 criteria `bg_*`).
Shares for `shares.json` come from these keys weighted by the final lookup table (`tools/base_opt_probe.py report` shows the computation).

## 4. Tools written by WP8 (all new files, run with `math/env/bin/python`, <= 3 processes)
* `tools/mission_smoke.py smoke --mode M --n 5000 --procs 3` (in-process, reconciles every book), `gate --mission blackout`, `v1equiv`, `pipeline --n 6000` (real `create_books` for all modes in a scratch game id).
* `tools/mission_calib.py door --mission M --n 12000` (applies the SAME tilt recipe as `tools/reweight_bonus.py` to a fresh pool and prints lam, median, P(R > price), 30-60x share; reproduces the published `bonus` numbers), `natural` (base trigger pool of one mission without floor), `--pin-over P` (feasibility of pinning P(R > price)).
* `tools/base_opt_probe.py run --books 93750 --profile v2 --keep` (scratch game id, restores `setup.toml`), `report`.
`reweight_bonus.py` is bonus-only (`bonus_tiers.json`, one cache): generalise it to `(mode)` and read tier from the books or from `bonusTier` in `force_record_<mode>.json`.

## 5. Numbers and open items
All stamps and numbers are in PROGRESS.md (section WP8). Short version:
* Base v2 (profile default): 93 750 books simulate in 303 s on 3 threads (v1 profile about 60 s), the Rust optimizer takes 136 s on 3 threads; weighted table: RTP 0.96000, hit 23.32 %, P(R > 1x) 12.52 %, sub-stake wins 10.8 % of spins, missions pinned 40/30/30 (each 74.2x mean book win), layout shares 50.2/21.7/13.3/14.8 % (outputs). `OptimizationExecution.run_opt_single_mode` rewrites the tracked file `optimization_program/src/setup.toml`: restore it with `git checkout -- math/optimization_program/src/setup.toml` after a run. The optimizer is not reproducible run to run (the pinned shares are, the shape inside a fence is not).
* Doors: with the plain exponential tilt of `reweight_bonus.py` the estimated final tables are Orders median 65.4x / P(R > price) 29.6 %, Blackout 65.5x / 28.9 % (published Briefing 64.1x / 28.8 %): the 30 % target is missed by 0.4 / 1.1 points. A reweight that adds a boost on the books above the price (`mission_calib.py door --pin-over 0.31` shows kappa 0.146 / 0.218) reaches 31.0 % with median 66.3x / 66.9x and RTP exactly 96.000 %: please build it into the generalised reweighter (one lambda AND one kappa per mode).
* Wincap criterion on the WCAP strip works in every door (1.0 attempts per book, 11-12 ms): 300 wincap books per door all reach 5000x and reconcile; for Orders 296 of 300 cap when an envelope opens (`caseOpen.capped`), 4 of 300 while banking at x1.
