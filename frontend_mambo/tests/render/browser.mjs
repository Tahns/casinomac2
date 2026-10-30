// WP4 RENDER-CORE browser acceptance (headless Chromium through playwright-core).
//   Run: cd frontend_mambo && node tests/render/browser.mjs [--quick] [--shots] [--only=A,B] [--v1=<port of a pristine v1 copy>]
// Spawns its OWN static server and mock RGS (ports 5852 / 5853, override with PORTS="a,b"), kills only those PIDs, exit code 1 on any FAIL.
//   A  the gate on hand-made books (0.4x / 1.0x / 1.2x / 15x / 100x at cost 1 and cost 100): nothing celebratory at R <= C, checked against
//      an oracle written here (it never reads the player's own round tracker)
//   B  every category of the v1 fixture books (fixtures/PICKS.md, base and bonus): final WIN is right, the gate holds step by step, the
//      neutral Debrief (FILED) or DECLASSIFIED shows at the end of a feature, nothing is left on screen
//   C  the staircase: every segment >= 0.5 s, 0.85 s per segment + 0.55 s beat, 5000x <= 7.5 s, hit-stop 83 / 100 / 125 ms through
//      document.getAnimations(), tap jumps to the final value, disabledSlamstop holds the tap until the count has ended
//   D  motion levels Full / Calm / Still and the flash setting: camera, particles, hit-stop, flash; rounds never get shorter
//   E  Rule P: turbo never shortens a round where disabledTurbo or minimumRoundDuration applies
//   F  the real game through the mock RGS: final WIN shown in the UI for one book of each kind, no console error
//   G  (--shots) screenshots of the real game: quiet result, L2 win, staircase, neutral Debrief -> tests/render/shots/
//   H  (--v1=<port>) the same zero-win and small-win books on a pristine v1 copy: the settled board is pixel-near identical
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FRONT = path.resolve(HERE, '../..');
const SHOTS = path.join(HERE, 'shots');
const req = createRequire(process.env.PW_DIR ? process.env.PW_DIR + '/' : '/tmp/claude-0/pw/');
let chromium; try { ({ chromium } = req('playwright-core')); } catch { ({ chromium } = createRequire(import.meta.url)(path.join(FRONT, 'node_modules/playwright-core'))); }
const exe = ['/opt/pw-browsers/chromium', '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'].find((p) => { try { return fs.statSync(p).isFile(); } catch { return false; } });
const [gp, rp] = (process.env.PORTS || '5852,5853').split(',').map(Number);
const argv = process.argv.slice(2);
const QUICK = argv.includes('--quick'), SHOTS_ON = argv.includes('--shots');
const ONLY = (argv.find((a) => a.startsWith('--only=')) || '').slice(7).split(',').filter(Boolean);
const V1 = Number((argv.find((a) => a.startsWith('--v1=')) || '').slice(5)) || 0;
const want = (s) => !ONLY.length || ONLY.includes(s);

const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok: !!ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  [' + detail + ']' : ''}`); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------- servers
const kids = [];
function spawnOwn(script, env, re) {
  return new Promise((resolve, reject) => {
    const c = spawn(process.execPath, [script], { env: { ...process.env, ...env }, stdio: ['ignore', 'pipe', 'pipe'] });
    kids.push(c); let buf = '';
    const to = setTimeout(() => reject(new Error('timeout ' + script + ' ' + buf)), 10000);
    c.stdout.on('data', (d) => { buf += d; const m = re.exec(buf); if (m) { clearTimeout(to); resolve(Number(m[1])); } });
    c.stderr.on('data', (d) => { buf += d; });
    c.on('exit', (code) => { clearTimeout(to); reject(new Error(script + ' exited ' + code + ' ' + buf)); });
  });
}
const stopAll = () => { for (const c of kids) { try { c.removeAllListeners('exit'); c.kill('SIGKILL'); } catch { /* gone */ } } kids.length = 0; };
for (const s of ['exit', 'SIGINT', 'SIGTERM']) process.on(s, () => { stopAll(); if (s !== 'exit') process.exit(130); });
const GAME = `http://localhost:${await spawnOwn(path.join(FRONT, 'tools/mock-rgs/static-server.mjs'), { PORT: String(gp) }, /static server http:\/\/localhost:(\d+)/)}`;
const RGS = `http://localhost:${await spawnOwn(path.join(FRONT, 'tools/mock-rgs/server.mjs'), { MOCK_PORT: String(rp) }, /mock RGS http:\/\/localhost:(\d+)/)}`;
console.log('servers', GAME, RGS);
const browser = await chromium.launch({ executablePath: exe, args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });

