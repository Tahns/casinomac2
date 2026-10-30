// WP5 unit tests: flash governor, quality governor, symbol CSS rewrite, Clearance Dial bands. Run: node --test tests/fx/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createFlashGovernor, flashColor, isSaturatedRed, flashModeFrom, flashShape, FLASH, parseColor } from '../../src/render/flash.js';
import { createQuality, QUALITY } from '../../src/render/quality.js';
import { noComposite } from '../../src/render/symbols.js';
import { bandOf, bandEdges, BANDS, DEFAULT_DIAL_STEP } from '../../src/render/meter.js';

function fakeSettings(init = {}) {
  const v = { motionLevel: 'full', flashReduced: false, ...init };
  return { get: (k) => v[k], on: () => () => {}, set(k, x) { v[k] = x; } };
}

test('flash: at most 2 starts in any sliding 1000 ms window', () => {
  let t = 0;
  const g = createFlashGovernor({ settings: fakeSettings(), now: () => t, lazy: false });
  const got = [];
  for (t = 0; t < 5000; t += 50) if (g.fire(0.5, 200)) got.push(t);
  for (let i = 0; i + 2 < got.length; i++) assert.ok(got[i + 2] - got[i] >= 1000, `3 flashes within 1 s at ${got.slice(i, i + 3)}`);
  assert.ok(got.length >= 9 && got.length <= 11, `about 2 per second over 5 s, got ${got.length}`);
  assert.ok(g.refused > 0);
});

test('flash: peak clamped to 0.5, dissolve 0.25 / 167 ms, Still draws nothing', () => {
  let t = 0;
  const s = fakeSettings();
  const g = createFlashGovernor({ settings: s, now: () => t, lazy: false });
  assert.equal(g.fire(0.95, 900), true);
  assert.equal(g.log[0].peak, FLASH.peak);
  t = 5000; s.set('flashReduced', true);
  assert.equal(g.fire(0.6, 200), true);
  assert.deepEqual([g.log[1].peak, g.log[1].ms, g.log[1].mode], [0.25, 167, 'dissolve']);
  t = 10000; s.set('flashReduced', false); s.set('motionLevel', 'calm');
  assert.equal(g.fire(0.6, 200), true); assert.equal(g.log[2].mode, 'dissolve');
  t = 15000; s.set('motionLevel', 'still');
  assert.equal(g.fire(0.6, 200), false);
  assert.equal(g.allow(), false);
  assert.equal(g.fire(0, 200), false, 'peak 0 is not a flash');
});

test('flash: colours are cream or lemon only; red is saturated and drawn cream', () => {
  assert.equal(flashColor('#fff'), FLASH.cream);
  assert.equal(flashColor('#FFD23F'), FLASH.lemon);
  assert.equal(flashColor('#ffd23f'), FLASH.lemon);
  assert.equal(flashColor('#F0472F'), FLASH.cream);
  assert.equal(flashColor('240,71,47'), FLASH.cream);
  assert.equal(flashColor('nonsense'), FLASH.cream);
  assert.equal(isSaturatedRed('#ff0000'), true);
  assert.equal(isSaturatedRed('#E01010'), true);
  assert.equal(isSaturatedRed('#FBF1D9'), false);
  assert.equal(isSaturatedRed('#FFD23F'), false);
  assert.deepEqual(parseColor('#abc'), [170, 187, 204]);
  let t = 0;
  const g = createFlashGovernor({ settings: fakeSettings(), now: () => t, lazy: false });
  g.fire(0.5, 200, '#ff0000'); t = 100; g.fire(0.5, 200, '#ff0000'); t = 200;
  assert.equal(g.fire(0.5, 200, '#ff0000'), false, 'red shares the same budget');
  assert.equal(g.log[0].color, FLASH.cream); assert.equal(g.log[0].red, true);
});

test('flash: mode and shape helpers', () => {
  assert.equal(flashModeFrom('full', false), 'flash');
  assert.equal(flashModeFrom('full', true), 'dissolve');
  assert.equal(flashModeFrom('calm', false), 'dissolve');
  assert.equal(flashModeFrom('still', false), 'none');
  assert.equal(flashShape(1, 5000, 'flash').ms, FLASH.maxMs);
  assert.equal(flashShape(0.3, 10, 'flash').ms, FLASH.minMs);
  assert.equal(flashShape(0.3, 200, 'none'), null);
  assert.equal(createFlashGovernor({ budget: 9, settings: fakeSettings(), lazy: false }).fire(.5, 100), true);
});

test('flash: the budget can be lowered but never raised above 2', () => {
  let t = 0;
  const g = createFlashGovernor({ budget: 9, settings: fakeSettings(), now: () => t, lazy: false });
  assert.equal(g.fire(), true); t = 10; assert.equal(g.fire(), true); t = 20; assert.equal(g.fire(), false);
  const one = createFlashGovernor({ budget: 1, settings: fakeSettings(), now: () => t, lazy: false });
  assert.equal(one.fire(), true); t = 30; assert.equal(one.fire(), false);
});

