// Unit tests for src/render/celebrate.js (SYNTHESIS 4 lever 1): L0 R<=C, L1 (C,5C), L2 [5C,15C), L3 >=15C.
import test from 'node:test';
import assert from 'node:assert/strict';
import { level, isCelebratory, crossedCost, THRESHOLDS } from '../../src/render/celebrate.js';

test('boundaries at cost 1', () => {
  const cases = [[0, 0], [0.1, 0], [0.4, 0], [0.99, 0], [1, 0], [1.0000000001, 0], [1.01, 1], [1.2, 1], [3, 1], [4.99, 1],
    [5, 2], [14.99, 2], [15, 3], [100, 3], [5000, 3]];
  for (const [R, want] of cases) assert.equal(level(R, 1), want, `R=${R}`);
});
test('boundaries at cost 100 (a door round: C = 100 bets), same ratios', () => {
  const cases = [[0, 0], [40, 0], [100, 0], [101, 1], [120, 1], [499, 1], [500, 2], [1499, 2], [1500, 3], [3000, 3], [500000, 3]];
  for (const [R, want] of cases) assert.equal(level(R, 100), want, `R=${R}`);
});
test('gate list from the WP4 acceptance: 0.4x / 1.0x / 1.2x / 15x / 100x at cost 1 and 100', () => {
  for (const C of [1, 100]) {
    assert.deepEqual([0.4, 1.0, 1.2, 15, 100].map((x) => level(x * C, C)), [0, 0, 1, 3, 3]);
    assert.equal(level(5 * C, C), 2);
  }
});
test('unit independent (integer 1/100 x amounts and micro-units give the same level)', () => {
  assert.equal(level(120, 100), 1); assert.equal(level(500, 100), 2); assert.equal(level(1500, 100), 3); assert.equal(level(100, 100), 0);
  const bet = 1_000_000; // 1.00 in micro-units
  assert.equal(level(1.2 * bet, bet), 1); assert.equal(level(15 * bet, bet), 3); assert.equal(level(bet, bet), 0);
});
test('multiples of 0.1x never flip a level through float noise', () => {
  // 0.1 * 3 = 0.30000000000000004: still quiet; 10 * 0.1 = 1: still quiet; 49 * 0.1 + 0.1 = 5 exactly: L2
  assert.equal(level(0.1 * 3, 1), 0); assert.equal(level(10 * 0.1, 1), 0); assert.equal(level(0.1 * 11, 1), 1);
  assert.equal(level(0.1 * 49 + 0.1, 1), 2); assert.equal(level(0.1 * 150, 1), 3);
});
test('anything unusable is quiet (level 0)', () => {
  for (const [R, C] of [[NaN, 1], [1, NaN], [Infinity, 1], [5, 0], [5, -1], [-5, 1], [undefined, 1], [5, undefined], [null, null], ['x', 1], [5, 'x']]) {
    assert.equal(level(R, C), 0, `${R},${C}`);
  }
  assert.equal(level('12', '1'), 2); assert.equal(level('20', '1'), 3); // numeric strings are numbers
});
test('thresholds, isCelebratory, crossedCost', () => {
  assert.deepEqual({ ...THRESHOLDS }, { l1: 1, l2: 5, l3: 15 });
  assert.ok(!isCelebratory(0) && isCelebratory(1) && isCelebratory(3));
  assert.ok(crossedCost(0.5, 1.2, 1) && crossedCost(1, 1.5, 1) && crossedCost(0, 30, 1));
  assert.ok(!crossedCost(1.2, 3, 1) && !crossedCost(0.2, 0.9, 1) && !crossedCost(1, 1, 1));
  assert.ok(crossedCost(100, 130, 100) && !crossedCost(130, 600, 100));
});