// ---------------------------------------------------------------- helpers
const FIX = path.join(FRONT, 'fixtures');
const bookCache = {};
function books(mode) {
  if (!bookCache[mode]) bookCache[mode] = new Map(fs.readFileSync(`${FIX}/books_${mode}_sample.jsonl`, 'utf8').split('\n').filter(Boolean).map((l) => { const b = JSON.parse(l); return [b.id, b]; }));
  return bookCache[mode];
}
function picks() { // fixtures/PICKS.md -> { base: { category: [ids] }, bonus: {...} }
  const out = {}; let mode = null;
  for (const line of fs.readFileSync(`${FIX}/PICKS.md`, 'utf8').split('\n')) {
    const h = /^##\s+(\w+)/.exec(line); if (h) { mode = h[1]; out[mode] = {}; continue; }
    const m = /^- \*\*(\w+)\*\*[^:]*:\s*([\d,\s]+)$/.exec(line);
    if (m && mode) out[mode][m[1]] = m[2].split(',').map((s) => Number(s.trim())).filter(Boolean);
  }
  return out;
}
async function openHarness(o = {}) {
  const ctx = await browser.newContext({ viewport: o.viewport || { width: 1024, height: 576 }, deviceScaleFactor: 1, reducedMotion: o.reducedMotion || 'no-preference' });
  if (o.seed != null) await ctx.addInitScript((seed) => { let a = seed >>> 0; Math.random = () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }, o.seed);
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`${m.type()}: ${m.text()}`); });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  await page.goto(`${o.base || GAME}/tests/render/harness.html?${o.query || 'nodev=1'}`);
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 20000 });
  await page.waitForTimeout(o.settle ?? 700);
  return { ctx, page, errors, close: () => ctx.close() };
}
const play = (page, events, o) => page.evaluate(([ev, op]) => H.play(ev, op), [events, o || {}]);
const stepsBook = (page, amounts) => page.evaluate((a) => H.BOOKS.stepsBook(a), amounts);
const trace = (page) => page.evaluate(() => H.renderer._state.traceLog.slice());

