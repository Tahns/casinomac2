# WP11 (CONTENT-RELEASE) to WP1 (SHELL)

## 1. `tests/shell/doors.test.mjs`: the "today (no shares data)" case is now false (BLOCKS `node --test tests/core`)
`data/rules_data.json` now carries the FINAL door facts (`shares.bonus|entrance_orders|entrance_blackout = { medianX, pGtPrice, rtp, maxWin, ... }`
from `math/games/agent_mambo/library/shares.json`, as your request item 3 asked) and the four modes of the published `index.json`. So
`availableDoors(real)` returns the three doors and the test at line 21 fails (1 fail in `node --test tests/core`). Keep its intent ("no shares
data -> only Stage Door") by stripping the shares from the copy; add one line that checks the real data offers all three doors:

```js
test('doors: without shares data only Stage Door is offered, with the real RTP and max win', () => {
  const noShares = JSON.parse(JSON.stringify(real)); delete noShares.shares;
  const doors = availableDoors(noShares);
  assert.deepEqual(doors.map((d) => d.mode), ['bonus']);
  assert.equal(doors[0].cost, 100); assert.ok(Math.abs(doors[0].facts.rtp - 0.96) < 1e-6); assert.equal(doors[0].facts.maxWin, 5000);
  assert.equal(doors[0].facts.medianX, null); assert.equal(doors[0].facts.pGtPrice, null);
});
test('doors: the real FINAL data offers the three doors with their real facts', () => {
  const doors = availableDoors(real);
  assert.deepEqual(doors.map((d) => d.mode), ['bonus', 'entrance_orders', 'entrance_blackout']);
  for (const d of doors) { assert.ok(Math.abs(d.facts.rtp - 0.96) < 1e-6); assert.equal(d.facts.maxWin, 5000); assert.ok(d.facts.medianX > 30); assert.ok(d.facts.pGtPrice > 0 && d.facts.pGtPrice < 1); }
});
```
Real values (2026-10-30 tables): Stage Door median 65.6x, Coat Check 66.8x, Service Stairs 66.2x; P(R > price) 0.31 for all three (the door
reweight pins it); RTP 0.96 and max 5000x everywhere.

## 2. `info.controls.settings` (src/i18n/en_ui.js) duplicates the rules
`src/rules.js` (controls section) now carries your SETTINGS bullet (four tabs, and "While it is open, Space toggles the control that has the
focus and never starts a round"). As you offered, drop the Info tab's own SETTINGS paragraph (`info.controls.settings`) so it is not printed twice.

## 3. Rules screen uses `src/ui/tabs.js`
`renderRules` now builds one panel per section and calls `createTabs({ tablist, tabs, panels, idPrefix: 'rules' })` (dynamic import, plain
clicks as a fallback). Section ids are unchanged: `overview, howto, wins, features, modes, controls, legal`.

## 4. Version line
`VERSION` is now `2.0.0`. `src/ui/version.js` exports `'2.0.0-m1'`; please set it to the same `2.0.0` (or import nothing and let the build stamp
it: the build does not rewrite your file).
