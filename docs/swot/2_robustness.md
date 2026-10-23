# SWOT 2 - Robustness and math/front consistency

Measured 2026-10-23, read-only: a script streaming all 100 000 books per mode, and the real front on :5320 against a mock copy on :5321.

## Strengths
- **All 200 000 books pass the structural checks.** Every event type is handled by `render/index.js` (18 types, 0 unhandled; `fusePath/fuseBurn/fuseBlast/fuseFizzle` included). `finalWin == payoutMultiplier` in 200 000/200 000; book payout equals the CSV payout for all 100 000 per mode (pack_math only checks the first 5 000).
- **Arithmetic is consistent.** winInfo `win = winWithoutMult x clusterMult x globalMult`, `clusterMult` equals the sum of the vein cells (re-simulated), `setWin` equals the sum of winInfo, `updateTumbleWin` is cumulative. Veins start at 3x, +3 per hit, cap 512: every `updateGrid` equals the expected grid (0 mismatches, max seen 144, so the 512 cap is never reached). Free-spin counters 1..N, trigger and retrigger totals match the tables 4/5/6/7/8 -> 10/12/15/18/20 and 3..8 -> 5..18, scatter positions are `S` on the simulated board.
- **The board model of the renderer equals the math.** I replayed tumbles with the renderer's own algorithm (newSymbols[0] becomes the new pad): newSymbols counts equal exploded counts, every cluster symbol matches (or is W), every blast `replaced` name equals the simulated cell.
- **Fuse Line events are well formed** (241 413 + 1 815 857 paths; 7 833 + 54 305 blasts): 8 cells, 4-connected, self-avoiding, start on reel 0, rows 0..4, `burned` starts at 1 and grows, `newCells` equals the path slice, blast cells are exactly `path[:burned]` minus S/W, blast only with burned >= 3.
- **Real front, 25 replays, 0 problems**: 5 longest books per mode (500-769 events), six 5000x books, fuse blast in base and free spins, UNLEASH. For each: displayed win == bet x payout, balance == start - cost + win, one end-round, `elementFromPoint` at `#btn-bet` and `#btn-sound` hits the button, no `.banner`, banner-layer off, no `fs-mode`, fuse layer empty, 0 console errors or warnings, 0 page errors. The banner-layer fix holds.
- **Reproducible output**: from tracked files only, `build_front.mjs` gives a byte-identical zip (sha256 0a771df0...ef03f9, 92 861 bytes); `pack_math.mjs` reproduces the manifest, and the sha of books and CSVs equals `library/configs/config.json`. `Cargo.toml` is tracked (force-added). pytest 13 and node 21 tests pass.

## Weaknesses
1. **Books keep playing after the win cap.** 100 base books and 103 bonus books carry a `wincap` event; after it they still contain on average 14 free-spin reveals and 115 events (11 499 and 11 798 events in total), each spin with `winInfo` totalWin 500 000 and an unresolved fuse (1 358 / 1 401 spins). The renderer replays all of it: fake 5000x wins repeat, `freeSpinEnd.amount` differs from the sum of `setWin`. Cost measured on book 7 at normal speed: 99.5 s, against 62.1 s when I cut the book at the cap (+37 s). The comment in `tests/test_math.py` ("without evaluating them") is wrong: they are evaluated.
2. **Long rounds.** Mean events per mode: base 7.7, bonus 120. 6.0 % of UNLEASH buys exceed 200 events and 0.16 % exceed 400 (max 769). Turbo replays took 138-320 s (under heavy CPU load); a normal-speed 554-event round takes many minutes. Replay mode hides turbo (`src/replay.js` HIDE list), and no skip exists outside banners.
3. **Test gaps.** Math tests (13) check RTP, hit rate, tiers, and a fuse sample (1 500 books at most), not: updateGrid rules, winInfo arithmetic, counters, tumble counts, tail after the cap, books vs CSV. They read the git-ignored `library/`, so they fail on a fresh clone. Front: nothing tests `render/index.js`, `fuse.js` (`normCells`), `replay.js` or the mascot; `tests/e2e/` is empty. The guideline runner has 0 references to fuse, its categories (`loss/win/bonus/retrigger/maxwin`) never force a blast, and REPLAY-LONG uses a 320-event fixture, not the real maximum. `node --test frontend/tests/audio` fails (hard-coded `/tmp/claude-0/pw` and `/opt/pw-browsers/chromium/chrome`; needs `PW_DIR`).
4. **Hygiene.** Books, CSVs and `config.json` live only in the ignored `library/` (about 350 MB): a clone cannot publish, and `npm run pack:math` ends with `FAIL: source dir missing` unless `--src` is given. No root or frontend README with clone steps; `math/games/the_unleashed_mine/readme.txt` is the SDK template (old "+1 multiplier" rules). `frontend/package.json` says 0.1.0 while `VERSION` says 1.0.0. `math/.gitignore` has `*.toml`, so any new TOML is silently dropped. 135 PNG (51 MB) in `tests/shots` are tracked.
5. Cosmetic: the winInfo `overlay` cell lies outside the cluster in 4 073 base and 40 767 bonus events, so the popup sits on a non-winning cell.