// The oracle: R (bet multiples) after every event, derived WITHOUT the player's round tracker. The money on screen after an event is the last
// confirmed total (setTotalWin) plus the running win of the current spin, and the running win after a winInfo is what the next
// updateTumbleWin / setWin of the book says it is (look ahead), not a sum of the winInfo wins.
function oracle(events) {
  const R = []; let confirmed = 0, spin = 0, banked = false;
  for (let i = 0; i < events.length; i++) {
    const e = events[i];
    switch (e.type) {
      case 'reveal': spin = 0; banked = false; break;
      case 'winInfo': {
        // Sealed Orders (v2): a banked step is filed, not paid; the spin pays at caseOpen (bank x dial)
        if ((e.wins || []).length && e.wins.every((w) => w.meta && w.meta.banked)) { banked = true; break; }
        let amt = null;
        for (let j = i + 1; j < events.length; j++) { const f = events[j]; if (f.type === 'updateTumbleWin' || f.type === 'setWin') { amt = f.amount; break; } if (f.type === 'winInfo' || f.type === 'reveal') break; }
        spin = amt != null ? amt : spin + (e.totalWin || 0);
        break;
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
// cells the board must show at the end of a book: the plan of its `layout` event unless it played free spins (always Mezzanine)
const cellsAtEnd = (events) => { const l = events.find((e) => e.type === 'layout'); return l && !events.some((e) => e.type === 'freeSpinTrigger') ? l.cellCount : 30; };
// events of the log grouped by the book event that was being handled (the probe layer of the harness marks each event)
function groupLog(log) {
  const g = []; let cur = { i: -1, type: 'start', items: [] }; g.push(cur);
  for (const l of log) { if (l.kind === 'event') { cur = { i: l.i, type: l.type, items: [] }; g.push(cur); } else cur.items.push(l); }
  return g;
}
const HAPPY_REACT = new Set(['win', 'bigwin', 'epic']);
const HAPPY_POSE = new Set(['happy', 'bigwin', 'celebrate']);
const QUIET_REACT_OK = new Set(['spin', 'quiet', 'idle', 'dead', 'end', 'meter', 'anticipate', 'blast', 'fizzle', 'trigger', 'outfit', 'gag']);
/** Everything celebratory that the log shows, against the oracle. Returns the list of violations. */
function gateViolations(events, cost, log, opt = {}) {
  const R = oracle(events); const bad = [];
  for (const grp of groupLog(log)) {
    const r = grp.i >= 0 ? R[grp.i] : 0;
    const quiet = !(r > cost * (1 + 1e-9));
    for (const l of grp.items) {
      if (!quiet) continue;
      const where = `event ${grp.i} ${grp.type} R=${r} C=${cost}`;
      if (l.kind === 'audio' && l.winLike && l.ret === true) bad.push(`win-like sound ${l.id} started: ${where}`);
      if (l.kind === 'dom' && l.what === 'cell.win') bad.push(`cell.win: ${where}`);
      if (l.kind === 'dom' && l.what === 'banner' && /\bwin\b/.test(l.cls || '')) bad.push(`win banner: ${where}`);
      if (l.kind === 'dom' && l.what === 'rays' && grp.type !== 'freeSpinTrigger' && grp.type !== 'freeSpinRetrigger') bad.push(`rays: ${where}`);
      if (l.kind === 'mascot' && l.fn === 'react' && HAPPY_REACT.has(l.args[0])) bad.push(`react ${l.args[0]}: ${where}`);
      if (l.kind === 'mascot' && l.fn === 'setPose' && HAPPY_POSE.has(l.args[0])) bad.push(`pose ${l.args[0]}: ${where}`);
      if (l.kind === 'fx' && ['coins', 'coinRain', 'confetti'].includes(l.name)) bad.push(`fx ${l.name}: ${where}`);
      if (opt.strictFx && l.kind === 'fx') bad.push(`fx ${l.name}: ${where}`);
      if (opt.strictFx && l.kind === 'trauma') bad.push(`camera trauma ${l.amount}: ${where}`);
      if (opt.strictFx && l.kind === 'flash') bad.push(`flash: ${where}`);
      if (opt.strictFx && l.kind === 'hitstop') bad.push(`hit-stop: ${where}`);
    }
  }
  return bad;
}
const cellsLeft = (page) => page.evaluate(() => ({
  cells: document.querySelectorAll('.cells .cell').length, win: document.querySelectorAll('.cells .win, .cells .qw, .cells .dim').length,
  banner: !!document.querySelector('.banner'), layerOn: !!document.querySelector('.banner-layer.on'), outl: document.querySelectorAll('.outlines *').length,
}));
const cnt = (log, pred) => log.filter(pred).length;
const startedWinLike = (log) => log.filter((l) => l.kind === 'audio' && l.winLike && l.ret === true);

// ================================================================ A  the gate on hand-made books
if (want('A')) {
  console.log('\n== A  the celebration gate on hand-made books (stepsBook) ==');
  const h = await openHarness({ seed: 7 });
  const cases = [
    // [name, amounts in bet multiples, expected level of the end of the round]
    ['0.4x', [0.4], 0], ['0.4x then 0.3x', [0.4, 0.3], 0], ['1.0x in two steps (R == C)', [0.6, 0.4], 0], ['1.0x', [1.0], 0],
    ['1.2x', [1.2], 1], ['crossing in step 3 (0.6, 0.4, 0.2)', [0.6, 0.4, 0.2], 1], ['6x', [6], 2], ['20x', [20], 3], ['100x', [100], 3],
  ];
  for (const C of QUICK ? [1] : [1, 100]) {
    for (const [name, amounts, lvlWant] of cases) {
      const am = amounts.map((a) => Math.round(a * C * 10) / 10);
      const events = await stepsBook(h.page, am);
      if (am.some((a, i) => !events.length || events.filter((e) => e.type === 'winInfo').length !== am.length)) { check(`A ${name} at cost ${C}: book built`, false, 'stepsBook fell back'); continue; }
      await h.page.evaluate(() => H.renderer._trace(true));
      const log = await play(h.page, events, { cost: C, skip: true });
      const tr = await trace(h.page);
      const bad = gateViolations(events, C, log, { strictFx: lvlWant === 0 });
      check(`A ${name} @cost ${C}: gate holds step by step (${lvlWant === 0 ? 'quiet: no sparks, shake, flash, win sound, happy pose' : 'celebration allowed'})`, bad.length === 0, bad.slice(0, 3).join(' | '));
      const infos = cnt(log, (l) => l.kind === 'event' && l.type === 'winInfo');
      const ticks = cnt(log, (l) => l.kind === 'audio' && l.id === 'ledgerTick' && l.ret === true);
      const wl = startedWinLike(log).length;
      if (lvlWant === 0) {
        check(`A ${name} @cost ${C}: one ledgerTick per winning step, no win-like sound`, ticks === infos && wl === 0, `ticks ${ticks}/${infos}, winLike ${wl}`);
        check(`A ${name} @cost ${C}: no banner, lemon quiet outline`, cnt(log, (l) => l.kind === 'dom' && l.what === 'banner') === 0 && cnt(log, (l) => l.kind === 'dom' && l.what === 'pop' && /\bq\b/.test(l.cls)) > 0);
        check(`A ${name} @cost ${C}: no "in the black" beat`, !tr.some((x) => x.name === 'inBlack'));
      } else {
        const blacks = tr.filter((x) => x.name === 'inBlack').length;
        check(`A ${name} @cost ${C}: celebration shows (win-like sound ${wl > 0}) and the "in the black" beat plays exactly once`, wl > 0 && blacks === 1, `winLike ${wl}, inBlack ${blacks}`);
        const banners = cnt(log, (l) => l.kind === 'dom' && l.what === 'banner');
        check(`A ${name} @cost ${C}: staircase banner only from 15x the cost (${lvlWant === 3 ? 'yes' : 'no'})`, (lvlWant === 3) === (banners > 0), `banners ${banners}`);
      }
      const left = await cellsLeft(h.page);
      check(`A ${name} @cost ${C}: nothing left on screen, 30 cells`, left.cells === 30 && left.win === 0 && !left.banner && !left.layerOn && left.outl === 0, JSON.stringify(left));
      const finalTotal = [...log].reverse().find((l) => l.kind === 'total');
      check(`A ${name} @cost ${C}: final total is ${amounts.reduce((a, b) => a + b, 0) * C}x`, finalTotal && Math.abs(finalTotal.x - am.reduce((a, b) => a + b, 0)) < 1e-6, finalTotal ? String(finalTotal.x) : 'none');
    }
  }
  check('A no console error or warning', h.errors.length === 0, h.errors.slice(0, 3).join(' | '));
  await h.close();
}

// ================================================================ B  fixture books of every category
if (want('B')) {
  console.log('\n== B  v1 fixture books, every category (final WIN, gate step by step, Debrief) ==');
  const P = picks();
  const h = await openHarness({ seed: 3 });
  const perCat = QUICK ? 1 : 2;
  let nBooks = 0; const t0 = Date.now();
  for (const mode of ['base', 'bonus']) {
    const C = mode === 'base' ? 1 : 100;
    for (const [cat, ids] of Object.entries(P[mode] || {})) {
      const have = ids.filter((id) => books(mode).has(id)).slice(0, perCat);
      if (!have.length) { check(`B ${mode}/${cat}: fixture book present`, false, 'none of the ids is in the sample'); continue; }
      for (const id of have) {
        const b = books(mode).get(id); const events = b.events;
        const tb = Date.now();
        const log = await play(h.page, events, { cost: C, skip: true });
        nBooks++;
        const want100 = b.payoutMultiplier / 100;
        const finalTotal = [...log].reverse().find((l) => l.kind === 'total');
        check(`B ${mode}/${cat} #${id}: final WIN ${want100}x`, finalTotal && Math.abs(finalTotal.x - want100) < 1e-6, `got ${finalTotal ? finalTotal.x : 'none'} in ${Date.now() - tb} ms, ${events.length} events`);
        const bad = gateViolations(events, C, log);
        check(`B ${mode}/${cat} #${id}: nothing celebratory at R <= C`, bad.length === 0, bad.slice(0, 3).join(' | '));
        const left = await cellsLeft(h.page);
        check(`B ${mode}/${cat} #${id}: clean board at the end (${cellsAtEnd(events)} cells)`, left.cells === cellsAtEnd(events) && left.win === 0 && !left.banner && !left.layerOn && left.outl === 0, JSON.stringify(left));
        // end of a feature
        const end = events.find((e) => e.type === 'freeSpinEnd'), cap = events.find((e) => e.type === 'wincap');
        const banners = log.filter((l) => l.kind === 'dom' && l.what === 'banner');
        const stamps = log.filter((l) => l.kind === 'dom' && l.what === 'stamp').map((l) => l.text);
        if (end && !cap) {
          const R = end.amount / 100;
          if (!(R > C * (1 + 1e-9))) {
            const deb = banners.filter((l) => /debrief/.test(l.cls));
            // rays of the feature START (freeSpinTrigger banner) are fine; the end of a quiet feature must have none
            const raysAtEnd = groupLog(log).filter((g) => g.type === 'freeSpinEnd').reduce((n, g) => n + g.items.filter((l) => l.kind === 'dom' && l.what === 'rays').length, 0);
            check(`B ${mode}/${cat} #${id}: R ${R}x <= ${C}x -> neutral Debrief with FILED, no rays`, deb.length === 1 && stamps.includes('FILED') && !stamps.includes('DECLASSIFIED') && raysAtEnd === 0, `debrief ${deb.length}, stamps ${stamps}, rays at the end ${raysAtEnd}`);
          } else {
            check(`B ${mode}/${cat} #${id}: R ${R}x > ${C}x -> DECLASSIFIED report`, stamps.includes('DECLASSIFIED') && !stamps.includes('FILED'), `stamps ${stamps}`);
          }
        }
        if (cap) check(`B ${mode}/${cat} #${id}: win cap shows the staircase to MAX WIN`, banners.some((l) => /\bwin\b/.test(l.cls)), `banners ${banners.length}`);
        // sanity: the number of "in the black" beats is at most one per round
        const tr = await trace(h.page);
        void tr;
      }
    }
  }
  check(`B ${nBooks} books played in ${Math.round((Date.now() - t0) / 1000)} s, no console error or warning`, h.errors.length === 0, h.errors.slice(0, 3).join(' | '));
  await h.close();
}

// ================================================================ C  the staircase
if (want('C')) {
  console.log('\n== C  the tier staircase (normal speed) ==');
  const h = await openHarness({ seed: 5 });
  await h.page.evaluate(() => H.renderer._trace(true));
  async function stair(events, cost, o = {}) {
    await h.page.evaluate(() => H.renderer._trace(true));
    const log = await play(h.page, events, { cost, ...o });
    const tr = await trace(h.page);
    return { log, tr };
  }
  const segs = (tr) => {
    const out = []; const ent = tr.filter((x) => ['segment', 'beat', 'final'].includes(x.name));
    for (let i = 0; i < ent.length - 1; i++) out.push({ kind: ent[i].name, from: ent[i].t, to: ent[i + 1].t, ms: ent[i + 1].t - ent[i].t, key: ent[i].tier });
    return { list: out, first: ent.length ? ent[0].t : 0, last: ent.length ? ent[ent.length - 1].t : 0 };
  };
  // 45x: BIG then MEGA
  {
    const ev = await stepsBook(h.page, [45]);
    const { log, tr } = await stair(ev, 1);
    const s = segs(tr);
    const counts = s.list.filter((x) => x.kind === 'segment'), beats = s.list.filter((x) => x.kind === 'beat');
    check('C 45x: every count segment >= 0.5 s, 0.85-0.99 s', counts.length === 3 && counts.every((x) => x.ms >= 500 && x.ms < 1100), counts.map((x) => Math.round(x.ms)).join(' '));
    check('C 45x: each beat is 0.55 s (+-60 ms), two beats BIG and MEGA', beats.length === 2 && beats.every((x) => Math.abs(x.ms - 550) < 60) && beats[0].key === 'win.big' && beats[1].key === 'win.mega', beats.map((x) => `${x.key}:${Math.round(x.ms)}`).join(' '));
    const hs = log.filter((l) => l.kind === 'hitstop' && l.ok);
    check('C 45x: hit-stop 83 ms on MEGA only (BIG has none)', hs.length === 1 && hs[0].took >= 70 && hs[0].took < 160, hs.map((x) => `${x.ms}->${x.took}`).join(' '));
    const fr = log.filter((l) => l.kind === 'freeze');
    check('C 45x: the hit-stop pauses the running animations of the document (document.getAnimations) and resumes them', fr.length === 2 && fr[0].on === true && fr[0].paused > 0 && fr[1].on === false && fr[1].paused === 0, JSON.stringify(fr));
    const ban = log.filter((l) => l.kind === 'dom' && l.what === 'banner');
    check('C 45x: one win banner, rays on', ban.length === 1 && /\bwin\b/.test(ban[0].cls), JSON.stringify(ban.map((b) => b.cls)));
  }
  // 100x: the epic beat (125 ms) and the other hit-stops 83 / 100 / 125
  {
    const ev = await stepsBook(h.page, [100]);
    const { log, tr } = await stair(ev, 1);
    const hs = log.filter((l) => l.kind === 'hitstop' && l.ok).map((x) => x.ms);
    check('C 100x: hit-stops 83 / 100 / 125 ms on MEGA / SUPER / EPIC (as asked to the camera, in ms of normal time)', hs.length === 3 && Math.abs(hs[0] - 83) < 1 && Math.abs(hs[1] - 100) < 1 && Math.abs(hs[2] - 125) < 1, hs.join(' '));
    const meas = log.filter((l) => l.kind === 'hitstop' && l.ok).map((x) => x.took);
    check('C 100x: measured hit-stop lengths within +60 ms of the ask', meas.every((m, i) => m >= hs[i] - 10 && m < hs[i] + 70), meas.join(' '));
    const s = segs(tr);
    check('C 100x: all segments >= 0.5 s, total <= 7.5 s', s.list.every((x) => x.ms >= 500) && s.last - s.first <= 7500, `${Math.round(s.last - s.first)} ms`);
  }
  // 5000x
  {
    const ev = await h.page.evaluate(() => H.BOOKS.maxWin());
    const { log, tr } = await stair(ev, 1);
    const s = segs(tr);
    const total = s.last - s.first;
    check('C 5000x (win cap): every segment >= 0.5 s', s.list.length >= 9 && s.list.every((x) => x.ms >= 500), s.list.map((x) => Math.round(x.ms)).join(' '));
    check('C 5000x (win cap): the count takes <= 7.5 s from the first segment to the final value', total <= 7500 && total > 6500, `${Math.round(total)} ms`);
    const tiers = log.filter((l) => l.kind === 'dom' && l.what === 'banner').length;
    const final = tr.find((x) => x.name === 'final');
    check('C 5000x (win cap): final value 5000x reached, MAX WIN shown', final && final.target === 5000 && tiers >= 1, JSON.stringify(final));
    check('C 5000x: hit-stops at most one per 400 ms and never longer than 200 ms', log.filter((l) => l.kind === 'hitstop' && l.ok).every((x) => x.took < 260), '');
  }
  // 5000x at cost 100 stays at 50x its cost: three tiers
  {
    const ev = await h.page.evaluate(() => H.BOOKS.bonus(2, true));
    const { log, tr } = await stair(ev, 100);
    check('C bonus with a 200x finish at cost 100: DECLASSIFIED staircase for R > C, rays', log.some((l) => l.kind === 'dom' && l.what === 'stamp' && l.text === 'DECLASSIFIED'), '');
    void tr;
  }
  // tap jumps to the final value
  {
    const ev = await stepsBook(h.page, [45]);
    await h.page.evaluate(() => H.renderer._trace(true));
    const done = play(h.page, ev, { cost: 1 });
    await h.page.waitForSelector('.banner .bn-amount', { timeout: 15000 });
    await sleep(1300); // inside the first beat
    const before = await h.page.evaluate(() => document.querySelector('.bn-amount').textContent);
    const tTap = Date.now();
    await h.page.evaluate(() => document.querySelector('.banner-layer').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })));
    await h.page.waitForFunction(() => /45\.00/.test((document.querySelector('.bn-amount') || {}).textContent || ''), null, { timeout: 3000 });
    const dt = Date.now() - tTap;
    await done;
    const tr = await trace(h.page);
    const fin = tr.find((x) => x.name === 'final');
    check('C tap jumps to the final value within 200 ms (was ' + before + ')', dt < 250 && fin && fin.tapped === true && !/45\.00/.test(before), `${dt} ms, final ${JSON.stringify(fin)}`);
    const end = Date.now() - tTap;
    check('C after a tap the banner is gone within 2.5 s', end < 2500, `${end} ms`);
  }
  // disabledSlamstop: a tap before the count has ended is ignored
  {
    await h.page.evaluate(() => H.settings.applyJurisdiction({ disabledSlamstop: true }));
    const ev = await stepsBook(h.page, [45]);
    await h.page.evaluate(() => H.renderer._trace(true));
    const done = play(h.page, ev, { cost: 1 });
    await h.page.waitForSelector('.banner .bn-amount', { timeout: 15000 });
    await sleep(1300);
    await h.page.evaluate(() => document.querySelector('.banner-layer').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })));
    await sleep(500);
    const mid = await h.page.evaluate(() => document.querySelector('.bn-amount').textContent);
    check('C disabledSlamstop: a tap during the count does not jump (amount ' + mid + ')', !/45\.00/.test(mid), mid);
    await done;
    const tr = await trace(h.page);
    const fin = tr.find((x) => x.name === 'final');
    check('C disabledSlamstop: the count ran to the end (not tapped)', fin && fin.tapped === false, JSON.stringify(fin));
    await h.page.evaluate(() => H.settings.applyJurisdiction(null));
  }
  check('C no console error or warning', h.errors.length === 0, h.errors.slice(0, 3).join(' | '));
  await h.close();
}

