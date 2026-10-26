import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { availableDoors, doorFactLines, DOORS } from '../../src/ui/doors.js';
import { modeCost, MODE_COSTS, DOOR_MODE_COSTS, totalCost, unleashAvailable } from '../../src/bet.js';
import { t, setSocial, setLang } from '../../src/i18n/index.js';
import { findRestricted } from '../text/restricted.mjs';

const real = JSON.parse(fs.readFileSync(new URL('../../data/rules_data.json', import.meta.url), 'utf8'));
const withDoors = () => {
  const d = JSON.parse(JSON.stringify(real));
  d.modes.push({ name: 'entrance_orders', cost: 100, rtp: 0.96, maxWin: 5000 }, { name: 'entrance_blackout', cost: 100, rtp: 0.96, maxWin: 5000 });
  d.shares = { bonus: { medianX: 64.1, pGtPrice: 0.288 }, entrance_orders: { medianX: 66, pGtPrice: 0.31, rtp: 0.96, maxWin: 5000 }, entrance_blackout: { medianX: 61, pGtPrice: 0.3, rtp: 0.96, maxWin: 5000 } };
  return d;
};

test('doors: three doors in a fixed order, Stage Door = bonus', () => {
  assert.deepEqual(DOORS.map((d) => d.id), ['stage', 'coat', 'stairs']);
  assert.deepEqual(DOORS.map((d) => d.mode), ['bonus', 'entrance_orders', 'entrance_blackout']);
});
test('doors: today (no shares data) only Stage Door is offered, with the real RTP and max win', () => {
  const doors = availableDoors(real);
  assert.deepEqual(doors.map((d) => d.mode), ['bonus']);
  assert.equal(doors[0].cost, 100); assert.ok(Math.abs(doors[0].facts.rtp - 0.96) < 1e-6); assert.equal(doors[0].facts.maxWin, 5000);
  assert.equal(doors[0].facts.medianX, null); assert.equal(doors[0].facts.pGtPrice, null);
});
test('doors: a door needs BOTH the mode in the data and its shares facts', () => {
  const d = withDoors();
  assert.deepEqual(availableDoors(d).map((x) => x.id), ['stage', 'coat', 'stairs']);
  delete d.shares.entrance_blackout; assert.deepEqual(availableDoors(d).map((x) => x.id), ['stage', 'coat']);       // no shares -> hidden
  const e = withDoors(); e.modes = e.modes.filter((m) => m.name !== 'entrance_orders'); assert.deepEqual(availableDoors(e).map((x) => x.id), ['stage', 'stairs']); // no math -> hidden
  const f = withDoors(); delete f.shares; assert.deepEqual(availableDoors(f).map((x) => x.id), ['stage']);
});
test('doors: junk and hostile data never throws and always keeps Stage Door', () => {
  for (const v of [null, undefined, 0, 'x', [], {}, { modes: 'x' }, { modes: [null, 5], shares: 7 }, { shares: { __proto__: { entrance_orders: {} } }, modes: [{ name: 'entrance_orders' }] }, { modes: [{ name: 'entrance_orders' }], shares: { constructor: {} } }]) {
    const doors = availableDoors(v); assert.deepEqual(doors.map((x) => x.id), ['stage'], JSON.stringify(v));
  }
  const d = availableDoors({ modes: [{ name: 'bonus', cost: 'x', rtp: 'y', maxWin: NaN }] });
  assert.equal(d[0].cost, 100); assert.equal(d[0].facts.rtp, null); assert.equal(d[0].facts.maxWin, null);
});
test('doors: fact lines come from the data only, in normal and social wording, with no restricted word', () => {
  setLang('en');
  const doors = availableDoors(withDoors());
  for (const social of [false, true]) {
    setSocial(social);
    for (const door of doors) {
      const lines = doorFactLines(door, t);
      assert.ok(lines.length >= 3, door.id);
      assert.deepEqual(findRestricted(lines.join(' ') + ' ' + t(door.nameKey) + ' ' + t('door.cost', { cost: '100.00 SC' })), [], door.id + ' social=' + social);
      assert.ok(lines.some((l) => /96\.00%/.test(l))); assert.ok(lines.some((l) => /5,000x/.test(l)));
      assert.ok(!lines.some((l) => /undefined|NaN|\{/.test(l)));
    }
  }
  setSocial(false);
  assert.deepEqual(doorFactLines({ facts: {} }, t), []);                                   // unknown facts print nothing
  assert.ok(doorFactLines(doors[0], t).some((l) => /^29% of rounds/.test(l)));
  assert.ok(!doorFactLines(doors[0], t).join(' ').match(/better|best|odds|lucky|guarantee/i));   // no "better odds" wording
});
test('bet: door modes cost 100x; MODE_COSTS stays the v1 pair; unknown modes cost 1x', () => {
  assert.deepEqual(MODE_COSTS, { base: 1, bonus: 100 }); assert.deepEqual(DOOR_MODE_COSTS, { entrance_orders: 100, entrance_blackout: 100 });
  assert.equal(modeCost('entrance_orders'), 100); assert.equal(modeCost('ENTRANCE_BLACKOUT'), 100); assert.equal(modeCost('BONUS'), 100); assert.equal(modeCost('base'), 1);
  for (const m of ['constructor', '__proto__', 'toString', '', null, undefined, 7]) assert.equal(modeCost(m), 1, String(m));
  assert.equal(totalCost(1_000_000, 'entrance_orders'), 100_000_000);
  assert.equal(unleashAvailable(500_000, 'USD', 'entrance_blackout'), true); assert.equal(unleashAvailable(100_000, 'USD'), false);
});
