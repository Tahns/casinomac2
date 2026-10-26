// Agent Mambo v2: board geometry (SYNTHESIS 3 and 8; WP4 owns this file after step 0, WP6 and WP5 read it).
//
// Events speak two row languages:
//   COMPACT-PADDED  winInfo / tumbleBoard.explodingSymbols / freeSpinTrigger|Retrigger positions:  padded = compactIndex + 1
//                   (index 0 is the top pad symbol of the reveal column; compactIndex = position inside cells[reel]).
//   GEOMETRIC       fuse* events, lightRoute, the layout event itself, everything drawn on screen:  0 = top row of the frame.
// geo.js is the ONLY place that maps one to the other:   geometric = cells[reel][padded - 1]   padded = indexOf(geometric) + 1
//
// Mezzanine (home plan, also every old book without a `layout` event) has cells[r] = [0,1,2,3,4], so toGeo(reel, p) === p - 1
// and toPadded(reel, g) === g + 1: exactly the v1 renderer's `vis(row) = row - 1`. A row that is not a cell of the plan maps to -1
// (v1 filtered those out with `inB`), so callers filter on `>= 0`.
//
// One module-level layout (a spin has one plan, fixed for the whole spin). setLayout(null) = Mezzanine. Nothing here throws.

const COLS = 6;
const mk = (id, name, rows, cells) => Object.freeze({
  id, name, cols: COLS, rows, cells: Object.freeze(cells.map((c) => Object.freeze([...c]))),
  cellCount: cells.reduce((n, c) => n + c.length, 0), links: Object.freeze([]),
});
const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const full5 = range(0, 4), mid3 = [1, 2, 3], low4 = range(1, 4), full6 = range(0, 5);

/** The four canonical floor plans (golden: tests/core/geo.test.mjs). The math emits the same shapes in the `layout` event. */
export const FLOOR_PLANS = Object.freeze({
  mezzanine: mk('mezzanine', 'Mezzanine', 5, [full5, full5, full5, full5, full5, full5]),        // 30 cells, home
  atrium: mk('atrium', 'Atrium', 5, [mid3, full5, full5, full5, full5, mid3]),                    // 26 cells, 4 corners cut
  lobby: mk('lobby', 'Lobby', 5, [low4, low4, low4, low4, low4, low4]),                           // 24 cells, low ceiling (6x4)
  annex: mk('annex', 'Annex', 6, [full6, full6, full6, full6, full6, full6]),                     // 36 cells, 6x6
});
export const DEFAULT_LAYOUT_ID = 'mezzanine';

const isInt = (n) => typeof n === 'number' && Number.isInteger(n);

/** Pure: is `l` a layout event (or normalised layout) the renderer can draw? */
export function isValidLayout(l) {
  if (!l || typeof l !== 'object') return false;
  if (!isInt(l.cols) || l.cols !== COLS) return false;
  if (!isInt(l.rows) || l.rows < 1 || l.rows > 8) return false;
  if (!Array.isArray(l.cells) || l.cells.length !== l.cols) return false;
  for (const col of l.cells) {
    if (!Array.isArray(col) || !col.length) return false;
    let prev = -1;
    for (const r of col) { if (!isInt(r) || r <= prev || r >= l.rows) return false; prev = r; }
  }
  return true;
}

function normalise(l) {
  if (l == null) return FLOOR_PLANS[DEFAULT_LAYOUT_ID];
  if (typeof l === 'string') return FLOOR_PLANS[l.toLowerCase()] || FLOOR_PLANS[DEFAULT_LAYOUT_ID];
  if (typeof l !== 'object') return FLOOR_PLANS[DEFAULT_LAYOUT_ID];
  if (isValidLayout(l)) {
    const cells = l.cells.map((c) => Object.freeze([...c]));
    return Object.freeze({
      id: String(l.id || 'custom'), name: String(l.name || l.id || 'Custom'), cols: l.cols, rows: l.rows,
      cells: Object.freeze(cells), cellCount: cells.reduce((n, c) => n + c.length, 0), links: Object.freeze([]),
    });
  }
  // unusable shape: fall back to the canonical plan of that id, else home
  return FLOOR_PLANS[String(l.id || '').toLowerCase()] || FLOOR_PLANS[DEFAULT_LAYOUT_ID];
}

let layout = FLOOR_PLANS[DEFAULT_LAYOUT_ID];

/** Set the plan of the spin. Accepts a `layout` event, a plan id string, or null/undefined (= Mezzanine). Returns the active plan. */
export function setLayout(l) { layout = normalise(l); return layout; }
export function getLayout() { return layout; }
export function resetLayout() { layout = FLOOR_PLANS[DEFAULT_LAYOUT_ID]; return layout; }

// numbers and numeric strings only: null / undefined / booleans / '' must not turn into row 0
const asInt = (v) => { const n = typeof v === 'number' ? v : (typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN); return Number.isInteger(n) ? n : NaN; };
const reelOf = (reel) => { const r = asInt(reel); return r >= 0 && r < layout.cols ? r : -1; };

/** Compact-padded row of an event position -> geometric row (0 = top of the frame). -1 when it is not a cell of the plan. */
export function toGeo(reel, paddedRow) {
  const c = reelOf(reel), p = asInt(paddedRow);
  if (c < 0 || !(p >= 1)) return -1;
  const g = layout.cells[c][p - 1];
  return g === undefined ? -1 : g;
}

/** Geometric row -> compact-padded row (compactIndex + 1). -1 when the plan has no cell there. */
export function toPadded(reel, geoRow) {
  const c = reelOf(reel), g = asInt(geoRow);
  if (c < 0 || !(g >= 0)) return -1;
  const i = layout.cells[c].indexOf(g);
  return i < 0 ? -1 : i + 1;
}

/** Object forms for event positions: { reel, row, ...rest } -> same object shape with the row converted (row -1 when absent). */
export function toGeoPos(p) { return p ? { ...p, row: toGeo(p.reel, p.row) } : p; }
export function toPaddedPos(p) { return p ? { ...p, row: toPadded(p.reel, p.row) } : p; }

/** Is (reel, geometric row) a cell of the active plan? */
export function hasCell(reel, geoRow) { return toPadded(reel, geoRow) > 0; }
/** Geometric rows present in a reel (sorted), [] for a bad reel. */
export function cellsOf(reel) { const c = reelOf(reel); return c < 0 ? [] : layout.cells[c]; }
/** Symbols a `reveal.board[reel]` column carries: present cells + top pad + bottom pad. */
export function revealLength(reel) { return cellsOf(reel).length + 2; }

export const geo = { setLayout, getLayout, resetLayout, toGeo, toPadded, toGeoPos, toPaddedPos, hasCell, cellsOf, revealLength, isValidLayout, FLOOR_PLANS };
export default geo;