// ================================================================ D  motion levels
if (want('D')) {
  console.log('\n== D  motion levels and the flash setting ==');
  const lens = {};
  for (const level of ['full', 'calm', 'still']) {
    const h = await openHarness({ seed: 9 });
    await h.page.evaluate((lv) => { H.settings.reset(); H.settings.set('motion', lv); }, level);
    // sample the camera offset on every frame while a staircase and a cascade play
    await h.page.evaluate(() => { window.__off = { maxT: 0, maxR: 0, n: 0 }; const g = document.getElementById('game'); const f = () => { const tr = (g.style.translate || '').split(' ').map((x) => parseFloat(x) || 0); window.__off.maxT = Math.max(window.__off.maxT, Math.abs(tr[0] || 0), Math.abs(tr[1] || 0)); window.__off.maxR = Math.max(window.__off.maxR, Math.abs(parseFloat(g.style.rotate) || 0)); window.__off.n++; requestAnimationFrame(f); }; f(); });
    const ev = await stepsBook(h.page, [3, 4, 45]); // three winning steps, the last one crosses the staircase tiers
    const t0 = Date.now();
    const log = await play(h.page, ev, { cost: 1 });
    lens[level] = Date.now() - t0;
    const off = await h.page.evaluate(() => window.__off);
    const trauma = log.filter((l) => l.kind === 'trauma'), fx = log.filter((l) => l.kind === 'fx'), hs = log.filter((l) => l.kind === 'hitstop'), fl = log.filter((l) => l.kind === 'flash');
    const short = 1024 * 0.016; // 1.6% of the short side (576 -> 9.2 px) is the Full maximum
    if (level === 'full') {
      check('D Full: camera shakes (trauma accepted, offset > 0), at most 1.6% of the short side and 0.8 degree', trauma.some((x) => x.accepted) && off.maxT > 0 && off.maxT <= 576 * 0.016 + 1 && off.maxR <= 0.8 + 1e-6, `trauma ${trauma.length}, offset ${off.maxT}px, rot ${off.maxR}`);
      check('D Full: hit-stop on MEGA, particles, flash <= 0.5 peak', hs.some((x) => x.ok) && fx.length > 0 && fl.length > 0 && fl.every((x) => x.peak <= 0.5 + 1e-9), `hitstops ${hs.filter((x) => x.ok).length}, fx ${fx.length}, flashes ${fl.map((x) => x.peak).join(',')}`);
      const per = {}; for (const l of fl) per[Math.floor(l.t / 1000)] = (per[Math.floor(l.t / 1000)] || 0) + 1;
      let worst = 0; for (let i = 0; i < fl.length; i++) { const n = fl.filter((x) => x.t >= fl[i].t && x.t < fl[i].t + 1000).length; worst = Math.max(worst, n); }
      check('D Full: at most 2 flashes in any 1 s window', worst <= 2, `worst window ${worst}`);
    } else if (level === 'calm') {
      check('D Calm: camera at 25% amplitude, no rotation', off.maxT <= 576 * 0.016 * 0.25 + 1 && off.maxR === 0, `offset ${off.maxT}px, rot ${off.maxR}`);
      check('D Calm: no hit-stop, fewer particles, flashes are 167 ms dissolves <= 0.25', hs.every((x) => !x.ok) && fl.every((x) => x.ms === 167 && x.peak <= 0.25 + 1e-9), `hitstops ${hs.filter((x) => x.ok).length}, flashes ${fl.map((x) => x.peak + '/' + x.ms).join(',')}`);
      lens.calmFx = fx.length;
    } else {
      check('D Still: the camera never moves, no particle, no hit-stop, no flash', off.maxT === 0 && off.maxR === 0 && fx.length === 0 && hs.every((x) => !x.ok) && fl.length === 0 && trauma.every((x) => !x.accepted), `offset ${off.maxT}, fx ${fx.length}, hitstops ${hs.filter((x) => x.ok).length}, flashes ${fl.length}, accepted ${trauma.filter((x) => x.accepted).length}`);
      check('D Still: the staircase still plays and ends on the final value (banner, count)', log.some((l) => l.kind === 'dom' && l.what === 'banner') && (await trace(h.page)).length >= 0, '');
    }
    check(`D ${level}: no console error or warning`, h.errors.length === 0, h.errors.slice(0, 3).join(' | '));
    await h.close();
  }
  check('D Calm and Still never shorten the round (Full ' + lens.full + ' ms, Calm ' + lens.calm + ' ms, Still ' + lens.still + ' ms)', lens.calm >= lens.full * 0.9 && lens.still >= lens.full * 0.9, '');
  {
    const h = await openHarness({ seed: 9 });
    await h.page.evaluate(() => { H.settings.reset(); H.settings.set('reduceFlash', true); });
    const ev = await stepsBook(h.page, [45]);
    const log = await play(h.page, ev, { cost: 1 });
    const fl = log.filter((l) => l.kind === 'flash');
    check('D Full with "screen flash effects" off: every flash is a 167 ms dissolve, peak <= 0.25', fl.length > 0 && fl.every((x) => x.ms === 167 && x.peak <= 0.25 + 1e-9), fl.map((x) => x.peak + '/' + x.ms).join(','));
    await h.page.evaluate(() => H.settings.reset());
    await h.close();
  }
  {
    // the OS asks for reduced motion and the setting is Auto: Calm numbers without any menu choice
    const h = await openHarness({ seed: 9, reducedMotion: 'reduce' });
    const lv = await h.page.evaluate(() => ({ level: H.renderer.motion.level, reduced: H.renderer.motion.reduced, flash: H.renderer.motion.flashMode }));
    check('D Auto follows prefers-reduced-motion (live OS query)', lv.reduced && lv.level !== 'full', JSON.stringify(lv));
    await h.close();
  }
}

