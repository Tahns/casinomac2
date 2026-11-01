# FIX render -> layers (round 1)

From the render fixer (area `render`, files src/render/{index,scene,...}.js). Two changes are needed in `src/render/layers/` (not render-owned).
The render side is already in place and feature-detects them, so each item can land on its own.

## 1. H2-01 Secret Entrance at confirm (door rounds): export `entrance(ctx, mission)`

`src/render/index.js` playBook now does, before the first event of a door book (`S.cost > 1`) that has a `missionAssigned`:

```js
import * as layersMod from './layers/index.js';
if (S.cost > 1 && typeof layersMod.entrance === 'function') {
  const ma = S.book.find((e) => e && e.type === 'missionAssigned');
  if (ma) { await layersMod.entrance(layerCtx, missionOf(ma)); S.entranceDone = true; }
}
```

and fsTrigger already skips the MISSION INCOMING telegram and shortens the scatter shock hold (1100 -> 450 ms) when `S.cost > 1`.
Needed in layers:

`src/render/layers/dossier.js`: move the door out of `cutscene()` and expose it:

```js
// in createDossier(): a flag the entrance sets, cutscene() reads
let entered = false;
L.entrance = async (ctx, m) => {
  clear(); const my = token; const alive = () => my === token;
  cut = overlay(ctx); if (!cut) return;
  await door(ctx, missionKey(m), alive);
  if (cut) { cut.remove(); cut = null; }
  entered = true;
};
// in cutscene(): replace   if (Number(ctx.cost) > 1) await door(ctx, m, alive);
if (Number(ctx.cost) > 1 && !entered) await door(ctx, m, alive);
entered = false;
// in L.reset: entered = false;
```

`src/render/layers/index.js`:

```js
export async function entrance(ctx, mission) {
  const d = LAYERS.find((l) => l.id === 'dossier');
  if (d && typeof d.entrance === 'function') return d.entrance(ctx, mission);
  return null;
}
```

Expected: door + keyhole iris right after CONFIRM (~0 s instead of 12.9 s normal / 8.7 s turbo), spin 1 about 5 s earlier.

## 2. H2-02 do not clear `<html data-mission>` at freeSpinEnd

`dossier.js` L.onEvent: `if (ev.type === 'freeSpinEnd') { setMission(null); return null; }` clears the mission while the Debrief /
MISSION COMPLETE card is still on screen. The render side works around it (fsEnd puts the attribute back in the same task, and
scene.js latches the palette until the lair iris has closed), but the clear should go:

```js
if (ev.type === 'freeSpinEnd') return null; // the mission stays until L.reset (end of the book), after the lair has closed
```

The render side also sets `data-mission` itself at the trigger detonation (look-ahead to missionAssigned, before the lair opens),
so `cutscene()`'s setMission(m) becomes a no-op repeat; keep it for books played by other callers.

## 3. H4-F7 Annex layers (blueprint.js)

Measured after the render fixes (wire puffs capped, DOM dust removed when the canvas draws it, logo idle loops off while playing,
parallax layers no longer promoted at rest): 36-cell Annex book 25532, 1024x576, 4x CPU: layers p90 50 -> 41, max 56 -> 47
(`node tests/e2e/perf_tumble.mjs --rate 4 --runs 2 --viewport 1024x576 --fixture fixtures/books_base_sample.jsonl --id 25532 --from-step 1`).
`div.l-bp-stamp` holds one layer (ActiveTransformAnimation + ActiveOpacityAnimation) for the whole blueprint; if the stamp could
use steps() on a non-composited property (e.g. a registered custom property read by `scale`, as render/index.js does for the
popped cells) the max would come under 45 too.
