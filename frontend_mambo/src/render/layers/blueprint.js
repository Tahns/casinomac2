// Agent Mambo v2 layer BLUEPRINT (WP6). On `layout` (base spin, before the reveal) a cyanotype sheet lies on the board and the REAL
// outline of the floor plan is inked once, then a small name stamp. Never a cycle through other shapes, never a near-miss (RTS 7C):
// only the plan of this spin is ever drawn, and it is drawn before any outcome.
//   timing (draw + stamp together): a new plan <= 500 ms (turbo 200 ms); the same plan as the previous spin 250 ms (turbo 120 ms);
//   replay skip: ctx.T. The draw takes 3/4 of it, the stamp the last 1/4.
//   Still: the inked end state at once, held 250 ms (ctx.T)
//   the sheet lifts (stepped fade) when the reveal starts; the name stamp stays on the frame until the end of the book
//   the stamp (K6, round 2): on a void cell of the plan, else on the frame's lower lip; in portrait (the HUD row starts right under the
//   board) and whenever the lower lip would leave the viewport or touch #hud-info, on the frame's top lip left of the COMBO chip slot
//   (util.js topLip), re-placed when the frame changes size (5 <-> 6 row morph, resize)
import { outlineOf, outlineLength } from './logic.js';
import { blueprintDefs, stampSvg, P } from './art.js';
import { t } from '../../i18n/index.js';
import { h, anim, wait, isStill, play, skipping, Tm, boardRows, tx, heroine, SVGNS, isPortrait, shownRect, topLip, vpSize, hits, afterAnims } from './util.js';

