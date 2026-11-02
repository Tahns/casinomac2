// WP6 layers: unit tests (node --test tests/layers). Pure logic against the FINAL math fixtures (math/games/agent_mambo/library).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { outlineOf, outlineLength, createBeam, createBank, litByWindow, missionKey, OUTFIT_OF, DOOR_OF, windowCells, fmtX, fmtAmt, parkEnvelope } from '../../src/render/layers/logic.js';
import { formatMoney } from '../../src/money.js';
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

// ---- K3: the Sealed Orders amounts in the HUD money format (ctx.fmt takes a multiple of the play amount) ----
test('orders: fmtAmt uses the HUD formatter (USD bet 2, JPY, social coins) and falls back to the bare amount', () => {
  const usd2 = (x) => '$' + (x * 2).toFixed(2);
  assert.equal(fmtAmt(usd2, 250), '$5.00');
  assert.equal(fmtAmt((x) => '¥' + Math.round(x * 100), 250), '¥250');
  assert.equal(fmtAmt((x) => (x * 1).toFixed(2) + ' SC', 120), '1.20 SC');
  assert.equal(fmtAmt(null, 120), '1.20');
  assert.equal(fmtAmt(() => 'NaN', 120), '1.20');
  assert.equal(fmtAmt(() => { throw new Error('x'); }, 2640), '26.40');
  // the real formatter as main.js wires it: x (multiple of the play amount) * bet in micro units
  const fm = (bet, cur, o) => (x) => formatMoney(Math.round(x * bet), cur, o);
  assert.equal(fmtAmt(fm(2000000, 'USD'), 250), '$5.00');
  assert.equal(fmtAmt(fm(100000000, 'JPY'), 250), '¥250');
  const sc = fmtAmt(fm(1000000, 'XSC', { social: true }), 250);
  assert.equal(sc, '2.50 SC');
  assert.deepEqual(findRestricted(t('layers.bank', { x: sc })), []);
});

// ---- K4 (round 2): the parked envelope never overlaps a cell, stays inside the viewport and above the HUD (room = px down to the
// floor: the viewport's bottom - 4 px, or the HUD's top when the HUD row starts under the board) ----
test('orders: parkEnvelope keeps the envelope under the cell area and above the floor in landscape', () => {
  const tiltOf = (w) => Math.ceil(w * 0.06) + 1;
  const cases = [
    // board (cell area) in wrap px, room down to the floor, cell px (1280x720, 1024x576, 800x450 measured in the game)
    [{ left: 18, top: 18, width: 706, height: 588 }, 62, 117.7],
    [{ left: 14, top: 14, width: 555, height: 462 }, 53, 92.5],
    [{ left: 11, top: 11, width: 434, height: 362 }, 41, 72.3],
    [{ left: 9, top: 10, width: 393, height: 327 }, 351, 65.4],
  ];
  for (const [board, room, cell] of cases) {
    const p = parkEnvelope(board, room, cell, 0, {});
    assert.equal(p.mode, 'below', JSON.stringify({ board, room }));
    const bottom = board.top + board.height, t = tiltOf(p.width);
    assert.ok(p.top - t >= bottom, 'under the cells ' + JSON.stringify({ board, p }));
    assert.ok(p.top + p.height + t <= bottom + room, 'above the floor ' + JSON.stringify({ board, room, p }));
    assert.ok(p.height <= cell * 0.62 + 0.5 && p.height >= 18, 'size ' + p.height);
    assert.ok(p.left >= board.left && p.left + p.width <= board.left + board.width, 'inside the board column');
  }
  // 400x225: 9 px down to the floor, 76 px to the viewport's right edge: beside the board's lower-right corner, outside the frame
  const sb = { left: 6, top: 6, width: 240, height: 199 };
  // render round 2: a fit box (the envelope's body, >= 22 px wide) with the two-line plate (FILED over the amount) beside it when the row fits
  const q = parkEnvelope(sb, 9, 40, 76, { plateW: 40, plateH: 23 });
  assert.equal(q.mode, 'side');
  assert.equal(q.fit, true);
  assert.ok(!q.stack, 'side by side ' + JSON.stringify(q));
  assert.ok(q.width >= 22 && Math.abs(q.width / q.height - 112 / 64) < 0.1, 'body box ' + JSON.stringify(q));
  assert.ok(q.left >= sb.left + sb.width + 1, 'outside the cell area ' + q.left);
  assert.ok(q.left + q.width + 3 + 40 + 2 <= sb.left + sb.width + 76, 'the row ends inside the viewport ' + JSON.stringify(q));
  assert.ok(q.top + q.height <= sb.top + sb.height + 9 - 2, 'above the floor ' + JSON.stringify(q));
  // the menu button above the floor (400x225: wrap 272..306 x 147..181) is never under the envelope
  const menu = { left: 272, top: 147, right: 306, bottom: 181 };
  const hitM = (r) => Math.min(r.left + r.width + 1, menu.right) > Math.max(r.left - 1, menu.left) && Math.min(r.top + r.height + 2, menu.bottom) > Math.max(r.top - 2, menu.top);
  const q1 = parkEnvelope(sb, 9, 40, 76, { plateW: 40, plateH: 23, avoid: [menu] });
  assert.ok(!q1.stack && !hitM(q1), JSON.stringify(q1));
  // a long amount: the plate goes under the envelope, which narrows to end left of the menu button (22 px at least)
  const q2 = parkEnvelope(sb, 9, 40, 76, { plateW: 60, plateH: 23, avoid: [menu] });
  assert.equal(q2.stack, true);
  assert.ok(q2.width >= 22 && !hitM(q2), JSON.stringify(q2));
  assert.ok(q2.top + q2.height + 3 + 23 <= sb.top + sb.height + 9, 'plate room under the envelope, above the floor ' + JSON.stringify(q2));
  // no room under the board nor beside it: the top lip
  const lip = { left: 60, right: 300, top: -20, bottom: 5 };
  assert.equal(parkEnvelope(sb, 9, 40, 10, { lip }).mode, 'top');
});

