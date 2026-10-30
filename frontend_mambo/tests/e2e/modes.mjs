// WP10 milestones 2 and 3 e2e: every v2 mode in the real game against the mock RGS (FINAL fixture books), at 4 viewports.
//   node tests/e2e/modes.mjs [--shots <dir>] [--vp 1280x720,400x225] [--only base,doors,replay]
//   PORTS="game,rgs" to choose the ports (default: free ports); spawns and kills only its own servers.
// Per viewport: base with each floor plan (Mezzanine, Atrium, Lobby, Annex), the three doors through the Secret Entrance picker
// (Stage Door = bonus / The Briefing, Coat Check = entrance_orders / Sealed Orders, Service Stairs = entrance_blackout / Ballroom
// Blackout), then replay mode with one book of each mode. Checks: one /wallet/play with the chosen mode, the plan drawn
// (.board-wrap[data-plan], 6 rows on Annex), the mission published (<html data-mission>), displayed WIN == bet x payoutMultiplier,
// balance, end-round only for a win, back to idle, no page scroll, zero console / page errors, no external request.
// Exit 1 on any FAIL.
import fs from 'node:fs';
import path from 'node:path';
import { FRONT, GAME, RGS, setSid, loadPlaywright, ensureServers, stopServers, Session, mockCfg, mockReset, mockClear, mockLog, mockState, plays, ends, sleep, pickDoor } from '../guidelines/lib.mjs';

const argv = process.argv.slice(2);
const opt = (k) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : null; };
const SHOTS = opt('shots') ? path.resolve(opt('shots')) : null;
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
const ONLY = (opt('only') || 'base,doors,replay').split(',');
const ALL_VP = [
  { name: '1280x720', width: 1280, height: 720 },
  { name: '1024x576', width: 1024, height: 576 },
  { name: '425x812', width: 425, height: 812, touch: true },
  { name: '400x225', width: 400, height: 225 },
];
const VPS = opt('vp') ? ALL_VP.filter((v) => opt('vp').split(',').includes(v.name)) : ALL_VP;

let fails = 0; const rows = [];
const ok = (c, msg) => { if (!c) fails++; console.log((c ? 'PASS ' : 'FAIL ') + msg); rows.push([c ? 'PASS' : 'FAIL', msg]); return c; };
const J = JSON.stringify;

