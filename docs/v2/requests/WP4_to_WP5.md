# WP4 (RENDER-CORE) to WP5 (FX-WIRE): frame height for the wire (Annex 6 rows), scene palette hook, canvas cost

Status: item 1 APPLIED by WP10 (integrator, 2026-10-30) in src/render/wire.js: `rowsOf()` from ctx.rows(), `normCells(cells, rows)` without the padded guess, viewBox per path, every `/ ROWS` uses rowsOf(), `rowsAware: true` (the Annex adapter of render/index.js steps aside). Checked: browser_v2 --only=P 62/62, Annex book 59389 (path on geometric rows 5-4-3) drawn on the right cells at 1280x720 (viewBox 0 0 6 6). fuse.js is not used by the player (left unchanged). Item 2: done through <html data-mission> (WP6_to_WP5 applied). Item 3 (canvas redraw only on change) still OPEN for WP5.

## 1. wire.js (and fuse.js) assume 5 rows; the Annex floor plan has 6 (SYNTHESIS 3, WP7_to_FRONT item 3)
`const ROWS = 5`, `normCells()` reads any row >= 5 as a PADDED row and shifts the whole path up, the svg viewBox is `0 0 6 5`, and the fx
positions divide `board.clientHeight / ROWS`. Fuse events are GEOMETRIC by contract (never padded), so on Annex a path that touches the
bottom row (geometric 5) is drawn one row too high and stretched over 6 rows.
Workaround in render/index.js (WP4, `wireHost` + `WO`): the wire gets a host that covers 5 of the 6 rows (rows 0-4 or 1-5, chosen from the
path) and every row it sees or asks about is shifted; it steps aside as soon as the wire says it handles any height. Please:
```js
// wire.js: the frame height comes from the player (ctx.rows() = 5 or 6; default 5 for old callers)
const rowsOf = () => { try { const n = Number(ctx.rows && ctx.rows()); return n >= 1 && n <= 8 ? n : 5; } catch (e) { return 5; } };
// normCells: events are geometric; drop the padded heuristic (rows >= ROWS) and filter on the live height
export function normCells(cells, rows = 5) { ...filter((p) => p.reel >= 0 && p.reel < COLS && p.row >= 0 && p.row < rows); }
// at path(): svg.setAttribute('viewBox', `0 0 ${COLS} ${rowsOf()}`); every `/ ROWS` and `ROWS - .34` uses rowsOf()
// and announce it so the player drops its adapter:
api.rowsAware = true;   // on the object createWire returns
```
The player already passes `rows: () => S.rows` and `geo` in the wire ctx. Check with `node tests/render/browser_v2.mjs --only=P` and a
screenshot of book `plan_annex_win` (tests/render/fixtures/v2_books.json, path on geometric row 5) at its fuseBurn.

## 2. Mission palette (SYNTHESIS 9 art inventory: lair / hat-check / ballroom tokens swapped by scene.js)
The player calls `scene.setMission(id)` at `missionAssigned` when the function exists (`id` = briefing | orders | blackout; unknown ids are
already mapped to briefing), and WP6 sets `<html data-mission>` for the same feature. Either hook is fine; nothing to do if scene.js keys
its tokens on `data-mission`.

## 3. Frame budget (ACC-p95-frame): the canvases dominate the main thread at 4x
Trace of the 30-cell tumble book at 4x CPU (main thread busy 30.5 s of 31.8 s): `CanvasResourceProviderSharedImage::ProduceCanvasResource`
7.4 s (5 canvases of about 1106x622: sky, spark, blinds, fore, fx, presented every frame even when nothing moved), commit/update layers
8.4 s, paint 5.8 s. The idle page alone is p95 50 ms at 4x. Drawing a canvas only when its content changed (dirty flag, no clearRect +
redraw of a static sky every frame) is the largest remaining lever; the render core's share is small (see docs/v2/NOTES_WP4_M23.md).
