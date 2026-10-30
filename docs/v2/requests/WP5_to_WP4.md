# WP5 (FX-WIRE) to WP4 (RENDER-CORE): wiring in render/index.js

All optional and backwards compatible; nothing breaks if you do none of it. Ordered by value.

## 1. Clearance Dial: missionAssigned -> dialStep (SYNTHESIS 8.4/8.5, 5 row 11)
`meter.mission(ev)` takes `dialStep`, `dialCap`, `dialStart`; the "+N" chip then shows N = dialStep (default 8 for old books, which
is the v1 math gmStep). In `handle()`:
```js
case 'missionAssigned': if (meter) { try { meter.mission(ev); } catch (e) { /* ignore */ } } return null;
```
The mission survives `meter.reset()` (meterStart calls it after missionAssigned) and is cleared by `meter.show(false)` (meterEnd), so
a v1 book after a v2 book shows +8 again. The late `gmCap` from rules_data can be passed on with `meter.setCap(c)`:
```js
.then((d) => { const c = d && Number(d.gmCap); if (c > 1) { S.cap = c; if (meter) meter.setCap(c); } })
```
Bands (Largo < 17 <= Andante < 41 <= Allegro < 81 <= Presto at cap 100) are a readout, never odds; the band change plays
`stamp` (neutral). The dial's `meter` cue is still sent through `gatedAudio` (quiet path -> `dialStep`), unchanged.

## 2. One flash governor for the page (SYNTHESIS 0.1 e: "one shared motion and flash store")
`src/render/flash.js` exports the shared governor (<= 2 starts per sliding second, peak <= .5, cream/lemon only, red counted as
saturated, settings read live). Today `index.js` has its own copy (`flashAt`), so two budgets could add up once a layer (WP6) fires
flashes too. Replace the body of `flash()`:
```js
import { flash as flashGov } from './flash.js';
...
flashGov.attach(flashEl);
function flash(peak = .8, ms = 500, color = FX_COLORS.cream) {
  const ok = flashGov.fire(peak, T(ms), color);   // dissolve / none / budget handled inside; returns false when refused
  if (ok) trace('flash', { peak: Math.min(peak, .5) });
}
```
and pass the same `flash` to the layers ctx (`layerCtx.flash = flash`) so WP6 uses the same budget.

## 3. Wire hit-stop (SYNTHESIS 5 row 10)
`wire.js` holds 100 ms before the bang. With `camera` in its ctx it uses `camera.freeze(100)` (pauses every running animation,
Full only, `motion.hitStop`); without it, a plain 100 ms hold. Add `camera` to `createWire({ ..., motion, camera, ... })`.

## 4. Quality governor (SYNTHESIS 5 Systems: EMA > 24 ms fewer particles, > 40 ms Calm)
`src/render/quality.js`. fx.js already thins its particles and writes `<html data-quality>` (CSS loops follow). For the JS-driven
motion use the combined ceiling at the point of use:
```js
import { quality } from './quality.js';
const eff = quality.effective(motion.state);   // { level, particles, shake, rotation, hitStop, pushIn }
if (st.hitStop && !S.skip && eff.hitStop) await camera.freeze(T(st.hitStop));
```
(camera.js could read `quality.effective(motion.state).shake` instead of `motion.shake`). Optional: `quality.monitor()` at the
start of `playBook` and `quality.stop()` at its end, so the EMA is measured over the whole round and not only while particles fly
(fx.js and wire.js keep the probe alive with `quality.keepAlive()` meanwhile). Quality never writes a setting.

## 5. Max-win confetti cap (SYNTHESIS 5 row 8: confetti <= 60)
`fx.confetti(x, y, u, n, { ...o, maxWin: true })` raises the per-call cap from 30 to 60 for the max-win stamp only.

## 6. Layer peak during reveal / tumble (acceptance <= 45 layers)
With the WP1 snippet (request WP5_to_WP1) idle is 33 layers, but while 30 cells drop each `.cell` WAAPI transform animation is its own
layer: median 54, peak 70 during the tumble book. Animating one wrapper per column (6 layers) for the gravity drop, or the drop as
a custom-property animation (`el.animate([{ '--dy': '-300%' }, { '--dy': '0%' }])` with `transform: translateY(var(--dy))`,
main thread, no layer) would keep the peak under 45. Your call: per-cell compositor layers are cheaper on the main thread.

## Follow-up (WP5 fixer pass, 2026-10-30): items 2 and 6 are now blocking two WP5 acceptance checks

Reviewer finding GOV-not-shared: `node tests/e2e/flash_capture.mjs --book fixture --turbo` now prints `pageFlashes` (animations
started on `#flash`, whoever started them) next to `governorFlashes` (the shared governor's log). Today: `pageFlashes: 7,
governorFlashes: 0, sharedGovernor: false` because `index.js flash()` (lines ~356-369) keeps its own `flashAt` budget. Please apply
item 2 exactly (import `flash as flashGov` from './flash.js', `flashGov.attach(flashEl)`, body = `flashGov.fire(peak, T(ms), color)`).
fx.js's per-cell break flash is already gated on `flash.mode === 'flash' && flash.allow()` (and at most 3 cells per blast), so once
index.js fires through the governor the break flashes stop as soon as the page budget is used. Check: `sharedGovernor: true`.

Reviewer finding ACC-layers-30-cells: `perf_tumble.mjs` now gates the layers WHILE the tumble plays (`layersOk` = idle <= 45 and
p90 <= 45). With the WP1 snippet: idle 33, median 45, p90 56, max 64 -> FAIL, all of it from the per-cell drop animations (item 6).
Please animate the gravity drop per column wrapper (6 layers) or as a custom property (`--dy`, main thread, no layer).

New, frame budget (ACC-p95-frame): CPU profile of the 30-cell tumble at 4x (tests/e2e harness): `index.js:shortSide` (the camera
option `shortSide: () => Math.min(app.clientWidth, app.clientHeight)`) plus `getBoundingClientRect` cost about 1.2 s of 33 s, mostly
forced synchronous layout because it is read every camera frame right after the rig and the board wrote to the DOM. Cache it:
```js
let SHORT = 600;
const measureShort = () => { SHORT = Math.min(app.clientWidth || 600, app.clientHeight || 600); };
measureShort(); new ResizeObserver(measureShort).observe(app);
const camera = createCamera({ targets: () => [root, scene && scene.host], shortSide: () => SHORT });
```
and do the same for any `getBoundingClientRect` read inside a per-frame loop (`cellCenter` during the drop: read the board rect once
per tumble step, not per cell).
