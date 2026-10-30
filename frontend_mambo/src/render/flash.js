// Agent Mambo v2: the FLASH GOVERNOR (SYNTHESIS 5 "Systems": <= 2 flashes per second, <= 0.5 peak, cream / lemon, red treated as
// saturated; WP5 owns this file). Every full-screen flash of the game goes through ONE governor so that two modules can never add
// up to more than the budget.
//
//   import { flash, createFlashGovernor, FLASH } from './flash.js';
//   flash.attach(el)                 the full-screen overlay element (render/index.js `#flash`); without it nothing is drawn
//   flash.fire(peak, ms, color)      -> true when a flash was drawn, false when it was refused (budget, Still, peak 0)
//   flash.allow()                    -> true when a flash would be accepted now (does not consume the budget)
//   flash.mode                       'flash' | 'dissolve' | 'none' (from the settings below)
//   flash.recent                     number of flashes started in the last 1000 ms
//   flash.log                        the last 64 accepted flashes { t, peak, ms, color, mode } (tests / the e2e capture read it)
//   flash.on(fn)                     fn(entry) after each accepted flash; returns the unsubscribe function
//
// Settings (read live from src/settings.js, the ONE preference store; never written here):
//   motionLevel 'still'          -> 'none'      no flash at all (Still replaces motion, it never shortens a round)
//   motionLevel 'calm' or flashReduced ("Screen flash effects" off, or the OS reduced-motion default)
//                                -> 'dissolve'  one 167 ms linear fade, peak <= 0.25
//   otherwise                    -> 'flash'     peak <= 0.5, the caller's duration (scaled by its own turbo `T`)
//
// Colour: only cream (#FBF1D9) or lemon (#FFD23F) are ever drawn. Any other request is drawn cream. A saturated red request
// ("red counted as saturated", WCAG 2.3.1) is ALSO drawn cream and costs the budget like any flash: there is no separate red budget
// to exploit. White (#fff) becomes cream.
//
// Budget: at most FLASH.maxPerSecond (2) flash STARTS in any sliding 1000 ms window. A flash is one rise and one fall, so two per
// second is at most two luminance flashes in any one-second window (WCAG general flash threshold is three).
import { settings as defaultSettings } from '../settings.js';

export const FLASH = Object.freeze({
  maxPerSecond: 2,
  windowMs: 1000,
  peak: 0.5,
  dissolvePeak: 0.25,
  dissolveMs: 167,
  minMs: 60,
  maxMs: 1200,
  cream: '#FBF1D9',
  lemon: '#FFD23F',
});

/** Pure: parse a css colour (#rgb, #rrggbb, rgb(), a few names) -> [r, g, b] 0..255, or null. */
export function parseColor(c) {
  if (c == null) return null;
  const s = String(c).trim().toLowerCase();
  const NAMES = { white: [255, 255, 255], red: [255, 0, 0], yellow: [255, 255, 0], black: [0, 0, 0] };
  if (NAMES[s]) return NAMES[s];
  let m = /^#([0-9a-f]{3})$/.exec(s);
  if (m) return m[1].split('').map((h) => parseInt(h + h, 16));
  m = /^#([0-9a-f]{6})([0-9a-f]{2})?$/.exec(s);
  if (m) return [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16));
  m = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/.exec(s);
  if (m) return [m[1], m[2], m[3]].map((v) => Math.max(0, Math.min(255, Number(v))));
  m = /^([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)$/.exec(s); // the fx.js 'r,g,b' shorthand
  if (m) return [m[1], m[2], m[3]].map((v) => Math.max(0, Math.min(255, Number(v))));
  return null;
}

/** Pure: WCAG 2.x "saturated red" test on an sRGB colour: R / (R + G + B) >= 0.8 (the PEAT / Harding red rule). */
export function isSaturatedRed(c) {
  const rgb = Array.isArray(c) ? c : parseColor(c);
  if (!rgb) return false;
  const [r, g, b] = rgb.map((v) => v / 255);
  const sum = r + g + b;
  return sum > 0 && r / sum >= 0.8;
}