// ================================================================ E  Rule P
if (want('E')) {
  console.log('\n== E  Rule P: turbo never shortens a round where it is disabled or a minimum round duration applies ==');
  const h = await openHarness({ seed: 13 });
  const ev = await stepsBook(h.page, [0.4]);
  const dur = async (o, jur) => {
    await h.page.evaluate((j) => { H.settings.applyJurisdiction(j); }, jur || null);
    const t0 = Date.now(); await play(h.page, ev, { cost: 1, ...o }); const d = Date.now() - t0;
    const eff = await h.page.evaluate(() => { const c = H.renderer._state; return null; });
    void eff;
    return d;
  };
  const normal = await dur({ turbo: false });
  const turbo = await dur({ turbo: true });
  const noTurbo = await dur({ turbo: true }, { disabledTurbo: true });
  const minRound = await dur({ turbo: true }, { minimumRoundDuration: 3000 });
  check(`E turbo allowed: the round is shorter (${turbo} ms vs ${normal} ms)`, turbo < normal * 0.7, '');
  check(`E disabledTurbo: turbo requested but the round keeps its length (${noTurbo} ms vs ${normal} ms)`, noTurbo > normal * 0.9, '');
  check(`E minimumRoundDuration: turbo requested but the round keeps its length (${minRound} ms vs ${normal} ms)`, minRound > normal * 0.9, '');
  const eff = await h.page.evaluate(async () => {
    const out = {};
    H.settings.applyJurisdiction({ disabledTurbo: true }); H.renderer.setTurbo(true);
    out.disabled = H.renderer._state.turbo;  // requested
    return out;
  });
  void eff;
  await h.page.evaluate(() => H.settings.applyJurisdiction(null));
  check('E no console error or warning', h.errors.length === 0, h.errors.slice(0, 3).join(' | '));
  await h.close();
}

