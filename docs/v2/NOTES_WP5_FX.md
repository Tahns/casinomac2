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

## Left / open

- see "Final status" below once written.

## Decisions

- Custom-property keyframes instead of compositor animations for the symbol idle loops: a few more style recalcs at step
  boundaries, but no layer per part; software compositing (headless, many low-end devices) pays per layer per frame.
- The quality governor never writes settings; it publishes a ceiling (`effective()`, `data-quality`).
- Band edges = round(cap * {0.16, 0.40, 0.80}) + 1, which gives exactly 17/41/81 at cap 100.
