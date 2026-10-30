# NOTES WP4 RENDER-CORE, milestones 2 and 3 (running log)

Owner: WP4. Files: `frontend_mambo/src/render/{index,devbooks,motion,camera,celebrate,geo}.js`, `frontend_mambo/tests/render/**`.
Ports 5900-5909 (5900 perf server, 5901 scratch, 5902/5903 browser suite static + mock RGS, 5904/5905 guideline runner).
Scratch: `/tmp/claude-0/scratch/wp4/`. Previous log: `docs/v2/NOTES_WP4_RENDER.md`.

Jobs in order: (1) perf of the gravity drop (WP10_to_WP4, WP5_to_WP4 item 6), (2) floor plans (SYNTHESIS 3), (3) missions (SYNTHESIS 2/8, WP8_to_FRONT).

## Log
### Session 1, 2026-10-30
- Baseline before any change (`node tests/e2e/perf_tumble.mjs --rate 4 --runs 1 --port 5900`, 1024x576): p50 33.3, p95 66.6, p99 116.7 ms,
  layers idle 33 / median 45 / p90 55 / max 64 -> layersOk false.
- Idle page alone at 4x CPU (no book playing, harness tests/fx): p50 16.7, p95 50.0 ms, 33 layers (8 ActiveTransformAnimation, 11 Overlap,
  5 Canvas, 3 WillChangeTransform). So p95 <= 16.6 ms at 4x is out of reach for the render core alone: the idle floor is 50 ms.
- (1) PERF, first try: reveal / drop-out by one wrapper per reel + the gravity drop, pop and ripple as registered custom properties
  (main thread): layers p90 40 / max 42, but p50 rose 33 -> 50 ms in an interleaved A/B against the HEAD copy (`/tmp/claude-0/scratch/wp4/ab.sh`,
  HEAD exported with `git archive` to `/tmp/claude-0/scratch/wp4/head`). Main-thread interpolation of 15-30 cells costs more than layers.
- (1) PERF, kept: the gravity drop moves ONE wrapper per reel and fall distance (`dropGroup`): the new symbols fall as a block of n rows and
  so does every survivor above a one-piece hole, so it is one wrapper per reel in the common case. Pop and ripple stay custom properties
  (short, few cells). Rects read once per frame (`rects()` cache), no forced reflow in `chip()` (bump restarted on the next frame).
  Interleaved A/B, 3 rounds, 4x CPU, 1024x576 (load average 6-7, other agents running): HEAD p50 33.3 / p95 66.7-83.4 / layers p90 56 max 64;
  NEW p50 33.3 / p95 83.3 / layers p90 41 max 47 -> layersOk true. p95 is quantised at 16.7 ms steps and not distinguishable from HEAD.
- Trace of the 30-cell tumble book at 4x (`/tmp/claude-0/scratch/wp4/trace.mjs`, main thread 30.5 s busy of 31.8 s): Commit / UpdateLayers 8.4 s,
  CanvasResourceProviderSharedImage::ProduceCanvasResource 7.4 s (the 5 full-screen canvases of scene/fx redrawn and uploaded every frame,
  WP5), paint 5.8 s, style+layout 5.1 s, rAF callbacks 4.7 s (heroine rig ~3 s of JS: setE / render / seg). Same totals HEAD vs NEW.
  The idle page alone is p95 50 ms at 4x: the 16.6 ms budget is out of reach from the render core.
- (2) FLOOR PLANS done in index.js: S.plan / S.rows (drawn plan), buildSlots (.slot.void = not a cell), applyPlan (rows6 classes, outline viewBox,
  per-reel clip under a cut corner, FLIP morph of the frame on `scale` + `translate`, 417 ms, Calm/Still opacity dip of the same length),
  syncPlan at every reveal (v1 book after Annex, first free-spin reveal), `layout` event = drop-out + plan before the reveal. posRow() maps every
  compact-padded position through geo.toGeo; fuse events are geometric. Annex frame: injected CSS (!important on --cell, /6.5 of the height,
  portrait /6.45 minus the top gap). Annex wire adapter (wireHost covering 5 of 6 rows, rows shifted by WO) until wire.js reads ctx.rows().
