# Readiness: The Unleashed Mine

Measured 2026-10-23 on this checkout (front v1.0.0). Everything below except the Studio dashboard clicks is prepared in the repo. Re-run the commands before uploading: the art and the front-end source were still being restyled by other agents, and the math may be regenerated.

Status key: READY = file exists and passed; HUMAN = a click in Studio is still needed.

## The 7 checks

### 1. Game tile 3:4 (media library) - file READY, upload HUMAN
- File: `frontend/assets/store/tile_3x4.png`
- Measured: `file` -> PNG 1536 x 2048 (ratio 0.75 = 3:4), RGB, 1,257,894 bytes.
- Check: `file frontend/assets/store/tile_3x4.png`
- Older realistic version kept for reference (not for upload): `tile_3x4_v1_glossy.png`.

### 2. Cover art 16:9 - file READY, upload HUMAN
- File: `frontend/assets/store/cover_16x9.png`
- Measured: PNG 1920 x 1080 (16:9), RGB, 785,239 bytes.
- Check: `file frontend/assets/store/cover_16x9.png`
- Both images are hand-built SVG rendered to PNG, no generative AI, no RTP text, no third-party logos (`frontend/assets/store/README.md`).

### 3. Front-end version published - zip READY, upload HUMAN
- Build: `node frontend/tools/build/build_front.mjs` (reads `frontend/VERSION` = 1.0.0)
- Output: `dist/the_unleashed_mine_front_v1.0.0.zip` (92,861 bytes at last build, 2026-10-23; sha256 printed by the build and listed per file in `dist/front_MANIFEST.txt`), and the same files unzipped in `dist/front/`.
- Contents (22 files incl. the mascot module and its CSS): `index.html` at the zip root, `styles.css`, `src/**` (runtime modules only; `src/render/devbooks.js` is excluded because nothing imports it), `data/rules_data.json`. No tests, tools, fixtures, notes, dev pages, screenshots or store art.
- Static checks done by the build: no absolute `/path` URLs, no `http(s)://` literals other than SVG namespace URLs (none found), no missing references. The build exits 1 if any appears.
- Sub-path test: `PW_DIR=<dir with node_modules/playwright-core> node frontend/tools/build/verify_build.mjs` serves `dist/front` at `http://localhost:5230/game/v1/` with the mock RGS on 5231 (URL `?sessionID=t&rgs_url=http://localhost:5231&lang=en&currency=USD&device=desktop&social=false&demo=false`), places a bet at 1280x720 and 412x800 and screenshots to `dist/verify_*.png`. Last run: 0 console errors or warnings, 0 HTTP 404s, 0 failed requests; RGS calls `/wallet/authenticate` 200 and `/wallet/play` 200; balance 1,000.00 -> 999.00 after the bet.
- Re-run the build after any source change; the zip must be rebuilt after the other agents finish restyling.

### 4. Math version published - files READY, upload HUMAN
- Pack: `node frontend/tools/build/pack_math.mjs` (waits until no file in `publish_files` changed for 30 s; add `--deep` to decompress and compare every book against the CSV, about 1 minute).
- Output: `dist/math_upload/` with `index.json`, `books_base.jsonl.zst` (38,943,640 bytes), `lookUpTable_base_0.csv` (2,010,731), `books_bonus.jsonl.zst` (313,703,402), `lookUpTable_bonus_0.csv` (2,207,842), plus `MANIFEST.txt` (sha256 of each). Upload the five data files; `MANIFEST.txt` is documentation only, leave it out of the strict index.json set.
- Format checks passed: `index.json` has the strict form (2 modes, limit 20; costs 1.0 and 100.0; every listed file exists, no extra keys); CSV rows are `id,weight,payout` uint values; every payout is a multiple of 10 (0.1x); all 100,000 books per mode contain `id`, `events`, `payoutMultiplier` and match the CSV payout (checked with `--deep` on an earlier set; the last pack checked the first 5,000 books of each mode with 0 mismatches); sha256 of CSVs and books equal those in `math/games/the_unleashed_mine/library/configs/config.json`.
- Notes: the SDK ids start at 0 (CSV and books agree); the docs example starts at 1 but only requires the two to match. Names follow the docs example (`books_<mode>.jsonl.zst`, `lookUpTable_<mode>_0.csv`). The bonus book file is 314 MB (it grew from 262 MB when the Fuse Line events were added); the repo docs state no size limit, so watch for an upload limit in Studio.

### 5. Math validation (RTP, hit rate, max win per mode) - numbers READY, Studio runs it
Recomputed from the CSVs by `pack_math.mjs` (RTP = sum(weight x payout/100) / sum(weight) / cost):

| Mode | Cost | Rows | RTP | Hit rate | Max win | P(max win) | Median | Min payout |
|---|---|---|---|---|---|---|---|---|
| base | 1x | 100,000 | 96.0000% | 29.071% | 5,000.0x | 1 in 5,000,025 | 0x | 0x |
| bonus (UNLEASH) | 100x | 100,000 | 96.0000% | 100.000% | 5,000.0x | 1 in 50,000 | 42.6x of the 100x cost | 30x |

Both modes are within 0.0000% of each other; max win equals the 5,000x cap in `game_config.py` and `config.json` (`maxWin: 5000`). The front-end `data/rules_data.json` shows the same RTP and max win. Result also in `dist/math_validation.json`.

### 6. Bet-level validation (at least one valid template) - values READY, entry HUMAN
- Spec: `docs/betlevels.md` (exact micro-unit numbers per currency).
- Main template (USD, EUR, CAD, GBP, XSC, XGC): min 100000, max 100000000, step 100000, default 1000000, levels 0.10 0.20 0.50 1 2 3 5 10 20 50 100 (micro-units in the doc). MXN and JPY ladders are in the doc too.

### 7. Open reviews (first-time publishers: 1 at a time) - text READY, submit HUMAN
- Text: `docs/SUBMISSION_TEXT.md`. Submit only after checks 1-6 are green; do not open a second review while one is pending.
- Evidence to point at: `frontend/tests/guidelines/REPORT.md` (37 PASS, 0 FAIL, 2 AT RISK at its last run; re-run `node frontend/tests/guidelines/run.mjs` after the restyle).

## Studio steps for the human, in order
1. Media library: upload `tile_3x4.png` as the game tile and `cover_16x9.png` as the cover art (check 1, 2).
2. Front end: create a front-end version, upload `dist/the_unleashed_mine_front_v1.0.0.zip` (rebuild it first), label it 1.0.0, wait for it to publish (check 3).
3. Math: create a math version, upload the five files from `dist/math_upload/` (not MANIFEST.txt), wait for the upload checks to finish (check 4).
4. Open the math validation page and compare RTP, hit rate and max win with the table above (96.00%, 29.07% / 100%, 5,000x); all must be green (check 5).
5. Bet levels: create the template from `docs/betlevels.md` (USD ladder first; add MXN and JPY if the dashboard allows per-currency sets), run its validation (check 6).
6. Attach the published front version and math version to the game, then open ONE review and paste `docs/SUBMISSION_TEXT.md` (check 7). Wait for the result before opening another.

## Known open items
- Front sources and store art were being restyled at build time; re-run the front build (check 3), the sub-path test and the guideline suite after they settle.
- QA report AT RISK items: "stake" word appears only in a social-wording replacement rule (`src/i18n/social.js`, not displayed); wide currency strings clip only in a 7-figure balance stress case.
- No legal clearance, trademark search or patent opinion has been done; this file claims none.
