# NOTES WP4 RENDER-CORE (milestone 1), running log

Owner: WP4. Files: `frontend_mambo/src/render/{index,devbooks,motion,camera,celebrate,geo}.js`, tests in `frontend_mambo/tests/render/**` (WP4 own folder, not in the shared `tests/core` list), notes here.
Ports 5850-5859 (5850 static server, 5851 mock RGS). Scratch: `/tmp/claude-0/scratch/wp4/`.

## State at the start of this session (resume point)

A first WP4 session had already written (committed in 37592ce "etat avant reprise"):
- `celebrate.js`: gate `level(R,C)`, `createRound(cost)` (running R per event), `stageWin` + `STAGE` recipes, `tumbleRecipe`, `guardPose`, `tierPlan`, `tierOf`, `endPlan`.
- `motion.js` (read-only consumer of `settings.js`), `camera.js` (trauma shake + hit-stop through `document.getAnimations()`).
- `render/index.js` wired to all of it (quiet result, ripple, in-the-black beat, staircase, neutral Debrief, DECLASSIFIED).
- `tests/render/unit.test.mjs` (24 unit tests, `node --test tests/render`), `tests/render/harness.html`.
Missing at that point: this notes file, browser tests, the fixture-book sweep, screenshots, final cleanups, the commit of the work below.

## Done in this session

(see the "Log" section at the end, newest last)

## Log
