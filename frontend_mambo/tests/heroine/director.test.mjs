import test from 'node:test';
import assert from 'node:assert/strict';
import { createDirector } from '../../src/render/heroine/director.js';
import { WHITELIST, GAGS, TEN_CLIPS, POSE_FIX, KINDS } from '../../src/render/heroine/clips.js';
import { REACT_KINDS } from '../../src/render/mascot.js';
import { createClock, createFakeRig } from './fakes.mjs';

function setup({ motion = 'full', outfit = 'inspectrice', rand = () => 0.3, extra = {} } = {}) {
  const clock = createClock(), rig = createFakeRig(outfit); const fails = [];
  const state = { motion };
  const d = createDirector({ rig, getMotion: () => state.motion, now: clock.now, setTimer: clock.setTimer, clearTimer: clock.clearTimer, rand, onFail: (e) => fails.push(e), ...extra });
  d.setMotion(motion); rig.log.length = 0; rig.played.length = 0;
  return { d, rig, clock, fails, state };
}
const WIN = { level: 1, ratio: 3 };

test('the ten clip targets: each reaction kind starts its clip, react() returns true', () => {
  for (const [clip, kind] of Object.entries(TEN_CLIPS)) {
    const { d, rig } = setup();
    const info = kind === 'bigwin' || kind === 'win' || kind === 'epic' ? { level: 3, ratio: 20 } : undefined;
    const ok = d.react(kind, info);
    assert.equal(ok, true, kind);
    assert.equal(rig.played.length, 1, kind);
    if (clip === 'idleGag') assert.ok(GAGS.includes(rig.played[0]), `gag ${rig.played[0]}`);
    else assert.equal(rig.played[0], clip, kind);
    assert.ok(WHITELIST.has(rig.played[0]));
  }
});

test('also: retrigger plays winSmall, end plays freeSpinEnd, trigger with a costume plays the change behind the screen', () => {
  let s = setup(); assert.equal(s.d.react('retrigger'), true); assert.equal(s.rig.played[0], 'winSmall');
  s = setup(); assert.equal(s.d.react('end', { ratio: 4 }), true); assert.equal(s.rig.played[0], 'freeSpinEnd');
  s = setup(); assert.equal(s.d.react('trigger', { mission: 'briefing' }), true); assert.deepEqual(s.rig.played, ['outfitChange']);
  s = setup({ outfit: 'lab' }); assert.equal(s.d.react('trigger', { outfit: 'lab' }), true); assert.deepEqual(s.rig.played, ['freeSpinStart']);
});

test('unknown, non-string and prototype kinds do nothing and return false', () => {
  const { d, rig, fails } = setup();
  for (const bad of [undefined, null, 5, {}, 'nope', '__proto__', 'constructor', 'toString']) assert.equal(d.react(bad, WIN), false, String(bad));
  assert.equal(rig.played.length, 0); assert.equal(fails.length, 0);
  assert.equal(d.react('win', null), true, 'a missing info object is fine');
});

test('every REACT_KIND is accepted without throwing (no fail callback)', () => {
  for (const k of REACT_KINDS) { const { d, fails } = setup(); assert.doesNotThrow(() => d.react(k, { level: 2, ratio: 9, outfit: 'lab' }), k); assert.equal(fails.length, 0, k); }
});

test('shock only from the blast; the legacy shock pose is the tease; a blast is rate limited', () => {
  const { d, rig, clock } = setup();
  for (const k of REACT_KINDS) { if (k === 'blast') continue; d.react(k, { level: 3, ratio: 20, outfit: 'lab' }); rig.finish(); clock.advance(10000); }
  d.setPose('shock'); rig.finish(); clock.advance(10000);
  assert.ok(!rig.played.includes('shock'), rig.played.join());
  assert.ok(rig.played.includes('scatterTease'));
  assert.equal(d.react('blast'), true); assert.equal(rig.played.at(-1), 'shock');
  rig.finish(); clock.advance(1000);
  assert.equal(d.react('blast'), false, 'cooldown 2.5 s');
  clock.advance(2000); assert.equal(d.react('blast'), true);
});

