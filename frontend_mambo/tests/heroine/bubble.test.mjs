import test from 'node:test';
import assert from 'node:assert/strict';
import { placeBubble, bubbleWidth, MIN_SLOT_W, MIN_SLOT_H } from '../../src/render/heroine/bubble.js';

const slot = (l, t, w, h) => ({ left: l, top: t, width: w, height: h });
const APP = { left: 0, top: 0, width: 1024, height: 576 };

test('the 1024x576 box (178x272 at 6,296): the bubble sits over her skirt, inside the box, tail up at her head', () => {
  const s = slot(6, 296, 178, 272), w = bubbleWidth(s);
  const p = placeBubble(s, APP, { h: 44 });
  assert.equal(p.width, w); assert.ok(w >= 124 && w <= 210);
  assert.ok(p.left >= 3 && p.left + p.width <= 1024 - 3);
  assert.ok(p.top >= 296 + 272 * 0.3 && p.top + 44 <= 296 + 272, 'inside the slot vertically');
  assert.ok(p.tailX >= 14 && p.tailX <= p.width - 14);
});
test('too small a box shows no bubble: the portrait corner (69x99), the face crop (70x57), anything under the minimums', () => {
  assert.equal(placeBubble(slot(4, 616, 69, 99), { left: 0, top: 0, width: 425, height: 812 }, { h: 40 }), null);
  assert.equal(placeBubble(slot(4, 160, 70, 57), { left: 0, top: 0, width: 400, height: 225 }, { h: 30 }), null);
  assert.equal(placeBubble(slot(0, 0, MIN_SLOT_W - 1, 400), APP, { h: 30 }), null);
  assert.equal(placeBubble(slot(0, 0, 300, MIN_SLOT_H - 1), APP, { h: 30 }), null);
  assert.ok(placeBubble(slot(0, 0, MIN_SLOT_W, MIN_SLOT_H), APP, { h: 30 }));
  assert.equal(placeBubble(null, APP, { h: 1 }), null); assert.equal(placeBubble(slot(0, 0, 200, 300), null, { h: 1 }), null); assert.equal(placeBubble(slot(0, 0, 200, 300), APP, null), null);
});
test('the 800x450 box (139x213): fits, stays inside the app', () => {
  const s = slot(5, 230, 139, 213), p = placeBubble(s, { left: 0, top: 0, width: 800, height: 450 }, { h: 40 });
  assert.ok(p && p.left >= 3 && p.top + 40 <= 230 + 213 && p.top >= 230 + 213 * 0.3);
});
test('fuzz: a bubble never leaves the app horizontally nor the slot vertically, tail always on the bubble', () => {
  let seed = 7; const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
  let shown = 0;
  for (let i = 0; i < 2000; i++) {
    const app = { left: Math.floor(rnd() * 20), top: Math.floor(rnd() * 20), width: 300 + Math.floor(rnd() * 1700), height: 200 + Math.floor(rnd() * 900) };
    const s = slot(app.left + rnd() * app.width * 0.5, app.top + rnd() * app.height * 0.5, 60 + rnd() * 300, 80 + rnd() * 500);
    const h = 20 + rnd() * 80, p = placeBubble(s, app, { h });
    if (!p) continue; shown++;
    assert.ok(p.left + app.left >= app.left + 3 - 1e-9 || p.width >= app.width - 6);
    assert.ok(p.tailX >= 14 && p.tailX <= p.width - 14);
    assert.ok(p.top + app.top >= s.top - 1e-9);
  }
  assert.ok(shown > 500);
});
