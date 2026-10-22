// Dev/test helper: builds SDK-shaped event streams (amounts in x100 like real books) with a tiny cluster/tumble simulator.
const COLS = 6, ROWS = 5;
const PAY = { H1: 8, H2: 5, H3: 3, H4: 2, L1: 1, L2: .8, L3: .6, L4: .4 };
const POOL = ['L1', 'L2', 'L3', 'L4', 'L1', 'L2', 'L3', 'L4', 'H1', 'H2', 'H3', 'H4', 'H4', 'W'];

function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

function clusters(vis) {
  const seen = new Set(), out = [];
  const key = (c, r) => c * 10 + r;
  for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) {
    const s = vis[c][r];
    if (s === 'S' || s === 'W' || seen.has(key(c, r))) continue;
    const q = [[c, r]], cells = []; const local = new Set([key(c, r)]);
    while (q.length) {
      const [x, y] = q.pop(); cells.push([x, y]);
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => {
        const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) return;
        const k = key(nx, ny); if (local.has(k)) return;
        const n = vis[nx][ny]; if (n === s || n === 'W') { local.add(k); q.push([nx, ny]); }
      });
    }
    cells.forEach(([x, y]) => { if (vis[x][y] === s) seen.add(key(x, y)); });
    if (cells.length >= 5) out.push({ symbol: s, cells });
  }
  return out;
}

const sym = (n) => ({ name: n });

export function makeSpin(opts = {}) {
  const rand = rng(opts.seed || 1);
  const pick = () => POOL[(rand() * POOL.length) | 0];
  const events = [];
  const push = (e) => { e.index = events.length; events.push(e); };
  const vis = Array.from({ length: COLS }, () => Array.from({ length: ROWS }, pick));
  const pads = Array.from({ length: COLS }, () => ({ top: pick(), bottom: pick() }));
  // plant
  (opts.plant || []).forEach(({ symbol, cells }) => cells.forEach(([c, r]) => { vis[c][r] = symbol; }));
  (opts.scatters || []).forEach(([c, r]) => { vis[c][r] = 'S'; });
  let mults = opts.mults || Array.from({ length: COLS }, () => Array(ROWS).fill(0));
  const free = !!opts.free;
  if (opts.fsIndex != null) push({ type: 'updateFreeSpin', amount: opts.fsIndex, total: opts.fsTotal });
  const board = () => vis.map((col, c) => [sym(pads[c].top), ...col.map(sym), sym(pads[c].bottom)]);
  const antic = Array(COLS).fill(0);
  const sc = vis.flat().filter((s) => s === 'S').length;
  if (sc >= 3) { let seen = 0; for (let c = 0; c < COLS; c++) { if (seen >= 3) antic[c] = 1; seen += vis[c].filter((s) => s === 'S').length; } }
  push({ type: 'reveal', board: board(), paddingPositions: [0, 0, 0, 0, 0, 0], gameType: free ? 'freegame' : 'basegame', anticipation: antic });
  if (free) push({ type: 'updateGrid', gridMultipliers: mults.map((c) => c.slice()) });
  let spinWin = 0, guard = 0, plantedOnly = opts.cascades != null ? opts.cascades : 3;
  for (;;) {
    const cl = clusters(vis); if (!cl.length || guard++ >= plantedOnly) break;
    const wins = cl.map((k) => {
      const base = (PAY[k.symbol] || .5) * (k.cells.length - 3);
      const m = free ? Math.max(1, k.cells.reduce((a, [c, r]) => a + (mults[c][r] || 0), 0)) : 1;
      const mid = k.cells[(k.cells.length / 2) | 0];
      return { symbol: k.symbol, clusterSize: k.cells.length, win: Math.round(base * m * 100), positions: k.cells.map(([c, r]) => ({ reel: c, row: r + 1 })), meta: { globalMult: 1, clusterMult: m, winWithoutMult: Math.round(base * 100), overlay: { reel: mid[0], row: mid[1] + 1 } } };
    });
    const tw = wins.reduce((a, w) => a + w.win, 0); spinWin += tw;
    push({ type: 'winInfo', totalWin: tw, wins });
    push({ type: 'updateTumbleWin', amount: spinWin });
    if (free) {
      cl.forEach((k) => k.cells.forEach(([c, r]) => { mults[c][r] = mults[c][r] ? Math.min(512, mults[c][r] + 1) : 1; }));
      push({ type: 'updateGrid', gridMultipliers: mults.map((c) => c.slice()) });
    }
    const exploding = []; const boom = new Set(cl.flatMap((k) => k.cells.map(([c, r]) => c * 10 + r)));
    const newSymbols = Array.from({ length: COLS }, () => []);
    for (let c = 0; c < COLS; c++) {
      const keep = vis[c].filter((_, r) => !boom.has(c * 10 + r)); const n = ROWS - keep.length; if (!n) continue;
      for (let r = 0; r < ROWS; r++) if (boom.has(c * 10 + r)) exploding.push({ reel: c, row: r + 1 });
      const fresh = Array.from({ length: n - 1 }, pick); const newPad = pick();
      vis[c] = [...fresh, pads[c].top, ...keep]; pads[c].top = newPad;
      newSymbols[c] = [sym(newPad), ...fresh.map(sym)];
    }
    push({ type: 'tumbleBoard', newSymbols, explodingSymbols: exploding });
  }
  if (spinWin) push({ type: 'setWin', amount: spinWin, winLevel: 2 });
  return { events, win: spinWin, vis, mults };
}

