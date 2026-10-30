// The v2 audio API skeleton in src/audio.js (step 0): setVolume / getVolume / preview / onChange / setMuted / play(unknown id).
// WP2 adds the buses behind it; these tests only pin the API contract. Node has no AudioContext, so play() reports false.
import test from 'node:test';
import assert from 'node:assert/strict';
import { audio, parseVolume, VOLUME_KINDS, DEFAULT_VOLUME } from '../../src/audio.js';

test('parseVolume: integer 0..100 or null', () => {
  const cases = [['75', 75], [75, 75], ['0', 0], ['100', 100], ['150', 100], ['-5', 0], ['75.5', 76], ['1e9', 100], [49.4, 49],
    ['abc', null], ['', null], ['  ', null], [null, null], [undefined, null], [NaN, null], [Infinity, null], [true, null], [{}, null]];
  for (const [raw, want] of cases) assert.equal(parseVolume(raw), want, String(raw));
});
test('defaults and setVolume / getVolume', () => {
  assert.deepEqual([...VOLUME_KINDS], ['master', 'music', 'sfx']); assert.equal(DEFAULT_VOLUME, 75);
  assert.equal(audio.getVolume('master'), 75); assert.equal(audio.getVolume('sfx'), 75); assert.equal(audio.getVolume('music'), 5); // music default 5 % (slot guide rule, WP123 M2/M3)
  assert.equal(audio.setVolume('music', 40), true); assert.equal(audio.getVolume('music'), 40);
  assert.equal(audio.setVolume('music', '250'), true); assert.equal(audio.getVolume('music'), 100);
  assert.equal(audio.setVolume('music', 'abc'), false); assert.equal(audio.getVolume('music'), 100);
  assert.equal(audio.setVolume('ambient', 10), false); assert.equal(audio.getVolume('ambient'), null);
  assert.deepEqual(audio.volumes, { master: 75, music: 100, sfx: 75 });
  audio.volumes.master = 1; assert.equal(audio.getVolume('master'), 75); // a copy
  audio.setVolume('music', 75);
});
test('onChange: volume and mute events, unsubscribe, a throwing listener is harmless', () => {
  const got = []; const off = audio.onChange((e) => got.push(e)); audio.onChange(() => { throw new Error('boom'); });
  audio.setVolume('sfx', 30); audio.setVolume('sfx', 30); audio.setMuted(true); audio.setMuted(true); audio.setMuted(false);
  assert.deepEqual(got.map((e) => [e.type, e.kind, e.value, e.muted]), [['volume', 'sfx', 30, false], ['mute', undefined, undefined, true], ['mute', undefined, undefined, false]]);
  assert.deepEqual(got[0].volumes, { master: 75, music: 75, sfx: 30 });
  off(); audio.setVolume('sfx', 75); assert.equal(got.length, 3);
  assert.equal(typeof audio.onChange('nope'), 'function');
});
test('play: unknown, non-string and prototype ids are no-ops that return false; preview never throws', () => {
  for (const id of ['nope', 'settingsTest', '', 'constructor', '__proto__', 'toString', undefined, null, 5, {}]) assert.equal(audio.play(id), false, String(id));
  for (const k of [...VOLUME_KINDS, 'bad', undefined]) assert.doesNotThrow(() => audio.preview(k));
  assert.equal(audio.preview('bad'), false);
  assert.equal(audio.muted, false);
  audio._stop();
});
