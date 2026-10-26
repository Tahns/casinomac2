import test from 'node:test';
import assert from 'node:assert/strict';
import { parseParams } from '../../src/params.js';
import { formatMoney, MICRO } from '../../src/money.js';
import { createBetState, MODE_COSTS, canAfford } from '../../src/bet.js';
import { checkPlay, shouldEndRound, spaceAction, createAutoplay, needsConfirm } from '../../src/input.js';
import { createRgs, RgsError } from '../../src/rgs.js';
import fs from 'node:fs';

test('params', () => {
  let p = parseParams('?sessionID=abc&rgs_url=rgs.example.org/&lang=xx&social=true&currency=jpy');
  assert.equal(p.rgsUrl, 'https://rgs.example.org'); assert.equal(p.lang, 'en');
  assert.equal(p.social, true); assert.equal(p.sessionID, 'abc'); assert.equal(p.currency, 'JPY');
  p = parseParams('?rgs_url=http://localhost:3000&replay=true&game=g&version=1&mode=bonus&event=7&amount=1000000');
  assert.equal(p.rgsUrl, 'http://localhost:3000'); assert.equal(p.replay, true);
  assert.equal(p.replayMode, 'bonus'); assert.equal(p.replayAmount, 1000000);
  assert.equal(parseParams('').rgsUrl, '');
});

test('money', () => {
  const f = (m, c, o) => formatMoney(m, c, o);
  assert.equal(f(10 * MICRO, 'USD'), '$10.00'); assert.equal(f(10 * MICRO, 'EUR'), '€10.00');
  assert.equal(f(10 * MICRO, 'CAD'), 'CA$10.00'); assert.equal(f(10 * MICRO, 'MXN'), 'MX$10.00');
  assert.equal(f(10 * MICRO, 'JPY'), '¥10'); assert.equal(f(10 * MICRO, 'XSC'), '10.00 SC');
  assert.equal(f(10 * MICRO, 'XEC'), '10.00 SC'); assert.equal(f(10 * MICRO, 'XGC'), '10.00 GC');
  assert.ok(!f(10 * MICRO, 'XSC').includes('$'));
  assert.equal(f(5000, 'USD'), '$0.005'); // 0.1x on 0.05 bet
  assert.equal(f(50000, 'USD'), '$0.05'); assert.equal(f(0, 'USD'), '$0.00');
  assert.equal(f(5000, 'XSC'), '0.005 SC');
  assert.equal(f(1_500_000, 'DKK'), '1.50 KR');
  assert.equal(f(3 * MICRO, 'CHF'), 'CHF3.00'); // generic Intl fallback
});

test('bet levels from config only, stops at ends', () => {
  const cfg = { betLevels: [100000, 200000, 500000, 1000000], defaultBetLevel: 200000, minBet: 100000, maxBet: 1000000, stepBet: 100000 };
  const b = createBetState(cfg);
  assert.equal(b.bet, 200000); b.up(); assert.equal(b.bet, 500000); b.up(); b.up(); assert.equal(b.bet, 1000000);
  assert.equal(b.canUp(), false); b.down(); b.down(); b.down(); b.down(); assert.equal(b.bet, 100000); assert.equal(b.canDown(), false);
});
test('bet: active round amount, kept for next bet; short lists; JPY', () => {
  const cfg = { betLevels: [100000, 200000, 500000], defaultBetLevel: 100000 };
  const b = createBetState(cfg, { active: true, amount: 500000 });
  assert.equal(b.bet, 500000); assert.equal(b.canUp(), false);
  const inactive = createBetState(cfg, { active: false, amount: 500000 });
  assert.equal(inactive.bet, 100000);
  const one = createBetState({ betLevels: [1000000], defaultBetLevel: 1000000 });
  assert.equal(one.canUp(), false); assert.equal(one.canDown(), false); one.up(); one.down(); assert.equal(one.bet, 1000000);
  const jpy = createBetState({ betLevels: [100 * MICRO, 200 * MICRO], defaultBetLevel: 100 * MICRO });
  assert.equal(formatMoney(jpy.bet, 'JPY'), '¥100');
  assert.equal(jpy.cost('bonus'), 10000 * MICRO);
  assert.deepEqual(MODE_COSTS, { base: 1, bonus: 100 });
});
test('mode costs match math index.json when present', () => {
  const p = new URL('../../fixtures/index.json', import.meta.url);
  if (!fs.existsSync(p)) return;
  const idx = JSON.parse(fs.readFileSync(p, 'utf8'));
  for (const m of idx.modes || []) if (m.name in MODE_COSTS) assert.equal(m.cost, MODE_COSTS[m.name]);
});

