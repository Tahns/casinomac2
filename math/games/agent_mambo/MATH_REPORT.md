# Agent Mambo v2: math report (WP9 MATH-PIPELINE)

Built 2026-10-30 on branch `claude/elegant-bell-5q79k8`, restarting the WP9 run of 2026-10-26, which stopped after its door simulations. The spec is `docs/research2/SYNTHESIS.md`, sections 2, 3, 4, 7, 8 and 9. **Every number below comes from the generated tables and books in `library/`** (shares.json, analysis_v2.json, verify_v2.json, volatility_v2.json, wp9_reweight.json, wp9_recompress.json, wp9_timing.jsonl). The tables in the middle section are printed by `tools/report_v2.py`. Nothing in them is typed from memory.

## Summary against the targets

| Target (SYNTHESIS 4 / 9 and the WP9 brief) | Result | Status |
|---|---|---|
| RTP 96.000 % +-0.0005 in every mode | base 96.0000 %, bonus 96.0000 %, entrance_orders 96.0000 %, entrance_blackout 96.0000 % (integer weights) | MET |
| Max win 5000x in every mode, P = 1/50 000 per door | doors exactly 1 / 50 000 (100 / 103 / 103 wincap books); base 1 / 5 000 001 (112 wincap books, base is not under the 1/50k rule) | MET |
| P(win >= 5000x) < 1 % in every mode | base 2.0e-07, each door 2.0e-05 | MET |
| Base hit >= 23 % | 23.32 % (v1 29.07 %) | MET |
| Base P(R > 1x) >= 11.5 % (stretch 13 %) | 12.52 % (v1 8.88 %) | MET; stretch MISSED by 0.48 points |
| Each door P(R > price) >= 30 % (hard floor: v1 28.8 %) | Stage Door 31.00 %, Coat Check 31.00 %, Service Stairs 31.00 % | MET (needs the kappa boost, see the misses) |
| Door median >= 64x | 65.6x / 66.8x / 66.2x (v1 Briefing 64.1x) | MET |
| >= 100 000 books in every mode (new user rule) | base 112 500, bonus 100 000 (the published v1 books, reused), entrance_orders 103 125, entrance_blackout 103 125 | MET (no 50k fallback) |
| zstd level 15, total <= 0.7 GB | 427.0 MB of books, 436.3 MB for all of publish_files | MET |
| Orders + Blackout calibration within 90 min | 3 min (13:04:35-13:07:28 UTC); the SYNTHESIS knob values were kept | MET, no cut line |
| SDK execute_all_tests, final_checks, pytest, exhaustive book check | all pass: 159 pytest tests; 418 750 books reconciled with 0 errors | MET |

**No cut line was applied.** All four modes ship: base with the 4 floor plans and the 3 missions, The Briefing (`bonus`), Sealed Orders (`entrance_orders`) and Ballroom Blackout (`entrance_blackout`).

## How the set was built (what ran, in order)

0. **v1 safety.** `library/publish_files_v1` holds real copies of the five v1 files, not hard links. A hard link would have been truncated by the SDK writers. The 2026-10-26 run checked the sha256 of each copy. `library/_v1_backup` holds the v1 configs, forces, lookups and the plain-stream sha256 of the v1 books. The `bonus` books after recompression decompress to exactly the v1 plain stream: 3 314 458 810 bytes, sha256 0b2cc69b..., checked by `test_bonus_books_are_the_v1_books`. The Briefing door keeps the v1 payout of every id; only its weights moved.
1. **Layout smoke** (`tools/layout_bench.py`). `bench` ran 4 plans x 20 000 SDK boards with no IndexError or GeometryError, and the cell count was conserved on every tumble step. `spins --n 1500` ran full books per plan, and the events reconcile on every book.
2. **Orders calibration** (`tools/calib_scan.py --preset orders`). Three samples of 2000 books with 0 reconcile errors:

| Dial step | Natural mean / median (30x floor) | Plain tilt P(R > price) | Pinned to 31 %: kappa, median, 300x+ |
|---|---|---|---|
| 7 (shipped) | 115.9x / 70.5x | 29.48 % | 0.147, 64.2x, 3.53 % |
| 5 | 98.4x / 63.5x | 28.42 % | 0.261, 65.3x, 4.23 % |
| 9 | 134.2x / 79.1x | 30.09 % | 0.093, 67.1x, 3.12 % |

3. **Blackout calibration** (`--preset blackout`). Five samples of 2000 books with 0 reconcile errors:

