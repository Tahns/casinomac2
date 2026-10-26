// Test doubles for the heroine director: a manual clock (now + timers) and a recording fake rig. No DOM, no timers of the host.
export function createClock(t0 = 1000) {
  let t = t0, id = 0; const q = new Map();
  return {
    now: () => t,
    setTimer(fn, ms) { const h = ++id; q.set(h, { at: t + ms, fn }); return h; },
    clearTimer(h) { q.delete(h); },
    // advance by ms, firing the timers that come due in order
    advance(ms) {
      const end = t + ms;
      for (;;) {
        let best = null; for (const [h, e] of q) if (e.at <= end && (!best || e.at < best[1].at)) best = [h, e];
        if (!best) break; q.delete(best[0]); t = Math.max(t, best[1].at); best[1].fn();
      }
      t = end;
    },
    pending: () => q.size,
  };
}

// A rig that records what the director asks for. play() keeps the def so a test can "run" it: end(name) calls the onEnd of the current clip.
export function createFakeRig(outfit = 'inspectrice') {
  const log = []; const r = { outfit, pose: 'idle', look: null, reduced: false, clip: null, played: [], log };
  r.play = (def, o = {}) => { r.clip = { def, o }; r.played.push(def.name); log.push(['play', def.name, o.speed, !!o.hold]); return def; };
  r.stop = () => { const c = r.clip; r.clip = null; r.pose = 'idle'; log.push(['stop']); if (c && c.o.onEnd) c.o.onEnd(); };
  r.setPose = (name, o) => { r.clip = null; r.pose = name; log.push(['pose', name, !!(o && o.snap)]); };
  r.set = (o, snap) => { r.overrides = { ...(r.overrides || {}), ...o }; log.push(['set', o, !!snap]); };
  r.setLook = (t) => { r.look = t; log.push(['look', t]); };
  r.setOutfit = (k, o) => { r.outfit = k; log.push(['outfit', k, o && o.animated]); };
  r.setReduced = (b) => { r.reduced = b; log.push(['reduced', b]); };
  r.blink = (k) => { log.push(['blink', k]); };
  r.finish = () => { const c = r.clip; if (!c) return false; r.clip = null; if (c.o.onEnd) c.o.onEnd(); return true; };
  // the rig applies `outfit` events while it plays; a test calls this to emulate the swap at 0.55 s of the change clip
  r.applyOutfitEvents = () => { const c = r.clip; if (!c) return; for (const e of c.def.events) if (e.outfit) r.outfit = e.outfit; };
  return r;
}