export function createBlueprint() {
  let sheet = null, stamp = null, token = 0, lastPlan = null, ro = null, offResize = null;
  const L = { id: 'blueprint', last: null };

  function clear() {
    token++;
    if (sheet) { sheet.remove(); sheet = null; }
    dropStamp();
  }
  function dropStamp() {
    if (ro) { try { ro.disconnect(); } catch (e) { /* ignore */ } ro = null; }
    if (offResize) { offResize(); offResize = null; }
    if (stamp) { stamp.remove(); stamp = null; }
  }

  // the lower lip (layers.css) when it is inside the viewport and clear of #hud-info, else the top lip (px, in the wrap's box)
  function placeStamp(ctx) {
    const el = stamp;
    if (!el || el.classList.contains('on-void') || !ctx || !ctx.board) return;
    try {
      const wrap = ctx.wrap || ctx.board;
      const W = wrap.getBoundingClientRect(), B = ctx.board.getBoundingClientRect();
      const sx = W.width && wrap.offsetWidth ? W.width / wrap.offsetWidth : 1;
      const k = sx > 0 ? 1 / sx : 1;
      const cell = B.width / 6;
      const vp = vpSize();
      const hud = shownRect(document.getElementById('hud-info'));
      // the CSS lower-lip box (left .3 cell, top 100% - .09 cell, 1.3 x .4 cell) in client px, the -6 deg tilt of the svg included
      const lo = { left: W.left + cell * 0.3, right: W.left + cell * 1.6, top: W.bottom - cell * 0.09 - cell * 0.07, bottom: W.bottom - cell * 0.09 + cell * 0.47 };
      const lowOk = !isPortrait() && lo.bottom <= (vp.h || Infinity) - 2 && !hits(lo, hud);
      if (lowOk) { el.classList.remove('on-lip'); el.style.left = el.style.top = el.style.width = el.style.height = ''; delete el.dataset.lip; return; }
      const tilt = (x) => Math.ceil(x * 0.055) + 1; // the svg's -6 deg tilt pokes past the box
      const put = (kind, left, top, w, hh) => {
        el.classList.add('on-lip');
        el.dataset.lip = kind;
        Object.assign(el.style, { left: ((left - W.left) * k).toFixed(1) + 'px', top: ((top - W.top) * k).toFixed(1) + 'px', width: (w * k).toFixed(1) + 'px', height: (hh * k).toFixed(1) + 'px' });
      };
      // the top lip: as wide as 1.3 cell (and the stretch), shrunk to the lip's height
      const L = topLip(B, cell);
      const room = L.bottom - L.top;
      let w = Math.min(cell * 1.3, L.right - L.left - 2), hh = w / 3.25;
      if (hh + 2 * tilt(w) > room) { hh = (room - 2) / (1 + 2 * 0.055 * 3.25); w = hh * 3.25; }
      if (isPortrait()) { hh = Math.max(12, hh); w = Math.max(w, hh * 3.25); put('top', L.left + 1, L.bottom - tilt(w) - hh, w, hh); return; }
      // landscape: beside the board's lower-right corner, outside the frame, 4 px over the viewport's bottom edge (the Sealed Orders
      // envelope's 'side' spot; the stamp is gone before a feature starts), when it is free of the controls and bigger than the top lip
      const sl = B.right + cell * 0.15 + 3;
      const sw = Math.max(36, Math.min(cell * 1.3, (vp.w || sl + 60) - 4 - sl)), sh = sw / 3.25;
      const st = Math.min(B.bottom, (vp.h || B.bottom) - 4) - tilt(sw) - sh;
      const box = { left: sl, top: st - tilt(sw), right: sl + sw, bottom: st + sh + tilt(sw) };
      const busy = [...document.querySelectorAll('#app button, #hud-info, #replay-ui')].some((x) => hits(box, shownRect(x)));
      if ((!busy && sh > hh) || hh < 12) put('side', sl, st, sw, sh);
      else put('top', L.left + 1, L.bottom - tilt(w) - hh, w, hh);
    } catch (e) { /* ignore */ }
  }

  async function draw(ev, ctx) {
    const geo = ctx.geo;
    const plan = geo && typeof geo.getLayout === 'function' ? geo.getLayout() : null;
    if (!plan || !ctx.board) return;
    const t0 = now();
    clear();
    const my = token;
    const alive = () => my === token;
    const o = outlineOf(plan);
    const cols = plan.cols || 6, rows = boardRows(ctx, plan);
    const same = lastPlan === plan.id;
    lastPlan = plan.id;
    const total = skipping(ctx) ? Tm(ctx, 500) : ctx.turbo ? (same ? 120 : 200) : (same ? 250 : 500);
    const dur = Math.round(total * 0.7);
    const still = isStill(ctx);
    const len = outlineLength(o.loops);
    const D = blueprintDefs(cols, rows);
    const has = new Set(o.cells.map((c) => c.reel + ',' + c.row));
    let holes = '';
    for (let x = 0; x < cols; x++) for (let y = 0; y < rows; y++) if (!has.has(x + ',' + y)) holes += `<path class="l-bp-hole" d="M${x + 0.12} ${y + 0.12}L${x + 0.88} ${y + 0.88}M${x + 0.88} ${y + 0.12}L${x + 0.12} ${y + 0.88}"/>`;
    const cellsSvg = o.cells.map((c) => `<rect class="l-bp-cell" data-reel="${c.reel}" data-row="${c.row}" x="${c.reel + 0.06}" y="${c.row + 0.06}" width=".88" height=".88" rx=".08"/>`).join('');
    sheet = h('div', 'l-bp');
    sheet.dataset.plan = plan.id;
    sheet.dataset.cells = String(o.count);
    sheet.innerHTML = `<svg viewBox="0 0 ${cols} ${rows}" preserveAspectRatio="none" width="100%" height="100%" aria-hidden="true">
      <defs>${D.defs}</defs>
      <rect class="l-bp-paper" x="0" y="0" width="${cols}" height="${rows}"/>
      <rect x="0" y="0" width="${cols}" height="${rows}" fill="${D.grid}"/>
      <g class="l-bp-holes">${holes}</g>
      <g class="l-bp-cells">${cellsSvg}</g>
      <path class="l-bp-mis" d="${o.d}" transform="translate(.035 .03)" style="stroke-dasharray:${len};stroke-dashoffset:${still ? 0 : len}"/>
      <path class="l-bp-line" d="${o.d}" style="stroke-dasharray:${len};stroke-dashoffset:${still ? 0 : len}"/>
    </svg>`;
    const pops = ctx.board.querySelector('.popups');
    ctx.board.insertBefore(sheet, pops || null);
    L.last = { plan: plan.id, cells: o.count, cellCount: plan.cellCount != null ? plan.cellCount : o.count, drawn: sheet.querySelectorAll('.l-bp-cell').length, dur, total };
    play(ctx, 'layoutDraw', { dur: Math.max(0.15, Math.min(0.5, dur / 1000)) });
    if (still) { sheet.style.opacity = '1'; }
    else {
      const lines = sheet.querySelectorAll('.l-bp-line,.l-bp-mis');
      const all = Promise.all([
        animRaw(sheet, [{ opacity: 0 }, { opacity: 1 }], Math.min(100, dur * 0.25), 'steps(2,end)'),
        ...[...lines].map((el) => animRaw(el, [{ strokeDashoffset: String(len) }, { strokeDashoffset: '0' }], dur)),
      ]);
      // frame jank: the draw never holds the book past its own share of the budget (+ 1 frame); late animations jump to the end
      let to = null;
      const late = await Promise.race([all.then(() => false), new Promise((r) => { to = setTimeout(() => r(true), Math.max(0, dur - (now() - t0)) + 34); })]);
      clearTimeout(to);
      if (late) { for (const el of [sheet, ...lines]) { try { el.getAnimations().forEach((x) => x.finish()); } catch (e) { /* ignore */ } } await all; }
    }
    if (L.last) L.last.drawMs = Math.round(now() - t0);
    if (!alive()) return;
    // the name stamp (on the frame, lower left), a stamp cue
    stamp = h('div', 'l-bp-stamp', stampSvg(tx(t, 'layers.plan', plan.name, { name: String(plan.name || plan.id).toUpperCase() }), 'steel', { rot: -6, paper: P.indigo }));
    stamp.dataset.plan = plan.id;
    // K6: never on a cell: on a void cell of the plan when it has one (bottom row first, then the top row, leftmost), else on the frame's
    // lower lip under the cell area (layers.css)
    const vo = voidSpot(has, cols, plan.rows || rows); // the plan's own rows (the frame may still be the previous height)
    if (vo) { stamp.classList.add('on-void'); stamp.style.setProperty('--sc', vo.reel); stamp.style.setProperty('--sr', vo.row); stamp.dataset.void = vo.reel + ',' + vo.row; }
    (ctx.wrap || ctx.board).appendChild(stamp);
    if (!vo) {
      placeStamp(ctx);
      const onR = () => { placeStamp(ctx); afterAnims(ctx.wrap || ctx.board, () => placeStamp(ctx)); };
      if (typeof ResizeObserver === 'function') { try { ro = new ResizeObserver(onR); ro.observe(ctx.wrap || ctx.board); ro.observe(ctx.board); } catch (e) { ro = null; } }
      if (typeof window !== 'undefined') { window.addEventListener('resize', onR); offResize = () => window.removeEventListener('resize', onR); }
      afterAnims(ctx.wrap || ctx.board, () => placeStamp(ctx)); // measured again once a 5 <-> 6 row FLIP morph of the frame is over
    }
    play(ctx, 'stamp', { vol: 0.5, pitch: 1.1 });
    // a neutral point at the board when a plan other than the default mezzanine is drawn (WP123_to_WP6 item 2)
    if (plan.id !== 'mezzanine') { const hero = heroine(ctx); if (hero && typeof hero.react === 'function') { try { hero.react('layout', {}); } catch (e) { /* ignore */ } } }
    // the stamp gets what is left of the budget (frame latency of the draw included). Under frame jank the draw may already have used
    // the whole budget: then the stamp goes up at once (no animation), so draw + stamp never run past the budget by more than a frame.
    const left = total - (now() - t0) - 24;
    if (!still) {
      if (left >= 34) await animRaw(stamp, [{ transform: 'scale(1.6)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }], left, 'steps(2,end)');
      else { stamp.style.transform = 'scale(1)'; stamp.style.opacity = '1'; }
    }
    if (still) await wait(ctx, 250, alive);
    if (L.last) L.last.ms = Math.round(now() - t0);
  }
  const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
  function voidSpot(has, cols, rows) {
    for (const y of [rows - 1, 0]) for (let x = 0; x < cols; x++) if (!has.has(x + ',' + y)) return { reel: x, row: y };
    return null;
  }

  // dash offset is not scaled again by ctx.T: dur already is the real duration
  function animRaw(el, frames, dur, easing) {
    const last = frames[frames.length - 1];
    const end = () => { for (const k of Object.keys(last)) if (k !== 'offset') el.style[k] = last[k]; };
    if (!el || dur < 8 || typeof el.animate !== 'function') { if (el) end(); return Promise.resolve(); }
    try {
      const a = el.animate(frames, { duration: dur, easing: easing || `steps(${Math.max(3, Math.round(dur / 1000 * 12) + 2)},end)`, fill: 'both' });
      return a.finished.then(end, end);
    } catch (e) { end(); return Promise.resolve(); }
  }

  function lift(ctx) {
    const s = sheet; if (!s) return;
    sheet = null;
    anim(ctx, s, [{ opacity: 1 }, { opacity: 0 }], { duration: 200, easing: 'steps(3,end)' }).then(() => s.remove());
  }

  L.onEvent = (ev, ctx) => {
    if (!ev || !ctx) return null;
    if (ev.type === 'layout') return draw(ev, ctx);
    if (ev.type === 'reveal') { lift(ctx); if (ev.gameType === 'freegame' && stamp) dropStamp(); }
    return null;
  };
  L.reset = () => { clear(); };
  // a new renderer / page: the next plan is "new" again
  L.forget = () => { lastPlan = null; };
  return L;
}

export const SVG_NS = SVGNS;
