// Agent Mambo v2 layers (WP6): pure logic shared by the layer plug-ins. No DOM here, so node --test covers it directly.
//
//   outlineOf(plan)            -> { cells: [{reel,row}], loops: [[[x,y],...]], d: 'M..Z', count }  the real outline of a floor plan
//   createBeam()               the Ballroom Blackout window tracker: route, step k (one per tumbleBoard since the reveal), lit test
//   windowCells(win, w, h)     the cells covered by a window whose top-left geometric cell is win
//   litByWindow(win, positions, w, h, toGeo)   true when any cluster cell (compact-padded) is inside the window
//   missionKey(id)             'briefing' | 'orders' | 'blackout' (an unknown mission id plays as the Briefing, WP8_to_FRONT 1)
//   OUTFIT_OF, DOOR_OF         mission -> heroine outfit, mission -> door key
//   bankOf(events...)          helpers for the Sealed Orders envelope (sum of the banked winInfo of one spin)

export const MISSIONS = Object.freeze(['briefing', 'orders', 'blackout']);
export const OUTFIT_OF = Object.freeze({ briefing: 'lab', orders: 'trench', blackout: 'casino', fuse: 'vault' });
export const BASE_OUTFIT = 'inspectrice';
export const DOOR_OF = Object.freeze({ briefing: 'stage', orders: 'coat', blackout: 'stairs' });

export function missionKey(id) {
  return MISSIONS.includes(id) ? id : 'briefing';
}

/** Cells of a plan as {reel,row} (geometric rows), in reel then row order. */
export function cellsOf(plan) {
  const out = [];
  if (!plan || !Array.isArray(plan.cells)) return out;
  plan.cells.forEach((rows, reel) => { (rows || []).forEach((row) => out.push({ reel, row })); });
  return out;
}

/**
 * The outline of the union of the plan's cells, as closed loops in cell units (x = reel, y = geometric row).
 * Every boundary edge appears exactly once; the loops run clockwise on screen (y down). One loop for every plan we ship.
 */
export function outlineOf(plan) {
  const cells = cellsOf(plan);
  const has = new Set(cells.map((c) => c.reel + ',' + c.row));
  const H = (x, y) => has.has(x + ',' + y);
  const next = new Map(); // "x,y" -> list of end points of directed boundary edges starting there
  const add = (x1, y1, x2, y2) => { const k = x1 + ',' + y1; if (!next.has(k)) next.set(k, []); next.get(k).push([x2, y2]); };
  for (const { reel: x, row: y } of cells) {
    if (!H(x, y - 1)) add(x, y, x + 1, y);         // top edge, left to right
    if (!H(x + 1, y)) add(x + 1, y, x + 1, y + 1); // right edge, down
    if (!H(x, y + 1)) add(x + 1, y + 1, x, y + 1); // bottom edge, right to left
    if (!H(x - 1, y)) add(x, y + 1, x, y);         // left edge, up
  }
  const loops = [];
  let edges = 0;
  for (const v of next.values()) edges += v.length;
  while (next.size) {
    const startKey = next.keys().next().value;
    const [sx, sy] = startKey.split(',').map(Number);
    const loop = [[sx, sy]];
    let cur = startKey;
    for (let guard = 0; guard <= edges; guard++) {
      const list = next.get(cur);
      if (!list || !list.length) break;
      const [nx, ny] = list.shift();
      if (!list.length) next.delete(cur);
      const nk = nx + ',' + ny;
      if (nk === startKey) break;
      loop.push([nx, ny]);
      cur = nk;
    }
    loops.push(simplify(loop));
  }
  const d = loops.map((l) => 'M' + l.map((p) => p[0] + ' ' + p[1]).join('L') + 'Z').join('');
  return { cells, loops, d, count: cells.length, edges };
}

// drop the points that sit in the middle of a straight run (fewer path points, same shape)
function simplify(loop) {
  const n = loop.length;
  if (n < 4) return loop;
  const out = [];
  for (let i = 0; i < n; i++) {
    const a = loop[(i - 1 + n) % n], b = loop[i], c = loop[(i + 1) % n];
    const straight = (a[0] === b[0] && b[0] === c[0]) || (a[1] === b[1] && b[1] === c[1]);
    if (!straight) out.push(b);
  }
  return out;
}

