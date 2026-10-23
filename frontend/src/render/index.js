// Renderer: createRenderer(rootEl) -> { showBoard, playBook, setMultipliers, setTurbo, setFormat, resize, destroy }
// Board = 6 reels x 5 rows (events carry 7 rows per reel: padding row on top and bottom). All art is drawn in code.
import { ensureSprite, symbolMarkup, SYM_COLOR, SYMBOLS } from './symbols.js';
import { createScene } from './scene.js';
import { createFx } from './fx.js';
import { buildLogo } from './logo.js';
import { audio } from '../audio.js';
import { applyI18n, t } from '../i18n/index.js';

const COLS = 6, ROWS = 5;
const WINCAP = 5000;
const DECOR = [
  ['L2', 'H3', 'L4', 'L1', 'H4'], ['L3', 'L4', 'H1', 'W', 'L2'], ['H2', 'L1', 'L3', 'S', 'L4'],
  ['L4', 'H2', 'L2', 'H3', 'L1'], ['H4', 'L3', 'L1', 'L2', 'H1'], ['L1', 'L2', 'H3', 'L4', 'L3'],
];

export function prepareStatic(app) {
  if (!app) return;
  ensureSprite();
  buildLogo(app.querySelector('#logo'));
  createScene(app);
  try { applyI18n(document); } catch (e) { /* ignore */ }
  document.body.classList.add('rendered');
}

const REDUCE = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
// jagged glowing crack for a vein slot (deterministic per slot)
function crackSvg(c, r) {
  let a = (c * 7919 + r * 104729 + 17) >>> 0;
  const rn = () => { a = (Math.imul(a, 1664525) + 1013904223) >>> 0; return a / 4294967296; };
  const line = (x, y, ang, n, step) => { let d = `M${x.toFixed(1)} ${y.toFixed(1)}`; for (let i = 0; i < n; i++) { ang += (rn() - .5) * 1.1; x += Math.cos(ang) * step * (.6 + rn() * .8); y += Math.sin(ang) * step * (.6 + rn() * .8); d += `L${x.toFixed(1)} ${y.toFixed(1)}`; } return d; };
  let d = line(8 + rn() * 20, 4 + rn() * 10, .5 + rn() * .6, 7, 13);
  d += line(70 + rn() * 22, 92 - rn() * 8, Math.PI + .3 + rn() * .5, 6, 12);
  d += line(50 + rn() * 14, 50 + rn() * 14, rn() * 6.28, 3, 10);
  return `<svg class="crack" viewBox="0 0 100 100" aria-hidden="true"><path class="cg" d="${d}"/><path class="cc" d="${d}"/></svg>`;
}

const nameOf = (s) => (s == null ? 'L1' : typeof s === 'string' ? s : s.name || 'L1');
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const raf = () => new Promise((r) => requestAnimationFrame(() => r()));

