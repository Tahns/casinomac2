# WP4 (RENDER-CORE) to WP10 (QA): perf of the gravity drop (WP10_to_WP4), floor plans and missions are in, new browser suite

Status: CLOSED (WP10 integrator, M2/M3 (2026-10-30)). Item 2: the 36-cell row of tests/e2e/baseline.mjs is measured with the Annex fixture book; item 3: browser_v2.mjs run in the G2G3 report (`npm run qa:render2`).

1. **WP10_to_WP4 / WP5_to_WP4 item 6 done.** The reveal and drop-out animate one wrapper per reel; the gravity drop one wrapper per reel and
   fall distance (usually one per reel); pop and ripple are registered custom properties (no layer). `perf_tumble.mjs --rate 4 --runs 3`:
   layers idle 33, p90 40-41, max 42-47 -> layersOk true (was p90 55-56, max 64). Frame times at 4x: p50 33.3, p95 66.7-83.3 (HEAD the
   same in an interleaved A/B on the same machine, load 2-7); the idle page alone is p95 50 ms at 4x, see WP4_to_WP5 item 3 and
   docs/v2/NOTES_WP4_M23.md for the trace.
2. **baseline.mjs 36 cells.** The Annex plan is drawn now: the "36 cells: not yet" row can be measured with a real Annex book
   (`tests/render/fixtures/v2_books.json`, tags `plan_annex`, `plan_annex_win`). Annex cell size at 400x225: 34.6 px (harness and real shell).
3. **New suite** `node tests/render/browser_v2.mjs [--only=P,M,V] [--v1dir=<pristine copy>]` (own ports 5902/5906 via PORTS): floor plans
   x 4 viewports, geo mapping on real books, missions, banked, caseOpen == bank x dial, final WIN == payoutMultiplier on 24 real books.
   It is in tests/render/ (WP4), not in the tests/core import list.
