// Shell round 1 fixes: first-spin briefing card (L8), door mission lines (H1-04 / H4-F1), mission wording (K2).
import test from 'node:test';
import assert from 'node:assert/strict';
import { shouldBrief, createBriefing, BRIEF_LINES } from '../../src/ui/briefing.js';
import { DOORS, MISSION_ICONS, doorFacts, doorFactLines } from '../../src/ui/doors.js';
import { createSettings, SETTING_KEYS } from '../../src/settings.js';
import { t, setSocial, EN } from '../../src/i18n/index.js';
import { findRestricted } from '../text/restricted.mjs';

test('briefing: opens only on a first visit, idle, never in replay', () => {
  assert.equal(shouldBrief({ briefed: false, replay: false, state: 'idle' }), true);
  assert.equal(shouldBrief({ briefed: true, replay: false, state: 'idle' }), false);
  assert.equal(shouldBrief({ briefed: false, replay: true, state: 'idle' }), false);
  assert.equal(shouldBrief({ briefed: false, replay: false, state: 'playing' }), false);
});

test('briefing: the seen flag lives in the whitelisted am_settings blob and survives reset()', () => {
  const m = new Map();
  const storage = { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) };
  const st = createSettings({ storage, matchMedia: () => ({ matches: false }), document: null, window: null });
  assert.ok(SETTING_KEYS.includes('briefed'));
  assert.equal(st.get('briefed'), false);
  st.set('briefed', true); st.flush();
  assert.deepEqual([...m.keys()], ['am_settings']);
  assert.equal(JSON.parse(m.get('am_settings')).briefed, true);
  st.reset();
  assert.equal(st.get('briefed'), true);
  const again = createSettings({ storage, matchMedia: () => ({ matches: false }), document: null, window: null });
  assert.equal(again.get('briefed'), true);
});

test('briefing: without a DOM the card is a no-op (never throws, never opens in replay)', () => {
  const settings = { v: false, get() { return this.v; }, set(k, v) { this.v = v; } };
  const b = createBriefing({ host: null, settings, t, replay: false, doc: null });
  b.maybeShow('idle'); b.dismiss();
  assert.equal(b.open, false);
  const r = createBriefing({ host: null, settings, t, replay: true, doc: null });
  r.show(); assert.equal(r.open, false);
});

test('briefing / doors / wording: every string exists and is social-safe', () => {
  const keys = ['briefing.title', ...BRIEF_LINES, 'briefing.close', 'briefing.again', 'err.title', 'err.title.maintenance', 'err.title.noParams', ...DOORS.map((d) => d.missionKey)];
  for (const social of [false, true]) {
    setSocial(social);
    for (const k of keys) {
      assert.ok(Object.prototype.hasOwnProperty.call(EN, k), 'missing key ' + k);
      assert.deepEqual(findRestricted(t(k)), [], `${k} (social ${social}): ${t(k)}`);
    }
  }
  setSocial(false);
  assert.equal(t('mode.freegame'), 'Mission Free Spins');
  assert.equal(t('autoplay.stopFeature'), 'Stop when a mission (free spins) starts');
  assert.ok(!/Briefing/.test(t('mode.freegame')));
});

test('doors: each door names its mission and has its own mark', () => {
  assert.deepEqual(DOORS.map((d) => t(d.missionKey).split(':')[0]), ['The Briefing', 'Sealed Orders', 'Ballroom Blackout']);
  for (const d of DOORS) assert.match(MISSION_ICONS[d.icon], /^<svg viewBox="0 0 32 32"/);
  // closed palette only in the marks (charter)
  const PAL = new Set(['#14102B', '#2B2A6B', '#1FB5A3', '#F0472F', '#FFD23F', '#FBF1D9']);
  for (const svg of Object.values(MISSION_ICONS)) for (const c of svg.match(/#[0-9A-Fa-f]{6}/g)) assert.ok(PAL.has(c.toUpperCase()), c);
  const door = { facts: { rtp: 0.96, maxWin: 5000, medianX: 66, pGtPrice: 0.31 } };
  assert.deepEqual(doorFacts(door, t).map((x) => x.kind), ['rtp', 'max', 'median', 'share']);
  assert.deepEqual(doorFactLines(door, t), doorFacts(door, t).map((x) => x.text));
});
