# WP3 (HEROINE) to WP10 (QA): wiring of the heroine tests

Status: CLOSED. Suites run in the G2G3 report (`npm test` now includes tests/heroine).

- Unit tests: `cd frontend_mambo && node --test tests/heroine` (58 tests, about 1 s, node only; the folder has its own `index.js`). Suggested script: `"qa:heroine": "node --test tests/heroine"`.
- Browser acceptance: `cd frontend_mambo && node tests/heroine/browser.mjs [--shots]` (41 checks, about 1.5 min; spawns its OWN static server and mock RGS on 5842/5843 or `PORTS="a,b"`, kills only those; exit code 1 on a failure; with --report writes `tests/heroine/last_run.json`; always writes two screenshots + one 100 px sheet into `tests/heroine/shots/`). Covers the budget (<= 2 ms/frame over 600 frames), the fallback chain (rig throws at creation, at load, inside its frame loop, in a director call, nothing at all -> v1), Still / Calm / hidden tab / live settings, the bounding boxes at the four viewports (never overlaps the grid, a button, a HUD plate or the logo, never scrolls), painted-pixel box, gaze, 100 px readability.
- Guideline runner: nothing to change. Verified in an isolated copy (its report and shots go into the tree it runs from, so I did not run it inside `frontend_mambo`).
- G-checks that touch the heroine: the box rules are WP1's (`tests/guidelines/shell.mjs`); the rig adds no network access, no storage access, no external host (asserted by `tests/heroine/text.test.mjs`, "source hygiene").