test('priority: a smaller reaction never cuts a bigger one that is playing, a bigger one cuts a smaller one', () => {
  const { d, rig, clock } = setup();
  assert.equal(d.react('epic', { ratio: 30 }), true);
  clock.advance(500);
  assert.equal(d.react('win', WIN), false); assert.equal(d.react('bigwin', { ratio: 9 }), false); assert.equal(d.react('idle'), false); assert.equal(d.react('quiet'), false);
  assert.deepEqual(rig.played, ['megaWin']);
  assert.ok(!rig.log.some((l) => l[0] === 'stop'), 'the running clip was not stopped');
  // when it ends the next one goes through
  rig.finish(); clock.advance(10);
  assert.equal(d.react('win', WIN), true);
  clock.advance(100); assert.equal(d.react('bigwin', { ratio: 9 }), true, 'bigwin cuts winSmall');
  assert.deepEqual(rig.played, ['megaWin', 'winSmall', 'winBig']);
  assert.equal(d.react('bigwin', { ratio: 9 }), false, 'the same reaction does not restart itself');
});

test('cooldowns: winSmall 1.8 s, lose 6 s; epic ignores cooldowns', () => {
  const { d, rig, clock } = setup();
  assert.equal(d.react('win', WIN), true); rig.finish(); clock.advance(1000);
  assert.equal(d.react('win', WIN), false); clock.advance(900);
  assert.equal(d.react('win', WIN), true);
  rig.finish(); assert.equal(d.react('epic', { ratio: 50 }), true); rig.finish();
  assert.equal(d.react('epic', { ratio: 50 }), true); rig.finish();
  assert.equal(d.react('fizzle'), true); rig.finish(); clock.advance(3000); assert.equal(d.react('fizzle'), false); clock.advance(3100); assert.equal(d.react('fizzle'), true);
});

test('dead spins: the shrug only on every third one (and not twice within 6 s); the others just release the pose', () => {
  const { d, rig, clock } = setup();
  assert.equal(d.react('dead'), false); assert.equal(d.react('dead'), false);
  assert.deepEqual(rig.played, []);
  assert.equal(d.react('dead'), true); assert.deepEqual(rig.played, ['lose']);
  rig.finish(); clock.advance(500);
  d.react('dead'); d.react('dead'); assert.equal(d.react('dead'), false, 'cooldown');
  assert.deepEqual(rig.played, ['lose']);
  // a paying result resets the streak
  const s = setup(); s.d.react('dead'); s.d.react('dead'); s.d.react('win', WIN); s.rig.finish(); s.clock.advance(5000); assert.equal(s.d.react('dead'), false); assert.equal(s.d.state().deadStreak, 1);
});

test('celebrate only above the cost: a win at ratio <= 1 plays nothing, releases the hold, blinks slowly', () => {
  const { d, rig } = setup();
  assert.equal(d.react('spin'), true);
  assert.equal(d.react('win', { level: 0, ratio: 0.4 }), false);
  assert.deepEqual(rig.played, ['spinStart']);
  assert.ok(rig.log.some((l) => l[0] === 'stop'), 'the held spin pose was released');
  assert.ok(rig.log.some((l) => l[0] === 'blink' && l[1] === 'slow'));
  assert.equal(rig.pose, 'idle');
  for (const kind of ['bigwin', 'epic']) assert.equal(setup().d.react(kind, { ratio: 1 }), false, kind);
});

