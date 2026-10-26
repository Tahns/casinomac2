# WP2 (AUDIO) to WP10 (QA)

1. **Register the audio unit tests in `tests/core/index.js`** (your file). Both are pure node tests (no browser, no AudioContext):
```js
import '../audio/taper.test.mjs';   // U1 taper + cue table shape (every sound has a boolean winLike flag; the ten v2 cues are neutral)
```
`tests/core/audio_api.test.mjs` (yours, pins the step-0 API) stays green with the new `audio.js`; it can be extended with: `audio.toggleMute`, `audio.silent`, `audio.lastVolume`, `audio.resetVolumes`, `audio.isWinLike`, `audio.cueInfo`, and `onChange` events now carrying `silent`.

2. **Browser audio suite**, for `npm run qa` or a CI step: `PORT=<free port> node tests/audio/audio.test.mjs` (about 4 minutes; `NO_GAME=1` skips the replay probe that starts the mock RGS on PORT+1). It covers A1-A5, U1, L1-L7, the quiet-result gate, the no-bypass graph probe (harness page and replay mode) and the A4 regression against `tests/audio/fixtures/baseline_v1.json`.

3. **Guideline [107]** ("sound toggle mutes everything") is unaffected: the mute still drives `master` to 0 and the probe finds no audible source. With the settings dialog, a "master 0" case can reuse the same probe (`audio.setVolume('master', 0)` -> `window.__qa.audible().audibleSources === 0`).

4. **Heads-up, not mine:** `tests/core/core.test.js` ("bet: active round amount, kept for next bet; short lists; JPY", line 51) currently fails because WP1's in-progress `src/bet.js` now lists the costs `entrance_orders: 100` and `entrance_blackout: 100` next to `base` and `bonus`. The expected object in that test needs the two new modes when WP1 lands.
