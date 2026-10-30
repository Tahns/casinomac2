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

### Session 3 (resume after the engine change), 2026-10-30
- Re-ran everything from the committed state: `node --test tests/render` 24/24, `tests/core tests/text` 60/60.
- Browser suite (`node tests/render/browser.mjs`) found three real defects in section B (v1 fixture books of every category):
  1. **Scatter award used the `.win` cell class** (reveal tease with 4+ scatters, retrigger). A feature award is not a return, but the
     class is the one the gate watches. Decision: a class of its own, `.cell.sct`, with the same squash look (CSS injected by render/index.js,
     Calm/Still = static 1.08 scale), cleared by `clearWins()`, excluded from the idle sweep. v1 pixels: same animation, same z-index.
  2. **`meterRise` riser on the quiet path**: `audio.setMeter(n)` (WP2) fires the win-like riser when the meter passes x10 and has no quiet
     option. Workaround in `audioMeter()`: while `round.level < 1` the audio meter is held at x9 (arpeggio nearly unchanged, no riser) and the
     call already passes `{ quiet }`. Request written: `docs/v2/requests/WP4_to_WP2.md`.
  3. **Rays element in the neutral Debrief**: `countBanner` always appended `.rays` (CSS shows it even without the fade-in). Now the Debrief
     and any banner asked with `rays:false` never put it in the DOM.
- Test fix (my file): the FILED check counted the rays of the feature START banner; it now counts rays inside the `freeSpinEnd` handling only.
- The full browser suite takes more than 10 minutes (long bonus books, 500+ events each, at skip speed): run it in the background, or by
  section with `--only=A` ... `--only=H`, or `--quick` (one book per category).
- Full browser run after the three fixes: 349/351. Remaining two, fixed since:
  4. **5000x count 7585 ms** (> 7.5 s): each of the 9 steps started on the next rAF, so frame quantisation added up. `countBanner` now runs
     the staircase on an absolute schedule (`tAcc`, step k ends at start + T(sum of planned ms)). Re-measured: 7337 ms, segments
     922 541 862 539 849 554 847 568 1655 ms (counts >= 0.84 s, beats ~0.55 s).
  5. **G screenshot wp4_debrief_filed** missed: the picked trigger book ended above 1x (DECLASSIFIED). The shot now uses book 90731 (feature ends at 0.1x).
- `--only=C,G --shots`: 23/23. Sections A, B (52 books), D, E, F were all green in the full run.
- Screenshots looked at with Read (tests/render/shots/): `wp4_quiet_result` (1.0x: lemon outline, cream number, no sparks, heroine neutral),
  `wp4_l2_win` (6.3x: cream outline, sparkles, ripple, heroine bigwin, in-the-black chip), `wp4_staircase_big` (BIG WIN tier beat with rays),
  `wp4_staircase_count`, `wp4_debrief_filed` (cream card, MISSION REPORT $0.10, FILED stamp, no rays).
- Guideline runner (own ports 5854/5855, report to scratch, the qa_*.png it rewrites were restored): 45 PASS, 1 FAIL, 1 AT RISK.
  The FAIL is MODAL-INERT (`#confirm-cancel` not visible); it fails the same with the committed render/index.js, so it is not WP4's:
  request `docs/v2/requests/WP4_to_WP1.md`.
- Not done: section H (pixel identity against a pristine v1 copy) needs a v1 checkout served on another port; not run this session.

## What is left for WP4 (later milestones)
- Floor plans / missions (milestone 2), drop the x9 audio-meter hold once WP2 adds `setMeter(n, { quiet })`, section H v1 pixel check.
