# WP10 QA + integrator, milestone 1 (gate G1)

Ports used: 5870-5889 only. Scratch: /tmp/claude-0/scratch/wp10/.

## Log
- Unit tests baseline (before any change): core+text 60/60, heroine 58/58, shell 35/35, fx 12/12, audio taper 4/4.
- tests/core/index.js: registered `../shell/index.js`, `../audio/taper.test.mjs`, `../fx/index.js` (requests WP1/WP2/WP5_to_WP10). `node --test tests/core tests/text` = 111/111.
- tests/guidelines/run.mjs: MODAL-INERT replaced by WP1's verified drop-in (request WP1_to_WP10 item 7; focus on CANCEL is required by [31] / SYNTHESIS line 74).
- tests/guidelines/run.mjs collectScreens: the settings dialog `#btn-settings` is scanned like info (tab loop), opening `#btn-menu` first when the gear is in the menu popup (request item 6). Tab screens now named `<screen>-tabN`.

- tests/e2e/smoke.mjs (new): menu + settings sliders + heroine at the 4 viewports in the real game. 72/72 PASS (run 1). Screenshots copied to tests/shots/v2_m1/ and viewed.
- tests/e2e/baseline.mjs (new): runs WP5's perf_tumble.mjs per viewport (30 cells, 4x CPU), writes tests/e2e/baseline_m1.json. 36 cells waits for M2 floor plans.
- package.json: scripts test, qa:shell, qa:heroine, qa:smoke, qa:baseline, qa:flash.
- tools/mock-rgs/server.mjs: entrance_orders / entrance_blackout served at cost 100, bonus books stand in until their books ship (SYNTHESIS 8.9).
- Guideline run 1 (before the integration fixes below, MODAL-INERT drop-in applied): TOTAL 47 PASS, 0 FAIL, 0 AT RISK, 0 HUMAN. Static review: 4 AT RISK heuristics, reviewed benign (dev.html not shipped; replay.js toFixed(2) only in the catch of formatMoney; MICRO const in replay.js; fetch of the local data/rules_data.json).
- shell.mjs (WP1 G1-G8 + extras): 14 PASS, 0 FAIL, console 0, page errors 0, external 0.
- flash_capture busy: max 1 flash/s, pass; fixture: max 1/s, pass. Before the fix `sharedGovernor:false` (index.js kept its own flashAt budget).

### Integration fixes in files owned by others (minimal)
1. src/rules.js (WP11): Interaction guide gained SETTINGS (gear) and Session summary lines ([235]: every button explained; the gear and the NET/TIME summary were missing).
2. src/render/index.js (WP4): request WP5_to_WP4 item 2 applied as written (flash() fires through the shared governor of flash.js, `layerCtx.flash = flash`) and the follow-up shortSide cache (ResizeObserver). After: flash capture fixture turbo `governorFlashes 7 = pageFlashes 7, sharedGovernor:true`, max 2/s, pass. node --test tests/render 24/24.

3. styles.css (WP1): request WP5_to_WP1 items 1 + 4a applied verbatim. Idle layers 94 -> 33.
4. tests/render/harness.html (WP4): hit-stop probe ignored CSS loops paused by WP5's stepped clock (C 45x had failed with 75 paused). render browser 346/346.
5. tools/build/verify_build.mjs (WP11): pointed at the old repo-root dist (other game) and a non-existent `frontend/` mock path; now frontend_mambo/dist/front. verify green.
6. tests/guidelines/run.mjs [225] now also scans the settings dialog.
Requests written: docs/v2/requests/WP10_to_WP4.md (per-column drop, still blocking layers/p95), WP10_to_WP1_WP11.md (what I changed in their files).

### Final numbers (after all fixes)
- Guideline runner: TOTAL 47 PASS, 0 FAIL, 0 AT RISK, 0 HUMAN (static: 4 AT RISK heuristics, benign). shell.mjs 14/0. smoke 72/72.
- node --test: core+text 111, heroine 58, render 24. Browser: heroine 41/41, render 346/346, audio ALL PASSED, audio menu ALL PASSED.
- Flash: pass, sharedGovernor true. Perf: FAIL (p95 50-100 ms, playing layers p90 48-56). Build + verify:build green.
- Report: docs/v2/G1_REPORT.md.

## Left / decisions
- Perf p95 / playing layers: needs WP4's per-column drop (not a minimal integration fix, left to WP4).
- 36-cell baseline waits for M2 floor plans. flash capture is ~20 fps (CDP screencast), not 60 fps.
- Running the heroine browser suite rewrites tests/heroine/shots (WP3 files): I restore them with git checkout after each run.
