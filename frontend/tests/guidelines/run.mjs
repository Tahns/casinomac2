// Engine approval-guideline automation. Usage: node tests/guidelines/run.mjs [--wait=240] [--only=181,222]
import fs from 'node:fs';
import path from 'node:path';
import {
  FRONT, SHOTS, GAME, RGS, SESSION, VIEWPORTS, loadPlaywright, ensureServers, stopServers, waitForGame, Session,
  mockCfg, mockReset, mockLog, mockClear, mockState, plays, ends, sleep, nums, snippet, HERE,
} from './lib.mjs';
import { staticReview } from './static.mjs';

const arg = (k, d) => (process.argv.find((a) => a.startsWith('--' + k + '=')) || '').split('=')[1] ?? d;
const WAIT = Number(arg('wait', 240)) * 1000;
const ONLY = arg('only', '') ? arg('only', '').split(',') : null;

const results = []; // {id,title,status,evidence[]}
const allSessions = [];
const PASS = 'PASS', FAIL = 'FAIL', RISK = 'AT RISK', HUMAN = 'NEEDS A HUMAN';
const RESTRICTED = ['bet', 'bets', 'betting', 'bonus buy', 'bought', 'buy', 'cash', 'cost of', 'credit', 'currency', 'deposit', 'fund', 'gamble', 'money', 'paid', 'pay', 'pays', 'payer', 'paytable', 'purchase', 'rebet', 'stake', 'total bet', 'wager', 'withdraw', 'win feature', 'place your bets', 'at the cost of'];
const restrictedRe = new RegExp('(?<![A-Za-z])(' + RESTRICTED.map((w) => w.replace(/ /g, '\\s+')).join('|') + ')(?![A-Za-z])', 'gi');
const BAD_TEXT = /\bundefined\b|\bNaN\b|\[object|\{\{?\s*\w+\s*\}?\}|\bnull\b|(?:^|[^\w.])(?:btn|err|label|autoplay|unleash|round|rules|info|replay|menu|win|title|msg|ui|game|sym|mode|paytable|help)\.[A-Za-z_][\w]*(?:\.[\w]+)*(?![\w@])/;

let browser, pw;
async function sess(query, o) { const s = new Session(browser); allSessions.push(s); await s.open(query, o); return s; }
function rec(id, title, status, ...evidence) { results.push({ id, title, status, evidence: evidence.flat().filter(Boolean) }); console.log(`${status.padEnd(14)} [${id}] ${title}\n    ${evidence.flat().filter(Boolean).join('\n    ')}`); }
async function check(id, title, fn) {
  if (ONLY && !ONLY.includes(String(id))) return;
  try { await mockReset(); await mockClear(); const r = await fn(); if (r) rec(id, title, r[0], r.slice(1)); }
  catch (e) { rec(id, title, FAIL, 'runner exception: ' + snippet(e.stack || e.message, 400)); }
}
const J = JSON.stringify;
const fmtLog = (log) => log.map((l) => `${l.method} ${l.path} ${snippet(J(l.body), 90)}`);

// open every overlay and return [{name,text}]
async function collectScreens(s) {
  const out = [{ name: 'main', text: await s.visibleText() }];
  const tryOpen = async (name, sel, closeSel) => {
    if (!(await s.visible(sel))) { out.push({ name, text: '', missing: true }); return; }
    await s.click(sel, { force: true }).catch(() => {}); await sleep(500);
    out.push({ name, text: await s.visibleText() });
    // rules may have pages/tabs: click through next/tabs
    if (name === 'info') {
      for (let i = 0; i < 12; i++) {
        const nxt = s.page.locator('.modal:not([hidden]) :is(button,[role=tab],a):has-text("Next"), .rules-tab, [role=tab], .tabs button, .rules-nav button, .pager button').nth(i);
        if (!(await nxt.isVisible().catch(() => false))) continue;
        await nxt.click({ timeout: 800 }).catch(() => {}); await sleep(120);
        out.push({ name: 'info-tab' + i, text: await s.visibleText() });
      }
    }
    await s.closeOverlays();
  };
  await tryOpen('autoplay', '#btn-autoplay');
  await tryOpen('unleash-confirm', '#btn-unleash');
  await tryOpen('info', '#btn-info');
  return out;
}

async function main() {
  console.log('waiting for game files (index.html + src/main.js) up to', WAIT / 1000, 's ...');
  const ready = await waitForGame(WAIT);
  if (!ready) { console.log('GAME FILES NOT READY - static review only'); }
  await ensureServers();
  const stat = await staticReview();
  if (!ready) { writeReport(stat, false); stopServers(); return; }
  pw = loadPlaywright();
  browser = await pw.chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const mstate = await mockState(); console.log('mock books:', mstate.bookSource);

  await check(181, 'authenticate on load hits rgs_url with sessionID', async () => {
    const s = await sess({}); const log = await mockLog(); await s.close();
    const a = log.find((l) => l.path === '/wallet/authenticate');
    const first = log[0];
    return [a && a.body.sessionID === SESSION && first === a ? PASS : a && a.body.sessionID === SESSION ? RISK : FAIL, ...fmtLog(log.slice(0, 4)), 'origin=' + (a && a.origin)];
  });

  await check(274, 'rgs_url=example.com (and bare host) -> error, no RGS call elsewhere', async () => {
    const ev = [];
    const s = await sess({ rgs_url: 'example.com' }, { noWait: true, routes: (ctx) => ctx.route(/^https?:\/\/(?!localhost)/, (r) => r.fulfill({ status: 404, contentType: 'application/json', body: '{"error":"ERR_GEN"}', headers: { 'access-control-allow-origin': '*' } })) });
    await sleep(5000);
    const log = await mockLog(); const hits = s.reqs.filter((r) => /example\.com/.test(r.url)).map((r) => r.method + ' ' + r.url);
    const st = await s.state(); const vis = await s.visibleText(); const shown = await s.visible('#modal-message') || /error|unable|failed|connect|could not|problem|try again/i.test(vis);
    ev.push('requests to example.com: ' + J(hits), 'mock log entries: ' + log.length, 'state=' + st + ' error visible=' + shown, 'text=' + snippet(vis, 140));
    await s.close();
    // bare host through a virtual host that proxies to the mock
    await mockClear();
    const s2 = await sess({ rgs_url: 'rgs.test' }, { routes: (ctx) => ctx.route(/^https:\/\/rgs\.test\//, async (r) => { const u = new URL(r.request().url()); const rr = await fetch(RGS + u.pathname + u.search, { method: r.request().method(), headers: { 'content-type': 'application/json' }, body: r.request().method() === 'POST' ? r.request().postData() : undefined }); r.fulfill({ status: rr.status, contentType: 'application/json', body: await rr.text(), headers: { 'access-control-allow-origin': '*' } }); }) });
    const rq = s2.reqs.filter((r) => /rgs\.test/.test(r.url)).map((r) => r.method + ' ' + r.url);
    ev.push('bare host rgs.test requests: ' + J(rq.slice(0, 2)), 'idle after bare host=' + (await s2.state()));
    const bareOk = rq.some((u) => u.includes('https://rgs.test/wallet/authenticate'));
    await s2.close();
    return [hits.some((h) => /wallet\/authenticate/.test(h)) && log.length === 0 && shown && bareOk ? PASS : FAIL, ...ev];
  });

  await check(183, '/wallet/play {sessionID,amount,mode}', async () => {
    const s = await sess({}); await mockClear(); await s.playRound(); const log = await mockLog(); await s.close();
    const p = plays(log)[0];
    const ok = p && p.body.sessionID === SESSION && typeof p.body.amount === 'number' && p.body.amount === 1000000 && /^base$/i.test(p.body.mode);
    return [ok ? PASS : FAIL, ...fmtLog(log)];
  });

  await check(275, 'no "stake engine" text/branding in DOM/network/source', async () => {
    const s = await sess({}); const html = await s.page.content(); const txt = await s.allText();
    const reqUrls = s.reqs.map((r) => r.url).filter((u) => /stake/i.test(u));
    const re = /stake[\s_-]*engine/i; const srcHits = [];
    const walk = (d) => { for (const f of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, f.name); if (f.isDirectory()) { if (!['node_modules', 'tests', 'tools', 'fixtures', 'shots'].includes(f.name)) walk(p); } else if (/\.(js|mjs|html|css|json|svg|txt)$/.test(f.name) && !/^(CONTRACT|NOTES)/.test(f.name) && f.name !== 'package.json') { fs.readFileSync(p, 'utf8').split('\n').forEach((l, i) => { if (/stake/i.test(l)) srcHits.push(`${path.relative(FRONT, p)}:${i + 1}: ${snippet(l, 100)}`); }); } } };
    walk(FRONT); await s.close();
    const bad = srcHits.filter((h) => re.test(h)); const loose = srcHits.filter((h) => !re.test(h));
    const dom = re.test(html) || re.test(txt);
    return [!dom && bad.length === 0 && reqUrls.length === 0 ? (loose.length ? RISK : PASS) : FAIL, 'DOM hit=' + dom, 'network urls with "stake": ' + J(reqUrls), 'source "stake engine" hits: ' + J(bad.slice(0, 5)), loose.length ? 'other "stake" occurrences (check social wording): ' + J(loose.slice(0, 5)) : null];
  });

  await check(242, 'dynamic bet config (1.00-2.00, 4 levels, default in middle)', async () => {
    const lv = [1000000, 1400000, 1700000, 2000000];
    await mockCfg({ bet: { minBet: 1000000, maxBet: 2000000, stepBet: 100000, defaultBetLevel: 1400000, betLevels: lv } });
    const s = await sess({}); const seen = [await s.text('#bet')];
    const plus = '#btn-bet-plus', minus = '#btn-bet-minus';
    for (let i = 0; i < 5; i++) { await s.click(plus, { force: true }).catch(() => {}); await sleep(120); seen.push(await s.text('#bet')); }
    const plusDis = await s.page.locator(plus).first().isDisabled().catch(() => null);
    for (let i = 0; i < 6; i++) { await s.click(minus, { force: true }).catch(() => {}); await sleep(120); seen.push(await s.text('#bet')); }
    const minusDis = await s.page.locator(minus).first().isDisabled().catch(() => null);
    await s.close();
    const v = seen.map((x) => nums(x)[0]);
    const okDefault = v[0] === 1.4; const maxv = Math.max(...v), minv = Math.min(...v);
    const ev = ['displayed bet sequence: ' + J(seen.map((x) => snippet(x, 20))), `plus disabled at end=${plusDis}, minus disabled at end=${minusDis}`];
    // JPY
    await mockCfg({ currency: 'JPY', bet: { minBet: 100000000, maxBet: 1000000000, stepBet: 100000000, defaultBetLevel: 200000000, betLevels: [100000000, 200000000, 500000000, 1000000000] }, balance: 50000000000 });
    const s2 = await sess({}); const j0 = await s2.text('#bet'); await s2.click(plus, { force: true }).catch(() => {}); await sleep(150); const j1 = await s2.text('#bet'); await mockClear(); await s2.playRound(); const jl = await mockLog(); await s2.close();
    ev.push(`JPY bet shown: ${snippet(j0, 20)} -> ${snippet(j1, 20)}; play amount=${plays(jl)[0]?.body.amount}`);
    const jOk = /¥\s?200(?![.\d])/.test(j0 || '') && /¥\s?500(?![.\d])/.test(j1 || '') && plays(jl)[0]?.body.amount === 500000000;
    return [okDefault && maxv === 2 && minv === 1 && v.filter((x) => x === 1.4).length >= 2 && jOk ? PASS : FAIL, ...ev];
  });

  await check(187, 'active round restores bet = round.amount after reload', async () => {
    await mockCfg({ keepActive: true, activeRound: { amount: 3000000, category: 'win' } });
    const s = await sess({}, { idleMs: 25000 }); await sleep(1500);
    const b1 = await s.text('#bet'); await s.page.reload(); await s.waitIdle(25000).catch(() => {}); const b2 = await s.text('#bet');
    const log = await mockLog(); await s.close();
    const ok = nums(b1)[0] === 3 && nums(b2)[0] === 3;
    return [ok ? PASS : FAIL, `bet display after load=${snippet(b1, 20)}, after reload=${snippet(b2, 20)} (round.amount=3.00, default 1.00)`, ...fmtLog(log.slice(0, 6))];
  });

  await check(221, 'no end-round after 0x, end-round after win', async () => {
    await mockCfg({ force: 'loss' }); let s = await sess({}); await mockClear(); await s.playRound(); let log = await mockLog();
    const loss = { p: plays(log).length, e: ends(log).length }; const l1 = fmtLog(log);
    await mockCfg({ force: 'win' }); await mockClear(); await s.playRound(); log = await mockLog(); const win = { p: plays(log).length, e: ends(log).length };
    const orderOk = log.findIndex((l) => l.path.includes('play')) < log.findIndex((l) => l.path.includes('end-round'));
    const l2 = fmtLog(log); await s.close();
    return [loss.p === 1 && loss.e === 0 && win.p === 1 && win.e === 1 && orderOk ? PASS : FAIL, `0x round: play=${loss.p} end-round=${loss.e}`, `win round: play=${win.p} end-round=${win.e}`, ...l1, ...l2];
  });

  await check(222, 'zero balance -> no /wallet/play (button, space, autoplay, unleash) + visible message', async () => {
    await mockCfg({ balance: 500000 }); // 0.50 < bet 1.00
    const s = await sess({}); const ev = []; await mockClear();
    const msgOf = async () => ((await s.visible('#modal-message')) ? 'modal:' + snippet(await s.text('#message-text'), 80) : (/insufficient|not enough|balance|funds|play/i.test(await s.visibleText()) ? 'text' : ''));
    const res = {};
    await s.click('#btn-bet', { force: true }).catch(() => {}); await sleep(900); res.button = await msgOf(); await s.closeOverlays();
    await s.page.keyboard.press('Space'); await sleep(900); res.space = await msgOf(); await s.closeOverlays();
    await s.clickIfVisible('#btn-autoplay'); await sleep(400); await s.clickIfVisible('#ap-confirm'); await sleep(1500); res.autoplay = await msgOf(); await s.closeOverlays();
    await s.clickIfVisible('#btn-unleash'); await sleep(400); await s.clickIfVisible('#confirm-ok'); await sleep(1200); res.unleash = await msgOf(); await s.closeOverlays();
    const log = await mockLog(); const pl = plays(log); await s.shot?.('x');
    await s.page.screenshot({ path: path.join(SHOTS, 'qa_zero_balance.png') }); await s.close();
    ev.push('messages by path: ' + J(res), 'play calls=' + pl.length, ...fmtLog(log));
    const msgs = Object.values(res).filter((v) => v.startsWith('modal:'));
    return [pl.length === 0 && msgs.length >= 3 ? PASS : pl.length === 0 ? RISK : FAIL, ...ev];
  });

  await check(228, 'space bar places a bet, no page scroll, no double fire', async () => {
    const s = await sess({}); await mockClear();
    await s.page.evaluate(() => document.activeElement && document.activeElement.blur()); await s.page.keyboard.press('Space');
    await s.waitIdle(60000).catch(() => {}); await sleep(300);
    const first = plays(await mockLog()).length;
    // after clicking the button it holds focus: Space must still be exactly one bet
    await s.click('#btn-bet', { force: true }).catch(() => {}); await s.waitIdle(60000).catch(() => {}); await mockClear();
    await s.page.keyboard.press('Space'); await s.waitIdle(60000).catch(() => {}); await sleep(400);
    const second = plays(await mockLog()).length;
    const info = await s.page.evaluate(() => ({ keys: window.__qa.keys.filter((k) => k.code === 'Space'), sy: window.scrollY, st: document.scrollingElement.scrollTop, tgt: document.activeElement && (document.activeElement.id || document.activeElement.tagName) }));
    await s.close();
    const prevented = info.keys.every((k) => k.prevented);
    return [first === 1 && second === 1 && prevented && info.sy === 0 ? PASS : FAIL, `Space w/o focus -> plays=${first}; Space with button focused -> plays=${second} (must be 1)`, 'keydown Space events: ' + J(info.keys), `scrollY=${info.sy} scrollTop=${info.st} activeElement=${info.tgt}`];
  });

  await check(227, 'no scrollbars/scroll at 4 viewports (idle + after bet + rules open)', async () => {
    const ev = []; let bad = 0;
    for (const vp of VIEWPORTS) {
      const s = await sess({}, { viewport: vp });
      const probe = async (tag) => s.page.evaluate(() => { const d = document.documentElement, b = document.body; window.scrollTo(0, 99999); window.scrollTo(99999, 0); const cs = getComputedStyle(b), ch = getComputedStyle(d); return { sw: d.scrollWidth, cw: d.clientWidth, sh: d.scrollHeight, ch: d.clientHeight, bsw: b.scrollWidth, bsh: b.scrollHeight, iw: innerWidth, ih: innerHeight, sx: scrollX, sy: scrollY, ov: ch.overflow + '/' + cs.overflow, h: cs.height, scrollbarW: innerWidth - d.clientWidth, offscreen: [...document.querySelectorAll('body *')].filter((e) => { const r = e.getBoundingClientRect(); const st = getComputedStyle(e); return r.width > 0 && (r.right > innerWidth + 1 || r.bottom > innerHeight + 1) && st.position !== 'fixed' && st.display !== 'none' && st.visibility !== 'hidden' && !e.closest('[hidden]') && st.opacity !== '0'; }).slice(0, 3).map((e) => (e.id || e.className || e.tagName) + ':' + Math.round(e.getBoundingClientRect().right) + 'x' + Math.round(e.getBoundingClientRect().bottom)) }; });
      const a = await probe(); await s.playRound(); const b = await probe();
      await s.clickIfVisible('#btn-info'); await sleep(500); const c = await probe(); await s.closeOverlays();
      await s.page.screenshot({ path: path.join(SHOTS, `qa_${vp.name}.png`) });
      for (const [tag, r] of [['idle', a], ['after-bet', b], ['rules', c]]) {
        const fail = r.sx !== 0 || r.sy !== 0 || r.scrollbarW !== 0 || r.sw > r.cw || r.sh > r.ch;
        if (fail) bad++;
        ev.push(`${vp.name} ${tag}: scroll=(${r.sx},${r.sy}) doc ${r.sw}x${r.sh} vs ${r.cw}x${r.ch} scrollbarW=${r.scrollbarW} overflow=${r.ov}${r.offscreen.length ? ' offscreen=' + J(r.offscreen) : ''}${fail ? ' <-- FAIL' : ''}`);
      }
      await s.close();
    }
    ev.push('screenshots: tests/shots/qa_1024x576.png qa_400x225.png qa_800x450.png qa_425x812.png (one bet played before the shot where possible)');
    return [bad === 0 ? PASS : FAIL, ...ev];
  });

  await check(104, 'autoplay: one press sends no play, opens settings', async () => {
    const s = await sess({}); await mockClear(); await s.click('#btn-autoplay', { force: true }); await sleep(2500);
    const log = await mockLog(); const shown = await s.visible('#modal-autoplay'); const txt = await s.text('#modal-autoplay'); await s.close();
    return [plays(log).length === 0 && shown ? PASS : FAIL, `plays=${plays(log).length}, settings panel visible=${shown}`, 'panel text: ' + snippet(txt, 140)];
  });

  await check(31, 'unleash: one press sends no play, dialog shows cost; cancel safe; confirm plays bonus', async () => {
    const s = await sess({}); await mockClear(); await s.click('#btn-unleash', { force: true }); await sleep(800);
    const shown = await s.visible('#modal-confirm'); const txt = (await s.text('#modal-confirm')) || ''; const p0 = plays(await mockLog()).length;
    await s.click('#confirm-cancel', { force: true }).catch(() => {}); await sleep(600); const p1 = plays(await mockLog()).length;
    await s.click('#btn-unleash', { force: true }); await sleep(500); await s.click('#confirm-ok', { force: true }).catch(() => {}); await sleep(1200);
    const pl = plays(await mockLog()); await s.close();
    const costShown = /100(\.00)?/.test(txt);
    return [p0 === 0 && p1 === 0 && shown && costShown && pl.length === 1 && /bonus/i.test(pl[0].body.mode) ? PASS : FAIL, `dialog visible=${shown} text="${snippet(txt, 150)}"`, `plays before confirm=${p0}, after cancel=${p1}, after OK=${pl.length} ${pl[0] ? J(pl[0].body) : ''}`];
  });

  await check(107, 'sound toggle mutes everything', async () => {
    const s = await sess({}); const probe = () => s.page.evaluate(() => { const q = window.__qa; return { ctx: q.ctxs.map((c) => c.state), dest: q.destSources.map((n) => n.constructor.name + ':' + (n.gain ? n.gain.value : 'x')), muted: document.body.classList.contains('muted'), graph: window.__qa.audible && window.__qa.audible(), media: [...document.querySelectorAll('audio,video')].map((m) => m.muted || m.paused) }; });
    await s.playRound(); const before = await probe(); await s.click('#btn-sound', { force: true }); await sleep(900); const after = await probe();
    await s.playRound(); const during = await probe(); await s.close();
    const hasAudio = before.ctx.length > 0;
    const gainsMuted = after.dest.length > 0 && after.dest.every((d) => d.endsWith(':0')) || (after.graph && after.graph.sources > 0 && after.graph.audibleSources === 0);
    const suspended = after.ctx.length > 0 && after.ctx.every((c) => c !== 'running');
    const ev = [`before: ${J(before)}`, `after toggle: ${J(after)}`, `after another round while muted: ${J(during)}`];
    if (!hasAudio) return [HUMAN, 'no AudioContext created; listen manually (could be HTMLAudio/none)', ...ev];
    if (after.muted && (gainsMuted || suspended)) return [PASS, 'body.muted + master gain 0 / context not running', ...ev];
    return [HUMAN, 'cannot prove mute from graph state', ...ev];
  });

  await check(223, 'viewport meta + touch-action', async () => {
    const s = await sess({}); const r = await s.page.evaluate(() => ({ meta: document.querySelector('meta[name=viewport]')?.content, ta: getComputedStyle(document.querySelector('#game') || document.body).touchAction, ov: getComputedStyle(document.body).overflow, h: getComputedStyle(document.documentElement).height })); await s.close();
    const want = 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no';
    const norm = (x) => (x || '').replace(/\s+/g, '').toLowerCase();
    return [norm(r.meta) === norm(want) && r.ta === 'none' ? PASS : FAIL, 'meta=' + r.meta, 'touch-action on #game=' + r.ta, 'body overflow=' + r.ov];
  });

  await check(219, 'currencies USD/EUR/CAD/MXN/JPY/XSC/XGC', async () => {
    const exp = { USD: '$12.34', EUR: '€12.34', CAD: 'CA$12.34', MXN: 'MX$12.34', JPY: '¥12', XSC: '12.34 SC', XGC: '12.34 GC' }; const ev = []; let bad = 0;
    for (const [cur, want] of Object.entries(exp)) {
      await mockCfg({ currency: cur, balance: cur === 'JPY' ? 12000000 : 12340000, bet: cur === 'JPY' ? { minBet: 1000000, maxBet: 10000000, stepBet: 1000000, defaultBetLevel: 1000000, betLevels: [1000000, 2000000, 5000000, 10000000] } : undefined });
      const s = await sess({}); const b = (await s.text('#balance')) || ''; const bet = (await s.text('#bet')) || ''; await s.close();
      const ok = b.replace(/\s+/g, ' ').includes(want); if (!ok) bad++; ev.push(`${cur}: balance="${snippet(b, 24)}" bet="${snippet(bet, 24)}" expected "${want}" ${ok ? '' : '<-- FAIL'}`);
    }
    return [bad ? FAIL : PASS, ...ev];
  });


  await check('219b', 'CA$/MX$/XSC/JPY with large balance: no clipping of balance/bet/win at 4 viewports', async () => {
    const ev = []; let bad = 0;
    let stressBad = 0;
    for (const [tier, balance] of [['moderate 12,345.67', 12345670000], ['stress 1,234,567.89', 1234567890000]]) for (const cur of ['CAD', 'MXN', 'XSC']) {
      for (const vp of VIEWPORTS) {
        await mockCfg({ currency: cur, balance, bet: { betLevels: [50000000, 100000000], minBet: 50000000, maxBet: 100000000, stepBet: 50000000, defaultBetLevel: 100000000 } });
        const s = await sess({}, { viewport: vp }); await mockCfg({ force: { category: 'win', mode: 'base' } }); await s.playRound();
        const r = await s.page.evaluate(() => ['balance', 'bet', 'win', 'unleash-cost'].map((id) => { const e = document.getElementById(id); if (!e) return { id, missing: true }; const cs = getComputedStyle(e); const rc = e.getBoundingClientRect(); let p = e.parentElement, clip = false; for (let i = 0; i < 3 && p; i++, p = p.parentElement) { const pr = p.getBoundingClientRect(); if (rc.left < pr.left - 1 || rc.right > pr.right + 1) { clip = true; break; } } const range = document.createRange(); range.selectNodeContents(e); const tr = range.getBoundingClientRect(); return { id, text: e.textContent, sw: e.scrollWidth, cw: e.clientWidth, textW: Math.round(tr.width), boxW: Math.round(rc.width), clip: e.scrollWidth > e.clientWidth + 1 || clip || tr.width > rc.width + 1, hidden: cs.display === 'none' || cs.visibility === 'hidden' }; }));
        if (tier.startsWith('stress') && (cur === 'CAD' || vp.name === '400x225')) await s.page.screenshot({ path: path.join(SHOTS, `qa_${cur}_${vp.name}.png`) });
        await s.close();
        const clipped = r.filter((x) => x.clip && !x.hidden);
        if (clipped.length) { if (tier.startsWith('moderate')) bad++; else stressBad++; }
        ev.push(`[${tier}] ${cur} ${vp.name}: ${r.filter((x) => !x.missing && !x.hidden).map((x) => `${x.id}="${x.text}"(${x.textW}/${x.boxW})${x.clip ? ' CLIPPED' : ''}`).join(' ')}`);
      }
    }
    return [bad ? FAIL : stressBad ? RISK : PASS, `moderate balance clipped cases=${bad}; 7-figure stress clipped cases=${stressBad}`, ...ev];
  });

  await check(273, 'sub-cent payouts (bet 0.01 x 0.1x win = 0.001) are not shown as 0.00', async () => {
    const bet = 10000; // 0.01
    await mockCfg({ currency: 'USD', balance: 100000000, bet: { betLevels: [bet], minBet: bet, maxBet: bet, stepBet: bet, defaultBetLevel: bet } });
    const st = await mockState(); const small = st.books.base.filter((b) => b.p > 0 && b.p <= 30).map((b) => b.id); const id = small[0];
    const s = await sess({}); await mockCfg({ force: { id, mode: 'base' } }); await s.playRound();
    const win = await s.text('#win'); const bal = await s.text('#balance'); const rnd = (await mockState()).round; await s.close();
    const exp = bet * rnd.payoutMultiplier; // micro
    const fine = exp % 10000 !== 0; const m = /[0-9.,]+/.exec(win || ''); const val = m ? parseFloat(m[0].replace(/,/g, '')) : NaN;
    return [Math.abs(val * 1e6 - exp) < 1 && val > 0 ? PASS : FAIL, `book ${id} payoutMultiplier=${rnd.payoutMultiplier}x bet=0.01 -> exact win ${exp / 1e6}; displayed win="${win}"; balance="${bal}"`, `sub-cent payout=${fine}`];
  });


  await check('RULES', 'rules/info content: RTP + max win per mode, symbols, modes+cost, free games/retrigger, controls, disclaimer', async () => {
    const s = await sess({}); const sc = await collectScreens(s); await s.close();
    const txt = sc.filter((x) => /^info/.test(x.name)).map((x) => x.text).join('\n'); const low = txt.toLowerCase();
    const need = { 'RTP': /rtp|return to player/i, 'max win 5000x': /5,?000\s?x/i, 'Ruby': /ruby/i, 'Sapphire': /sapphire/i, 'Emerald': /emerald/i, 'Topaz': /topaz/i, 'Amethyst': /amethyst/i, 'Pickaxe': /pickaxe/i, 'Lantern': /lantern/i, 'Hard hat': /hard hat/i, 'Gold Nugget wild': /nugget/i, 'Dynamite scatter': /dynamite/i, 'cluster of 5+': /5\s?(\+|or more)|five/i, 'UNLEASH mode + 100x': /unleash[\s\S]{0,200}100/i, 'free spins': /free (spins|games)/i, 'retrigger': /retrigger/i, 'tumble': /tumble|cascade/i,
      'disclaimer: Malfunction voids all wins and plays': /malfunction voids all wins and plays/i, 'disclaimer: consistent internet connection': /consistent internet connection is required/i, 'disclaimer: TM and (c) 2026 Engine': /TM and . 2026 Engine/i, 'disclaimer: Winnings settled per RGS': /settled according to the amount received from the remote game server/i };
    const missing = Object.entries(need).filter(([, re]) => !re.test(txt)).map(([k]) => k);
    const rtps = [...txt.matchAll(/(\d{2}\.\d+)\s?%/g)].map((m) => m[1]);
    const ctl = ['spin', 'autoplay', 'turbo', 'sound', 'space'].filter((k) => !low.includes(k));
    return [missing.length ? FAIL : ctl.length ? RISK : PASS, `info text length=${txt.length}; RTP-like percentages found: ${J(rtps)}`, 'missing: ' + J(missing), 'controls not mentioned in rules text: ' + J(ctl)];
  });

  for (const lang of ['en', 'zz']) {
    await check(lang === 'en' ? 239 : 240, `lang=${lang}: no keys/undefined/NaN/{...} (all screens)`, async () => {
      const s = await sess({ lang }); const screens = await collectScreens(s);
      await s.playRound(); screens.push({ name: 'after-bet', text: await s.visibleText() });
      await mockCfg({ error: { endpoint: 'play', code: 'ERR_IPB' } }); await s.click('#btn-bet', { force: true }).catch(() => {}); await sleep(900); screens.push({ name: 'error-msg', text: await s.visibleText() }); await s.closeOverlays();
      const htmlLang = await s.page.evaluate(() => document.documentElement.lang); await s.close();
      const hits = screens.map((sc) => ({ n: sc.name, m: (sc.text.match(new RegExp(BAD_TEXT.source, 'g')) || []) })).filter((h) => h.m.length);
      const missing = screens.filter((x) => x.missing).map((x) => x.name);
      return [hits.length === 0 ? (missing.length ? RISK : PASS) : FAIL, 'screens scanned: ' + screens.map((x) => x.name).join(', '), missing.length ? 'control not found: ' + missing : null, 'hits: ' + J(hits), '<html lang>=' + htmlLang];
    });
  }

  const socialScan = async (cur) => {
    await mockCfg({ currency: cur, balance: 100000000 });
    const s = await sess({ social: 'true' }); const screens = await collectScreens(s);
    await mockCfg({ force: 'win' }); await s.playRound(); screens.push({ name: 'after-win', text: await s.visibleText() });
    for (const code of ['ERR_IPB', 'ERR_GEN', 'ERR_GLE', 'ERR_VAL']) { await mockCfg({ error: { endpoint: 'play', code } }); await s.click('#btn-bet', { force: true }).catch(() => {}); await sleep(800); screens.push({ name: 'error-' + code, text: await s.visibleText() }); await s.closeOverlays(); await s.waitIdle(8000).catch(() => {}); }
    const full = await s.allText(); const title = await s.page.title(); await s.close();
    return { screens, full, title };
  };
  await check(77, 'social=true: no restricted words in any visible text', async () => {
    const { screens, full, title } = await socialScan('XSC');
    const hits = screens.map((sc) => ({ n: sc.name, m: [...new Set((sc.text.match(restrictedRe) || []).map((x) => x.toLowerCase()))] })).filter((h) => h.m.length);
    const hid = [...new Set((full.match(restrictedRe) || []).map((x) => x.toLowerCase()))];
    const missing = screens.filter((x) => x.missing).map((x) => x.name);
    return [hits.length === 0 ? (hid.length || missing.length ? RISK : PASS) : FAIL, 'screens: ' + screens.map((x) => x.name).join(', '), 'visible hits: ' + J(hits), 'words anywhere in DOM textContent (incl. hidden panels): ' + J(hid), missing.length ? 'not found: ' + missing : null, 'title: ' + title];
  });
  await check(225, 'social=true: rules/info/autoplay/confirm wording (restricted words, same scan, rules screen only)', async () => {
    const { screens } = await socialScan('XGC');
    const sel = screens.filter((x) => /info|autoplay|unleash/.test(x.name));
    const hits = sel.map((sc) => ({ n: sc.name, m: [...new Set((sc.text.match(restrictedRe) || []).map((x) => x.toLowerCase()))], len: sc.text.length })).filter((h) => h.m.length);
    const empty = sel.filter((x) => !x.text || x.text.length < 40).map((x) => x.name);
    return [hits.length === 0 && !empty.length ? PASS : hits.length ? FAIL : RISK, 'rules/info texts scanned: ' + sel.map((x) => x.name + '(' + x.text.length + ')').join(', '), 'hits: ' + J(hits), empty.length ? 'empty/short: ' + empty : null];
  });
  await check(78, 'XSC/XGC never show "$"', async () => {
    const ev = []; let bad = 0;
    for (const cur of ['XSC', 'XGC']) { const { screens, full } = await socialScan(cur); const hits = screens.filter((sc) => /\$/.test(sc.text)).map((sc) => sc.name + ': ' + snippet((sc.text.match(/.{0,30}\$.{0,30}/) || [''])[0], 70)); const f = /\$/.test(full); if (hits.length || f) bad++; ev.push(`${cur}: visible "$" in ${J(hits)}; anywhere in DOM text=${f}`); }
    return [bad ? FAIL : PASS, ...ev];
  });

  // ---------------- replay ----------------
  const replayQ = (o = {}) => ({ replay: 'true', game: 'the_unleashed_mine', version: '1', mode: 'bonus', event: '3', amount: '1000000', sessionID: null, ...o });
  const rText = async (s) => s.visibleText();
  const findBtn = async (s, re) => { const bs = await s.page.locator('button, [role=button], a').all(); for (const b of bs) { if (!(await b.isVisible().catch(() => false))) continue; const t = ((await b.innerText().catch(() => '')) + ' ' + ((await b.getAttribute('aria-label')) || '')); if (re.test(t)) return b; } return null; };
  await check(171, 'replay: no wallet calls, GET /bet/replay/{game}/{version}/{mode}/{event}', async () => {
    const s = await sess(replayQ(), { noWait: true }); await sleep(3000); const log = await mockLog(); const play = await findBtn(s, /^\s*(play|start)/i);
    if (play) { await play.click({ timeout: 2000 }).catch(() => {}); await sleep(6000); }
    const log2 = await mockLog(); await s.close();
    const wallet = log2.filter((l) => l.path.startsWith('/wallet') || l.path.startsWith('/bet/event'));
    const gets = log2.filter((l) => l.path.startsWith('/bet/replay/'));
    return [wallet.length === 0 && gets.length >= 1 && /^\/bet\/replay\/the_unleashed_mine\/1\/bonus\/3$/.test(gets[0].path) ? PASS : FAIL, ...fmtLog(log2)];
  });
  await check(172, 'replay: Play button, no betting UI, replay-again after finish', async () => {
    await mockCfg({ delayMs: 0 });
    const s = await sess(replayQ({ mode: 'base', event: '2' }), { noWait: true }); await sleep(2500);
    const txt0 = await rText(s); const play = await findBtn(s, /play|start/i);
    const betUi = []; for (const sel of ['#btn-bet-plus', '#btn-bet-minus', '#btn-autoplay', '#btn-unleash']) if (await s.visible(sel)) betUi.push(sel);
    let again = null; if (play) { await play.click({ timeout: 2000 }).catch(() => {}); for (let i = 0; i < 40 && !again; i++) { await sleep(1000); again = await findBtn(s, /again|replay|restart/i); } }
    await s.page.screenshot({ path: path.join(SHOTS, 'qa_replay.png') }); await s.close();
    return [play && again && betUi.length === 0 ? PASS : FAIL, `Play/Start button found=${!!play}`, `replay-again button found after finish=${!!again}`, 'betting controls still visible: ' + J(betUi), 'text before play: ' + snippet(txt0, 160)];
  });
  await check(173, 'replay: bet amount shown; cost>1x shows multiplier and real cost (bonus: 100x, 100.00)', async () => {
    const s = await sess(replayQ(), { noWait: true }); await sleep(2500); const t = await rText(s); await s.close();
    const hasBet = /1\.00/.test(t); const mult = /100\s?[x×]/i.test(t); const real = /100\.00/.test(t);
    const s2 = await sess(replayQ({ mode: 'base', event: '2' }), { noWait: true }); await sleep(2500); const t2 = await rText(s2); await s2.close();
    return [hasBet && mult && real ? PASS : FAIL, `bonus replay text: ${snippet(t, 260)}`, `base replay text: ${snippet(t2, 160)}`, `bet 1.00 shown=${hasBet}, 100x shown=${mult}, real cost 100.00 shown=${real}`];
  });
  await check(174, 'replay at 400x225 fits without scroll', async () => {
    const s = await sess(replayQ(), { noWait: true, viewport: VIEWPORTS[1] }); await sleep(2500);
    const play = await findBtn(s, /play|start/i); if (play) await play.click({ timeout: 2000 }).catch(() => {}); await sleep(2500);
    const r = await s.page.evaluate(() => { const d = document.documentElement; window.scrollTo(0, 999); return { sw: d.scrollWidth, cw: d.clientWidth, sh: d.scrollHeight, ch: d.clientHeight, sy: scrollY }; });
    await s.page.screenshot({ path: path.join(SHOTS, 'qa_replay_400x225.png') }); await s.close();
    return [r.sw <= r.cw && r.sh <= r.ch && r.sy === 0 ? PASS : FAIL, J(r)];
  });
  await check(243, 'replay social=true: social wording, XSC amounts, no "$"', async () => {
    await mockCfg({ currency: 'XSC' });
    const s = await sess(replayQ({ social: 'true', currency: 'XSC' }), { noWait: true }); await sleep(2500); let t = await rText(s);
    const play = await findBtn(s, /play|start/i); if (play) { await play.click({ timeout: 2000 }).catch(() => {}); await sleep(8000); t += '\n' + (await rText(s)); }
    await s.close();
    const hits = [...new Set((t.match(restrictedRe) || []).map((x) => x.toLowerCase()))];
    return [hits.length === 0 && !/\$/.test(t) && /SC|GC/.test(t) ? PASS : FAIL, 'restricted hits: ' + J(hits), '"$" present=' + /\$/.test(t), 'text: ' + snippet(t, 220)];
  });
  await check(188, 'replay fetch failure shows a message', async () => {
    await mockCfg({ error: { endpoint: 'bet-replay', code: 'ERR_GEN', once: false } });
    const s = await sess(replayQ(), { noWait: true }); await sleep(5000); const t = await rText(s); const play = await findBtn(s, /play|start/i); await s.close();
    await mockCfg({ clearErrors: true });
    const msg = /error|unable|failed|could not|problem|try again|not found|unavailable|couldn/i.test(t);
    return [msg ? PASS : FAIL, 'text: ' + snippet(t, 220), 'Play button still offered=' + !!play];
  });


  // ---------------- displayed win == bet x payoutMultiplier/100 for every mode/category ----------------
  const WIN_CASES = [
    ['base', 'loss'], ['base', 'win'], ['base', 'bonus'], ['base', 'retrigger'], ['base', 'maxwin'],
    ['bonus', 'bonus'], ['bonus', 'retrigger'], ['bonus', 'maxwin'],
  ];
  for (const [mode, cat] of WIN_CASES) {
    await check(`WIN-${mode}-${cat}`, `${mode} mode, forced ${cat} book: displayed win == bet x payoutMultiplier/100, balance consistent`, async () => {
      const bet = 2000000; const start = 5000000000;
      await mockCfg({ balance: start, bet: { betLevels: [bet], minBet: bet, maxBet: bet, stepBet: bet, defaultBetLevel: bet } });
      const s = await sess({}, { idleMs: 20000 });
      await s.page.evaluate(() => { window.__winSeq = []; const el = document.getElementById('win'); new MutationObserver(() => window.__winSeq.push([Date.now(), el.textContent])).observe(el, { childList: true, characterData: true, subtree: true }); });
      await mockCfg({ force: { category: cat, mode } }); await mockClear();
      const t0 = Date.now();
      if (mode === 'bonus') { await s.page.evaluate(() => { if (!document.body.classList.contains('turbo')) document.querySelector('#btn-turbo')?.click(); }); await s.click('#btn-unleash', { force: true }); await sleep(500); await s.click('#confirm-ok', { force: true }).catch(() => {}); await s.waitIdle(15000).catch(() => {}); }
      await sleep(400);
      if (mode !== 'bonus') await s.playRound({ timeout: 200000 }); else { for (let i = 0; i < 100 && (await s.state()) !== 'idle'; i++) await sleep(2000); }
      const secs = Math.round((Date.now() - t0) / 1000);
      const st = await mockState(); const rnd = st.round; const log = await mockLog();
      const winTxt = await s.text('#win'); const balTxt = await s.text('#balance'); const seq = await s.page.evaluate(() => window.__winSeq);
      const idle = (await s.state()) === 'idle';
      await s.page.screenshot({ path: path.join(SHOTS, `qa_win_${mode}_${cat}.png`) });
      await s.close();
      const expMicro = Math.round(bet * rnd.payoutMultiplier); const cost = bet * (mode === 'bonus' ? 100 : 1);
      const expBal = start - cost + (rnd.payoutMultiplier > 0 ? expMicro : 0);
      const fmt = (m) => '$' + (m / 1e6).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      const endAt = ends(log)[0]?.t; const preEnd = endAt ? seq.filter((x) => x[0] <= endAt).map((x) => x[1]) : seq.map((x) => x[1]);
      const lastBeforeEnd = preEnd[preEnd.length - 1];
      const shownOk = (winTxt || '').replace(/\s/g, '') === fmt(expMicro);
      const balOk = (balTxt || '').replace(/\s/g, '') === fmt(expBal);
      const rendererOk = rnd.payoutMultiplier === 0 || (lastBeforeEnd || '').replace(/\s/g, '') === fmt(expMicro);
      const endOk = rnd.payoutMultiplier > 0 ? ends(log).length === 1 : ends(log).length === 0;
      const maxOk = cat !== 'maxwin' || rnd.payoutMultiplier === 5000;
      return [shownOk && balOk && rendererOk && endOk && idle && maxOk ? PASS : (shownOk && balOk && endOk && idle ? RISK : FAIL),
        `book ${rnd.bookId} payoutMultiplier=${rnd.payoutMultiplier}x bet=${fmt(bet)} -> expected win ${fmt(expMicro)}; displayed win=${winTxt}; balance ${balTxt} (expected ${fmt(expBal)}); round took ${secs}s; final state idle=${idle}`,
        `renderer's last #win value before end-round request: ${lastBeforeEnd} (${rendererOk ? 'matches' : 'DIFFERS from server payout'}); #win values seen: ${J(seq.map((x) => x[1]).filter((v, i, a) => a.indexOf(v) === i).slice(-8))}`,
        `end-round calls=${ends(log).length} (expected ${rnd.payoutMultiplier > 0 ? 1 : 0})`];
    });
  }

  // ---------------- global ----------------
  await check('EXT', 'no requests to external hosts (all sessions)', async () => {
    const ext = allSessions.flatMap((s) => s.externalReqs()).filter((r) => !/example\.com|rgs\.test/.test(r.url)).map((r) => r.url);
    return [ext.length ? FAIL : PASS, `sessions=${allSessions.length}`, 'external: ' + J([...new Set(ext)].slice(0, 10))];
  });
  await check('CONSOLE', 'no console errors / page errors during launch/play/replay', async () => {
    const ce = [...new Set(allSessions.flatMap((s) => s.consoleErrors))].filter((m) => !/Failed to load resource.*(404|400|500)|ERR_FAILED|example\.com|rgs\.test/.test(m));
    const pe = [...new Set(allSessions.flatMap((s) => s.pageErrors))];
    const fl = [...new Set(allSessions.flatMap((s) => s.failed).filter((f) => !/example\.com|rgs\.test/.test(f.url)).map((f) => f.err + ' ' + f.url))];
    return [ce.length || pe.length ? FAIL : fl.length ? RISK : PASS, 'console errors: ' + J(ce.slice(0, 6)), 'page errors: ' + J(pe.slice(0, 6)), 'failed requests: ' + J(fl.slice(0, 6))];
  });

  await browser.close(); stopServers();
  writeReport(stat, true);
}

function writeReport(stat, ran) {
  const order = (r) => (isNaN(+r.id) ? 1e6 : +r.id);
  const rs = [...results].sort((a, b) => order(a) - order(b));
  const count = (st) => rs.filter((r) => r.status === st).length;
  let md = `# Engine guideline QA report\n\nGenerated ${new Date().toISOString()} by \`node tests/guidelines/run.mjs\`. Mock RGS books: ${ran ? 'see mock state' : 'n/a'}.\n\n`;
  md += ran ? `Totals: ${count(PASS)} PASS, ${count(FAIL)} FAIL, ${count(RISK)} AT RISK, ${count(HUMAN)} NEEDS A HUMAN.\n\n` : '**Game files were not ready; browser checks skipped.**\n\n';
  md += '## Verdicts\n\n| Id | Check | Verdict |\n|---|---|---|\n' + rs.map((r) => `| ${r.id} | ${r.title} | **${r.status}** |`).join('\n') + '\n\n## Evidence\n\n';
  md += rs.map((r) => `### [${r.id}] ${r.title} - ${r.status}\n\n${r.evidence.map((e) => '- ' + String(e).replace(/\|/g, '\\|')).join('\n')}\n`).join('\n');
  md += '\n## Static code review\n\n' + stat.map((s) => `### ${s.title} - ${s.status}\n\n${s.lines.length ? s.lines.map((l) => '- ' + l).join('\n') : '- none found'}\n`).join('\n');
  md += '\n## NEEDS A HUMAN (always)\n\n- Real audio audibility on a device (graph-level mute is checked above).\n- Visual quality of the four screenshots in `tests/shots/qa_*.png`.\n- Touch behaviour on a real phone (pinch/double-tap zoom).\n';
  fs.writeFileSync(path.join(HERE, 'REPORT.md'), md);
  console.log('\nreport written to tests/guidelines/REPORT.md');
  for (const s of stat) console.log(`${s.status.padEnd(14)} static: ${s.title} (${s.lines.length} lines)`);
  console.log(`\nTOTAL: ${count(PASS)} PASS, ${count(FAIL)} FAIL, ${count(RISK)} AT RISK, ${count(HUMAN)} HUMAN`);
}
main().catch((e) => { console.error(e); stopServers(); process.exit(1); });
