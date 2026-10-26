import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { t, setLang, setSocial, allKeys, applyI18n } from '../../src/i18n/index.js';
import { en } from '../../src/i18n/en.js';
import { social } from '../../src/i18n/social.js';
import { buildRules, DISCLAIMER } from '../../src/rules.js';
import { buildInfo } from '../../src/replay.js';
import { formatMoney } from '../../src/money.js';
import { findRestricted } from './restricted.mjs';

const data = JSON.parse(fs.readFileSync(new URL('../../data/rules_data.json', import.meta.url), 'utf8'));
const VARS = { cost: '100.00 SC', n: 10, cur: 3, total: 10, mult: 100, amount: '1.00 SC', mode: 'UNLEASH', real: '100.00 SC' };

for (const lang of ['en', 'zz']) {
  for (const soc of [false, true]) {
    test(`t() never leaks keys/undefined/NaN (lang=${lang}, social=${soc})`, () => {
      setLang(lang); setSocial(soc);
      const keys = [...allKeys(), 'no.such.key', 'camelCaseKey', ''];
      for (const k of keys) {
        for (const vars of [VARS, undefined, { cost: NaN, n: undefined }]) {
          const s = t(k, vars);
          assert.equal(typeof s, 'string', k);
          assert.ok(!/undefined|NaN|\{\w+\}|null/.test(s), `${k} -> ${s}`);
          if (k && en[k]) assert.notEqual(s, k);
          assert.ok(s !== k || !k.includes('.'), `${k} leaked`);
        }
      }
      assert.ok(t('no.such.key').length > 0);
    });
  }
}

test('social override keys exist in en', () => {
  for (const k of Object.keys(social)) assert.ok(k in en, k);
});

test('social mode: no restricted word in any string', () => {
  setLang('en'); setSocial(true);
  const bad = [];
  for (const k of allKeys()) { const s = t(k, VARS); const h = findRestricted(s); if (h.length) bad.push(`${k}: ${s} [${h}]`); }
  for (const m of ['base', 'bonus', 'freegame', 'whatever bet']) { const h = findRestricted(t.mode(m)); if (h.length) bad.push(`mode ${m}`); }
  assert.deepEqual(bad, []);
});

test('mode names identical in normal and social', () => {
  setSocial(false); const a = [t.mode('base'), t.mode('bonus')];
  setSocial(true); const b = [t.mode('base'), t.mode('bonus')];
  assert.deepEqual(a, b);
  assert.deepEqual(a, ['Base Game', 'UNLEASH']);
  assert.ok(!/buy/i.test(a.join()));
});

test('social wording uses play, not bet', () => {
  setSocial(true);
  assert.equal(t('btn.bet'), 'PLAY');
  assert.match(t('label.bet'), /PLAY/);
  assert.equal(t('rules.tab.wins'), 'Win table');
});

test('rules: social has no restricted words, normal has everything required', () => {
  setSocial(true);
  const soc = buildRules(data, { social: true, currency: 'XSC', formatMoney });
  const bad = [];
  for (const s of soc.sections) { const h = findRestricted(s.title + ' ' + s.html); if (h.length) bad.push(`${s.id}: ${h}`); }
  assert.deepEqual(bad, []);
  setSocial(false);
  const n = buildRules(data, { social: false, currency: 'USD', formatMoney });
  const all = n.sections.map((s) => s.html).join(' ');
  for (const s of data.symbols) assert.ok(all.includes(s.name), s.name);
  assert.ok(all.includes(DISCLAIMER.replace(/&/g, '&amp;')));
  assert.ok(/RTP \d+\.\d\d%, max win [\d,]+x/.test(all));
  for (const w of ['AUTOPLAY', 'TURBO', 'UNLEASH', 'SOUND', 'INFO', 'FULLSCREEN', 'MENU', 'Space']) assert.ok(all.includes(w), w);
  assert.ok(/Paytable/.test(all));
  // every payout value appears
  for (const s of data.symbols.filter((x) => x.pays)) for (const p of s.pays) assert.ok(all.includes(`${Math.round(p * 100) / 100}x`));
});

test('replay info line', () => {
  setSocial(true);
  const a = buildInfo({ amount: 1000000, costMultiplier: 100, mode: 'bonus', currency: 'XSC', formatMoney });
  assert.match(a.line, /UNLEASH: 1\.00 SC · 100x · REAL COST: 100\.00 SC/);
  assert.deepEqual(findRestricted(a.line), []);
  const b = buildInfo({ amount: 'x', costMultiplier: 1, mode: 'base', currency: 'XSC', formatMoney });
  assert.match(b.line, /1\.00 SC/);
  assert.deepEqual(findRestricted(b.line), []);
  assert.ok(!/NaN|undefined/.test(b.line));
  setSocial(false);
});

test('applyI18n tolerates missing document', () => { applyI18n(null); });
