// Unit tests for src/settings.js (step 0 skeleton of the frozen API; WP1 extends: U2 stored values, U3 storage failure, U4 flags, U5 round pacing).
import test from 'node:test';
import assert from 'node:assert/strict';
import { createSettings, createStorage, capabilitiesFrom, parseStored, remainingRoundMs, STORAGE_KEYS, FLAG_NAMES, FLAG_TO_CAPABILITY, SETTING_KEYS } from '../../src/settings.js';

const memStorage = (init = {}) => { const m = new Map(Object.entries(init)); return { m, getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => { m.set(k, String(v)); }, removeItem: (k) => { m.delete(k); } }; };
const fresh = (storage = memStorage(), extra = {}) => createSettings({ storage, document: null, window: null, matchMedia: null, ...extra });
const blob = (o) => JSON.stringify({ v: 1, ...o });

test('frozen surface: get / set / on / capabilities', () => {
  const s = fresh();
  assert.equal(typeof s.get, 'function'); assert.equal(typeof s.set, 'function'); assert.equal(typeof s.on, 'function');
  assert.equal(typeof s.capabilities, 'object');
  assert.deepEqual([...STORAGE_KEYS], ['am_muted', 'am_vol_master', 'am_vol_music', 'am_vol_sfx', 'am_settings']);
});

test('defaults', () => {
  const s = fresh();
  assert.equal(s.get('motion'), 'auto'); assert.equal(s.get('reduceFlash'), null); assert.equal(s.get('highContrast'), null);
  assert.equal(s.get('ledger'), true); assert.equal(s.get('text'), 100); assert.equal(s.get('remind'), 0);
  assert.equal(s.get('motionLevel'), 'full'); assert.equal(s.get('flashReduced'), false); assert.equal(s.get('contrastOn'), false); assert.equal(s.get('ledgerOn'), true);
  assert.equal(s.get('nope'), undefined);
});

test('set validates, notifies, unsubscribes, ignores derived and unknown keys', () => {
  const s = fresh(); const seen = []; const all = [];
  const off = s.on('motion', (v, k, prev) => seen.push([v, k, prev]));
  s.on('*', (v, k) => all.push(k));
  assert.equal(s.set('motion', 'still'), 'still');
  assert.equal(s.set('motion', 'warp'), 'still');    // invalid: rejected, store unchanged
  assert.equal(s.set('motion', 'still'), 'still');   // same value: no event
  assert.deepEqual(seen, [['still', 'motion', 'auto']]);
  assert.ok(all.includes('motion') && all.includes('motionLevel'));
  assert.equal(s.get('motionLevel'), 'still');
  assert.equal(s.set('motionLevel', 'full'), undefined); assert.equal(s.get('motionLevel'), 'still');
  assert.equal(s.set('turbo', true), undefined); assert.equal(s.get('turbo'), undefined);
  off(); s.set('motion', 'calm'); assert.equal(seen.length, 1);
  assert.equal(s.set('text', '115'), 115); assert.equal(s.set('text', 120), 115);
  assert.equal(s.set('reduceFlash', true), true); assert.equal(s.get('flashReduced'), true); assert.equal(s.set('reduceFlash', null), null);
  assert.equal(s.set('ledger', 'yes'), true);
  // a throwing listener never breaks the store
  s.on('*', () => { throw new Error('boom'); }); assert.equal(s.set('motion', 'full'), 'full');
});

test('U2: stored values are validated on read (corrupt JSON, wrong version, unknown enum, junk types)', () => {
  const D = parseStored(null);
  assert.deepEqual(Object.keys(D).sort(), [...SETTING_KEYS].sort());
  for (const raw of ['', 'abc', '{', '[]', 'null', '123', '{"v":2,"motion":"still"}', '{"motion":"still"}', '{"v":"1","motion":"still"}']) assert.deepEqual(parseStored(raw), D, raw);
  assert.deepEqual(parseStored(blob({ motion: 'warp' })), D);                                  // unknown enum -> default
  assert.equal(parseStored(blob({ motion: 'calm', text: 999, ledger: 'x', evil: 1 })).motion, 'calm');
  assert.equal(parseStored(blob({ motion: 'calm', text: 999 })).text, 100);                  // a bad key only resets itself
  assert.equal(parseStored(blob({ ledger: false })).ledger, false);
  assert.equal(parseStored(blob({ reduceFlash: true, highContrast: false })).highContrast, false);
  assert.ok(!('evil' in parseStored(blob({ evil: 1 }))));
  const s = fresh(memStorage({ am_settings: blob({ motion: 'still', text: 130 }) }));
  assert.equal(s.get('motion'), 'still'); assert.equal(s.get('text'), 130);
});

