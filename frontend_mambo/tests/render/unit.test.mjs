// WP4 RENDER-CORE unit tests (node --test tests/render): the celebration gate and its recipes, the round tracker, the staircase plan,
// the motion store, the trauma camera and the hit-stop. Pure modules only; the browser side is tests/render/browser.mjs.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  level, stageWin, STAGE, recipe, tumbleRecipe, guardPose, createRound, tierPlan, tierOf, endPlan, CELEBRATORY_SINKS,
  TIER_THRESHOLDS, WINCAP, STAIRCASE_MAX_MS, BEAT_MS, SEGMENT_MS, HIT_STOP_MS,
} from '../../src/render/celebrate.js';
import { createMotion, motionStateFrom } from '../../src/render/motion.js';
import { createCamera, MAX_FRAC, MAX_ROT_DEG, AMBIENT_CAP } from '../../src/render/camera.js';

// ---------- the gate: 0.4x / 1.0x / 1.2x / 15x / 100x at cost 1 and at cost 100 ----------
function spies() {
  const calls = [];
  const names = ['inBlack', 'outline', 'popup', 'ledgerTick', 'winSound', 'sparks', 'trauma', 'ripple', 'mascot'];
  const sinks = {};
  for (const n of names) sinks[n] = (...a) => calls.push([n, ...a]);
  return { calls, sinks, count: (n) => calls.filter((c) => c[0] === n).length };
}
test('gate: no celebratory call at R <= C, at cost 1 and at cost 100', () => {
  for (const C of [1, 100]) {
    for (const x of [0.4, 1.0]) {
      const R = x * C, lvl = level(R, C);
      assert.equal(lvl, 0, `${x}x at cost ${C}`);
      const s = spies();
      stageWin(s.sinks, { level: lvl, crossed: false, combo: 1, total: R, R, C });
      for (const n of CELEBRATORY_SINKS) assert.equal(s.count(n), 0, `${n} must not be called at ${x}x cost ${C}`);
      assert.equal(s.count('ledgerTick'), 1, 'exactly one ledger tick');
      const m = s.calls.filter((c) => c[0] === 'mascot');
      assert.equal(m.length, 1); assert.equal(m[0][1], 'quiet');
      const o = s.calls.find((c) => c[0] === 'outline'); assert.equal(o[1].color, 'lemon'); assert.equal(o[1].tint, false);
      const p = s.calls.find((c) => c[0] === 'popup'); assert.equal(p[1].kind, 'quiet'); assert.equal(p[1].overshoot, false);
    }
  }
});
test('gate: a "crossed" flag at level 0 is ignored (the beat only exists above the cost)', () => {
  const s = spies();
  stageWin(s.sinks, { level: 0, crossed: true, combo: 3, total: 0.5 });
  assert.equal(s.count('inBlack'), 0); assert.equal(s.count('winSound'), 0);
});
test('gate: 1.2x is L1 (wink), 15x and 100x are L3, celebratory calls appear', () => {
  for (const C of [1, 100]) {
    assert.deepEqual([1.2, 5, 15, 100].map((x) => level(x * C, C)), [1, 2, 3, 3]);
    for (const [x, want, mascot] of [[1.2, 1, 'win'], [5, 2, 'bigwin'], [15, 3, 'epic'], [100, 3, 'epic']]) {
      const s = spies();
      const r = stageWin(s.sinks, { level: level(x * C, C), crossed: false, combo: 1, total: x * C });
      assert.equal(r.recipe.level, want);
      assert.equal(s.count('winSound'), 1); assert.equal(s.count('ledgerTick'), 0); assert.ok(s.count('sparks') === 1 && s.count('trauma') === 1 && s.count('ripple') === 1);
      assert.equal(s.calls.find((c) => c[0] === 'mascot')[1], mascot);
    }
  }
});
test('gate: ripple amplitude 1.08 / 1.14 / 1.20, the crossing beat first, trauma grows with the combo, hold 780..1500 ms', () => {
  assert.deepEqual([1, 2, 3].map((l) => STAGE[l].ripple), [1.08, 1.14, 1.20]);
  const s = spies();
  stageWin(s.sinks, { level: 1, crossed: true, combo: 3, total: 2 });
  assert.equal(s.calls[0][0], 'inBlack');
  const tr = s.calls.find((c) => c[0] === 'trauma')[1];
  assert.ok(Math.abs(tr - (STAGE[1].trauma + 2 * STAGE[1].traumaPerCombo)) < 1e-9);
  assert.equal(stageWin({}, { level: 1, total: 0 }).holdMs, 780);
  assert.equal(stageWin({}, { level: 3, total: 1000 }).holdMs, 1500);
  assert.equal(stageWin({}, { level: 0, total: 1000 }).holdMs, 450);
  assert.equal(recipe(7).level, 3); assert.equal(recipe(-1).level, 0); assert.equal(recipe(NaN).level, 0);
});
test('tumble recipe: the pop of a quiet step has no particles, sound, shake or brightness', () => {
  const q = tumbleRecipe(0);
  assert.deepEqual([q.shards, q.sparks, q.ring, q.popSound, q.trauma, q.brightness], [false, false, false, false, false, false]);
  for (const l of [1, 2, 3]) assert.ok(tumbleRecipe(l).popSound && tumbleRecipe(l).shards);
});
test('happy poses are blocked at level 0 only', () => {
  for (const p of ['happy', 'bigwin', 'celebrate']) { assert.equal(guardPose(p, 0), null); assert.equal(guardPose(p, 1), p); }
  for (const p of ['idle', 'think', 'shock', 'shrug', 'plunger', 'dance']) assert.equal(guardPose(p, 0), p);
});

