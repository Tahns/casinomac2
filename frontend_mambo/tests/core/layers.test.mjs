// The layer dispatcher (src/render/layers/index.js): shape {id, onEvent(ev, ctx), reset()}; empty list in step 0.
import test from 'node:test';
import assert from 'node:assert/strict';
import { LAYERS, dispatch, resetLayers } from '../../src/render/layers/index.js';

test('step 0: LAYERS is empty and dispatch/reset are inert', () => {
  assert.ok(Array.isArray(LAYERS)); assert.equal(LAYERS.length, 0);
  assert.equal(dispatch({ type: 'reveal' }, {}), null);
  assert.doesNotThrow(() => resetLayers());
});
test('dispatch: order, sync and async layers, errors isolated, bad entries skipped', async () => {
  const calls = []; const bad = console.error; const errs = []; console.error = (...a) => errs.push(a.join(' '));
  try {
    LAYERS.push(
      { id: 'a', onEvent: (ev, ctx) => { calls.push('a:' + ev.type + ':' + ctx.k); }, reset: () => calls.push('a:reset') },
      { id: 'throws', onEvent: () => { throw new Error('sync boom'); }, reset: () => { throw new Error('reset boom'); } },
      { id: 'slow', onEvent: () => new Promise((r) => setTimeout(() => { calls.push('slow:done'); r(); }, 30)) },
      { id: 'rejects', onEvent: () => Promise.reject(new Error('async boom')) },
      { id: 'noevent' }, null, 'junk',
      { id: 'z', onEvent: () => { calls.push('z'); }, reset: () => calls.push('z:reset') },
    );
    const p = dispatch({ type: 'layout' }, { k: 1 });
    assert.ok(p && typeof p.then === 'function');
    assert.deepEqual(calls, ['a:layout:1', 'z']); // sync parts ran in order, immediately
    await p; assert.deepEqual(calls, ['a:layout:1', 'z', 'slow:done']);
    assert.equal(errs.length >= 2, true);
    calls.length = 0; resetLayers(); assert.deepEqual(calls, ['a:reset', 'z:reset']);
  } finally { LAYERS.length = 0; console.error = bad; }
});
