import test from 'node:test';
import assert from 'node:assert/strict';
import { createSettings, capabilitiesFrom, FLAG_NAMES, FLAG_TO_CAPABILITY } from '../../src/settings.js';

const memStorage = (init = {}) => { const m = new Map(Object.entries(init)); return { m, getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => { m.set(k, String(v)); }, removeItem: (k) => { m.delete(k); } }; };
const fresh = (st = memStorage()) => createSettings({ storage: st, document: null, window: null, matchMedia: null });

test('shell contract: what the dialog binds to exists and behaves (motion, flash, contrast, summary)', () => {
  const s = fresh();
  for (const m of ['auto', 'full', 'calm', 'still']) assert.equal(s.set('motion', m), m);
  assert.equal(s.set('motion', 'warp'), 'still');
  // the flash switch is "on" when flashes are allowed: reduceFlash = !on
  s.set('reduceFlash', true); assert.equal(s.get('flashReduced'), true); s.set('reduceFlash', false); assert.equal(s.get('flashReduced'), false);
  s.set('highContrast', true); assert.equal(s.get('contrastOn'), true);
  s.set('ledger', false); assert.equal(s.get('ledgerOn'), false);
  s.applyJurisdiction({ displaySessionTimer: true }); assert.equal(s.get('ledgerOn'), true); assert.equal(s.capabilities.ledgerLocked, true);   // locked on, the stored choice is kept
  s.applyJurisdiction(null); assert.equal(s.get('ledgerOn'), false);
});
test('shell contract: turbo, autoplay, bet and the jurisdiction are never stored', () => {
  const st = memStorage(); const s = fresh(st);
  for (const k of ['turbo', 'autoplay', 'bet', 'lang', 'social', 'currency', 'jurisdiction']) assert.equal(s.set(k, true), undefined, k);
  s.applyJurisdiction({ disabledTurbo: true, disabledAutoplay: true, socialCasino: true, minimumRoundDuration: 2500 });
  s.set('motion', 'calm'); s.flush();
  assert.deepEqual([...st.m.keys()], ['am_settings']); assert.deepEqual(JSON.parse(st.m.get('am_settings')), { v: 1, motion: 'calm' });
});
test('shell contract: one capability per flag, all 12 present and honoured by the shell names', () => {
  assert.equal(FLAG_NAMES.length, 12);
  const caps = capabilitiesFrom({});
  for (const f of FLAG_NAMES) assert.ok(FLAG_TO_CAPABILITY[f] in caps, f);
  // the capabilities the shell reads in main.js / replay.js / settings_dialog.js
  for (const k of ['social', 'fullscreen', 'turbo', 'superTurbo', 'autoplay', 'slamstop', 'spacebar', 'buyFeature', 'netPosition', 'rtp', 'sessionTimer', 'minRound', 'minRoundMs', 'ledgerLocked']) assert.ok(k in caps, k);
});