// ---------- the running return of a round ----------
const ev = (type, o = {}) => ({ type, ...o });
const win = (...amounts) => ev('winInfo', { totalWin: amounts.reduce((a, b) => a + b, 0), wins: amounts.map((w) => ({ win: w, meta: {} })) });
test('round: R accumulates per cascade step and crosses the cost exactly once', () => {
  const r = createRound(1);
  let o = r.apply(ev('reveal')); assert.equal(o.level, 0);
  o = r.apply(win(40)); assert.equal(o.next, 0.4); assert.equal(o.level, 0); assert.equal(o.crossed, false);
  r.apply(ev('updateTumbleWin', { amount: 40 }));
  o = r.apply(win(60)); assert.equal(o.next, 1); assert.equal(o.level, 0); assert.equal(o.crossed, false, '1.0x is not above the cost');
  o = r.apply(win(20)); assert.equal(o.next, 1.2); assert.equal(o.level, 1); assert.equal(o.crossed, true);
  o = r.apply(win(500)); assert.equal(o.level, 2); assert.equal(o.crossed, false);
  assert.equal(r.black, true);
});
test('round: a free spin feature keeps the running total across spins; cost 100 stays quiet to 100x', () => {
  const r = createRound(100);
  r.apply(ev('reveal')); r.apply(ev('setTotalWin', { amount: 0 }));
  r.apply(ev('reveal')); r.apply(win(2000)); r.apply(ev('updateTumbleWin', { amount: 2000 })); r.apply(ev('setWin', { amount: 2000 }));
  let o = r.apply(ev('setTotalWin', { amount: 2000 })); assert.equal(o.next, 20); assert.equal(o.level, 0);
  r.apply(ev('reveal'));
  o = r.apply(win(7000)); assert.equal(o.next, 90); assert.equal(o.level, 0);
  o = r.apply(win(2000)); assert.equal(o.next, 110); assert.equal(o.level, 1); assert.equal(o.crossed, true);
  r.apply(ev('setWin', { amount: 9000 })); o = r.apply(ev('setTotalWin', { amount: 11000 })); assert.equal(o.next, 110);
  o = r.apply(ev('freeSpinEnd', { amount: 11000 })); assert.equal(o.next, 110); assert.equal(o.crossed, false);
});
test('round: banked wins (Sealed Orders) never move R until the setWin of the case opening', () => {
  const r = createRound(1);
  r.apply(ev('reveal'));
  const o1 = r.apply({ type: 'winInfo', totalWin: 1200, wins: [{ win: 1200, meta: { banked: true } }] });
  assert.equal(o1.next, 0); assert.equal(o1.banked, true);
  const o2 = r.apply(ev('updateTumbleWin', { amount: 1200 })); assert.equal(o2.next, 0);
  const o3 = r.apply(ev('setWin', { amount: 26400 })); assert.equal(o3.next, 264); assert.equal(o3.level, 3); assert.equal(o3.crossed, true);
});
test('round: a hand-made book with only setWin / setTotalWin still crosses once; wincap sets the cap', () => {
  const r = createRound(1);
  r.apply(ev('reveal'));
  let o = r.apply(ev('setWin', { amount: 250 })); assert.equal(o.next, 2.5); assert.equal(o.crossed, true);
  o = r.apply(ev('setTotalWin', { amount: 250 })); assert.equal(o.crossed, false);
  o = r.apply(ev('wincap', { amount: 500000 })); assert.equal(o.next, 5000); assert.equal(o.level, 3);
  r.reset(100); assert.equal(r.R, 0); assert.equal(r.cost, 100); assert.equal(r.black, false);
});
test('round: float noise cannot flip the cost line (multiples of 0.1x)', () => {
  const r = createRound(1);
  r.apply(ev('reveal'));
  for (let i = 0; i < 10; i++) { const o = r.apply(win(10)); assert.equal(o.level, 0, `step ${i}`); }
  assert.equal(r.R, 1);
  assert.equal(r.apply(win(10)).level, 1);
});