export function createRenderer(rootEl) {
  const root = rootEl || document.getElementById('game') || document.body;
  const app = root.closest('#app') || document.getElementById('app') || document.body;
  prepareStatic(app.id === 'app' ? app : document.getElementById('app') || app);
  const scene = createScene(app);
  const fx = createFx(app);

  const S = {
    turbo: false, destroyed: false, combo: 0, pad: 1, fsTotal: 0, fsCur: 0, inFs: false, hooks: {},
    fmt: (x) => `${(Math.round(x * 100) / 100).toFixed(2)}x`,
    grid: Array.from({ length: COLS }, () => Array(ROWS).fill(null)),
    pads: Array(COLS).fill('L1'),
    mults: Array.from({ length: COLS }, () => Array(ROWS).fill(0)),
    skip: false,
  };
  const T = (ms) => ms * (S.turbo ? 0.42 : 1);
  const sleep = (ms) => new Promise((r) => setTimeout(r, T(ms)));
  const hook = (n, ...a) => { try { const f = S.hooks && S.hooks[n]; if (f) f(...a); } catch (e) { console.error('hook', n, e); } };
  // ---------- mascot (optional: the game works unchanged when the module is missing) ----------
  const M = { intro: false, m: null, base: 'idle', timer: 0, sayAt: 0, losses: 0, wonRound: false, pending: [] };
  const mPose = (name) => { if (REDUCE && name === 'dance') name = 'happy'; try { if (M.m) M.m.setPose(name); } catch (e) { /* ignore */ } };
  const mBase = () => { clearTimeout(M.timer); M.timer = 0; mPose(S.inFs ? 'dance' : M.base); };
  // pose(name, holdMs): show a pose, then return to the resting pose of the moment (think / dance)
  function pose(name, hold = 0) {
    if (S.destroyed) return;
    clearTimeout(M.timer); M.timer = 0;
    mPose(name);
    if (hold) M.timer = setTimeout(() => { M.timer = 0; if (!S.destroyed) mPose(S.inFs ? 'dance' : M.base); }, hold);
  }
  function say(key, ms = 2200, force = false) {
    if (S.destroyed || !M.m || typeof M.m.say !== 'function') return;
    const now = Date.now();
    if (!force && now - M.sayAt < 3500) return;
    M.sayAt = now;
    try { M.m.say(t(key), ms); } catch (e) { /* ignore */ }
  }
  (async () => {
    try {
      const slot = document.getElementById('mascot-slot');
      if (!slot) return;
      const mod = await import('./mascot.js');
      if (S.destroyed || !mod || typeof mod.createMascot !== 'function') return;
      slot.innerHTML = '';
      const h = slot.getBoundingClientRect().height || 0;
      const size = Math.round(Math.min(260, Math.max(90, h || window.innerHeight * 0.3)));
      M.m = mod.createMascot(slot, { size, reduced: REDUCE });
      M.m.setPose('idle');
    } catch (e) { M.m = null; }
  })();

  const anim = (el, frames, opts) => {
    try { const a = el.animate(frames, { fill: 'backwards', ...opts, duration: T(opts.duration), delay: T(opts.delay || 0) }); return a.finished.catch(() => {}); } catch (e) { return Promise.resolve(); }
  };

  // ---------- DOM ----------
  root.innerHTML = '';
  const wrap = document.createElement('div'); wrap.className = 'board-wrap';
  wrap.innerHTML = `<div class="board">
      <div class="slots"></div><div class="reelglows"></div><div class="cells"></div>
      <svg class="outlines" viewBox="0 0 ${COLS} ${ROWS}" preserveAspectRatio="none" aria-hidden="true"></svg>
      <div class="mults"></div><div class="popups"></div>
    </div>
    <i class="lit l"></i><i class="lit r"></i><i class="rivet" style="left:2.2%;top:2.6%"></i><i class="rivet" style="right:2.2%;top:2.6%"></i><i class="rivet" style="left:2.2%;bottom:2.6%"></i><i class="rivet" style="right:2.2%;bottom:2.6%"></i>
    <div class="chip combo"></div><div class="chip fsc"></div><div class="chip tw"></div>`;
  root.appendChild(wrap);
  const board = wrap.querySelector('.board');
  const slotsEl = wrap.querySelector('.slots'), glowsEl = wrap.querySelector('.reelglows'), cellsEl = wrap.querySelector('.cells');
  const outl = wrap.querySelector('.outlines'), multsEl = wrap.querySelector('.mults'), popsEl = wrap.querySelector('.popups');
  const chipCombo = wrap.querySelector('.chip.combo'), chipFs = wrap.querySelector('.chip.fsc'), chipTw = wrap.querySelector('.chip.tw');
  const slotEls = [], multEls = [], glowEls = [];
  for (let c = 0; c < COLS; c++) {
    slotEls.push([]); multEls.push([]);
    const g = document.createElement('div'); g.className = 'reelglow'; g.style.setProperty('--c', c); glowsEl.appendChild(g); glowEls.push(g);
    for (let r = 0; r < ROWS; r++) {
      const s = document.createElement('div'); s.className = 'slot'; s.style.setProperty('--c', c); s.style.setProperty('--r', r); s.innerHTML = '<i></i>' + crackSvg(c, r);
      slotsEl.appendChild(s); slotEls[c].push(s);
      const m = document.createElement('div'); m.className = 'mult'; m.style.setProperty('--c', c); m.style.setProperty('--r', r);
      multsEl.appendChild(m); multEls[c].push(m);
    }
  }
  let bannerLayer = app.querySelector('.banner-layer');
  if (!bannerLayer) { bannerLayer = document.createElement('div'); bannerLayer.className = 'banner-layer'; app.appendChild(bannerLayer); }
  let flashEl = app.querySelector('#flash');
  if (!flashEl) { flashEl = document.createElement('div'); flashEl.id = 'flash'; app.appendChild(flashEl); }

  // ---------- geometry ----------
  function cellCenter(c, r) {
    const a = app.getBoundingClientRect(), b = board.getBoundingClientRect();
    const cw = b.width / COLS, ch = b.height / ROWS;
    return { x: b.left - a.left + (c + 0.5) * cw, y: b.top - a.top + (r + 0.5) * ch, size: cw };
  }
  const vis = (row) => row - S.pad;

  // ---------- cells ----------
  function makeCell(c, r, name) {
    const el = document.createElement('div');
    el.className = 'cell s-' + name;
    el.style.setProperty('--c', c); el.style.setProperty('--r', r);
    el.innerHTML = symbolMarkup(name);
    cellsEl.appendChild(el);
    return { name, el, c, r };
  }
  function colNames(col) {
    const arr = (col || []).map(nameOf);
    if (arr.length >= ROWS + 2) return { pad: arr[0], vis: arr.slice(1, 1 + ROWS), padded: true };
    return { pad: SYMBOLS[(Math.random() * 8) | 0], vis: arr.slice(0, ROWS), padded: false };
  }
  function normaliseBoard(b) {
    if (!Array.isArray(b) || !b.length) return null;
    if (b.length === COLS) return b;
    if (b.length === ROWS && Array.isArray(b[0]) && b[0].length === COLS) return Array.from({ length: COLS }, (_, c) => b.map((row) => row[c]));
    return null;
  }
  function clearCells() {
    for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) { const x = S.grid[c][r]; if (x) x.el.remove(); S.grid[c][r] = null; }
    cellsEl.innerHTML = '';
  }
  function showBoard(b) {
    const nb = normaliseBoard(b) || DECOR;
    clearWins();
    clearCells();
    for (let c = 0; c < COLS; c++) {
      const col = colNames(nb[c]);
      S.pad = col.padded ? 1 : S.pad; S.pads[c] = col.pad;
      for (let r = 0; r < ROWS; r++) S.grid[c][r] = makeCell(c, r, col.vis[r] || 'L1');
    }
  }

  // ---------- multipliers (veins) ----------
  const veinHue = (m) => 45 - clamp(Math.log2(Math.max(1, m)) / 9, 0, 1) * 215;
  function paintSlot(c, r, m, animate) {
    const s = slotEls[c][r], mu = multEls[c][r];
    const g = clamp(Math.log2(Math.max(1, m)) / 9, 0, 1);
    s.classList.toggle('v', m > 0); s.style.setProperty('--vh', veinHue(m).toFixed(1));
    const i = s.firstChild;
    i.style.setProperty('--vh', veinHue(m).toFixed(1)); i.style.setProperty('--g', g.toFixed(3));
    if (m > 0) {
      mu.innerHTML = `<b style="--vh:${veinHue(m).toFixed(1)};--g:${g.toFixed(3)}">${m}x</b>`;
    } else mu.innerHTML = '';
    if (animate && m > 0) {
      s.classList.remove('pop'); mu.classList.remove('pop'); void s.offsetWidth; s.classList.add('pop'); mu.classList.add('pop');
      setTimeout(() => { s.classList.remove('pop'); mu.classList.remove('pop'); }, T(750));
    }
  }
  function setMultipliers(grid, animate = false) {
    let up = false;
    for (let c = 0; c < COLS; c++) {
      const col = (grid && grid[c]) || [];
      const off = col.length >= ROWS + 2 ? 1 : 0;
      for (let r = 0; r < ROWS; r++) {
        const m = Math.max(0, Number(col[r + off]) || 0);
        if (m !== S.mults[c][r]) {
          const grew = m > S.mults[c][r]; S.mults[c][r] = m; paintSlot(c, r, m, animate && grew); if (grew) up = true;
          if (animate && grew) { const p = cellCenter(c, r); fx.sparks(p.x, p.y, '#ffe27a', p.size * .3, 8, 5); fx.glow(p.x, p.y, p.size * .9, '255,160,60', .5); }
        }
      }
    }
    if (up && animate) audio.play('mult');
  }

  // ---------- fx helpers ----------
  function shake(amp = 1, ms = 420) {
    if (REDUCE) amp *= .25;
    const els = [root, scene.host];
    const n = 12; const px = Math.min(app.clientWidth, app.clientHeight) * 0.012 * amp;
    const frames = Array.from({ length: n + 1 }, (_, i) => {
      const k = 1 - i / n; const dx = (Math.random() - .5) * 2 * px * k, dy = (Math.random() - .5) * 2 * px * k;
      return { transform: i === n ? 'none' : `translate(${dx.toFixed(1)}px,${dy.toFixed(1)}px) rotate(${((Math.random() - .5) * amp * k * .6).toFixed(2)}deg)` };
    });
    els.forEach((e) => { try { e.animate(frames, { duration: T(ms), easing: 'linear' }); } catch (x) { /* ignore */ } });
  }
  function flash(peak = .8, ms = 500, color = '#fff') {
    flashEl.style.background = color;
    try { flashEl.animate([{ opacity: peak }, { opacity: 0 }], { duration: T(ms), easing: 'ease-out' }); } catch (e) { /* ignore */ }
  }
  function chip(el, text, on) {
    const changed = text != null && text !== '' && el.textContent !== text;
    if (text != null) el.textContent = text;
    el.classList.toggle('on', !!on);
    if (changed && on) { el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); }
  }
  const fsText = (cur, tot) => `${t('label.freeSpins')} ${cur}/${tot}`;
  function countUp(el, to, ms, delay) {
    const t0 = performance.now() + T(delay);
    const step = (now) => {
      if (S.destroyed || !el.isConnected) return;
      const k = clamp((now - t0) / T(ms), 0, 1);
      if (el.firstChild) el.firstChild.nodeValue = S.fmt(to * (1 - Math.pow(1 - k, 3)));
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
  function popup(r, c, html, delay = 0, val = null) {
    const p = document.createElement('div'); p.className = 'pop' + (val != null && val >= 5 ? ' big' : ''); p.style.setProperty('--c', c); p.style.setProperty('--r', r); p.innerHTML = html;
    popsEl.appendChild(p);
    if (val != null && !REDUCE) { p.firstChild.nodeValue = S.fmt(0); countUp(p, val, 480, delay + 80); }
    const a = anim(p, [
      { opacity: 0, transform: 'translate(-50%,-30%) scale(.4)' },
      { opacity: 1, transform: 'translate(-50%,-50%) scale(1.2)', offset: .18 },
      { opacity: 1, transform: 'translate(-50%,-62%) scale(1)', offset: .75 },
      { opacity: 0, transform: 'translate(-50%,-110%) scale(.95)' }], { duration: 1500, delay, easing: 'ease-out', fill: 'both' });
    a.then(() => p.remove());
  }
  function clearWins() {
    outl.innerHTML = '';
    cellsEl.querySelectorAll('.win,.dim,.fuse').forEach((e) => e.classList.remove('win', 'dim', 'fuse'));
  }
  function outlinePath(cells) {
    const set = new Set(cells.map(([c, r]) => c + ',' + r)); let d = '';
    for (const [c, r] of cells) {
      if (!set.has(c + ',' + (r - 1))) d += `M${c} ${r}H${c + 1}`;
      if (!set.has(c + ',' + (r + 1))) d += `M${c} ${r + 1}H${c + 1}`;
      if (!set.has((c - 1) + ',' + r)) d += `M${c} ${r}V${r + 1}`;
      if (!set.has((c + 1) + ',' + r)) d += `M${c + 1} ${r}V${r + 1}`;
    }
    return d;
  }
  const inB = (c, r) => c >= 0 && c < COLS && r >= 0 && r < ROWS;

  // ---------- reveal ----------
  async function dropOut() {
    const items = [];
    for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) if (S.grid[c][r]) items.push(S.grid[c][r]);
    if (!items.length) return;
    clearWins();
    audio.play('whoosh');
    await Promise.all(items.map((cell) => anim(cell.el, [{ transform: 'translateY(0)' }, { transform: `translateY(${(ROWS - cell.r + 1.5) * 100}%)` }],
      { duration: 360, delay: cell.c * 35 + (ROWS - cell.r) * 8, easing: 'cubic-bezier(.5,0,.9,.6)', fill: 'forwards' })));
    clearCells();
  }
  async function reveal(ev) {
    const nb = normaliseBoard(ev.board);
    if (!nb) return;
    S.combo = 0; S.lastWin = 0; chip(chipCombo, '', false); chip(chipTw, '', false);
    if (ev.gameType !== 'freegame' && !S.inFs) setMultipliers(null);
    await dropOut();
    audio.play('spin');
    const antic = Array.isArray(ev.anticipation) ? ev.anticipation : [];
    let at = 0; const lands = [];
    const anticCols = [];
    for (let c = 0; c < COLS; c++) {
      const col = colNames(nb[c]); if (col.padded) S.pad = 1; S.pads[c] = col.pad;
      if (antic[c]) { at += 520; anticCols.push([c, at]); }
      at += c === 0 ? 0 : 120;
      for (let r = 0; r < ROWS; r++) {
        const cell = makeCell(c, r, col.vis[r] || 'L1'); S.grid[c][r] = cell;
        const dist = (r + 1.3) * 100;
        const delay = at + (ROWS - 1 - r) * 38;
        anim(cell.el, [
          { transform: `translateY(${-dist}%)`, easing: 'cubic-bezier(.45,0,.85,.5)' },
          { transform: 'translateY(0)', offset: .64, easing: 'cubic-bezier(.2,.7,.4,1)' },
          { transform: 'translateY(-9%)', offset: .79, easing: 'ease-in' },
          { transform: 'translateY(0)', offset: .9, easing: 'ease-out' },
          { transform: 'translateY(-2.5%)', offset: .95, easing: 'ease-in' },
          { transform: 'translateY(0)' }], { duration: 620, delay });
      }
      lands.push(at + 620 * .64);
    }
    if (anticCols.length) {
      audio.play('antic'); wrap.classList.add('antic'); pose('shock'); say('mascot.shock', 2400, true);
      const t0 = Math.max(0, anticCols[0][1] - 560), t1 = at + 620;
      for (let k = 0; t0 + k * 860 < t1; k++) setTimeout(() => { if (!S.destroyed) audio.play('heart', { i: k }); }, T(t0 + k * 860));
      anticCols.forEach(([c, tm]) => {
        setTimeout(() => {
          glowEls[c].classList.add('on');
          S.grid.forEach((col, ci) => col.forEach((cell) => { if (cell) cell.el.classList.toggle('adim', ci !== c && cell.name !== 'S'); }));
        }, T(Math.max(0, tm - 560)));
        setTimeout(() => glowEls[c].classList.remove('on'), T(tm + 650));
      });
    }
    lands.forEach((tm, c) => setTimeout(() => { if (!S.destroyed) { audio.play('land', { vol: c === 0 ? 1 : .7 }); } }, T(tm)));
    await sleep(at + 620 + 60);
    wrap.classList.remove('antic'); glowEls.forEach((g) => g.classList.remove('on'));
    if (anticCols.length && !M.intro) pose(S.inFs ? 'dance' : 'think');
    cellsEl.querySelectorAll('.adim').forEach((e) => e.classList.remove('adim'));
    // scatter tease
    const sc = [];
    for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) if (S.grid[c][r] && S.grid[c][r].name === 'S') sc.push(S.grid[c][r]);
    if (sc.length >= 3) {
      audio.play('scatter', { n: sc.length - 2 }); pose('shock', 1400); say('mascot.shock');
      sc.forEach((cell) => { cell.el.classList.add('win'); const p = cellCenter(cell.c, cell.r); fx.sparks(p.x, p.y, '#ff8a3a', p.size * .35, 10, 5); fx.glow(p.x, p.y, p.size * 1.1, '255,100,40', .7); });
      shake(.6, 400);
      await sleep(sc.length >= 4 ? 700 : 900);
      sc.forEach((cell) => cell.el.classList.remove('win'));
    }
  }

  // ---------- wins ----------
  async function showWins(ev) {
    const wins = ev.wins || [];
    if (!wins.length) return;
    S.combo += 1;
    chip(chipCombo, `${t('label.combo')} x${S.combo}`, S.combo > 1);
    clearWins();
    const inWin = new Set();
    const halo = [];
    let total = 0;
    wins.forEach((w, wi) => {
      const cells = (w.positions || []).map((p) => [p.reel, vis(p.row)]).filter(([c, r]) => inB(c, r));
      cells.forEach(([c, r]) => inWin.add(c + ',' + r));
      const NS = 'http://www.w3.org/2000/svg';
      cells.forEach(([c, r]) => { const rc = document.createElementNS(NS, 'rect'); rc.setAttribute('class', 'wt'); rc.setAttribute('x', c); rc.setAttribute('y', r); rc.setAttribute('width', 1); rc.setAttribute('height', 1); outl.appendChild(rc); });
      const hl = document.createElementNS(NS, 'path'); hl.setAttribute('class', 'halo'); hl.setAttribute('d', outlinePath(cells)); outl.appendChild(hl);
      const path = document.createElementNS(NS, 'path');
      path.setAttribute('d', outlinePath(cells)); path.style.stroke = '#ffe27a';
      outl.appendChild(path);
      total += (w.win || 0) / 100;
      const ov = (w.meta && w.meta.overlay) ? [w.meta.overlay.reel, vis(w.meta.overlay.row)] : cells[Math.floor(cells.length / 2)];
      if (ov && inB(ov[0], ov[1])) {
        const cm = w.meta && Number(w.meta.clusterMult) > 1 ? `<small>${w.meta.clusterMult}x</small>` : '';
        popup(ov[1], ov[0], `${S.fmt((w.win || 0) / 100)}${cm}`, wi * 120, (w.win || 0) / 100);
      }
      cells.forEach(([c, r]) => {
        const cell = S.grid[c][r]; if (!cell) return; cell.el.classList.add('win');
        const p = cellCenter(c, r); fx.sparks(p.x, p.y, SYM_COLOR[cell.name] || '#ffe27a', p.size * .3, 4, 4);
      });
    });
    cellsEl.querySelectorAll('.cell:not(.win)').forEach((e) => e.classList.add('dim'));
    S.lastWin = total;
    if (total >= 2) shake(.15 + Math.min(total / 40, 1.1), 320);
    audio.play('win', { combo: S.combo });
    M.wonRound = true; pose('happy', 1300); if (S.combo === 1 && !S.inFs) say('mascot.win');
    const hold = clamp(780 + total * 9, 780, 1500);
    await sleep(hold);
  }

  // ---------- tumble ----------
  async function tumble(ev) {
    const exploding = new Set();
    (ev.explodingSymbols || []).forEach((p) => { const r = vis(p.row); if (inB(p.reel, r)) exploding.add(p.reel + ',' + r); });
    outl.innerHTML = '';
    const cells = [...exploding].map((k) => k.split(',').map(Number));
    cells.forEach(([c, r], i) => {
      const cell = S.grid[c][r]; if (!cell) return;
      const p = cellCenter(c, r); const col = SYM_COLOR[cell.name] || '#ffd54a';
      fx.shards(p.x, p.y, col, p.size * .35, 6 + Math.min(6, Math.round((S.lastWin || 0) / 8))); fx.sparks(p.x, p.y, '#fff6c0', p.size * .3, 5, 6); fx.ring(p.x, p.y, p.size * .6, '255,230,160', .35, 3);
      cell.el.classList.remove('win', 'dim');
      anim(cell.el, [{ transform: 'scale(1)', opacity: 1, filter: 'brightness(1)' }, { transform: 'scale(1.35)', opacity: 1, filter: 'brightness(2.4)', offset: .35 }, { transform: 'scale(.2) rotate(25deg)', opacity: 0, filter: 'brightness(2)' }],
        { duration: 330, delay: Math.min(i, 8) * 22, easing: 'ease-in', fill: 'forwards' });
      if (i < 9) setTimeout(() => audio.play('pop', { combo: S.combo + Math.floor(i / 3) }), T(i * 40));
    });
    shake(.3 + Math.min(S.combo, 6) * .07 + Math.min((S.lastWin || 0) / 50, 1), 280);
    await sleep(380);
    cells.forEach(([c, r]) => { const cell = S.grid[c][r]; if (cell) { cell.el.remove(); S.grid[c][r] = null; } });
    cellsEl.querySelectorAll('.dim').forEach((e) => e.classList.remove('dim'));
    const falls = [];
    const newSyms = ev.newSymbols || [];
    for (let c = 0; c < COLS; c++) {
      const surv = []; for (let r = 0; r < ROWS; r++) if (S.grid[c][r]) surv.push(S.grid[c][r]);
      const n = ROWS - surv.length;
      if (!n) continue;
      const ns = (newSyms[c] || []).map(nameOf);
      let padNew, fresh;
      if (ns.length >= n) { padNew = ns[0]; fresh = ns.slice(1, n); } else { padNew = SYMBOLS[(Math.random() * 8) | 0]; fresh = ns.slice(); }
      while (fresh.length < n - 1) fresh.unshift(SYMBOLS[(Math.random() * 8) | 0]);
      const incoming = [...fresh, S.pads[c]];
      S.pads[c] = padNew;
      const col = Array(ROWS).fill(null);
      incoming.slice(0, n).forEach((nm, i) => {
        const cell = makeCell(c, i, nm); col[i] = cell;
        const dist = (i + 1.4 + (n - i) * 0.0) * 100;
        falls.push(drop(cell.el, dist, c, 80 + (n - i) * 0, i));
      });
      surv.forEach((cell, j) => {
        const to = n + j; const from = cell.r;
        col[to] = cell; cell.r = to; cell.el.style.setProperty('--r', to);
        if (to !== from) falls.push(drop(cell.el, (to - from) * 100, c, 0, j));
      });
      for (let r = 0; r < ROWS; r++) { S.grid[c][r] = col[r]; if (col[r]) { col[r].c = c; col[r].r = r; } }
    }
    await Promise.all(falls);
    audio.play('land', { vol: .5 });
    await sleep(120);
  }
  function drop(el, distPct, c, extraDelay, k) {
    const rows = distPct / 100;
    const dur = 360 + rows * 70;
    return anim(el, [
      { transform: `translateY(${-distPct}%)`, easing: 'cubic-bezier(.4,0,.9,.55)' },
      { transform: 'translateY(0)', offset: .72, easing: 'cubic-bezier(.2,.7,.4,1)' },
      { transform: 'translateY(-5%)', offset: .86, easing: 'ease-in' },
      { transform: 'translateY(0)' }], { duration: dur, delay: c * 24 + extraDelay + k * 12 });
  }

  // ---------- banners ----------
  function tierFor(x) {
    if (x >= WINCAP) return 'win.max';
    if (x >= 100) return 'win.epic';
    if (x >= 50) return 'win.super';
    if (x >= 30) return 'win.mega';
    if (x >= 15) return 'win.big';
    return null;
  }
  function banner(o) {
    return new Promise((resolve) => {
      const el = document.createElement('div'); el.className = 'banner ' + (o.kind || '');
      const title = document.createElement('div'); title.className = 'bn-title';
      const amt = document.createElement('div'); amt.className = 'bn-amount'; amt.style.display = o.amount != null ? '' : 'none';
      const sub = document.createElement('div'); sub.className = 'bn-sub'; sub.style.display = o.sub ? '' : 'none'; sub.textContent = o.sub || '';
      el.append(title, amt, sub);
      const dim = document.createElement('div'); dim.className = 'banner-dim';
      const rays = document.createElement('div'); rays.className = 'rays';
      if (o.hi) rays.classList.add('hi');
      bannerLayer.append(dim, rays, el); bannerLayer.classList.add('on');
      const done = { v: false };
      let skip = false;
      const onSkip = () => { skip = true; };
      bannerLayer.addEventListener('pointerdown', onSkip);
      const setTitle = (txt) => { if (title.textContent !== txt) { title.textContent = txt; if (o.amount != null) anim(title, [{ transform: 'scale(1.25)' }, { transform: 'scale(1)' }], { duration: 260, easing: 'cubic-bezier(.2,1.6,.4,1)' }); } };
      setTitle(o.title || '');
      anim(dim, [{ opacity: 0 }, { opacity: o.dimAmt != null ? o.dimAmt : 1 }], { duration: 300, fill: 'forwards' });
      if (o.rays !== false) anim(rays, [{ opacity: 0 }, { opacity: 1 }], { duration: 500, fill: 'forwards' });
      anim(el, [{ transform: 'scale(.2) rotate(-4deg)', opacity: 0 }, { transform: 'scale(1.12) rotate(1deg)', opacity: 1, offset: .6 }, { transform: 'scale(1)', opacity: 1 }], { duration: 520, easing: 'cubic-bezier(.2,.9,.3,1)', fill: 'forwards' });
      const run = async () => {
        await sleep(450);
        if (o.amount != null) {
          const target = Number(o.amount) || 0;
          const dur = T(clamp(1300 + Math.log10(target + 1) * 1000, 1300, 5200));
          const t0 = performance.now(); let lastTick = 0, lastCoin = 0, lastLabel = null, tierIdx = 0;
          const TIERS = ['win.big', 'win.mega', 'win.super', 'win.epic', 'win.max'];
          await new Promise((res) => {
            const step = (now) => {
              if (S.destroyed) { res(); return; }
              const p = skip ? 1 : clamp((now - t0) / dur, 0, 1);
              const v = target * (1 - Math.pow(1 - p, 2.2));
              amt.textContent = S.fmt(v);
              if (o.tiers) {
                const k = tierFor(v) || o.tiers0;
                if (k && k !== lastLabel) {
                  lastLabel = k; setTitle(t(k)); el.dataset.tier = k;
                  tierIdx = Math.max(0, TIERS.indexOf(k));
                  if (k !== o.tiers0) {
                    audio.play('stinger', { level: tierIdx + 1 }); audio.play('coin');
                    flash(.3 + tierIdx * .08, 420, '#fff0b0'); shake(.5 + tierIdx * .35, 380);
                    const r = app.getBoundingClientRect(); fx.ring(r.width / 2, r.height / 2, Math.min(r.width, r.height) * (.5 + tierIdx * .12), '255,226,140', .7, 10);
                    if (tierIdx >= 2) rays.classList.add('hi');
                    if (tierIdx >= 3 && !REDUCE) bannerLayer.classList.add('shk');
                  }
                }
              }
              if (now - lastTick > 60 && p < 1) { lastTick = now; audio.play('count', { p }); }
              if (o.coins && now - lastCoin > 150 && p < 1) {
                lastCoin = now;
                // coin fountain from both lower corners, stronger with the tier
                const r = app.getBoundingClientRect(), u = Math.min(r.width, r.height), n = 2 + tierIdx;
                fx.coins(r.width * .12, r.height * 1.02, u, n, .28, -Math.PI / 2 + .42, 1.25 + tierIdx * .1);
                fx.coins(r.width * .88, r.height * 1.02, u, n, .28, -Math.PI / 2 - .42, 1.25 + tierIdx * .1);
              }
              if (p >= 1) res(); else requestAnimationFrame(step);
            };
            requestAnimationFrame(step);
          });
          amt.textContent = S.fmt(target);
          anim(amt, [{ transform: 'scale(1.18)' }, { transform: 'scale(1)' }], { duration: 300, easing: 'cubic-bezier(.2,1.6,.4,1)' });
          if (o.coins) { const r = app.getBoundingClientRect(); fx.coins(r.width / 2, r.height * .62, Math.min(r.width, r.height), 36, 1.2); if (target >= 30) fx.coinRain(target >= 100 ? 60 : 36, Math.min(r.width, r.height)); audio.play('shower', { n: target >= 50 ? 32 : 16 }); }
        }
        const t1 = performance.now(); const hold = T(o.hold != null ? o.hold : 1400);
        await new Promise((res) => { const w = (now) => { if (S.destroyed || skip && now - t1 > T(220) || now - t1 > hold) res(); else requestAnimationFrame(w); }; requestAnimationFrame(w); });
        await Promise.all([anim(el, [{ opacity: 1, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(1.1)' }], { duration: 320, fill: 'forwards' }), anim(dim, [{ opacity: 1 }, { opacity: 0 }], { duration: 320, fill: 'forwards' }), anim(rays, [{ opacity: 1 }, { opacity: 0 }], { duration: 320, fill: 'forwards' })]);
        bannerLayer.removeEventListener('pointerdown', onSkip); bannerLayer.classList.remove('shk');
        el.remove(); dim.remove(); rays.remove();
        if (!bannerLayer.children.length) bannerLayer.classList.remove('on');
        done.v = true; resolve();
      };
      run();
    });
  }
  async function winBanner(x, opts = {}) {
    const tier = tierFor(x);
    audio.play('bigwin', { level: x >= 100 ? 3 : x >= 50 ? 2 : 1 });
    M.wonRound = true; pose('bigwin'); say('mascot.big', 2600, true);
    await banner({ title: t(opts.title || tier || 'win.big'), amount: x, kind: 'win', coins: true, hi: x >= 50, tiers: !opts.title, tiers0: 'win.big', hold: 1300, sub: opts.sub });
  }

  // ---------- free spins ----------
  function scatterCells(ev) {
    const res = [];
    (ev.positions || []).forEach((p) => { const r = vis(p.row); if (inB(p.reel, r) && S.grid[p.reel][r]) res.push(S.grid[p.reel][r]); });
    if (!res.length) for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) if (S.grid[c][r] && S.grid[c][r].name === 'S') res.push(S.grid[c][r]);
    return res;
  }
  function setBonusMode(on) {
    S.inFs = on;
    document.body.classList.toggle('fs-mode', on); app.classList.toggle('fs-mode', on);
    audio.setBonus(on);
    try { if (typeof audio.setMood === 'function') audio.setMood(on ? 'freespins' : 'base'); } catch (e) { /* ignore */ }
    if (!on) mBase(); else if (!M.intro) pose('dance');
  }
  async function fsTrigger(ev) {
    const total = Number(ev.totalFs) || 0;
    const sc = scatterCells(ev);
    clearWins();
    audio.play('scatter', { n: 4 }); audio.play('fuse'); audio.play('rumble');
    pose('shock'); say('mascot.shock', 2000, true);
    sc.forEach((cell) => { cell.el.classList.add('fuse'); const p = cellCenter(cell.c, cell.r); fx.glow(p.x, p.y, p.size * 1.3, '255,90,40', 1.0); fx.sparks(p.x, p.y, '#ffb347', p.size * .35, 14, 6); });
    cellsEl.querySelectorAll('.cell:not(.fuse)').forEach((e) => e.classList.add('dim'));
    shake(.8, 700);
    await sleep(1100);
    // detonate
    audio.play('explosion'); flash(.95, 900, '#fff3d0'); shake(2.6, 1100);
    M.intro = true; pose('plunger');
    setBonusMode(true); // palette swap hides under the flash
    { const r0 = app.getBoundingClientRect(); fx.ring(r0.width / 2, r0.height / 2, Math.max(r0.width, r0.height) * .7, '255,170,80', 1.0, 18); fx.smoke(r0.width / 2, r0.height / 2, Math.min(r0.width, r0.height) * .6, 10, '40,20,14'); }
    const rect = app.getBoundingClientRect();
    sc.forEach((cell) => {
      const p = cellCenter(cell.c, cell.r);
      fx.ring(p.x, p.y, p.size * 3.5, '255,200,120', .8, 10); fx.ring(p.x, p.y, p.size * 2.2, '255,120,50', .6, 6);
      fx.smoke(p.x, p.y, p.size * 1.4, 7); fx.sparks(p.x, p.y, '#ffcf70', p.size * .5, 26, 9); fx.sparks(p.x, p.y, '#ff6a2a', p.size * .5, 20, 8);
      fx.shards(p.x, p.y, '#d33a22', p.size * .5, 8);
    });
    // all cells get blown away from the centre of the blast
    const cx = sc.length ? sc.reduce((a, c) => a + c.c, 0) / sc.length : COLS / 2, cy = sc.length ? sc.reduce((a, c) => a + c.r, 0) / sc.length : ROWS / 2;
    const all = []; for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) if (S.grid[c][r]) all.push(S.grid[c][r]);
    all.forEach((cell) => {
      cell.el.classList.remove('dim', 'fuse');
      const dx = cell.c - cx, dy = cell.r - cy, d = Math.hypot(dx, dy) || 1;
      anim(cell.el, [{ transform: 'translate(0,0) rotate(0) scale(1)', opacity: 1 }, { transform: `translate(${(dx / d) * 260}%,${(dy / d) * 260 + 40}%) rotate(${dx * 70 + 30}deg) scale(.5)`, opacity: 0 }],
        { duration: 750, delay: d * 40, easing: 'cubic-bezier(.2,.7,.5,1)', fill: 'forwards' });
    });
    fx.embers(0, rect.height * .5, rect.width, rect.height * .5, 60, Math.min(rect.width, rect.height) * .25);
    await sleep(1100);
    clearCells(); setMultipliers(null);
    S.fsTotal = total; S.fsCur = 0;
    hook('onFreeSpinCounter', 0, total);
    chip(chipFs, fsText(0, total), true);
    audio.play('fsStart'); say('mascot.fs', 2400, true);
    await banner({ title: t('fs.trigger'), sub: t('fs.start', { n: total }), kind: 'fs', hold: 2300, dimAmt: .92 });
    M.intro = false; pose('dance');
  }
  async function fsRetrigger(ev) {
    const sc = scatterCells(ev);
    const tot = Number(ev.totalFs) || 0;
    const add = tot > S.fsTotal && S.fsTotal ? tot - S.fsTotal : tot;
    audio.play('scatter', { n: 3 });
    sc.forEach((cell) => { cell.el.classList.add('win'); const p = cellCenter(cell.c, cell.r); fx.sparks(p.x, p.y, '#ffe27a', p.size * .4, 12, 6); fx.glow(p.x, p.y, p.size * 1.2, '255,210,90', .8); });
    shake(.7, 500);
    await sleep(900);
    clearWins();
    if (tot > S.fsTotal) S.fsTotal = tot;
    audio.play('retrigger'); audio.play('stinger', { level: 2 }); pose('happy', 1400); flash(.5, 600, '#ffe0a0');
    { const r = app.getBoundingClientRect(); fx.coins(r.width / 2, r.height * .6, Math.min(r.width, r.height), 24, 1.1); }
    await banner({ title: t('fs.retrigger', { n: add }), kind: 'fs', hold: 1300, dimAmt: .6, rays: true, hi: true });
  }
  async function fsEnd(ev) {
    const x = (Number(ev.amount) || 0) / 100;
    clearWins();
    audio.play('fsEnd'); pose('celebrate'); say('mascot.big', 2400, true);
    await banner({ title: t('fs.end'), amount: x, kind: 'win', coins: x > 0, hold: 2200, sub: tierFor(x) ? t(tierFor(x)) : '', dimAmt: .94 });
    setBonusMode(false);
    chip(chipFs, '', false);
    hook('onFreeSpinCounter', 0, 0);
    setMultipliers(null);
  }

  // ---------- main loop ----------
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  async function handle(ev) {
    switch (ev.type) {
      case 'reveal': return reveal(ev);
      case 'winInfo': return showWins(ev);
      case 'setTumbleWin': case 'updateTumbleWin': {
        const x = (Number(ev.amount) || 0) / 100; hook('onWin', x); chip(chipTw, S.fmt(x), x > 0); return null;
      }
      case 'updateGrid': setMultipliers(ev.gridMultipliers, true); return sleep(ev.gridMultipliers ? 320 : 0);
      case 'tumbleBoard': return tumble(ev);
      case 'freeSpinTrigger': return fsTrigger(ev);
      case 'freeSpinRetrigger': return fsRetrigger(ev);
      case 'updateFreeSpin': {
        S.fsCur = Number(ev.amount) || 0; if (ev.total) S.fsTotal = Number(ev.total);
        hook('onFreeSpinCounter', S.fsCur, S.fsTotal); chip(chipFs, fsText(S.fsCur, S.fsTotal), true);
        if (!S.inFs) setBonusMode(true);
        return sleep(S.fsCur > 1 ? 120 : 300);
      }
      case 'freeSpinEnd': return fsEnd(ev);
      case 'setWin': {
        const x = (Number(ev.amount) || 0) / 100; hook('onWin', x);
        chip(chipCombo, '', false);
        const min = S.inFs ? 50 : 15;
        if (x >= min) { chip(chipTw, '', false); await winBanner(x); }
        return null;
      }
      case 'setTotalWin': hook('onTotal', (Number(ev.amount) || 0) / 100); return null;
      case 'wincap': {
        hook('onTotal', (Number(ev.amount) || WINCAP * 100) / 100);
        await winBanner(Math.max(WINCAP, (Number(ev.amount) || 0) / 100), { title: 'win.max' });
        return null;
      }
      case 'finalWin': hook('onTotal', (Number(ev.amount) || 0) / 100); chip(chipTw, '', false); chip(chipCombo, '', false); return null;
      default: return null;
    }
  }
  let queue = Promise.resolve();
  function playBook(events, hooks) {
    const run = async () => {
      S.hooks = hooks || {};
      M.wonRound = false; M.intro = false; M.base = 'think'; pose(S.inFs ? 'dance' : 'think');
      for (const ev of events || []) {
        if (S.destroyed) break;
        try { await handle(ev); } catch (e) { console.error('render event', ev && ev.type, e); }
      }
      M.intro = false; M.base = 'idle';
      if (S.inFs) pose('dance');
      else if (M.wonRound) { M.losses = 0; mBase(); }
      else if (++M.losses >= 3) { M.losses = 0; pose('shrug', 2200); say('mascot.lose', 2400, true); }
      else mBase();
      clearWins();
      chip(chipCombo, '', false); chip(chipTw, '', false);
    };
    const p = queue.then(run, run);
    queue = p.catch(() => {});
    return p;
  }

  // ---------- idle life: one random symbol gets a specular sweep every so often (cheaper than 30 permanent animations) ----------
  let sweepTimer = 0;
  if (!REDUCE) {
    sweepTimer = setInterval(() => {
      if (S.destroyed || document.hidden) return;
      const cells = cellsEl.querySelectorAll('.cell:not(.win):not(.dim):not(.fuse):not(.adim)');
      if (!cells.length) return;
      for (let k = 0; k < 2; k++) {
        const el = cells[(Math.random() * cells.length) | 0];
        el.classList.add('sweep'); setTimeout(() => el.classList.remove('sweep'), 1200);
      }
    }, 650);
  }

  // ---------- public ----------
  showBoard(DECOR);
  const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => fx.resize()) : null;
  if (ro) ro.observe(app);
  const api = {
    showBoard,
    playBook,
    setMultipliers: (g) => setMultipliers(g, false),
    setTurbo(b) { S.turbo = !!b; },
    setFormat(fn) { if (typeof fn === 'function') S.fmt = fn; },
    resize() { fx.resize(); },
    // mascot hook for the UI layer (UNLEASH confirm)
    mascot: { pose, say },
    destroy() { S.destroyed = true; try { if (M.m) M.m.destroy(); } catch (e) { /* ignore */ } clearTimeout(M.timer); clearInterval(sweepTimer); if (ro) ro.disconnect(); fx.clear(); },
    // exposed for dev/test harness
    _banner: banner, _winBanner: winBanner, _shake: shake, _state: S,
  };
  return api;
}

export default createRenderer;
