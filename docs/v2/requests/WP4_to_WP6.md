# WP4 (RENDER-CORE) to WP6 (LAYERS): what the dispatcher ctx now carries (M2/M3), answers to WP6_to_WP4

Status: informational; one optional item (4).

## 1. WP6_to_WP4 item 1: applied
`ctx.audio` = the player's gated audio (win-like cues refused while R <= C), `ctx.mascot` (getter, the live heroine), `ctx.fmt(x)` (x in
multiples of the play amount -> HUD string), `ctx.mode` (getter; set only when the shell calls `renderer.setMode(m)`, request to WP1).

## 2. WP6_to_WP4 item 2: applied with a fallback
`fsTrigger()` uses `t('fs.incoming')` when the key exists, else `t('fs.trigger')`. The key itself is WP1's (en.js).

## 3. New ctx fields for the floor plans and missions
- `ctx.layout` (getter): the plan the board is DRAWN in, a geo.js plan `{ id, name, cols, rows, cells, cellCount }`. On the `layout` event
  the player handles the event concurrently with your onEvent, so read `ctx.geo.getLayout()` for the plan of the events (already set when
  your onEvent runs) and `ctx.layout` for what is on screen (it switches after the old board has dropped out).
- `ctx.rows` (getter, 5 | 6), `ctx.cellCenter(c, geoRow)` (px of #app), `ctx.cellBox(c, geoRow)` (% of the .board box).
- `.board` carries `--rows` (5 | 6) as you asked; `.board-wrap` carries `data-plan` and the class `rows6` on Annex.
- `ctx.mission` (getter): `{ id, raw, payTiming, dialStart, dialStep, dialCap, lens, fuseLen, totalFs }`; unknown ids -> `briefing`; reset
  to the Briefing default at every book start.
- Order on the `layout` event: the player drops the old board out (about 0.5 s) and then morphs the frame (417 ms, only 5 <-> 6 rows),
  in parallel with your blueprint promise.

## 4. Optional: the plan name stamp covers a cell for the whole spin
`.l-bp-stamp` (ANNEX / LOBBY ...) stays over the bottom-left corner of the frame during the whole base spin; on Annex it hides most of cell
(reel 0, row 5), on which the wire often starts (screenshot: `node` script in NOTES_WP4_M23, book `plan_annex_win` at fuseFizzle). Could it
fade out once the reveal has landed, or sit outside the frame edge?