// ---------- the staircase ----------
test('staircase: every segment >= 0.5 s, thresholds 15/30/50/100x cost, 0.85 s per segment + 0.55 s beat', () => {
  assert.deepEqual([...TIER_THRESHOLDS], [15, 30, 50, 100]); assert.equal(SEGMENT_MS, 850); assert.equal(BEAT_MS, 550);
  for (const C of [1, 100]) {
    for (const x of [15, 16, 20, 30, 45, 50, 75, 100, 250, 500, 1500, 5000]) {
      const p = tierPlan(x * (C === 1 ? 1 : 1), C);
      for (const s of p.steps) assert.ok(s.ms >= 500, `x=${x} C=${C} ${s.type} ${s.ms}`);
      const counts = p.steps.filter((s) => s.type === 'count');
      assert.equal(counts[counts.length - 1].to, Math.max(x, 0), 'ends on the final value');
      const beats = p.steps.filter((s) => s.type === 'beat');
      for (const b of beats) assert.equal(b.ms, 550);
    }
  }
  const p45 = tierPlan(45, 1);
  assert.deepEqual(p45.steps.map((s) => s.type), ['count', 'beat', 'count', 'beat', 'count']);
  assert.equal(p45.steps[0].ms, 900); assert.equal(p45.steps[2].ms, 850);
  assert.deepEqual(p45.steps.filter((s) => s.type === 'beat').map((b) => b.key), ['win.big', 'win.mega']);
  assert.deepEqual([...HIT_STOP_MS], [0, 83, 100, 125]);
});
test('staircase: durations match the design (2.4 s at 20x, 3.8 s at 45x, 5.2 s at 75x, 6.9 s at 500x) and 5000x is <= 7.5 s', () => {
  const near = (x, s) => Math.abs(tierPlan(x, 1).totalMs / 1000 - s) < 0.12;
  assert.ok(near(20, 2.4)); assert.ok(near(45, 3.8)); assert.ok(near(75, 5.2)); assert.ok(near(500, 6.9));
  assert.ok(tierPlan(5000, 1).totalMs <= STAIRCASE_MAX_MS, `5000x: ${tierPlan(5000, 1).totalMs} ms`);
  assert.ok(tierPlan(5000, 1).totalMs > 7000);
  // monotone: a bigger amount never plays shorter
  let prev = 0; for (const x of [15, 20, 30, 45, 50, 75, 100, 500, 5000]) { const m = tierPlan(x, 1).totalMs; assert.ok(m >= prev); prev = m; }
  // the 100x door round tops out at 50x its cost: three tiers, no epic
  assert.ok(tierPlan(5000, 100).totalMs < 5000); assert.equal(tierPlan(5000, 100).steps.filter((s) => s.type === 'beat').length, 3);
});
test('staircase: below the first tier it is one plain count, no beat; a target on a threshold has no extra segment', () => {
  const p = tierPlan(12, 1); assert.deepEqual(p.steps.map((s) => s.type), ['count']); assert.ok(p.steps[0].ms >= 700 && p.steps[0].ms <= 1500);
  const q = tierPlan(30, 1); assert.deepEqual(q.steps.map((s) => s.type), ['count', 'beat', 'count', 'beat']);
  assert.deepEqual(tierPlan(0, 1).steps, []); assert.deepEqual(tierPlan(NaN, 1).steps, []);
  assert.equal(tierOf(14.99, 1), null); assert.equal(tierOf(15, 1), 'win.big'); assert.equal(tierOf(100, 1), 'win.epic');
  assert.equal(tierOf(1500, 100), 'win.big'); assert.equal(tierOf(WINCAP, 100), 'win.max'); assert.equal(tierOf(5000, 1), 'win.max');
});
test('end of a round: setWin staircase only at L3, wincap always, freeSpinEnd FILED at R <= C and DECLASSIFIED above', () => {
  assert.equal(endPlan('setWin', { R: 14, C: 1, spinX: 14 }).kind, 'none');
  assert.equal(endPlan('setWin', { R: 15, C: 1, spinX: 15 }).kind, 'staircase');
  assert.equal(endPlan('setWin', { R: 40, C: 1, spinX: 40, inFs: true }).kind, 'none', 'inside free spins a spin needs 50x');
  assert.equal(endPlan('setWin', { R: 60, C: 1, spinX: 50, inFs: true }).kind, 'staircase');
  assert.equal(endPlan('setWin', { R: 0.4, C: 1, spinX: 0.4 }).kind, 'none');
  assert.equal(endPlan('wincap', { R: 5000, C: 1 }).kind, 'staircase');
  for (const C of [1, 100]) {
    for (const x of [0, 0.4, 1.0]) { const e = endPlan('freeSpinEnd', { R: x * C, C }); assert.equal(e.kind, 'filed'); assert.equal(e.stamp, 'filed'); assert.equal(e.plan.steps.length, 1); assert.equal(e.plan.steps[0].ms, 600); }
    for (const x of [1.2, 15, 100]) { const e = endPlan('freeSpinEnd', { R: x * C, C }); assert.equal(e.kind, 'declassified'); assert.equal(e.stamp, 'declassified'); }
  }
});

