import test from 'node:test';
import assert from 'node:assert/strict';
import { spaceDecision, spaceAction, createPacer } from '../../src/input.js';

test('space: idle spins and is always prevented', () => {
  assert.deepEqual(spaceDecision({ state: 'idle' }), { spin: true, prevent: true });
  for (const state of ['betting', 'playing', 'settling', 'booting', 'authenticating', 'error']) assert.deepEqual(spaceDecision({ state }), { spin: false, prevent: true }, state);
  assert.deepEqual(spaceDecision({ state: 'idle', autoplayActive: true }), { spin: false, prevent: true });
  assert.deepEqual(spaceDecision({ state: 'idle', repeat: true }), { spin: false, prevent: true });       // no double fire while the key is held
});
test('space inside a dialog toggles the focused control and never spins', () => {
  assert.deepEqual(spaceDecision({ state: 'idle', modalOpen: true, controlFocused: true }), { spin: false, prevent: false }); // native toggle of the switch / tab / checkbox
  assert.deepEqual(spaceDecision({ state: 'idle', modalOpen: true, controlFocused: false }), { spin: false, prevent: true }); // nothing focused: no scroll, no spin
  for (const state of ['idle', 'playing', 'settling']) assert.equal(spaceDecision({ state, modalOpen: true, controlFocused: true }).spin, false);
});
test('space: replay and not-yet-authenticated never spin and never take the key', () => {
  assert.deepEqual(spaceDecision({ state: 'idle', replay: true }), { spin: false, prevent: false });
  assert.deepEqual(spaceDecision({ state: 'idle', hasBet: false }), { spin: false, prevent: false });
});
test('space: disabledSpacebar (capability off) never spins but still takes the key', () => {
  assert.deepEqual(spaceDecision({ state: 'idle', spacebar: false }), { spin: false, prevent: true });
  assert.deepEqual(spaceDecision({ state: 'idle', spacebar: false, modalOpen: true, controlFocused: true }), { spin: false, prevent: false }); // dialogs keep their keyboard
});
test('space: the v1 helper is unchanged', () => {
  assert.equal(spaceAction({ state: 'idle', modalOpen: false }), 'spin'); assert.equal(spaceAction({ state: 'idle', modalOpen: true }), null); assert.equal(spaceAction({ state: 'playing', modalOpen: false }), null);
  assert.deepEqual(spaceDecision(), { spin: false, prevent: true });   // no argument: must not throw
});
test('pacer: the next round never starts before t0 + minimum (also with turbo, which only shortens animations)', async () => {
  let now = 10_000; const slept = []; const sleep = async (ms) => { slept.push(ms); now += ms; };
  const p = createPacer({ now: () => now, sleep });
  assert.equal(p.remaining(2500), 0); assert.equal(p.started, null);
  p.begin(); assert.equal(p.started, 10_000);
  now += 900; assert.equal(p.remaining(2500), 1600);
  assert.equal(await p.wait(2500), 1600); assert.deepEqual(slept, [1600]); assert.equal(now, 12_500);
  assert.equal(p.remaining(2500), 0); assert.equal(await p.wait(2500), 0); assert.equal(slept.length, 1);       // already past: no wait
  p.begin(); now += 5000; assert.equal(p.remaining(2500), 0);                                                   // a long round (bonus) needs no extra wait
  p.begin(); assert.equal(p.remaining(0), 0); assert.equal(p.remaining(-1), 0); assert.equal(p.remaining(NaN), 0);  // no minimum
});
