// Agent Mambo v2 layers (WP6): small DOM / timing helpers shared by the layer plug-ins.
//
// Timing rules every layer follows (slot guide + SYNTHESIS 5):
//   - every duration goes through ctx.T (turbo / replay skip), every wait through wait(ctx, ms) which also ends early on skip
//   - motion level 'still' = the static end state at once (no tween, no stepped frames); 'calm' = fades only, no scale pops
//   - limited animation: stepped easing (steps(n)) at about 12 frames per second
import { audio as audioSingleton } from '../../audio.js';
import { mascotOf } from '../mascot.js';

export const SVGNS = 'http://www.w3.org/2000/svg';
export const FPS = 12;

export function motionLevel(ctx) {
  try {
    const m = ctx && ctx.motion;
    if (m && typeof m.level === 'string') return m.level;
    const s = ctx && ctx.settings;
    const v = s && typeof s.get === 'function' ? s.get('motionLevel') : null;
    return v === 'still' || v === 'calm' ? v : 'full';
  } catch (e) { return 'full'; }
}
export const isStill = (ctx) => motionLevel(ctx) === 'still';
export const isCalm = (ctx) => motionLevel(ctx) !== 'full';

export const Tm = (ctx, ms) => {
  try { return ctx && typeof ctx.T === 'function' ? Math.max(0, ctx.T(ms)) : ms; } catch (e) { return ms; }
};
export const skipping = (ctx) => { try { return !!(ctx && ctx.skip); } catch (e) { return false; } };

/** steps(n) for a duration at ~12 fps (at least 2 steps) */
export const stepsFor = (ms) => `steps(${Math.max(2, Math.round((ms / 1000) * FPS))},end)`;

/** Wait ms (scaled by ctx.T). Resolves early when the layer is reset (token changed). */
export function wait(ctx, ms, alive = () => true) {
  const d = Tm(ctx, ms);
  if (d <= 0 || !alive()) return Promise.resolve();
  return new Promise((r) => {
    const t0 = Date.now();
    const tick = () => { if (!alive() || Date.now() - t0 >= d) r(); else setTimeout(tick, Math.min(50, d - (Date.now() - t0))); };
    setTimeout(tick, Math.min(50, d));
  });
}

/** element.animate with the layer rules: scaled duration, stepped easing by default, Still -> jump to the last frame. */
export function anim(ctx, el, frames, o = {}) {
  if (!el || !frames || !frames.length) return Promise.resolve();
  const last = frames[frames.length - 1];
  const apply = () => { for (const k of Object.keys(last)) if (k !== 'offset' && k !== 'easing') { try { el.style[k] = last[k]; } catch (e) { /* ignore */ } } };
  const dur = Tm(ctx, o.duration || 0);
  if (isStill(ctx) || dur < 8 || typeof el.animate !== 'function') { apply(); return Promise.resolve(); }
  try {
    const a = el.animate(frames, { duration: dur, delay: Tm(ctx, o.delay || 0), easing: o.easing || stepsFor(o.duration || 250), fill: 'both' });
    return a.finished.then(() => { apply(); try { a.cancel(); } catch (e) { /* ignore */ } }, () => { apply(); });
  } catch (e) { apply(); return Promise.resolve(); }
}

export function h(tag, cls, html) {
  const el = document.createElement(tag);
  if (cls) el.className = cls;
  if (html != null) el.innerHTML = html;
  return el;
}

/** the audio singleton, or ctx.audio when the player hands one in (WP4 request). Layer cues are all neutral (winLike false). */
export function play(ctx, id, o) {
  try {
    const a = (ctx && ctx.audio) || audioSingleton;
    if (a && typeof a.play === 'function') return a.play(id, o);
  } catch (e) { /* ignore */ }
  return false;
}

/** the live heroine (createMascot api) or null: ctx.mascot when the player hands it in, else the registry of mascot.js */
export function heroine(ctx) {
  try {
    if (ctx && ctx.mascot) return ctx.mascot;
    if (typeof document === 'undefined') return null;
    const s = document.getElementById('heroine-slot');
    const m = (s && mascotOf(s)) || mascotOf(document.getElementById('mascot-slot'));
    return m || null;
  } catch (e) { return null; }
}

/** text through the i18n table with a fallback (never a raw key on screen) */
export function tx(t, key, fb, vars) {
  try {
    const v = typeof t === 'function' ? t(key, vars) : null;
    if (typeof v === 'string' && v && v !== key) return v;
  } catch (e) { /* ignore */ }
  return fb;
}

export const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** the rect of el relative to host (px) */
export function rectIn(el, host) {
  try {
    const a = host.getBoundingClientRect(), b = el.getBoundingClientRect();
    return { x: b.left - a.left, y: b.top - a.top, w: b.width, h: b.height };
  } catch (e) { return null; }
}

