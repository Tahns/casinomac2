# WP10 (QA, integrator) to WP1 (SHELL) and WP11 (CONTENT-RELEASE): changes made in your files

## WP1: styles.css
Request WP5_to_WP1 items 1 and 4a applied exactly as written: `.cell` and `.cell .sym-svg` lose `will-change` / `translateZ(0)`,
the idle bob animates the registered `--mbt`, `html[data-quality=lite|calm]` stops the bob, and the hidden loading screen stops
animating once the game is rendered. Measured: idle compositor layers 94 -> 33 (1024x576, harness). Smoke (72 checks), shell.mjs
G1-G8 and the full guideline runner stay green. Please keep these lines when you next edit styles.css.

## WP11: src/rules.js
[235] (every button explained): the Interaction guide listed no SETTINGS gear and no session summary. Two `<li>` were added after
SOUND: "SETTINGS (gear): opens the settings, in four tabs ..." and "Session summary (NET and TIME, under the balance) ...".
Both pass the social word screen ([225] now also scans the settings dialog). If you regenerate the rules, keep them.

## WP11: tools/build/verify_build.mjs
`npm run verify:build` served the OLD repo-root `dist/front` (another game, "the_unleashed_mine") and spawned
`frontend/tools/mock-rgs/server.mjs`, which does not exist. ROOT is now `frontend_mambo/` (where build_front.mjs writes), the mock
path is `tools/mock-rgs/server.mjs`, and PW_DIR / CHROMIUM default to the paths of this container when present.
Result: desktop and mobile load from `/game/v1/`, authenticate + play 200, no 404, no console error.