// ---- choose short, representative books straight from the fixtures (the mock serves the same files)
const readBooks = (mode) => fs.readFileSync(path.join(FRONT, 'fixtures', `books_${mode}_sample.jsonl`), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
const B = Object.fromEntries(['base', 'bonus', 'entrance_orders', 'entrance_blackout'].map((m) => [m, readBooks(m)]));
const has = (b, t) => b.events.some((e) => e.type === t);
const planOf = (b) => (b.events.find((e) => e.type === 'layout') || {}).id || 'mezzanine';
const shortest = (list) => list.slice().sort((a, b) => a.events.length - b.events.length)[0];
function pick(mode, pred) { const l = B[mode].filter(pred); if (!l.length) throw new Error('no fixture book for ' + mode); return shortest(l); }
const PLANS = ['mezzanine', 'atrium', 'lobby', 'annex'];
const CASES = [];
if (ONLY.includes('base')) for (const plan of PLANS) {
  // a winning base spin of that plan without a trigger (tumbles drawn in the plan); fallback: any book of the plan
  const b = B.base.filter((x) => planOf(x) === plan && !has(x, 'freeSpinTrigger') && x.payoutMultiplier > 0);
  CASES.push({ key: 'base_' + plan, mode: 'base', plan, book: b.length ? shortest(b) : pick('base', (x) => planOf(x) === plan) });
}
if (ONLY.includes('doors')) {
  CASES.push({ key: 'door_stage', mode: 'bonus', door: 'bonus', mission: 'briefing', book: pick('bonus', (x) => x.payoutMultiplier > 0) });
  CASES.push({ key: 'door_orders', mode: 'entrance_orders', door: 'entrance_orders', mission: 'orders', book: pick('entrance_orders', (x) => has(x, 'caseOpen')) });
  CASES.push({ key: 'door_blackout', mode: 'entrance_blackout', door: 'entrance_blackout', mission: 'blackout', book: pick('entrance_blackout', (x) => has(x, 'lightRoute') && JSON.stringify(x.events).includes('"lit":true')) });
}
const REPLAYS = ONLY.includes('replay') ? [
  { mode: 'base', book: pick('base', (x) => planOf(x) === 'annex' && x.payoutMultiplier > 0) },
  { mode: 'bonus', book: pick('bonus', (x) => x.payoutMultiplier > 0) },
  { mode: 'entrance_orders', book: pick('entrance_orders', (x) => has(x, 'caseOpen')) },
  { mode: 'entrance_blackout', book: pick('entrance_blackout', (x) => has(x, 'lightRoute')) },
] : [];
console.log('books:', J(CASES.map((c) => [c.key, c.book.id, c.book.events.length, c.book.payoutMultiplier / 100])), 'replays:', J(REPLAYS.map((r) => [r.mode, r.book.id])));

// in-page recorder: what the board and the layers showed during the round
const RECORD = () => {
  const seen = window.__seen = { plans: [], rows6: false, missions: [], layers: [], states: [] };
  const add = (a, v) => { if (v && !a.includes(v)) a.push(v); };
  const tick = () => {
    const w = document.querySelector('.board-wrap'); if (w) { add(seen.plans, w.dataset.plan); if (w.classList.contains('rows6')) seen.rows6 = true; }
    add(seen.missions, document.documentElement.dataset.mission);
    for (const e of document.querySelectorAll('#app [class*="l-"]')) for (const c of e.classList) if (/^l-[a-z]+$/.test(c)) add(seen.layers, c);
    add(seen.states, (/state-(\w+)/.exec(document.body.className) || [])[1]);
  };
  window.__seenTimer = setInterval(tick, 60); tick();
};
const fmtUSD = (m) => '$' + (m / 1e6).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
const noScroll = (s) => s.page.evaluate(() => { const d = document.documentElement; window.scrollTo(0, 9999); window.scrollTo(9999, 0); return d.scrollWidth <= d.clientWidth && d.scrollHeight <= d.clientHeight && scrollX === 0 && scrollY === 0; });

await ensureServers();
const pw = loadPlaywright();
const browser = await pw.chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const t00 = Date.now();
try {
  for (const vp of VPS) {
    for (const c of CASES) {
      const tag = `[${vp.name} ${c.key} book ${c.book.id}]`;
      setSid(`modes-${vp.name}-${c.key}`); await mockReset();
      const bet = 1000000, start = 50000 * 1e6;
      await mockCfg({ balance: start, bet: { betLevels: [bet], minBet: bet, maxBet: bet, stepBet: bet, defaultBetLevel: bet } });
      const s = new Session(browser);
      try {
        await s.open({}, { viewport: vp, idleMs: 25000 });
        await s.page.evaluate(RECORD);
        await s.page.evaluate(() => { if (!document.body.classList.contains('turbo')) document.querySelector('#btn-turbo')?.click(); });
        await mockCfg({ force: { id: c.book.id, mode: c.mode } }); await mockClear();
        const t0 = Date.now(); let doorChecked = null;
        if (c.door) {
          await s.click('#btn-unleash', { force: true }); await s.waitVisible('#modal-confirm', 3000).catch(() => {});
          const cards = await s.page.evaluate(() => [...document.querySelectorAll('#door-cards .door')].map((d) => d.dataset.mode));
          ok(cards.length === 3, `${tag} picker offers the three doors ${J(cards)}`);
          doorChecked = await pickDoor(s, c.door);
          await s.click('#confirm-ok', { force: true }).catch(() => {});
        } else {
          await s.click('#btn-bet');
        }
        // screenshot mid-round: base after the blueprint, a door once the dossier has gone (mission published + 3.5 s)
        let shot = false, shot2 = false;
        for (let i = 0; i < 300; i++) {
          await sleep(500);
          const st = await s.state(); const seen = await s.page.evaluate(() => window.__seen);
          const el = Date.now() - t0;
          if (SHOTS && !shot && ((c.door && seen.missions.length && el > 6000) || (!c.door && el > 1500))) { await s.page.screenshot({ path: path.join(SHOTS, `modes_${vp.name}_${c.key}_mid.png`) }); shot = true; }
          if (SHOTS && c.door && !shot2 && el > 13000 && st !== 'idle') { await s.page.screenshot({ path: path.join(SHOTS, `modes_${vp.name}_${c.key}_feature.png`) }); shot2 = true; }
          if (st === 'idle' && el > 2500) break;
        }
        await sleep(400);
        const secs = Math.round((Date.now() - t0) / 1000);
        const seen = await s.page.evaluate(() => { clearInterval(window.__seenTimer); return window.__seen; });
        const log = await mockLog(); const pl = plays(log); const st = await mockState(); const rnd = st.round || {};
        const win = (await s.text('#win')) || ''; const balTxt = (await s.text('#balance')) || '';
        if (SHOTS) await s.page.screenshot({ path: path.join(SHOTS, `modes_${vp.name}_${c.key}_end.png`) });
        const pm = Number(rnd.payoutMultiplier || 0); const exp = Math.round(bet * pm); const cost = bet * (c.mode === 'base' ? 1 : 100);
        if (c.door) ok(doorChecked === true, `${tag} door "${c.door}" selected, Confirm enabled`);
        ok(pl.length === 1 && pl[0].body.mode === c.mode && pl[0].body.amount === bet, `${tag} one /wallet/play mode=${pl[0] && pl[0].body.mode} amount=${pl[0] && pl[0].body.amount}`);
        ok(String(rnd.bookId) === String(c.book.id), `${tag} the forced book was served (${rnd.bookId})`);
        if (c.plan) ok(seen.plans.includes(c.plan) && (c.plan === 'annex') === seen.rows6, `${tag} plan drawn ${J(seen.plans)} rows6=${seen.rows6}`);
        if (c.mission) ok(seen.missions.includes(c.mission), `${tag} mission published ${J(seen.missions)} (layers seen ${J(seen.layers)})`);
        ok(win.replace(/\s/g, '') === fmtUSD(exp), `${tag} WIN shown ${win} == bet x ${pm} = ${fmtUSD(exp)}`);
        ok(balTxt.replace(/\s/g, '') === fmtUSD(start - cost + exp), `${tag} balance ${balTxt} == ${fmtUSD(start - cost + exp)}`);
        ok(ends(log).length === (pm > 0 ? 1 : 0), `${tag} end-round calls ${ends(log).length} (win ${pm > 0})`);
        ok((await s.state()) === 'idle', `${tag} back to idle after ${secs} s`);
        ok(await noScroll(s), `${tag} no page scroll`);
        ok(!s.consoleErrors.length && !s.pageErrors.length, `${tag} zero console / page errors ${J([...s.consoleErrors, ...s.pageErrors].slice(0, 3))}`);
        ok(!s.externalReqs().length, `${tag} no external request`);
      } catch (e) { ok(false, `${tag} runner exception ${e.message}`); }
      await s.close();
    }
  }
  // ---- replay mode: one book of each mode (all viewports for base and the doors would add little: 1280x720 and 400x225)
  const RVP = VPS.filter((v) => v.name === '1280x720' || v.name === '400x225');
  for (const vp of RVP) for (const r of REPLAYS) {
    const tag = `[replay ${vp.name} ${r.mode} book ${r.book.id}]`;
    setSid(`replay-${vp.name}-${r.mode}`); await mockReset(); await mockClear();
    const s = new Session(browser);
    try {
      await s.open({ replay: 'true', game: 'agent_mambo', version: '2', mode: r.mode, event: String(r.book.id), amount: '1000000', sessionID: null }, { viewport: vp, noWait: true });
      await s.page.waitForFunction(() => { const b = document.querySelector('#replay-btn'); return b && !b.disabled; }, null, { timeout: 10000 }).catch(() => {});
      await s.page.evaluate(RECORD);
      const line = (await s.text('#replay-ui')) || '';
      await s.page.click('#replay-turbo').catch(() => {});
      await s.page.click('#replay-btn');
      await s.page.waitForFunction(() => document.querySelector('#replay-btn')?.dataset.mode === 'again', null, { timeout: 240000 }).catch(() => {});
      const seen = await s.page.evaluate(() => { clearInterval(window.__seenTimer); return window.__seen; });
      const total = (await s.text('.rp-win')) || '';
      if (SHOTS) await s.page.screenshot({ path: path.join(SHOTS, `replay_${vp.name}_${r.mode}.png`) });
      const log = await mockLog();
      const exp = fmtUSD(Math.round(1e6 * r.book.payoutMultiplier / 100));
      ok(log.some((l) => l.path === `/bet/replay/agent_mambo/2/${r.mode}/${r.book.id}`) && !log.some((l) => l.path.startsWith('/wallet')), `${tag} GET /bet/replay only (${J(log.map((l) => l.path))})`);
      ok(r.mode === 'base' ? /1\.00/.test(line) : /100\s?[x×]/i.test(line) && /100\.00/.test(line), `${tag} amount / cost line "${line.replace(/\s+/g, ' ').slice(0, 120)}"`);
      ok(total.replace(/\s/g, '').endsWith(exp), `${tag} total ${total} ends with ${exp}`);
      if (r.mode === 'base') ok(seen.plans.includes('annex') && seen.rows6, `${tag} Annex drawn ${J(seen.plans)}`);
      if (r.mode === 'entrance_orders') ok(seen.missions.includes('orders'), `${tag} Sealed Orders published ${J(seen.missions)}`);
      if (r.mode === 'entrance_blackout') ok(seen.missions.includes('blackout'), `${tag} Ballroom Blackout published ${J(seen.missions)}`);
      ok(await noScroll(s), `${tag} no page scroll`);
      ok(!s.consoleErrors.length && !s.pageErrors.length, `${tag} zero console / page errors ${J([...s.consoleErrors, ...s.pageErrors].slice(0, 3))}`);
      ok(!s.externalReqs().length, `${tag} no external request`);
    } catch (e) { ok(false, `${tag} runner exception ${e.message}`); }
    await s.close();
  }
} catch (e) { ok(false, 'runner exception: ' + (e.stack || e.message)); }
await browser.close().catch(() => {});
stopServers();
const pass = rows.filter((r) => r[0] === 'PASS').length;
console.log(`MODES: ${pass} PASS, ${fails} FAIL in ${Math.round((Date.now() - t00) / 1000)} s (game ${GAME}, rgs ${RGS})`);
if (process.env.MODES_JSON) fs.writeFileSync(process.env.MODES_JSON, J({ pass, fail: fails, rows }, null, 1));
process.exit(fails ? 1 : 0);