// ---- free spots on the frame for the plan stamp and the Sealed Orders envelope (K4 / K6 round 2) ----
// Portrait test of the heroine shell (src/ui/heroine_shell.js PORTRAIT_QUERY): the HUD row starts right under the board there.
export const PORTRAIT_QUERY = '(max-aspect-ratio: 11/10)';
export function isPortrait() {
  try { return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(PORTRAIT_QUERY).matches; } catch (e) { return false; }
}

/** the client rect of el when it is on screen (laid out, not hidden, not faded out with its ancestors), else null */
export function shownRect(el) {
  try {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    if (!(r.width > 0 && r.height > 0)) return null;
    for (let e = el; e && e.nodeType === 1; e = e.parentElement) {
      const cs = getComputedStyle(e);
      if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) < 0.05) return null;
      if (e.id === 'app') break;
    }
    return r;
  } catch (e) { return null; }
}

export const vpSize = () => ({ w: (typeof window !== 'undefined' && window.innerWidth) || 0, h: (typeof window !== 'undefined' && window.innerHeight) || 0 });

/**
 * The free stretch of the frame's TOP lip, left of the FREE SPINS plate and of the COMBO chip slot, under the Mission Meter / logo,
 * right of the dial badge (client px: { left, right, top, bottom }; bottom = 1 px above the first cell row). B = the cell area rect.
 * o.tuck: px the spot may tuck under the Mission Meter track's lower rim (the bars themselves stay clear).
 */
export function topLip(B, cell, o = {}) {
  const q = (s) => (typeof document !== 'undefined' ? [...document.querySelectorAll(s)] : []);
  const lip = { left: B.left, right: B.right - cell * 1.6, top: Math.max(0, B.top - cell * 0.9), bottom: B.top - 1 };
  // the COMBO chip (top-right lip, shown during tumbles) and the FREE SPINS plate (top middle) close the stretch on the right (both are
  // children of .board-wrap, beside .board: render round 2, the old '.board .chip' never matched them)
  for (const c of q('.board-wrap .chip.combo, .board-wrap .chip.fsc')) {
    const r = shownRect(c);
    if (!r || !(c.textContent || '').trim()) continue;
    // its unscaled width around its client centre: the chip bumps (a scale about its centre) when its count changes, the lip must not
    // follow the bump (the chip is centred by a translate, so offsetLeft is not its place either)
    let left = r.left, width = r.width;
    const op = c.offsetParent;
    if (op && op.offsetWidth && c.offsetWidth) { const sx = op.getBoundingClientRect().width / op.offsetWidth; width = c.offsetWidth * sx; left = r.left + r.width / 2 - width / 2; }
    if (width > cell * 0.5) lip.right = Math.min(lip.right, left - 3);
  }
  // the dial badge and the KEPT tag stand on the top-left corner in portrait: start right of them
  for (const el of q('#meter-slot .mm-badge, #meter-slot .mm-kept')) {
    const r = shownRect(el);
    if (r && r.left < B.left + cell && r.bottom > lip.top && r.top < lip.bottom) lip.left = Math.max(lip.left, r.right + 3);
  }
  // the Mission Meter bars / band and the logo above the lip set its ceiling
  for (const el of q('#meter-slot .mm-bars, #meter-slot .mm-band, #meter-slot .mm-badge, #meter-slot .mm-kept, #logo, #hud-info')) {
    const r = shownRect(el);
    if (r && r.right > lip.left && r.left < lip.right && r.bottom <= lip.bottom + 2 && r.bottom > lip.top) lip.top = r.bottom + 1 - (el.classList.contains('mm-bars') ? (o.tuck || 0) : 0);
  }
  return lip;
}

/** fn() once the running animations of el (the frame's 5 <-> 6 row FLIP morph, a scale on the wrap) are over; true when there were any */
export function afterAnims(el, fn) {
  try {
    const list = el && typeof el.getAnimations === 'function' ? el.getAnimations() : [];
    for (const a of list) a.finished.then(fn, fn);
    return list.length > 0;
  } catch (e) { return false; }
}

/** true when the two rects (client px, { left, top, right, bottom }) overlap */
export const hits = (a, b) => !!(a && b && Math.min(a.right, b.right) > Math.max(a.left, b.left) && Math.min(a.bottom, b.bottom) > Math.max(a.top, b.top));

/** rows the board is drawn with: the board's --rows when the player sets one, else the plan's frame rows */
export function boardRows(ctx, plan) {
  try {
    const v = parseInt(getComputedStyle(ctx.board).getPropertyValue('--rows'), 10);
    if (v > 0) return v;
  } catch (e) { /* ignore */ }
  return plan && plan.rows ? plan.rows : 5;
}
