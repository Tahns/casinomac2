# WP10 QA + integrator, milestones 2 and 3: running log

Ports 5940-5959 (kill only own PIDs). Scratch: /tmp/claude-0/scratch/wp10/.

## Done
1. tools/mock-rgs/server.mjs: WP11_to_WP10 items 1-2 (MOCK_FIXTURES env, non-recursive scan with the `_sample` aware regex: no phantom
   `entrance` mode, v1 never fills a v2 mode). Force tags: `plan_<id>`, `mission_<id>`, `caseOpen`, `lightRoute` (also in /__mock/state).
   State: fixtures, costs base 1 / bonus, entrance_orders, entrance_blackout 100; 80 / 24 / 32 / 27 books.
2. tests/guidelines/lib.mjs `pickDoor(s, mode)` + run.mjs: door picked before every `#confirm-ok` (WP11_to_WP10 item 4); [219] adds XEC.
3. tests/guidelines/shell.mjs PICKER expects the three doors (WP123_to_WP10 item 4).
4. tests/e2e/modes.mjs (new, `npm run qa:modes`): 4 viewports (1280x720, 1024x576, 425x812 touch, 400x225) x (base on each plan,
   Stage Door, Coat Check, Service Stairs via the picker) + replay of each mode at 1280x720 and 400x225. Trial 1280x720: 103/103.
   Shots: tests/shots/v2_m23/modes_*.png, replay_*.png.
5. tests/guidelines/engine_selfcheck.mjs (new, `npm run qa:engine`): MATH-MODES, [25] [27] [266] recomputed from the lookup
   tables, [275] [213] [223] [185] EXT-SRC static, [266]-UI door cards, [27]-UI rules, [78] XSC/XGC/XEC on the picker. 13/13 PASS.
6. Integrator: WP4_to_WP5 item 1 applied in src/render/wire.js (rowsOf, normCells(cells, rows), viewBox per path, rowsAware);
   WP6_to_WP5 applied in src/render/scene.js (MISSION_FS + MutationObserver on data-mission). Originals in scratch (wire.js.orig,
   scene.js.orig). browser_v2 --only=P 62/62; Annex wire screenshot OK.
7. perf_tumble.mjs `--fixture <jsonl> --id <id>`; baseline.mjs measures 36 cells with Annex book 25532 (from tumble 1).
8. package.json scripts: test (core text heroine render layers), qa:modes, qa:engine, qa:gesture, qa:visual, qa:render2, qa:layers.
9. Request files: status lines written (WP11/WP123/WP1/WP2/WP3/WP5/WP4_to_WP10, WP4_to_WP5, WP6_to_WP5, WP6_to_WP1, WP6_to_WP4).

## Next
- full modes run (bg) -> guideline runner full -> shell.mjs -> browser suites -> perf baseline (idle machine) -> flash on
  Orders / Blackout books -> build + verify -> G2G3_REPORT.md -> commit.
