// Agent Mambo v2: the QUALITY GOVERNOR (SYNTHESIS 5 "Systems": EMA frame time > 24 ms: fewer particles; > 40 ms: Calm; WP5).
//
// A device that cannot keep up gets lighter effects automatically. It never writes the player's settings (src/settings.js is the
// one preference store and the player's choice stays what it is); it only publishes a ceiling that the effect modules combine with
// the motion store (render/motion.js):
//
//   import { quality, createQuality, QUALITY } from './quality.js';
//   quality.sample(dtMs)        feed one frame delta (fx.js feeds every frame of its loop; any rAF loop may feed it)
//   quality.tier                'full' | 'lite' | 'calm'
//   quality.ema                 smoothed frame time (ms)
//   quality.particles           particle gain ceiling: 1 | 0.5 | 0.4 (multiply with motion.particles)
//   quality.calm                true when the device is too slow for Full effects (treat Full as Calm: no rotation, no hit-stop,
//                               no push-in, shake x0.25); never touches durations
//   quality.count(n)            n scaled by `particles` (>= 1 when n > 0)
//   quality.effective(motion)   -> { level, particles, shake, rotation, hitStop, pushIn } = min(player's motion level, device tier)
//   quality.subscribe(fn)       fn(state) when the tier changes; returns the unsubscribe function
//   <html data-quality>         'full' | 'lite' | 'calm' (lite: CSS idle loops of the symbols pause; calm: scene loops stop too)
//   quality.sampleLag(lagMs)    feed the lateness of a timer tick (a 12 fps setTimeout loop): counted as a frame of 16.7 + lag ms
//   quality.drive(on)           a module that runs its own 12 fps timer loop and feeds sampleLag() (fx.js) declares it here: while
//                               one is driving, the probe below does not run (ONE loop on the page, no second timer, no rAF)
//   quality.monitor() / stop()  run (or stop) the probe, e.g. while a book plays
//   quality.keepAlive(ms)       run the probe for at least ms more (wire.js calls it; the probe stops itself)
//
// The probe is a setTimeout loop on the 12 fps grid (83 ms) that measures how late each tick fires. It never uses
// requestAnimationFrame: a rAF loop forces a frame every vsync even when nothing on screen changes, which is exactly the cost the
// governor is meant to cut on a slow device.
//
// Hysteresis so that the tier does not flap: enter 'lite' above 24 ms, leave below 20 ms; enter 'calm' above 40 ms, leave below
// 30 ms; a tier only DROPS after the EMA has been over the line for `holdFrames` samples and only RISES again after `recoverMs` of
// good frames. Deltas over 250 ms (tab hidden, GC pause, breakpoint) and the first frame of a loop are ignored.

export const QUALITY = Object.freeze({
  alpha: 0.1,          // EMA weight of a new sample
  liteIn: 24, liteOut: 20,
  calmIn: 40, calmOut: 30,
  holdFrames: 12,
  recoverMs: 2500,
  maxDt: 250,
  gains: Object.freeze({ full: 1, lite: 0.5, calm: 0.4 }),
  frameMs: 1000 / 60,  // a lag sample counts as one display frame plus the lag
  probeMs: 1000 / 12,  // probe period (the limited-animation grid)
});

const LEVEL_RANK = { full: 0, calm: 1, still: 2 };