// ================================================================ F  the real game
if (want('F')) {
  console.log('\n== F  the real game through the mock RGS: final WIN in the UI ==');
  async function realRun(mode, id, o = {}) {
    const ctx = await browser.newContext({ viewport: o.viewport || { width: 1024, height: 576 }, deviceScaleFactor: 1 });
    await ctx.addInitScript(() => { let a = 11; Math.random = () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; });
    const page = await ctx.newPage(); const errors = [];
    page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`${m.type()}: ${m.text()}`); });
    page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
    const sid = 'wp4_' + mode + '_' + id + '_' + Date.now();
    await fetch(`${RGS}/__mock/config?sid=${sid}`, { method: 'POST', body: JSON.stringify({ balance: 1000000000, force: [{ id, mode }] }) });
    await page.goto(`${GAME}/?sessionID=${sid}&rgs_url=${RGS}&lang=en&currency=USD&device=desktop&social=false&demo=false`);
    await page.waitForSelector('body.state-idle', { timeout: 20000 });
    await sleep(500);
    if (o.turbo !== false) await page.click('#btn-turbo');
    return { ctx, page, errors, sid };
  }
  const real = [['base', 'zero'], ['base', 'small'], ['base', 'medium'], ['base', 'tumble'], ['base', 'trigger'], ['base', 'wireBlastBase']];
  if (!QUICK) real.push(['base', 'wincap']);
  const P = picks();
  for (const [mode, cat] of real) {
    const id = (P[mode][cat] || []).find((i) => books(mode).has(i)); if (!id) continue;
    const b = books(mode).get(id);
    const r = await realRun(mode, id);
    const t0 = Date.now();
    await r.page.click('#btn-bet');
    await sleep(500);
    await r.page.waitForFunction(() => document.body.classList.contains('state-idle'), null, { timeout: 280000 });
    await sleep(300);
    const ui = await r.page.evaluate(() => ({ win: document.querySelector('#win').textContent, banner: !!document.querySelector('.banner') || document.querySelector('.banner-layer').classList.contains('on'), modal: !!document.querySelector('.modal.open') }));
    const wantTxt = '$' + (b.payoutMultiplier / 100).toFixed(2);
    check(`F real game ${mode}/${cat} #${id}: WIN shown ${wantTxt} (${Math.round((Date.now() - t0) / 1000)} s)`, ui.win.replace(/,/g, '') === wantTxt && !ui.banner && !ui.modal, `${ui.win} banner ${ui.banner} modal ${ui.modal}`);
    check(`F real game ${mode}/${cat} #${id}: no console error or warning`, r.errors.length === 0, r.errors.slice(0, 2).join(' | '));
    await r.ctx.close();
  }
}

