import test from 'node:test';
import assert from 'node:assert/strict';
import { eyeOnScreen, lookToward, createGaze, FALLBACK, EYE } from '../../src/render/heroine/gaze.js';
import { CROPS } from '../../src/render/heroine/mambo_rig.js';
import { CROP_VB } from '../../src/render/heroine/index.js';

const VB = CROP_VB.full;
test('crop windows in index.js equal the rig CROPS (the static fallback crops without the rig)', () => {
  for (const k of Object.keys(CROPS)) assert.deepEqual([...CROP_VB[k]], CROPS[k].vb, k);
  assert.deepEqual(Object.keys(CROP_VB).sort(), Object.keys(CROPS).sort());
});

test('eyeOnScreen: letterboxing of xMidYMax meet (wide box: centred, tall box: bottom aligned) and the crop windows', () => {
  // 178x272 box (the shell's 1024x576 box): the tighter of the two ratios limits, the figure is bottom aligned and centred
  const box = { left: 6, top: 296, width: 178, height: 272 };
  const e = eyeOnScreen(box, VB);
  const s = Math.min(box.width / VB[2], box.height / VB[3]);
  assert.ok(Math.abs(e.size - VB[2] * s) < 1e-6);
  assert.ok(Math.abs(e.x - (box.left + (box.width - VB[2] * s) / 2 + (200 - VB[0]) * s)) < 1e-6);
  assert.ok(Math.abs(e.y - (box.top + (box.height - VB[3] * s) + (EYE.y - VB[1]) * s)) < 1e-6);
  // a wide box centres horizontally: the eyes (art x 200 = the centre of the window 60..340) sit on the middle of the box
  const w = eyeOnScreen({ left: 0, top: 0, width: 600, height: 300 }, VB);
  assert.ok(Math.abs(w.x - 300) < 1e-6);
  // bust crop: the eye sits at the middle of the window, head crop lower right
  const b = eyeOnScreen({ left: 0, top: 0, width: 226, height: 322 }, CROP_VB.bust);
  assert.ok(Math.abs(b.x - (200 - 86)) < 1e-6 && Math.abs(b.y - (176 - 24)) < 1e-6);
  assert.equal(eyeOnScreen(null, VB), null); assert.equal(eyeOnScreen({ left: 0, top: 0, width: 0, height: 5 }, VB), null);
});

test('lookToward: right of her = nx > 0 and a body turn toward it, up = ny < 0, clamped, mirrored flips', () => {
  const eye = { x: 100, y: 300, size: 178 };
  const grid = lookToward(eye, { x: 540, y: 290 });
  assert.equal(grid.nx, 1); assert.ok(grid.turn > 0.9 && grid.turn <= 1); assert.ok(grid.ny < 0 && grid.ny > -0.2);
  const up = lookToward(eye, { x: 200, y: 20 }); assert.ok(up.ny === -1 && up.nx > 0);
  const left = lookToward(eye, { x: -300, y: 300 }); assert.equal(left.nx, -1); assert.ok(left.turn < 0.5);
  const mir = lookToward(eye, { x: 540, y: 290 }, true); assert.equal(mir.nx, -1);
  for (const v of [grid, up, left]) assert.ok(Math.abs(v.nx) <= 1 && Math.abs(v.ny) <= 1 && v.turn >= 0.05 && v.turn <= 1);
  assert.equal(lookToward(null, { x: 1, y: 1 }), null); assert.equal(lookToward(eye, { x: NaN, y: 1 }), null); assert.equal(lookToward(eye, null), null);
});

function fakeDoc(map) {
  return { querySelector: (sel) => (map[sel] ? { getBoundingClientRect: () => map[sel] } : null) };
}
const R = (l, t, w, h) => ({ left: l, top: t, width: w, height: h, right: l + w, bottom: t + h });

test('createGaze: grid / spin / meter / cluster targets from real elements, fallbacks when they are missing', () => {
  let t = 0;
  const doc = fakeDoc({ '.board-wrap': R(250, 40, 580, 490), '#btn-bet': R(880, 200, 100, 100), '#meter-slot .mm:not([hidden]) .mm-badge': R(200, 60, 40, 40) });
  const g = createGaze({ doc, getBox: () => R(6, 296, 178, 272), getViewBox: () => VB, now: () => t, ttl: 5000 });
  const grid = g.targets.grid(); assert.equal(grid.nx, 1); assert.ok(grid.ny < 0);
  const spin = g.targets.spin(); assert.equal(spin.nx, 1); assert.ok(spin.ny < 0);
  const meter = g.targets.meter(); assert.ok(meter.nx > 0 && meter.ny < -0.3);
  assert.deepEqual(g.targets.cluster(), g.targets.grid(), 'no cluster yet: the grid');
  g.setCluster({ x: 700, y: 120 }); const c = g.targets.cluster(); assert.ok(c.ny < grid.ny, 'a cluster near the top is looked up at');
  t = 6000; assert.deepEqual(g.targets.cluster(), g.targets.grid(), 'stale cluster: back to the grid');
  assert.deepEqual(g.targets.player(), FALLBACK.player);
  g.setCluster({ x: NaN, y: 1 }); g.setCluster(null);
  // missing elements and a missing box -> the rig's named fallbacks, never a throw
  const g2 = createGaze({ doc: fakeDoc({}), getBox: () => null, getViewBox: () => VB });
  assert.deepEqual(g2.targets.grid(), FALLBACK.grid); assert.deepEqual(g2.targets.spin(), FALLBACK.spin); assert.deepEqual(g2.targets.meter(), FALLBACK.meter);
  const g3 = createGaze({ doc: { querySelector() { throw new Error('x'); } }, getBox: () => R(0, 0, 100, 100), getViewBox: () => VB });
  assert.deepEqual(g3.targets.grid(), FALLBACK.grid);
  const g4 = createGaze({ doc: null, getBox: () => null, getViewBox: () => VB }); assert.deepEqual(g4.targets.meter(), FALLBACK.meter);
});