test('holds: spin and anticipate release by themselves; a dropped reaction does not leave her holding the pose', () => {
  let s = setup(); s.d.react('spin'); assert.equal(s.d.state().cur.holding, true);
  s.clock.advance(7999); assert.ok(!s.rig.log.some((l) => l[0] === 'stop')); s.clock.advance(5); assert.ok(s.rig.log.some((l) => l[0] === 'stop'));
  s = setup(); s.d.react('anticipate'); s.clock.advance(12010); assert.ok(s.rig.log.some((l) => l[0] === 'stop'));
  // spin hold -> a win dropped by its cooldown -> released
  s = setup(); s.d.react('win', WIN); s.rig.finish(); s.clock.advance(200); s.d.react('spin'); s.rig.log.length = 0;
  assert.equal(s.d.react('win', WIN), false); assert.ok(s.rig.log.some((l) => l[0] === 'stop'), 'released');
  // a hold is replaced by anything, including a smaller reaction
  s = setup(); s.d.react('anticipate'); assert.equal(s.d.react('fizzle'), true); assert.equal(s.rig.played.at(-1), 'lose');
});

test('outfit change: locked for its whole length, never cut, queued, and the rig is never told to stop', () => {
  const { d, rig, clock } = setup();
  assert.equal(d.react('outfit', { outfit: 'lab' }), true);
  assert.deepEqual(rig.played, ['outfitChange']);
  assert.equal(d.state().locked, true);
  clock.advance(300);
  assert.equal(d.react('epic', { ratio: 50 }), false); assert.equal(d.react('idle'), false); assert.equal(d.react('gag'), false);
  assert.equal(d.setPose('bigwin'), 'bigwin');             // legacy call is remembered but does not cut the screen
  assert.deepEqual(rig.played, ['outfitChange']);
  assert.ok(!rig.log.some((l) => l[0] === 'stop' || l[0] === 'pose'));
  assert.equal(d.react('outfit', { outfit: 'lab' }), false, 'same costume: nothing to do');
  assert.equal(d.react('outfit', { outfit: 'casino' }), false, 'queued');
  rig.applyOutfitEvents(); assert.equal(rig.outfit, 'lab');
  rig.finish();                                            // the clip ended: the queued change starts
  assert.equal(rig.played.length, 2); assert.equal(rig.clip.def.events.find((e) => e.outfit).outfit, 'casino');
  rig.applyOutfitEvents(); rig.finish();
  assert.equal(d.state().locked, false);
  assert.equal(d.react('win', WIN), true);
});

test('outfit lock also ends by its own timer when the rig never reports the end', () => {
  const { d, clock, rig } = setup();
  d.react('outfit', { outfit: 'trench' });
  clock.advance(1900); assert.equal(d.state().locked, true);
  clock.advance(200); assert.equal(d.state().locked, false);
  assert.equal(d.react('win', WIN), true); assert.equal(rig.played.at(-1), 'winSmall');
});

test('unknown costume: nothing happens', () => {
  const { d, rig } = setup();
  assert.equal(d.react('outfit', { outfit: 'bikini' }), false); assert.equal(d.react('outfit', {}), false); assert.equal(d.react('outfit'), false);
  assert.equal(rig.played.length, 0);
});

test('end: the bow, then the base costume comes back behind the screen (only when she is not already in it)', () => {
  const { d, rig, clock } = setup({ outfit: 'casino' });
  assert.equal(d.react('end', { ratio: 5 }), true); assert.equal(rig.played[0], 'freeSpinEnd');
  rig.finish();                                            // bow over
  assert.equal(rig.played.length, 2); assert.equal(rig.clip.def.name, 'outfitChange'); assert.equal(rig.clip.def.events.find((e) => e.outfit).outfit, 'inspectrice');
  const s = setup({ outfit: 'inspectrice' }); s.d.react('end'); s.rig.finish(); assert.deepEqual(s.rig.played, ['freeSpinEnd']);
  // a neutral debrief has no sparkles
  const n = setup(); n.d.react('end', { ratio: 0.5 }); assert.ok(n.rig.clip.def.events.every((e) => !e.fx && !e.wink));
  clock.advance(1);
});

