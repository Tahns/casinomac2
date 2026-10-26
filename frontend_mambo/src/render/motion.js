// Agent Mambo v2: the motion store CONSUMER (SYNTHESIS 5 "Systems", juice research S1 and the section 7 matrix; WP4 owns this file).
//
// src/settings.js is the ONE preference store (WP1). This module only READS it: it never stores, never writes a setting, never opens
// a storage key. It subscribes to the derived keys `motionLevel` ('full' | 'calm' | 'still', Auto already resolved against
// prefers-reduced-motion by the store) and `flashReduced` (the "Screen flash effects" switch, or the OS reduced-motion default), and
// turns them into the numbers every JS-driven animation of the renderer reads at the point of use.
//
//   motion.level          'full' | 'calm' | 'still'
//   motion.reduced        level !== 'full' (replaces the 13 `REDUCE` consts of v1; read it when you need it, it follows the menu live)
//   motion.flashMode      'flash' (cream / lemon, peak <= .5, at most 2 per second) | 'dissolve' (one 167 ms fade, peak <= .25) | 'none' (Still)
//   motion.shake          camera shake gain: 1 | .25 | 0       motion.rotation    camera rotation allowed (Full only)
//   motion.hitStop        hit-stop allowed (Full only)         motion.pushIn      camera push-in / parallax / scale pops allowed (Full only)
//   motion.particles      particle count gain: 1 | .4 | 0      motion.count(n)    n scaled by that gain, rounded, >= 1 when the gain is > 0
//   motion.subscribe(fn)  fn(state) after every change; returns the unsubscribe function
//
// Calm and Still REPLACE motion, they never shorten a round: nothing in this module changes a duration the player waits for.
import { settings as defaultSettings } from '../settings.js';

const GAINS = Object.freeze({
  full: Object.freeze({ shake: 1, rotation: true, hitStop: true, pushIn: true, particles: 1 }),
  calm: Object.freeze({ shake: 0.25, rotation: false, hitStop: false, pushIn: false, particles: 0.4 }),
  still: Object.freeze({ shake: 0, rotation: false, hitStop: false, pushIn: false, particles: 0 }),
});

export function motionStateFrom(levelIn, flashReducedIn) {
  const level = levelIn === 'calm' || levelIn === 'still' ? levelIn : 'full';
  const g = GAINS[level];
  const flashMode = level === 'still' ? 'none' : (level === 'calm' || flashReducedIn ? 'dissolve' : 'flash');
  return Object.freeze({
    level, reduced: level !== 'full', flashReduced: !!flashReducedIn, flashes: flashMode === 'flash', flashMode,
    shake: g.shake, rotation: g.rotation, hitStop: g.hitStop, pushIn: g.pushIn, particles: g.particles,
  });
}

/** Build a store on any object with get(key) / on(key, fn) (the real settings, or a stub in a test). */
export function createMotion(src = defaultSettings) {
  const read = (k) => { try { return src && typeof src.get === 'function' ? src.get(k) : undefined; } catch (e) { return undefined; } };
  let state = motionStateFrom(read('motionLevel'), read('flashReduced'));
  const subs = new Set();
  const offs = [];
  function refresh() {
    const next = motionStateFrom(read('motionLevel'), read('flashReduced'));
    if (next.level === state.level && next.flashReduced === state.flashReduced) return;
    state = next;
    for (const fn of [...subs]) { try { fn(state); } catch (e) { /* a subscriber must never break the store */ } }
  }
  for (const k of ['motionLevel', 'flashReduced']) {
    try { if (src && typeof src.on === 'function') { const off = src.on(k, refresh); if (typeof off === 'function') offs.push(off); } } catch (e) { /* ignore */ }
  }
  return {
    get state() { return state; },
    get level() { return state.level; },
    get reduced() { return state.reduced; },
    get flashMode() { return state.flashMode; },
    get flashes() { return state.flashes; },
    get shake() { return state.shake; },
    get rotation() { return state.rotation; },
    get hitStop() { return state.hitStop; },
    get pushIn() { return state.pushIn; },
    get particles() { return state.particles; },
    /** n particles scaled by the level: Full n, Calm 40%, Still 0 (a positive request keeps at least 1 piece while particles are on). */
    count(n) {
      const v = Number(n); if (!(v > 0) || !(state.particles > 0)) return 0;
      return state.particles >= 1 ? Math.round(v) : Math.max(1, Math.round(v * state.particles));
    },
    subscribe(fn) { if (typeof fn !== 'function') return () => {}; subs.add(fn); return () => { subs.delete(fn); }; },
    dispose() { for (const off of offs.splice(0)) { try { off(); } catch (e) { /* ignore */ } } subs.clear(); },
  };
}

export const motion = createMotion();
export default motion;
