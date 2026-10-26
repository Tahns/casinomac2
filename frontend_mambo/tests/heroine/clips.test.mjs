import test from 'node:test';
import assert from 'node:assert/strict';
import { CLIPS, POSES } from '../../src/render/heroine/mambo_rig.js';
import { REACT_KINDS } from '../../src/render/mascot.js';
import {
  KINDS, KIND_NAMES, TEN_CLIPS, WHITELIST, BLOCKED, GAGS, LEGACY_POSE, STILL_HOLD, WIND_UP, POSE_FIX, JUMP_MAX, OUTFITS, MISSION_OUTFIT, BASE_OUTFIT,
  plan, buildClip, calmify, neutralize, withWindUp, limitJump, toEvents, exceedsCost, pickOutfit, outfitChangeDef, clipDuration,
} from '../../src/render/heroine/clips.js';

const FROZEN_14 = ['idle', 'spin', 'anticipate', 'quiet', 'dead', 'win', 'bigwin', 'epic', 'blast', 'fizzle', 'trigger', 'retrigger', 'end', 'outfit'];

test('vocabulary: mascot.js REACT_KINDS = the 14 frozen step-0 kinds in order + the two appended ones, and the table covers exactly those', () => {
  assert.deepEqual(REACT_KINDS.slice(0, 14), FROZEN_14);
  assert.deepEqual(REACT_KINDS.slice(14), ['meter', 'gag']);
  assert.deepEqual([...KIND_NAMES].sort(), [...REACT_KINDS].sort());
  assert.ok(Object.isFrozen(REACT_KINDS) && Object.isFrozen(KINDS));
});

test('whitelist: blocked clips are disjoint from it, exist in the rig, and buildClip refuses them (hairFlip, impatient, laugh)', () => {
  for (const [name] of Object.entries(BLOCKED)) {
    assert.ok(CLIPS[name], `${name} is a rig clip`);
    assert.ok(!WHITELIST.has(name), name);
    assert.equal(buildClip(name), null, name);
  }
  assert.ok(BLOCKED.hairFlip);
  for (const name of WHITELIST) {
    if (name === 'outfitChange' || name === 'quietBlink') continue;
    assert.ok(CLIPS[name], `${name} exists in the rig`);
  }
  assert.equal(buildClip('nope'), null);
  assert.equal(buildClip(undefined), null);
  assert.equal(buildClip('__proto__'), null);
  assert.equal(buildClip('constructor'), null);
  for (const g of GAGS) assert.ok(WHITELIST.has(g), g);
  assert.ok(!GAGS.includes('hairFlip'));
});

test('every clip of the table is whitelisted and every clip the table names builds', () => {
  for (const [k, e] of Object.entries(KINDS)) {
    if (e.clip) { assert.ok(WHITELIST.has(e.clip), `${k} -> ${e.clip}`); const d = buildClip(e.clip); assert.ok(d && d.events.length, e.clip); }
    if (e.pose) assert.ok(Object.prototype.hasOwnProperty.call(POSES, e.pose), `${k} pose ${e.pose}`);
  }
});

test('the ten clip targets map to ten distinct reaction kinds, and plan() names the clip (idleGag = a gag)', () => {
  assert.equal(Object.keys(TEN_CLIPS).length, 10);
  assert.equal(new Set(Object.values(TEN_CLIPS)).size, 10);
  for (const [clip, kind] of Object.entries(TEN_CLIPS)) {
    const p = plan(kind, { level: 3, ratio: 30 });
    assert.ok(p.ok, kind);
    if (clip === 'idleGag') assert.equal(p.mode, 'gag'); else assert.equal(p.clip, clip, `${kind} -> ${clip}`);
  }
});

test('shock has exactly one entry: the blast. Nothing else, and no legacy pose, maps to it', () => {
  const shockKinds = Object.entries(KINDS).filter(([, e]) => e.clip === 'shock').map(([k]) => k);
  assert.deepEqual(shockKinds, ['blast']);
  assert.equal(KINDS.blast.real, true);
  for (const [pose, kind] of Object.entries(LEGACY_POSE)) assert.notEqual(kind, 'blast', pose);
  assert.equal(LEGACY_POSE.shock, 'anticipate');           // the v1 'shock' pose is now the leaning-in tease
  for (const g of GAGS) assert.notEqual(g, 'shock');
});

test('plan(): unknown, non-string and prototype kinds are refused without throwing', () => {
  for (const bad of [undefined, null, 42, {}, [], '', 'nope', 'WIN', '__proto__', 'constructor', 'toString', 'hasOwnProperty']) assert.deepEqual(plan(bad), { ok: false, why: 'unknown-kind' }, String(bad));
  assert.doesNotThrow(() => plan('win', null));
  assert.doesNotThrow(() => plan('win', 7));
  assert.doesNotThrow(() => plan('win', { ratio: 'x', level: {} }));
});