test('Still: no clip ever plays, a static pose is held then released; outfits swap instantly; no gag', () => {
  const { d, rig, clock } = setup({ motion: 'still' });
  assert.equal(d.setPose('idle'), 'idle');
  assert.equal(d.react('win', WIN), true);
  assert.deepEqual(rig.played, []); assert.equal(rig.pose, 'smallwin');
  assert.ok(rig.log.some((l) => l[0] === 'pose' && l[1] === 'smallwin' && l[2] === true), 'snapped, no spring');
  clock.advance(1700); assert.equal(rig.pose, 'smallwin'); clock.advance(200); assert.equal(rig.pose, 'idle');
  for (const [kind, pose] of [['bigwin', 'bigwin'], ['epic', 'bigwin'], ['blast', 'shock'], ['trigger', 'salute'], ['end', 'curtsy'], ['meter', 'point'], ['retrigger', 'smallwin']]) {
    clock.advance(10000); assert.equal(d.react(kind, { ratio: 9 }), true, kind); assert.equal(rig.pose, pose, kind);
  }
  assert.deepEqual(rig.played, []);
  clock.advance(10000); assert.equal(d.react('gag'), false);
  clock.advance(10000); d.react('outfit', { outfit: 'casino' }); assert.deepEqual(rig.played, []);
  assert.ok(rig.log.some((l) => l[0] === 'outfit' && l[1] === 'casino' && l[2] === false));
  assert.equal(d.state().locked, false, 'an instant swap needs no lock');
  // the sober override travels with the static anticipation / think poses
  clock.advance(10000); d.react('anticipate'); assert.equal(rig.pose, 'anticipation'); assert.equal(rig.overrides.gr, POSE_FIX.anticipation.gr);
  clock.advance(10000); d.setPose('think'); assert.equal(rig.pose, 'think'); assert.equal(rig.overrides.arx, POSE_FIX.think.arx);
});

test('Still: a pose hold of the spin is the rest pose; spin / anticipate holds expire', () => {
  const { d, rig, clock } = setup({ motion: 'still' });
  d.react('spin'); assert.equal(rig.pose, 'idle');
  d.react('anticipate'); assert.equal(rig.pose, 'anticipation'); clock.advance(12010); assert.equal(rig.pose, 'idle');
});

test('motion level changes at runtime: reduced follows Still, the current clip is released', () => {
  const s = setup(); s.d.react('anticipate');
  s.state.motion = 'still'; s.d.setMotion('still');
  assert.equal(s.rig.reduced, true); assert.equal(s.rig.pose, 'idle');
  s.state.motion = 'full'; s.d.setMotion('full'); assert.equal(s.rig.reduced, false);
  s.d.setMotion('bogus'); assert.equal(s.rig.reduced, false, 'unknown level = full');
});

test('Calm: clips run slower, without jumps or heavy particles', () => {
  const { d, rig } = setup({ motion: 'calm' });
  assert.equal(d.react('epic', { ratio: 40 }), true);
  const def = rig.clip.def;
  assert.ok(def.events.every((e) => !(e.impulse && e.impulse.jump) && !e.spin && (!e.fx || ['sparkles', 'ring', 'notes'].includes(e.fx))));
  const play = rig.log.find((l) => l[0] === 'play'); assert.equal(play[2], 0.9);
});

test('speed: info.speed wins, info.ms speeds a clip up to fit the beat (never slows it), holds are not scaled', () => {
  let s = setup(); s.d.react('bigwin', { ratio: 9, speed: 2 }); assert.equal(s.rig.log.find((l) => l[0] === 'play')[2], 2);
  s = setup(); s.d.react('bigwin', { ratio: 9, speed: 99 }); assert.equal(s.rig.log.find((l) => l[0] === 'play')[2], 2.5);
  s = setup(); s.d.react('bigwin', { ratio: 9, ms: 1500 }); const sp = s.rig.log.find((l) => l[0] === 'play')[2]; assert.ok(sp > 1.5 && sp <= 2.5, String(sp));
  s = setup(); s.d.react('bigwin', { ratio: 9, ms: 60000 }); assert.equal(s.rig.log.find((l) => l[0] === 'play')[2], 1);
  s = setup(); s.d.react('spin', { ms: 100 }); assert.equal(s.rig.log.find((l) => l[0] === 'play')[2], 1);
});

