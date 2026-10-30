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

---
## M2/M3 (WP10 integrator, 2026-10-30)

### 1. The "MISSION START" burst runs off the left edge in portrait and at 400x225 (render/index.js:449)
Seen in `tests/e2e/modes.mjs` shots `frontend_mambo/tests/shots/v2_m23/modes_425x812_door_orders_mid.png` ("SSION START", the word is cut
by the screen edge) and `modes_400x225_door_blackout_mid.png` (the text overflows its star across the logo). The bubble is centred on
`cellCenter(1.2, 0.2)`, near the left frame edge, and its text is wider than the star. Keep the bubble inside the app box:
```js
// render/index.js, free spins start (line ~449)
if (motion.particles > 0) {
  const r = appRect(), p = cellCenter(2.5, 0.2), size = Math.min(r.width, r.height) * .22;   // board centre column, not reel 1
  const x = Math.min(Math.max(p.x, r.left + size * 1.6), r.right - size * 1.6);             // half the text width stays on screen
  fxm.burstBubble(x, p.y, size, t('meter.start'));
}
```
(Exact clamp is yours; what matters is that no letter leaves the 425x812 or 400x225 viewport.) Not a guideline FAIL; a polish item.

### 2. FYI: applied in WP5 files by WP10
`src/render/wire.js` is now rows-aware (`rowsAware: true`): your Annex adapter (`wireHost`, `WO`) steps aside on its own. You may delete
it when convenient; it is inert now. `src/render/scene.js` keys its free-spins palette on `<html data-mission>` (WP6_to_WP5).

### 3. 36-cell (Annex) baseline: promoted layers over budget (copy to WP6, the blueprint is one of the suspects)
`node tests/e2e/baseline.mjs --rate 4 --runs 2` (frontend_mambo/tests/e2e/baseline_m23.json): the real Annex book 25532 (layout annex,
4 tumbles) peaks at p90 46-50 / max 51-56 compositor layers at the four viewports (budget 45; the 30-cell devbook is p90 36-41 there).
The layer probe samples from the start of the book, so the layout event (old board drop-out, 417 ms frame morph, WP6 blueprint draw and
name stamp) is inside the window. Please check which elements are promoted during the Annex spin (DevTools Layers on that book, or
`perf_tumble.mjs --fixture fixtures/books_base_sample.jsonl --id 25532 --from-step 1 --runs 1`) and drop the promotion of the ones
that animate only once (the morph wrapper and the blueprint strokes are the likely ones: animate a custom property, or remove
`will-change` once the animation has finished).