export function createQuality(opts = {}) {
  const now = typeof opts.now === 'function' ? opts.now : () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
  const C = { ...QUALITY, ...(opts.config || {}) };
  let ema = 16.7, tier = 'full', over = 0, goodSince = -1, samples = 0;
  const subs = new Set();
  let timer = 0, due = 0, until = Infinity, drivers = 0;
  const hasTimers = opts.timers ? true : (typeof window !== 'undefined' && typeof setTimeout === 'function');
  const setT = (opts.timers && opts.timers.setTimeout) || ((f, ms) => setTimeout(f, ms));
  const clearT = (opts.timers && opts.timers.clearTimeout) || ((id) => clearTimeout(id));
  const hidden = () => { try { return typeof document !== 'undefined' && document.hidden; } catch (e) { return false; } };

  // the tier is also written to <html data-quality="full|lite|calm"> so CSS loops can follow it (symbols.js, scene.js)
  const root = opts.root !== undefined ? opts.root : (typeof document !== 'undefined' ? document.documentElement : null);
  const mark = () => { try { if (root && root.dataset) root.dataset.quality = tier; } catch (e) { /* ignore */ } };
  mark();
  function setTier(next) {
    if (next === tier) return;
    tier = next;
    mark();
    const s = api.state;
    for (const fn of [...subs]) { try { fn(s); } catch (e) { /* ignore */ } }
  }
  function decide() {
    const t = now();
    const want = ema > C.calmIn ? 'calm' : ema > C.liteIn ? 'lite' : null;
    const rank = { full: 0, lite: 1, calm: 2 };
    if (want && rank[want] > rank[tier]) {
      over++; goodSince = -1;
      if (over >= C.holdFrames) { over = 0; setTier(want); }
      return;
    }
    over = 0;
    // recovery: one tier up after recoverMs below the "out" line of the current tier
    const below = tier === 'calm' ? ema < C.calmOut : tier === 'lite' ? ema < C.liteOut : false;
    if (!below) { goodSince = -1; return; }
    if (goodSince < 0) goodSince = t;
    if (t - goodSince >= C.recoverMs) { goodSince = -1; setTier(tier === 'calm' ? 'lite' : 'full'); }
  }

  function tick() {
    timer = 0;
    const t = now();
    if (!hidden()) api.sampleLag(t - due);
    if (drivers > 0 || t > until) { if (t > until) until = Infinity; return; }
    due = t + C.probeMs; timer = setT(tick, C.probeMs);
  }
  function start() {
    if (timer || drivers > 0 || !hasTimers) return api;
    due = now() + C.probeMs; timer = setT(tick, C.probeMs);
    return api;
  }
  function halt() { if (timer) clearT(timer); timer = 0; }
  const api = {
    sample(dt) {
      const d = Number(dt);
      if (!(d > 0) || d > C.maxDt) return api;
      samples++;
      ema = ema * (1 - C.alpha) + d * C.alpha;
      decide();
      return api;
    },
    /** lateness (ms) of a tick of a 12 fps timer loop -> one frame sample of frameMs + lag */
    sampleLag(lag) { const l = Number(lag); if (!Number.isFinite(l)) return api; return api.sample(C.frameMs + Math.max(0, l)); },
    /** a module with its own timer loop feeding sampleLag() starts (true) / stops (false) driving; the probe yields meanwhile */
    drive(on) {
      if (on) { drivers++; halt(); return api; }
      drivers = Math.max(0, drivers - 1);
      if (!drivers && until !== Infinity && now() < until) start();
      return api;
    },
    get driven() { return drivers > 0; },
    get ema() { return ema; },
    get samples() { return samples; },
    get tier() { return tier; },
    get calm() { return tier === 'calm'; },
    get particles() { return C.gains[tier]; },
    get state() { return Object.freeze({ tier, ema, particles: C.gains[tier], calm: tier === 'calm' }); },
    count(n) {
      const v = Number(n); if (!(v > 0)) return 0;
      const g = C.gains[tier];
      return g >= 1 ? Math.round(v) : Math.max(1, Math.round(v * g));
    },
    /** Combine the player's motion state (motion.js shape) with the device tier: the lower of the two wins. */
    effective(m = {}) {
      const lvl = m && LEVEL_RANK[m.level] != null ? m.level : 'full';
      const level = tier === 'calm' && LEVEL_RANK[lvl] < LEVEL_RANK.calm ? 'calm' : lvl;
      const mp = m && typeof m.particles === 'number' ? m.particles : 1;
      const downgraded = level !== lvl;
      return Object.freeze({
        level,
        particles: Math.min(mp, C.gains[tier]),
        shake: downgraded ? Math.min(typeof m.shake === 'number' ? m.shake : 1, 0.25) : (typeof m.shake === 'number' ? m.shake : 1),
        rotation: downgraded ? false : m.rotation !== false,
        hitStop: downgraded ? false : m.hitStop !== false,
        pushIn: downgraded ? false : m.pushIn !== false,
      });
    },
    subscribe(fn) { if (typeof fn !== 'function') return () => {}; subs.add(fn); return () => { subs.delete(fn); }; },
    monitor() { until = Infinity; return start(); },
    /** keep the probe for at least ms more (wire.js calls it when a wire plays; the probe stops itself afterwards) */
    keepAlive(ms = 3000) { const end = now() + Math.max(0, Number(ms) || 0); if (until === Infinity && !timer) until = end; else if (until !== Infinity) until = Math.max(until, end); return start(); },
    get monitoring() { return !!timer || drivers > 0; },
    stop() { halt(); until = Infinity; return api; },
    reset() { ema = 16.7; over = 0; goodSince = -1; samples = 0; setTier('full'); return api; },
  };
  return api;
}

export const quality = createQuality();
export default quality;