// ---------- motion store ----------
function fakeSettings(init = {}) {
  const v = { motionLevel: 'full', flashReduced: false, ...init };
  const subs = new Map();
  return {
    get: (k) => v[k],
    on(k, fn) { if (!subs.has(k)) subs.set(k, new Set()); subs.get(k).add(fn); return () => subs.get(k).delete(fn); },
    set(k, val) { v[k] = val; for (const fn of subs.get(k) || []) fn(val, k); },
  };
}
test('motion: Full / Calm / Still numbers and the flash modes', () => {
  assert.deepEqual(['full', 'calm', 'still'].map((l) => motionStateFrom(l, false).flashMode), ['flash', 'dissolve', 'none']);
  assert.equal(motionStateFrom('full', true).flashMode, 'dissolve', 'flashes off in Full = a 167 ms dissolve');
  const f = motionStateFrom('full', false), c = motionStateFrom('calm', false), s = motionStateFrom('still', false);
  assert.deepEqual([f.shake, c.shake, s.shake], [1, 0.25, 0]);
  assert.deepEqual([f.rotation, c.rotation, s.rotation], [true, false, false]);
  assert.deepEqual([f.hitStop, c.hitStop, s.hitStop], [true, false, false]);
  assert.deepEqual([f.particles, c.particles, s.particles], [1, 0.4, 0]);
  assert.equal(motionStateFrom('nonsense', false).level, 'full');
});
test('motion: follows the settings live, is read-only, particle counts scale', () => {
  const st = fakeSettings();
  const m = createMotion(st);
  let seen = 0; const off = m.subscribe(() => { seen++; });
  assert.equal(m.level, 'full'); assert.equal(m.count(10), 10);
  st.set('motionLevel', 'calm'); assert.equal(m.level, 'calm'); assert.equal(m.reduced, true); assert.equal(m.count(10), 4); assert.equal(m.count(1), 1);
  st.set('motionLevel', 'still'); assert.equal(m.count(10), 0);
  st.set('motionLevel', 'full'); st.set('flashReduced', true); assert.equal(m.flashMode, 'dissolve'); assert.equal(m.flashes, false);
  assert.equal(seen, 4);
  off(); st.set('flashReduced', false); assert.equal(seen, 4); assert.equal(m.flashes, true);
  assert.equal(typeof m.set, 'undefined', 'the store has no writer');
  m.dispose();
});
test('motion: a broken settings object never throws', () => {
  const m = createMotion({ get() { throw new Error('x'); }, on() { throw new Error('y'); } });
  assert.equal(m.level, 'full');
  assert.equal(createMotion(null).level, 'full');
});