test('celebrate only above the cost: a win-like kind at ratio <= 1 or level 0 becomes the quiet beat', () => {
  for (const kind of ['win', 'bigwin', 'epic']) {
    assert.equal(plan(kind, { ratio: 0.4 }).mode, 'quiet', kind);
    assert.equal(plan(kind, { ratio: 1 }).mode, 'quiet', kind);
    assert.equal(plan(kind, { level: 0, ratio: 5 }).mode, 'quiet', kind);
    assert.equal(plan(kind, { ratio: 1.2 }).mode, 'clip', kind);
    assert.equal(plan(kind, { ratio: 1.2 }).clip, KINDS[kind].clip);
    assert.equal(plan(kind).mode, 'clip', `${kind} without info: the caller decided`);
  }
  // features are not a return: trigger / retrigger / end ignore the ratio (end only turns neutral)
  assert.equal(plan('trigger', { ratio: 0.2 }).mode, 'clip');
  assert.equal(plan('retrigger', { ratio: 0.2 }).mode, 'clip');
  assert.equal(plan('end', { ratio: 0.2 }).neutral, true);
  assert.equal(plan('end', { ratio: 4 }).neutral, false);
  assert.equal(plan('end').neutral, false);
  assert.equal(exceedsCost(null), true); assert.equal(exceedsCost({ ratio: NaN }), true); assert.equal(exceedsCost({ ratio: 1.0000001 }), true);
});

test('wind-up: 83 ms, one squash event first, every other event (cue included) shifted, duration extended', () => {
  for (const name of ['winSmall', 'winBig', 'megaWin', 'shock', 'lose', 'freeSpinStart', 'freeSpinEnd', 'meterMilestone', 'scatterTease']) {
    const raw = buildClip(name, { windUp: false }), d = buildClip(name);
    assert.equal(d.events[0].at, 0, name);
    assert.ok(d.events[0].impulse && d.events[0].impulse.sq < 0, name);
    assert.ok(d.events.slice(1).every((e) => e.at >= WIND_UP - 1e-9), name);
    assert.equal(d.events.length, raw.events.length + 1, name);
    assert.ok(Math.abs(d.dur - (raw.dur + WIND_UP)) < 1e-6, name);
    const cueRaw = raw.events.find((e) => e.cue), cue = d.events.find((e) => e.cue);
    if (cueRaw) assert.ok(Math.abs(cue.at - (cueRaw.at + WIND_UP)) < 1e-6, `${name} cue shifted`);
  }
  assert.equal(WIND_UP, 0.083);
  assert.equal(KINDS.spin.windUp, false);                  // spinStart has its own squash
});

test('accents are layered: wins glance at the cluster, the spin looks at the button then the grid, scatterTease keeps the hand off her face', () => {
  const w = buildClip('winSmall', { windUp: false });
  assert.ok(w.events.some((e) => e.look === 'cluster'));
  const s = buildClip('spinStart', { windUp: false });
  const looks = s.events.filter((e) => e.look).map((e) => e.look);
  assert.equal(looks[looks.length - 1], 'grid'); assert.ok(looks.includes('spin'));
  assert.equal(s.events.filter((e) => e.pose).pop().pose, 'idle');
  const t = buildClip('scatterTease', { windUp: false });
  const sets = t.events.filter((e) => e.set).map((e) => e.set);
  assert.ok(sets.some((x) => x.gr === 'point' && x.arx === POSE_FIX.anticipation.arx), 'the anticipation hand override is applied');
  assert.ok(POSE_FIX.anticipation.arx > 280, 'wrist well to the right of her face');
});

test('calm: no jump, spin, cap pop or heavy particle; poses and looks stay; sparkles are thinned', () => {
  for (const name of WHITELIST) {
    const d = buildClip(name, { level: 'calm', outfit: 'lab' });
    for (const e of d.events) {
      assert.ok(!e.impulse || !('jump' in e.impulse), `${name} jump`);
      assert.ok(!e.spin, `${name} spin`);
      assert.ok(!e.fx || ['sparkles', 'ring', 'notes', 'paraventIn', 'paraventOut'].includes(e.fx), `${name} fx ${e.fx}`);
      if (e.fx === 'sparkles') assert.ok(e.fxOpts.n <= 2);
    }
  }
  const big = buildClip('winBig', { level: 'calm' });
  assert.ok(big.events.some((e) => e.pose === 'bigwin'));
  assert.ok(buildClip('winBig', { level: 'full' }).events.some((e) => e.impulse && e.impulse.jump));
});

test('neutral (a debrief that did not exceed the cost): no wink, no particle, no jump', () => {
  const d = buildClip('freeSpinEnd', { neutral: true });
  for (const e of d.events) { assert.ok(!e.fx && !e.wink && !(e.impulse && e.impulse.jump)); }
  assert.ok(d.events.some((e) => e.pose === 'curtsy'));
});

