// Bomb-timer WIRE renderer (front-end only). Converted from fuse.js. Events: fusePath, fuseBurn, fuseBlast, fuseFizzle.
// A braided cable runs through 8 cell lugs and ends in a cartoon alarm-clock bomb. The blast flashes each burnt
// non-scatter cell, breaks it into paper pieces and REMOVES it (ctx.emptyCell). No wild is ever created.
// Everything is drawn in code. Every ctx helper is optional (feature-detected).
// v2 (WP5, SYNTHESIS 5 rows 9-10): draw-on 450 ms and spark travel 300 ms per hop, both stepped at 12 fps (limited animation);
// blast = tick ramp 600 ms, hit-stop 100 ms, one flash <= 0.6 for 200 ms (the flash governor clamps it to 0.5, cream);
// the wire never plays a win-like cue (every wire cue is sent { quiet: true }) and never strikes a happy pose: whether the blast
// "paid" is decided by the re-evaluation (the winInfo that follows), which the player stages through the celebration gate.
// Motion is read live from ctx.motion (render/motion.js): Calm / Still replace motion, they never shorten the wire.
import { hasKey } from '../i18n/index.js';
import { quality } from './quality.js';
const COLS = 6, ROWS = 5, NS = 'http://www.w3.org/2000/svg';
const MAX_SMOKE = 14;
export const WIRE_TIMING = Object.freeze({ fps: 12, drawMs: 450, hopMs: 300, rampMs: 600, hitStopMs: 100, flashPeak: 0.6, flashMs: 200 });
const FRAME = 1000 / WIRE_TIMING.fps;
/** Pure: stepped (12 fps) progress 0..1 of an animation of length dur after elapsed ms. */
export function stepped(elapsed, dur) { if (!(dur > 0)) return 1; const e = Math.max(0, elapsed); return e >= dur ? 1 : Math.min(1, Math.floor(e / FRAME) * FRAME / dur); }
const PAL = ['#F0472F', '#FBF1D9', '#FFD23F', '#9A7BD0', '#1FB5A3', '#F5799F'];
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
    if (document.querySelector('link[data-wire-css]')) return;
    const l = document.createElement('link');
    l.rel = 'stylesheet'; l.href = new URL('./wire.css', import.meta.url).href; l.setAttribute('data-wire-css', '1');
    document.head.appendChild(l);
  } catch (e) { /* styles optional */ }
}

// Visible rows 0..4. If any row reaches 5 the event uses padded rows (1..5): shift down.
export function normCells(cells) {
  const list = (Array.isArray(cells) ? cells : []).map((p) => ({ ...p, reel: Number(p.reel), row: Number(p.row) }))
    .filter((p) => Number.isFinite(p.reel) && Number.isFinite(p.row));
  const padded = list.some((p) => p.row >= ROWS);
  return list.map((p) => ({ ...p, row: padded ? p.row - 1 : p.row })).filter((p) => p.reel >= 0 && p.reel < COLS && p.row >= 0 && p.row < ROWS);
}

/**
 * ctx: { board (HTMLElement), cellCenter(c,r)->{x,y,size}, cellEl(c,r), emptyCell(c,r) (remove the cell, leave a hole),
 *        fx ({sparks,ring,glow,smoke,breakCell?}), audio, pose(name,holdMs), shake(amp,ms), flash(peak,ms,color),
 *        sleep(ms), turbo()->bool, reduced, motion, camera?, t(key), destroyed()->bool, symColor?(c,r)->css colour }
 */