// ---------- camera: trauma + hit-stop ----------
function fakeEnv() {
  let t = 0; const q = [];
  const el = { style: {} };
  return {
    el,
    now: () => t,
    raf: (fn) => { q.push(fn); return q.length; },
    caf: () => {},
    step(ms) { t += ms; const f = q.splice(0); f.forEach((fn) => fn(t)); },
    get queued() { return q.length; },
  };
}
test('camera: offset is MAX * T^2 * noise, capped at 1.6% of the short side and 0.8 degree; ambient trauma caps at 0.5', () => {
  const env = fakeEnv();
  const m = createMotion(fakeSettings());
  const cam = createCamera({ targets: () => [env.el], motion: m, shortSide: () => 500, now: env.now, raf: env.raf, caf: env.caf, rand: () => 1, document: null });
  cam.add(1, { tier: true }); cam.add(1, { tier: true });
  assert.equal(cam.trauma, 1);
  env.step(16);
  const [x] = env.el.style.translate.split('px')[0].split(' ').map(Number);
  assert.ok(Math.abs(x) <= Math.ceil(0.016 * 500) + 1, `x ${x}`);
  assert.ok(Math.abs(parseFloat(env.el.style.rotate)) <= MAX_ROT_DEG + 1e-6);
  cam.reset();
  cam.add(0.4); cam.add(0.4); assert.equal(Math.round(cam.trauma * 100) / 100, AMBIENT_CAP, 'non-tier sources are capped at .5 together');
  assert.equal(MAX_FRAC, 0.016);
  cam.destroy();
});
test('camera: decays linearly at 1.4 per second and rests on the exact origin; noise is held for 83 ms', () => {
  const env = fakeEnv();
  const m = createMotion(fakeSettings());
  let n = 0; const seq = [0.9, 0.2, 0.7, 0.9, 0.4, 0.1, 0.5, 0.8, 0.3];
  const cam = createCamera({ targets: () => [env.el], motion: m, shortSide: () => 500, now: env.now, raf: env.raf, caf: env.caf, rand: () => seq[n++ % seq.length], document: null });
  cam.add(0.35, { tier: true });
  env.step(16); const a = env.el.style.translate; env.step(16); const b = env.el.style.translate;
  assert.equal(a, b, 'noise is held between 83 ms samples');
  for (let i = 0; i < 20; i++) env.step(16);
  assert.equal(env.el.style.translate, ''); assert.equal(env.el.style.rotate, ''); assert.equal(env.queued, 0, 'the loop stops at rest');
  assert.ok(cam.trauma === 0);
  cam.destroy();
});
test('camera: Calm uses a quarter of the amplitude and no rotation, Still never moves', () => {
  for (const [lvl, maxPx, rot] of [['calm', 0.25 * 0.016 * 500 + 1, false], ['still', 0, false]]) {
    const env = fakeEnv();
    const st = fakeSettings({ motionLevel: lvl });
    const cam = createCamera({ targets: () => [env.el], motion: createMotion(st), shortSide: () => 500, now: env.now, raf: env.raf, caf: env.caf, rand: () => 1, document: null });
    const accepted = cam.add(1, { tier: true });
    if (lvl === 'still') { assert.equal(accepted, false); assert.equal(env.queued, 0); continue; }
    env.step(16);
    const x = Number(env.el.style.translate.split('px')[0]);
    assert.ok(Math.abs(x) <= maxPx, `${lvl} x ${x}`);
    assert.equal(env.el.style.rotate, '');
    cam.destroy();
  }
});
test('camera: the v1 shake(amp) maps amp 1.5 (the wire blast) to trauma .55', () => {
  const env = fakeEnv();
  const cam = createCamera({ targets: () => [env.el], motion: createMotion(fakeSettings()), now: env.now, raf: env.raf, caf: env.caf, document: null });
  cam.shake(1.5); assert.ok(Math.abs(cam.trauma - 0.555) < 0.01); cam.destroy();
});
function fakeDoc(n) {
  const anims = Array.from({ length: n }, (_, i) => ({ id: i, playState: i === n - 1 ? 'paused' : 'running', pause() { this.playState = 'paused'; this.paused = (this.paused || 0) + 1; }, play() { this.playState = 'running'; this.played = (this.played || 0) + 1; } }));
  return { anims, getAnimations: () => anims };
}
test('hit-stop: pauses the running animations, resumes them, leaves already paused ones alone; one per 400 ms; Full only', async () => {
  const doc = fakeDoc(4);
  let clock = 1000;
  const m = createMotion(fakeSettings());
  const cam = createCamera({ motion: m, document: doc, now: () => clock, raf: () => 0, caf: () => {} });
  const events = []; cam.onFreeze((on) => events.push(on));
  const p = cam.freeze(30);
  assert.equal(cam.frozen, true);
  assert.deepEqual(doc.anims.map((a) => a.playState), ['paused', 'paused', 'paused', 'paused']);
  assert.equal(await p, true);
  assert.equal(cam.frozen, false);
  assert.deepEqual(doc.anims.map((a) => a.playState), ['running', 'running', 'running', 'paused'], 'the animation that was already paused stays paused');
  assert.equal(doc.anims[3].played, undefined);
  assert.deepEqual(events, [true, false]);
  assert.equal(await cam.freeze(30), false, 'a second freeze within 400 ms is refused');
  clock += 450;
  assert.equal(await cam.freeze(5), true);
  assert.equal(await cam.freeze(0), false); assert.equal(await cam.freeze(-5), false);
});
test('hit-stop: never in Calm or Still, never longer than 200 ms, a throwing animation never blocks the resume', async () => {
  for (const lvl of ['calm', 'still']) {
    const doc = fakeDoc(3);
    const cam = createCamera({ motion: createMotion(fakeSettings({ motionLevel: lvl })), document: doc, raf: () => 0, caf: () => {} });
    assert.equal(await cam.freeze(100), false);
    assert.deepEqual(doc.anims.map((a) => a.playState), ['running', 'running', 'paused']);
  }
  const doc = fakeDoc(3); doc.anims[0].pause = () => { throw new Error('boom'); };
  let clock = 0;
  const cam = createCamera({ motion: createMotion(fakeSettings()), document: doc, now: () => (clock += 1000), raf: () => 0, caf: () => {} });
  const t0 = Date.now();
  assert.equal(await cam.freeze(5000), true);
  assert.ok(Date.now() - t0 < 600, 'capped at 200 ms');
  assert.equal(doc.anims[1].playState, 'running');
});
