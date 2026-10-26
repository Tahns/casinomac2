import test from 'node:test';
import assert from 'node:assert/strict';
import { createLedger, formatElapsed, formatNet } from '../../src/ui/ledger.js';
import { formatMoney } from '../../src/money.js';

test('formatElapsed: m:ss then h:mm:ss, junk is 0:00', () => {
  assert.equal(formatElapsed(0), '0:00'); assert.equal(formatElapsed(999), '0:00'); assert.equal(formatElapsed(1000), '0:01');
  assert.equal(formatElapsed(65_000), '1:05'); assert.equal(formatElapsed(3_599_000), '59:59'); assert.equal(formatElapsed(3_600_000), '1:00:00');
  assert.equal(formatElapsed(36_000_000 + 61_000), '10:01:01');
  for (const v of [-5, NaN, Infinity, undefined, null, 'x', {}]) assert.equal(formatElapsed(v), '0:00', String(v));
});
test('formatNet: sign only when it is not zero; works with every currency symbol and decimal rule', () => {
  const usd = (m) => formatMoney(m, 'USD'); const jpy = (m) => formatMoney(m, 'JPY'); const xsc = (m) => formatMoney(m, 'XSC');
  assert.equal(formatNet(0, usd), '$0.00'); assert.equal(formatNet(1_200_000, usd), '+$1.20'); assert.equal(formatNet(-5_000_000, usd), '-$5.00');
  assert.equal(formatNet(-1_000_000, jpy), '-¥1'); assert.equal(formatNet(-2_500_000, xsc), '-2.50 SC');
  assert.equal(formatNet(NaN, usd), '$0.00'); assert.equal(formatNet('abc', usd), '$0.00'); assert.equal(formatNet(0.4, usd), '$0.00');
});
test('ledger: net = returned - cost, round by round; junk amounts count as 0; elapsed from the injected clock', () => {
  let now = 1000; const L = createLedger({ now: () => now });
  assert.deepEqual(L.snapshot(), { net: 0, spent: 0, returned: 0, rounds: 0, elapsedMs: 0 });
  L.addRound({ cost: 1_000_000, payout: 0 });
  assert.equal(L.net, -1_000_000);
  L.addRound({ cost: 1_000_000, payout: 2_500_000 });
  assert.equal(L.net, 500_000); assert.equal(L.rounds, 2);
  L.addRound({ cost: 100_000_000, payout: 64_000_000 });
  assert.equal(L.net, 500_000 - 36_000_000);
  L.addRound({ cost: NaN, payout: -3 }); L.addRound({}); assert.equal(L.net, 500_000 - 36_000_000); assert.equal(L.rounds, 5);
  now = 66_000; assert.equal(L.elapsedMs, 65_000);
  assert.equal(L.snapshot().spent, 102_000_000); assert.equal(L.snapshot().returned, 66_500_000);
  L.reset(); assert.deepEqual(L.snapshot(), { net: 0, spent: 0, returned: 0, rounds: 0, elapsedMs: 0 });
});
test('ledger: onChange notifies after every round, unsubscribes, a throwing listener is harmless', () => {
  const L = createLedger({ now: () => 0 }); const got = [];
  const off = L.onChange((s) => got.push(s.net)); L.onChange(() => { throw new Error('x'); });
  L.addRound({ cost: 1, payout: 3 }); L.addRound({ cost: 2, payout: 0 });
  off(); L.addRound({ cost: 5, payout: 0 });
  assert.deepEqual(got, [2, 0]);
  assert.doesNotThrow(() => L.onChange(null));
});
