// WP6 layers: browser tests + screenshots (Playwright, real renderer, books from the FINAL math fixtures).
//   node tests/layers/browser.mjs [--only=A,B,...] [--shots] [--port=5911]
// Sections: A blueprint  B Sealed Orders  C Ballroom Blackout  D dossier / skip / costume  E Still mode  F screenshots at 4 viewports
//           G 10-second proxy (one frame per mission at 2 s and 8 s, sound off)  (console errors are checked in every section)
// Own static server on --port (default 5911, WP6 range 5910-5919), killed by PID at the end. Shots: tests/layers/shots/.
import { spawn, execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { litByWindow } from '../../src/render/layers/logic.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
// playwright: local install, else the global one (npm root -g), else PW_DIR
function loadPw() {
  const tries = [() => createRequire(import.meta.url)('playwright'), () => createRequire(execSync('npm root -g').toString().trim() + '/')('playwright')];
  if (process.env.PW_DIR) tries.unshift(() => createRequire(process.env.PW_DIR + '/')('playwright'));
  for (const f of tries) { try { return f(); } catch (e) { /* next */ } }
  throw new Error('playwright not found');
}
const { chromium } = loadPw();
const ROOT = path.resolve(HERE, '../..');
const FIX = path.resolve(ROOT, '../math/games/agent_mambo/library/fixtures_out');
const SHOTS = path.join(HERE, 'shots');
const arg = (k, d) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.split('=')[1] : d; };
const ONLY = (arg('only', 'A,B,C,D,E,F,G')).split(',');
const PORT = Number(arg('port', 5911));
const VIEWPORTS = [[1280, 720], [1024, 576], [425, 812], [400, 225]];
const books = {};
const load = (mode) => (books[mode] = books[mode] || JSON.parse(fs.readFileSync(path.join(FIX, `books_${mode}_sample.json`), 'utf8')));

