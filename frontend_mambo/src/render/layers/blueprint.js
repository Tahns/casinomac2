// Agent Mambo v2 layer BLUEPRINT (WP6). On `layout` (base spin, before the reveal) a cyanotype sheet lies on the board and the REAL
// outline of the floor plan is inked once, then a small name stamp. Never a cycle through other shapes, never a near-miss (RTS 7C):
// only the plan of this spin is ever drawn, and it is drawn before any outcome.
//   timing (draw + stamp together): a new plan <= 500 ms (turbo 200 ms); the same plan as the previous spin 250 ms (turbo 120 ms);
//   replay skip: ctx.T. The draw takes 3/4 of it, the stamp the last 1/4.
//   Still: the inked end state at once, held 250 ms (ctx.T)
//   the sheet lifts (stepped fade) when the reveal starts; the name stamp stays on the frame until the end of the book
import { outlineOf, outlineLength } from './logic.js';
import { blueprintDefs, stampSvg, P } from './art.js';
import { t } from '../../i18n/index.js';
import { h, anim, wait, isStill, play, skipping, Tm, boardRows, tx, SVGNS } from './util.js';

export function createBlueprint() {
  let sheet = null, stamp = null, token = 0, lastPlan = null;
  const L = { id: 'blueprint', last: null };

  function clear() {
    token++;
    if (sheet) { sheet.remove(); sheet = null; }
    if (stamp) { stamp.remove(); stamp = null; }
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
      await Promise.all([
        animRaw(sheet, [{ opacity: 0 }, { opacity: 1 }], Math.min(100, dur * 0.25), 'steps(2,end)'),
        ...[...lines].map((el) => animRaw(el, [{ strokeDashoffset: String(len) }, { strokeDashoffset: '0' }], dur)),
      ]);
    }
    if (!alive()) return;
    // the name stamp (on the frame, lower left), a stamp cue
    stamp = h('div', 'l-bp-stamp', stampSvg(tx(t, 'layers.plan', plan.name, { name: String(plan.name || plan.id).toUpperCase() }), 'steel', { rot: -6, paper: P.indigo }));
    stamp.dataset.plan = plan.id;
    (ctx.wrap || ctx.board).appendChild(stamp);
    play(ctx, 'stamp', { vol: 0.5, pitch: 1.1 });
    // the stamp gets what is left of the budget (frame latency of the draw included), at least 2 frames
    const stampMs = Math.max(34, total - (now() - t0) - 24);
    if (!still) await animRaw(stamp, [{ transform: 'scale(1.6)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }], stampMs, 'steps(2,end)');
    if (still) await wait(ctx, 250, alive);
    if (L.last) L.last.ms = Math.round(now() - t0);
  }
  const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

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
    if (ev.type === 'reveal') { lift(ctx); if (ev.gameType === 'freegame' && stamp) { stamp.remove(); stamp = null; } }
    return null;
  };
  L.reset = () => { clear(); };
  // a new renderer / page: the next plan is "new" again
  L.forget = () => { lastPlan = null; };
  return L;
}

export const SVG_NS = SVGNS;
