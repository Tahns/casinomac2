// WP4 RENDER-CORE browser acceptance for milestones 2 and 3 (floor plans, missions), on REAL books of the final math.
//   Run: cd frontend_mambo && node tests/render/browser_v2.mjs [--only=P,M,V] [--shots] [--v1dir=<pristine copy of frontend_mambo>]
// Books: tests/render/fixtures/v2_books.json, copied verbatim from math/games/agent_mambo/library/fixtures_out (one per floor plan, one
// per mission and door, the 5000x cap books, v1 `bonus` books). Spawns its OWN static server (port 5902, override PORTS="a,b"; b is the
// pristine v1 copy for section V) and kills only the PIDs it started. Exit code 1 on any FAIL.
//   P  floor plans: the four plans at 1280x720, 1024x576, 425x812, 400x225: the board is drawn in the plan of the `layout` event (cells ==
//      cellCount, absent positions are .slot.void), no overflow, no page scroll, Annex cells >= 24 px at 400x225 (measured), the frame morph
//      5 <-> 6 rows, the compact-padded winInfo positions land on the geometric cells (geo.js), free spins go back to Mezzanine
//   M  missions: final WIN == payoutMultiplier for every book; nothing celebratory at R <= C (oracle written here, banked-aware); a banked
//      step never touches WIN, never celebrates, never starts a win-like sound; caseOpen == bank x dial (bank = the banked steps of the
//      spin, dial = the last updateGlobalMult) and the WIN shown at caseOpen is that amount; Blackout lit clusters carry the x4 tag;
//      missionAssigned sets the mission state, the dial step and the costume request; an unknown mission plays the Briefing look
//   V  (--v1dir or PORTS b) v1 books still play identically: the settled board of v1 books is pixel-near identical to a pristine copy
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FRONT = path.resolve(HERE, '../..');
const SHOTS = path.join(HERE, 'shots');
const req = createRequire(process.env.PW_DIR ? process.env.PW_DIR + '/' : '/tmp/claude-0/pw/');
let chromium; try { ({ chromium } = req('playwright-core')); } catch { ({ chromium } = createRequire(import.meta.url)('playwright')); }
const [gp, vp1] = (process.env.PORTS || '5902,5906').split(',').map(Number);
const argv = process.argv.slice(2);
const SHOTS_ON = argv.includes('--shots');
const ONLY = (argv.find((a) => a.startsWith('--only=')) || '').slice(7).split(',').filter(Boolean);
const V1DIR = (argv.find((a) => a.startsWith('--v1dir=')) || '').slice(8);
const want = (s) => !ONLY.length || ONLY.includes(s);
const FIX = JSON.parse(fs.readFileSync(path.join(HERE, 'fixtures/v2_books.json'), 'utf8')).books;
const book = (tag) => FIX.find((b) => b.tag === tag);
const costOf = (b) => (b.mode === 'base' ? 1 : 100);

const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok: !!ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  [' + detail + ']' : ''}`); };

// ---------------------------------------------------------------- servers (own PIDs only)
const kids = [];
function spawnOwn(script, env, re, cwd) {
  return new Promise((resolve, reject) => {
    const c = spawn(process.execPath, [script], { cwd, env: { ...process.env, ...env }, stdio: ['ignore', 'pipe', 'pipe'] });
    kids.push(c); let buf = '';
    const to = setTimeout(() => reject(new Error('timeout ' + script + ' ' + buf)), 10000);
    c.stdout.on('data', (d) => { buf += d; const m = re.exec(buf); if (m) { clearTimeout(to); resolve(Number(m[1])); } });
    c.stderr.on('data', (d) => { buf += d; });
    c.on('exit', (code) => { clearTimeout(to); reject(new Error(script + ' exited ' + code + ' ' + buf)); });
  });
}
const stopAll = () => { for (const c of kids) { try { c.removeAllListeners('exit'); c.kill('SIGKILL'); } catch { /* gone */ } } kids.length = 0; };
for (const s of ['exit', 'SIGINT', 'SIGTERM']) process.on(s, () => { stopAll(); if (s !== 'exit') process.exit(130); });
const RE_SRV = /static server http:\/\/localhost:(\d+)/;
const GAME = `http://localhost:${await spawnOwn(path.join(FRONT, 'tools/mock-rgs/static-server.mjs'), { PORT: String(gp) }, RE_SRV, FRONT)}`;
console.log('server', GAME);
const browser = await chromium.launch({ args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });

