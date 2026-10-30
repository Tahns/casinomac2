// Agent Mambo v2 layer BALLROOM BLACKOUT SPOTLIGHT (WP6). Mission `blackout` (WP8_to_FRONT 4):
//   - every free-spin board opens dark: an ink dim over the board (symbols stay readable, about 50 %), cue lightsOut on the first one
//   - lightRoute (right after the reveal, before any outcome): a 2x2 window of light at route[0], with a cone from a lamp above the frame
//   - each tumbleBoard moves the window to the next route entry (stepped 250 ms, cue spotlightStep); after the last entry it stays
//   - winInfo with meta.lit: an "x4" tag on each lit cluster. The layer re-computes `lit` from its own window and counts mismatches
//     (L.beam.mismatches, read by tests/layers): meta.lit must match the beam
//   - the beam never persists between spins: it goes at setTotalWin / the next reveal / freeSpinEnd / reset
import { createBeam } from './logic.js';
import { lampSvg, tagSvg } from './art.js';
import { t } from '../../i18n/index.js';
import { h, anim, isStill, play, tx, boardRows } from './util.js';

export function createBlackout() {
  const beam = createBeam();
  let active = false, dark = null, tags = [], firstDark = true;
  const L = { id: 'blackout', beam };

  function off() {
    beam.reset();
    if (dark) { dark.remove(); dark = null; }
    tags.forEach((e) => e.remove()); tags = [];
  }

  function geom(ctx) {
    const plan = ctx.geo && ctx.geo.getLayout ? ctx.geo.getLayout() : null;
    return { cols: (plan && plan.cols) || 6, rows: boardRows(ctx, plan) };
  }

  function lightsOut(ctx) {
    if (!ctx.board) return;
    if (dark) dark.remove();
    tags.forEach((e) => e.remove()); tags = [];
    const { cols, rows } = geom(ctx);
    dark = h('div', 'l-dark');
    dark.style.setProperty('--cols', cols); dark.style.setProperty('--rows', rows);
    dark.innerHTML = `<svg class="l-dark-svg" viewBox="0 0 ${cols} ${rows}" preserveAspectRatio="none" width="100%" height="100%" aria-hidden="true">
        <path class="l-dark-shade" fill-rule="evenodd" d="M0 0H${cols}V${rows}H0Z"/>
        <path class="l-dark-cone" d=""/>
        <rect class="l-dark-win" x="0" y="0" width="2" height="2" rx=".12" visibility="hidden"/>
      </svg><div class="l-lamp">${lampSvg()}</div>`;
    const pops = ctx.board.querySelector('.popups');
    ctx.board.insertBefore(dark, pops || null);
    if (firstDark) { play(ctx, 'lightsOut'); firstDark = false; }
    anim(ctx, dark, [{ opacity: 0 }, { opacity: 1 }], { duration: 250, easing: 'steps(3,end)' });
  }

  // place the window (and the hole in the shade, the cone, the lamp) on the current route entry
  function place(ctx) {
    if (!dark) return;
    const win = beam.current();
    const { cols, rows } = geom(ctx);
    const shade = dark.querySelector('.l-dark-shade'), cone = dark.querySelector('.l-dark-cone'), box = dark.querySelector('.l-dark-win'), lamp = dark.querySelector('.l-lamp');
    if (!win) { shade.setAttribute('d', `M0 0H${cols}V${rows}H0Z`); box.setAttribute('visibility', 'hidden'); cone.setAttribute('d', ''); return; }
    const x = win.reel, y = win.row, w = beam.w, hh = beam.h;
    shade.setAttribute('d', `M0 0H${cols}V${rows}H0Z M${x} ${y}V${y + hh}H${x + w}V${y}Z`);
    box.setAttribute('x', x); box.setAttribute('y', y); box.setAttribute('width', w); box.setAttribute('height', hh);
    box.setAttribute('visibility', 'visible');
    const lx = x + w / 2;
    cone.setAttribute('d', `M${lx - 0.14} -0.2L${lx + 0.14} -0.2L${x + w} ${y}L${x} ${y}Z`);
    dark.dataset.reel = String(x); dark.dataset.row = String(y); dark.dataset.k = String(beam.k);
    if (lamp) { lamp.style.left = `${(lx / cols) * 100}%`; }
  }

  function onRoute(ev, ctx) {
    if (!dark) lightsOut(ctx);
    beam.onRoute(ev);
    place(ctx);
    if (!dark) return null;
    play(ctx, 'spotlightStep', { i: 0 });
    const box = dark.querySelector('.l-dark-win');
    return anim(ctx, box, [{ opacity: 0 }, { opacity: 1 }], { duration: 250, easing: 'steps(3,end)' });
  }

  function onTumble(ctx) {
    if (!beam.route) return null;
    tags.forEach((e) => e.remove()); tags = [];
    const moved = beam.step();
    if (!moved) return null;
    play(ctx, 'spotlightStep', { i: beam.k });
    if (isStill(ctx)) { place(ctx); return null; }
    // limited animation: the window jumps in 3 held frames (off, half, on) over 250 ms
    const box = dark && dark.querySelector('.l-dark-win');
    place(ctx);
    return box ? anim(ctx, box, [{ opacity: 0.2 }, { opacity: 1 }], { duration: 250, easing: 'steps(3,end)' }) : null;
  }

  function onWin(ev, ctx) {
    if (!beam.route) return null;
    const toGeo = (reel, p) => { try { const g = ctx.geo.toGeo(reel, p); return typeof g === 'number' ? g : p - 1; } catch (e) { return p - 1; } };
    const res = beam.check(ev, toGeo);
    if (!dark || !ctx.board) return null;
    const { cols, rows } = geom(ctx);
    (ev.wins || []).forEach((w, i) => {
      const m = w.meta || {};
      if (!m.lit) return;
      const ov = m.overlay || (w.positions && w.positions[0]);
      if (!ov) return;
      const g = toGeo(ov.reel, ov.row);
      const tag = h('div', 'l-x4', tagSvg(tx(t, 'layers.lit', `x${beam.mult}`, { n: Number(m.lensMult) || beam.mult })));
      tag.style.left = `${((ov.reel + 0.5) / cols) * 100}%`;
      tag.style.top = `${((Math.max(0, g) + 0.1) / rows) * 100}%`;
      tag.dataset.ok = res[i] ? String(res[i].ok) : '';
      ctx.board.appendChild(tag);
      tags.push(tag);
      anim(ctx, tag, [{ transform: 'translate(-50%,-50%) scale(1.8)', opacity: 0 }, { transform: 'translate(-50%,-50%) scale(1)', opacity: 1 }], { duration: 167, easing: 'steps(2,end)' });
    });
    return null;
  }

  L.onEvent = (ev, ctx) => {
    if (!ev || !ctx) return null;
    switch (ev.type) {
      case 'missionAssigned': active = ev.mission === 'blackout' || !!ev.lens; firstDark = true; if (!active) off(); return null;
      case 'reveal': off(); if (active && ev.gameType === 'freegame') lightsOut(ctx); return null;
      case 'lightRoute': active = true; return onRoute(ev, ctx);
      case 'tumbleBoard': return active ? onTumble(ctx) : null;
      case 'winInfo': return active ? onWin(ev, ctx) : null;
      case 'setTotalWin': case 'updateFreeSpin': case 'freeSpinEnd': case 'finalWin': case 'wincap':
        off(); if (ev.type === 'freeSpinEnd' || ev.type === 'finalWin') active = false; return null;
      default: return null;
    }
  };
  L.reset = () => { active = false; firstDark = true; off(); };
  L.state = () => ({ active, dark: !!dark, win: beam.current(), k: beam.k, mismatches: beam.mismatches, checks: beam.checks.length });
  return L;
}