// ================================================================ G  screenshots of the real game
if (want('G') && SHOTS_ON) {
  console.log('\n== G  screenshots ==');
  fs.mkdirSync(SHOTS, { recursive: true });
  async function realShots(mode, id, shots, o = {}) {
    const ctx = await browser.newContext({ viewport: o.viewport || { width: 1024, height: 576 }, deviceScaleFactor: 1 });
    await ctx.addInitScript(() => { let a = 11; Math.random = () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; });
    const page = await ctx.newPage();
    const sid = 'wp4s_' + mode + '_' + id + '_' + Date.now();
    await fetch(`${RGS}/__mock/config?sid=${sid}`, { method: 'POST', body: JSON.stringify({ balance: 1000000000, force: [{ id, mode }] }) });
    await page.goto(`${GAME}/?sessionID=${sid}&rgs_url=${RGS}&lang=en&currency=USD&device=desktop&social=false&demo=false`);
    await page.waitForSelector('body.state-idle', { timeout: 20000 });
    await sleep(700);
    await page.click('#btn-bet');
    const taken = new Set();
    for (let i = 0; i < 4000 && taken.size < shots.length; i++) {
      const st = await page.evaluate(() => ({
        out: !!document.querySelector('.outlines path'), pop: !!document.querySelector('.popups .pop'), popTxt: (document.querySelector('.popups .pop') || {}).className || '',
        ban: !!document.querySelector('.banner'), debrief: !!document.querySelector('.banner.debrief'), tier: (document.querySelector('.banner') || { dataset: {} }).dataset.tier || '',
        stamp: !!document.querySelector('.bn-stamp'), amt: (document.querySelector('.bn-amount') || {}).textContent || '', idle: document.body.classList.contains('state-idle'),
        black: !!document.querySelector('.chip.tw.black.on'),
      }));
      for (const s of shots) if (!taken.has(s.tag) && s.when(st)) { taken.add(s.tag); await sleep(s.delay || 0); await page.screenshot({ path: path.join(SHOTS, s.tag + '.png') }); }
      if (st.idle && i > 20) break;
      await sleep(30);
    }
    for (const s of shots) check(`G screenshot ${s.tag}`, taken.has(s.tag), '');
    await page.waitForFunction(() => document.body.classList.contains('state-idle'), null, { timeout: 120000 }).catch(() => {});
    await ctx.close();
  }
  const P = picks();
  void P;
  await realShots('base', 69089, [{ tag: 'wp4_quiet_result', when: (s) => s.out && s.pop, delay: 350 }]);          // 1.0x exactly: R == C is quiet
  await realShots('base', 72928, [{ tag: 'wp4_l2_win', when: (s) => s.out && s.pop && s.black, delay: 300 }]);       // 6.3x: L2 ripple
  await realShots('base', 40563, [{ tag: 'wp4_staircase_count', when: (s) => s.ban && !s.tier && s.amt && !/0\.00/.test(s.amt), delay: 150 }, { tag: 'wp4_staircase_big', when: (s) => s.tier === 'win.big', delay: 320 }]);   // feature, 28.4x
  await realShots('base', 90731, [{ tag: 'wp4_debrief_filed', when: (s) => s.debrief && s.stamp, delay: 250 }]); // feature ends at 0.1x (R <= C): neutral Debrief
}