async function openHarness(o = {}) {
  const ctx = await browser.newContext({ viewport: o.viewport || { width: 1024, height: 576 }, deviceScaleFactor: 1 });
  await ctx.addInitScript((seed) => { let a = seed >>> 0; Math.random = () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }, o.seed ?? 11);
  if (o.still) await ctx.addInitScript(() => { try { localStorage.setItem('am_settings', JSON.stringify({ v: 1, motion: 'still' })); } catch (e) { /* ignore */ } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`${m.type()}: ${m.text()}`); });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  await page.goto(`${o.base || GAME}/tests/render/harness.html?nodev=1`);
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 20000 });
  // a second probe (after the harness one): what is on the board when each event arrives (win / quiet cells, popups) and the WIN hook
  await page.evaluate(async () => {
    const { LAYERS } = await import('../../src/render/layers/index.js');
    window.__snap = [];
    LAYERS.push({ id: 'probe2', onEvent(ev) {
      const cells = [...document.querySelectorAll('.cells .cell.win, .cells .cell.qw')].map((e) => [Number(e.style.getPropertyValue('--c')), Number(e.style.getPropertyValue('--r'))]);
      window.__snap.push({ type: ev && ev.type, cells, plan: document.querySelector('.board-wrap').dataset.plan });
    }, reset() {} });
  });
  await page.waitForTimeout(o.settle ?? 600);
  return { ctx, page, errors, close: () => ctx.close() };
}
const play = async (page, events, o) => { await page.evaluate(() => { window.__snap = []; H.renderer._trace(true); }); return page.evaluate(([ev, op]) => H.play(ev, op), [events, o || {}]); };
const trace = (page) => page.evaluate(() => H.renderer._state.traceLog.slice());

// ---------------------------------------------------------------- oracle (banked-aware), written here: it never reads the player's tracker
function oracle(events) {
  const R = []; let confirmed = 0, spin = 0, banked = false;
  for (const e of events) {
    switch (e.type) {
      case 'reveal': confirmed += spin; spin = 0; banked = false; break;
      case 'winInfo': {
        const wins = e.wins || [];
        if (wins.length && wins.every((w) => w.meta && w.meta.banked)) { banked = true; break; }
        spin += wins.reduce((a, w) => a + (w.win || 0), 0); break;
      }
      case 'updateTumbleWin': case 'setTumbleWin': if (!banked) spin = e.amount; break;
      case 'caseOpen': spin = e.win; banked = false; break;
      case 'setWin': spin = e.amount; banked = false; break;
      case 'setTotalWin': case 'freeSpinEnd': case 'wincap': case 'finalWin': confirmed = e.amount; spin = 0; banked = false; break;
      default: break;
    }
    R.push((confirmed + spin) / 100);
  }
  return R;
}
function groupLog(log) {
  const g = []; let cur = { i: -1, type: 'start', items: [] }; g.push(cur);
  for (const l of log) { if (l.kind === 'event') { cur = { i: l.i, type: l.type, items: [] }; g.push(cur); } else cur.items.push(l); }
  return g;
}
const HAPPY_REACT = new Set(['win', 'bigwin', 'epic']), HAPPY_POSE = new Set(['happy', 'bigwin', 'celebrate']);
function gateViolations(events, cost, log) {
  const R = oracle(events); const bad = [];
  for (const grp of groupLog(log)) {
    const r = grp.i >= 0 ? R[grp.i] : 0;
    if (r > cost * (1 + 1e-9)) continue;
    const where = `event ${grp.i} ${grp.type} R=${r} C=${cost}`;
    for (const l of grp.items) {
      if (l.kind === 'audio' && l.winLike && l.ret === true) bad.push(`win-like sound ${l.id}: ${where}`);
      if (l.kind === 'dom' && l.what === 'cell.win') bad.push(`cell.win: ${where}`);
      if (l.kind === 'dom' && l.what === 'banner' && /\bwin\b/.test(l.cls || '')) bad.push(`win banner: ${where}`);
      if (l.kind === 'mascot' && l.fn === 'react' && HAPPY_REACT.has(l.args[0])) bad.push(`react ${l.args[0]}: ${where}`);
      if (l.kind === 'mascot' && l.fn === 'setPose' && HAPPY_POSE.has(l.args[0])) bad.push(`pose ${l.args[0]}: ${where}`);
      if (l.kind === 'fx' && ['coins', 'coinRain', 'confetti'].includes(l.name)) bad.push(`fx ${l.name}: ${where}`);
    }
  }
  return bad;
}
const finalTotal = (log) => { const t = [...log].reverse().find((l) => l.kind === 'total'); return t ? t.x : null; };