test('insufficient-balance guard', () => {
  assert.equal(checkPlay(99 * MICRO, MICRO, 'bonus').reason, 'insufficient');
  assert.equal(checkPlay(100 * MICRO, MICRO, 'bonus').ok, true);
  assert.equal(checkPlay(MICRO - 1, MICRO, 'base').ok, false);
  assert.equal(canAfford(MICRO, MICRO, 'base'), true);
  assert.equal(needsConfirm(100), true); assert.equal(needsConfirm(1), false);
});
test('end-round rule', () => {
  assert.equal(shouldEndRound({ payoutMultiplier: 0, active: true }), false);
  assert.equal(shouldEndRound({ payoutMultiplier: 0.5, active: true }), true);
  assert.equal(shouldEndRound({ payoutMultiplier: 5, active: false }), false);
  assert.equal(shouldEndRound(null), false);
});
test('space bar and autoplay', () => {
  assert.equal(spaceAction({ state: 'idle', modalOpen: false }), 'spin');
  assert.equal(spaceAction({ state: 'idle', modalOpen: true }), null);
  assert.equal(spaceAction({ state: 'playing', modalOpen: false }), null);
  const ap = createAutoplay(); assert.equal(ap.active, false);
  ap.start({ count: 3, stopBigWin: true });
  assert.equal(ap.afterRound({ balance: 1e9, round: { payoutMultiplier: 1 } }), true);
  assert.equal(ap.afterRound({ balance: 1e9, round: { payoutMultiplier: 50 } }), false);
  ap.start({ count: 5, stopBelow: 5 * MICRO });
  assert.equal(ap.afterRound({ balance: 4 * MICRO, round: { payoutMultiplier: 0 } }), false);
  ap.start({ count: 5, stopFeature: true });
  assert.equal(ap.afterRound({ balance: 1e9, round: { state: [{ type: 'freeSpinTrigger' }] } }), false);
});

test('rgs: invalid host is an error, play/endRound plumbing', async () => {
  const html = async () => ({ ok: false, status: 404, json: async () => { throw new Error('html'); } });
  await assert.rejects(createRgs({ rgsUrl: 'https://example.com', sessionID: 's', fetchImpl: html }).authenticate(), (e) => e instanceof RgsError && e.code === 'ERR_CONN');
  const boom = async () => { throw new TypeError('fetch failed'); };
  await assert.rejects(createRgs({ rgsUrl: 'https://x', sessionID: 's', fetchImpl: boom }).authenticate(), { code: 'ERR_CONN' });
  const junk = async () => ({ ok: true, status: 200, json: async () => ({ hello: 1 }) });
  await assert.rejects(createRgs({ rgsUrl: 'https://x', sessionID: 's', fetchImpl: junk }).authenticate(), { code: 'ERR_AUTH' });
  let n = 0; const calls = [];
  const act = async (url, init) => { calls.push(url); n++; return n < 3 ? { ok: false, status: 400, json: async () => ({ code: 'ERR_ACT' }) } : { ok: true, status: 200, json: async () => ({ balance: { amount: 1 } }) }; };
  const r = createRgs({ rgsUrl: 'https://x', sessionID: 's', fetchImpl: act, retryDelay: 1 });
  assert.equal((await r.play(1000000, 'base')).balance.amount, 1); assert.equal(n, 3);
  const ipb = async () => ({ ok: false, status: 400, json: async () => ({ code: 'ERR_IPB' }) });
  await assert.rejects(createRgs({ rgsUrl: 'https://x', sessionID: 's', fetchImpl: ipb }).play(1, 'base'), { code: 'ERR_IPB' });
});

import { unleashMinPrice, unleashAvailable } from '../../src/bet.js';
test('UNLEASH minimum price: 50 units (USD/EUR), bigger round floors for MXN/JPY', () => {
  assert.equal(unleashMinPrice('EUR'), 50_000_000);
  assert.equal(unleashMinPrice('MXN'), 1000_000_000);
  assert.equal(unleashMinPrice('JPY'), 7500_000_000);
  assert.equal(unleashAvailable(400_000, 'EUR'), false); // 0.40 x 100 = 40 < 50
  assert.equal(unleashAvailable(500_000, 'EUR'), true);  // 0.50 x 100 = 50
  assert.equal(unleashAvailable(1_000_000, 'USD'), true);
});
