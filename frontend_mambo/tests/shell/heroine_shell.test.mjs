import test from 'node:test';
import assert from 'node:assert/strict';
import { findCorner, CORNER_CANDIDATES } from '../../src/ui/heroine_shell.js';

const hit = (a, b) => a.l < b.r && a.r > b.l && a.t < b.b && a.b > b.t;
const R = (l, t, r, b) => ({ l, t, r, b });

// 425x812 portrait as measured in the live page (grid frame, strip above it, logo, three HUD plates, session summary, buttons)
const PORTRAIT = [R(-1, 76, 433, 479), R(60, 10, 365, 90), R(0, 467, 140, 540), R(140, 467, 295, 540), R(295, 467, 425, 540), R(0, 540, 425, 600),
  R(109, 616, 166, 672), R(164, 604, 262, 706), R(260, 616, 321, 672), R(56, 700, 368, 756), R(104, 752, 322, 808)];
const VIEW = { w: 425, h: 812 };

test('findCorner: portrait phone, the bust fits left of the AUTOPLAY button and touches nothing', () => {
  const c = findCorner(PORTRAIT, VIEW);
  assert.ok(c, 'a spot exists'); assert.equal(c.crop, 'bust'); assert.equal(c.x, 4);
  assert.ok(c.h >= 96 && c.w >= 67);
  const r = R(c.x, c.y, c.x + c.w, c.y + c.h);
  for (const o of PORTRAIT) assert.ok(!hit(r, o), JSON.stringify(o));
  assert.ok(r.l >= 0 && r.t >= 0 && r.r <= VIEW.w && r.b <= VIEW.h);
  assert.ok(Math.abs(c.w / c.h - CORNER_CANDIDATES[0].ratio) < 0.02);               // keeps the crop ratio
});
test('findCorner: the largest candidate wins and it sits as low as possible', () => {
  const c = findCorner([], { w: 400, h: 800 });
  assert.deepEqual(c, { crop: 'bust', x: 4, y: 556, w: Math.round(240 * (226 / 322)), h: 240 });   // 30% of the height, bottom aligned (4 px pad)
});
test('findCorner: only the face crop fits a small gap, nothing fits when the edge is walled', () => {
  const gap = [R(0, 0, 400, 300), R(0, 372, 400, 800)];                                  // a 72 px tall free band
  const c = findCorner(gap, { w: 400, h: 800 });
  assert.ok(c && c.crop === 'head' && c.h === 72 && c.y === 300);
  assert.equal(findCorner([R(0, 0, 400, 800)], { w: 400, h: 800 }), null);
  assert.equal(findCorner([R(0, 0, 400, 330), R(0, 400, 400, 800)], { w: 400, h: 800 }), null);   // 70 px band: below the head minimum
  assert.equal(findCorner([], { w: 100, h: 100 }), null);                               // a view too small for the smallest crop
});
test('findCorner: never overlaps, never leaves the view (fuzz)', () => {
  let seed = 12345; const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
  let found = 0;
  for (let i = 0; i < 600; i++) {
    const view = { w: 300 + Math.floor(rnd() * 300), h: 500 + Math.floor(rnd() * 600) };
    const obs = Array.from({ length: Math.floor(rnd() * 9) }, () => { const l = rnd() * view.w, t = rnd() * view.h; return R(l, t, l + rnd() * view.w * 0.8, t + rnd() * view.h * 0.3); });
    const c = findCorner(obs, view);
    if (!c) continue; found++;
    const r = R(c.x, c.y, c.x + c.w, c.y + c.h);
    assert.ok(r.l >= 0 && r.t >= 0 && r.r <= view.w && r.b <= view.h, 'inside the view');
    for (const o of obs) assert.ok(!hit(r, o), 'no overlap');
    assert.ok(c.w <= view.w * 0.45 + 1 && c.h <= view.h * 0.3 + 1 && c.h <= 260);
  }
  assert.ok(found > 100, 'the fuzz finds spots too (' + found + ')');
});
