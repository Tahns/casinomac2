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

// v2 round 2 (NEW-bubble-hides-face-portrait)
import { intersects, HEAD_PAD } from '../../src/render/heroine/bubble.js';
const abs = (p, app, h) => ({ left: p.left + app.left, top: p.top + app.top, width: p.width, height: h });
test('portrait bust 425x812 (134x191 at 4,617, head 2,633 107x121): under the chin or nothing, never over the face', () => {
  const app = { left: 0, top: 0, width: 425, height: 812 }, s = slot(4, 617, 134, 191), head = { left: 2, top: 633, width: 107, height: 121 };
  const ledger = { left: 6, top: 576, width: 413, height: 19 }, unleash = { left: 146, top: 706, width: 253, height: 45 };
  const p1 = placeBubble(s, app, { h: 33 }, { head, avoid: [ledger, unleash] });
  assert.ok(p1 && p1.tail === 'up' && p1.top >= head.top + head.height + HEAD_PAD && p1.top + 33 <= 617 + 191);
  assert.equal(placeBubble(s, app, { h: 66 }, { head, avoid: [ledger, unleash] }), null, 'a three-line bubble does not fit: not shown (no room above: the ledger)');
});
test('landscape full figure, head dipped (1280x720 box, head 50,460 109x90): the bubble goes under the chin', () => {
  const app = { left: 0, top: 0, width: 1280, height: 720 }, s = slot(8, 376, 220, 336), head = { left: 50, top: 460, width: 109, height: 90 };
  const p = placeBubble(s, app, { h: 33 }, { head });
  assert.ok(p && !intersects(abs(p, app, 33), head) && p.top >= 550);
});
test('above the cap with the tail down when the chest has no room and the top is free', () => {
  const app = { left: 0, top: 0, width: 800, height: 600 }, s = slot(10, 300, 160, 200), head = { left: 30, top: 330, width: 110, height: 150 };
  const p = placeBubble(s, app, { h: 30 }, { head });
  assert.ok(p && p.tail === 'down' && p.top + 30 <= 330 - HEAD_PAD);
});
test('fuzz with a head: the bubble rectangle never intersects the head nor an avoided rectangle', () => {
  let seed = 11; const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
  let shown = 0;
  for (let i = 0; i < 3000; i++) {
    const app = { left: 0, top: 0, width: 300 + Math.floor(rnd() * 1500), height: 200 + Math.floor(rnd() * 900) };
    const s = slot(rnd() * app.width * 0.5, rnd() * app.height * 0.6, 120 + rnd() * 200, 150 + rnd() * 400);
    const head = { left: s.left + rnd() * s.width * 0.3, top: s.top + rnd() * s.height * 0.5, width: s.width * (0.3 + rnd() * 0.6), height: s.height * (0.15 + rnd() * 0.5) };
    const avoid = [{ left: rnd() * app.width, top: rnd() * app.height, width: 20 + rnd() * 200, height: 20 + rnd() * 80 }];
    const h = 20 + rnd() * 70, p = placeBubble(s, app, { h }, { head, avoid });
    if (!p) continue; shown++;
    const r = abs(p, app, h);
    assert.ok(!intersects(r, head), 'head'); assert.ok(!intersects(r, avoid[0]), 'avoid');
    assert.ok(p.tailX >= 14 && p.tailX <= p.width - 14);
  }
  assert.ok(shown > 300, String(shown));
});
