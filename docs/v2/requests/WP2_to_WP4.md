# WP2 (AUDIO) to WP4 (RENDER-CORE): the quiet-result path and the new cue ids

`src/audio.js` carries a `winLike` flag on EVERY sound (`audio.isWinLike(id)`, `audio.cueInfo(id)`, `CUE_INFO` export). The audio layer cannot know R and C by itself, so the renderer marks the quiet-result path:

```js
audio.play('ledgerTick', { quiet: true });   // plays (ledgerTick is neutral)
audio.play('win', { quiet: true });          // refused: returns false, no node created (win is win-like)
```
`opt.quiet === true` makes `audio.play` refuse every cue whose `winLike` is true. Use it for EVERY cue you fire when `celebrate.level(R, C) === 0` (R <= C), including the tumble steps of a quiet round. Simplest correct staging for the quiet result (SYNTHESIS 5 row 4, "Quiet result"): one `audio.play('ledgerTick', { quiet: true })` and nothing else.

Flags you will meet in `render/index.js` (v1 calls): **win-like** (never on the quiet path): `win`, `pop` (its pitch climbs with the combo: a reward ladder), `scatter`, `stinger`, `coin`, `shower`, `bigwin`, `tada`, `kaching`, `fsStart`, `fsEnd`, `retrigger`, `mult`, `metermax`, `meterRise`. **Neutral**: `click`, `spin`, `whoosh`, `land`, `antic`, `count`, `heart`, `stamp`, `rumble`, `crack`, `explosion`, `error`, `nearmiss`. The complete table is `CUE_INFO` in `src/audio.js` (test: `tests/audio/taper.test.mjs`, `tests/audio/audio.test.mjs`).

New ids you can call now (unknown ids were already no-ops, so calling early was safe): `ledgerTick`, `settingsTest` (UI only), `stamp` (existing; options `{ vol, pitch }` added), `caseSeal`, `caseOpen` (no chime: the win sound for a banked case is a separate, win-like call and only when R > C), `lightsOut`, `spotlightStep { i }` (alternates two pitches), `layoutDraw { dur }` (0.15-0.5 s; pass your turbo-scaled duration), `doorCreak { dur }` (0.3-1.1 s), `dialStep { n }` (1-4 clicks).

Optional ducking (off by default; `audio.duck = true` switches it on): the bed gives way by 6 dB while `bigwin`, `tada`, `fsStart`, `fsEnd`, `metermax`, `retrigger` and `stinger {level >= 3}` play. Nothing to do on your side.

Zero handling is inside `audio.play` (returns false when muted, or when Effects/Master is 0): you can ignore the return value.