export function createWire(ctx) {
  ensureCss();
  // live motion level ('full' | 'calm' | 'still'); a missing store falls back to the creation-time flag
  const level = () => { try { if (ctx.motion && ctx.motion.level) return ctx.motion.level; } catch (e) { /* ignore */ } return ctx.reduced ? 'calm' : 'full'; };
  const isReduced = () => level() !== 'full';
  const turbo = () => { try { return !!(ctx.turbo && ctx.turbo()); } catch (e) { return false; } };
  const dead = () => { try { return !!(ctx.destroyed && ctx.destroyed()); } catch (e) { return false; } };
  const sleep = (ms) => (ctx.sleep ? ctx.sleep(ms) : new Promise((r) => setTimeout(r, ms)));
  // every wire cue is neutral and sent quiet: the audio layer refuses anything win-like on this path, whatever the round level
  const snd = (n) => { try { if (ctx.audio && typeof ctx.audio.play === 'function') ctx.audio.play(n, { quiet: true }); } catch (e) { /* ignore */ } };
  const pose = (n, h) => { try { if (ctx.pose) ctx.pose(n, h); } catch (e) { /* ignore */ } };
  const T = (ms) => ms * (turbo() ? 0.42 : 1);
  // t() humanises unknown keys ('fx.bam' -> 'Bam'): use it only for keys that exist
  const tr = (key, dflt) => { try { if (!hasKey(key)) return dflt; const v = ctx.t ? ctx.t(key) : ''; return v && v !== key ? v : dflt; } catch (e) { return dflt; } };

  const layer = document.createElement('div');
  layer.className = 'wr-layer'; layer.setAttribute('aria-hidden', 'true');
  const svg = el('svg', { class: 'wr-svg', viewBox: `0 0 ${COLS} ${ROWS}`, preserveAspectRatio: 'none' });
  layer.appendChild(svg);
  ctx.board.appendChild(layer);

  const st = { cells: [], burned: 0, nodes: [], segs: [], scorch: [], spark: null, bomb: null, smoke: 0, gen: 0, pending: null, boom: null };
  const ctr = (p) => ({ x: p.reel + 0.5, y: p.row + 0.5 });

  function starPoints(r, n = 8, inner = 0.38) {
    let d = '';
    for (let i = 0; i < n * 2; i++) { const a = (i / (n * 2)) * Math.PI * 2 - Math.PI / 2, rr = i % 2 ? r * inner : r; d += `${(Math.cos(a) * rr).toFixed(3)},${(Math.sin(a) * rr).toFixed(3)} `; }
    return d.trim();
  }

  function clear(fade = false) {
    st.pending = null; st.gen++;
    const nodes = [...svg.childNodes];
    st.cells = []; st.burned = 0; st.nodes = []; st.segs = []; st.scorch = []; st.spark = null; st.bomb = null; st.smoke = 0;
    if (fade && nodes.length && !isReduced()) {
      const g = el('g'); nodes.forEach((n) => g.appendChild(n)); svg.appendChild(g);
      try { g.animate([{ opacity: 1 }, { opacity: 0 }], { duration: T(420), fill: 'forwards' }).finished.then(() => g.remove(), () => g.remove()); } catch (e) { g.remove(); }
    } else nodes.forEach((n) => n.remove());
    layer.querySelectorAll('.wr-star-pow,.wr-piece,.wr-dust,.wr-shield,.wr-cap').forEach((n) => { if (!fade || n.classList.contains('wr-cap')) n.remove(); });
    if (!fade) layer.classList.remove('on');
  }
  const setUnit = () => { try { layer.style.setProperty('--u', (ctx.board.clientWidth / COLS).toFixed(1) + 'px'); } catch (e) { /* ignore */ } };

  function spawnSmoke(x, y, n = 2, color) {
    for (let i = 0; i < n; i++) {
      if (st.smoke >= MAX_SMOKE || isReduced()) return;
      st.smoke++;
      const g = el('g', { transform: `translate(${(x + (Math.random() - .5) * .25).toFixed(3)} ${(y - .05).toFixed(3)})` }, svg);
      const c = el('circle', { class: 'wr-puff', r: (0.09 + Math.random() * .07).toFixed(3), fill: color || '#FBF1D9' }, g);
      const dx = (Math.random() - .5) * .5, dy = -(0.35 + Math.random() * .35);
      let a;
      try { a = c.animate([{ transform: 'translate(0,0) scale(.5)', opacity: .85 }, { transform: `translate(${dx}px,${dy}px) scale(2.1)`, opacity: 0 }], { duration: T(900 + Math.random() * 500), easing: 'steps(6,end)', fill: 'forwards' }); } catch (e) { a = null; }
      const done = () => { st.smoke = Math.max(0, st.smoke - 1); g.remove(); };
      if (a) a.finished.then(done, done); else done();
    }
  }

  // alarm-clock bomb at the end of the cable: two bells, red body, cream dial, LED readout "n/8"
  function buildBomb(cells) {
    const last = ctr(cells[cells.length - 1]), prev = ctr(cells[cells.length - 2]);
    let dx = last.x - prev.x, dy = last.y - prev.y; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
    // sit on the cell corner away from the cable so the end symbol stays readable
    const cx = clamp(last.x + dx * .36 + (dx === 0 ? .26 : 0), .34, COLS - .34), cy = clamp(last.y + dy * .36 - .2, .34, ROWS - .34);
    const g = el('g', { class: 'wr-bomb', transform: `translate(${cx.toFixed(3)} ${cy.toFixed(3)})` }, svg);
    el('line', { class: 'wr-out', x1: last.x - cx, y1: last.y - cy, x2: 0, y2: 0 }, g);
    el('line', { class: 'wr-hot-core', x1: last.x - cx, y1: last.y - cy, x2: 0, y2: 0, style: 'opacity:1;stroke:#9A7BD0' }, g);
    const inn = el('g', { class: 'wr-bomb-in' }, g);
    el('circle', { class: 'wr-bell', cx: -.17, cy: -.29, r: .1 }, inn);
    el('circle', { class: 'wr-bell', cx: .17, cy: -.29, r: .1 }, inn);
    el('circle', { class: 'wr-body', r: .31 }, inn);
    el('circle', { class: 'wr-face', r: .22 }, inn);
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; el('line', { class: 'wr-tick', x1: Math.sin(a) * .17, y1: -Math.cos(a) * .17, x2: Math.sin(a) * .2, y2: -Math.cos(a) * .2 }, inn); }
    const hand = el('line', { class: 'wr-hand', x1: 0, y1: 0, x2: 0, y2: -.16, style: 'transform:rotate(0deg)' }, inn);
    el('circle', { class: 'wr-hub', r: .025 }, inn);
    el('rect', { class: 'wr-lcd-bg', x: -.2, y: .27, width: .4, height: .17, rx: .04 }, g);
    const tg = el('g', { transform: 'translate(0 .355) scale(.01)' }, g);
    const lcd = el('text', { class: 'wr-lcd' }, tg);
    lcd.textContent = `0/${cells.length}`;
    st.bomb = { g, hand, lcd, x: cx, y: cy };
  }
  function setClock(n) {
    if (!st.bomb) return;
    const total = st.cells.length || 8;
    st.bomb.lcd.textContent = `${n}/${total}`;
    st.bomb.hand.style.transform = `rotate(${Math.round(n / total * 360)}deg)`;
  }

  function build(cells) {
    clear(); setUnit();
    st.cells = cells; st.burned = 0;
    const rope = el('g', { class: 'wr-rope' }, svg);
    cells.forEach((p) => st.scorch.push(el('rect', { class: 'wr-scorch', x: p.reel + .06, y: p.row + .06, width: .88, height: .88, rx: .14 }, rope)));
    for (let i = 0; i < cells.length - 1; i++) {
      const a = ctr(cells[i]), b = ctr(cells[i + 1]);
      const g = el('g', { class: 'wr-seg' }, rope);
      const ln = (cls, o = {}) => el('line', { class: cls, x1: a.x, y1: a.y, x2: b.x, y2: b.y, ...o }, g);
      ln('wr-out'); ln('wr-core'); ln('wr-braid');
      ln('wr-hot-core', { x2: a.x, y2: a.y }); ln('wr-hot-braid', { x2: a.x, y2: a.y });
      st.segs.push({ g, ch: [...g.querySelectorAll('.wr-hot-core,.wr-hot-braid')], a, b });
    }
    cells.forEach((p) => {
      const c = ctr(p);
      const g = el('g', { class: 'wr-node', transform: `translate(${c.x} ${c.y})` }, rope);
      el('circle', { class: 'wr-glow', r: .19 }, g);
      el('circle', { class: 'wr-lug-out', r: .125 }, g);
      el('circle', { class: 'wr-lug', r: .1 }, g);
      el('circle', { class: 'wr-led', r: .05 }, g);
      st.nodes.push(g);
    });
    buildBomb(cells);
    const s = ctr(cells[0]);
    const sp = el('g', { class: 'wr-spark', transform: `translate(${s.x} ${s.y})` }, svg);
    const inner = el('g', { class: 'wr-spark-in' }, sp);
    el('polygon', { class: 'wr-star-out', points: starPoints(.27) }, inner);
    el('polygon', { class: 'wr-star', points: starPoints(.22) }, inner);
    el('circle', { class: 'wr-star-core', r: .07 }, inner);
    st.spark = { g: sp, x: s.x, y: s.y };
  }
  const moveSpark = (x, y) => { if (!st.spark) return; st.spark.x = x; st.spark.y = y; st.spark.g.setAttribute('transform', `translate(${x.toFixed(3)} ${y.toFixed(3)})`); };

  function igniteNode(i, soft) {
    const n = st.nodes[i], sc = st.scorch[i];
    if (n) n.classList.add('burnt');
    if (sc) sc.classList.add('on');
    if (i > 0 && st.segs[i - 1]) { const s = st.segs[i - 1]; s.g.classList.add('burnt'); s.ch.forEach((l) => { l.setAttribute('x2', s.b.x); l.setAttribute('y2', s.b.y); }); }
    setClock(Math.max(st.shown || 0, i + 1));
    st.shown = Math.max(st.shown || 0, i + 1);
    if (!soft) {
      const p = st.cells[i]; if (!p) return;
      spawnSmoke(p.reel + .5, p.row + .5, 2);
      try { const c = ctx.cellCenter(p.reel, p.row); if (ctx.fx) ctx.fx.sparks(c.x, c.y, '#FFD23F', c.size * .22, 4, 3); } catch (e) { /* ignore */ }
    }
  }

  async function travel(from, to, gen) {
    const fast = turbo() || level() === 'still'; // Calm keeps the stepped travel (12 fps, no smoke); Still jumps
    for (let i = from + 1; i <= to; i++) {
      if (gen !== st.gen || dead()) return;
      const seg = st.segs[i - 1]; if (!seg) break;
      if (fast) { moveSpark(seg.b.x, seg.b.y); igniteNode(i, true); continue; }
      const dur = WIRE_TIMING.hopMs, t0 = performance.now();
      let lastK = -1;
      await new Promise((res) => {
        const step = (now) => {
          if (gen !== st.gen || dead()) return res();
          const k = stepped(now - t0, dur); // 12 fps steps: the DOM only changes on a new step
          if (k !== lastK) {
            lastK = k;
            const x = seg.a.x + (seg.b.x - seg.a.x) * k, y = seg.a.y + (seg.b.y - seg.a.y) * k;
            moveSpark(x, y); seg.ch.forEach((l) => { l.setAttribute('x2', x); l.setAttribute('y2', y); });
            if (Math.random() < .5) spawnSmoke(x, y, 1);
          }
          if (k < 1) requestAnimationFrame(step); else res();
        };
        requestAnimationFrame(step);
      });
      if (gen !== st.gen) return;
      igniteNode(i, false);
    }
  }

  function setBurned(n) {
    const lim = Math.min(n, st.cells.length);
    for (let i = 0; i < lim; i++) igniteNode(i, true);
    st.burned = lim;
    if (lim > 0 && st.segs.length) moveSpark(ctr(st.cells[Math.min(lim - 1, st.cells.length - 1)]).x, ctr(st.cells[Math.min(lim - 1, st.cells.length - 1)]).y);
    setClock(lim);
  }

  let capShown = 0;
  function caption(key, dflt, cls) {
    if (isReduced()) return;
    try {
      const e = document.createElement('div'); e.className = 'wr-cap' + (cls ? ' ' + cls : ''); e.textContent = tr(key, dflt);
      layer.appendChild(e); setTimeout(() => e.remove(), 2200);
    } catch (e) { /* ignore */ }
  }

  async function drawPath(ev) {
    const cells = normCells(ev && ev.cells);
    if (cells.length < 2) return;
    const burned = clamp(Math.round(Number(ev.burned) || 0), 0, cells.length);
    build(cells); st.shown = 0;
    layer.classList.add('on');
    if (capShown < 3) { capShown++; caption('fx.wire', 'WIRE!'); }
    const gen = st.gen;
    pose('think'); snd('fuse');
    const fast = turbo() || level() === 'still';
    const parts = [...svg.querySelectorAll('.wr-seg,.wr-node,.wr-bomb')];
    if (!fast) {
      // draw-on: the parts appear in path order over WIRE_TIMING.drawMs, on the 12 fps grid (one hard step each, no fade)
      const n = Math.max(1, parts.length - 1), last = WIRE_TIMING.drawMs - FRAME;
      parts.forEach((p, i) => { const d = Math.round(Math.floor((i / n) * last / FRAME) * FRAME); try { p.animate([{ opacity: 0 }, { opacity: 0 }], { duration: Math.max(1, d), fill: 'backwards', easing: 'steps(1,end)' }); } catch (e) { /* ignore */ } });
      await sleep(WIRE_TIMING.drawMs);
    }
    if (gen !== st.gen) return;
    if (burned > 0) { setBurned(burned); const c = ctx.cellCenter ? ctx.cellCenter(cells[0].reel, cells[0].row) : null; if (c && ctx.fx && !isReduced()) ctx.fx.sparks(c.x, c.y, '#FFD23F', c.size * .25, 6, 4); }
    if (!fast) await sleep(380);
  }

  // The path is telegraphed in every book but a wire that never catches is noise: it is drawn only at the first burn.
  async function path(ev) { st.pending = ev || null; }

  async function burn(ev) {
    quality.keepAlive(3000);
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
    const last = st.burned;
    st.burned = to;
    if (last === 0) igniteNode(0, true);
    await travel(from, to - 1, gen);
    if (gen !== st.gen) return;
    setBurned(to);
    if (!(turbo() || isReduced())) await sleep(220);
  }

  const key = (p) => p.reel + ':' + p.row;

  function burstStar(c, word, delay) {
    const b = document.createElement('div'); b.className = 'wr-star-pow';
    const sv = el('svg', { viewBox: '-1 -1 2 2' });
    let d1 = '', d2 = '';
    const n = 10;
    for (let i = 0; i < n * 2; i++) { const a = (i / (n * 2)) * Math.PI * 2, rr = i % 2 ? .6 : 1; d1 += `${(Math.cos(a) * rr).toFixed(3)},${(Math.sin(a) * rr).toFixed(3)} `; d2 += `${(Math.cos(a) * rr * .8).toFixed(3)},${(Math.sin(a) * rr * .8).toFixed(3)} `; }
    el('polygon', { class: 'wr-pow-out', points: d1.trim() }, sv);
    el('polygon', { class: 'wr-pow-in', points: d2.trim() }, sv);
    b.appendChild(sv);
    if (word) { const tx = document.createElement('span'); tx.className = 'wr-pow-text'; tx.textContent = word; b.appendChild(tx); }
    b.style.left = (c.reel + .5) / COLS * 100 + '%'; b.style.top = (c.row + .5) / ROWS * 100 + '%';
    layer.appendChild(b);
    if (!isReduced()) { try { b.animate([{ transform: 'translate(-50%,-50%) scale(.2)', opacity: 0 }, { transform: 'translate(-50%,-50%) scale(1.15)', opacity: 1, offset: .3 }, { transform: 'translate(-50%,-50%) scale(1)', opacity: 1, offset: .7 }, { transform: 'translate(-50%,-50%) scale(1.1)', opacity: 0 }], { duration: T(700), delay, fill: 'both', easing: 'steps(6,end)' }).finished.then(() => b.remove(), () => b.remove()); } catch (e) { setTimeout(() => b.remove(), 800); } }
    else { setTimeout(() => b.remove(), 700); }
  }

  // local paper breakup: 3 cut-paper triangles fly out of the cell, then a dust cloud marks the empty cell
  function localBreak(p, color) {
    if (isReduced()) return;
    const u = ctx.board.clientWidth / COLS, cx = (p.reel + .5) * u, cy = (p.row + .5) * (ctx.board.clientHeight / ROWS);
    const tris = ['polygon(50% 0,100% 100%,0 100%)', 'polygon(0 0,100% 20%,40% 100%)', 'polygon(10% 0,100% 50%,0 90%)'];
    for (let i = 0; i < 3; i++) {
      const d = document.createElement('div'); d.className = 'wr-piece';
      const w = u * (.34 + Math.random() * .12);
      d.style.cssText = `left:${cx - w / 2}px;top:${cy - w / 2}px;width:${w}px;height:${w}px;background:${i === 0 ? color : PAL[(1 + i * 2) % PAL.length]};clip-path:${tris[i]}`;
      layer.appendChild(d);
      const a = (i / 3) * Math.PI * 2 + Math.random(), dist = u * (.8 + Math.random() * .6);
      try { d.animate([{ transform: 'translate(0,0) rotate(0)', opacity: 1 }, { transform: `translate(${Math.cos(a) * dist}px,${Math.sin(a) * dist - u * .3}px) rotate(${(Math.random() - .5) * 540}deg)`, opacity: 0 }], { duration: T(650 + Math.random() * 200), easing: 'steps(8,end)', fill: 'forwards' }).finished.then(() => d.remove(), () => d.remove()); } catch (e) { d.remove(); }
    }
  }
  function dustCloud(p) {
    if (isReduced()) return;
    const u = ctx.board.clientWidth / COLS, cx = (p.reel + .5) * u, cy = (p.row + .5) * (ctx.board.clientHeight / ROWS);
    for (let i = 0; i < 3; i++) {
      const d = document.createElement('div'); d.className = 'wr-dust';
      const w = u * (.22 + Math.random() * .12);
      d.style.cssText = `left:${cx - w / 2 + (i - 1) * u * .22}px;top:${cy - w / 2}px;width:${w}px;height:${w}px`;
      layer.appendChild(d);
      try { d.animate([{ transform: 'scale(.4)', opacity: .9 }, { transform: `translate(0,${-u * .25}px) scale(1.7)`, opacity: 0 }], { duration: T(700), delay: i * 60, easing: 'steps(6,end)', fill: 'forwards' }).finished.then(() => d.remove(), () => d.remove()); } catch (e) { d.remove(); }
    }
  }
  function shield(p) {
    if (isReduced()) return;
    const u = ctx.board.clientWidth / COLS, w = u * .95, cx = (p.reel + .5) * u, cy = (p.row + .5) * (ctx.board.clientHeight / ROWS);
    const s = document.createElement('div'); s.className = 'wr-shield';
    s.style.cssText = `left:${cx - w / 2}px;top:${cy - w / 2}px;width:${w}px;height:${w}px`;
    layer.appendChild(s);
    try { s.animate([{ opacity: 0, transform: 'scale(.6)' }, { opacity: 1, transform: 'scale(1.05)', offset: .3 }, { opacity: 0, transform: 'scale(1.2)' }], { duration: T(600), easing: 'steps(6,end)', fill: 'forwards' }).finished.then(() => s.remove(), () => s.remove()); } catch (e) { s.remove(); }
  }

  function hideCell(p) {
    try {
      if (ctx.emptyCell) { ctx.emptyCell(p.reel, p.row); return; }
      const h = ctx.cellEl ? ctx.cellEl(p.reel, p.row) : null;
      if (h) h.style.visibility = 'hidden';
    } catch (e) { /* ignore */ }
  }

  async function blast(ev) {
    quality.keepAlive(4000);
    if (!st.cells.length && st.pending) { const pe = st.pending; st.pending = null; await drawPath(pe); }
    const cells = normCells(ev && ev.cells);
    const gen = st.gen;
    const fast = turbo(), still = isReduced();
    setUnit();
    layer.classList.add('on');
    // 1. DEFUSE tag, Mambo shocked then on the plunger; ticks speed up for 600 ms
    pose('shock');
    if (st.bomb) st.bomb.g.classList.add('hot');
    if (st.spark) st.spark.g.classList.add('hot');
    if (!still) caption('fx.defuse', 'DEFUSE!', 'defuse');
    const wait = fast ? 0 : WIRE_TIMING.rampMs; // Calm / Still keep the same beat length (motion is replaced, never shortened)
    if (wait) {
      pose('plunger');
      let gap = 150;
      for (let el0 = 0; el0 < wait; el0 += gap) { snd('fuse'); await sleep(gap); gap = Math.max(55, gap * .8); if (gen !== st.gen || dead()) return; }
    } else { pose('plunger'); snd('fuse'); }
    if (gen !== st.gen || dead()) return;
    // hit-stop: the board holds for 100 ms before the bang (camera.freeze pauses every running animation when allowed; otherwise a
    // plain hold of the same length, so Calm / Still keep the timing)
    if (!fast) {
      let held = false;
      try {
        const m = ctx.motion;
        if (ctx.camera && typeof ctx.camera.freeze === 'function' && (!m || m.hitStop !== false)) { await ctx.camera.freeze(WIRE_TIMING.hitStopMs); held = true; }
      } catch (e) { held = false; }
      if (!held) await sleep(WIRE_TIMING.hitStopMs);
      if (gen !== st.gen || dead()) return;
    }
    // 2. BLAST
    snd('explosion');
    try { if (ctx.flash) ctx.flash(WIRE_TIMING.flashPeak, WIRE_TIMING.flashMs, '#FBF1D9'); } catch (e) { /* ignore */ }
    try { if (ctx.shake) ctx.shake(still ? .3 : 1.5, 250); } catch (e) { /* ignore */ }
    // burnt path cells that are not removed (scatters) get a shield flash and stay
    const gone = new Set(cells.map(key));
    const pathCells = st.cells, burnedN = st.burned;
    pathCells.slice(0, Math.max(burnedN, 0)).forEach((p) => { if (!gone.has(key(p))) shield(p); });
    const words = [tr('fx.pow', 'POW!'), tr('fx.bam', 'BAM!'), tr('fx.boom', 'BOOM!')];
    const order = [...cells].sort((a, b) => pathCells.findIndex((p) => key(p) === key(a)) - pathCells.findIndex((p) => key(p) === key(b)));
    const gapMs = fast || still ? 0 : 55;
    clear(true); // rope fades while the burst plays (bumps the generation, so jobs use the new one)
    const gen2 = st.gen;
    const jobs = order.map((p, i) => (async () => {
      if (gapMs) await new Promise((r) => setTimeout(r, T(i * gapMs)));
      if (gen2 !== st.gen || dead()) return;
      let host = null;
      try { host = ctx.cellEl ? ctx.cellEl(p.reel, p.row) : null; } catch (e) { host = null; }
      void host; // v1 whitened the cell with a filter animation (a flash per cell, a compositor layer each): the cream break flash of fx.breakCell replaces it
      burstStar(p, i < 3 ? words[i % words.length] : '', 0);
      let col = PAL[0]; try { if (ctx.symColor) col = ctx.symColor(p.reel, p.row) || col; } catch (e) { /* ignore */ }
      let done = false;
      try {
        if (ctx.fx && typeof ctx.fx.breakCell === 'function') {
          const c = ctx.cellCenter(p.reel, p.row);
          ctx.fx.breakCell(c.x, c.y, c.size, col, { reel: p.reel, row: p.row }); done = true;
        }
      } catch (e) { done = false; }
      if (!done) localBreak(p, col);
      hideCell(p);
      dustCloud(p);
      try { const c = ctx.cellCenter(p.reel, p.row); if (ctx.fx && !still) ctx.fx.sparks(c.x, c.y, '#FFD23F', c.size * .3, 6, 5); } catch (e) { /* ignore */ }
    })());
    await Promise.all(jobs);
    await sleep(fast ? 120 : 420);
    pose('idle'); // neutral: the re-evaluation decides whether there is anything to be happy about
    layer.classList.remove('on');
  }

  async function fizzle(ev) {
    void ev;
    st.pending = null;
    if (!st.cells.length) return;
    const gen = st.gen;
    const k = Math.max(0, Math.min(st.burned, st.cells.length) - 1), p = st.cells[k] || st.cells[0], c = ctr(p);
    if (st.spark) st.spark.g.classList.add('dying');
    snd('wahwah'); // 'fizzle' was never a cue id (a silent no-op in v1); the neutral wah-wah is the gag
    spawnSmoke(c.x, c.y, 3, '#9A7BD0');
    try { const px = ctx.cellCenter(p.reel, p.row); if (ctx.fx && !isReduced()) ctx.fx.smoke(px.x, px.y, px.size * .4, 3); } catch (e) { /* ignore */ }
    pose('shrug');
    // lugs go dark one by one, back toward the start
    const fast = turbo();
    for (let i = Math.min(st.burned, st.nodes.length) - 1; i >= 0; i--) {
      if (gen !== st.gen) return;
      st.nodes[i].classList.remove('burnt'); if (st.scorch[i]) st.scorch[i].classList.remove('on');
      if (i > 0 && st.segs[i - 1]) st.segs[i - 1].g.classList.remove('burnt');
      setClock(i);
      if (st.spark && st.cells[i]) moveSpark(st.cells[i].reel + .5, st.cells[i].row + .5);
      if (!fast && !isReduced()) await sleep(70);
    }
    if (!fast) await sleep(isReduced() ? 400 : 320);
    if (gen !== st.gen) return;
    clear(true);
    if (!fast) await sleep(300);
    layer.classList.remove('on');
  }

  return {
    path, burn, blast, fizzle,
    clear: () => { clear(false); },
    get active() { return st.cells.length > 0; },
    destroy() { clear(false); layer.remove(); },
    _state: st,
  };
}

export const createFuse = createWire;
export default createWire;
