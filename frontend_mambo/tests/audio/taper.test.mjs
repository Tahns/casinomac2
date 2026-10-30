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

// ---- M2/M3 (WP123): music default 5 %, conditional caseOpen, quiet meter riser ----
import { cueWinLike, DEFAULT_VOLUMES, DEFAULT_MUSIC_VOLUME, audio as liveAudio, createEngine } from '../../src/audio.js';

test('music default 5 % (slot guide rule), Master and Effects 75; reset and defaultVolume follow it', () => {
  assert.equal(DEFAULT_MUSIC_VOLUME, 5);
  assert.deepEqual({ ...DEFAULT_VOLUMES }, { master: 75, music: 5, sfx: 75 });
  assert.ok(Object.isFrozen(DEFAULT_VOLUMES));
  assert.equal(liveAudio.defaultVolume('music'), 5); assert.equal(liveAudio.defaultVolume('nope'), null);
  const before = liveAudio.volumes;
  liveAudio.setVolume('music', 60); liveAudio.resetVolumes();
  assert.deepEqual(liveAudio.volumes, { master: 75, music: 5, sfx: 75 });
  for (const k of Object.keys(before)) liveAudio.setVolume(k, before[k]);
  // 5 on the taper: -42 dB under the v1 mix, a bed far under the effects but not silence
  assert.ok(taper(5) > 0 && Math.abs(dB(taper(5)) - -42) < 1e-9);
  liveAudio._stop();
});

test('caseOpen is win-like only when the spin result is above its cost share; caseSeal / stamp never', () => {
  assert.equal(CUE_INFO.caseOpen.winLike, false); assert.equal(CUE_INFO.caseOpen.winLikeIf, 'aboveCostShare');
  assert.equal(cueWinLike('caseOpen', { win: 2640, costShare: 833.3 }), true);
  assert.equal(cueWinLike('caseOpen', { win: 500, costShare: 833.3 }), false);
  assert.equal(cueWinLike('caseOpen', { win: 833.3, costShare: 833.3 }), false, 'equal to the share is not above it');
  for (const bad of [undefined, null, {}, { win: 10 }, { costShare: 1 }, { win: 'x', costShare: 1 }, { win: 5, costShare: -1 }]) assert.equal(cueWinLike('caseOpen', bad), false, JSON.stringify(bad));
  for (const id of ['caseSeal', 'stamp', 'ledgerTick', 'dialStep']) assert.equal(cueWinLike(id, { win: 1e6, costShare: 1 }), false, id);
  assert.equal(cueWinLike('win'), true); assert.equal(cueWinLike('nope'), null); assert.equal(cueWinLike('constructor'), null);
  assert.equal(liveAudio.isWinLike('caseOpen'), false); assert.equal(liveAudio.isWinLike('caseOpen', { win: 2, costShare: 1 }), true);
});

// a tiny fake AudioContext: enough for createEngine + cue() to run in node and to count what got scheduled
function fakeCtx() {
  const made = [];
  const param = () => ({ value: 0, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {}, setTargetAtTime() {}, cancelScheduledValues() {} });
  const node = (kind) => { const n = { kind, gain: param(), frequency: param(), detune: param(), Q: param(), pan: param(), delayTime: param(), threshold: param(), knee: param(), ratio: param(), attack: param(), release: param(), playbackRate: param(), connect() { return n; }, disconnect() {}, start() { made.push(kind); }, stop() {}, onended: null, buffer: null, curve: null, type: '' }; return n; };
  return {
    made, sampleRate: 8000, currentTime: 0, destination: node('dest'), state: 'running',
    createGain: () => node('gain'), createOscillator: () => node('osc'), createBufferSource: () => node('buf'), createBiquadFilter: () => node('biquad'),
    createDynamicsCompressor: () => node('comp'), createWaveShaper: () => node('shaper'), createConvolver: () => node('conv'), createDelay: () => node('delay'),
    createStereoPanner: () => node('pan'), createBuffer: (ch, len) => ({ getChannelData: () => new Float32Array(len) }),
  };
}
test('caseOpen plays its neutral flap on the quiet path or at or below the share, and adds the vibraphone only above it', () => {
  const count = (opt) => { const c = fakeCtx(); const e = createEngine(c); const before = c.made.length; assert.equal(e.cue('caseOpen', opt), true); return c.made.length - before; };
  const neutral = count({}), below = count({ win: 100, costShare: 833 }), quiet = count({ win: 5000, costShare: 833, quiet: true }), above = count({ win: 5000, costShare: 833 });
  assert.equal(below, neutral); assert.equal(quiet, neutral, 'the quiet path never gets the win-like layer');
  assert.ok(above > neutral, `the win layer adds voices (${neutral} -> ${above})`);
});
