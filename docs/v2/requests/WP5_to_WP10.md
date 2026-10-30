# WP5 (FX-WIRE) to WP10 (QA): capture scripts, unit tests

- `frontend_mambo/tests/e2e/lib_capture.mjs`: shared helpers (start `serve.mjs` on a port and kill only that PID, or reuse `BASE`;
  open the WP5 harness with a motion / flash setting; dev books `busy` (free spin, dial step 8, 9+ tumbles, wire blast) and `tumble`
  (30-cell chain, 9+ tumbles); busiest fixture book; CDP screencast; WCAG relative luminance per frame for the full frame and 25
  overlapping 1/3 x 1/3 windows; flash counting (opposing changes >= 0.10, darker < 0.80); saturated-red share; layer probe).
- `tests/e2e/flash_capture.mjs`: `--book busy|fixture|<devbook> [--fixture file] [--motion calm] [--flash-reduced] [--turbo]
  [--max-ms 90000] [--json out]`. Exit 1 when any window exceeds 2 flashes in a 1 s window.
- `tests/e2e/perf_tumble.mjs`: `--rate 4 --runs 3 [--css ...] [--dpr 3 --touch --viewport 390x844]`. p50/p95/p99 of rAF deltas from
  tumble step 8 to the end of the chain, idle/median/max compositor layers, canvas MB. Exit 1 when p95 > 16.6 ms, idle layers > 45
  or canvas > 96 MB. NOTE: frame times are only meaningful on an idle machine (the shared container ran at load average 10-13).
- Unit tests: `node --test tests/fx` (10 tests: flash governor, quality governor, symbol keyframe rewrite, dial bands). If you want
  them in the default command, add `import '../fx/governors.test.mjs';` to `tests/core/index.js` (your file).
- Note for the v1 guideline tests that assert the "+1" dial chip: the chip now shows "+N" with N = dialStep, default 8.