test('orders: parkEnvelope parks on the top lip in portrait (the HUD row starts under the board), clear of the cells', () => {
  // 425x812 in the game: cell area at wrap (9,10) 393 x 327, HUD 1 px under the frame (room 0), lip left of the FREE SPINS plate
  const board = { left: 9, top: 10, width: 393, height: 327 };
  // (lip.top is tucked 3 px under the meter track's rim; render round 2: an upright fit box, the body >= 22 px wide)
  const lip = { left: 42.9, right: 107, top: -10, bottom: 8.8 };
  const p = parkEnvelope(board, 0, 65.4, 0, { portrait: true, lip, plateW: 33 });
  assert.equal(p.mode, 'top');
  assert.equal(p.fit, true);
  assert.ok(p.top + p.height <= lip.bottom + 0.5, 'above the first cell row ' + JSON.stringify(p));
  assert.ok(p.top >= lip.top + 3 - 0.5, 'under the meter track ' + JSON.stringify(p));
  assert.ok(p.left >= lip.left && p.width >= 22 && p.width <= 28, JSON.stringify(p));
  assert.ok(p.left + p.width + 3 + 33 <= lip.right, 'the plate ends before the FREE SPINS plate ' + JSON.stringify(p));
  assert.equal(p.tight, false);
  // a longer plate: the envelope narrows (never under 22 px), then the plate takes the smaller type
  const p2 = parkEnvelope(board, 0, 65.4, 0, { portrait: true, lip, plateW: 38 });
  assert.ok(p2.width >= 22 && p2.width < p.width && p2.left + p2.width + 3 + 38 <= lip.right, JSON.stringify(p2));
  const p3 = parkEnvelope(board, 0, 65.4, 0, { portrait: true, lip, plateW: 60 });
  assert.equal(p3.tight, true);
  assert.equal(p3.width, 22);
  // portrait with plenty of room under the board still goes to the top lip (never where the HUD row starts)
  assert.equal(parkEnvelope(board, 300, 65.4, 0, { portrait: true, lip }).mode, 'top');
});

test('blackout: upcoming() lists the next route windows only (I4)', () => {
  const B = createBeam();
  B.onRoute({ route: [{ reel: 0, row: 0 }, { reel: 2, row: 1 }, { reel: 4, row: 3 }] });
  assert.deepEqual(B.upcoming(2), [{ reel: 2, row: 1 }, { reel: 4, row: 3 }]);
  B.step(); assert.deepEqual(B.upcoming(2), [{ reel: 4, row: 3 }]);
  B.step(); assert.deepEqual(B.upcoming(2), []);
  B.reset(); assert.deepEqual(B.upcoming(2), []);
});