| Variant | Natural mean / median | Plain tilt P(R > price) | Pinned: kappa, median |
|---|---|---|---|
| step 3, lens x4 (shipped) | 116.5x / 71.8x | 30.07 % | 0.084, 67.2x |
| step 2 | 94.5x / 62.2x | 26.28 % | 0.543, 66.4x |
| step 4 | 136.5x / 80.7x | 30.65 % | 0.032, 68.3x |
| lens x3 | 101.4x / 66.0x | 26.65 % | 0.490, 68.1x |
| lens x5 | 129.6x / 78.2x | 29.84 % | 0.111, 68.2x |

   No variant beat the SYNTHESIS values by more than the noise of a 2000-book sample (about 1 point on P(R > price)). DIAL_STEP, LENS_MULT and ROUTE_LEN in `calib_params.py` are therefore unchanged. The seeds are deterministic, and these samples reproduce the 2026-10-26 numbers to the digit.
4. and 6. **Base.** `run.py sims` ran 112 500 books (v2 profile: one criterion per Rust fence, missions pinned by `{"mission": id}`, win buckets by `{"bw": bucket}`), followed by `run.py opt`, the Rust optimizer on base only. **The base was simulated once.** No calibrated knob touches the base game, so the M2 base and the "base final" are the same pool.
5. **Door pools.** `entrance_orders` and `entrance_blackout` got 103 125 books each (11 x 3 threads x 3125; the batch is 3125 because a door book is 32-36 KB of JSON). Each was one `create_books` call, with seed offsets of 1 000 000 and 2 000 000. `bonus` was **not re-simulated**: its 100 000 published books are valid, because the Briefing's wire, dial, strips and paytable are unchanged.
7. **Door weights** (`tools/reweight_doors.py`, the Rust optimizer is not used for doors). Each mode gets one exponential tilt plus one boost: weight = tier share x exp(-lam x) x (1 + kappa [x > 100]), normalised per scatter tier. Tier shares are pinned at 88 / 10 / 1.78 / 0.22 %, and P(5000x) is pinned at 1/50 000, split over the wincap books. lam is solved for RTP 96.000 % and kappa for P(R > price) = 31 % (`calib_params.DOOR_PIN_OVER`). The 30x floor is kept because every book pays at least 30x.
8. **Recompression** to zstd 15 (`tools/recompress.py`). Each file was written to a tmp file, decompressed again and compared by plain sha256, then swapped in with `os.replace`. Afterwards the sidecar hashes and `generate_configs` were refreshed.
9. **Checks.** SDK `execute_all_tests` passed (run.py checks + tools/final_checks.py: hashes, payout hashes, entry counts). `tools/verify_library.py` reconciled EVERY book of every mode with 0 errors. pytest `tests/` gave 159 passed (test_layouts 71, test_missions 43, test_math 45). `tools/analyze_v2.py`, `tools/volatility_v2.py` and `tools/make_shares.py` produced `library/shares.json`.
10. Front-end fixtures went to `library/fixtures_out/` (this tool does not write to `frontend_mambo/`).

### Results per mode (weighted by the final lookup tables)

| Mode | Cost | Books | RTP | Max win (odds) | Hit rate | Median | Mean | Std | P(R > 1x stake) / P(R > price) |
|---|---|---|---|---|---|---|---|---|---|
| base | 1x | 112,500 | 96.0000 % | 5000x (1 / 5,000,001) | 23.32 % | 0x | 1.0x | 7.5x | 12.52 % |
| bonus (The Briefing, Stage Door) | 100x | 100,000 | 96.0000 % | 5000x (1 / 50,000) | 100 % (floor 30x) | 65.6x | 96.0x | 90.3x | 31.00 % |
| entrance_orders (Sealed Orders, Coat Check) | 100x | 103,125 | 96.0000 % | 5000x (1 / 50,000) | 100 % (floor 30x) | 66.8x | 96.0x | 88.8x | 31.00 % |
| entrance_blackout (Ballroom Blackout, Service Stairs) | 100x | 103,125 | 96.0000 % | 5000x (1 / 50,000) | 100 % (floor 30x) | 66.2x | 96.0x | 89.9x | 31.00 % |

### Base game

- hit 23.32 %, P(R > 1x) 12.52 %, sub-stake wins (0 < R <= 1x) 10.80 %, exactly 1.0x 0.79 %, dead spins 76.68 %, mean win of a hit 4.12x, trigger 1 in 200.0

| Floor plan | Share of spins | Hit | P(R > 1x) | Mean win | RTP points |
|---|---|---|---|---|---|
| annex | 14.61 % | 31.49 % | 17.87 % | 1.154x | 16.87 |
| atrium | 21.42 % | 19.67 % | 10.43 % | 0.853x | 18.26 |
| lobby | 13.76 % | 17.33 % | 8.71 % | 0.804x | 11.07 |
| mezzanine | 50.21 % | 24.14 % | 12.89 % | 0.992x | 49.80 |

