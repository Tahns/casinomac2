// Golden fixtures for src/render/geo.js (SYNTHESIS 3 + 8): the four floor plans, as the math emits them in the `layout` event.
// Position conventions: padded = compactIndex + 1 (winInfo / tumbleBoard / trigger positions), geometric = cells[reel][padded - 1].
import test from 'node:test';
import assert from 'node:assert/strict';
import { setLayout, getLayout, resetLayout, toGeo, toPadded, toGeoPos, toPaddedPos, hasCell, cellsOf, revealLength, isValidLayout, FLOOR_PLANS } from '../../src/render/geo.js';

const ev = (id, name, rows, cells) => ({ index: 0, type: 'layout', id, name, cols: 6, rows, cells, cellCount: cells.flat().length, links: [] });
const FULL5 = [0, 1, 2, 3, 4], MID3 = [1, 2, 3], LOW4 = [1, 2, 3, 4], FULL6 = [0, 1, 2, 3, 4, 5];
// golden layout events (the SYNTHESIS 8 example for the Atrium is verbatim)
const GOLD = {
  mezzanine: ev('mezzanine', 'Mezzanine', 5, [FULL5, FULL5, FULL5, FULL5, FULL5, FULL5]),
  atrium: ev('atrium', 'Atrium', 5, [MID3, FULL5, FULL5, FULL5, FULL5, MID3]),
  lobby: ev('lobby', 'Lobby', 5, [LOW4, LOW4, LOW4, LOW4, LOW4, LOW4]),
  annex: ev('annex', 'Annex', 6, [FULL6, FULL6, FULL6, FULL6, FULL6, FULL6]),
};
const COUNTS = { mezzanine: 30, atrium: 26, lobby: 24, annex: 36 };
// golden padded -> geometric tables per reel (index = padded row 0..7; -1 = not a cell)
const TO_GEO = {
  mezzanine: Array(6).fill([-1, 0, 1, 2, 3, 4, -1, -1]),
  atrium: [[-1, 1, 2, 3, -1, -1, -1, -1], ...Array(4).fill([-1, 0, 1, 2, 3, 4, -1, -1]), [-1, 1, 2, 3, -1, -1, -1, -1]],
  lobby: Array(6).fill([-1, 1, 2, 3, 4, -1, -1, -1]),
  annex: Array(6).fill([-1, 0, 1, 2, 3, 4, 5, -1]),
};
// golden geometric -> padded tables per reel (index = geometric row 0..6)
const TO_PADDED = {
  mezzanine: Array(6).fill([1, 2, 3, 4, 5, -1, -1]),
  atrium: [[-1, 1, 2, 3, -1, -1, -1], ...Array(4).fill([1, 2, 3, 4, 5, -1, -1]), [-1, 1, 2, 3, -1, -1, -1]],
  lobby: Array(6).fill([-1, 1, 2, 3, 4, -1, -1]),
  annex: Array(6).fill([1, 2, 3, 4, 5, 6, -1]),
};

test('canonical plans match the golden events', () => {
  for (const id of Object.keys(GOLD)) {
    const p = FLOOR_PLANS[id];
    assert.equal(p.id, id); assert.equal(p.cols, 6); assert.equal(p.rows, GOLD[id].rows);
    assert.deepEqual(p.cells.map((c) => [...c]), GOLD[id].cells);
    assert.equal(p.cellCount, COUNTS[id]);
    assert.ok(isValidLayout(GOLD[id]), id);
  }
});

for (const id of Object.keys(GOLD)) {
  test(`golden mapping: ${id}`, () => {
    const got = setLayout(GOLD[id]);
    assert.equal(got.id, id); assert.equal(getLayout().cellCount, COUNTS[id]);
    for (let reel = 0; reel < 6; reel++) {
      for (let p = 0; p < 8; p++) assert.equal(toGeo(reel, p), TO_GEO[id][reel][p], `${id} toGeo(${reel},${p})`);
      for (let g = 0; g < 7; g++) assert.equal(toPadded(reel, g), TO_PADDED[id][reel][g], `${id} toPadded(${reel},${g})`);
      // round trip on every present cell
      for (const g of cellsOf(reel)) { assert.equal(toGeo(reel, toPadded(reel, g)), g); assert.ok(hasCell(reel, g)); }
      assert.equal(revealLength(reel), cellsOf(reel).length + 2);
    }
    // the plan has exactly cellCount (reel, row) cells
    let n = 0; for (let reel = 0; reel < 6; reel++) for (let g = 0; g < 8; g++) if (hasCell(reel, g)) n++;
    assert.equal(n, COUNTS[id]);
    resetLayout();
  });
}