- Measured (harness and real shell): Annex cell 34.6 px at 400x225 (>= 24), 53.8 px in the real shell at 425x812 (heroine column + ledger),
  no overflow and no page scroll for the 4 plans at the 4 viewports, heroine box never overlapped.
- (3) MISSIONS done: onMission (state, meter.mission, react('outfit'), scene.setMission when it exists, unknown id = briefing), caseOpen beat
  (420 ms after the envelope starts, WIN = caseOpen.win, quiet or celebrated by the gate), banked steps: no ledger tick, no popup, no WIN,
  x4 lens tag in popups, celebrate.js createRound handles caseOpen. WP6_to_WP4 items 1 and 2 applied (ctx.audio/mascot/fmt/mode, neutral
  trigger title when en.js has fs.incoming), setCap from rules_data (WP5 item 1).
- Fixtures: tests/render/fixtures/v2_books.json (24 real books, built by /tmp/claude-0/scratch/wp4/pick.py from fixtures_out samples).
- Tests: tests/render/browser_v2.mjs P+M 123/123; V vs HEAD copy 0.00 % pixels differ; vs the true v1 commit b132a01 13-15 % differ, by eye
  the same symbols in the same cells, the difference is the v1 idle bob (always on in v1) vs the v2 stepped clock/Still (WP5).
- tests/core: `tests/shell/doors.test.mjs` "only Stage Door is offered" fails (shares data landed for the doors; WP1/WP11), not WP4.
- Annex wire adapter verified by screenshot (book plan_annex_win, path on geometric row 5): the wire lies on the bottom row and climbs at
  reels 4-5 as the event says.
- Mission screenshots looked at (1024x576, 425x812, 400x225, 1280x720): caseOpen (OPENED, `5.00 x8 = 40.00`, WIN 40.00, chip $40.00),
  Blackout window + x4 tag + dimmed board. Plan shots in tests/render/shots/wp4_plan_*.png.
- frontend_mambo/fixtures now holds v2 base books (layout events, Sealed Orders base triggers): tests/render/browser.mjs oracle made
  banked-aware (caseOpen pays, banked steps do not) and the end-of-book cell count plan-aware. `--quick --only=B` 114/114, A-F 195/203
  before that fix (the 8 failures were the test's own 30-cell / non-banked assumptions).
- Guideline runner (PORTS=5904,5905, report to scratch, tests/shots restored from a backup taken before the run): 38 PASS, 8 FAIL, 1 AT RISK.
  [31], UNL-MIN-USD/JPY/MXN, WIN-bonus-* fail identically with the pre-WP4-M2 render files (A/B copy in /tmp/claude-0/scratch/wp4/ab2):
  the entrance confirm now needs a door pick and the runner's bonus fixtures moved (WP1 / WP10). [172] failed once under load, PASS on rerun.
  [275] AT RISK = `pGtStake` in data/rules_data.json (WP11).
- Baseline (`node tests/e2e/baseline.mjs --rate 4 --runs 3 --port 5900 --json <scratch>`, load 2-7): 1024x576 p95 99.9 layers p90 41 max 47;
  400x225 p95 66.7 layers 39/45; 800x450 p95 66.7 layers 41/47; 425x812 dpr 3 p95 99.9 layers 36/42; layersOk true everywhere.
- Requests written: WP4_to_WP5 (wire rows, scene.setMission, canvas cost), WP4_to_WP6 (ctx fields, stamp over a cell), WP4_to_WP1 (setMode,
  fs.incoming, Annex CSS, doors test), WP4_to_WP10 (perf numbers, 36-cell baseline, new suite).

## Resume point
All three jobs are committed. Left for later: drop the Annex wire adapter when wire.js sets `rowsAware` (WP5), drop the x9 audio-meter hold
when WP2 adds `setMeter(n, { quiet })` (M1 note), the remaining p95 is outside the render core (canvases, rig, layers commit).
