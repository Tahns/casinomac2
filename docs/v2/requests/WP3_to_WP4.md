# WP3 (HEROINE) to WP4 (RENDER-CORE): the heroine reactions to call from the event player

`src/render/mascot.js` is finished: `createMascot(#mascot-slot, ...)` now draws the rig into `#heroine-slot` (nothing to change for that: the shell shows it and retires the v1 box) and `renderer.mascot.react(kind, info)` already delegates to it. What is left is yours: replace the v1 `pose()` calls in `render/index.js` by `react()`. Until you do, the legacy `pose(name)` calls keep working (mapping below), but they cannot carry the payout ratio, so a sub-cost win still gets the v1 happy pose.

## The calls (kind -> when -> info)

`react(kind, info)` returns true when a clip, a static pose or a costume change started (false = nothing started: unknown kind, a bigger reaction is playing, cooldown, Still has no pose for it, or the rig is not ready yet). It never throws and never needs a guard. Every `info` key is optional.

| event / moment | `react(kind, info)` | what she does |
|---|---|---|
| spin pressed, reels start (`reveal` start) | `react('spin')` | ready stance, eyes on the spin button then the grid; held until the next reaction (auto release after 8 s) |
| `reveal.anticipation` (honest slow-roll) | `react('anticipate')` | leans in, eyes dart between the reels, hand out; held (auto release 12 s). Never a shock. |
| spin ended with no win at all | `react('dead')` | every THIRD consecutive dead spin a shrug (not twice within 6 s); the others only release the held pose |
| winInfo / round result at level 0 (R <= C) | `react('quiet', { level: 0, ratio })` | releases the hold, one slow blink, nothing else |
| level 1 | `react('win', { level: 1, ratio, at: { x, y } })` | wink + small hop + sparkles (cooldown 1.8 s) |
| level 2 | `react('bigwin', { level: 2, ratio, at })` | jump with both arms up, star eyes |
| level 3 | `react('epic', { level: 3, ratio, at })` | pirouette jump, confetti, three bounces (3.6 s) |
| `fuseBlast` | `react('blast')` | THE ONLY shock (cap pops off, hands on cheeks), cooldown 2.5 s |
| `fuseFizzle` | `react('fizzle')` | shrug, eye roll, sigh puff (cooldown 6 s) |
| `updateGlobalMult` milestone (5, 10, 20, 50, max) | `react('meter', { ratio })` | points up at the Clearance Dial, eyes on it (cooldown 2.5 s) |
| `freeSpinTrigger` / `missionAssigned` | `react('trigger', { mission, outfit })` | with a costume that differs from the current one: the change behind the folding screen (1.9 s, uncuttable) ending in a salute; otherwise a salute + wink. `mission` briefing / orders / blackout / fuse -> lab / trench / casino / vault; `outfit` wins over `mission`. |
| `freeSpinRetrigger` | `react('retrigger')` | like `win` |
| `freeSpinEnd` / `finalWin` | `react('end', { ratio })` | the bow (no sparkles and no wink when `ratio <= 1`), then the base costume comes back behind the screen if she is not in it |
| costume change decided elsewhere (layers) | `react('outfit', { outfit })` | the change behind the screen; the same costume again is ignored; a second change during the first is queued |
| book start, book end, `destroy` | `react('idle')` | releases a held pose (never cuts a running clip) |
| nothing to do for a while | `react('gag')` (optional) | a random idle gag; the rig also does its own every 5-12 s |

Optional `info` keys: `ratio` (R / C: a win-like kind with `ratio <= 1` or `level <= 0` is turned into the quiet beat, a second line of defence behind your gate), `level`, `at` = `{ x, y }` viewport px of the winning cluster (her eyes go there; stale after 6 s), `speed` (0.5..2.5, turbo and skip), `ms` (the beat you have: a clip longer than that is sped up, up to 2.5x, never slowed), `mission`, `outfit`. Unknown keys are ignored.

## Legacy `pose(name)` mapping (until you migrate)

`idle` release, `think` held neutral pose, `happy` = `win`, `bigwin` = `bigwin`, `celebrate` = `epic`, `plunger` = `trigger`, `shrug` = `dead` (so the shrug already only shows every third dead round), `dance` = release, `shock` = `anticipate` (NOT a shock: v1 called it for the anticipation and the scatter landing, neither is the blast).

## Rules you can rely on

- Priorities: `outfit` 6 > `epic` 5 > `bigwin`, `trigger`, `end` 4 > `blast` 3 > `win`, `retrigger`, `anticipate` 2 > `spin`, `dead`, `fizzle`, `meter` 1 > `idle`, `quiet`, `gag` 0. A smaller reaction never cuts a running bigger one; held poses (spin, anticipate) are replaced by anything.
- Motion level comes from `settings.get('motionLevel')` (read by the heroine herself, you pass nothing): Full clips, Calm the same clips without jumps, spins, cap pops, heavy particles, Still (and Auto while the OS asks for reduced motion) static poses only, outfits swap instantly.
- `say(key, ms, force, vars)` is unchanged (the bubble is now an element of `#app` over her skirt; no bubble when her box is smaller than 118x150 px). `mascot.lose.*`, `mascot.fsEnd.*`, `mascot.big.2`, `mascot.wire.2` are reworded by `en_hero.js`, nothing to do.
- Audio sync: `createMascot(host, { onCue(name, clip) })` fires `spinStart scatterTease winSmall winBig megaWin shock lose freeSpinStart freeSpinEnd meterMilestone whistle outfitChange` when the clip reaches that moment (names of the rig clips), if you want `mascot_hop` / `mascot_gasp` on them. Not used today.
- Test hook: `import { mascotOf } from './render/mascot.js'; mascotOf(document.getElementById('heroine-slot'))` returns the live mascot (`.mode()`, `.impl.rig()`, `.impl.director().state()`).

## Not needed from you

Nothing in the DOM: you do not touch `#heroine-slot`, `#mascot-slot` or the slot size. The `size` option you pass today is ignored in slot mode. `REDUCE` is not used any more for the heroine (the settings store is).