| Mission | Share of triggers | Share of spins | Mean book win | RTP points |
|---|---|---|---|---|
| blackout | 30.00 % | 0.150 % | 74.2x | 11.14 |
| briefing | 40.00 % | 0.200 % | 74.2x | 14.84 |
| orders | 30.00 % | 0.150 % | 74.2x | 11.12 |

| Win | Spins | RTP points |
|---|---|---|
| [0,0.0001)x | 76.680 % | 0.00 |
| [0.0001,1.0001)x | 10.803 % | 4.90 |
| [1.0001,2)x | 4.721 % | 6.87 |
| [2,5)x | 3.121 % | 9.72 |
| [5,10)x | 2.942 % | 20.24 |
| [10,20)x | 1.298 % | 17.85 |
| [20,40)x | 0.081 % | 2.47 |
| [40,100)x | 0.248 % | 16.44 |
| [100,300)x | 0.100 % | 15.07 |
| [300,1000)x | 0.006 % | 2.31 |
| [1000,5001)x | 0.000 % | 0.12 |

| Spins | Ends above start | Median net | Mean net | 10th / 90th percentile | Lost over half |
|---|---|---|---|---|---|
| 100 | 31.0 % | -27.3 | -4.2 | -61 / 83 | 28.5 % |
| 300 | 36.6 % | -40.2 | -12.1 | -137 / 146 | 7.6 % |

P(no win in 10 spins) 7.0 %; free-game share of RTP 38.6 %; base-spin wire burns 22.9 %, blasts 5.6 %

### Doors

| Door | Median | P(R > price) | 30-60x | 60-100x | 100-300x | 300x+ | p10 / p90 | Start spins 10 / 12 / 15 / 18+ |
|---|---|---|---|---|---|---|---|---|
| bonus (The Briefing, Stage Door) | 65.6x | 31.00 % | 45.1 % | 23.9 % | 27.6 % | 3.47 % | 34.5x / 189.7x | 88.00 % / 10.00 % / 1.78 % / 0.22 % |
| entrance_orders (Sealed Orders, Coat Check) | 66.8x | 31.00 % | 43.9 % | 25.0 % | 27.8 % | 3.29 % | 35x / 188.3x | 88.00 % / 10.00 % / 1.78 % / 0.22 % |
| entrance_blackout (Ballroom Blackout, Service Stairs) | 66.2x | 31.00 % | 44.7 % | 24.3 % | 27.7 % | 3.36 % | 34.8x / 189.4x | 88.00 % / 10.00 % / 1.78 % / 0.22 % |

| Door | Free spins played | Retrigger share | Mean highest dial | Reaches x50 / x100 | RTP paid at dial >= 20 | Wire burn / blast (free) | Winning steps per book |
|---|---|---|---|---|---|---|---|
| bonus | 17.3 | 65.9 % | x48.8 | 32.7 % / 1.6 % | 77.9 % | 30.6 % / 3.7 % | 6.0 |
| entrance_orders | 16.0 | 57.8 % | x38.4 | 23.6 % / 0.4 % | 82.9 % | 29.4 % / 3.5 % | 5.4 |
| entrance_blackout | 16.9 | 63.8 % | x18.5 | 0.2 % / 0.0 % | 17.8 % | 30.2 % / 3.7 % | 5.8 |

Orders: 4.71 envelope openings per book, mean bank 0.78x, capped openings 0.00 %

Blackout: lit share of winning steps 53.3 %

### Volatility (tools/volatility_v2.py, final tables; R = return / round price)

| Mode | std of R | skew | excess kurtosis | P(win >= 5000x) | P(R < price) | P(R > price) | 99th / 99.9th pct of R |
|---|---|---|---|---|---|---|---|
| base | 7.467 | 85.0 | 41452 | 2.00e-07 (1 / 5,000,001) | 86.69 % | 12.52 % | 13.80 / 103.60 |
| bonus | 0.903 | 6.4 | 192 | 2.00e-05 (1 / 50,000) | 68.97 % | 31.00 % | 4.52 / 8.09 |
| entrance_orders | 0.888 | 6.6 | 205 | 2.00e-05 (1 / 50,000) | 68.95 % | 31.00 % | 4.44 / 7.78 |
| entrance_blackout | 0.899 | 6.6 | 199 | 2.00e-05 (1 / 50,000) | 68.96 % | 31.00 % | 4.48 / 8.00 |

