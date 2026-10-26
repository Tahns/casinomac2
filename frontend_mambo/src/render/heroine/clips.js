// Heroine (WP3): the reaction vocabulary, the clip whitelist and the clip transforms. Pure data and pure functions: no DOM, no timers,
// so the whole mapping is unit tested in node (tests/heroine). Imports only the rig's DOM-free tables.
//
// Rules this file enforces (SYNTHESIS 5 animation 1, lever 5 / 11, Engine [217], UKGC RTS 14F):
//  - only WHITELISTED clips can ever play (no hairFlip, no impatient, no laugh); the rig's own idle director is fed the same list;
//  - `shock` has exactly one entry: the `blast` reaction (a real fuseBlast); nothing else starts it, nothing legacy maps to it;
//  - a win-like reaction at a return that does not exceed the cost (ratio <= 1 or level 0) is turned into the quiet one;
//  - every reaction clip starts with an 83 ms wind-up (one frame of the 12 Hz primary channels) and may carry layered accents;
//  - Calm drops jumps, spins and heavy particles, Still never plays a clip (a static pose from STILL_POSE is held instead).
import { CLIPS, POSES, OUTFIT_KEYS } from './mambo_rig.js';

export const WIND_UP = 0.083;                  // seconds: one frame at 12 Hz
// The rig's `anticipation` pose lifts the right glove onto her cheek and mouth, which reads as a finger to the lips ([217]: not allowed).
// Wherever that pose is used (clips and the static Still version) these overrides move the hand out to the side, pointing at the grid.
export const POSE_FIX = Object.freeze({
  anticipation: Object.freeze({ arx: 300, ary: 250, gr: 'point', arb1: 30, arb2: 10 }),
  think: Object.freeze({ arx: 300, ary: 250, gr: 'point', arb1: 30, arb2: 10 }),
});
// A jump may rise this fast (rig units per second; the peak is v^2 / 4800 = 102 art units) so the head stays inside the box and its 18% headroom
export const JUMP_MAX = 700;
export const BASE_OUTFIT = 'inspectrice';
// the five costumes; `vault` is reserved (the Long Fuse fallback), nothing maps to it unless a mission asks for it by name
export const OUTFITS = Object.freeze(OUTFIT_KEYS.slice());
export const MISSION_OUTFIT = Object.freeze({ briefing: 'lab', orders: 'trench', blackout: 'casino', fuse: 'vault' });

// Clips the heroine may play (rig clip names). Anything else is refused by the director.
export const WHITELIST = Object.freeze(new Set([
  'spinStart', 'scatterTease', 'winSmall', 'winBig', 'megaWin', 'shock', 'lose', 'freeSpinStart', 'freeSpinEnd', 'curtsy', 'meterMilestone',
  'checkFlashlight', 'blowWhistle', 'examineNails', 'glancePlayer', 'shiftWeight', 'outfitChange', 'quietBlink',
]));
// Clips that are never allowed, with the reason (tests assert both lists stay disjoint and complete against the rig's CLIPS).
export const BLOCKED = Object.freeze({
  hairFlip: 'the spec bans it (SYNTHESIS 5.1): flirty, and it reads as a fishing for attention',
  impatient: 'pushes the player to spin (pressure); the director never nags',
  laugh: 'nothing in the event map needs it',
});
// idle gags (the `gag` reaction picks one; blowWhistle only in the base outfit that owns a whistle)
export const GAGS = Object.freeze(['checkFlashlight', 'blowWhistle', 'examineNails', 'glancePlayer', 'shiftWeight']);