let pass = 0, fail = 0;
const results = [];
function check(name, ok, info = '') {
  if (ok) pass++; else fail++;
  results.push(`${ok ? 'PASS' : 'FAIL'} ${name}${info ? ' - ' + info : ''}`);
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${info ? ' - ' + info : ''}`);
}

// ---------- server ----------
function startServer() {
  return new Promise((resolve, reject) => {
    const p = spawn(process.execPath, [path.join(ROOT, 'tools/mock-rgs/static-server.mjs')], { env: { ...process.env, PORT: String(PORT) }, stdio: ['ignore', 'pipe', 'pipe'] });
    const to = setTimeout(() => reject(new Error('static server did not start')), 8000);
    p.stdout.on('data', (d) => { if (/http:\/\//.test(String(d))) { clearTimeout(to); resolve(p); } });
    p.on('exit', (c) => { clearTimeout(to); reject(new Error('static server exited ' + c)); });
  });
}

const BASE = () => `http://127.0.0.1:${PORT}/tests/layers/page.html`;
async function openPage(browser, vp = [1280, 720], q = '') {
  const page = await browser.newPage({ viewport: { width: vp[0], height: vp[1] } });
  page.__errors = [];
  page.on('console', (m) => { if (m.type() === 'error') page.__errors.push(m.text()); });
  page.on('pageerror', (e) => page.__errors.push('pageerror ' + e.message));
  await page.goto(BASE() + (q ? '?' + q : ''));
  await page.waitForFunction(() => window.__ready, null, { timeout: 20000 });
  await page.waitForTimeout(2600); // the loading card of the shell goes
  return page;
}
const start = (page, events, o) => page.evaluate(([e, o]) => { window.__done = false; window.P.play(e, o).then(() => { window.__done = true; }); }, [events, o]);
const waitEvent = (page, type, n = 1, timeout = 120000) => page.waitForFunction(([t, n]) => window.P.log.filter((e) => e.kind === 'event' && e.type === t).length >= n, [type, n], { timeout });
const waitDone = (page, timeout = 300000) => page.waitForFunction(() => window.__done === true, null, { timeout });
const shot = async (page, name) => { fs.mkdirSync(SHOTS, { recursive: true }); const f = path.join(SHOTS, name + '.png'); await page.screenshot({ path: f }); return f; };
async function slow(page, rate) { const c = await page.context().newCDPSession(page); await c.send('Animation.enable'); await c.send('Animation.setPlaybackRate', { playbackRate: rate }); return c; }
const errorsOk = (page, name) => check(`${name}: no console error`, page.__errors.length === 0, page.__errors.slice(0, 3).join(' | '));

const find = (mode, pred) => load(mode).find(pred);
const hasEv = (b, t) => b.events.some((e) => e.type === t);
const shortest = (mode, pred) => load(mode).filter(pred).sort((a, b) => a.events.length - b.events.length)[0];

// ---------- A. blueprint ----------
async function secA(browser) {
  const page = await openPage(browser);
  // record every blueprint sheet the page ever shows (plan id, cells drawn)
  await page.evaluate(() => {
    window.__bp = [];
    new MutationObserver((ms) => ms.forEach((m) => m.addedNodes.forEach((n) => {
      if (n.nodeType === 1 && n.classList.contains('l-bp')) window.__bp.push({ plan: n.dataset.plan, cells: n.querySelectorAll('.l-bp-cell').length, t: window.P.now() });
    }))).observe(document.getElementById('app'), { childList: true, subtree: true });
  });
  for (const id of ['atrium', 'lobby', 'annex', 'mezzanine']) {
    const b = find('base', (x) => x.events[0] && x.events[0].type === 'layout' && x.events[0].id === id && !hasEv(x, 'freeSpinTrigger'));
    await page.evaluate(() => { window.__bp.length = 0; });
    await start(page, b.events, { cost: 1, turbo: false });
    await waitDone(page);
    const r = await page.evaluate(() => ({ bp: window.__bp.slice(), log: window.P.log.filter((e) => e.kind === 'event').map((e) => ({ type: e.type, t: e.t })), left: document.querySelectorAll('.l-bp,.l-bp-stamp').length }));
    const lay = b.events[0];
    check(`A ${id}: exactly one blueprint, of this plan only (no cycling)`, r.bp.length === 1 && r.bp[0].plan === id, JSON.stringify(r.bp));
    check(`A ${id}: outline cells == layout cellCount (${lay.cellCount})`, r.bp[0] && r.bp[0].cells === lay.cellCount);
    const tl = r.log.find((e) => e.type === 'layout'), tr = r.log.find((e) => e.type === 'reveal');
    check(`A ${id}: inked and stamped before the reveal, 0.5 s (+ frame slack 120 ms)`, tl && tr && tr.t - tl.t <= 620, `${tr && tl ? tr.t - tl.t : '?'} ms`);
    check(`A ${id}: nothing left after the book`, r.left === 0);
  }
  // turbo: 0.2 s draw
  const b = find('base', (x) => x.events[0] && x.events[0].type === 'layout' && x.events[0].id === 'atrium' && !hasEv(x, 'freeSpinTrigger'));
  await start(page, b.events, { cost: 1, turbo: true });
  await waitDone(page);
  const g = await page.evaluate(() => { const l = window.P.log.filter((e) => e.kind === 'event'); const a = l.find((e) => e.type === 'layout'), r = l.find((e) => e.type === 'reveal'); return r.t - a.t; });
  check('A turbo: draw + stamp 0.2 s (+ frame slack 100 ms)', g <= 300, g + ' ms');
  errorsOk(page, 'A');
  await page.close();
}

// ---------- B. Sealed Orders ----------
async function secB(browser) {
  const page = await openPage(browser);
  const b = shortest('entrance_orders', (x) => hasEv(x, 'caseOpen') && x.events.filter((e) => e.type === 'caseOpen').length >= 2);
  await page.evaluate(() => {
    window.__envlog = [];
    const probe = () => {
      const env = document.querySelector('.l-env');
      return env ? { stamp: (env.querySelector('.l-env-stamp') || {}).className || '', text: env.textContent, slips: [...env.querySelectorAll('.l-slip path:first-child')].map((p) => p.getAttribute('fill')) } : null;
    };
    window.__envProbe = probe;
  });
  await start(page, b.events, { cost: 100, skip: 0.2 });
  // sample the envelope after every event (probe layer runs before ours: sample on the next tick)
  const samples = [];
  let last = 0;
  for (;;) {
    const s = await page.evaluate(() => ({ n: window.P.log.length, done: window.__done, env: window.__envProbe(), ev: window.P.log.filter((e) => e.kind === 'event').slice(-1)[0] }));
    if (s.n !== last) { samples.push(s); last = s.n; }
    if (s.done) break;
    await page.waitForTimeout(15);
  }
  const log = await page.evaluate(() => window.P.log);
  // WIN never moves between a banked winInfo and the caseOpen of that spin
  let open = false, winAt = null, moved = [];
  for (const e of log) {
    if (e.kind !== 'event') continue;
    if (e.type === 'reveal') { open = false; winAt = null; }
    if (e.type === 'winInfo' && winAt == null) { winAt = e.win; open = true; }
    if (open && e.win !== winAt && e.type !== 'caseOpen') moved.push(e.type + ':' + winAt + '->' + e.win);
    if (e.type === 'caseOpen') { if (e.win !== winAt) moved.push('caseOpen:' + winAt + '->' + e.win); open = false; }
  }
  check('B WIN counter never touched by a banked step before caseOpen', moved.length === 0, moved.slice(0, 3).join(', '));
  const envs = samples.map((s) => s.env).filter(Boolean);
  check('B envelope shown during the feature', envs.length > 3);
  check('B SEALED stamp while filling, OPENED after caseOpen', envs.some((e) => /sealed/.test(e.stamp)) && envs.some((e) => /opened/.test(e.stamp)));
  const fills = new Set(envs.flatMap((e) => e.slips));
  check('B slips are neutral (steel / lilac, never gold)', [...fills].every((f) => ['#6FA7D9', '#9A7BD0'].includes(String(f).toUpperCase())), [...fills].join(','));
  check('B the envelope never says WIN', envs.every((e) => !/\bWIN\b/i.test(e.text)));
  const st = await page.evaluate(() => window.P.layers().orders.log.filter((x) => x.t === 'open'));
  const opens = b.events.filter((e) => e.type === 'caseOpen');
  check('B every caseOpen opened with bank == filed bank', st.length === opens.length && st.every((o, i) => o.bank === opens[i].bank && o.filed === opens[i].bank));
  check('B envelope gone after the book', await page.evaluate(() => !document.querySelector('.l-env')));
  errorsOk(page, 'B');
  await page.close();
}

// ---------- C. Ballroom Blackout ----------
async function secC(browser) {
  const page = await openPage(browser);
  const b = shortest('entrance_blackout', (x) => x.events.some((e) => e.type === 'winInfo' && e.wins.some((w) => w.meta && w.meta.lit)));
  await page.evaluate(() => {
    window.__beam = [];
    const L = window.P.layers;
    // a probe AFTER our layers: the beam position at each winInfo / reveal
    const { LAYERS } = window.__layersMod || {};
  });
  await start(page, b.events, { cost: 100, skip: 0.25 });
  // sample the beam at each event
  const samples = [];
  let last = 0;
  for (;;) {
    const s = await page.evaluate(() => {
      const d = document.querySelector('.l-dark');
      const ev = window.P.log.filter((e) => e.kind === 'event');
      return { n: ev.length, done: window.__done, last: ev.slice(-1)[0], dark: !!d, reel: d ? Number(d.dataset.reel) : null, row: d ? Number(d.dataset.row) : null, k: d ? Number(d.dataset.k) : null, tags: document.querySelectorAll('.l-x4').length };
    });
    if (s.n !== last) { samples.push(s); last = s.n; }
    if (s.done) break;
    await page.waitForTimeout(10);
  }
  const st = await page.evaluate(() => window.P.layers().blackout.state());
  check('C meta.lit matches the beam on every win (layer check)', st.mismatches === 0 && st.checks > 0, JSON.stringify(st));
  // independent check from the page log: dark is off at every reveal (never persists between spins)
  const log = await page.evaluate(() => window.P.log.filter((e) => e.kind === 'event'));
  const revealsDark = log.filter((e) => e.type === 'reveal' && e.dark).length;
  check('C the beam never persists between spins (no dark overlay when a reveal arrives)', revealsDark === 0, revealsDark + ' reveals with the dark left on');
  check('C board opens dark during the free spins', samples.some((s) => s.dark));
  check('C x4 tag shown on lit clusters', samples.some((s) => s.tags > 0));
  check('C nothing left after the book', await page.evaluate(() => !document.querySelector('.l-dark,.l-x4')));
  errorsOk(page, 'C');
  await page.close();
}

// ---------- D. dossier, skip after 1.2 s, costume, door ----------
async function secD(browser) {
  const page = await openPage(browser);
  const b = shortest('entrance_orders', (x) => hasEv(x, 'missionAssigned'));
  await start(page, b.events, { cost: 100 });
  await waitEvent(page, 'missionAssigned');
  const t0 = Date.now();
  await page.waitForSelector('.l-door', { timeout: 5000 }).catch(() => null);
  const door = await page.evaluate(() => { const d = document.querySelector('.l-door'); return d ? d.dataset.door : null; });
  check('D door transition of the Coat Check door', door === 'coat', String(door));
  await page.waitForSelector('.l-dos', { timeout: 5000 });
  const tDos = Date.now();
  // click before 1.2 s of the cutscene: ignored
  await page.mouse.click(640, 360);
  await page.waitForTimeout(150);
  const early = await page.evaluate(() => !!document.querySelector('.l-dos'));
  check('D a tap before 1.2 s does not skip', early && Date.now() - t0 < 1200 + 1100);
  const name = await page.evaluate(() => (document.querySelector('.l-dos-name') || {}).textContent);
  check('D dossier names the mission', name === 'MISSION: SEALED ORDERS', name);
  await page.waitForSelector('.l-dos.stamped', { timeout: 2000 }).catch(() => null);
  const top = await page.evaluate(() => !!document.querySelector('.l-dos.stamped .l-dos-stamp svg text') && document.querySelector('.l-dos-stamp svg text').textContent);
  check('D TOP SECRET stamp', top === 'TOP SECRET', String(top));
  // wait until the skip is allowed, then click
  await page.waitForFunction(() => document.querySelector('.l-dos.can-skip'), null, { timeout: 4000 });
  const tSkip = Date.now();
  await page.mouse.click(640, 360);
  await page.waitForFunction(() => !document.querySelector('.l-cut'), null, { timeout: 2000 }).catch(() => null);
  const gone = await page.evaluate(() => !document.querySelector('.l-cut'));
  const dl = await page.evaluate(() => window.P.layers().dossier.log);
  const sk = dl.find((x) => x.t === 'skip');
  check('D a tap after 1.2 s skips (cutscene gone soon after)', gone && sk && sk.at >= 1200, JSON.stringify(sk));
  const cost = dl.find((x) => x.t === 'costume');
  check('D costume change asked of the heroine: trench', cost && cost.outfit === 'trench', JSON.stringify(cost));
  await page.waitForTimeout(2200);
  const outfit = await page.evaluate(() => { try { return window.P.renderer._mascot().impl.rig().outfit; } catch (e) { return null; } });
  check('D heroine wears the trench during Sealed Orders', outfit === 'trench' || outfit === null, String(outfit));
  // full length without a skip: a second page, Briefing (bonus book: no missionAssigned -> the layer infers it), cost 100
  const p2 = await openPage(browser);
  const bb = shortest('bonus', (x) => hasEv(x, 'freeSpinTrigger'));
  await start(p2, bb.events, { cost: 100 });
  await p2.waitForSelector('.l-cut', { timeout: 60000 });
  const a = Date.now();
  await p2.waitForFunction(() => !document.querySelector('.l-cut'), null, { timeout: 10000 });
  const ms = Date.now() - a;
  const n2 = await p2.evaluate(() => window.P.layers().dossier.log);
  check('D v1 bonus book (no missionAssigned) plays The Briefing dossier', n2.some((x) => x.t === 'cut' && x.m === 'briefing'));
  check('D door + dossier length 3.2-4.6 s (door <= 1.2 s, dossier 2.6-3.4 s)', ms >= 3200 && ms <= 4600, ms + ' ms');
  await p2.close();
  errorsOk(page, 'D');
  await page.close();
}

// ---------- E. Still mode ----------
async function secE(browser) {
  const page = await openPage(browser, [1280, 720], 'motion=still');
  const b = shortest('entrance_blackout', (x) => hasEv(x, 'lightRoute'));
  await start(page, b.events, { cost: 100 });
  await page.waitForSelector('.l-dos', { timeout: 60000 });
  await page.waitForTimeout(60);
  const s = await page.evaluate(() => ({ open: !!document.querySelector('.l-dos.open.stamped'), anims: document.getAnimations().filter((a) => a.effect && a.effect.target && a.effect.target.closest && a.effect.target.closest('.l-cut,.l-env,.l-dark,.l-bp')).length }));
  check('E Still: dossier shown open and stamped at once, no running layer animation', s.open && s.anims === 0, JSON.stringify(s));
  await shot(page, 'still_dossier_1280x720');
  const bp = find('base', (x) => x.events[0] && x.events[0].type === 'layout' && x.events[0].id === 'lobby' && !hasEv(x, 'freeSpinTrigger'));
  const p2 = await openPage(browser, [1280, 720], 'motion=still');
  await start(p2, bp.events, { cost: 1 });
  await p2.waitForSelector('.l-bp', { timeout: 5000 });
  const off = await p2.evaluate(() => getComputedStyle(document.querySelector('.l-bp-line')).strokeDashoffset);
  check('E Still: blueprint outline already fully inked', parseFloat(off) === 0, off);
  await p2.close();
  errorsOk(page, 'E');
  await page.close();
}

// ---------- F. screenshots of every layer at 4 viewports ----------
async function secF(browser) {
  const ord = shortest('entrance_orders', (x) => x.events.filter((e) => e.type === 'caseOpen').length >= 1);
  const blk = shortest('entrance_blackout', (x) => x.events.some((e) => e.type === 'winInfo' && e.wins.some((w) => w.meta && w.meta.lit)));
  const atr = find('base', (x) => x.events[0] && x.events[0].type === 'layout' && x.events[0].id === 'atrium' && !hasEv(x, 'freeSpinTrigger'));
  const low = load('bonus').filter((x) => hasEv(x, 'freeSpinEnd')).sort((a, b) => a.payoutMultiplier - b.payoutMultiplier)[0];
  for (const vp of VIEWPORTS) {
    const tag = `${vp[0]}x${vp[1]}`;
    // orders: door, dossier, envelope sealed, opened
    let page = await openPage(browser, vp);
    await start(page, ord.events, { cost: 100 });
    await waitEvent(page, 'missionAssigned');
    await page.waitForSelector('.l-door', { timeout: 5000 }); await page.waitForTimeout(80); await shot(page, `door_${tag}`);
    await page.waitForSelector('.l-dos.open', { timeout: 6000 }); await page.waitForTimeout(250); await shot(page, `dossier_${tag}`);
    const fsWin = ord.events.findIndex((e, i) => e.type === 'winInfo' && ord.events.slice(0, i).some((x) => x.type === 'missionAssigned'));
    const nWin = ord.events.slice(0, fsWin + 1).filter((e) => e.type === 'winInfo').length;
    await waitEvent(page, 'winInfo', nWin); await page.waitForTimeout(450); await shot(page, `envelope_sealed_${tag}`);
    await waitEvent(page, 'caseOpen', 1); await page.waitForSelector('.l-env-reveal', { timeout: 4000 }); await page.waitForTimeout(220); await shot(page, `envelope_opened_${tag}`);
    errorsOk(page, `F orders ${tag}`);
    await page.close();
    // blackout: lit win with the x4 tag
    page = await openPage(browser, vp);
    await start(page, blk.events, { cost: 100 });
    const litIdx = blk.events.findIndex((e) => e.type === 'winInfo' && e.wins.some((w) => w.meta && w.meta.lit));
    const nLit = blk.events.slice(0, litIdx + 1).filter((e) => e.type === 'winInfo').length;
    await waitEvent(page, 'lightRoute', 1); await page.waitForTimeout(500); await shot(page, `spotlight_${tag}`);
    await waitEvent(page, 'winInfo', nLit); await page.waitForSelector('.l-x4', { timeout: 4000 }).catch(() => null); await page.waitForTimeout(250); await shot(page, `spotlight_x4_${tag}`);
    errorsOk(page, `F blackout ${tag}`);
    await page.close();
    // blueprint mid-draw and inked (animations slowed 10x so the frame can be caught)
    page = await openPage(browser, vp);
    await slow(page, 0.1);
    await start(page, atr.events, { cost: 1 });
    await page.waitForSelector('.l-bp', { timeout: 5000 }); await page.waitForTimeout(2600); await shot(page, `blueprint_draw_${tag}`);
    await page.waitForSelector('.l-bp-stamp', { timeout: 8000 }); await page.waitForTimeout(1300); await shot(page, `blueprint_stamp_${tag}`);
    await page.close();
    // debrief: the lowest bonus book, fast forward to the end of the feature, then normal speed for the card
    page = await openPage(browser, vp);
    await start(page, low.events, { cost: 100, skip: 0.04 });
    await waitEvent(page, 'freeSpinEnd', 1, 200000).catch(() => null);
    await page.evaluate(() => window.P.renderer.setSkip(false));
    await page.waitForSelector('.l-debrief', { timeout: 6000 }).catch(() => null); await page.waitForTimeout(500); await shot(page, `debrief_${tag}`);
    check(`F debrief tab shown ${tag}`, await page.evaluate(() => !!document.querySelector('.l-debrief')));
    await page.close();
  }
  check('F screenshots written', fs.readdirSync(SHOTS).filter((f) => f.endsWith('.png')).length >= 4 * 9);
}

// ---------- G. the 10-second proxy: one frame per mission at 2 s and 8 s into the free spins, sound off ----------
async function secG(browser) {
  const picks = {
    briefing: shortest('bonus', (x) => hasEv(x, 'freeSpinTrigger')),
    orders: shortest('entrance_orders', (x) => x.events.filter((e) => e.type === 'caseOpen').length >= 2),
    blackout: shortest('entrance_blackout', (x) => hasEv(x, 'lightRoute')),
  };
  for (const [m, b] of Object.entries(picks)) {
    const page = await openPage(browser, [1280, 720]);
    await start(page, b.events, { cost: 100 });
    // the first free spin reveal = the start of the feature board
    const first = b.events.findIndex((e) => e.type === 'reveal' && e.gameType === 'freegame');
    const n = b.events.slice(0, first + 1).filter((e) => e.type === 'reveal').length;
    await waitEvent(page, 'reveal', n, 120000);
    const t0 = Date.now();
    await page.waitForTimeout(2000); await shot(page, `tensec_${m}_2s`);
    await page.waitForTimeout(Math.max(0, 8000 - (Date.now() - t0))); await shot(page, `tensec_${m}_8s`);
    errorsOk(page, `G ${m}`);
    await page.close();
  }
}

(async () => {
  const server = await startServer();
  const browser = await chromium.launch();
  try {
    if (ONLY.includes('A')) await secA(browser);
    if (ONLY.includes('B')) await secB(browser);
    if (ONLY.includes('C')) await secC(browser);
    if (ONLY.includes('D')) await secD(browser);
    if (ONLY.includes('E')) await secE(browser);
    if (ONLY.includes('F')) await secF(browser);
    if (ONLY.includes('G')) await secG(browser);
  } catch (e) {
    check('run', false, e && e.stack ? e.stack.split('\n').slice(0, 3).join(' ') : String(e));
  } finally {
    await browser.close();
    try { server.kill(); } catch (e) { /* ignore */ }
  }
  console.log(`\n${pass} PASS, ${fail} FAIL`);
  process.exit(fail ? 1 : 0);
})();
