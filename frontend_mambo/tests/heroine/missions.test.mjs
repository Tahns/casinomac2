// WP3 M2/M3: the mission beats (caseOpen, spotlight, layout), the costume round trip, the hidden swap and the idle frame grid of the rig.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createDirector } from '../../src/render/heroine/director.js';
import { plan, buildClip, KINDS, MISSION_OUTFIT, BASE_OUTFIT, WHITELIST } from '../../src/render/heroine/clips.js';
import { createClock, createFakeRig } from './fakes.mjs';

function setup({ motion = 'full', outfit = 'inspectrice' } = {}) {
  const clock = createClock(), rig = createFakeRig(outfit);
  const d = createDirector({ rig, getMotion: () => motion, now: clock.now, setTimer: clock.setTimer, clearTimer: clock.clearTimer, rand: () => 0.3 });
  d.setMotion(motion); rig.log.length = 0; rig.played.length = 0;
  return { d, rig, clock };
}

test('caseOpen: neutral point at the board at or below the cost share (or without a ratio), small win only above it', () => {
  for (const info of [undefined, {}, { ratio: 1 }, { ratio: 0.4 }, { ratio: 'x' }]) {
    const p = plan('caseOpen', info);
    assert.equal(p.ok, true); assert.equal(p.clip, 'meterMilestone', JSON.stringify(info)); assert.equal(p.neutral, true); assert.equal(p.accent, 'pointGrid');
  }
  const up = plan('caseOpen', { ratio: 2.6 });
  assert.equal(up.clip, 'winSmall'); assert.equal(up.effective, 'win'); assert.equal(up.prio, KINDS.caseOpen.prio);
  const { d, rig } = setup();
  assert.equal(d.react('caseOpen', { ratio: 0.5 }), true); assert.deepEqual(rig.played, ['meterMilestone']);
  const def = rig.clip.def;
  assert.ok(!def.events.some((e) => e.wink || e.impulse && e.impulse.jump), 'neutral: no wink, no jump');
  assert.ok(!def.events.some((e) => e.fx && e.fx !== 'paraventIn' && e.fx !== 'paraventOut'), 'neutral: no particle');
  assert.ok(def.events.some((e) => e.look === 'grid' && e.set && e.set.ary === 250), 'the point is aimed at the board');
});

test('spotlight and layout: neutral points, their own cooldowns (a dial milestone just before does not block them)', () => {
  const { d, rig, clock } = setup();
  assert.equal(d.react('meter'), true); rig.finish(); clock.advance(300);
  assert.equal(d.react('spotlight'), true, 'spotlight right after the dial point'); rig.finish(); clock.advance(300);
  assert.equal(d.react('spotlight'), false, 'spotlight cooldown 1.5 s');
  clock.advance(1300); assert.equal(d.react('spotlight'), true); rig.finish();
  assert.equal(d.react('layout'), true); rig.finish(); clock.advance(1000);
  assert.equal(d.react('layout'), false, 'layout cooldown 3 s'); clock.advance(2100); assert.equal(d.react('layout'), true);
  for (const k of ['spotlight', 'layout']) { const b = buildClip('meterMilestone', { accent: 'pointGrid', neutral: true }); assert.ok(b && WHITELIST.has(b.name), k); }
});

test('Still: the mission beats are a held static point, no clip', () => {
  const { d, rig } = setup({ motion: 'still' });
  for (const k of ['caseOpen', 'spotlight', 'layout']) { rig.played.length = 0; assert.equal(d.react(k), true, k); assert.equal(rig.played.length, 0, k); assert.equal(rig.pose, 'point', k); d.release(); }
});

test('missions: trigger dresses her for the mission (lab / trench / casino) behind the screen, end brings the inspectrice back', () => {
  assert.deepEqual({ ...MISSION_OUTFIT }, { briefing: 'lab', orders: 'trench', blackout: 'casino', fuse: 'vault' });
  for (const [mission, outfit] of [['briefing', 'lab'], ['orders', 'trench'], ['blackout', 'casino']]) {
    const { d, rig, clock } = setup();
    assert.equal(d.react('trigger', { mission }), true, mission);
    assert.deepEqual(rig.played, ['outfitChange']); rig.applyOutfitEvents(); assert.equal(rig.outfit, outfit);
    rig.finish(); clock.advance(2100);
    assert.equal(d.react('end', { ratio: 0.5 }), true); assert.equal(rig.played.at(-1), 'freeSpinEnd');
    rig.finish(); clock.advance(100);
    assert.equal(rig.played.at(-1), 'outfitChange', 'the end card is followed by the change back'); rig.applyOutfitEvents(); assert.equal(rig.outfit, BASE_OUTFIT);
  }
});

test('the rig source draws the figure at rest on the 12 fps grid (idleHz), and the shipped copy keeps the frame guard', () => {
  const src = fs.readFileSync(new URL('../../../docs/research2/art/mambo_rig.mjs', import.meta.url), 'utf8');
  const ship = fs.readFileSync(new URL('../../src/render/heroine/mambo_rig.js', import.meta.url), 'utf8');
  assert.match(src, /idleHz: 12/); assert.match(src, /setIdleHz\(hz\)/);
  assert.match(ship, /const busy = !!clipS\.cur \|\| tweens\.length > 0 \|\| fxP\.length > 0 \|\| !grounded \|\| spinS\.active;/);
  assert.match(ship, /catch \(err\) \{ if \(O\.onError\) \{ destroyed = true;/);
  // the hem fix of a2ac6af must survive every sync: legs leave from the skirt hem, feet never above it
  const art = fs.readFileSync(new URL('../../src/render/heroine/mambo_art.js', import.meta.url), 'utf8') + fs.readFileSync(new URL('../../src/render/heroine/mambo_outfits.js', import.meta.url), 'utf8') + ship;
  assert.match(art, /hem/i);
});
