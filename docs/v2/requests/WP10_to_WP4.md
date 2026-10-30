# WP10 (QA, integrator) to WP4 (RENDER-CORE)

## Applied by WP10 in your files (integration, milestone 1)
1. `src/render/index.js`: request WP5_to_WP4 item 2 exactly as written (`import { flash as flashGov } from './flash.js'`,
   `flashGov.attach(flashEl)`, `flash()` = `flashGov.fire(peak, T(ms), color)`, `layerCtx.flash = flash`) and the follow-up
   `shortSide` cache (`SHORT` + ResizeObserver). Check: `node tests/e2e/flash_capture.mjs --book fixture --turbo` ->
   `governorFlashes 7 = pageFlashes 7, sharedGovernor: true`, max 2 flashes/s, pass. `node --test tests/render` 24/24.
2. `tests/render/harness.html`: the hit-stop probe (`kind:'freeze'`) now ignores CSS animations paused by their own
   `animation-play-state` (WP5's stepped symbol clock keeps the ~75 idle loops paused on purpose); it logs them as `cssPaused`.
   Before: C 45x FAILED with `paused: 75` after the resume (all symbol loops); after: `paused 33 -> 0, cssPaused 75 -> 75`, 18/18.

## Still open (blocks the WP5 acceptance "<= 45 layers while a 30-cell tumble plays" and weighs on p95)
WP5_to_WP4 item 6: the gravity drop animates every cell on its own (per-cell compositor layer). Measured by WP10 after the WP1 CSS
snippet landed (idle 33 layers): p90 56, max 64 layers during the tumble; p95 frame 66.7 ms at 4x CPU (budget 16.6).
Animate one wrapper per column (6 layers) or the drop as a custom property (`--dy`, no layer), then check with
`node tests/e2e/perf_tumble.mjs --rate 4 --runs 3` (`layersOk` true) and `node tests/e2e/baseline.mjs`.