/** Length of the outline in cell units (for the draw-on dash). */
export function outlineLength(loops) {
  let L = 0;
  for (const l of loops) for (let i = 0; i < l.length; i++) { const a = l[i], b = l[(i + 1) % l.length]; L += Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]); }
  return L;
}

export function windowCells(win, w = 2, h = 2) {
  const out = [];
  if (!win) return out;
  for (let dx = 0; dx < w; dx++) for (let dy = 0; dy < h; dy++) out.push({ reel: win.reel + dx, row: win.row + dy });
  return out;
}

export function inWindow(win, reel, geoRow, w = 2, h = 2) {
  return !!win && geoRow >= 0 && reel >= win.reel && reel < win.reel + w && geoRow >= win.row && geoRow < win.row + h;
}

/** Positions are COMPACT-PADDED (winInfo); toGeo maps them (free spins are Mezzanine: geometric = padded - 1). */
export function litByWindow(win, positions, w = 2, h = 2, toGeo = (reel, p) => p - 1) {
  for (const p of positions || []) {
    const g = toGeo(p.reel, p.row);
    if (inWindow(win, p.reel, g, w, h)) return true;
  }
  return false;
}

/**
 * The Ballroom Blackout tracker. Book order per free spin: reveal, lightRoute, fusePath, winInfo(lit) ..., tumbleBoard (k += 1) ...
 * Step k = number of tumbleBoard events since this spin's reveal; after the last route entry the window stays on it.
 */
export function createBeam() {
  const B = {
    route: null, w: 2, h: 2, mult: 4, k: 0, checks: [], mismatches: 0,
    reset() { B.route = null; B.k = 0; },
    onRoute(ev) {
      B.route = Array.isArray(ev.route) && ev.route.length ? ev.route.map((p) => ({ reel: p.reel | 0, row: p.row | 0 })) : null;
      B.w = Number(ev.w) > 0 ? Number(ev.w) : 2; B.h = Number(ev.h) > 0 ? Number(ev.h) : 2;
      B.mult = Number(ev.lensMult) > 0 ? Number(ev.lensMult) : 4; B.k = 0;
      return B.current();
    },
    /** a tumbleBoard: the next window (returns true when the window moved) */
    step() {
      if (!B.route) return false;
      const before = B.current();
      B.k += 1;
      const after = B.current();
      return !!before && !!after && (before.reel !== after.reel || before.row !== after.row);
    },
    current() { return B.route ? B.route[Math.min(B.k, B.route.length - 1)] : null; },
    /** check every win of a winInfo against the window; returns [{ lit (book), beam (ours), ok }] */
    check(ev, toGeo) {
      const out = [];
      const win = B.current();
      for (const w of (ev && ev.wins) || []) {
        const meta = w.meta || {};
        if (!Object.prototype.hasOwnProperty.call(meta, 'lit')) continue;
        const beam = litByWindow(win, w.positions, B.w, B.h, toGeo);
        const r = { lit: !!meta.lit, beam, ok: !!meta.lit === beam, k: B.k };
        if (!r.ok) B.mismatches++;
        out.push(r); B.checks.push(r);
      }
      if (B.checks.length > 400) B.checks.splice(0, B.checks.length - 400);
      return out;
    },
  };
  return B;
}

/** The Sealed Orders bank of the current spin (integer x100 units). */
export function createBank() {
  const K = {
    bank: 0, slips: 0, opened: false,
    reset() { K.bank = 0; K.slips = 0; K.opened = false; },
    /** winInfo -> amount filed (0 when the winInfo is not banked) */
    file(ev) {
      const wins = (ev && ev.wins) || [];
      if (!wins.length || !wins.every((w) => w && w.meta && w.meta.banked === true)) return 0;
      const amt = Number(ev.totalWin) || wins.reduce((a, w) => a + (Number(w.win) || 0), 0);
      K.bank += amt; K.slips += 1;
      return amt;
    },
  };
  return K;
}

/** 1.2 -> "1.20", 26.4 -> "26.40" (amounts of the books are integers in 1/100 x of the play amount) */
export const fmtX = (x100) => (Math.round(Number(x100) || 0) / 100).toFixed(2);
