# WP6 (LAYERS) to WP4 (RENDER-CORE): layer ctx fields, trigger banner wording, test probe order

Status: open. None of these blocks the layers (each has a fallback today); they remove workarounds.

## 1. Add four fields to `layerCtx` (INTERFACES 4 says "fields are only ever added")
Why: the layers today import the audio singleton directly (their cues are all neutral, `winLike: false`, so the quiet gate is not
bypassed, but it is cleaner to go through your `gatedAudio`), find the heroine through `mascotOf(#heroine-slot)` and format numbers
themselves as `1.20` (x of the play amount) instead of the player's currency format.
```js
// render/index.js, right after `const layerCtx = { ... }`
layerCtx.audio = gatedAudio;                       // or { play: (id, o) => cue(id, o) }
Object.defineProperty(layerCtx, 'mascot', { get: () => M.m, enumerable: true });
layerCtx.fmt = (x) => S.fmt(x);                    // x in multiples of the play amount -> the formatted string the HUD shows
Object.defineProperty(layerCtx, 'mode', { get: () => S.mode || null, enumerable: true }); // optional: 'base' | 'bonus' | 'entrance_orders' | 'entrance_blackout'
```
The layers already read `ctx.audio` / `ctx.mascot` first when present (`src/render/layers/util.js` play() / heroine()). With `ctx.fmt`
the Sealed Orders plate and reveal will switch from `1.20 x8 = 9.60` to the HUD format (one-line change in orders.js on my side).

## 2. The free-spins trigger banner says "MISSION BRIEFING" for every mission
`fsTrigger()` shows `t('fs.trigger')` = "MISSION BRIEFING" (en.js, WP1) before the `missionAssigned` event is even dispatched, so a
Sealed Orders or Ballroom Blackout feature first reads "MISSION BRIEFING" and then the dossier says "MISSION: SEALED ORDERS". That
hurts the 10-second test (viewers name the wrong mission). Proposal: a neutral title for the trigger banner, the dossier (WP6) names
the mission right after it. Snippet (WP1 owns en.js; key name is a proposal, WP1 to confirm):
```js
// en.js:  'fs.incoming': 'MISSION INCOMING',
// render/index.js fsTrigger():  title: hasKey('fs.incoming') ? t('fs.incoming') : t('fs.trigger')
```
(The same text is sent to WP1 in WP6_to_WP1.md.)

## 3. Nothing else needed from the player
- The layers hold the book through the returned Promise only for: the blueprint (<= 0.5 s, turbo 0.2 s), the dossier (door <= 1 s +
  dossier about 3 s, skippable after 1.2 s), the caseOpen reveal (about 1.1 s), the spotlight step (250 ms). All scaled by `ctx.T`.
- WP6 layers attach themselves on the first dispatch whose ctx has a `board` element (so `tests/core/layers.test.mjs` still sees the
  empty list on a bare import). Test probes pushed before the first book run before the WP6 layers.
- `.l-bp` / `.l-dark` are inserted inside `.board` before `.popups`; `.l-env` / `.l-bp-stamp` inside `.board-wrap`; `.l-cut` /
  `.l-screen` inside `#app`; the debrief tab inside your `.banner` (end-of-feature card). If the shape-driven board sets a `--rows`
  custom property on `.board`, the overlays use it (else the plan's frame rows).

## 4. Seen in the WP6 screenshots (FYI, not WP6 files)
- Ballroom Blackout: the "+N" chip near a winning cluster reads "+8" while the dial goes 1 -> 4 (missionAssigned.dialStep = 3):
  `tests/layers/shots/spotlight_x4_1280x720.png`. The chip should read `dialStep` (WP8_to_FRONT 5); WP5's meter.mission(ev) has it.
- The end card subtitle still says "MISSION METER x17"; the player-facing name is "Clearance Dial" (SYNTHESIS 0 names table).
