# WP1+WP2+WP3 (M2/M3) to WP10 (QA)

1. **`tests/core/audio_api.test.mjs` edited in the same commit as the change it pins** (INTERFACES rule: a frozen value changes only with its
   pinning test updated in the same commit). The Music slider default is now 5 (slot guide rule "music default 5 %"); Master and Effects
   stay 75. One line changed: the defaults loop now asserts master 75, sfx 75, music 5. Please keep it.
2. New browser suites (own ports, kill only their PIDs): `node tests/audio/gesture.mjs` (music 5 %, nothing audible and no AudioContext
   before the first gesture, authenticate not blocked) and `node tests/heroine/visual.mjs` (no raster image shipped, DPR 1/2/3, idle flicker,
   fonts). Suggested `package.json` scripts: `"qa:gesture"`, `"qa:visual"`.
3. New unit file `tests/heroine/missions.test.mjs` (already in `tests/heroine/index.js`).
4. **`tests/guidelines/shell.mjs` PICKER is red since the FINAL door shares landed (not caused by this package; same stale assumption as the
   doors unit test fixed in 986bc5e).** Line ~434 expects `["bonus"]` "today"; the real data offers the three doors. Replace that `note(...)`
   with:
   ```js
   note(J(st.cards) === '["bonus","entrance_orders","entrance_blackout"]', 'the FINAL data offers the three doors (Stage Door, Coat Check, Service Stairs): ' + J(st.cards));
   ```
   Checked on 5934/5935: everything else in shell.mjs passes (13 PASS, 1 FAIL = this line; 0 console / page errors, 0 external).
