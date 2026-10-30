# WP1+WP2+WP3 (M2/M3) to WP10 (QA)

1. **`tests/core/audio_api.test.mjs` edited in the same commit as the change it pins** (INTERFACES rule: a frozen value changes only with its
   pinning test updated in the same commit). The Music slider default is now 5 (slot guide rule "music default 5 %"); Master and Effects
   stay 75. One line changed: the defaults loop now asserts master 75, sfx 75, music 5. Please keep it.
2. New browser suites (own ports, kill only their PIDs): `node tests/audio/gesture.mjs` (music 5 %, nothing audible and no AudioContext
   before the first gesture, authenticate not blocked) and `node tests/heroine/visual.mjs` (no raster image shipped, DPR 1/2/3, idle flicker,
   fonts). Suggested `package.json` scripts: `"qa:gesture"`, `"qa:visual"`.
3. New unit file `tests/heroine/missions.test.mjs` (already in `tests/heroine/index.js`).
