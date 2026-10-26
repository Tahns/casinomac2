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

// self-avoiding path from reel 0: right weight 2, up/down weight 1
function fusePath(rand, N) {
  for (let tries = 0; tries < 200; tries++) {
    let c = 0, r = (rand() * ROWS) | 0; const out = [[c, r]], seen = new Set([c * 10 + r]);
    while (out.length < N) {
      const opts = [[1, 0, 2], [0, -1, 1], [0, 1, 1]].filter(([dx, dy]) => { const nc = c + dx, nr = r + dy; return nc < COLS && nr >= 0 && nr < ROWS && !seen.has(nc * 10 + nr); });
      if (!opts.length) break;
      let w = opts.reduce((a, o) => a + o[2], 0) * rand(); let pick = opts[0];
      for (const o of opts) { w -= o[2]; if (w <= 0) { pick = o; break; } }
      c += pick[0]; r += pick[1]; out.push([c, r]); seen.add(c * 10 + r);
    }
    if (out.length === N) return out;
  }
  return Array.from({ length: N }, (_, i) => [i % COLS, 2]);
}

// opts: seed, plant[], scatters[], cascades (max winning steps), pool (symbol pool for refills), free (free spin),
//   gm {v, step, cap} shared global multiplier state (free spins only; paid at the CURRENT value, then +step),
//   fuse {N,b0,adv,detmin,path}: bomb-timer wire. Dead board with burned>=detmin => fuseBlast {cells (visible rows)} then a
//   normal tumbleBoard refill (explodingSymbols padded rows); else fuseFizzle.
export function makeSpin(opts = {}) {
  const rand = rng(opts.seed || 1);
  const pool = opts.pool || POOL;
  const pick = () => pool[(rand() * pool.length) | 0];
  const events = [];
  const push = (e) => { e.index = events.length; events.push(e); };
  const vis = Array.from({ length: COLS }, () => Array.from({ length: ROWS }, pick));
  const pads = Array.from({ length: COLS }, () => ({ top: pick(), bottom: pick() }));
  (opts.plant || []).forEach(({ symbol, cells }) => cells.forEach(([c, r]) => { vis[c][r] = symbol; }));
  (opts.scatters || []).forEach(([c, r]) => { vis[c][r] = 'S'; });
  const free = !!opts.free;
  const gm = opts.gm || { v: 1, step: 1, cap: 100 };
  if (opts.fsIndex != null) push({ type: 'updateFreeSpin', amount: opts.fsIndex, total: opts.fsTotal });
  const board = () => vis.map((col, c) => [sym(pads[c].top), ...col.map(sym), sym(pads[c].bottom)]);
  const antic = Array(COLS).fill(0);
  const sc = vis.flat().filter((s) => s === 'S').length;
  if (sc >= 3) { let seen = 0; for (let c = 0; c < COLS; c++) { if (seen >= 3) antic[c] = 1; seen += vis[c].filter((s) => s === 'S').length; } }
  push({ type: 'reveal', board: board(), paddingPositions: [0, 0, 0, 0, 0, 0], gameType: free ? 'freegame' : 'basegame', anticipation: antic });
  // remove the cells in `boom` (Set of c*10+r), let the rest fall, refill; returns the tumbleBoard event body
  const dropCells = (boom) => {
    const exploding = [], newSymbols = Array.from({ length: COLS }, () => []);
    for (let c = 0; c < COLS; c++) {
      const keep = vis[c].filter((_, r) => !boom.has(c * 10 + r)); const n = ROWS - keep.length; if (!n) continue;
      for (let r = 0; r < ROWS; r++) if (boom.has(c * 10 + r)) exploding.push({ reel: c, row: r + 1 });
      const fresh = Array.from({ length: n - 1 }, pick); const newPad = pick();
      vis[c] = [...fresh, pads[c].top, ...keep]; pads[c].top = newPad;
      newSymbols[c] = [sym(newPad), ...fresh.map(sym)];
    }
    return { newSymbols, explodingSymbols: exploding };
  };
  const fz = opts.fuse ? { N: 8, b0: 1, adv: 1, detmin: 3, ...opts.fuse } : null;
  if (fz) {
    fz.path = fz.path || fusePath(rand, fz.N);
    fz.burned = Math.min(fz.N, fz.b0); fz.done = false;
    push({ type: 'fusePath', cells: fz.path.map(([c, r]) => ({ reel: c, row: r })), burned: fz.burned });
  }
  let spinWin = 0, guard = 0;
  const maxSteps = opts.cascades != null ? opts.cascades : 3;
  for (;;) {
    let cl = clusters(vis);
    if ((!cl.length || guard >= maxSteps) && fz && !fz.done) {
      fz.done = true;
      const gone = fz.burned >= fz.detmin ? fz.path.slice(0, fz.burned).filter(([c, r]) => vis[c][r] !== 'S') : [];
      if (gone.length) {
        push({ type: 'fuseBlast', cells: gone.map(([c, r]) => ({ reel: c, row: r })) });
        const d = dropCells(new Set(gone.map(([c, r]) => c * 10 + r)));
        push({ type: 'tumbleBoard', newSymbols: d.newSymbols, explodingSymbols: d.explodingSymbols });
        guard = 0; cl = clusters(vis);
      } else push({ type: 'fuseFizzle', burned: fz.burned });
    }
    if (!cl.length || guard++ >= maxSteps) break;
    const mult = free ? gm.v : 1;
    const wins = cl.map((k) => {
      const base = (PAY[k.symbol] || .5) * (k.cells.length - 3);
      const mid = k.cells[(k.cells.length / 2) | 0];
      return { symbol: k.symbol, clusterSize: k.cells.length, win: Math.round(base * mult * 100), positions: k.cells.map(([c, r]) => ({ reel: c, row: r + 1 })), meta: { globalMult: mult, clusterMult: 1, winWithoutMult: Math.round(base * 100), overlay: { reel: mid[0], row: mid[1] + 1 } } };
    });
    const tw = wins.reduce((a, w) => a + w.win, 0); spinWin += tw;
    push({ type: 'winInfo', totalWin: tw, wins });
    push({ type: 'updateTumbleWin', amount: spinWin });
    if (free) { gm.v = Math.min(gm.cap, gm.v + gm.step); push({ type: 'updateGlobalMult', globalMult: gm.v }); } // paid at the old value, then it rises
    const d = dropCells(new Set(cl.flatMap((k) => k.cells.map(([c, r]) => c * 10 + r))));
    push({ type: 'tumbleBoard', newSymbols: d.newSymbols, explodingSymbols: d.explodingSymbols });
    if (fz && !fz.done) { fz.burned = Math.min(fz.N, fz.burned + fz.adv); push({ type: 'fuseBurn', burned: fz.burned, newCells: fz.path.slice(fz.burned - fz.adv, fz.burned).map(([c, r]) => ({ reel: c, row: r })) }); }
  }
  if (spinWin) push({ type: 'setWin', amount: spinWin, winLevel: 2 });
  return { events, win: spinWin, vis, gm };
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
export function bonus(n = 4, big = false, step = 1) {
  const first = makeSpin({ seed: 5, cascades: 1, scatters: [[0, 0], [1, 4], [3, 0], [4, 4]], plant: PLANTS.simple });
  const events = first.events.slice();
  const push = (e) => { e.index = events.length; events.push(e); };
  let total = first.win;
  push({ type: 'setTotalWin', amount: total });
  push({ type: 'freeSpinTrigger', totalFs: n, positions: [[0, 0], [1, 4], [3, 0], [4, 4]].map(([c, r]) => ({ reel: c, row: r + 1 })) });
  const gm = { v: 1, step, cap: 100 };
  push({ type: 'updateGlobalMult', globalMult: 1 }); // the meter starts at x1 and is never reset during the feature
  let fsWin = 0;
  for (let i = 1; i <= n; i++) {
    const ret = i === 2;
    const sp = makeSpin({ seed: 40 + i, free: true, fsIndex: i, fsTotal: n + (i >= 2 ? 5 : 0), gm, plant: i % 2 ? PLANTS.big : PLANTS.simple, cascades: 4, fuse: i === 3 ? { adv: 2 } : undefined });
    sp.events.forEach((e) => push(e));
    if (ret) { push({ type: 'freeSpinRetrigger', totalFs: n + 5, positions: [[1, 0], [2, 2], [5, 4]].map(([c, r]) => ({ reel: c, row: r + 1 })) }); }
    fsWin += sp.win;
    push({ type: 'setTotalWin', amount: total + fsWin });
  }
  const extra = big ? 20000 : 0;
  fsWin += extra;
  // like the real books: freeSpinEnd.amount is the total of the round (base spin included), there is no setWin after it
  push({ type: 'freeSpinEnd', amount: total + fsWin, winLevel: 5 });
  push({ type: 'setTotalWin', amount: total + fsWin });
  push({ type: 'finalWin', amount: total + fsWin });
  return events;
}
// One free spin that chains winning steps until the meter reaches x20+ (refills only draw from two symbols so clusters keep forming).
export function meterChain(step = 1, steps = 22) {
  const first = makeSpin({ seed: 5, cascades: 0, scatters: [[0, 0], [1, 4], [3, 0], [4, 4]] });
  const out = first.events.slice();
  const push = (e) => { e.index = out.length; out.push(e); };
  push({ type: 'freeSpinTrigger', totalFs: 2, positions: [[0, 0], [1, 4], [3, 0], [4, 4]].map(([c, r]) => ({ reel: c, row: r + 1 })) });
  const gm = { v: 1, step, cap: 100 };
  push({ type: 'updateGlobalMult', globalMult: 1 });
  const sp = makeSpin({ seed: 7, free: true, fsIndex: 1, fsTotal: 2, gm, pool: ['H4', 'L1'], cascades: steps });
  sp.events.forEach((e) => push(e));
  push({ type: 'updateFreeSpin', amount: 2, total: 2 }); // second spin: the meter is KEPT
  const sp2 = makeSpin({ seed: 8, free: true, gm, pool: ['H4', 'L1'], cascades: 3 });
  sp2.events.forEach((e) => push(e));
  const tot = sp.win + sp2.win;
  push({ type: 'setTotalWin', amount: tot }, { type: 'freeSpinEnd', amount: tot, winLevel: 3 }, { type: 'finalWin', amount: tot });
  out.forEach((e, i) => { e.index = i; });
  return out;
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
// Wire books: search seeds so the demo has the wanted shape (blast that pays after the refill / blast with no pay / fizzle).
function fuseBook(kind, extra = {}) {
  for (let seed = 100; seed < 900; seed++) {
    const fz = kind === 'fizzle' ? { detmin: 99 } : kind === 'adv2' ? { adv: 2, detmin: 3 } : {};
    const r = makeSpin({ seed, plant: PLANTS.simple, cascades: kind === 'fizzle' ? 1 : 3, fuse: fz, ...extra });
    const types = r.events.map((e) => e.type);
    const blastAt = types.indexOf('fuseBlast');
    const paysAfter = blastAt >= 0 && types.slice(blastAt).includes('winInfo');
    const ok = kind === 'fizzle' ? types.includes('fuseFizzle') : kind === 'blastDry' ? (blastAt >= 0 && !paysAfter) : (paysAfter && types.filter((x) => x === 'winInfo').length >= 3);
    if (!ok) continue;
    r.events.push({ type: 'setTotalWin', amount: r.win }, { type: 'finalWin', amount: r.win });
    return r.events;
  }
  return baseWin();
}
export const fuseBlast = () => fuseBook('blast');
export const fuseBlastDry = () => fuseBook('blastDry');
export const fuseBlastAdv2 = () => fuseBook('adv2');
export const fuseFizzle = () => fuseBook('fizzle');
export function fuseFizzleNoWin() {
  const r = makeSpin({ seed: 11, cascades: 0, fuse: { detmin: 3 } });
  r.events.push({ type: 'setTotalWin', amount: 0 }, { type: 'finalWin', amount: 0 });
  return r.events;
}
// Dead board with 3 burnt cells right at the reveal, a scatter on the path (it must stay): blast, holes, refill.
export function fuseBlastScatter() {
  const path = [[0, 2], [1, 2], [2, 2], [3, 2], [3, 1], [4, 1], [5, 1], [5, 0]];
  for (let seed = 1; seed < 400; seed++) {
    const r = makeSpin({ seed, cascades: 0, scatters: [[1, 2]], fuse: { b0: 3, path } });
    if (r.events.some((e) => e.type === 'winInfo') || !r.events.some((e) => e.type === 'fuseBlast')) continue;
    if (clusters(r.vis).length) continue; // keep the refill quiet so the removed cells are easy to see
    r.events.push({ type: 'setTotalWin', amount: r.win }, { type: 'finalWin', amount: r.win });
    return r.events;
  }
  return baseWin();
}
// free-spin version: trigger, then one free spin carrying a wire (the meter value is kept)
export function fuseFree() {
  const b = bonus(2);
  const out = b.slice(0, b.findIndex((e) => e.type === 'freeSpinTrigger') + 1);
  out.push({ type: 'updateGlobalMult', globalMult: 1 });
  const gm = { v: 1, step: 1, cap: 100 };
  const sp = makeSpin({ seed: 77, free: true, fsIndex: 1, fsTotal: 2, gm, plant: PLANTS.big, cascades: 3, fuse: { adv: 2 } });
  sp.events.forEach((e) => out.push(e));
  out.push({ type: 'freeSpinEnd', amount: sp.win, winLevel: 1 }, { type: 'setTotalWin', amount: sp.win }, { type: 'finalWin', amount: sp.win });
  out.forEach((e, i) => { e.index = i; });
  return out;
}
// A base spin whose winning steps (cascade) pay exactly `amounts` (multiples of the bet, e.g. [0.4, 0.7, 2]): the test book of the
// celebration gate (R is the running sum of the steps). The refills only draw from three symbols so that every step forms a cluster.
export function stepsBook(amounts, seedFrom = 1) {
  const n = amounts.length;
  for (let seed = seedFrom; seed < seedFrom + 600; seed++) {
    const r = makeSpin({ seed, plant: PLANTS.simple, cascades: n, pool: ['H4', 'L1', 'L2'] });
    const infos = r.events.filter((e) => e.type === 'winInfo');
    // every winning step needs at least 0.1x per cluster (amounts are multiples of 0.1x), so skip seeds with too many clusters
    if (infos.length !== n || infos.some((e, i) => e.wins.length > Math.round(amounts[i] * 10))) continue;
    let k = 0, run = 0;
    const ev = r.events.map((e) => ({ ...e }));
    for (const e of ev) {
      if (e.type === 'winInfo') {
        const want = Math.round(amounts[k++] * 100), len = e.wins.length;
        const each = Math.floor(want / len / 10) * 10;
        e.wins = e.wins.map((w, i) => { const v = i === 0 ? want - each * (len - 1) : each; return { ...w, win: v, meta: { ...w.meta, winWithoutMult: v } }; });
        e.totalWin = want; run += want;
      } else if (e.type === 'updateTumbleWin') e.amount = run;
      else if (e.type === 'setWin') e.amount = run;
    }
    ev.push({ type: 'setTotalWin', amount: run }, { type: 'finalWin', amount: run });
    ev.forEach((e, i) => { e.index = i; });
    return ev;
  }
  return baseWin();
}
export const winAt = (x) => stepsBook([x]);

export const BOOKS = { fuseBlast, fuseBlastDry, fuseBlastAdv2, fuseBlastScatter, fuseFizzle, fuseFizzleNoWin, fuseFree, meterChain, baseWin, cascadeWin, noWin, nearMiss, bonus, bigWin, maxWin, stepsBook, winAt };