// ================================================================ P  floor plans
if (want('P')) {
  console.log('\n== P  floor plans on real base books ==');
  const VPS = [[1280, 720], [1024, 576], [425, 812], [400, 225]];
  const PLANS = ['plan_mezzanine', 'plan_atrium', 'plan_lobby', 'plan_annex'];
  const h = await openHarness();
  let annexPx = null;
  for (const [w, hh] of VPS) {
    await h.page.setViewportSize({ width: w, height: hh });
    await h.page.waitForTimeout(250);
    for (const tag of PLANS) {
      const b = book(tag); const lay = b.events.find((e) => e.type === 'layout');
      const log = await play(h.page, b.events, { cost: 1, skip: true });
      await h.page.waitForTimeout(150);
      const m = await h.page.evaluate(() => {
        const g = document.getElementById('game').getBoundingClientRect(), wr = document.querySelector('.board-wrap').getBoundingClientRect();
        const c = document.querySelector('.cells .cell'); const cr = c ? c.getBoundingClientRect() : null;
        return { plan: document.querySelector('.board-wrap').dataset.plan, cells: document.querySelectorAll('.cells .cell').length, voids: document.querySelectorAll('.slots .slot.void').length,
          slots: document.querySelectorAll('.slots .slot').length, px: cr ? Math.min(cr.width, cr.height) : 0,
          over: Math.max(g.left - wr.left, g.top - wr.top, wr.right - g.right, wr.bottom - g.bottom), scroll: Math.max(document.documentElement.scrollWidth - innerWidth, document.documentElement.scrollHeight - innerHeight) };
      });
      const vpn = `${w}x${hh}`;
      check(`P ${vpn} ${lay.id}: board drawn in the plan (${m.cells} cells == cellCount ${lay.cellCount}, ${m.voids} void positions)`, m.plan === lay.id && m.cells === lay.cellCount && m.voids === 6 * lay.rows - lay.cellCount && m.slots === 6 * lay.rows, JSON.stringify(m));
      check(`P ${vpn} ${lay.id}: no overflow of the frame out of the game area, no page scroll`, m.over <= 1 && m.scroll <= 0, `overflow ${m.over.toFixed(1)} px, scroll ${m.scroll}`);
      if (lay.id === 'annex' && w === 400) { annexPx = m.px; check(`P 400x225 annex: cells >= 24 px (measured ${m.px.toFixed(1)} px)`, m.px >= 24, `${m.px.toFixed(1)} px`); }
      check(`P ${vpn} ${lay.id}: final WIN ${b.payoutMultiplier / 100}x`, Math.abs(finalTotal(log) - b.payoutMultiplier / 100) < 1e-6, String(finalTotal(log)));
      if (SHOTS_ON && (w === 1024 || w === 400)) { fs.mkdirSync(SHOTS, { recursive: true }); await h.page.screenshot({ path: path.join(SHOTS, `wp4_plan_${lay.id}_${vpn}.png`) }); }
    }
  }
  // compact-padded positions -> geometric cells (geo.js) on every plan, and the frame morph
  await h.page.setViewportSize({ width: 1024, height: 576 });
  for (const tag of ['plan_atrium', 'plan_lobby', 'plan_annex', 'plan_annex_win', 'base_substake_atrium', 'plan_mezzanine']) {
    const b = book(tag); const lay = b.events.find((e) => e.type === 'layout');
    await play(h.page, b.events, { cost: 1, skip: true });
    const snap = await h.page.evaluate(() => window.__snap.slice());
    let checked = 0; const bad = [];
    b.events.forEach((e, i) => {
      if (e.type !== 'winInfo') return;
      const want = new Set(e.wins.flatMap((w) => w.positions.map((p) => `${p.reel},${lay.cells[p.reel][p.row - 1]}`)));
      const got = new Set((snap[i + 1] || { cells: [] }).cells.map(([c, r]) => `${c},${r}`));
      checked++;
      if (want.size !== got.size || [...want].some((k) => !got.has(k))) bad.push(`winInfo ${i}: want ${[...want].sort()} got ${[...got].sort()}`);
    });
    check(`P ${tag} (${lay.id}): the compact-padded winInfo positions light the geometric cells (${checked} winInfo)`, checked > 0 && bad.length === 0, bad.slice(0, 2).join(' | '));
  }
  // morph: from Mezzanine to Annex and back, normal speed; layout handled before the reveal, frame morph 417 ms
  {
    await play(h.page, book('plan_mezzanine').events, { cost: 1, skip: true });
    const b = book('plan_annex');
    await play(h.page, b.events, { cost: 1 });
    const tr = await trace(h.page);
    const plan = tr.find((x) => x.name === 'plan');
    check('P Mezzanine -> Annex: the frame morphs (5 -> 6 rows) on the layout event, before any symbol lands', plan && plan.id === 'annex' && plan.morph === true, JSON.stringify(plan));
    const anims = await h.page.evaluate(() => document.querySelector('.board-wrap').getAnimations().length);
    check('P after the morph nothing is left running on the frame', anims === 0, `animations ${anims}`);
    await play(h.page, book('v1_bonus_below').events.slice(0, 1).concat([{ type: 'setTotalWin', amount: 0 }, { type: 'finalWin', amount: 0 }]), { cost: 1 });
    const tr2 = await trace(h.page);
    const p2 = tr2.find((x) => x.name === 'plan');
    check('P a v1 book (no layout event) after an Annex spin plays on Mezzanine (morph back at its reveal)', p2 && p2.id === 'mezzanine' && p2.morph === true, JSON.stringify(p2));
  }
  // free spins after a trigger on a non-home plan are Mezzanine; the trigger positions still map on the base plan
  for (const tag of ['base_annex_trigger', 'base_mission_orders_lobby_trigger', 'base_mission_briefing_atrium_trigger']) {
    const b = book(tag);
    const log = await play(h.page, b.events, { cost: 1, skip: true });
    const snap = await h.page.evaluate(() => window.__snap.slice());
    const iFree = b.events.findIndex((e) => e.type === 'reveal' && e.gameType === 'freegame');
    const plansAfter = new Set(snap.slice(iFree + 1).map((s) => s.plan));
    const lay = b.events.find((e) => e.type === 'layout');
    check(`P ${tag}: base on ${lay.id}, every free spin on Mezzanine, final WIN ${b.payoutMultiplier / 100}x`, plansAfter.size === 1 && plansAfter.has('mezzanine') && Math.abs(finalTotal(log) - b.payoutMultiplier / 100) < 1e-6, `${[...plansAfter]} ${finalTotal(log)}`);
  }
  check('P no console error or warning', h.errors.length === 0, h.errors.slice(0, 3).join(' | '));
  console.log('   Annex cell size at 400x225:', annexPx && annexPx.toFixed(1), 'px');
  await h.close();
}