test('jump limit: every jump impulse is capped at the box, 0 removes jumps', () => {
  const raw = toEvents(CLIPS.megaWin).filter((e) => e.impulse && e.impulse.jump).map((e) => e.impulse.jump);
  assert.ok(Math.max(...raw) > JUMP_MAX, 'the rig clip would leave the box');
  const full = buildClip('megaWin').events.filter((e) => e.impulse && 'jump' in e.impulse).map((e) => e.impulse.jump);
  assert.ok(full.length && Math.max(...full) <= JUMP_MAX);
  assert.ok(buildClip('megaWin', { jumpMax: 0 }).events.every((e) => !e.impulse || !('jump' in e.impulse)));
  assert.equal(limitJump({ events: [{ at: 0, impulse: { jump: 900, sq: 1 } }] }, 300).events[0].impulse.jump, 300);
  assert.equal(limitJump({ events: [{ at: 0, impulse: { jump: 100 } }] }, 300).events[0].impulse.jump, 100);
});

test('toEvents flattens named tracks exactly like the rig (sorted, merged by time)', () => {
  const ev = toEvents(CLIPS.winBig);
  assert.ok(ev.every((e, i) => i === 0 || ev[i - 1].at <= e.at));
  assert.equal(ev[0].at, 0); assert.equal(ev[0].pose, 'anticipation'); assert.equal(ev[0].mouth, 'grin'); assert.equal(ev[0].cue, 'winBig');
  assert.equal(ev.find((e) => e.at === 0.14).pose, 'bigwin');
  assert.equal(toEvents({ events: [{ at: 2 }, { at: 1 }] })[0].at, 1);
});

test('outfit change: the opaque screen is fully in before the swap and still there until after it; no garment confetti, no spin', () => {
  for (const level of ['full', 'calm']) {
    const d = outfitChangeDef('lab', level);
    const at = (pred) => d.events.find(pred).at;
    const screenIn = at((e) => e.fx === 'paraventIn'), swap = at((e) => e.outfit === 'lab'), screenOut = at((e) => e.fx === 'paraventOut');
    assert.ok(swap >= screenIn + 0.34, `swap ${swap} after the screen is in (${screenIn} + 0.32 s slide)`);
    assert.ok(swap < screenOut, 'swap before the screen leaves');
    assert.ok(d.events.every((e) => e.fx !== 'garments' && !e.spin));
    assert.equal(d.endPose, 'idle');
  }
  assert.equal(buildClip('outfitChange', { outfit: 'trench', level: 'calm' }).events.find((e) => e.outfit).outfit, 'trench');
});

test('outfits: five costumes, base inspectrice, missions map to lab / trench / casino (vault reserved)', () => {
  assert.deepEqual([...OUTFITS].sort(), ['casino', 'inspectrice', 'lab', 'trench', 'vault']);
  assert.equal(BASE_OUTFIT, 'inspectrice');
  assert.deepEqual({ ...MISSION_OUTFIT }, { briefing: 'lab', orders: 'trench', blackout: 'casino', fuse: 'vault' });
  assert.equal(pickOutfit({ outfit: 'casino' }), 'casino');
  assert.equal(pickOutfit({ mission: 'orders' }), 'trench');
  assert.equal(pickOutfit({ outfit: 'lab', mission: 'orders' }), 'lab', 'an explicit outfit wins');
  assert.equal(pickOutfit({ outfit: 'bikini' }), null);
  assert.equal(pickOutfit({ mission: '__proto__' }), null);
  assert.equal(pickOutfit(null), null);
  assert.equal(plan('outfit', { outfit: 'nope' }).outfit, null);
});

test('table sanity: priorities order the reactions, holds and cooldowns are set where promised', () => {
  assert.ok(KINDS.epic.prio > KINDS.bigwin.prio && KINDS.bigwin.prio > KINDS.win.prio && KINDS.win.prio > KINDS.quiet.prio);
  assert.ok(KINDS.outfit.prio > KINDS.epic.prio);
  assert.ok(KINDS.spin.hold > 0 && KINDS.anticipate.hold > 0);
  assert.ok(KINDS.dead.every >= 2 && KINDS.dead.cooldown >= 5000);
  for (const [k, ms] of Object.entries(STILL_HOLD)) assert.ok(KINDS[k] && ms >= 1000, k);
  for (const e of Object.values(KINDS)) assert.ok(Number.isFinite(e.prio));
  assert.ok(clipDuration(buildClip('megaWin')) > 3.5);
  assert.equal(clipDuration(null), 0);
  // withWindUp is pure
  const src = { dur: 1, events: [{ at: 0, pose: 'idle' }] };
  const w = withWindUp(src); assert.equal(src.events.length, 1); assert.equal(w.events.length, 2);
  assert.equal(calmify({ events: [{ at: 0, pose: 'idle', impulse: { jump: 5 } }, { at: 1, impulse: { jump: 5 } }] }).events.length, 1);
  assert.equal(neutralize({ events: [{ at: 0, wink: 'L' }] }).events.length, 0);
});