### Reweight (tools/reweight_doors.py)

| Mode | lambda | kappa | effective books | P(R > price) | median |
|---|---|---|---|---|---|
| bonus | 0.001307 | 0.2299 | 68470 of 100,000 | 31.00 % | 65.6x |
| entrance_orders | 0.001080 | 0.1760 | 70778 of 103,125 | 31.00 % | 66.8x |
| entrance_blackout | 0.001629 | 0.2246 | 70342 of 103,125 | 31.00 % | 66.2x |

### Book files

| Mode | zstd 3 | zstd 15 | ratio |
|---|---|---|---|
| base | 44.3 MB | 19.1 MB | 2.32 |
| bonus | 317.2 MB | 132.1 MB | 2.40 |
| entrance_orders | 307.7 MB | 127.6 MB | 2.41 |
| entrance_blackout | 353.5 MB | 148.3 MB | 2.38 |
| total | 1022.7 MB | 427.0 MB | 2.39 |

### Verification (every book)

- base: 112,500 books, 0 errors, 112 wincap books, 4.6 s
- bonus: 100,000 books, 0 errors, 100 wincap books, 22.7 s
- entrance_orders: 103,125 books, 0 errors, 103 wincap books, 23.7 s
- entrance_blackout: 103,125 books, 0 errors, 103 wincap books, 30.8 s

### Wall clock (UTC)

| Step | Start | End | Wall (s) | Detail |
|---|---|---|---|---|
| sims_entrance_orders | 13:07:45 | 13:20:23 | 758.3 | {'books': 103125, 'threads': 3, 'batch': 3125, 'zst_mb': 307.7} |
| sims_entrance_blackout | 13:20:23 | 13:50:37 | 1813.7 | {'books': 103125, 'threads': 3, 'batch': 3125, 'zst_mb': 353.5} |
| sims_base | 13:50:37 | 14:02:09 | 692.5 | {'books': 112500, 'threads': 3, 'batch': 6250, 'zst_mb': 44.3} |
| configs | 14:02:20 | 14:02:41 | 20.3 |  |
| opt_base | 14:02:41 | 14:07:40 | 299.5 | {'threads': 3} |
| reweight | 14:07:56 | 14:08:17 | 21.1 |  |
| recompress | 14:08:29 | 14:33:47 | 1518.4 | {'level': 15} |
| checks | 14:34:06 | 14:34:07 | 1.0 |  |

Wall clock outside `run.py`, UTC on 2026-10-30:

| Step | Time |
|---|---|
| Restart and state check | 13:03-13:04 |
| Layout smoke | 13:04:17-13:04:35 |
| Calibration, 8 samples | 13:04:35-13:07:28 |
| SDK checks, verification of every book, analysis | 14:34:06-14:37:00 |
| pytest | 14:40:19-14:41:35 (76 s) |
| Analysis re-run and fixtures | 14:41:40-14:44:47 |

The front end's browser tests shared the 4 CPUs (load average 10-15), which made the door simulations and the recompression about twice as slow as the 2026-10-26 run. The Blackout pool took 1814 s against 499 s for 56 250 books on 10-26.

## Front-end fixtures (`library/fixtures_out/`, for WP11 to copy into `frontend_mambo/fixtures`)

`books_<mode>_sample.json` (payoutMultiplier in x of the bet) and `.jsonl` (the integer x100 SDK form) cover the 4 modes, plus `index.json`, the four `lookUpTable_<mode>_0.csv`, `shares.json` and `PICKS.md`. PICKS.md lists the ids per category and what each category shows. Selection is deterministic (seed 11), and the books are the final published ones. The set is 344 base books, 152 bonus, 181 orders and 171 blackout, 48 MB in all.

The categories are:
- **Base:** loss, sub-stake, 1-5x, 5x, 15x, 100x, wincap, trigger, retrigger, each layout with and without a tumble, each mission, banked, caseOpen, lightRoute, lit, wire blast and fizzle, dial cap.
- **Doors:** below 100x, 100-300x, 300x+, wincap, retrigger, dial cap, free-spin wire blast, plus the mission specifics. Orders has banked, caseOpen and caseOpen capped. Blackout has lightRoute and lit.

Two categories are empty because no such book exists:
- **Orders `wincapNoCaseOpen` (0 of 103 wincap books):** in this pool every Orders wincap is reached when an envelope opens (`caseOpen.capped`).
- **Blackout `dialCap` (0 books):** with step +3 the dial never reaches x100 in 103 125 books. The highest dial averages x18.5, and 0.2 % of books reach x50.

