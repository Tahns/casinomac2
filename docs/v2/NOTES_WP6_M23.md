# WP6 LAYERS, milestones 2 and 3: running log

Owner files: `frontend_mambo/src/render/layers/**` (incl. `layers.css`), `frontend_mambo/src/i18n/en_layers.js`, `frontend_mambo/tests/layers/**`.
Ports: 5910-5919 (5910 = static http server of the repo root while working).

## Plan
- logic.js (pure: outline of a plan, beam tracker, bank) -> util.js (DOM, timing, motion, skip-after-1.2 s) -> art.js (hand-drawn SVG strings)
- layers: blueprint.js, orders.js, blackout.js, dossier.js (door + dossier + costume screen), debrief.js; registered in index.js
- tests/layers: unit (node --test) + browser.mjs (Playwright on math fixtures, 4 viewports, 10-second proxy shots)

## Log
- session 1: read SYNTHESIS 2/3/5/8/9, INTERFACES 4, WP7/WP8_to_FRONT, WP2_to_WP6 (cue ids), render/index.js call site.
  Facts: layerCtx has no audio / mascot / fmt -> layers import the audio singleton and find the heroine with mascotOf() (mascot.js export);
  request WP4 to add ctx.audio / ctx.mascot / ctx.fmt / ctx.mode. The rig already owns an outfitChange clip with its own folding screen
  (paraventIn/Out + puff): the costume layer drives it through react('outfit'), and only draws its own screen when the rig is not there.
- session 1 (cont.): built logic.js, util.js, art.js, blueprint.js, orders.js, blackout.js, dossier.js, debrief.js, layers.css,
  en_layers.js; index.js attaches the layers lazily on the first dispatch with a real board (keeps tests/core/layers.test.mjs green:
  a bare import still sees LAYERS == []). tests/layers: unit.test.mjs (11 tests, `node --test tests/layers`), page.html (real
  index.html + heroine shell + renderer + probe), browser.mjs (sections A-G, own static server on 5911).
  Decisions:
  * blueprint budget = draw + stamp together: new plan 500 ms (turbo 200), same plan as the last spin 250 (turbo 120); draw 70 %,
    the stamp takes what is left (headless frames are 30-50 ms, measured 515-525 ms, turbo 240-290 ms incl. frame latency).
  * dossier: skip counted from the moment the dossier is on screen (the door before it is never skippable); total ~3.0 s + door 1.0 s.
  * costume: the rig already owns outfitChange (its own folding screen + puff): the layer calls hero.react('outfit', {outfit});
    own CSS/SVG folding screen + setOutfit(animated:false) only when react returns false and #heroine-slot is visible.
    Back to inspectrice: the heroine's own `end` reaction (WP4 sends it on freeSpinEnd); the layer re-checks 3.2 s after finalWin.
  * the Debrief card + FILED / DECLASSIFIED stamp are WP4's (countBanner, celebrate.endPlan). WP6 only pins a brass mission-name tab on
    top of that card (no second stamp, no sound, same look at R <= C and above).
  * <html data-mission> is set during a feature for WP5's per-mission palette (request WP6_to_WP5).
  * requests written: WP6_to_WP4 (ctx.audio/mascot/fmt/mode; neutral trigger banner), WP6_to_WP1 (key fs.incoming), WP6_to_WP5 (palette).
  * observed (not mine): WP4 trigger banner says "MISSION BRIEFING" for every mission; WP4's index.js is mid-edit in this session
    (a transient `syncPlan is not defined` console error was seen once while it changed).