test('gags: only whitelisted ones, the whistle only in the base costume, nothing while a reaction plays', () => {
  const seen = new Set();
  for (let i = 0; i < 40; i++) { const { d, rig } = setup({ outfit: 'lab', rand: () => i / 40 }); d.react('gag'); seen.add(rig.played[0]); }
  assert.ok(!seen.has('blowWhistle') && !seen.has('hairFlip') && !seen.has('impatient'));
  assert.ok(seen.size >= 3);
  const seen2 = new Set();
  for (let i = 0; i < 40; i++) { const { d, rig } = setup({ rand: () => i / 40 }); d.react('gag'); seen2.add(rig.played[0]); }
  assert.ok(seen2.has('blowWhistle'));
  const { d, rig } = setup(); d.react('win', WIN); assert.equal(d.react('gag'), false); assert.equal(rig.played.length, 1);
});

test('legacy v1 poses map onto reactions; getPose returns the last name; unknown names are idle', () => {
  const m = [['happy', 'winSmall'], ['bigwin', 'winBig'], ['celebrate', 'megaWin'], ['plunger', 'freeSpinStart'], ['shock', 'scatterTease']];
  for (const [pose, clip] of m) { const { d, rig } = setup(); assert.equal(d.setPose(pose), pose); assert.equal(rig.played[0], clip, pose); assert.equal(d.getPose(), pose); }
  const { d, rig } = setup(); assert.equal(d.setPose('nonsense'), 'idle'); assert.equal(d.getPose(), 'idle'); assert.equal(rig.played.length, 0);
  d.setPose('think'); assert.equal(rig.pose, 'think'); assert.equal(rig.overrides.gr, 'point'); assert.equal(d.getPose(), 'think');
  d.setPose('dance'); assert.equal(d.getPose(), 'dance');
  const s = setup(); s.d.setPose('shrug'); s.d.setPose('shrug'); assert.equal(s.rig.played.length, 0, 'dead rounds shrug only every third time');
});

test('a throwing rig is reported once through onFail and react returns false', () => {
  const { d, rig, fails } = setup();
  rig.play = () => { throw new Error('boom'); };
  assert.equal(d.react('win', WIN), false); assert.equal(fails.length, 1); assert.equal(fails[0].message, 'boom');
  assert.equal(d.state().cur, null);
});

test('info.at is forwarded for the gaze', () => {
  const seen = []; const { d } = setup({ extra: { onInfo: (i) => seen.push(i.at) } });
  d.react('win', { ratio: 3, at: { x: 10, y: 20 } }); assert.deepEqual(seen, [{ x: 10, y: 20 }]);
});

test('jump limit and crops: the director asks the host how fast a jump may start', () => {
  const { d, rig } = setup({ extra: { getJumpMax: () => 0 } });
  d.react('epic', { ratio: 40 });
  assert.ok(rig.clip.def.events.every((e) => !e.impulse || !('jump' in e.impulse)));
});

test('destroy: timers are cleared, nothing runs afterwards', () => {
  const { d, clock, rig } = setup();
  d.react('spin'); d.destroy(); clock.advance(20000);
  assert.equal(d.react('win', WIN), false);
  assert.equal(rig.log.filter((l) => l[0] === 'stop').length, 0);
  assert.equal(clock.pending(), 0);
});

test('every kind of the table has a defined behaviour in the director (no kind is silently dead)', () => {
  for (const [k, e] of Object.entries(KINDS)) {
    const { d, rig } = setup();
    const r = d.react(k, { level: 3, ratio: 30, outfit: 'lab' });
    if (e.mode === 'release' || e.mode === 'quiet' || (e.mode === 'dead')) assert.equal(r, false, k);
    else assert.equal(r, true, k);
    assert.ok(rig.log.length > 0 || e.mode === 'release', k);
  }
});