## Platform readiness
| Item | State |
|---|---|
| Tile 3:4 | READY: 1536x2048 (`file`). Upload HUMAN. |
| Cover 16:9 | READY: 1920x1080. Upload HUMAN. |
| Front version | READY: `dist/the_unleashed_mine_front_v1.0.0.zip`, reproducible. Upload HUMAN. |
| Math version | READY: 5 files, sha equal `config.json`, bonus zst 313 703 402 bytes (314 MB, correct). Upload HUMAN. |
| Math validation | READY: RTP 96.0000 % both, base hit 29.071 %, max 5000x, bonus median 42.6x. Studio computes it, HUMAN compares. |
| Betlevel template | Values READY (`docs/betlevels.md`, consistent with `bet.js`); entry HUMAN. |
| Open review | One at a time; **text is stale, fix first**. |

**Stale or wrong in the docs**
- `docs/SUBMISSION_TEXT.md`: "every cell starts at x4, +6" is wrong, it is **x3, +3** (`game_config.py`, `rules_data.json`). Fuse Line is not described at all, although the in-game rules do. Volatility numbers predate Fuse Line. Now (CSV, weighted): 0x 70.9 %, under 1x 19.9 % (text 11.2 %), 1-5x 4.9 % (14.9 %), sd 6.78 and 1.68 (6.73 / 1.61); UNLEASH median **42.6x** (39.9x), 76.5 % return 20-60x (81.6 %), 17.5 % return 100x or more (16.6 %), 0.61 % return 1000x or more (0.33 %). Trigger 1 in 200 (0.500 %) is right.
- `docs/READINESS.md`: median 39.9x (now 42.6x); "37 PASS, 2 AT RISK" (REPORT.md now 44 PASS, 0 FAIL, 1 AT RISK: REPLAY-LONG); tile and cover byte sizes (now 1 265 874 and 852 933); "still being restyled" is outdated. The 314 MB figure is correct.
- REPORT.md's TRIAGE section (219b FAIL) is from an older run; `docs/PATENT_SCREEN.md` still says 4x / +6.

## Opportunities
- Cut the post-cap tail (fix 1): saves about a third of the longest rounds and removes the false 5000x repeats.
- A full-book regression test; a root README; a release artifact for the 350 MB books; forced fuse and extreme-book cases in the guideline runner.

## Threats
- A review text with wrong mechanics and numbers can contradict the Studio validation page and the in-game rules.
- The only copy of the published math is on this disk; regenerating is a multi-hour optimizer run.
- Unknown Studio upload limit for 314 MB.

## Concrete fixes
1. `frontend/src/render/index.js`, `handle()`/`playBook()`: after `wincap`, set `S.capped = true` and skip every event except `freeSpinEnd`, `setTotalWin`, `finalWin`. Alternative in math: `gamestate.py run_freespin` stops the loop when `wincap_triggered`, then re-run `pack:math`; the front fix needs no regeneration.
2. `math/games/the_unleashed_mine/tests/test_math.py`: add a full-book check from `check.py` (arithmetic, updateGrid, counters, tail); skip with a message if `library/` is missing; fix the "without evaluating" comment.
3. `frontend/tests/guidelines/run.mjs`: add cases forcing book ids with `fuseBlast` in base and free spins and the longest real book; assert no post-cap `reveal`.
4. `docs/SUBMISSION_TEXT.md` (x3/+3, Fuse Line paragraph, all volatility numbers), `docs/READINESS.md` (median, counts, sizes), `docs/PATENT_SCREEN.md`.
5. Add `README.md` at the root (clone, `PORT=... node frontend/serve.mjs`, mock, `node --test frontend/tests/core frontend/tests/text`, `npm run build`, `pack:math --src`), replace `math/games/the_unleashed_mine/readme.txt`, align `frontend/package.json` version, add `!*.toml` exceptions or a note in `math/.gitignore`, drop `tests/shots` from tracking.
6. `frontend/src/replay.js`: allow turbo in replay for long books (or a skip control); make `tests/audio/audio.test.mjs` read `PW_DIR`/`CHROMIUM` from the environment only.
