# NOTES WP5 FX-WIRE (milestone 1), running log

Owner: WP5. Files: `frontend_mambo/src/render/{fx,wire,fuse,scene,meter,logo,symbols}.js`, `fuse.css`, `wire.css`, `meter.css`,
`flash.js` (new), `quality.js` (new); tests in `frontend_mambo/tests/fx/**` (WP5 folder) and the two capture scripts the task asked
for in `frontend_mambo/tests/e2e/` (WP10 reuses them). Ports 5860-5869 (5860 manual server, 5861 flash capture, 5863 perf, 5862/5864-5866
scratch). Scratch: `/tmp/claude-0/scratch/wp5/`.

Restart note: the user changed the model engine and asked to redo the package. A first WP5 run had left only `tests/fx/harness.html`
(committed in 37592ce) and scratch scripts; none of the owned source files had been changed. This run starts from v1 code.

## Done

1. `src/render/flash.js` (new): shared flash governor. `flash.fire(peak, ms, color)` -> bool; <= 2 starts in any sliding 1000 ms
   window; peak <= 0.5 (dissolve 0.25 / 167 ms when "Screen flash effects" is off or motion is Calm; none when Still); only cream or
   lemon are drawn, red (R/(R+G+B) >= 0.8) is "saturated", drawn cream and costs the same budget. Reads `settings` live
   (`motionLevel`, `flashReduced`), never writes. `flash.log`, `flash.on`, `flash.allow()`, `flash.attach(el)` (lazy `#flash`).
2. `src/render/quality.js` (new): quality governor. EMA (alpha .1) of frame deltas; > 24 ms -> `lite` (particle gain .5), > 40 ms ->
   `calm` (gain .4 and `effective(motion)` downgrades Full to Calm: no rotation / hit-stop / push-in, shake <= .25); hysteresis
   (out at 20 / 30 ms, drop after 12 samples, rise after 2.5 s); ignores gaps > 250 ms. Writes `<html data-quality>`. Probe:
   `keepAlive(ms)` (fx.js and wire.js call it, so it only runs while effects play), `monitor()/stop()`.
3. `fx.js`: `FX_CAPS` (live 200 / 110 on a slow device, per-call caps, confetti 30 and 60 for the max-win stamp via `opts.maxWin`),
   canvas byte cap (`cappedDpr`, 24 MB for the overlay), quality feed + particle thinning, live motion (Still: no particle, no
   shake; shake gain from `quality.effective(motion.state)`), the per-cell break flash is cream at <= 0.5 and only drawn when screen
   flashes are on. `fx.canvasBytes`, `fx.caps`.
4. `symbols.js`: compositor layer budget. Every idle keyframe now animates the non-inherited custom properties `--mbt/--mbo`
   (`noComposite()` rewrites the @keyframes; registered with @property, universal syntax = discrete, steps(1,end) holds the start
   value, so the look is identical). Result at 1024x576 idle: 174 -> 94 layers with my files only; 33 with the WP1 snippet
   (request file). Calm / Still / quality lite+calm switch the inner idle loops off.
5. `scene.js`: the venetian blinds (a full-screen layer sliding every frame = full-screen recomposite 60x/s, about half a core in
   software compositing) and the satellite now move in hard steps (1.5 / 8 per second); parallax layers promoted only while they
   move; parallax only in Full and not when quality is Calm; Calm/Still/quality-calm switch the decorative loops off.
   Idle VizCompositor thread: 79-85% -> 30-37% of a core.
6. `wire.js`: draw-on 450 ms and spark hops 300 ms on a 12 fps grid (`stepped()`, DOM only touched on a new step); blast = tick
   ramp 600 ms (every motion level), hit-stop 100 ms (`ctx.camera.freeze` when given and allowed, else a plain 100 ms hold), one
   flash 0.6 / 200 ms through `ctx.flash` (governed); the per-cell `filter: brightness(5)` whitening is gone (it was an extra flash
   per cell and a layer each); all wire cues are sent `{ quiet: true }` (never a win-like cue); no happy pose after the blast
   (`idle`; the re-evaluation decides); 'fizzle' (unknown id, silent in v1) -> 'wahwah'; live motion via `ctx.motion`; `tr()` uses
   `hasKey` (t() humanises unknown keys: v1 showed "Bam" instead of "BAM!").
7. `meter.js` / `meter.css`: Clearance Dial. aria-label "Clearance Dial x8, Largo" (was the humanised "Title" because
   `meter.title` has no entry); "+N" chip 520 ms with N = `missionAssigned.dialStep` (`meter.mission(ev)`, `setStep`, or
   `set(v, {step})`), default 8 (v1 math gmStep 8); band readout + 167 ms stamp, bands cut from the cap (`bandEdges(100)` =
   17/41/81, `bandOf`); digit flip 130 ms; Full flies the chip from the cluster, Calm pops it beside the badge, Still shows it
   without motion. `show(false)` clears the mission (next feature starts from defaults); `reset()` keeps it because the player
   resets the dial after `missionAssigned`.
