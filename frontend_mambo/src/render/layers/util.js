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

/** rows the board is drawn with: the board's --rows when the player sets one, else the plan's frame rows */
export function boardRows(ctx, plan) {
  try {
    const v = parseInt(getComputedStyle(ctx.board).getPropertyValue('--rows'), 10);
    if (v > 0) return v;
  } catch (e) { /* ignore */ }
  return plan && plan.rows ? plan.rows : 5;
}