test('Mezzanine is the v1 mapping (vis(row) = row - 1), also with no layout event at all', () => {
  setLayout(null); // an old book never sends a layout event
  assert.equal(getLayout().id, 'mezzanine');
  for (let reel = 0; reel < 6; reel++) for (let p = 1; p <= 5; p++) { assert.equal(toGeo(reel, p), p - 1); assert.equal(toPadded(reel, p - 1), p); }
  // v1 filtered pad rows out with inB(): they must come out negative here
  assert.ok(toGeo(0, 0) < 0 && toGeo(0, 6) < 0 && toPadded(0, 5) < 0 && toPadded(0, -1) < 0);
  setLayout(undefined); assert.equal(getLayout().id, 'mezzanine');
});

test('SYNTHESIS 8 example: Atrium {reel:0,row:2} is geometric row 2, {reel:1,row:2} is geometric row 1', () => {
  setLayout(GOLD.atrium);
  assert.equal(toGeo(0, 2), 2); assert.equal(toGeo(1, 2), 1);
  assert.deepEqual(toGeoPos({ reel: 1, row: 2, extra: 'kept' }), { reel: 1, row: 1, extra: 'kept' });
  assert.deepEqual(toPaddedPos({ reel: 0, row: 3 }), { reel: 0, row: 3 });
  assert.equal(revealLength(0), 5); assert.equal(revealLength(1), 7); // reveal.board[r] has len(cells[r]) + 2 symbols
  resetLayout();
});

test('plan id strings, and bad input never throws (falls back to Mezzanine)', () => {
  assert.equal(setLayout('annex').rows, 6);
  assert.equal(setLayout('ATRIUM').id, 'atrium');
  for (const bad of [42, true, [], {}, { id: 'nope' }, { cols: 6, rows: 5, cells: [[0, 1]] }, { cols: 7, rows: 5, cells: [] },
    { id: 'x', cols: 6, rows: 5, cells: [[0], [0], [0], [0], [0], [0, 0]] }, { id: 'x', cols: 6, rows: 5, cells: [[0], [0], [0], [0], [0], [9]] },
    { id: 'x', cols: 6, rows: 5, cells: [[2, 1], [0], [0], [0], [0], [0]] }, { id: 'x', cols: 6, rows: 5, cells: [[], [0], [0], [0], [0], [0]] }]) {
    assert.equal(setLayout(bad).id, 'mezzanine', JSON.stringify(bad));
    assert.ok(!isValidLayout(bad));
  }
  // a broken shape with a known id uses the canonical plan of that id
  assert.equal(setLayout({ id: 'lobby', cols: 6, rows: 5, cells: 'broken' }).id, 'lobby');
  // garbage coordinates are -1, never an exception
  setLayout(null);
  for (const [r, p] of [[-1, 1], [6, 1], [NaN, 1], [0, NaN], [undefined, undefined], ['a', 'b'], [0, 1.5], [null, null]]) { assert.equal(toGeo(r, p), -1); assert.equal(toPadded(r, p), -1); }
  assert.deepEqual(cellsOf(9), []);
  assert.equal(toGeoPos(null), null);
  resetLayout();
});

test('a custom valid event is accepted as given and is immutable', () => {
  const custom = ev('custom', 'Custom', 5, [[0, 1], [0, 1, 2], [1, 2, 3], [2, 3, 4], [3, 4], [4]]);
  const got = setLayout(custom);
  assert.equal(got.id, 'custom'); assert.equal(got.cellCount, 2 + 3 + 3 + 3 + 2 + 1);
  assert.equal(toGeo(2, 1), 1); assert.equal(toGeo(5, 1), 4);
  custom.cells[0][0] = 99; assert.equal(toGeo(0, 1), 0); // later changes to the event do not leak in
  assert.throws(() => { 'use strict'; got.cells[0].push(1); });
  resetLayout();
});