// ================================================================ M  missions
if (want('M')) {
  console.log('\n== M  missions on real books (Briefing, Sealed Orders, Ballroom Blackout, doors, 5000x) ==');
  const h = await openHarness({ seed: 3 });
  const tags = ['base_mission_orders', 'base_mission_blackout', 'base_mission_briefing_atrium_trigger', 'base_win15x_annex', 'base_wincap_5000x',
    'orders_below_price', 'orders_above_price', 'orders_capped_5000x', 'blackout_below_price', 'blackout_above_price', 'blackout_wincap_5000x', 'v1_bonus_below', 'v1_bonus_above'];
  for (const tag of tags) {
    const b = book(tag); const C = costOf(b); const ev = b.events;
    const log = await play(h.page, ev, { cost: C, skip: true });
    const tr = await trace(h.page);
    const st = await h.page.evaluate(() => ({ mission: H.renderer._state.mission, meter: (document.querySelector('.mm') || {}).dataset ? document.querySelector('.mm').dataset.mission : null }));
    check(`M ${tag}: final WIN == payoutMultiplier ${b.payoutMultiplier / 100}x`, Math.abs(finalTotal(log) - b.payoutMultiplier / 100) < 1e-6, String(finalTotal(log)));
    const bad = gateViolations(ev, C, log);
    check(`M ${tag} @cost ${C}: nothing celebratory at R <= C (banked-aware oracle)`, bad.length === 0, bad.slice(0, 3).join(' | '));
    const ma = ev.find((e) => e.type === 'missionAssigned');
    if (ma) {
      const tm = tr.find((x) => x.name === 'mission');
      check(`M ${tag}: missionAssigned sets the mission state (${ma.mission}, dial +${ma.dialStep}, cap ${ma.dialCap}) and asks the costume`, tm && tm.id === ma.mission && st.mission.dialStep === ma.dialStep && st.mission.dialCap === ma.dialCap && tr.some((x) => x.name === 'react:outfit'), JSON.stringify({ tm, m: st.mission }));
    } else {
      check(`M ${tag}: a book without missionAssigned plays the Briefing (dial +8)`, st.mission.id === 'briefing' && st.mission.dialStep === 8, JSON.stringify(st.mission));
    }
    // Sealed Orders: banked steps never touch WIN, never celebrate; caseOpen == bank x dial in one beat
    if (ma && ma.payTiming === 'spinEnd') {
      const grp = groupLog(log); const R = oracle(ev);
      let bank = 0, dial = 1, nBanked = 0, nCase = 0; const badB = [], badC = [];
      ev.forEach((e, i) => {
        const g = grp.find((x) => x.i === i) || { items: [] };
        if (e.type === 'reveal') bank = 0;
        if (e.type === 'updateGlobalMult') dial = e.globalMult;
        if (e.type === 'winInfo' && e.wins.length && e.wins.every((w) => w.meta && w.meta.banked)) {
          nBanked++; bank += e.totalWin;
          const winHooks = g.items.filter((l) => l.kind === 'win');
          const cele = g.items.filter((l) => (l.kind === 'audio' && l.winLike && l.ret === true) || (l.kind === 'dom' && (l.what === 'cell.win' || l.what === 'pop')) || (l.kind === 'fx' && l.name === 'sparks'));
          if (winHooks.length || cele.length) badB.push(`winInfo ${i}: WIN ${winHooks.map((l) => l.x)} celebration ${cele.map((l) => l.id || l.what || l.name)}`);
        }
        if (e.type === 'updateTumbleWin' && g.items.some((l) => l.kind === 'win')) badB.push(`updateTumbleWin ${i} moved WIN (the running bank)`);
        if (e.type === 'caseOpen') {
          nCase++;
          const hookX = g.items.filter((l) => l.kind === 'win').map((l) => l.x);
          const okMath = e.capped ? e.win <= e.bank * e.mult : e.win === e.bank * e.mult;
          if (!okMath || e.bank !== bank || e.mult !== dial || hookX.length !== 1 || Math.abs(hookX[0] - e.win / 100) > 1e-9) badC.push(`caseOpen ${i}: bank ${e.bank} (filed ${bank}) x ${e.mult} (dial ${dial}) = ${e.win}, WIN shown ${hookX}`);
          const lvl = R[i] > C * (1 + 1e-9);
          const winSnd = g.items.filter((l) => l.kind === 'audio' && l.id === 'win' && l.ret === true).length;
          if (!lvl && winSnd) badC.push(`caseOpen ${i}: win sound at R ${R[i]} <= C ${C}`);
        }
      });
      check(`M ${tag}: ${nBanked} banked steps never touch WIN, never celebrate, never start a win-like sound`, nBanked > 0 && badB.length === 0, badB.slice(0, 3).join(' | '));
      check(`M ${tag}: ${nCase} caseOpen == bank x dial (filed steps x last dial), shown on WIN in one beat`, nCase > 0 && badC.length === 0, badC.slice(0, 3).join(' | '));
    }
    // Ballroom Blackout: lightRoute before any outcome of the spin, lit clusters tagged x4
    if (ma && ma.lens) {
      let orderOk = true, nLit = 0;
      ev.forEach((e, i) => { if (e.type === 'reveal' && e.gameType === 'freegame') { const nx = ev[i + 1]; if (!nx || nx.type !== 'lightRoute') orderOk = false; } });
      const pops = log.filter((l) => l.kind === 'dom' && l.what === 'pop').map((l) => l.text);
      ev.forEach((e) => { if (e.type === 'winInfo') e.wins.forEach((w) => { if (w.meta && w.meta.lit) nLit++; }); });
      const x4 = pops.filter((t) => /x4\b/.test(t)).length;
      check(`M ${tag}: lightRoute comes right after each free-spin reveal (before any outcome); ${nLit} lit clusters show the x4 tag`, orderOk && x4 >= Math.min(nLit, 1) && (nLit === 0 || x4 > 0), `x4 popups ${x4}, lit ${nLit}`);
      const beam = await h.page.evaluate(() => { try { const L = window.__mamboLayers; return L && L.blackout && L.blackout.beam ? { mismatches: L.blackout.beam.mismatches } : null; } catch (e) { return null; } });
      if (beam) check(`M ${tag}: meta.lit matches the spotlight window of the WP6 layer`, beam.mismatches === 0 || (Array.isArray(beam.mismatches) && beam.mismatches.length === 0), JSON.stringify(beam));
    }
  }
  // an unknown mission id plays the Briefing look (dial and costume of the Briefing)
  {
    const b = book('blackout_below_price');
    const ev = JSON.parse(JSON.stringify(b.events)).map((e) => (e.type === 'missionAssigned' ? { ...e, mission: 'fuse' } : e));
    await play(h.page, ev, { cost: 100, skip: true });
    const tr = await trace(h.page);
    const st = await h.page.evaluate(() => ({ m: H.renderer._state.mission, meter: document.querySelector('.mm') ? document.querySelector('.mm').dataset.mission : null }));
    const tm = tr.find((x) => x.name === 'mission');
    check('M unknown mission id ("fuse") -> the Briefing look (mission state briefing, dial meter briefing)', tm && tm.id === 'briefing' && st.m.id === 'briefing' && (st.meter == null || st.meter === 'briefing'), JSON.stringify({ tm, st }));
  }
  check('M no console error or warning', h.errors.length === 0, h.errors.slice(0, 3).join(' | '));
  await h.close();
}