// ---- the reaction table. prio: higher beats lower while a clip is playing; hold: ms a held pose may last when nobody releases it;
// cooldown: min ms between two starts of the same clip (prio >= 4 ignores it); pose: the static pose used when motion is Still.
export const KINDS = Object.freeze({
  idle:       { prio: 0, mode: 'release' },
  spin:       { prio: 1, clip: 'spinStart', hold: 8000, pose: 'idle', windUp: false, look: 'spin' },
  anticipate: { prio: 2, clip: 'scatterTease', hold: 12000, pose: 'anticipation' },
  quiet:      { prio: 0, mode: 'quiet' },
  dead:       { prio: 1, mode: 'dead', clip: 'lose', pose: 'shrug', every: 3, cooldown: 6000 },
  win:        { prio: 2, clip: 'winSmall', pose: 'smallwin', cooldown: 1800, look: 'cluster', celebratory: true },
  bigwin:     { prio: 4, clip: 'winBig', pose: 'bigwin', look: 'cluster', celebratory: true },
  epic:       { prio: 5, clip: 'megaWin', pose: 'bigwin', look: 'cluster', celebratory: true },
  blast:      { prio: 3, clip: 'shock', pose: 'shock', cooldown: 2500, real: true },
  fizzle:     { prio: 1, clip: 'lose', pose: 'shrug', cooldown: 6000 },
  trigger:    { prio: 4, clip: 'freeSpinStart', pose: 'salute' },
  retrigger:  { prio: 2, clip: 'winSmall', pose: 'smallwin', cooldown: 1800 },
  end:        { prio: 4, clip: 'freeSpinEnd', pose: 'curtsy' },
  outfit:     { prio: 6, mode: 'outfit' },
  meter:      { prio: 1, clip: 'meterMilestone', pose: 'point', cooldown: 2500 },
  gag:        { prio: 0, mode: 'gag' },
});
export const KIND_NAMES = Object.freeze(Object.keys(KINDS));
// the ten clip targets of the acceptance test: reaction kind that must start them
export const TEN_CLIPS = Object.freeze({
  spinStart: 'spin', scatterTease: 'anticipate', winSmall: 'win', winBig: 'bigwin', megaWin: 'epic', shock: 'blast', lose: 'fizzle',
  freeSpinStart: 'trigger', meterMilestone: 'meter', idleGag: 'gag',
});
// how long a static pose stays on screen in Still (ms); holds (spin, anticipate) last until released or KINDS[k].hold
export const STILL_HOLD = Object.freeze({ win: 1800, retrigger: 1800, bigwin: 2600, epic: 2600, blast: 1800, fizzle: 1800, dead: 1800, trigger: 2600, end: 2600, meter: 1800 });

// legacy v1 pose names (createMascot().setPose) -> reaction kind. 'shock' is NOT a shock any more: the v1 renderer called it for the
// anticipation and for the scatter landing, neither of which is the blast, so it becomes the leaning-in tease.
export const LEGACY_POSE = Object.freeze({
  idle: 'idle', think: 'think', happy: 'win', bigwin: 'bigwin', celebrate: 'epic', shock: 'anticipate', plunger: 'trigger', shrug: 'dead', dance: 'idle',
});
export const LEGACY_POSES = Object.freeze(Object.keys(LEGACY_POSE));

// ---------------------------------------------------------------------------------------------------- clip data helpers
/** Flatten a rig clip (named tracks or events) to a sorted event list, exactly like the rig's compileClip. */
export function toEvents(def) {
  if (def.events) return def.events.map((e) => ({ ...e })).sort((a, b) => a.at - b.at);
  const ev = new Map();
  for (const [track, keys] of Object.entries(def.tracks || {})) for (const k of keys) { const e = ev.get(k[0]) || { at: k[0] }; e[track] = k[1]; Object.assign(e, k[2] || {}); ev.set(k[0], e); }
  return [...ev.values()].sort((a, b) => a.at - b.at);
}
const clone = (def, name) => ({ name, dur: def.dur, endPose: def.endPose, hold: !!def.hold, events: toEvents(def) });
const FX_CALM = new Set(['sparkles', 'ring', 'notes', 'paraventIn', 'paraventOut']);
const FX_NEUTRAL = new Set(['paraventIn', 'paraventOut']);

