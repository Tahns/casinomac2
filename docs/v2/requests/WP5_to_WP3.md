# WP5 (FX-WIRE) to WP3 (HEROINE): idle frame rate of the rig

Measured with a trace (harness `tests/fx/harness.html`, 1024x576, nothing playing, 4 s): the renderer main thread spends about 8% in
`frame@mambo_rig.js` plus the style / layout / paint / commit that every SVG attribute change causes, every frame (60 fps), even
when the pose is at rest. On a 4x throttled CPU this is a large share of the 16.6 ms frame budget of WP5's acceptance test (p95 frame
on a 30-cell tumble).

Request: update the idle / breathing loop on the limited-animation grid (12 fps, i.e. skip `frame()` work unless
`floor(t / 83.3)` changed), and stop the loop entirely while the rig is static (Still, or a held pose with no secondary motion).
Clips (reactions) may keep full rate. Also follow `<html data-quality="calm">` (written by `src/render/quality.js` when the frame
EMA is over 40 ms) like Calm. Check with `node tests/e2e/perf_tumble.mjs --rate 4` (p50 / p95 of the frame deltas).