// ================================================================ V  v1 books identical to a pristine copy
const v1dir = V1DIR || process.env.V1DIR || '';
if (want('V') && v1dir) {
  console.log('\n== V  v1 books on this renderer vs a pristine copy (' + v1dir + ') ==');
  const V1 = `http://localhost:${await spawnOwn(path.join(v1dir, 'tools/mock-rgs/static-server.mjs'), { PORT: String(vp1) }, RE_SRV, v1dir)}`;
  const shotOf = async (base, events, C) => {
    const h = await openHarness({ base, seed: 21, still: true });
    await h.page.evaluate(() => { document.querySelectorAll('canvas').forEach((c) => { c.style.visibility = 'hidden'; }); });
    await h.page.evaluate(([ev, c]) => H.play(ev, { cost: c, skip: true }), [events, C]);
    await h.page.waitForTimeout(500);
    const png = await h.page.locator('.board').screenshot();
    await h.close();
    return png.toString('base64');
  };
  const diff = async (a, b) => {
    const ctx = await browser.newContext(); const p = await ctx.newPage(); await p.setContent('<canvas id=c></canvas>');
    const r = await p.evaluate(async ([A, B]) => {
      const load = async (s) => createImageBitmap(await (await fetch('data:image/png;base64,' + s)).blob());
      const ia = await load(A), ib = await load(B);
      if (ia.width !== ib.width || ia.height !== ib.height) return { size: [ia.width, ia.height, ib.width, ib.height] };
      const c = document.getElementById('c'); c.width = ia.width; c.height = ia.height; const g = c.getContext('2d');
      g.drawImage(ia, 0, 0); const da = g.getImageData(0, 0, c.width, c.height).data; g.clearRect(0, 0, c.width, c.height); g.drawImage(ib, 0, 0); const db = g.getImageData(0, 0, c.width, c.height).data;
      let n = 0; for (let i = 0; i < da.length; i += 4) if (Math.abs(da[i] - db[i]) + Math.abs(da[i + 1] - db[i + 1]) + Math.abs(da[i + 2] - db[i + 2]) > 48) n++;
      return { frac: n / (da.length / 4) };
    }, [a, b]);
    await ctx.close(); return r;
  };
  for (const tag of ['v1_bonus_below', 'v1_bonus_above']) {
    const b = book(tag);
    const a = await shotOf(GAME, b.events, 100), c = await shotOf(V1, b.events, 100);
    const d = await diff(a, c);
    check(`V ${tag}: settled board pixel-near identical to the pristine copy (${d.frac != null ? (d.frac * 100).toFixed(2) + '% pixels differ' : 'size ' + d.size})`, d.frac != null && d.frac < 0.02, JSON.stringify(d));
  }
}

stopAll();
await browser.close();
const fail = results.filter((r) => !r.ok);
console.log(`\n${results.length - fail.length}/${results.length} checks passed`);
process.exit(fail.length ? 1 : 0);
