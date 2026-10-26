import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { t, setLang, setSocial, EN, hasKey } from '../../src/i18n/index.js';
import { en_ui } from '../../src/i18n/en_ui.js';
import { social } from '../../src/i18n/social.js';
import { findRestricted } from '../text/restricted.mjs';

const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../src');
const read = (p) => fs.readFileSync(path.join(SRC, p), 'utf8');
const walk = (d) => fs.readdirSync(path.join(SRC, d), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));

test('en_ui: merged into EN, wins over en.js, every string is plain text', () => {
  assert.ok(Object.keys(en_ui).length > 40);
  for (const [k, v] of Object.entries(en_ui)) { assert.ok(hasKey(k), k); assert.equal(EN[k], v, k); assert.equal(typeof v, 'string'); assert.ok(v.length > 0, k); assert.ok(!/<|>/.test(v), k + ' has markup'); }
  assert.equal(t('btn.settings'), 'SETTINGS');
});
test('every key the shell asks for exists (no humanised fallback leaks into the UI)', () => {
  const files = ['main.js', 'replay.js', ...walk('ui').filter((f) => f.endsWith('.js'))];
  const used = new Set();
  for (const f of files) {
    const src = read(f);
    for (const m of src.matchAll(/\bt\(\s*'([a-z][\w]*(?:\.[\w]+)+)'/g)) used.add(m[1]);
    for (const m of src.matchAll(/'((?:settings|info|ledger|door)\.[\w.]+)'/g)) used.add(m[1]);
  }
  for (const m of read('ui/settings_dialog.js').matchAll(/t\('settings\.(?:tab|motion)\.' \+ (\w+)\)/g)) void m;
  for (const n of ['sound', 'display', 'play', 'info']) used.add('settings.tab.' + n);
  for (const n of ['auto', 'full', 'calm', 'still']) used.add('settings.motion.' + n);
  // html data-i18n keys
  for (const m of fs.readFileSync(path.join(SRC, '../index.html'), 'utf8').matchAll(/data-i18n(?:-title|-aria-label)?="([^"]+)"/g)) used.add(m[1]);
  const missing = [...used].filter((k) => !k.endsWith('.') && !hasKey(k) && !/^(mascot|fx)\./.test(k));
  assert.deepEqual(missing, []);
  assert.ok(used.size > 50);
});
for (const soc of [false, true]) {
  test(`shell strings never leak keys/undefined/NaN (social=${soc})`, () => {
    setLang('en'); setSocial(soc);
    for (const k of Object.keys(en_ui)) {
      const s = t(k, { cost: '100.00 SC', n: 75, rtp: '96.00%', max: '5,000', x: 64, p: '29%', v: '2.0.0', list: 'A 96.00%', min: '50.00' });
      assert.ok(!/undefined|NaN|\{\w+\}|null/.test(s), k + ' -> ' + s);
      assert.notEqual(s, k);
      assert.ok(s.length > 0, k);
    }
    setSocial(false);
  });
}
test('social: every shell string passes the restricted word screen, none relies on the sanitiser', () => {
  setLang('en'); setSocial(true);
  const bad = []; const rewritten = [];
  for (const k of Object.keys(en_ui)) {
    const s = t(k, { cost: '100.00 SC', n: 75, rtp: '96.00%', max: '5,000', x: 64, p: '29%', v: '2.0.0', list: 'A 96.00%' });
    if (findRestricted(s).length) bad.push(k + ': ' + s);
    if (!Object.prototype.hasOwnProperty.call(social, k) && findRestricted(en_ui[k]).length) rewritten.push(k);   // a normal string with a restricted word and no social override
  }
  setSocial(false);
  assert.deepEqual(bad, []); assert.deepEqual(rewritten, []);
});
test('mode names: the two later doors have names without restricted words, base and bonus are unchanged', () => {
  for (const soc of [false, true]) {
    setSocial(soc);
    assert.equal(t.mode('base'), 'Base Game'); assert.equal(t.mode('bonus'), 'SECRET ENTRANCE');
    assert.equal(t.mode('entrance_orders'), 'SECRET ENTRANCE: COAT CHECK'); assert.equal(t.mode('entrance_blackout'), 'SECRET ENTRANCE: SERVICE STAIRS');
    for (const m of ['base', 'bonus', 'entrance_orders', 'entrance_blackout']) assert.deepEqual(findRestricted(t.mode(m)), [], m);
  }
  setSocial(false);
});
test('source hygiene (guideline [275] and the platform rules): no "stake", no external host, no fetch, storage only in try/catch modules', () => {
  const files = ['main.js', 'replay.js', 'bet.js', 'input.js', ...walk('ui'), ...walk('i18n').filter((f) => !/social\.js$/.test(f))].filter((f) => /\.(js|css)$/.test(f));
  const html = fs.readFileSync(path.join(SRC, '../index.html'), 'utf8') + fs.readFileSync(path.join(SRC, '../styles.css'), 'utf8');
  for (const f of files) {
    const src = read(f);
    assert.ok(!/stake/i.test(src), f + ' contains the word that guideline [275] forbids');
    assert.ok(!/https?:\/\/(?!www\.w3\.org)/.test(src), f + ' names an external host');
    assert.ok(!/\bfetch\s*\(/.test(src), f + ' calls fetch');
    assert.ok(!/localStorage|sessionStorage|indexedDB/.test(src), f + ' touches browser storage directly (use settings.js / audio.js)');
  }
  assert.ok(!/stake/i.test(html));
});
