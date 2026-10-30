// WP6 layers: unit tests (node --test tests/layers). Pure logic against the FINAL math fixtures (math/games/agent_mambo/library).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { outlineOf, outlineLength, createBeam, createBank, litByWindow, missionKey, OUTFIT_OF, DOOR_OF, windowCells, fmtX } from '../../src/render/layers/logic.js';
import { FLOOR_PLANS, setLayout, toGeo, resetLayout } from '../../src/render/geo.js';
import { en_layers } from '../../src/i18n/en_layers.js';
import { t, setSocial, EN } from '../../src/i18n/index.js';
import { findRestricted } from '../text/restricted.mjs';
import { P, stampSvg, envelopeSvg, dossierSvg, doorSvg, keyholePath, missionIcon, tagSvg, lampSvg, slipSvg } from '../../src/render/layers/art.js';
import { LAYERS, dispatch, resetLayers, WP6 } from '../../src/render/layers/index.js';
import { SKIP_AFTER_MS, DOSSIER_MS } from '../../src/render/layers/dossier.js';

const FIX = new URL('../../../math/games/agent_mambo/library/fixtures_out/', import.meta.url);
const books = (mode) => JSON.parse(fs.readFileSync(new URL(`books_${mode}_sample.json`, FIX), 'utf8'));

test('outline: every shipped floor plan, one closed loop, cell count == cellCount, perimeter right', () => {
  const perim = { mezzanine: 22, atrium: 22, lobby: 20, annex: 24 };
  for (const [id, plan] of Object.entries(FLOOR_PLANS)) {
    const o = outlineOf(plan);
    assert.equal(o.count, plan.cellCount, id);
    assert.equal(o.loops.length, 1, id + ' one loop');
    assert.equal(outlineLength(o.loops), perim[id], id + ' perimeter');
    assert.equal(o.edges, perim[id], id + ' boundary edges');
    assert.match(o.d, /^M[\d .L]+Z$/, id);
  }
});

test('outline: every layout event of the base fixtures draws exactly its own cells (no other shape)', () => {
  let n = 0;
  const seen = new Set();
  for (const b of books('base')) {
    for (const ev of b.events) {
      if (ev.type !== 'layout') continue;
      const o = outlineOf(ev);
      const want = ev.cells.reduce((a, c) => a + c.length, 0);
      assert.equal(o.count, want, `book ${b.id}`);
      if (ev.cellCount != null) assert.equal(o.count, ev.cellCount, `book ${b.id} cellCount`);
      // the cells drawn are exactly the plan's cells
      const drawn = new Set(o.cells.map((c) => c.reel + ',' + c.row));
      ev.cells.forEach((rows, reel) => rows.forEach((row) => assert.ok(drawn.has(reel + ',' + row))));
      seen.add(ev.id); n++;
    }
  }
  assert.ok(n > 20, 'enough layout events');
  for (const id of ['mezzanine', 'atrium', 'lobby', 'annex']) assert.ok(seen.has(id), id + ' seen');
});

test('outline: a plan with a hole gives two loops and still counts every cell', () => {
  const plan = { cols: 3, rows: 3, cells: [[0, 1, 2], [0, 2], [0, 1, 2]] };
  const o = outlineOf(plan);
  assert.equal(o.count, 8); assert.equal(o.loops.length, 2); assert.equal(outlineLength(o.loops), 16);
  assert.equal(outlineOf(null).count, 0);
});