test('quality: fast device stays full; > 24 ms goes lite; > 40 ms goes calm; recovers with hysteresis', () => {
  let t = 0;
  const q = createQuality({ now: () => t });
  for (let i = 0; i < 200; i++) { t += 16.7; q.sample(16.7); }
  assert.equal(q.tier, 'full'); assert.equal(q.particles, 1);
  for (let i = 0; i < 80; i++) { t += 30; q.sample(30); }
  assert.equal(q.tier, 'lite'); assert.equal(q.particles, QUALITY.gains.lite);
  assert.equal(q.count(10), 5);
  for (let i = 0; i < 80; i++) { t += 55; q.sample(55); }
  assert.equal(q.tier, 'calm'); assert.equal(q.calm, true);
  // back to 60 fps: one tier per recoverMs
  for (let i = 0; i < 200; i++) { t += 16.7; q.sample(16.7); }
  assert.equal(q.tier, 'lite', 'calm -> lite first');
  for (let i = 0; i < 200; i++) { t += 16.7; q.sample(16.7); }
  assert.equal(q.tier, 'full');
});

test('quality: a single long frame or a hidden-tab gap never changes the tier', () => {
  let t = 0;
  const q = createQuality({ now: () => t });
  for (let i = 0; i < 60; i++) { t += 16.7; q.sample(16.7); }
  q.sample(5000); q.sample(240); q.sample(16.7);
  assert.equal(q.tier, 'full');
  q.sample(-3); q.sample(NaN); q.sample('x');
  assert.equal(q.tier, 'full');
});

test('quality: effective() takes the lower of the player choice and the device tier', () => {
  let t = 0;
  const q = createQuality({ now: () => t });
  const full = { level: 'full', particles: 1, shake: 1, rotation: true, hitStop: true, pushIn: true };
  assert.deepEqual({ ...q.effective(full) }, { level: 'full', particles: 1, shake: 1, rotation: true, hitStop: true, pushIn: true });
  for (let i = 0; i < 200; i++) { t += 60; q.sample(60); }
  const e = q.effective(full);
  assert.equal(e.level, 'calm'); assert.equal(e.hitStop, false); assert.equal(e.rotation, false); assert.ok(e.shake <= 0.25); assert.ok(e.particles <= 0.4);
  const still = q.effective({ level: 'still', particles: 0, shake: 0, rotation: false, hitStop: false, pushIn: false });
  assert.equal(still.level, 'still'); assert.equal(still.particles, 0);
});

test('symbols: idle keyframes animate custom properties only (no compositor layer per part)', () => {
  const css = noComposite('.a{animation:k 1s}@keyframes k{0%,50%{opacity:0;transform:scale(.2)}62%{opacity:1;transform:rotate(3deg) scale(1)}}.b{opacity:.5;transform:none}');
  const kf = css.match(/@keyframes k\{.*?\}\}/)[0];
  assert.ok(!/(^|[{;])\s*(transform|opacity)\s*:/.test(kf), kf);
  assert.ok(/--mbt:scale\(\.2\)/.test(kf) && /--mbo:1/.test(kf));
  assert.ok(css.includes('.b{opacity:.5;transform:none}'), 'normal rules are untouched');
  assert.ok(css.startsWith('@property --mbt'), 'custom properties registered as non-inherited');
});

test('dial: bands Largo < 17 <= Andante < 41 <= Allegro < 81 <= Presto at cap 100; derived from the cap', () => {
  assert.deepEqual(BANDS.map((b) => b.id), ['largo', 'andante', 'allegro', 'presto']);
  assert.deepEqual(bandEdges(100), [17, 41, 81]);
  const at = (v, cap) => bandOf(v, cap).id;
  assert.equal(at(1, 100), 'largo'); assert.equal(at(16, 100), 'largo'); assert.equal(at(17, 100), 'andante');
  assert.equal(at(40, 100), 'andante'); assert.equal(at(41, 100), 'allegro'); assert.equal(at(80, 100), 'allegro');
  assert.equal(at(81, 100), 'presto'); assert.equal(at(100, 100), 'presto'); assert.equal(at(5000, 100), 'presto');
  assert.deepEqual(bandEdges(50), [9, 21, 41]);
  assert.equal(at(9, 50), 'andante');
  assert.deepEqual(bandEdges(undefined), [17, 41, 81], 'no cap = the v1 cap 100');
  assert.deepEqual(bandEdges(-3), [17, 41, 81]);
  assert.equal(DEFAULT_DIAL_STEP, 8);
});

test('quality: timer probe (no rAF), lag samples, and a driver loop makes the probe yield (one loop on the page)', () => {
  let t = 0; const timers = new Map(); let id = 0;
  const T = { setTimeout: (f, ms) => { timers.set(++id, { f, at: t + ms }); return id; }, clearTimeout: (k) => { timers.delete(k); } };
  const run = (ms, late = 0) => { const end = t + ms; for (;;) { const nx = [...timers.entries()].sort((a, b) => a[1].at - b[1].at)[0]; if (!nx || nx[1].at > end) break; timers.delete(nx[0]); t = nx[1].at + late; nx[1].f(); } t = Math.max(t, end); };
  const q = createQuality({ now: () => t, timers: T, root: null });
  // lag samples: 0 lag = one 60 Hz frame; 30 ms late = a 46.7 ms frame
  for (let i = 0; i < 40; i++) q.sampleLag(30);
  assert.equal(q.tier, 'calm');
  q.reset();
  q.keepAlive(1000);
  assert.equal(timers.size, 1, 'the probe is one timer');
  const before = q.samples;
  run(500);
  assert.ok(q.samples - before >= 5, 'probe samples on the 83 ms grid');
  q.drive(true);
  assert.equal(timers.size, 0, 'the probe yields to the driving loop');
  assert.equal(q.monitoring, true);
  q.drive(false);
  assert.equal(timers.size, 1, 'the probe resumes while keepAlive lasts');
  run(2000);
  assert.equal(timers.size, 0, 'and stops itself afterwards');
  assert.equal(q.monitoring, false);
});