8. Tests: `tests/fx/governors.test.mjs` (10 unit tests: flash budget/peak/colour/modes, quality tiers/hysteresis/effective,
   keyframe rewrite, dial bands). Run `node --test tests/fx`.
9. Capture scripts: `tests/e2e/lib_capture.mjs` (server, harness, books, screencast, luminance, flash counting, layers),
   `tests/e2e/flash_capture.mjs`, `tests/e2e/perf_tumble.mjs`.

## Measurements (machine load average ~10 on 4 cores while other agents run: frame numbers are noisy)

- Flash capture, busy book (free spin, dial step 8, 9 tumbles, wire blast), default motion: max 1 flash/s in the worst window, 0 on
  the full frame, saturated red share <= 4% of a window. PASS (see the final section for the fixture run).
- Layers at idle 1024x576: v1 174; WP5 files 94; WP5 + WP1 snippet 33. During a tumble (cells animate transform via WAAPI in
  index.js): median ~54, peak ~70 with the WP1 snippet (transient, while 30 cells drop).

## Second pass (after the first commit 93aeb06)

- fx.js redraws the overlay canvas on the 12 fps grid only (FX_CAPS.fps; physics integrates real time): 5x fewer canvas uploads.
- quality.keepAlive(ms): fx.js / wire.js keep a private rAF probe alive only while effects play.
- wire.css: Still stops the spark spin and the bomb shake.
- Requests written: WP5_to_WP1 (styles.css layer snippet, Clearance Dial strings, fx.bam), WP5_to_WP4 (missionAssigned ->
  meter.mission, one flash governor, camera in the wire ctx, quality.effective, confetti maxWin, per-column drop for the layer
  peak), WP5_to_WP3 (rig idle at 12 fps), WP5_to_WP11 (rules text rename), WP5_to_WP10 (scripts, tests, '+N' chip).

## Final measurements (shared container, load average 10-18 on 4 cores)

| check | result |
|---|---|
| flash, busiest bonus fixture (id 95271, turbo) | max 2 flashes/s in the worst window, 1 on the full frame: PASS (at the limit) |
| flash, busy dev book (free spin, dial step 8, 9 tumbles, blast) | 1 / s: PASS |
| flash, fixture with Screen flash effects off | 1 / s: PASS |
| saturated red share | <= 4.1% of any window |
| idle layers 1024x576 | v1 174, WP5 files 94, WP5 + WP1 snippet 33 (<= 45 PASS once WP1 lands it) |
| layers while a 30-cell tumble plays (WP1 snippet) | median 45-47, peak 64 (cells animated per cell by index.js; request WP5_to_WP4 item 6) |
| canvas, 390x844 dpr 3 touch | 29.7 MB (<= 96 PASS); fx overlay capped at 24 MB whatever the dpr |
| frame p95, tumble step 8+, 4x CPU | v1 233 ms, v2 167-183 ms, p50 v1 83 -> v2 50-67 ms. FAIL vs 16.6 ms |
| frame p95, same, no throttle | v1 200 ms, v2 100 ms; p50 v1 33 -> v2 16.7 ms |
| idle VizCompositor thread | 79-85% -> 30-37% of a core (stepped blinds) |

The 16.6 ms p95 at 4x throttle is NOT met and cannot be judged on this machine: other agents keep the 4 cores at load 10-18, so
even an unthrottled run misses frames, and the renderer main thread is about half busy at rate 1 with most of it outside WP5 files
(heroine rig at 60 fps with a layout per frame, per-cell WAAPI in index.js). Re-run `node tests/e2e/perf_tumble.mjs --rate 4 --runs 3`
on an idle machine after WP1 (CSS), WP3 (rig 12 fps) and WP4 (per-column drop) land their parts.

## Left / open

- Logo, fuse.js (legacy, unused by the v2 renderer) unchanged. Scene, logo small loops (sat spin, dish, logo stars) still compositor
  animations (about 8 small layers); fine within the budget.
- Wire geometry still 6x5 (floor plans are milestone 2).
- Dial stamp / chip need WP4 to call meter.mission(ev) for non-default steps (Blackout step 3); v1 books already show +8.

## Decisions

- Custom-property keyframes instead of compositor animations for the symbol idle loops: a few more style recalcs at step
  boundaries, but no layer per part; software compositing (headless, many low-end devices) pays per layer per frame.
- The quality governor never writes settings; it publishes a ceiling (`effective()`, `data-quality`).
- Band edges = round(cap * {0.16, 0.40, 0.80}) + 1, which gives exactly 17/41/81 at cap 100.

## Fixer pass (2026-10-30, after the independent review: ACC-p95-frame, ACC-layers-30-cells, GOV-not-shared)

Machine load average 1-2 during these runs (much quieter than before), so the numbers below are comparable to each other.

