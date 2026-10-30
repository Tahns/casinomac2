// CLEARANCE DIAL (was the Mission Meter; SYNTHESIS 0.2 names, 5 row 11): the global multiplier readout of the free spins
// (vibraphone ladder + starburst badge). Code keys keep `meter` / `updateGlobalMult`; only the player-facing name changed.
// createMeter(hostEl, ctx) -> { set(value,{animate,from,step}), mission(ev), setStep(n), setCap(n), pulse(), max(), show(bool),
//                               reset(), value, band, step, el, destroy() }
// hostEl: position:relative element with the same box as the symbol grid. ctx (all optional):
//   { audio, reduced, motion (render/motion.js store, read live), t(key), cap (dial cap, default 100), step (default 8), bars (20),
//     layout ('ladder'|'strip'|'badge' to force) }
//
// v2 behaviour (WP5):
//  - "+N" chip 520 ms where N = missionAssigned.dialStep (meter.mission(ev) or set(v, {step})); a book without missionAssigned
//    (v1 books) uses DEFAULT_DIAL_STEP = 8 (the v1 math: gmStart 1, gmStep 8, gmCap 100).
//  - band stamp Largo / Andante / Allegro / Presto (167 ms) when the value enters a new band. The bands are cut from the cap
//    (<17 / <41 / <81 / >=81 at cap 100). It is a READOUT of the dial, never odds or a promise.
//  - digit flip 130 ms.
//  - Full: the chip flies from the cluster to the badge. Calm: the chip pops beside the badge without travelling. Still: it is shown
//    for 520 ms without any movement (information is never removed, only motion).
import { hasKey } from '../i18n/index.js';

const NS = 'http://www.w3.org/2000/svg';
export const DEFAULT_DIAL_STEP = 8;
export const DEFAULT_DIAL_CAP = 100;
export const DIAL_TIMING = Object.freeze({ chipMs: 520, bandStampMs: 167, flipMs: 130 });
// fraction of the cap where each band starts (edge = round(cap * f) + 1): 100 -> 17 / 41 / 81
export const BANDS = Object.freeze([
  Object.freeze({ id: 'largo', name: 'Largo', from: 0 }),
  Object.freeze({ id: 'andante', name: 'Andante', from: 0.16 }),
  Object.freeze({ id: 'allegro', name: 'Allegro', from: 0.40 }),
  Object.freeze({ id: 'presto', name: 'Presto', from: 0.80 }),
]);
const validCap = (cap) => { const c = Number(cap); return Number.isFinite(c) && c > 1 ? c : DEFAULT_DIAL_CAP; };
/** Pure: the three band edges (first value of Andante, Allegro, Presto) for a dial cap. */
export function bandEdges(cap) { const c = validCap(cap); return BANDS.slice(1).map((b) => Math.round(c * b.from) + 1); }
/** Pure: the band of a dial value. */
export function bandOf(v, cap) {
  const e = bandEdges(cap), x = Number(v) || 0;
  const i = x >= e[2] ? 3 : x >= e[1] ? 2 : x >= e[0] ? 1 : 0;
  return BANDS[i];
}

let cssDone = false;
function ensureCss() {
  if (cssDone || typeof document === 'undefined') return;
  cssDone = true;
  try {
    if (document.querySelector('link[data-meter-css]') || document.querySelector('link[href$="meter.css"]')) return;
    const l = document.createElement('link');
    l.rel = 'stylesheet'; l.href = new URL('./meter.css', import.meta.url).href; l.setAttribute('data-meter-css', '1');
    document.head.appendChild(l);
  } catch (e) { /* optional */ }
}
const tierOf = (v) => (v >= 50 ? 4 : v >= 20 ? 3 : v >= 10 ? 2 : v >= 5 ? 1 : 0);

