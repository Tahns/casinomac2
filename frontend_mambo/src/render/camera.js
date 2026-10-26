// Agent Mambo v2: trauma camera and hit-stop (SYNTHESIS 5 "Systems", juice research S2 and S3; WP4 owns this file).
//
// Trauma shake (S2): a trauma value T in [0, 1] rises with events and decays linearly at 1.4 per second. The offset of the camera is
//   MAX * T^2 * noise, noise sampled and HELD for 83 ms steps (12 fps, the limited-animation grid of the art style),
//   MAX = 1.6% of the short side of the game, MAX rotation 0.8 degree, hard cap T <= 1, and every source that is not a tier beat or a
//   max-win stamp ("ambient": clusters, pops, the wire) is capped at T 0.5 TOGETHER.
//   Motion store: Calm = MAX x 0.25 and no rotation, Still = 0 (the loop does not even start).
// The camera writes the independent CSS properties `translate` and `rotate` of its targets (never `transform`), so it composes with
// every transform animation of the targets and nothing has to be restored but two inline properties.
//
// Hit-stop (S3): freeze(ms) pauses every running animation of the document (document.getAnimations()), holds the camera, tells
// the freeze listeners (a particle engine can hold its clock) and resumes after ms; audio keeps running.  Full motion only, at most
// one per 400 ms, never longer than 200 ms, never while another freeze runs. Calm and Still never freeze.
import { motion as defaultMotion } from './motion.js';

export const MAX_FRAC = 0.016;       // of the short side
export const MAX_ROT_DEG = 0.8;
export const DECAY_PER_S = 1.4;
export const NOISE_STEP_MS = 83;
export const AMBIENT_CAP = 0.5;
export const HIT_STOP_GAP_MS = 400;
export const HIT_STOP_MAX_MS = 200;

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/**
 * opts: targets () => Element[] (read at every frame, so late hosts work), motion (store), shortSide () => px, now () => ms,
 *       raf / caf (default window), rand () => [0,1), document (default global).
 */
export function createCamera(opts = {}) {
  const motion = opts.motion || defaultMotion;
  const doc = opts.document !== undefined ? opts.document : (typeof document !== 'undefined' ? document : null);
  const now = opts.now || (() => (typeof performance !== 'undefined' ? performance.now() : Date.now()));
  const raf = opts.raf || ((fn) => requestAnimationFrame(fn));
  const caf = opts.caf || ((id) => cancelAnimationFrame(id));
  const rand = opts.rand || Math.random;
  const shortSide = opts.shortSide || (() => (typeof window !== 'undefined' ? Math.min(window.innerWidth, window.innerHeight) : 600));
  const targets = opts.targets || (() => []);

  let tier = 0, ambient = 0;          // trauma by source class; total = min(1, tier + ambient)
  let loop = 0, last = 0, noiseAt = -1e9, nx = 0, ny = 0, nr = 0;
  let frozen = false, lastStop = -1e9, destroyed = false, offset = { x: 0, y: 0, rot: 0 }, current = [];
  const freezeFns = new Set();

  const total = () => Math.min(1, tier + ambient);
  function write(x, y, rot) {
    offset = { x, y, rot };
    let els = [];
    try { els = targets() || []; } catch (e) { els = []; }
    for (const el of els) {
      if (!el || !el.style) continue;
      try {
        el.style.translate = x || y ? `${x}px ${y}px` : '';
        el.style.rotate = rot ? `${rot.toFixed(3)}deg` : '';
      } catch (e) { /* ignore */ }
    }
  }
  function stop() { if (loop) { try { caf(loop); } catch (e) { /* ignore */ } } loop = 0; last = 0; write(0, 0, 0); }
  function tick(t) {
    loop = 0;
    if (destroyed) return;
    if (frozen) { last = t; loop = raf(tick); return; }   // the camera holds still during a hit-stop
    const dt = last ? Math.min(0.1, Math.max(0, (t - last) / 1000)) : 0;
    last = t;
    tier = Math.max(0, tier - DECAY_PER_S * dt);
    ambient = Math.max(0, ambient - DECAY_PER_S * dt);
    const T = total();
    if (T <= 0 || !(motion.shake > 0)) { stop(); return; }
    if (t - noiseAt >= NOISE_STEP_MS) { noiseAt = t; nx = rand() * 2 - 1; ny = rand() * 2 - 1; nr = rand() * 2 - 1; }
    const k = T * T;
    const max = MAX_FRAC * shortSide() * motion.shake;
    write(Math.round(max * k * nx), Math.round(max * k * ny), motion.rotation ? MAX_ROT_DEG * k * nr : 0);
    loop = raf(tick);
  }

  const api = {
    /** Add trauma (0..1). tier = true for tier beats and the max-win stamp; the rest ("ambient") is capped at 0.5 together. */
    add(amount, o = {}) {
      const a = Number(amount);
      if (destroyed || !(a > 0) || !(motion.shake > 0)) return false;
      if (o && o.tier) tier = Math.min(1, tier + a); else ambient = Math.min(AMBIENT_CAP, ambient + a);
      if (!loop) { last = 0; loop = raf(tick); }
      return true;
    },
    /** v1 compatible shake(amp, ms): amp 1.5 (the wire blast) is trauma .55; ms is ignored, the decay sets the length. */
    shake(amp) {
      const a = clamp(Number(amp) * 0.37, 0, 1);
      return api.add(a, { tier: a > AMBIENT_CAP });
    },
    get trauma() { return total(); },
    get offset() { return offset; },
    get frozen() { return frozen; },
    /** Pause every running animation for ms (hit-stop). Resolves true when a freeze really happened. Never throws. */
    async freeze(ms) {
      const d = clamp(Number(ms) || 0, 0, HIT_STOP_MAX_MS);
      if (destroyed || !doc || !(d > 0) || !motion.hitStop || frozen) return false;
      const t0 = now();
      if (t0 - lastStop < HIT_STOP_GAP_MS) return false;
      lastStop = t0;
      let list = [];
      try { list = doc.getAnimations().filter((a) => a.playState === 'running'); } catch (e) { list = []; }
      frozen = true; current = list;
      for (const a of list) { try { a.pause(); } catch (e) { /* ignore */ } }
      for (const fn of [...freezeFns]) { try { fn(true); } catch (e) { /* ignore */ } }
      try { await new Promise((r) => setTimeout(r, d)); } finally { resume(list); }
      return true;
    },
    /** fn(true) when a hit-stop starts, fn(false) when it ends (a particle engine can hold its clock). Returns the unsubscribe function. */
    onFreeze(fn) { if (typeof fn !== 'function') return () => {}; freezeFns.add(fn); return () => { freezeFns.delete(fn); }; },
    /** Drop all trauma and put the targets back at rest. */
    reset() { tier = 0; ambient = 0; stop(); },
    destroy() { destroyed = true; tier = 0; ambient = 0; stop(); if (frozen) resume(current); freezeFns.clear(); },
  };
  function resume(list) {
    for (const a of list) { try { if (a.playState === 'paused') a.play(); } catch (e) { /* ignore */ } }
    frozen = false;
    for (const fn of [...freezeFns]) { try { fn(false); } catch (e) { /* ignore */ } }
  }
  // follow the motion store: Still removes any residual offset at once
  try { motion.subscribe(() => { if (!(motion.shake > 0)) { tier = 0; ambient = 0; if (loop) stop(); } }); } catch (e) { /* ignore */ }
  return api;
}

export default createCamera;