test('U3: storage failures never throw; values live in memory', () => {
  const blocked = { storage: () => { const e = new Error('denied'); e.name = 'SecurityError'; throw e; } }; // the localStorage GETTER throws
  const quota = { getItem: () => null, setItem: () => { const e = new Error('full'); e.name = 'QuotaExceededError'; throw e; }, removeItem: () => { throw new Error('x'); } };
  for (const st of [blocked.storage, quota, null, { getItem() { throw new Error('read'); }, setItem() { throw new Error('write'); } }]) {
    const s = createSettings({ storage: st, document: null, window: null, matchMedia: null });
    assert.equal(s.get('motion'), 'auto');
    assert.equal(s.set('motion', 'calm'), 'calm'); s.flush();
    assert.equal(s.get('motion'), 'calm');
    assert.doesNotThrow(() => s.reset()); assert.equal(s.get('motion'), 'auto');
  }
  const st = createStorage({ storage: blocked.storage });
  assert.equal(st.write('am_muted', '1'), false); assert.equal(st.read('am_muted'), '1'); // memory copy still serves the value
});

test('storage whitelist: foreign keys are never read or written', () => {
  const ms = memStorage({ secret: 'x', am_muted: '1' });
  const st = createStorage({ storage: ms });
  assert.equal(st.read('secret'), null); assert.equal(st.write('secret', 'y'), false); assert.equal(ms.m.get('secret'), 'x');
  assert.equal(st.read('am_muted'), '1'); assert.equal(st.write('am_vol_music', 40), true); assert.equal(ms.m.get('am_vol_music'), '40');
  assert.equal(st.remove('turbo'), false); assert.equal(st.remove('am_vol_music'), true); assert.ok(!ms.m.has('am_vol_music'));
});

test('persistence: debounced write, flush, reload; defaults are not stored; turbo/autoplay/lang are never stored', async () => {
  const ms = memStorage(); const s = fresh(ms);
  s.set('motion', 'calm'); s.set('ledger', false);
  assert.equal(ms.m.has('am_settings'), false);           // debounced
  s.flush();
  assert.deepEqual(JSON.parse(ms.m.get('am_settings')), { v: 1, motion: 'calm', ledger: false });
  assert.deepEqual([...ms.m.keys()], ['am_settings']);
  const again = fresh(ms); assert.equal(again.get('motion'), 'calm'); assert.equal(again.get('ledger'), false);
  again.set('motion', 'auto'); again.flush(); assert.deepEqual(JSON.parse(ms.m.get('am_settings')), { v: 1, ledger: false });
  again.reset(); assert.deepEqual(JSON.parse(ms.m.get('am_settings')), { v: 1 });
  const t = fresh(ms); t.set('motion', 'still');
  await new Promise((r) => setTimeout(r, 260)); assert.equal(JSON.parse(ms.m.get('am_settings')).motion, 'still'); // the timer wrote it
});

test('OS preferences drive Auto / null settings live', () => {
  const mq = { reduce: false, contrast: false, ls: [] };
  const matchMedia = (q) => { const o = { get matches() { return /reduced-motion/.test(q) ? mq.reduce : mq.contrast; }, addEventListener: (_, fn) => mq.ls.push(fn) }; return o; };
  const attrs = {}; const doc = { documentElement: { setAttribute: (k, v) => { attrs[k] = v; } }, addEventListener() {}, hidden: false };
  const s = createSettings({ storage: memStorage(), matchMedia, document: doc, window: null });
  const got = []; s.on('motionLevel', (v) => got.push(v));
  assert.equal(s.get('motionLevel'), 'full'); assert.equal(attrs['data-motion'], 'full'); assert.equal(attrs['data-flash'], 'full');
  mq.reduce = true; mq.ls.forEach((f) => f());
  assert.equal(s.get('motionLevel'), 'calm'); assert.equal(s.get('flashReduced'), true); assert.equal(attrs['data-motion'], 'calm'); assert.equal(attrs['data-flash'], 'reduced');
  assert.deepEqual(got, ['calm']);
  s.set('motion', 'full'); assert.equal(s.get('motionLevel'), 'full'); assert.equal(attrs['data-motion'], 'full'); // explicit choice beats the OS
  s.set('reduceFlash', false); assert.equal(s.get('flashReduced'), false);
  mq.contrast = true; mq.ls.forEach((f) => f()); assert.equal(s.get('contrastOn'), true); assert.equal(attrs['data-contrast'], 'more');
  s.set('highContrast', false); assert.equal(s.get('contrastOn'), false);
});

