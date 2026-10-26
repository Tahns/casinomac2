// U1: the slider taper, and the shape of the cue table (pure data, no AudioContext needed).
//   node --test tests/audio/taper.test.mjs      (also run by tests/audio/audio.test.mjs)
import test from 'node:test';
import assert from 'node:assert/strict';
import { taper, taperDb, CUE_INFO, CUE_IDS, parseVolume } from '../../src/audio.js';

const dB = (g) => 20 * Math.log10(g);

test('U1 taper: 0 -> 0, 75 -> 1 (unity), 100 = +3 dB, 1 is about -44 dB', () => {
  assert.equal(taper(0), 0);
  assert.equal(taper(75), 1);
  assert.ok(Math.abs(taper(100) - Math.pow(10, 3 / 20)) < 1e-9, 'taper(100) = 10^(3/20)');
  assert.ok(Math.abs(dB(taper(100)) - 3) < 1e-9);
  assert.ok(taper(1) < 0.01 && taper(1) > 0, 'taper(1) is a faint but non-zero level');
  assert.ok(Math.abs(dB(taper(1)) - -44.4) < 0.05, `taper(1) = ${dB(taper(1)).toFixed(2)} dB`);
  // the table of the spec: 25 -> -30 dB, 50 -> -15 dB, 60 -> -9 dB
  for (const [s, want] of [[25, -30], [50, -15], [60, -9]]) assert.ok(Math.abs(dB(taper(s)) - want) < 1e-9, `taper(${s}) = ${want} dB`);
});

test('U1 taper is strictly increasing over 1..100 and dB-linear on each side of 75', () => {
  let prev = taper(0);
  for (let s = 1; s <= 100; s++) { const g = taper(s); assert.ok(g > prev, `taper(${s}) > taper(${s - 1})`); prev = g; }
  for (let s = 2; s <= 75; s++) assert.ok(Math.abs(dB(taper(s)) - dB(taper(s - 1)) - 45 / 75) < 1e-9, `0.6 dB per step below 75 (${s})`);
  for (let s = 77; s <= 100; s++) assert.ok(Math.abs(dB(taper(s)) - dB(taper(s - 1)) - 3 / 25) < 1e-9, `0.12 dB per step above 75 (${s})`);
});

test('taper input handling: clamped, never NaN, never negative', () => {
  assert.equal(taper(-5), 0); assert.equal(taper(-Infinity), 0);
  assert.equal(taper(150), taper(100)); assert.equal(taper(Infinity), taper(100));
  for (const bad of [NaN, undefined, null, 'abc', {}]) { const g = taper(bad); assert.ok(Number.isFinite(g) && g >= 0, String(bad)); }
  assert.equal(taperDb(0), -Infinity); assert.equal(taperDb(75), 0);
  assert.ok(taper(50.5) > taper(50) && taper(50.5) < taper(51), 'continuous between integers');
  // the stored-value parser feeds the taper with integers 0..100
  for (const raw of ['999', 'abc', '', '-5', '75.5', null]) { const v = parseVolume(raw); assert.ok(v === null || (Number.isInteger(v) && v >= 0 && v <= 100), String(raw)); }
});

test('cue table: every sound carries an explicit boolean winLike flag; the ten v2 cues are neutral', () => {
  assert.ok(CUE_IDS.length >= 56, `${CUE_IDS.length} cues`);
  assert.ok(Object.isFrozen(CUE_INFO));
  for (const id of CUE_IDS) {
    const e = CUE_INFO[id];
    assert.equal(typeof e.winLike, 'boolean', id); assert.ok(Object.isFrozen(e), id);
  }
  for (const id of ['ledgerTick', 'settingsTest', 'stamp', 'caseSeal', 'caseOpen', 'lightsOut', 'spotlightStep', 'layoutDraw', 'doorCreak', 'dialStep']) {
    assert.ok(Object.prototype.hasOwnProperty.call(CUE_INFO, id), id); assert.equal(CUE_INFO[id].winLike, false, `${id} is not win-like`);
  }
  for (const id of ['win', 'bigwin', 'tada', 'coin', 'kaching', 'shower', 'fsStart', 'fsEnd']) assert.equal(CUE_INFO[id].winLike, true, `${id} is win-like`);
  assert.equal(CUE_INFO.settingsTest.minGap, 0.25);
  for (const id of CUE_IDS) if (id !== 'settingsTest') assert.equal(CUE_INFO[id].minGap, undefined, `${id} has no rate limit`);
  assert.equal(Object.prototype.hasOwnProperty.call(CUE_INFO, 'constructor'), false);
});
