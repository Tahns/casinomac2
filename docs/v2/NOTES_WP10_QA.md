# WP10 QA + integrator, milestone 1 (gate G1)

Ports used: 5870-5889 only. Scratch: /tmp/claude-0/scratch/wp10/.

## Log
- Unit tests baseline (before any change): core+text 60/60, heroine 58/58, shell 35/35, fx 12/12, audio taper 4/4.
- tests/core/index.js: registered `../shell/index.js`, `../audio/taper.test.mjs`, `../fx/index.js` (requests WP1/WP2/WP5_to_WP10). `node --test tests/core tests/text` = 111/111.
- tests/guidelines/run.mjs: MODAL-INERT replaced by WP1's verified drop-in (request WP1_to_WP10 item 7; focus on CANCEL is required by [31] / SYNTHESIS line 74).
- tests/guidelines/run.mjs collectScreens: the settings dialog `#btn-settings` is scanned like info (tab loop), opening `#btn-menu` first when the gear is in the menu popup (request item 6). Tab screens now named `<screen>-tabN`.

## Left / decisions
(see below, updated as the run goes)