/** Calm: no jumps, spins, cap pops, shakes or heavy particles; poses, looks, winks and light sparkles stay. */
export function calmify(def) {
  const events = def.events.map((e) => {
    const o = { ...e };
    delete o.impulse; delete o.spin; delete o.spinDur;
    if (o.fx && !FX_CALM.has(o.fx)) { delete o.fx; delete o.fxOpts; } else if (o.fx === 'sparkles') o.fxOpts = { n: Math.min(2, (o.fxOpts && o.fxOpts.n) || 3) };
    if (o.set) { const s = { ...o.set }; delete s.cy; delete s.cr; o.set = s; }
    return o;
  }).filter((e) => Object.keys(e).length > 1);
  return { ...def, events };
}
/** Neutral (a result that does not exceed the cost): no particles, no wink, no jump. Used by the quiet debrief. */
export function neutralize(def) {
  const events = def.events.map((e) => {
    const o = { ...e };
    delete o.impulse; delete o.spin; delete o.spinDur; delete o.wink; delete o.winkDur;
    if (o.fx && !FX_NEUTRAL.has(o.fx)) { delete o.fx; delete o.fxOpts; }
    return o;
  }).filter((e) => Object.keys(e).length > 1);
  return { ...def, events };
}
/** Prepend the 83 ms wind-up: a one-frame squash, then the clip (every event, cue included, shifted by WIND_UP). */
export function withWindUp(def) {
  const events = [{ at: 0, impulse: { sq: -0.9 } }, ...def.events.map((e) => ({ ...e, at: +(e.at + WIND_UP).toFixed(4) }))];
  return { ...def, dur: +(def.dur + WIND_UP).toFixed(4), events };
}
/** Cap every jump impulse at vmax (0 removes the jumps): the heroine lives in a box, a jump must not leave it. */
export function limitJump(def, vmax) {
  const events = def.events.map((e) => {
    if (!e.impulse || !('jump' in e.impulse)) return e;
    const imp = { ...e.impulse };
    if (!(vmax > 0)) delete imp.jump; else imp.jump = Math.min(imp.jump, vmax);
    return { ...e, impulse: imp };
  });
  return { ...def, events };
}
/** Layer accents (extra events, e.g. a glance at the winning cluster) over a clip, time-sorted. */
export function withAccents(def, accents) {
  const events = [...def.events, ...accents.map((a) => ({ ...a }))].sort((a, b) => a.at - b.at);
  return { ...def, events };
}

// layered accents per clip (times are relative to the clip start BEFORE the wind-up shift)
const ACCENTS = {
  winSmall: [{ at: 0.05, look: 'cluster' }, { at: 0.9, look: 'cluster' }],
  winBig: [{ at: 0, look: 'cluster' }, { at: 1.5, look: 'player' }],
  megaWin: [{ at: 0, look: 'cluster' }, { at: 2.4, look: 'player' }],
  // pressing spin: the rig's anticipation pose is swapped for a ready stance (hand stays on the hip, a small lean), eyes on the button then the grid
  spinStart: [{ at: 0, pose: 'idle', keep: false, set: { lean: 6, hx: 8, htilt: -2, bRy: -6 }, look: 'spin' }, { at: 0.32, look: 'grid' }],
  scatterTease: [{ at: 0, set: { ...POSE_FIX.anticipation } }],
};
// the quiet beat (R <= C): one slow blink and the gaze back on the grid; no clip of the rig is involved
const QUIET_BLINK = { name: 'quietBlink', dur: 0.5, endPose: 'idle', events: [{ at: 0, pose: 'idle', blink: 'slow', look: 'grid' }] };
// the costume change behind the folding screen: opaque screen in, a puff at the swap (a poof, never a silhouette), screen out, salute.
// No confetti of garments and no spin in view (the head turn happens behind the screen); sober on purpose ([217]).
export function outfitChangeDef(key, level = 'full') {
  const full = level === 'full';
  return {
    name: 'outfitChange', dur: 1.9, endPose: 'idle', events: [
      { at: 0, pose: 'idle', look: 'player', cue: 'outfitChange' }, { at: 0.02, fx: 'paraventIn' },
      { at: 0.55, outfit: key, ...(full ? { impulse: { hair: 22, sq: 0.6 }, fx: 'puff' } : {}) },
      ...(full ? [{ at: 0.7, fx: 'sparkles', fxOpts: { n: 5 } }] : []),
      { at: 1.15, fx: 'paraventOut' }, { at: 1.3, pose: 'salute' }, { at: 1.7, look: 'grid' },
    ],
  };
}