const cluster = (symbol, cells) => ({ symbol, cells });
export const PLANTS = {
  simple: [cluster('H1', [[0, 2], [1, 2], [2, 2], [1, 1], [1, 3]])],
  big: [cluster('H3', [[2, 1], [3, 1], [4, 1], [2, 2], [3, 2], [4, 2], [3, 3], [3, 0]]), cluster('L2', [[0, 4], [1, 4], [2, 4], [0, 3], [1, 3]])],
};

export function baseWin(seed = 3) {
  const r = makeSpin({ seed, plant: PLANTS.simple, cascades: 3 });
  r.events.push({ type: 'setTotalWin', amount: r.win }, { type: 'finalWin', amount: r.win });
  return r.events;
}
export function cascadeWin(seed = 9) {
  const r = makeSpin({ seed, plant: PLANTS.big, cascades: 5 });
  r.events.push({ type: 'setTotalWin', amount: r.win }, { type: 'finalWin', amount: r.win });
  return r.events;
}
export function noWin() {
  const r = makeSpin({ seed: 11, cascades: 0, plant: [] });
  // make sure there is no cluster: shuffle until none
  let s = 11; let out = r;
  while (clusters(out.vis).length && s < 200) { s += 1; out = makeSpin({ seed: s, cascades: 0 }); }
  out.events.push({ type: 'setTotalWin', amount: 0 }, { type: 'finalWin', amount: 0 });
  return out.events;
}
export function nearMiss() {
  const r = makeSpin({ seed: 21, cascades: 0, scatters: [[0, 1], [2, 3], [4, 0]] });
  r.events.push({ type: 'setTotalWin', amount: 0 }, { type: 'finalWin', amount: 0 });
  return r.events;
}
export function bonus(n = 4, big = false) {
  const first = makeSpin({ seed: 5, cascades: 1, scatters: [[0, 0], [1, 4], [3, 0], [4, 4]], plant: PLANTS.simple });
  const events = first.events.slice();
  const push = (e) => { e.index = events.length; events.push(e); };
  let total = first.win;
  push({ type: 'setTotalWin', amount: total });
  push({ type: 'freeSpinTrigger', totalFs: n, positions: [[0, 0], [1, 4], [3, 0], [4, 4]].map(([c, r]) => ({ reel: c, row: r + 1 })) });
  let mults = Array.from({ length: COLS }, () => Array(ROWS).fill(0));
  let fsWin = 0;
  for (let i = 1; i <= n; i++) {
    const ret = i === 2;
    const sp = makeSpin({ seed: 40 + i, free: true, fsIndex: i, fsTotal: n + (i >= 2 ? 5 : 0), mults, plant: i % 2 ? PLANTS.big : PLANTS.simple, cascades: 4 });
    mults = sp.mults;
    sp.events.forEach((e) => push(e));
    if (ret) { push({ type: 'freeSpinRetrigger', totalFs: n + 5, positions: [[1, 0], [2, 2], [5, 4]].map(([c, r]) => ({ reel: c, row: r + 1 })) }); }
    fsWin += sp.win;
    push({ type: 'setTotalWin', amount: total + fsWin });
  }
  const extra = big ? 20000 : 0;
  fsWin += extra;
  push({ type: 'freeSpinEnd', amount: fsWin, winLevel: 5 });
  push({ type: 'setWin', amount: fsWin, winLevel: 5 });
  push({ type: 'setTotalWin', amount: total + fsWin });
  push({ type: 'finalWin', amount: total + fsWin });
  return events;
}
export function bigWin(x = 60) {
  const ev = baseWin(4).filter((e) => e.type !== 'setWin' && e.type !== 'setTotalWin' && e.type !== 'finalWin');
  const push = (e) => { e.index = ev.length; ev.push(e); };
  push({ type: 'setWin', amount: x * 100, winLevel: 8 }); push({ type: 'setTotalWin', amount: x * 100 }); push({ type: 'finalWin', amount: x * 100 });
  return ev;
}
export function maxWin() {
  const ev = baseWin(4).filter((e) => !['setWin', 'setTotalWin', 'finalWin'].includes(e.type));
  const push = (e) => { e.index = ev.length; ev.push(e); };
  push({ type: 'wincap', amount: 500000 }); push({ type: 'setTotalWin', amount: 500000 }); push({ type: 'finalWin', amount: 500000 });
  return ev;
}
export const BOOKS = { baseWin, cascadeWin, noWin, nearMiss, bonus, bigWin, maxWin };