// ---- capabilities (all 12 flags)
const ALL_OFF = Object.fromEntries(FLAG_NAMES.map((f) => [f, f === 'minimumRoundDuration' ? 0 : false]));
test('U4: an all-false jurisdiction enables everything (and is the default)', () => {
  const d = capabilitiesFrom(ALL_OFF);
  assert.deepEqual({ ...d }, { ...capabilitiesFrom(null) });
  assert.deepEqual({ ...d }, { ...capabilitiesFrom(undefined) }); assert.deepEqual({ ...d }, { ...capabilitiesFrom('junk') });
  for (const k of ['fullscreen', 'turbo', 'superTurbo', 'autoplay', 'slamstop', 'spacebar', 'buyFeature', 'anticipation']) assert.equal(d[k], true, k);
  for (const k of ['social', 'netPosition', 'rtp', 'sessionTimer', 'minRound', 'ledgerLocked']) assert.equal(d[k], false, k);
  assert.equal(d.minRoundMs, 0);
  assert.ok(Object.isFrozen(d));
});
test('U4: each of the 12 flags alone changes only its own capability (plus its documented derived fields)', () => {
  const base = { ...capabilitiesFrom(ALL_OFF) };
  const DERIVED = { displayNetPosition: ['ledgerLocked'], displaySessionTimer: ['ledgerLocked'], minimumRoundDuration: ['minRoundMs'] };
  assert.equal(FLAG_NAMES.length, 12); assert.equal(Object.keys(FLAG_TO_CAPABILITY).length, 12);
  assert.equal(new Set(Object.values(FLAG_TO_CAPABILITY)).size, 12);
  for (const flag of FLAG_NAMES) {
    const on = flag === 'minimumRoundDuration' ? 2500 : true;
    const c = { ...capabilitiesFrom({ ...ALL_OFF, [flag]: on }) };
    const changed = Object.keys(c).filter((k) => c[k] !== base[k]).sort();
    assert.deepEqual(changed, [FLAG_TO_CAPABILITY[flag], ...(DERIVED[flag] || [])].sort(), flag);
  }
  // polarity
  assert.equal(capabilitiesFrom({ disabledTurbo: true }).turbo, false); assert.equal(capabilitiesFrom({ socialCasino: true }).social, true);
  assert.equal(capabilitiesFrom({ displayRTP: true }).rtp, true);
});
test('capabilities: junk values and unknown keys', () => {
  const c = capabilitiesFrom({ disabledTurbo: 'true', disabledAutoplay: 1, disabledSpacebar: 'no', disabledFullscreen: null, bogus: true, minimumRoundDuration: '2500' });
  assert.equal(c.turbo, false); assert.equal(c.autoplay, false); assert.equal(c.spacebar, true); assert.equal(c.fullscreen, true);
  assert.equal(c.minRoundMs, 2500); assert.ok(!('bogus' in c));
  for (const v of [-5, NaN, Infinity, 'x', null, undefined, {}]) assert.equal(capabilitiesFrom({ minimumRoundDuration: v }).minRoundMs, 0, String(v));
  assert.equal(capabilitiesFrom({ minimumRoundDuration: 1e9 }).minRoundMs, 60000);
});
test('applyJurisdiction: snapshot replaced, event fired, ledger locked on, null restores defaults', () => {
  const s = fresh(); const first = s.capabilities; const ev = []; const led = [];
  s.on('capabilities', (c) => ev.push(c)); s.on('ledgerOn', (v) => led.push(v));
  s.set('ledger', false); assert.equal(s.get('ledgerOn'), false);
  s.applyJurisdiction({ displayNetPosition: true, disabledTurbo: true });
  assert.notEqual(s.capabilities, first); assert.equal(s.capabilities.turbo, false); assert.equal(s.capabilities.netPosition, true);
  assert.equal(s.get('ledgerOn'), true); assert.equal(s.get('ledger'), false); assert.deepEqual(led, [false, true]); assert.equal(ev.length, 1);
  s.applyJurisdiction({ displayNetPosition: true, disabledTurbo: true }); assert.equal(ev.length, 1); // same flags: no event
  s.applyJurisdiction(null); assert.equal(s.capabilities.turbo, true); assert.equal(s.get('ledgerOn'), false); assert.equal(ev.length, 2);
});

test('U5: remainingRoundMs', () => {
  assert.equal(remainingRoundMs(1000, 1500, 2500), 2000);
  assert.equal(remainingRoundMs(1000, 3500, 2500), 0); assert.equal(remainingRoundMs(1000, 9000, 2500), 0);
  assert.equal(remainingRoundMs(1000, 1000, 0), 0); assert.equal(remainingRoundMs(1000, 1000, -5), 0);
  assert.equal(remainingRoundMs(1000, 1000.4, 2500), 2500); assert.equal(remainingRoundMs(NaN, 1, 2500), 0);
  assert.equal(fresh().remainingRoundMs(0, 100, 2500), 2400);
});