/** Pure: the colour actually drawn for a requested one: lemon stays lemon, everything else (white, red, any hue) is cream. */
export function flashColor(c) {
  const rgb = parseColor(c);
  if (rgb) {
    const [lr, lg, lb] = parseColor(FLASH.lemon);
    if (Math.abs(rgb[0] - lr) + Math.abs(rgb[1] - lg) + Math.abs(rgb[2] - lb) < 24) return FLASH.lemon;
  }
  return FLASH.cream;
}

/** Pure: 'flash' | 'dissolve' | 'none' from the derived settings values. */
export function flashModeFrom(motionLevel, flashReduced) {
  if (motionLevel === 'still') return 'none';
  if (motionLevel === 'calm' || flashReduced) return 'dissolve';
  return 'flash';
}

/** Pure: the drawn peak and duration for a request in a mode. */
export function flashShape(peak, ms, mode) {
  const p = Number(peak), d = Number(ms);
  if (mode === 'none' || !(p > 0)) return null;
  if (mode === 'dissolve') return { peak: Math.min(p, FLASH.dissolvePeak), ms: FLASH.dissolveMs, easing: 'linear' };
  return { peak: Math.min(p, FLASH.peak), ms: Math.max(FLASH.minMs, Math.min(FLASH.maxMs, Number.isFinite(d) ? d : 300)), easing: 'ease-out' };
}

/**
 * opts: { settings (get/on), now() ms clock, el (overlay element), budget (max starts per window), windowMs }
 * Everything optional; works in node (no element: the decision and the log still run, nothing is drawn).
 */
export function createFlashGovernor(opts = {}) {
  const src = opts.settings || defaultSettings;
  const now = typeof opts.now === 'function' ? opts.now : () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
  const budget = Math.max(1, Math.min(FLASH.maxPerSecond, Number(opts.budget) || FLASH.maxPerSecond)); // can be lowered, never raised
  const windowMs = Math.max(FLASH.windowMs, Number(opts.windowMs) || FLASH.windowMs);
  const read = (k) => { try { return src && typeof src.get === 'function' ? src.get(k) : undefined; } catch (e) { return undefined; } };
  let el = opts.el || null;
  const starts = [];
  const log = [];
  const subs = new Set();
  let refused = 0;

  const mode = () => flashModeFrom(read('motionLevel'), !!read('flashReduced'));
  function prune(t) { while (starts.length && t - starts[0] >= windowMs) starts.shift(); }

  function draw(shape, color) {
    if (!el && opts.lazy !== false && typeof document !== 'undefined') { try { el = document.getElementById('flash'); } catch (e) { el = null; } }
    if (!el) return;
    try {
      el.style.background = color;
      if (typeof el.animate === 'function') {
        el.animate([{ opacity: shape.peak }, { opacity: 0 }], { duration: shape.ms, easing: shape.easing });
      }
    } catch (e) { /* drawing is best effort; the budget was still consumed */ }
  }

  const gov = {
    attach(e) { el = e || null; return gov; },
    get el() { return el; },
    get mode() { return mode(); },
    get recent() { prune(now()); return starts.length; },
    get refused() { return refused; },
    get log() { return log.slice(); },
    allow() { if (mode() === 'none') return false; prune(now()); return starts.length < budget; },
    /** peak 0..1 (clamped to the mode's peak), ms (caller's turbo-scaled duration), color (drawn cream or lemon). */
    fire(peak = 0.5, ms = 300, color = FLASH.cream) {
      const m = mode();
      const shape = flashShape(peak, ms, m);
      if (!shape) return false;
      const t = now();
      prune(t);
      if (starts.length >= budget) { refused++; return false; }
      starts.push(t);
      const c = flashColor(color);
      const entry = Object.freeze({ t, peak: shape.peak, ms: shape.ms, color: c, mode: m, red: isSaturatedRed(color) });
      log.push(entry); if (log.length > 64) log.shift();
      draw(shape, c);
      for (const fn of [...subs]) { try { fn(entry); } catch (e) { /* a listener never breaks the governor */ } }
      return true;
    },
    on(fn) { if (typeof fn !== 'function') return () => {}; subs.add(fn); return () => { subs.delete(fn); }; },
    reset() { starts.length = 0; log.length = 0; refused = 0; },
  };
  return gov;
}

/** The shared governor (one per page). render/index.js attaches `#flash` to it; every module fires through it. */
export const flash = createFlashGovernor();
export default flash;
