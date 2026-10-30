// Heroine (WP3): the director. Turns reactions (mascot.react(kind, info), the legacy setPose names) into rig calls.
//
// It owns the arbitration (priorities, cooldowns, the dead-spin streak), the motion level (Full / Calm / Still), the outfit lock (a
// costume change behind the folding screen must never be cut: the screen would stay on), and the hold timers. It talks to the rig
// only through the small surface used below, so the tests drive it with a fake rig in node. DOM-free, never throws out of react().
//
//   rig surface: play(def, { speed, hold, onEnd }), stop(), setPose(name, { snap }), setLook(target), setOutfit(key, { animated }),
//                setReduced(bool), blink(kind), outfit (getter)
import {
  WHITELIST, GAGS, LEGACY_POSE, STILL_HOLD, BASE_OUTFIT, OUTFITS, POSE_FIX, plan, buildClip, clipDuration, hasPose, pickOutfit,
} from './clips.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const MOTIONS = ['full', 'calm', 'still'];

export function createDirector({
  rig, getMotion = () => 'full', now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now()),
  setTimer = (f, ms) => setTimeout(f, ms), clearTimer = (h) => clearTimeout(h), rand = Math.random, onFail = () => {}, onInfo = () => {}, log = null,
  getJumpMax = () => undefined,
} = {}) {
  let destroyed = false, seq = 0, cur = null, lock = null, deadStreak = 0, motion = null, legacy = 'idle';
  const lastAt = Object.create(null);
  const timers = new Set();
  const after = (ms, fn) => { const h = setTimer(() => { timers.delete(h); if (!destroyed) fn(); }, ms); timers.add(h); return h; };
  const cancel = (h) => { if (h != null) { clearTimer(h); timers.delete(h); } };
  const trace = (...a) => { if (log) log(...a); };
  const level = () => { const m = getMotion(); return MOTIONS.includes(m) ? m : 'full'; };

  const guard = (fn, dflt = false) => { try { return fn(); } catch (e) { try { onFail(e); } catch (e2) { /* ignore */ } return dflt; } };
  const look = (name) => guard(() => rig.setLook(name));
  const rigOutfit = () => { try { return rig.outfit; } catch (e) { return null; } };

  function clearCur() { if (cur) { cancel(cur.holdTimer); cancel(cur.stillTimer); } cur = null; }
  /** Back to the rest pose, eyes on the grid. Never cuts a costume change. */
  function release() {
    if (lock && now() < lock.until) return false;
    clearCur();
    guard(() => { if (level() === 'still') rig.setPose('idle', { snap: true }); else rig.stop(); });
    look('grid');
    return true;
  }
  const drop = () => { if (cur && cur.holding) release(); return false; };

  function finish(token) {
    if (!cur || cur.token !== token) return;
    const then = cur.then; clearCur();
    look('grid');
    if (then) guard(then);
  }

  function speedFor(def, info, holding) {
    const base = level() === 'calm' ? 0.9 : 1;
    if (info && Number.isFinite(info.speed) && info.speed > 0) return clamp(info.speed, 0.5, 2.5);
    if (info && Number.isFinite(info.ms) && info.ms > 0 && !holding) return clamp(Math.max(base, (clipDuration(def) * 1000) / info.ms), 0.5, 2.5);
    return base;
  }

  // ---- static pose (Still): one pose, held, then back to rest; no clip, no particle, no spring
  function startStill(p, t, then) {
    if (!hasPose(p.pose)) return false;
    const token = ++seq;
    const holdMs = p.hold || STILL_HOLD[p.kind] || 1800;
    clearCur();
    guard(() => { rig.setPose(p.pose, { snap: true }); if (POSE_FIX[p.pose]) rig.set(POSE_FIX[p.pose], true); });
    look(p.look === 'spin' ? 'spin' : 'grid');
    cur = { token, kind: p.kind, prio: p.prio, clip: null, holding: true, until: t + holdMs, then };
    cur.stillTimer = after(holdMs, () => {
      if (!cur || cur.token !== token) return;
      guard(() => rig.setPose('idle', { snap: true }));        // back to rest first: a follow-up (the end costume) may pose again
      finish(token);
    });
    lastAt[p.clip || p.kind] = t;
    return true;
  }

  function startClip(p, info, t, then) {
    const m = level();
    if (!WHITELIST.has(p.clip)) return false;
    if (m === 'still') return startStill(p, t, then);
    const def = buildClip(p.clip, { level: m, neutral: p.neutral, windUp: p.windUp, jumpMax: getJumpMax(), accent: p.accent });
    if (!def) return false;
    const holding = !!def.hold;
    const speed = speedFor(def, info, holding);
    const token = ++seq;
    clearCur();
    const until = t + (holding ? p.hold || 8000 : (clipDuration(def) * 1000) / speed + 60);
    cur = { token, kind: p.kind, prio: p.prio, clip: p.clip, holding, until, then };
    lastAt[p.clip] = t; if (p.accent) lastAt['kind:' + p.kind] = t;
    const ok = guard(() => { rig.play(def, { speed, hold: holding, onEnd: () => finish(token) }); return true; });
    if (!ok) { cur = null; return false; }
    if (holding) cur.holdTimer = after(p.hold || 8000, () => { if (cur && cur.token === token) release(); });
    trace('clip', p.clip, speed);
    return true;
  }

  function doOutfit(key, info, t) {
    if (!key || !OUTFITS.includes(key)) return false;
    if (lock && t < lock.until) { if (lock.key !== key) lock.queued = { key, info }; return false; }
    if (key === rigOutfit()) return false;
    const m = level();
    clearCur();
    if (m === 'still') {          // an instant swap: nothing is ever in between
      guard(() => rig.setOutfit(key, { animated: false }));
      return startStill({ kind: 'outfit', prio: 6, pose: 'salute', hold: 1500, clip: null }, t, null);
    }
    const def = buildClip('outfitChange', { outfit: key, level: m });
    const speed = m === 'calm' ? 0.9 : 1;
    const token = ++seq;
    const until = t + (clipDuration(def) * 1000) / speed + 80;
    cur = { token, kind: 'outfit', prio: 6, clip: 'outfitChange', holding: false, until };
    lock = { until, key, queued: null };
    const ok = guard(() => { rig.play(def, { speed, onEnd: () => { finish(token); endLock(); } }); return true; });
    if (!ok) { cur = null; lock = null; return false; }
    after((until - t) + 20, endLock);
    trace('outfit', key);
    return true;
  }
  function endLock() {
    const l = lock; if (!l) return;
    lock = null;
    if (l.queued) doOutfit(l.queued.key, l.queued.info, now());
  }

  /** react(kind, info) -> true when a clip, a static pose or a costume change started. */
  function react(kind, info) {
    if (destroyed) return false;
    return guard(() => {
      const p = plan(kind, info);
      if (!p.ok) return false;
      const t = now();
      if (info && info.at) onInfo(info);
      if (p.mode === 'outfit') return doOutfit(p.outfit, info, t);
      if (lock && t < lock.until) return false;                       // a costume change in progress is never cut
      if (cur && !cur.holding && t < cur.until) {
        if (p.prio < cur.prio) return false;
        if (p.prio === cur.prio && p.kind === cur.kind) return false;
      }
      if (p.effective !== 'dead' && p.effective !== 'fizzle') deadStreak = 0;
      switch (p.mode) {
        case 'release': release(); return false;
        case 'quiet': {                                              // R <= C: the hold ends, one slow blink, nothing else
          release();
          if (level() === 'full') guard(() => rig.blink('slow'));
          return false;
        }
        case 'gag': return gag(t);
        case 'dead': {
          deadStreak++;
          if (deadStreak % p.every !== 0) { release(); return false; }
          if (t - (lastAt[p.clip] || -1e9) < p.cooldown) return drop();
          return startClip(p, info, t) || drop();
        }
        default: break;
      }
      // mission beats that borrow a clip (accent set) keep their own cooldown, so a spotlight is not refused because the dial just pointed
      const ck = p.accent ? 'kind:' + p.kind : p.clip;
      if (p.cooldown && p.prio < 4 && t - (lastAt[ck] || -1e9) < p.cooldown) return drop();
      if (p.kind === 'trigger' && p.outfit && p.outfit !== rigOutfit()) return doOutfit(p.outfit, info, t) || drop();
      const then = p.kind === 'end' ? () => { if (rigOutfit() !== BASE_OUTFIT) doOutfit(BASE_OUTFIT, null, now()); } : null;
      return startClip(p, info, t, then) || drop();
    });
  }

  function gag(t) {
    if (level() === 'still') return false;
    if (cur && !cur.holding && t < cur.until) return false;
    const pool = GAGS.filter((g) => !(g === 'blowWhistle' && rigOutfit() !== BASE_OUTFIT));
    const name = pool[Math.floor(rand() * pool.length) % pool.length];
    return startClip({ kind: 'gag', prio: 0, clip: name, windUp: true, hold: 0 }, null, t, null);
  }

  /** Legacy v1 pose names (createMascot().setPose). Returns the pose name now shown. */
  function setPose(name) {
    const n = Object.prototype.hasOwnProperty.call(LEGACY_POSE, name) ? name : 'idle';
    legacy = n;
    if (destroyed || (lock && now() < lock.until)) return legacy;
    if (n === 'think') {                                        // a held, neutral pose (loading screen, free-spin base)
      clearCur(); guard(() => { rig.setPose('think', { snap: level() === 'still' }); rig.set(POSE_FIX.think, level() === 'still'); }); look('grid');
      cur = { token: ++seq, kind: 'think', prio: 0, clip: null, holding: true, until: Infinity };
      return legacy;
    }
    react(LEGACY_POSE[n], { legacy: true });
    return legacy;
  }

  function setMotion(m) {
    const next = MOTIONS.includes(m) ? m : 'full';
    if (next === motion) return;
    motion = next;
    guard(() => rig.setReduced(next === 'still'));
    if (!(lock && now() < lock.until)) release();
  }

  return {
    react, setPose, setMotion, release, gag: () => react('gag'),
    getPose: () => legacy,
    state: () => ({ cur: cur ? { kind: cur.kind, clip: cur.clip, holding: cur.holding, prio: cur.prio } : null, locked: !!(lock && now() < lock.until), deadStreak, motion: level() }),
    destroy() { destroyed = true; for (const h of timers) clearTimer(h); timers.clear(); cur = null; lock = null; },
  };
}
export { pickOutfit };