export function createMeter(hostEl, ctx = {}) {
  ensureCss();
  const mqReduce = typeof matchMedia !== 'undefined' ? matchMedia('(prefers-reduced-motion: reduce)') : null;
  // live motion level: the motion store when given, else the creation-time flag / OS query
  const level = () => {
    try { if (ctx.motion && ctx.motion.level) return ctx.motion.level; } catch (e) { /* ignore */ }
    return (ctx.reduced || (mqReduce && mqReduce.matches)) ? 'calm' : 'full';
  };
  // t() humanises unknown keys ("meter.title" -> "Title"), so only use it for keys that exist
  const tr = (k, d) => { try { if (!hasKey(k) || !ctx.t) return d; const v = ctx.t(k); return v && v !== k ? v : d; } catch (e) { return d; } };
  const NB = Math.max(4, ctx.bars | 0 || 20);
  let cap = validCap(ctx.cap), step = Number(ctx.step) > 0 ? Math.round(ctx.step) : DEFAULT_DIAL_STEP;
  const root = document.createElement('div');
  root.className = 'mm'; root.hidden = true; root.setAttribute('role', 'img');
  const badge = document.createElement('div'); badge.className = 'mm-badge';
  const sv = document.createElementNS(NS, 'svg'); sv.setAttribute('class', 'mm-burst'); sv.setAttribute('viewBox', '-50 -50 100 100');
  const pts = (r, i0, n = 12) => { let d = ''; for (let i = 0; i < n * 2; i++) { const a = i / (n * 2) * Math.PI * 2; const rr = i % 2 ? r * i0 : r; d += `${(Math.cos(a) * rr).toFixed(1)},${(Math.sin(a) * rr).toFixed(1)} `; } return d.trim(); };
  const mk = (tag, a) => { const e = document.createElementNS(NS, tag); for (const k in a) e.setAttribute(k, a[k]); sv.appendChild(e); return e; };
  mk('circle', { class: 'mm-ring', cx: 0, cy: 0, r: 52 });
  mk('polygon', { class: 'mm-burst-out', points: pts(50, .72) });
  mk('polygon', { class: 'mm-burst-fill', points: pts(44, .74) });
  mk('polygon', { class: 'mm-burst-hue', points: pts(35, .8), opacity: '.35' });
  badge.appendChild(sv);
  const digits = document.createElement('div'); digits.className = 'mm-digits'; badge.appendChild(digits);
  const kept = document.createElement('div'); kept.className = 'mm-kept'; kept.textContent = tr('meter.kept', 'KEPT'); badge.appendChild(kept);
  // band readout under the badge (ladder) / at the strip's right end; stamped when it changes
  const bandEl = document.createElement('div'); bandEl.className = 'mm-band';
  const bars = document.createElement('div'); bars.className = 'mm-bars';
  const barEls = [];
  for (let i = 0; i < NB; i++) { const b = document.createElement('div'); b.className = 'mm-bar'; b.style.setProperty('--k', (i / (NB - 1)).toFixed(3)); bars.appendChild(b); barEls.push(b); }
  const thin = document.createElement('div'); thin.className = 'mm-thin';
  const thinFill = document.createElement('div'); thinFill.className = 'mm-thin-fill'; thin.appendChild(thinFill);
  root.append(badge, bandEl, bars, thin);
  hostEl.appendChild(root);

  let value = 1, isMax = false, timers = [], band = bandOf(1, cap);
  const later = (fn, ms) => { const id = setTimeout(fn, ms); timers.push(id); return id; };

  // layout: ladder (desktop) | strip (portrait) | badge (400x225-class heights)
  const mqTiny = matchMedia('(max-height: 300px)'), mqPort = matchMedia('(max-aspect-ratio: 11/10)');
  function layout() {
    root.dataset.layout = ctx.layout || (mqTiny.matches ? 'badge' : mqPort.matches ? 'strip' : 'ladder');
    try { // desktop badge scales with the ladder column
      if (root.dataset.layout === 'ladder') { const w = hostEl.clientHeight; root.style.setProperty('--bs', Math.round(Math.min(58, Math.max(40, w * .11))) + 'px'); } else root.style.removeProperty('--bs');
    } catch (e) { /* ignore */ }
  }
  layout();
  const onMq = () => layout();
  [mqTiny, mqPort].forEach((m) => { if (m.addEventListener) m.addEventListener('change', onMq); else if (m.addListener) m.addListener(onMq); });
  let ro = null; try { ro = new ResizeObserver(() => layout()); ro.observe(hostEl); } catch (e) { /* ignore */ }

  const bandName = (b) => tr('meter.band.' + b.id, b.name);
  function paint(v) {
    value = v;
    const start = Math.max(1, v - NB + 1);              // beyond NB levels the ladder scrolls
    root.dataset.tier = String(tierOf(v));
    barEls.forEach((b, i) => {
      const lvl = start + i;
      b.classList.toggle('lit', lvl <= v); b.classList.toggle('cur', lvl === v);
      b.dataset.level = String(lvl);
    });
    digits.innerHTML = isMax ? tr('meter.max', 'MAX') : `<small>x</small>${v}`;
    thinFill.style.width = Math.min(100, v / NB * 100) + '%';
    band = bandOf(v, cap);
    root.dataset.band = band.id;
    bandEl.textContent = bandName(band);
    root.classList.toggle('max', isMax);
    root.setAttribute('aria-label', `${tr('meter.title', 'Clearance Dial')} x${v}${isMax ? ' ' + tr('meter.max', 'MAX') : ''}, ${bandName(band)}`);
  }
  const play = (n, o) => { try { if (ctx.audio && typeof ctx.audio.play === 'function') return ctx.audio.play(n, o); } catch (e) { /* ignore */ } return false; };
  const restart = (el, cls, ms) => { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); later(() => el.classList.remove(cls), ms); };

  // "+N" chip, 520 ms. Full: flies from the cluster (client px) to the badge; Calm: pops beside the badge; Still: shown, no motion.
  function chip(n, from) {
    try {
      const lv = level();
      const c = document.createElement('div'); c.className = 'mm-chip'; c.textContent = '+' + n;
      root.appendChild(c);
      const rr = root.getBoundingClientRect(), br = badge.getBoundingClientRect();
      const x1 = br.left - rr.left + br.width / 2, y1 = br.top - rr.top + br.height / 2;
      c.style.left = '0px'; c.style.top = '0px';
      const done = () => c.remove();
      const ms = DIAL_TIMING.chipMs;
      if (lv === 'full' && from && typeof from.x === 'number') {
        const x0 = from.x - rr.left, y0 = from.y - rr.top;
        const a = c.animate([{ transform: `translate(${x0}px,${y0}px) translate(-50%,-50%) scale(1)`, opacity: 1 }, { transform: `translate(${(x0 + x1) / 2}px,${Math.min(y0, y1) - 16}px) translate(-50%,-50%) scale(1.2)`, opacity: 1, offset: .5 }, { transform: `translate(${x1}px,${y1}px) translate(-50%,-50%) scale(.6)`, opacity: 0 }], { duration: ms, easing: 'steps(6,end)', fill: 'forwards' });
        a.finished.then(done, done);
      } else if (lv !== 'still') {
        const xb = x1 + br.width * .55, yb = y1 - br.height * .45;
        const a = c.animate([{ transform: `translate(${xb}px,${yb}px) translate(-50%,-50%) scale(.6)`, opacity: 0 }, { transform: `translate(${xb}px,${yb}px) translate(-50%,-50%) scale(1)`, opacity: 1, offset: .25 }, { transform: `translate(${xb}px,${yb - 8}px) translate(-50%,-50%) scale(1)`, opacity: 1, offset: .8 }, { transform: `translate(${xb}px,${yb - 10}px) translate(-50%,-50%) scale(1)`, opacity: 0 }], { duration: ms, easing: 'steps(6,end)', fill: 'forwards' });
        a.finished.then(done, done);
      } else {
        c.style.transform = `translate(${x1 + br.width * .55}px,${y1 - br.height * .45}px) translate(-50%,-50%)`;
        later(done, ms);
      }
    } catch (e) { /* ignore */ }
  }
  function clearMission() { step = Number(ctx.step) > 0 ? Math.round(ctx.step) : DEFAULT_DIAL_STEP; cap = validCap(ctx.cap); delete root.dataset.mission; }
  function stampBand() {
    if (level() === 'still') return;
    restart(bandEl, 'mm-stamp', DIAL_TIMING.bandStampMs + 40);
  }

  const api = {
    // value: integer multiplier; opts.animate plays the growth animation; opts.from {x,y} (client px) = cluster the chip flies from;
    // opts.step overrides the chip number for this call
    set(v, opts = {}) {
      v = Math.max(1, Math.round(Number(v) || 1));
      const grew = v > value;
      const prevBand = band;
      if (v !== value || opts.force) isMax = isMax && v >= value;
      paint(v);
      if (opts.animate && grew) {
        const lv = level();
        const n = Number(opts.step) > 0 ? Math.round(opts.step) : step;
        chip(n, opts.from);
        if (lv !== 'still') {
          restart(digits, 'mm-flip', DIAL_TIMING.flipMs);
          if (lv === 'full') { const cur = barEls.find((b) => b.classList.contains('cur')); if (cur) restart(cur, 'pop', 280); }
          restart(root, 'mm-flash', 320);
        }
        if (band !== prevBand) { stampBand(); play('stamp', { pitch: 0.8 + 0.13 * BANDS.indexOf(band), vol: 0.6 }); }
        play('meter', { level: v, note: v % 10, octave: Math.floor(v / 10) });
      }
      return api;
    },
    /** missionAssigned event (SYNTHESIS 8.4): takes dialStep, dialCap and dialStart; unknown / missing fields keep the defaults. */
    mission(ev) {
      if (!ev || typeof ev !== 'object') return api;
      if (Number(ev.dialStep) > 0) step = Math.round(Number(ev.dialStep));
      if (Number(ev.dialCap) > 1) cap = Number(ev.dialCap);
      root.dataset.mission = typeof ev.mission === 'string' ? ev.mission.replace(/[^a-z]/gi, '').slice(0, 16) : '';
      if (Number(ev.dialStart) >= 1) paint(Math.round(Number(ev.dialStart))); else paint(value);
      return api;
    },
    setStep(n) { if (Number(n) > 0) step = Math.round(Number(n)); return api; },
    setCap(n) { if (Number(n) > 1) { cap = Number(n); paint(value); } return api; },
    pulse() { // free spin carry-over: badge pulses with a KEPT tag
      if (level() === 'full') { root.classList.remove('mm-pulse'); void root.offsetWidth; root.classList.add('mm-pulse'); later(() => root.classList.remove('mm-pulse'), 1600); }
      kept.classList.remove('on'); void kept.offsetWidth; kept.classList.add('on');
      return api;
    },
    max() { isMax = true; paint(value); if (level() !== 'still') restart(root, 'mm-flash', 320); play('meter', { level: value, max: true }); return api; },
    // hiding the dial ends the feature: the next feature starts from the defaults again unless its missionAssigned says otherwise
    // (v1 books never send one). reset() keeps the mission because the player resets the dial when it starts, after missionAssigned.
    show(on = true) { root.hidden = !on; if (on) layout(); else clearMission(); return api; },
    reset() { isMax = false; paint(1); return api; },
    clearMission() { clearMission(); return api; },
    get value() { return value; },
    get band() { return band.id; },
    get step() { return step; },
    get cap() { return cap; },
    el: root,
    destroy() {
      timers.forEach(clearTimeout); timers = [];
      [mqTiny, mqPort].forEach((m) => { if (m.removeEventListener) m.removeEventListener('change', onMq); else if (m.removeListener) m.removeListener(onMq); });
      try { if (ro) ro.disconnect(); } catch (e) { /* ignore */ }
      root.remove();
    },
  };
  paint(1);
  return api;
}
export default createMeter;
