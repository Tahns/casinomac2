# WP1+WP2+WP3 (shell, audio, heroine, M2/M3) to WP6 (LAYERS)

Status: open. Nothing breaks without it; each item makes a cue or a reaction honest.

## 1. `caseOpen` sound: pass the spin result and its cost share (orders.js, line ~88)
`caseOpen` is now win-like ONLY when this spin's result is above its share of the round's cost. Without numbers it plays the neutral flap
(as today). Same unit for both (1/100 x of the play amount, as in the book):
```js
const share = (ctx.cost || 1) * 100 / Math.max(1, (ctx.mission && ctx.mission.totalFs) || 1);   // C / totalFs
play(ctx, 'caseOpen', { win: ev.win, costShare: share });
```
On the quiet path (`ctx.audio` gated, R <= C) the win layer is always dropped, so this never sounds like a win below the cost.
`caseSeal`, `stamp` (SEALED / OPENED / banked slips) stay neutral (`winLike: false`). Pure check: `audio.isWinLike('caseOpen', { win, costShare })`.

## 2. Heroine reactions for the mission beats (new kinds, `REACT_KINDS` appended)
```js
const hero = heroine(ctx);
hero && hero.react('caseOpen', { ratio: ev.win / share });           // orders.js, at the flap: point at the board; small win only if ratio > 1
hero && hero.react('spotlight', {});                                  // blackout.js, when a lit cluster is hit (meta.lit)
hero && hero.react('layout', {});                                     // blueprint.js, when a plan other than mezzanine is drawn
```
All three are neutral points at the board (no wink, no particle), with their own cooldowns (1.2 / 1.5 / 3 s); Still = a held static point.

## 3. Costume swap behind your own screen
`hero.setOutfit(name, { hidden: true })` (same as `{ animated: false }`) swaps instantly; a call made while the rig is still loading is
replayed once it is ready. `hero.outfit` reads the current costume. `react('end')` already brings the inspectrice back after the end card
(behind her own folding screen); your `setOutfit(BASE_OUTFIT)` at the end stays harmless (no-op when already in it).