/**
 * The def the director hands to rig.play(). name: a whitelisted clip; opt: { level: 'full'|'calm', neutral, windUp, outfit, jumpMax }.
 * Returns null for a name that is not whitelisted or unknown to the rig.
 */
export function buildClip(name, opt = {}) {
  if (!WHITELIST.has(name)) return null;
  const level = opt.level === 'calm' ? 'calm' : 'full';
  if (name === 'outfitChange') return outfitChangeDef(opt.outfit || BASE_OUTFIT, level);
  let def = name === 'quietBlink' ? QUIET_BLINK : CLIPS[name];
  if (!def) return null;
  def = clone(def, name);
  if (ACCENTS[name]) def = withAccents(def, ACCENTS[name]);
  if (opt.neutral) def = neutralize(def);
  if (level === 'calm') def = calmify(def);
  else def = limitJump(def, Number.isFinite(opt.jumpMax) ? opt.jumpMax : JUMP_MAX);
  if (opt.windUp !== false && name !== 'quietBlink') def = withWindUp(def);
  return def;
}
/** Clip duration in seconds (events and dur), 0 for a missing def. */
export const clipDuration = (def) => (def ? Math.max(def.dur || 0, ...(def.events || []).map((e) => e.at)) : 0);

/** Does a reaction at this payload count as "return above the cost"? Unknown or missing data counts as "yes" (the caller decided). */
export function exceedsCost(info) {
  if (!info || typeof info !== 'object') return true;
  if (Number.isFinite(info.level) && info.level <= 0) return false;
  if (Number.isFinite(info.ratio) && info.ratio <= 1) return false;
  return true;
}

/**
 * Pure planner. Turns (kind, info) into a plan; the director executes it. Never throws.
 *   { ok:false, why }                         unknown kind
 *   { ok:true, kind, mode, clip?, pose?, ... }
 */
export function plan(kind, info) {
  const k = typeof kind === 'string' && Object.prototype.hasOwnProperty.call(KINDS, kind) ? kind : null;
  if (!k) return { ok: false, why: 'unknown-kind' };
  let entry = KINDS[k], eff = k;
  const i = info && typeof info === 'object' ? info : {};
  // celebrate only above the cost: a win-like reaction with ratio <= 1 (or level 0) becomes the quiet beat
  if (entry.celebratory && !exceedsCost(i)) { eff = 'quiet'; entry = KINDS.quiet; }
  const out = { ok: true, kind: k, effective: eff, prio: entry.prio, mode: entry.mode || 'clip', clip: entry.clip || null, pose: entry.pose || null,
    hold: entry.hold || 0, cooldown: entry.cooldown || 0, every: entry.every || 0, look: entry.look || null, real: !!entry.real, windUp: entry.windUp !== false };
  if (out.mode === 'outfit') out.outfit = pickOutfit(i);
  if (k === 'trigger') { const o = pickOutfit(i); if (o) out.outfit = o; }
  if (k === 'end') { out.neutral = !exceedsCost(i); out.outfit = BASE_OUTFIT; }
  return out;
}
/** Outfit named by info.outfit, else by info.mission; null when neither is a known costume. */
export function pickOutfit(info) {
  const i = info && typeof info === 'object' ? info : {};
  if (typeof i.outfit === 'string' && OUTFITS.includes(i.outfit)) return i.outfit;
  if (typeof i.mission === 'string' && Object.prototype.hasOwnProperty.call(MISSION_OUTFIT, i.mission)) return MISSION_OUTFIT[i.mission];
  return null;
}
export const hasPose = (name) => Object.prototype.hasOwnProperty.call(POSES, name);
