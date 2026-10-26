import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { en } from '../../src/i18n/en.js';
import { en_hero } from '../../src/i18n/en_hero.js';
import { EN, hasKey, t, setSocial } from '../../src/i18n/index.js';
import { findRestricted } from '../text/restricted.mjs';

const FRONT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

test('en_hero: five reworded heroine lines, every key overrides an existing mascot key', () => {
  const lines = new Set(Object.values(en_hero));
  assert.equal(lines.size, 5, 'five distinct reworded lines (mascot.lose and mascot.lose.1 share one)');
  assert.equal(Object.keys(en_hero).length, 6);
  for (const k of Object.keys(en_hero)) { assert.ok(/^mascot\./.test(k), k); assert.ok(Object.prototype.hasOwnProperty.call(en, k), `${k} exists in en.js`); assert.notEqual(en_hero[k], en[k], k); }
  assert.equal(en_hero['mascot.lose'], en_hero['mascot.lose.1']);
});
test('the nudges are gone from the merged table: no "Next one\'s the one", no "Same time tomorrow", no other variant of them', () => {
  const merged = Object.entries(EN).filter(([k]) => k.startsWith('mascot.'));
  for (const [k, v] of merged) {
    assert.doesNotMatch(v, /next one|same time tomorrow|case closed|mission: fabulous|press and pray/i, `${k}: ${v}`);
    assert.doesNotMatch(v, /\b(due|overdue|about to|bound to|your turn|come back|tomorrow|don't stop|one more)\b/i, `${k}: ${v}`);
  }
  assert.equal(t('mascot.lose'), 'Nothing to report.');
  assert.equal(EN['mascot.fsEnd.5'], 'Debrief done.');
  // the rest of her voice is untouched, 5 variants per event as the text tests expect
  for (const ev of ['idle', 'win', 'big', 'shock', 'fs', 'fsEnd', 'lose', 'wire', 'meter']) for (let i = 1; i <= 5; i++) assert.ok(hasKey(`mascot.${ev}.${i}`), `${ev}.${i}`);
});
test('social wording: no restricted word in any heroine line, in either mode', () => {
  for (const social of [false, true]) {
    setSocial(social);
    for (const k of Object.keys(EN).filter((x) => x.startsWith('mascot.'))) assert.deepEqual(findRestricted(t(k, { n: 5 })), [], `${k} (social=${social})`);
  }
  setSocial(false);
  for (const v of Object.values(en_hero)) assert.deepEqual(findRestricted(v), [], v);
});
test('source hygiene: no "stake" anywhere in the heroine sources, no storage / network / external host, no restricted word in a string', () => {
  const files = ['src/render/mascot.js', 'src/render/mascot.css', 'src/i18n/en_hero.js'].map((f) => path.join(FRONT, f));
  const dir = path.join(FRONT, 'src/render/heroine');
  for (const f of fs.readdirSync(dir)) if (/\.(m?js|css)$/.test(f)) files.push(path.join(dir, f));
  assert.ok(files.length >= 14);
  for (const f of files) {
    const src = fs.readFileSync(f, 'utf8'), name = path.relative(FRONT, f);
    assert.doesNotMatch(src, /stake/i, `${name}: the word "stake" must not appear in shipped source`);
    if (/\.css$/.test(f)) { assert.doesNotMatch(src, /url\(\s*['"]?https?:/i, name); continue; }
    if (name.endsWith('fallback_art.js')) continue;
    assert.doesNotMatch(src, /\blocalStorage\b|\bsessionStorage\b|\bindexedDB\b|\bfetch\s*\(|XMLHttpRequest|WebSocket|sendBeacon/, `${name}: no storage and no network in the heroine`);
    for (const m of src.matchAll(/https?:\/\/[^\s'"`)]+/g)) assert.match(m[0], /w3\.org|^https?:\/\/(www\.)?w3/, `${name}: external host ${m[0]}`);
  }
});