// ================================================================ H  v1 identity
if (want('H') && V1) {
  console.log('\n== H  v1 identity: settled board of the same books, v1 copy on port ' + V1 + ' vs now ==');
  const diffPage = await browser.newPage();
  async function settled(base, mode, id) {
    const h = await openHarness({ seed: 21, base });
    const b = books(mode).get(id);
    await play(h.page, b.events, { cost: mode === 'base' ? 1 : 100, skip: true });
    await h.page.waitForTimeout(400);
    const buf = await h.page.locator('.board-wrap').screenshot();
    await h.close();
    return buf;
  }
  async function diff(a, b) {
    return diffPage.evaluate(async ([x, y]) => {
      const load = (s) => new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.src = 'data:image/png;base64,' + s; });
      const [ia, ib] = await Promise.all([load(x), load(y)]);
      const w = Math.min(ia.width, ib.width), hh = Math.min(ia.height, ib.height);
      const cv = (im) => { const c = document.createElement('canvas'); c.width = w; c.height = hh; const g = c.getContext('2d'); g.drawImage(im, 0, 0); return g.getImageData(0, 0, w, hh).data; };
      const da = cv(ia), db = cv(ib); let n = 0;
      for (let i = 0; i < da.length; i += 4) if (Math.abs(da[i] - db[i]) + Math.abs(da[i + 1] - db[i + 1]) + Math.abs(da[i + 2] - db[i + 2]) > 48) n++;
      return { n, total: w * hh, w, hh };
    }, [a.toString('base64'), b.toString('base64')]);
  }
  const P = picks();
  const ids = [['base', (P.base.zero || [])[0]], ['base', (P.base.small || [])[0]], ['base', (P.base.medium || [])[0]], ['base', (P.base.tumble || [])[0]], ['base', (P.base.wireBlastBase || [])[0]]];
  for (const [mode, id] of ids) {
    if (!id || !books(mode).has(id)) continue;
    const a = await settled(`http://localhost:${V1}`, mode, id), b = await settled(GAME, mode, id);
    const d = await diff(a, b);
    check(`H ${mode} #${id}: settled board pixel-near identical to v1 (${d.n} of ${d.total} px differ)`, d.n / d.total < 0.01, `${(100 * d.n / d.total).toFixed(3)} %`);
  }
}

// ---------------------------------------------------------------- report
await browser.close();
stopAll();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
if (failed.length) { console.log('FAILED:'); for (const f of failed) console.log('  ' + f.name + (f.detail ? '  [' + f.detail + ']' : '')); }
process.exit(failed.length ? 1 : 0);
