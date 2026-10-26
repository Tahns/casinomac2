import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { FILES, PATCHES, patched, plan } from '../../tools/sync_heroine.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FRONT = path.resolve(HERE, '../..');
const DST = path.join(FRONT, 'src/render/heroine');

test('the shipped rig files are exactly "docs/research2/art source + the named patches" (node tools/sync_heroine.mjs --check)', () => {
  const r = spawnSync(process.execPath, [path.join(FRONT, 'tools/sync_heroine.mjs'), '--check'], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr + r.stdout);
  for (const i of plan()) assert.equal(fs.readFileSync(path.join(DST, i.dest), 'utf8'), i.out, i.file);
});
test('patches: each matches exactly once, is documented, and a drifted source is refused', () => {
  assert.ok(PATCHES.length >= 2 && PATCHES.every((p) => p.id && p.why && p.find && p.replace && FILES.includes(p.file)));
  for (const i of plan()) assert.ok(Math.abs(i.out.length - i.src.length) < 400, i.dest);   // patches and the .mjs -> .js retarget only
  for (const i of plan()) assert.ok(!/\.mjs'/.test(i.out), `${i.dest} has no .mjs import left`);
  assert.deepEqual(plan().map((i) => i.dest), ['mambo_art.js', 'mambo_outfits.js', 'mambo_rig.js', 'mambo_compat.js']);
  assert.throws(() => patched('mambo_rig.mjs', 'nothing here'), /expected exactly one match/);
  const twice = PATCHES[0].find + '\n' + PATCHES[0].find;
  assert.throws(() => patched('mambo_rig.mjs', twice), /found 2/);
  assert.equal(patched('mambo_art.mjs', 'x'), 'x');
});
test('the rig has the two hooks the host relies on (followOs, onError)', () => {
  const rig = fs.readFileSync(path.join(DST, 'mambo_rig.js'), 'utf8');
  assert.match(rig, /O\.followOs === false\) return/); assert.match(rig, /O\.onError/);
});
test('fallback_art.js: a self-contained static svg of the heroine (no script, no external reference, no raster)', async () => {
  const { FALLBACK_SVG } = await import('../../src/render/heroine/fallback_art.js');
  assert.ok(FALLBACK_SVG.startsWith('<svg') && FALLBACK_SVG.endsWith('</svg>'));
  assert.ok(FALLBACK_SVG.length > 20000 && FALLBACK_SVG.length < 80000, String(FALLBACK_SVG.length));
  assert.doesNotMatch(FALLBACK_SVG, /<script|<image|<foreignObject|javascript:|data:|onload=|href="http/i);
  assert.equal([...FALLBACK_SVG.matchAll(/https?:\/\/[^"' )]+/g)].filter((m) => !/www\.w3\.org/.test(m[0])).length, 0);
  assert.match(FALLBACK_SVG, /viewBox="60 30 280 556"/);   // the full-figure window of the rig (patch tightFull); the host sets the other crops
  assert.doesNotMatch(FALLBACK_SVG, /id="mambo\d/);
});