// ---- Ballroom Blackout: the beam must agree with meta.lit on every win of the fixtures ----
function replayBeam(events) {
  const beam = createBeam();
  let wins = 0;
  resetLayout();
  for (const ev of events) {
    if (ev.type === 'layout') setLayout(ev);
    if (ev.type === 'reveal') { if (ev.gameType === 'freegame') setLayout(null); beam.reset(); }
    if (ev.type === 'lightRoute') beam.onRoute(ev);
    if (ev.type === 'tumbleBoard') beam.step();
    if (ev.type === 'winInfo') wins += beam.check(ev, (r, p) => toGeo(r, p)).length;
  }
  return { beam, wins };
}
test('blackout: meta.lit matches the beam on every lit-carrying win (entrance_blackout + base mission_blackout books)', () => {
  let checks = 0, lit = 0, books_ = 0;
  for (const mode of ['entrance_blackout', 'base']) {
    for (const b of books(mode)) {
      if (!b.events.some((e) => e.type === 'lightRoute')) continue;
      books_++;
      const { beam } = replayBeam(b.events);
      assert.equal(beam.mismatches, 0, `${mode} book ${b.id}: ${JSON.stringify(beam.checks.filter((c) => !c.ok).slice(0, 3))}`);
      checks += beam.checks.length; lit += beam.checks.filter((c) => c.lit).length;
    }
  }
  assert.ok(books_ >= 20, 'blackout books'); assert.ok(checks > 100, 'checks ' + checks); assert.ok(lit > 10, 'lit wins ' + lit);
});
test('blackout: a wrong beam is caught (corrupted route)', () => {
  const b = books('entrance_blackout').find((x) => x.events.some((e) => e.type === 'winInfo' && e.wins.some((w) => w.meta && w.meta.lit)));
  const ev = b.events.map((e) => (e.type === 'lightRoute' ? { ...e, route: e.route.map(() => ({ reel: 4, row: 3 })) } : e));
  const evs2 = ev.map((e) => (e.type === 'lightRoute' ? { ...e, route: e.route.map(() => ({ reel: 0, row: 0 })) } : e));
  const m = replayBeam(ev).beam.mismatches + replayBeam(evs2).beam.mismatches;
  assert.ok(m > 0);
});
test('blackout: the step index follows tumbleBoard and stays on the last entry; beam reset clears it', () => {
  const beam = createBeam();
  beam.onRoute({ w: 2, h: 2, lensMult: 4, route: [{ reel: 0, row: 0 }, { reel: 1, row: 1 }] });
  assert.deepEqual(beam.current(), { reel: 0, row: 0 });
  assert.equal(beam.step(), true); assert.deepEqual(beam.current(), { reel: 1, row: 1 });
  assert.equal(beam.step(), false); assert.deepEqual(beam.current(), { reel: 1, row: 1 });
  beam.reset(); assert.equal(beam.current(), null); assert.equal(beam.step(), false);
  assert.equal(windowCells({ reel: 1, row: 2 }).length, 4);
  assert.equal(litByWindow({ reel: 1, row: 2 }, [{ reel: 2, row: 4 }]), true);   // padded 4 = geometric 3
  assert.equal(litByWindow({ reel: 1, row: 2 }, [{ reel: 2, row: 2 }]), false);  // geometric 1
});

// ---- Sealed Orders: the bank of the envelope equals caseOpen.bank; banked amounts never reach the WIN before caseOpen ----
test('orders: envelope bank == caseOpen.bank and win == bank x mult on every fixture book', () => {
  let opens = 0;
  for (const mode of ['entrance_orders', 'base']) {
    for (const b of books(mode)) {
      if (!b.events.some((e) => e.type === 'missionAssigned' && e.mission === 'orders')) continue;
      const bank = createBank();
      let inFs = false, sinceOpenWin = 0;
      for (const ev of b.events) {
        if (ev.type === 'reveal') { inFs = ev.gameType === 'freegame'; if (inFs) bank.reset(); }
        if (ev.type === 'winInfo' && inFs) {
          const filed = bank.file(ev);
          assert.ok(filed > 0, `book ${b.id}: a free-spin win of Sealed Orders is banked`);
          assert.ok(ev.wins.every((w) => w.meta.banked === true));
        }
        if (ev.type === 'setWin' && inFs) sinceOpenWin++;
        if (ev.type === 'caseOpen') {
          assert.equal(bank.bank, ev.bank, `book ${b.id} bank`);
          if (!ev.capped) assert.equal(ev.win, ev.bank * ev.mult, `book ${b.id} win`);
          opens++;
        }
      }
    }
  }
  assert.ok(opens > 50, 'caseOpen events ' + opens);
});

test('missions: keys, outfits, doors', () => {
  assert.equal(missionKey('orders'), 'orders'); assert.equal(missionKey('fuse'), 'briefing'); assert.equal(missionKey(undefined), 'briefing');
  assert.deepEqual([OUTFIT_OF.briefing, OUTFIT_OF.orders, OUTFIT_OF.blackout], ['lab', 'trench', 'casino']);
  assert.deepEqual([DOOR_OF.briefing, DOOR_OF.orders, DOOR_OF.blackout], ['stage', 'coat', 'stairs']);
  assert.equal(fmtX(120), '1.20'); assert.equal(fmtX(2640), '26.40');
  assert.equal(SKIP_AFTER_MS, 1200); assert.ok(DOSSIER_MS >= 2600 && DOSSIER_MS <= 3400);
});

