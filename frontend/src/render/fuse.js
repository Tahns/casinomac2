// Fuse Line renderer (front-end only). Events: fusePath, fuseBurn, fuseBlast, fuseFizzle.
// Everything is drawn in code (SVG over the board) in the 1960s cartoon style. No dependency on the math side:
// the renderer (index.js) feeds events in and provides small helpers; every helper is optional (feature-detected).
const COLS = 6, ROWS = 5, NS = 'http://www.w3.org/2000/svg';
const MAX_SMOKE = 14;      // live smoke wisps (SVG) at any time
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const el = (tag, attrs = {}, parent) => {
  const e = document.createElementNS(NS, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(e);
  return e;
};

let cssDone = false;
function ensureCss() {
  if (cssDone || typeof document === 'undefined') return;
  cssDone = true;
  try {
    if (document.querySelector('link[data-fuse-css]')) return;
    const l = document.createElement('link');
    l.rel = 'stylesheet'; l.href = new URL('./fuse.css', import.meta.url).href; l.setAttribute('data-fuse-css', '1');
    document.head.appendChild(l);
  } catch (e) { /* styles are optional: the layer still works without them (default SVG attributes) */ }
}

// Accept visible rows (0..4). If a row index reaches 5 the event uses padded rows (1..5): shift down.
export function normCells(cells) {
  const list = (Array.isArray(cells) ? cells : []).map((p) => ({ ...p, reel: Number(p.reel), row: Number(p.row) }))
    .filter((p) => Number.isFinite(p.reel) && Number.isFinite(p.row));
  const padded = list.some((p) => p.row >= ROWS);
  return list.map((p) => ({ ...p, row: padded ? p.row - 1 : p.row })).filter((p) => p.reel >= 0 && p.reel < COLS && p.row >= 0 && p.row < ROWS);
}

/**
 * ctx: { board (HTMLElement .board), cellCenter(c,r)->{x,y,size} (px relative to #app), fx (particles, optional),
 *        audio (optional), pose(name, holdMs), swapCell(c,r,name) -> bool, shake(amp,ms), flash(peak,ms,color),
 *        sleep(ms) (turbo scaled), turbo() -> bool, reduced (bool), t(key), destroyed() -> bool }
 */
export function createFuse(ctx) {
  ensureCss();
  const reduced = !!ctx.reduced;
  const turbo = () => { try { return !!(ctx.turbo && ctx.turbo()); } catch (e) { return false; } };
  const dead = () => { try { return !!(ctx.destroyed && ctx.destroyed()); } catch (e) { return false; } };
  const sleep = (ms) => (ctx.sleep ? ctx.sleep(ms) : new Promise((r) => setTimeout(r, ms)));
  const snd = (n) => { try { if (ctx.audio && typeof ctx.audio.play === 'function') ctx.audio.play(n); } catch (e) { /* ignore */ } };
  const pose = (n, h) => { try { if (ctx.pose) ctx.pose(n, h); } catch (e) { /* ignore */ } };
  const T = (ms) => ms * (turbo() ? 0.42 : 1);

  const layer = document.createElement('div');
  layer.className = 'fz-layer'; layer.setAttribute('aria-hidden', 'true');
  const svg = el('svg', { class: 'fz-svg', viewBox: `0 0 ${COLS} ${ROWS}`, preserveAspectRatio: 'none' });
  layer.appendChild(svg);
  ctx.board.appendChild(layer);

  const st = { cells: [], burned: 0, nodes: [], segs: [], scorch: [], spark: null, match: null, smoke: 0, busy: 0, gen: 0, boom: null };
  const ctr = (p) => ({ x: p.reel + 0.5, y: p.row + 0.5 });

  function starPoints(r, n = 8, inner = 0.38) {
    let d = '';
    for (let i = 0; i < n * 2; i++) { const a = (i / (n * 2)) * Math.PI * 2 - Math.PI / 2, rr = i % 2 ? r * inner : r; d += `${(Math.cos(a) * rr).toFixed(3)},${(Math.sin(a) * rr).toFixed(3)} `; }
    return d.trim();
  }

  function clear(fade = false) {
    st.pending = null;
    st.gen++;
    const nodes = [...svg.childNodes], bm = st.boom;
    st.cells = []; st.burned = 0; st.nodes = []; st.segs = []; st.scorch = []; st.spark = null; st.match = null; st.boom = null; st.smoke = 0;
    if (fade && nodes.length && !reduced) {
      const g = el('g'); nodes.forEach((n) => g.appendChild(n)); svg.appendChild(g);
      try { g.animate([{ opacity: 1 }, { opacity: 0 }], { duration: T(420), fill: 'forwards' }).finished.then(() => g.remove(), () => g.remove()); } catch (e) { g.remove(); }
    } else nodes.forEach((n) => n.remove());
    layer.querySelectorAll('.fz-boom').forEach((n) => { if (n !== bm || !fade) n.remove(); });
    if (!fade) layer.classList.remove('on');
  }

  function setUnit() { try { layer.style.setProperty('--u', (ctx.board.clientWidth / COLS).toFixed(1) + 'px'); } catch (e) { /* ignore */ } }

  function spawnSmoke(x, y, n = 2, color) {
    for (let i = 0; i < n; i++) {
      if (st.smoke >= MAX_SMOKE || reduced) return;
      st.smoke++;
      const g = el('g', { transform: `translate(${(x + (Math.random() - .5) * .25).toFixed(3)} ${(y - .05).toFixed(3)})` }, svg);
      const c = el('circle', { class: 'fz-puff', r: (0.09 + Math.random() * .07).toFixed(3), fill: color || '#b9aa94' }, g);
      const dx = (Math.random() - .5) * .5, dy = -(0.35 + Math.random() * .35);
      let a;
      try { a = c.animate([{ transform: 'translate(0,0) scale(.5)', opacity: .85 }, { transform: `translate(${dx}px,${dy}px) scale(2.1)`, opacity: 0 }], { duration: T(900 + Math.random() * 500), easing: 'ease-out', fill: 'forwards' }); } catch (e) { a = null; }
      // transform on an SVG child uses user units when no CSS length unit conversion applies; px == user unit here
      const done = () => { st.smoke = Math.max(0, st.smoke - 1); g.remove(); };
      if (a) a.finished.then(done, done); else done();
    }
  }

  function build(cells, burned) {
    clear();
    setUnit();
    st.cells = cells; st.burned = 0;
    const defsG = el('g', { class: 'fz-rope' }, svg);
    // scorch tiles + segments under, nodes over
    cells.forEach((p, i) => {
      const r = el('rect', { class: 'fz-scorch', x: p.reel + .06, y: p.row + .06, width: .88, height: .88, rx: .14 }, defsG);
      st.scorch.push(r);
    });
    for (let i = 0; i < cells.length - 1; i++) {
      const a = ctr(cells[i]), b = ctr(cells[i + 1]);
      const g = el('g', { class: 'fz-seg' }, defsG);
      el('line', { class: 'fz-out', x1: a.x, y1: a.y, x2: b.x, y2: b.y }, g);
      el('line', { class: 'fz-cream', x1: a.x, y1: a.y, x2: b.x, y2: b.y }, g);
      const ch = el('line', { class: 'fz-char', x1: a.x, y1: a.y, x2: a.x, y2: a.y }, g);
      st.segs.push({ g, ch, a, b });
    }
    cells.forEach((p, i) => {
      const c = ctr(p);
      const g = el('g', { class: 'fz-node', transform: `translate(${c.x} ${c.y})` }, defsG);
      el('circle', { class: 'fz-dot-out', r: .105 }, g);
      el('circle', { class: 'fz-dot', r: .068 }, g);
      st.nodes.push(g);
    });
    // match at the start cell (reel 0)
    const s = ctr(cells[0]);
    const m = el('g', { class: 'fz-match', transform: `translate(${(s.x - .09).toFixed(3)} ${(s.y + .09).toFixed(3)}) rotate(28)` }, svg);
    el('rect', { class: 'fz-stick-out', x: -.045, y: 0, width: .09, height: .5, rx: .03 }, m);
    el('rect', { class: 'fz-stick', x: -.03, y: .02, width: .06, height: .46, rx: .02 }, m);
    el('ellipse', { class: 'fz-head-out', cx: 0, cy: 0, rx: .085, ry: .1 }, m);
    el('ellipse', { class: 'fz-head', cx: 0, cy: -.005, rx: .06, ry: .075 }, m);
    st.match = m;
    // spark star (head of the fuse)
    const sp = el('g', { class: 'fz-spark', transform: `translate(${s.x} ${s.y})` }, svg);
    const inner = el('g', { class: 'fz-spark-in' }, sp);
    el('polygon', { class: 'fz-star-out', points: starPoints(.27) }, inner);
    el('polygon', { class: 'fz-star', points: starPoints(.22) }, inner);
    el('circle', { class: 'fz-star-core', r: .07 }, inner);
    st.spark = { g: sp, x: s.x, y: s.y };
  }

  const moveSpark = (x, y) => { st.spark.x = x; st.spark.y = y; st.spark.g.setAttribute('transform', `translate(${x.toFixed(3)} ${y.toFixed(3)})`); };

  function igniteNode(i, soft) {
    const n = st.nodes[i], sc = st.scorch[i];
    if (n) n.classList.add('burnt');
    if (sc) { sc.classList.add('on'); }
    if (i > 0 && st.segs[i - 1]) { const s = st.segs[i - 1]; s.g.classList.add('burnt'); s.ch.setAttribute('x2', s.b.x); s.ch.setAttribute('y2', s.b.y); }
    if (!soft) {
      const p = st.cells[i]; if (!p) return;
      spawnSmoke(p.reel + .5, p.row + .5, 2);
      try { const c = ctx.cellCenter(p.reel, p.row); if (ctx.fx) { ctx.fx.sparks(c.x, c.y, '#ffd24a', c.size * .22, 4, 3); } } catch (e) { /* ignore */ }
    }
  }

  // animate the spark along the rope from node `from` to node `to` (inclusive of to), burning as it goes
  async function travel(from, to, gen) {
    const fast = turbo() || reduced;
    for (let i = from + 1; i <= to; i++) {
      if (gen !== st.gen || dead()) return;
      const seg = st.segs[i - 1]; if (!seg) break;
      if (fast) { moveSpark(seg.b.x, seg.b.y); igniteNode(i, true); continue; }
      const dur = 300, t0 = performance.now();
      await new Promise((res) => {
        const step = (now) => {
          if (gen !== st.gen || dead()) return res();
          const k = clamp((now - t0) / dur, 0, 1);
          const x = seg.a.x + (seg.b.x - seg.a.x) * k, y = seg.a.y + (seg.b.y - seg.a.y) * k;
          moveSpark(x, y); seg.ch.setAttribute('x2', x); seg.ch.setAttribute('y2', y);
          if (Math.random() < .35) spawnSmoke(x, y, 1);
          if (k < 1) requestAnimationFrame(step); else res();
        };
        requestAnimationFrame(step);
      });
      if (gen !== st.gen) return;
      igniteNode(i, false);
    }
  }

  function setBurned(n, instant) {
    const lim = Math.min(n, st.cells.length);
    for (let i = 0; i < lim; i++) igniteNode(i, true);
    st.burned = lim;
    if (lim > 0 && st.segs.length) { const k = Math.min(lim - 1, st.cells.length - 1), c = ctr(st.cells[k]); moveSpark(c.x, c.y); }
    void instant;
  }

  // ---------------- events ----------------
  async function drawPath(ev) {
    const cells = normCells(ev && ev.cells);
    if (cells.length < 2) return;
    const burned = clamp(Math.round(Number(ev.burned) || 0), 0, cells.length);
    build(cells, burned);
    layer.classList.add('on');
    const gen = st.gen;
    pose('think');
    snd('fuse');
    // draw the rope on, segment by segment (static when reduced/turbo)
    const fast = turbo() || reduced;
    const parts = [...svg.querySelectorAll('.fz-seg,.fz-node')];
    if (!fast) {
      parts.forEach((p, i) => { try { p.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 160, delay: i * 38, fill: 'backwards' }); } catch (e) { /* ignore */ } });
      try { st.match.animate([{ opacity: 0, transform: `translate(${(ctr(cells[0]).x - .09).toFixed(3)}px,${(ctr(cells[0]).y + .09).toFixed(3)}px) rotate(28deg) scale(.2)` }, { opacity: 1 }], { duration: 240, fill: 'backwards' }); } catch (e) { /* ignore */ }
      await sleep(Math.min(700, parts.length * 38 + 200));
    }
    if (gen !== st.gen) return;
    // first cell(s) are lit at reveal
    if (burned > 0) { setBurned(burned); const c = ctx.cellCenter ? ctx.cellCenter(cells[0].reel, cells[0].row) : null; if (c && ctx.fx && !reduced) ctx.fx.sparks(c.x, c.y, '#ffd24a', c.size * .25, 6, 4); }
    if (!fast) await sleep(380);
  }

  // The path is telegraphed in every book but a fuse that never catches is noise: draw it only at the first burn.
  async function path(ev) {
    st.pending = ev || null;
  }

  async function burn(ev) {
    if (!st.cells.length && st.pending) { const pe = st.pending; st.pending = null; await drawPath(pe); }
    if (!st.cells.length) return;
    const gen = st.gen;
    let to = Number(ev && ev.burned);
    if (!Number.isFinite(to)) to = st.burned + (Array.isArray(ev && ev.newCells) ? ev.newCells.length : 1);
    to = clamp(Math.round(to), 0, st.cells.length);
    if (to <= st.burned) return;
    const from = Math.max(0, st.burned - 1);
    pose('think');
    for (let i = st.burned; i < to; i++) snd('fuse');
    const lastBurned = st.burned;
    st.burned = to;
    if (lastBurned === 0) { igniteNode(0, true); }
    await travel(from, to - 1, gen);
    if (gen !== st.gen) return;
    setBurned(to);
    if (!(turbo() || reduced)) await sleep(220);
  }

  function centroid(cells) {
    const n = cells.length || 1;
    return { x: cells.reduce((a, p) => a + p.reel + .5, 0) / n, y: cells.reduce((a, p) => a + p.row + .5, 0) / n };
  }

  function boomArt(cx, cy) {
    // starburst + word balloon text (text via i18n)
    const b = document.createElement('div'); b.className = 'fz-boom';
    const sv = el('svg', { class: 'fz-burst', viewBox: '-1 -1 2 2' });
    let d1 = '', d2 = '';
    const n = 15;
    for (let i = 0; i < n * 2; i++) { const a = (i / (n * 2)) * Math.PI * 2, j = 1 + ((i * 37) % 5) * .018; const rr = (i % 2 ? .62 : 1) * j; d1 += `${(Math.cos(a) * rr).toFixed(3)},${(Math.sin(a) * rr).toFixed(3)} `; d2 += `${(Math.cos(a + .09) * rr * .72).toFixed(3)},${(Math.sin(a + .09) * rr * .72).toFixed(3)} `; }
    el('polygon', { class: 'fz-burst-out', points: d1.trim() }, sv);
    el('polygon', { class: 'fz-burst-mid', points: d1.trim() }, sv);
    el('polygon', { class: 'fz-burst-in', points: d2.trim() }, sv);
    b.appendChild(sv);
    const tx = document.createElement('span'); tx.className = 'fz-boom-text';
    let label = 'BOOM!'; try { label = ctx.t ? ctx.t('fx.boom') : label; } catch (e) { /* ignore */ }
    tx.textContent = label; b.appendChild(tx);
    b.style.left = (cx / COLS * 100).toFixed(2) + '%'; b.style.top = (cy / ROWS * 100).toFixed(2) + '%';
    layer.appendChild(b);
    return b;
  }

  async function blast(ev) {
    if (!st.cells.length && st.pending) { const pe = st.pending; st.pending = null; await drawPath(pe); }
    const cells = normCells(ev && ev.cells);
    const gen = st.gen;
    const fast = turbo(), still = reduced;
    setUnit();
    layer.classList.add('on');
    // 1. Gus covers his ears, the spark reaches the end (sizzle)
    pose('shock');
    snd('fuse');
    if (st.spark) st.spark.g.classList.add('hot');
    if (!fast) await sleep(still ? 500 : 720);
    if (gen !== st.gen || dead()) return;
    // 2. BOOM
    const cn = cells.length ? centroid(cells) : (st.cells.length ? centroid(st.cells.slice(0, Math.max(1, st.burned))) : { x: 3, y: 2.5 });
    const bm = boomArt(clamp(cn.x, 1.6, 4.4), clamp(cn.y, 1.4, 3.6)); st.boom = bm;
    snd('explosion');
    try { if (ctx.flash && !still) ctx.flash(.7, 380, '#fff1c4'); } catch (e) { /* ignore */ }
    try { if (ctx.shake) ctx.shake(still ? .3 : 1.5, 560); } catch (e) { /* ignore */ }
    let boomAnim = null;
    if (!still) {
      try { boomAnim = bm.animate([{ transform: 'translate(-50%,-50%) scale(.15) rotate(-12deg)', opacity: 0 }, { transform: 'translate(-50%,-50%) scale(1.25) rotate(4deg)', opacity: 1, offset: .35 }, { transform: 'translate(-50%,-50%) scale(1) rotate(-2deg)', opacity: 1, offset: .6 }, { transform: 'translate(-50%,-50%) scale(1.06) rotate(0)', opacity: 1, offset: .85 }, { transform: 'translate(-50%,-50%) scale(1.15)', opacity: 0 }], { duration: T(1250), easing: 'ease-out', fill: 'forwards' }); } catch (e) { /* ignore */ }
    } else {
      try { boomAnim = bm.animate([{ opacity: 0 }, { opacity: 1, offset: .2 }, { opacity: 1, offset: .8 }, { opacity: 0 }], { duration: 1100, fill: 'forwards' }); } catch (e) { /* ignore */ }
    }
    // particles (capped inside fx)
    if (ctx.fx && !still) {
      cells.slice(0, 6).forEach((p) => { try { const c = ctx.cellCenter(p.reel, p.row); ctx.fx.sparks(c.x, c.y, '#ffd24a', c.size * .35, 8, 6); ctx.fx.ring(c.x, c.y, c.size * .75, '255,200,90', .4, 4); ctx.fx.glow(c.x, c.y, c.size * .8, '255,160,40', .35); } catch (e) { /* ignore */ } });
    }
    // 3. cells flash then pop into nuggets (squash and stretch), staggered along the fuse
    const order = [...cells].sort((a, b) => { const ia = st.cells.findIndex((p) => p.reel === a.reel && p.row === a.row), ib = st.cells.findIndex((p) => p.reel === b.reel && p.row === b.row); return ia - ib; });
    const gapMs = fast || still ? 0 : 55;
    const jobs = order.map((p, i) => (async () => {
      if (gapMs) await new Promise((r) => setTimeout(r, T(i * gapMs)));
      if (gen !== st.gen || dead()) return;
      let host = null;
      try { host = ctx.cellEl ? ctx.cellEl(p.reel, p.row) : null; } catch (e) { host = null; }
      if (host && !still && !fast) { try { await host.animate([{ filter: 'brightness(1)' }, { filter: 'brightness(4) saturate(.2)' }], { duration: T(110), fill: 'forwards' }).finished; } catch (e) { /* ignore */ } }
      try { if (ctx.swapCell) ctx.swapCell(p.reel, p.row, 'W'); } catch (e) { /* ignore */ }
      try { host = ctx.cellEl ? ctx.cellEl(p.reel, p.row) : host; } catch (e) { /* ignore */ }
      if (host) {
        host.classList.add('fz-nugget');
        if (still || fast) { setTimeout(() => host.classList.remove('fz-nugget'), 900); return; }
        try {
          await host.animate([
            { transform: 'scale(.4,.4)', filter: 'brightness(3)' },
            { transform: 'scale(1.45,.62)', filter: 'brightness(2)', offset: .3 },
            { transform: 'scale(.82,1.3)', filter: 'brightness(1.4)', offset: .55 },
            { transform: 'scale(1.1,.93)', filter: 'brightness(1.1)', offset: .78 },
            { transform: 'scale(1,1)', filter: 'brightness(1)' }], { duration: T(520), easing: 'ease-out' }).finished;
        } catch (e) { /* ignore */ }
        host.classList.remove('fz-nugget');
      }
    })());
    // rope: everything turns to ash and fades while the burst plays
    clear(true);
    st.boom = bm;
    await Promise.all([...jobs, boomAnim ? boomAnim.finished.catch(() => {}) : null]);
    await sleep(fast ? 120 : 200);
    if (bm.isConnected) bm.remove();
    st.boom = null;
    pose('think');
    layer.classList.remove('on');
  }

  async function fizzle(ev) {
    void ev;
    st.pending = null;
    if (!st.cells.length) return;
    const gen = st.gen;
    const k = Math.max(0, Math.min(st.burned, st.cells.length) - 1), p = st.cells[k] || st.cells[0], c = ctr(p);
    if (st.spark) { st.spark.g.classList.add('dying'); }
    // limp 'psst' puffs, rope fades, Gus shrugs
    spawnSmoke(c.x, c.y, 3, '#cdbfa8');
    try { const px = ctx.cellCenter(p.reel, p.row); if (ctx.fx && !reduced) ctx.fx.smoke(px.x, px.y, px.size * .4, 3); } catch (e) { /* ignore */ }
    if (st.spark && !reduced && !turbo()) { try { st.spark.g.animate([{ opacity: 1, transform: `translate(${c.x}px,${c.y}px) scale(1)` }, { opacity: 0, transform: `translate(${c.x}px,${c.y}px) scale(.1)` }], { duration: 420, fill: 'forwards' }); } catch (e) { /* ignore */ } }
    if (!turbo()) await sleep(reduced ? 500 : 650);
    if (gen !== st.gen) return;
    clear(true);
    if (!turbo()) await sleep(300);
    layer.classList.remove('on');
  }

  const api = {
    path, burn, blast, fizzle,
    clear: () => { clear(false); layer.querySelectorAll('.fz-boom').forEach((n) => n.remove()); },
    get active() { return st.cells.length > 0; },
    destroy() { clear(false); layer.remove(); },
    _state: st,
  };
  return api;
}

export default createFuse;