## Misses and risks (honest list)

1. **Base stretch target missed.** P(R > 1x) is 12.52 % against the 13 % stretch (missed by 0.48 points). The 11.5 % target is met. The cost is a drier game than v1:
   - dead spins 76.68 % (v1 70.9 %);
   - P(no win in 10 spins) 7.0 % (v1 3.2 %);
   - 100-spin sessions ending above the start 31.0 % (v1 33.0 %);
   - median net after 100 spins -27.3 (v1 -26.5).
   - The switch back is `BASE_PROFILE = "v1"` in calib_params.py, which needs a base re-simulation and the optimizer, about 20 min.
2. **The 30 % door target depends on the kappa boost.** The plain exponential tilt (the v1 recipe) would give P(R > price) of 29.25 % for Orders and 28.79 % for Blackout on these pools. Bonus would stay at the v1 28.77 %, missing 30 % by 0.75, 1.21 and 1.23 points. The shipped tables reach 31.00 % by weighting books above 100x by (1 + kappa), with kappa 0.18-0.23 per mode. This leaves a step in the weight density at exactly the price: rounds just above 100x are about 20 % more likely than rounds just below it. It is honest (the shares printed come from these tables), but a reviewer may see it as shaping. `DOOR_PIN_OVER = 0` in calib_params.py restores the plain tilt, a weights-only change that takes 21 s.
3. **Effective sample size after the reweight:** 68 470 of 100 000 (bonus), 70 778 of 103 125 (orders), 70 342 of 103 125 (blackout). This is above 50k per door, but below the raw count.
4. **The Briefing door is reweighted.** Weights only: books and payouts per id are identical to v1. Its published v1 shape moves from median 64.1x / P(R > price) 28.77 % to 65.6x / 31.00 %. The front end and rules text must read shares.json, not the v1 numbers.
5. **Layout shares are outputs, not inputs:** mezzanine 50.21 %, atrium 21.42 %, lobby 13.76 %, annex 14.61 % (nominal draw 50 / 22 / 14 / 14). Annex spins pay more (hit 31.5 %, P(R > 1x) 17.9 %) and Lobby less (17.3 % / 8.7 %). The rules screen must never present a layout as better odds (SYNTHESIS 3).
6. **Base max-win odds** are 1 in 5 000 001 (112 wincap books in the pool), as in v1. Only the doors are pinned to 1/50 000.
7. **The Rust optimizer is not reproducible run to run.** The pinned shares are: missions 40.0 / 30.0 / 30.0 %, each with a 74.2x mean book win. The shape inside a fence is not. Re-running `run.py opt` can move the base buckets slightly.
8. **Blackout's dial matters little.** 17.8 % of its RTP is paid at dial >= 20, against 77.9 % for the Briefing and 82.9 % for Orders. The lens carries Blackout: 53.3 % of its winning steps are lit. This is by design (SYNTHESIS 2), but the Clearance Dial stays low (Largo / Andante bands) in that door.
9. **Platform unknowns are unchanged** (SYNTHESIS 7 "Ask Stake"): maximum book file size per mode, accepted zstd level, `is_buybonus` semantics.
10. **The SDK xlsx stat sheet** (`run.py analysis`, slow) was not regenerated. Volatility comes from `tools/volatility_v2.py` on the final tables. `library/stats_summary.json` was written by the SDK and is consistent for base, but its door skew and kurtosis are in x100 units. Use volatility_v2.json.

## Regenerate
```
cd math/games/agent_mambo
../../env/bin/python tools/calib_scan.py --preset orders     # calibration samples (2000 books each)
../../env/bin/python tools/calib_scan.py --preset blackout
../../env/bin/python run.py sims configs opt reweight recompress checks   # ~85 min on 3 threads under load (library/wp9_timing.jsonl)
../../env/bin/python tools/verify_library.py --procs 3      # every book through the reconciler
../../env/bin/python tools/analyze_v2.py --procs 3 && ../../env/bin/python tools/volatility_v2.py && ../../env/bin/python tools/make_shares.py
../../env/bin/python -m pytest tests -q
../../env/bin/python tools/make_fixtures_v2.py --procs 3    # library/fixtures_out
../../env/bin/python tools/report_v2.py                     # the tables of this report
```
`run.py` defaults to these counts: SIMS_BASE 112 500, SIMS_ENTRANCE_ORDERS / SIMS_ENTRANCE_BLACKOUT 103 125, SIMS_BONUS 0 (reuse the published books). Each count must be a multiple of threads x batch. `OptimizationExecution` rewrites `math/optimization_program/src/setup.toml`, and run.py restores it.