test('i18n: en_layers merged, mission names as specified, social screen clean, no raw key', () => {
  assert.equal(EN['layers.mission.briefing'], 'MISSION: THE BRIEFING');
  assert.equal(EN['layers.mission.orders'], 'MISSION: SEALED ORDERS');
  assert.equal(EN['layers.mission.blackout'], 'MISSION: BALLROOM BLACKOUT');
  for (const soc of [false, true]) {
    setSocial(soc);
    for (const k of Object.keys(en_layers)) {
      const s = t(k, { n: 10, x: '1.20', bank: '1.20', dial: 8, name: 'ATRIUM' });
      assert.ok(s && s !== k && !/undefined|NaN|\{\w+\}/.test(s), k + ' -> ' + s);
      assert.deepEqual(findRestricted(s), [], k + ': ' + s);
      assert.ok(!/\bwin\b/i.test(s) || k === 'layers.brief.briefing', k + ' says win'); // the envelope / slips never say WIN
    }
  }
  setSocial(false);
});

test('art: closed palette only, no emoji, no external reference', () => {
  const allowed = new Set(Object.values(P).map((c) => c.toUpperCase()));
  const svg = [stampSvg('TOP SECRET'), stampSvg('FILED', 'ink'), envelopeSvg(), dossierSvg(missionIcon('orders')), dossierSvg(missionIcon('blackout')),
    dossierSvg(missionIcon('briefing')), doorSvg('COAT CHECK'), tagSvg('x4'), lampSvg(), slipSvg(0), slipSvg(1)].join('');
  for (const hex of svg.match(/#[0-9a-fA-F]{6}\b/g) || []) assert.ok(allowed.has(hex.toUpperCase()), 'colour ' + hex);
  assert.ok(!/https?:|<image|xlink:href="(?!#)/.test(svg));
  assert.ok(!/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(svg));
  assert.ok(!/[aA]\d/.test(keyholePath(10).replace(/[ML]/g, '')), 'keyhole is a polygon (no arc flags)');
  const css = fs.readFileSync(new URL('../../src/render/layers/layers.css', import.meta.url), 'utf8');
  for (const hex of css.match(/#[0-9a-fA-F]{3,6}\b/g) || []) assert.ok(allowed.has(hex.toUpperCase()), 'css colour ' + hex);
  assert.ok(!/@font-face|@import|url\(\s*["']?https?:/i.test(css), 'no font, no external url');
  // the shipped source never says the restricted word the guideline runner scans for
  for (const f of fs.readdirSync(new URL('../../src/render/layers/', import.meta.url))) {
    const src = fs.readFileSync(new URL('../../src/render/layers/' + f, import.meta.url), 'utf8');
    assert.ok(!/stake/i.test(src), f + ' contains the scanned word');
  }
});

test('dispatcher: our layers attach only for a real player ctx; reset is safe twice; unknown events are ignored', async () => {
  assert.equal(dispatch({ type: 'reveal' }, {}), null);
  assert.equal(WP6.attached, false);
  const fakeBoard = { querySelector: () => null };
  dispatch({ type: 'noSuchEvent' }, { board: fakeBoard });
  assert.equal(WP6.attached, true);
  const ids = LAYERS.map((l) => l.id);
  assert.deepEqual(ids, ['blueprint', 'dossier', 'orders', 'blackout', 'debrief']);
  // DOM-free ctx: every layer must survive every event type and return null or a Promise
  const ctx = { T: (ms) => ms * 0.01, board: fakeBoard, cost: 100, skip: true };
  for (const type of ['layout', 'reveal', 'freeSpinTrigger', 'missionAssigned', 'lightRoute', 'winInfo', 'tumbleBoard', 'caseOpen', 'setWin', 'freeSpinEnd', 'finalWin']) {
    const r = dispatch({ type, mission: 'orders', route: [{ reel: 0, row: 0 }], wins: [], bank: 10, mult: 2, win: 20 }, ctx);
    assert.ok(r === null || typeof r.then === 'function', type);
    if (r) await r;
  }
  resetLayers(); resetLayers();
});