### What changed (WP5 files only)
1. **No rAF loop left in WP5 code.** `fx.js` draws from ONE `setTimeout(FRAME_MS)` loop that runs only while particles / the iris are
   alive and feeds the quality governor from that loop (`quality.sampleLag(lateness)`, `quality.drive(true/false)`); `quality.js`'s
   probe is now a 12 fps timer that yields while a driver is active (`keepAlive` from wire.js; `monitor()`); the wire spark hop
   (`wire.js`) and the scene twinkle canvas (`scene.js`, 140 ms) use one timer per step instead of a rAF that skipped frames.
2. **Symbols: ONE stepped clock for every looping symbol animation** (`symbols.js`, `clocked()`, `loopStep()`, `CLOCK_CSS`,
   `startIdleClock()` from `ensureSprite()`). Finding: the ~80 custom-property idle loops are main-thread animations, serviced EVERY
   frame (idle at 4x: p50 33 / p95 50-67 ms; with them off 16.7 / 33). Now they stay CSS animations but are paused under
   `html[data-mbclock]`, and their delay is `calc(<phase> - var(--mbclk))`; `--mbclk` is a registered NON-inherited `<time>` written
   inline only on an element whose step index changes, on a 12 fps grid (reads via `#game.getAnimations({subtree:true})`, never
   `pause()`/`currentTime`). Two dead ends recorded: (a) pausing through WAAPI detaches the CSS animation in Chrome, so Calm / Still
   could not remove it any more (verified in a minimal page); (b) one inherited `--mbclk` on `#game` restyled the whole board subtree
   each tick: p50 100 ms, much worse. Calm / Still / quality lite+calm still remove the loops in CSS (Still screenshot: 0 animations on
   the board, 0 clock writes). Dim cells hold step 0.
3. `#sym-sprite *{animation:none}`: the hidden 0x0 sprite ran ~20 copies of the loops on every frame for nothing.
4. `fx.js` per-cell break flash: gated by the shared governor (`flash.mode === 'flash' && flash.allow()`), and only on the first
   `FX_CAPS.breakFlashCells` (3) cells of one blast (cells broken within 400 ms).
5. `perf_tumble.mjs`: `layersOk` = idle <= 45 AND p90 of the layer counts sampled during the tumble <= 45; `layersMaxOk` reports the
   worst frame. `flash_capture.mjs`: `pageFlashes` (animations started on `#flash` by anyone) and `sharedGovernor`.
6. Tests: `tests/fx` 12 (new: quality timer probe / lag / driver hand-off; clocked CSS + loopStep). v1 `tests/core tests/text` 60/60.

### Measurements (`perf_tumble.mjs --rate 4 --runs 3`, 30-cell tumble, step 8+, 1024x576)
| state | p50 | p95 | p99 | idle layers | layers during tumble (median / p90 / max) |
|---|---|---|---|---|---|
| committed before this pass (HEAD, WP1 snippet previewed, same quiet machine) | 33.3 | 66.7 | 133 | 33 | 46 / 56 / 64 |
| this pass, nothing previewed | 33.4 | 83.3 | 167 | 94 | 97 / 100 / 103 |
| this pass + WP1 snippet + `#loading` animations off (both previewed with `--css`) | **16.7** | 66.7 | 133 | 33 | 45 / 56 / 64 |
| same previews, rate 1 | 16.7 | 33.3 | 33.4 | 33 | - |
Idle (no book) at 4x with the previews: p50 16.7, p95 33 (before this pass: 33 / 50-67).

**ACC-p95-frame: still FAIL (p95 66.7 ms vs 16.6).** p50 now meets one vsync. CPU profile of the tumble at 4x after this pass:
64% native (style / layout / paint / commit), heroine rig JS ~12% + setAttribute 3.8% (WP3), `index.js shortSide` +
`getBoundingClientRect` ~3.6% forced layout (WP4, camera), fx.js 0.5%, symbols.js 0.1%, the clock's getAnimations 1%.
What remains is outside WP5 files: requests updated (WP5_to_WP1 item 4: loading-screen animations run forever under visibility:hidden,
the largest idle cost; WP5_to_WP4 follow-up: shared flash governor, per-column drop, cached shortSide; WP5_to_WP3 follow-up: rig at
12 fps, skip unchanged setAttribute). Re-run `perf_tumble.mjs --rate 4 --runs 3` after they land. Do not report this check as passed.

**ACC-layers-30-cells: FAIL as now gated** (p90 56, max 64 with the WP1 snippet; 33 idle). The extra layers are the per-cell WAAPI
drop transforms in index.js (WP4, request item 6).

**GOV-not-shared:** fx.js fixed (above). Page: `flash_capture --book fixture --turbo`: max 2 flashes/s (PASS, at the limit), full frame
1, red share 0.041, `pageFlashes 7, governorFlashes 0, sharedGovernor false` until WP4 applies request item 2. Busy dev book: 1/s.

Screens viewed: `/tmp/claude-0/scratch/wp5/idle_full_a.png` (board renders, symbols intact), `blast.png` (free spins tumble, dial
LARGO), Still run (no board animation).
