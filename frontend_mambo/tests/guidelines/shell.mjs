// Agent Mambo v2 SHELL checks (WP1): settings dialog, flags, replay gear, heroine box, session summary, entrance picker.
//   node tests/guidelines/shell.mjs [--only=G1,G3,FLAGS]     (own servers on random free ports; PORTS="game,rgs" to choose)
//   env QA_REPORT=<file> (default tests/guidelines/REPORT_shell.md)   QA_SHOTS=<dir> (screenshots; default none)
// G1 settings dialog in every screen scan, G2 four viewports (no page scroll, fits), G3 targets >= 24 px, G4 focus in / out,
// G5 no wallet call while it is open, G6 replay gear, G7 keyboard, G8 social scan with XSC. Extras: FLAGS (all 12 jurisdiction
// flags), HERO (the heroine box never overlaps the grid or a button), MOTION, LEDGER, PICKER (door cards), PACE (minimum round).
// Uses the helpers of lib.mjs (WP10) read-only. `runShellChecks(h)` is exported so the main runner can call it later.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  FRONT, setSid, VIEWPORTS, loadPlaywright, ensureServers, stopServers, Session, mockCfg, mockReset, mockLog, mockClear, mockState, plays, sleep, snippet, HERE,
} from './lib.mjs';

const PASS = 'PASS', FAIL = 'FAIL', RISK = 'AT RISK';
const J = JSON.stringify;
const RESTRICTED = ['bet', 'bets', 'betting', 'bonus buy', 'bought', 'buy', 'cash', 'cost of', 'credit', 'currency', 'deposit', 'fund', 'gamble', 'money', 'paid', 'pay', 'pays', 'payer', 'paytable', 'pay table', 'purchase', 'rebet', 'stake', 'total bet', 'wager', 'withdraw', 'win feature', 'place your bets', 'at the cost of'];
export const restrictedRe = new RegExp('(?<![A-Za-z])(' + RESTRICTED.map((w) => w.replace(/ /g, '\\s+')).join('|') + ')(?![A-Za-z])', 'gi');
export const BAD_TEXT = /\bundefined\b|\bNaN\b|\[object|\{\{?\s*\w+\s*\}?\}|\bnull\b|(?:^|[^\w.])(?:btn|err|label|autoplay|unleash|round|rules|info|replay|menu|win|title|msg|ui|game|sym|mode|settings|ledger|door|help)\.[A-Za-z_][\w]*(?:\.[\w]+)*(?![\w@])/;
const TABS = ['sound', 'display', 'play', 'info'];
const SHOTS_DIR = process.env.QA_SHOTS || '';
const REPORT = process.env.QA_REPORT || path.join(HERE, 'REPORT_shell.md');
const ONLY_S = process.env.QA_ONLY || (process.argv.find((a) => a.startsWith('--only=')) || '').split('=')[1] || '';
const ONLY = ONLY_S ? ONLY_S.split(',').map((x) => x.trim()).filter(Boolean) : null;

const results = [];
const allSessions = [];
let browser;
async function sess(query, o) { const s = new Session(browser); allSessions.push(s); await s.open(query, o); return s; }
function rec(id, title, status, ...evidence) { results.push({ id, title, status, evidence: evidence.flat().filter(Boolean) }); console.log(`${status.padEnd(8)} [${id}] ${title}\n    ${evidence.flat().filter(Boolean).join('\n    ')}`); }
async function check(id, title, fn) {
  if (ONLY && !ONLY.includes(String(id))) return;
  try { setSid('sh-' + id); await mockReset(); await mockClear(); const r = await fn(); if (r) rec(id, title, r[0], r.slice(1)); }
  catch (e) { rec(id, title, FAIL, 'runner exception: ' + snippet(e.stack || e.message, 500)); }
}
const shot = async (s, name) => {
  if (!SHOTS_DIR) return;
  fs.mkdirSync(SHOTS_DIR, { recursive: true });
  await s.page.waitForFunction(() => { const l = document.getElementById('loading'); return !l || getComputedStyle(l).visibility === 'hidden'; }, null, { timeout: 4000 }).catch(() => {}); // the loading screen fades out after idle
  await s.page.screenshot({ path: path.join(SHOTS_DIR, name + '.png') });
};
const isCompact = (vp) => vp.height <= 360 && vp.width > vp.height;

// opens the dialog the way a player does (gear; at height <= 360 px the menu first)
async function openSettings(s, vp, via = 'click') {
  if (isCompact(vp) && !(await s.page.evaluate(() => document.getElementById('hud-ctrl').classList.contains('menu-open')))) { await s.page.click('#btn-menu'); await sleep(150); }
  if (via === 'key') { await s.page.focus('#btn-settings'); await s.page.keyboard.press('Enter'); }
  else await s.page.click('#btn-settings');
  await s.page.waitForSelector('#modal-settings.open', { timeout: 3000 });
  await sleep(150);
}
const tabText = async (s, tab) => { await s.page.click('#st-tab-' + tab); await sleep(tab === 'info' ? 700 : 120); if (tab === 'info') await s.page.evaluate(() => document.querySelectorAll('#modal-settings details').forEach((d) => { d.open = true; })); return s.page.evaluate(() => { const m = document.querySelector('#modal-settings'); return m.innerText + '\n' + [...m.querySelectorAll('[title],[aria-label],[aria-valuetext]')].map((e) => [e.title, e.getAttribute('aria-label'), e.getAttribute('aria-valuetext')].filter(Boolean).join(' | ')).join('\n'); }); };
const vis = (s, sel) => s.page.evaluate((q) => { const e = document.querySelector(q); if (!e) return false; const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.display !== 'none' && cs.visibility !== 'hidden'; }, sel);

export async function runShellChecks() {
  await check('G1', 'settings dialog in every screen scan: 4 tabs, no keys / undefined / NaN, rules text present (lang en and zz)', async () => {
    const ev = []; let bad = 0;
    for (const lang of ['en', 'zz']) {
      const s = await sess({ lang });
      await openSettings(s, VIEWPORTS[0]);
      const tabs = await s.page.locator('#modal-settings [role=tab]').count();
      const sel = await s.page.locator('#modal-settings [role=tab][aria-selected=true]').count();
      const role = await s.page.evaluate(() => { const m = document.querySelector('#modal-settings'); return [m.getAttribute('role'), m.getAttribute('aria-modal'), !!document.getElementById(m.getAttribute('aria-labelledby'))]; });
      let all = '';
      for (const t of TABS) { const tx = await tabText(s, t); all += '\n' + tx; const m = tx.match(new RegExp(BAD_TEXT.source, 'g')) || []; if (m.length) { bad++; ev.push(`${lang} tab ${t}: ${J(m.slice(0, 4))}`); } }
      const need = { 'Mute sound': /mute sound/i, 'Master volume': /master volume/i, 'Music': /\bmusic\b/i, 'Effects': /effects/i, 'Motion': /\bmotion\b/i, 'Screen flash effects': /screen flash effects/i, 'High contrast': /high contrast/i, 'Session summary': /session summary/i, 'Turbo': /\bturbo\b/i, 'Autoplay': /autoplay/i, 'RTP text': /rtp/i, 'Paytable/Win table': /paytable|win table/i, 'Controls': /controls/i, 'Modes and RTP': /modes and rtp/i, 'disclaimer': /malfunction voids all wins and plays/i, 'version': /version/i };
      const missing = Object.entries(need).filter(([, re]) => !re.test(all)).map(([k]) => k);
      if (missing.length) { bad++; ev.push(`${lang}: missing ${J(missing)}`); }
      ev.push(`${lang}: tabs=${tabs} selected=${sel} dialog role/aria-modal/labelledby=${J(role)} text length=${all.length}`);
      if (tabs !== 4 || sel !== 1 || role[0] !== 'dialog' || role[1] !== 'true' || !role[2]) bad++;
      await s.close();
    }
    return [bad ? FAIL : PASS, ...ev];
  });

  await check('G2', 'settings dialog fits at 4 viewports on every tab: no page scroll, dialog inside the screen, internal scroll only', async () => {
    const ev = []; let bad = 0;
    for (const vp of VIEWPORTS) {
      const s = await sess({}, { viewport: vp });
      await openSettings(s, vp);
      for (const t of TABS) {
        await s.page.click('#st-tab-' + t); await sleep(t === 'info' ? 700 : 100);
        if (t === 'info') await s.page.evaluate(() => document.querySelectorAll('#modal-settings details').forEach((d) => { d.open = true; }));
        await s.page.evaluate(() => { const b = document.querySelector('#modal-settings .st-body'); if (b) b.scrollTop = 99999; window.scrollTo(0, 99999); });
        const r = await s.page.evaluate(() => { const d = document.documentElement; const b = document.querySelector('#modal-settings .modal-box').getBoundingClientRect(); const body = document.querySelector('#modal-settings .st-body'); return { box: [Math.round(b.left), Math.round(b.top), Math.round(b.right), Math.round(b.bottom)], iw: innerWidth, ih: innerHeight, sw: d.scrollWidth, sh: d.scrollHeight, sx: scrollX, sy: scrollY, bodyScrolls: body.scrollHeight > body.clientHeight + 1, bodyOverflowX: body.scrollWidth > body.clientWidth + 1 }; });
        const fail = r.sw > r.iw || r.sh > r.ih || r.sx !== 0 || r.sy !== 0 || r.box[0] < 0 || r.box[1] < 0 || r.box[2] > r.iw || r.box[3] > r.ih || r.bodyOverflowX;
        if (fail) bad++;
        ev.push(`${vp.name} ${t}: box ${J(r.box)} in ${r.iw}x${r.ih}, doc ${r.sw}x${r.sh}, internal scroll=${r.bodyScrolls}${fail ? ' <-- FAIL' : ''}`);
        await shot(s, `shell_dialog_${vp.name}_${t}`);
      }
      await s.close();
    }
    return [bad ? FAIL : PASS, ...ev];
  });

  await check('G3', 'every control of the dialog, the gear and the replay gear is at least 24 x 24 CSS px (WCAG 2.5.8)', async () => {
    const ev = []; let bad = 0;
    for (const vp of VIEWPORTS) {
      const s = await sess({}, { viewport: vp });
      const gear = await s.page.evaluate(() => { const e = document.getElementById('btn-settings'); const r = e.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; });
      // the gear sits inside the menu at <= 360 px high: measure it open
      if (isCompact(vp)) await s.page.click('#btn-menu');
      const gear2 = await s.page.evaluate(() => { const e = document.getElementById('btn-settings'); const r = e.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; });
      if (isCompact(vp)) await s.page.click('#btn-menu');
      await openSettings(s, vp);
      const small = [];
      for (const t of TABS) {
        await s.page.click('#st-tab-' + t); await sleep(t === 'info' ? 700 : 100);
        if (t === 'info') await s.page.evaluate(() => document.querySelectorAll('#modal-settings details').forEach((d) => { d.open = true; }));
        const list = await s.page.evaluate(() => [...document.querySelectorAll('#modal-settings button, #modal-settings input, #modal-settings summary, #modal-settings [role=tab], #modal-settings a[href]')].filter((e) => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && !e.closest('[hidden]') && e.offsetParent !== null; }).map((e) => ({ id: e.id || e.className || e.tagName, w: Math.round(e.getBoundingClientRect().width), h: Math.round(e.getBoundingClientRect().height) })));
        for (const e of list) if (e.w < 24 || e.h < 24) small.push(`${t}:${e.id} ${e.w}x${e.h}`);
        ev.push(`${vp.name} ${t}: ${list.length} controls, smallest ${Math.min(...list.map((e) => Math.min(e.w, e.h)))} px`);
      }
      const ok = small.length === 0 && gear2[0] >= 24 && gear2[1] >= 24;
      if (!ok) bad++;
      ev.push(`${vp.name}: gear ${J(gear)} (menu open ${J(gear2)}) too small: ${J(small)}`);
      await s.close();
    }
    return [bad ? FAIL : PASS, ...ev];
  });

  await check('G4', 'focus moves into the dialog, Tab stays inside, Escape / Close / backdrop return it to the opener (also from the compact menu)', async () => {
    const ev = []; let bad = 0;
    const active = (s) => s.page.evaluate(() => { const a = document.activeElement; return a ? (a.id || a.tagName) : null; });
    const inside = (s) => s.page.evaluate(() => document.querySelector('#modal-settings').contains(document.activeElement));
    for (const vp of [VIEWPORTS[0], VIEWPORTS[2]]) {
      const s = await sess({}, { viewport: vp });
      for (const how of ['Escape', 'close', 'backdrop']) {
        await openSettings(s, vp, how === 'Escape' ? 'key' : 'click');
        const fin = await inside(s) && (await active(s)) === 'st-tab-sound';
        for (let i = 0; i < 16; i++) await s.page.keyboard.press('Tab');
        const trapped = await inside(s);
        for (let i = 0; i < 16; i++) await s.page.keyboard.press('Shift+Tab');
        const trapped2 = await inside(s);
        if (how === 'Escape') await s.page.keyboard.press('Escape');
        else if (how === 'close') await s.page.click('#st-close');
        else await s.page.mouse.click(2, 2);
        await sleep(250);
        const closed = !(await s.page.evaluate(() => document.querySelector('#modal-settings').classList.contains('open')));
        const back = await active(s);
        const want = 'btn-settings';
        const inertLeft = await s.page.evaluate(() => !!document.querySelector('[inert]'));
        const ok = fin && trapped && trapped2 && closed && back === want && !inertLeft;
        if (!ok) bad++;
        ev.push(`${vp.name} close by ${how}: focus in=${fin} Tab trapped=${trapped}/${trapped2} closed=${closed} focus after=${back} (want ${want}) inert left=${inertLeft}${ok ? '' : ' <-- FAIL'}`);
      }
      await s.close();
    }
    // the other dialogs follow the same rule (autoplay panel, Secret Entrance confirm)
    const s = await sess({});
    await s.click('#btn-autoplay'); await sleep(250);
    const apIn = await s.page.evaluate(() => document.querySelector('#modal-autoplay').contains(document.activeElement));
    await s.page.keyboard.press('Escape'); await sleep(250);
    const apBack = await active(s);
    await s.click('#btn-unleash'); await sleep(250);
    const cfFocus = await active(s);
    await s.page.keyboard.press('Escape'); await sleep(250);
    const cfBack = await active(s);
    const ok2 = apIn && apBack === 'btn-autoplay' && cfFocus === 'confirm-cancel' && cfBack === 'btn-unleash';
    if (!ok2) bad++;
    ev.push(`autoplay panel: focus in=${apIn}, Escape returns to ${apBack}; Secret Entrance confirm: focus on ${cfFocus}, Escape returns to ${cfBack}${ok2 ? '' : ' <-- FAIL'}`);
    await s.close();
    return [bad ? FAIL : PASS, ...ev];
  });

  await check('G5', 'no wallet call (or any RGS call) while the dialog is open: every control, Space, Enter; Space never spins; nothing starts behind it', async () => {
    const s = await sess({}); await mockClear();
    await openSettings(s, VIEWPORTS[0]);
    await s.page.click('#st-mute'); await s.page.click('#st-mute');
    await s.page.focus('#st-vol-master'); await s.page.keyboard.press('ArrowLeft'); await s.page.keyboard.press('End');
    await s.page.click('#st-tab-display'); await s.page.click('#st-motion-calm', { force: true }); await s.page.click('#st-flash'); await s.page.click('#st-contrast'); await s.page.click('#st-ledger');
    await s.page.click('#st-tab-play'); await s.page.click('#st-turbo');
    await s.page.evaluate(() => document.activeElement && document.activeElement.blur());
    await s.page.keyboard.press('Space'); await s.page.keyboard.press('Enter'); await s.page.keyboard.press('Space');
    await s.page.click('#st-tab-info'); await sleep(800);
    await sleep(1200);
    const log = await mockLog();
    const st = await s.state();
    // autoplay running when the dialog opens: the loop waits until it is closed
    await s.page.click('#st-close'); await sleep(200);
    await mockClear();
    await mockCfg({ force: 'loss' });
    await s.page.click('#btn-autoplay'); await s.page.selectOption('#ap-count', '10'); await s.page.click('#ap-confirm');
    await s.page.waitForFunction(() => document.body.classList.contains('autoplay'), null, { timeout: 3000 }).catch(() => {});
    await sleep(300);
    await s.page.click('#btn-settings'); await sleep(250);
    await s.page.waitForFunction(() => document.body.classList.contains('state-idle'), null, { timeout: 15000, polling: 50 }).catch(() => {});
    const n0 = plays(await mockLog()).length; await sleep(2500); const n1 = plays(await mockLog()).length;
    await s.page.keyboard.press('Escape'); await sleep(200);
    await s.page.click('#btn-autoplay'); // stops autoplay
    await s.waitIdle(30000).catch(() => {});
    const pass = log.length === 0 && st === 'idle' && n1 === n0;
    return [pass ? PASS : FAIL, `RGS calls while the dialog was used: ${log.length} ${J(log.map((l) => l.path))}`, `state after: ${st}`, `autoplay + dialog open: plays ${n0} -> ${n1} over 2.5 s (must not grow)`];
  });

  await check('G6', 'replay: the settings gear is available at 4 viewports (also where the HUD column is hidden), opens the dialog, no wallet call', async () => {
    const ev = []; let bad = 0;
    const q = { replay: 'true', game: 'the_unleashed_mine', version: '1', mode: 'bonus', event: '3', amount: '1000000', sessionID: null };
    for (const vp of VIEWPORTS) {
      const s = await sess(q, { viewport: vp, noWait: true });
      await s.page.waitForFunction(() => { const b = document.querySelector('#replay-btn'); return b && !b.disabled; }, null, { timeout: 8000 }).catch(() => {});
      await sleep(300);
      const g = await s.page.evaluate(() => { const e = document.getElementById('replay-settings'); if (!e) return null; const r = e.getBoundingClientRect(); const top = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return { w: Math.round(r.width), h: Math.round(r.height), hit: top === e || e.contains(top), label: e.getAttribute('aria-label'), popup: e.getAttribute('aria-haspopup') }; });
      let opened = false, back = null, tabs = 0, muted = false;
      if (g) {
        await s.page.click('#replay-settings'); await s.page.waitForSelector('#modal-settings.open', { timeout: 3000 }).catch(() => {});
        opened = await s.page.evaluate(() => document.querySelector('#modal-settings').classList.contains('open'));
        tabs = await s.page.locator('#modal-settings [role=tab]:visible').count();
        await s.page.click('#st-mute').catch(() => {}); muted = await s.page.evaluate(() => document.body.classList.contains('muted')); await s.page.click('#st-mute').catch(() => {});
        await s.page.keyboard.press('Escape'); await sleep(200);
        back = await s.page.evaluate(() => document.activeElement && document.activeElement.id);
      }
      const log = await mockLog();
      const wallet = log.filter((l) => l.path.startsWith('/wallet') || l.path.startsWith('/bet/event'));
      const ok = g && g.w >= 24 && g.h >= 24 && g.hit && g.popup === 'dialog' && opened && tabs === 3 && muted && back === 'replay-settings' && wallet.length === 0;
      if (!ok) bad++;
      ev.push(`${vp.name}: gear ${g ? g.w + 'x' + g.h : 'MISSING'} clickable=${g && g.hit} label="${g && g.label}" dialog opened=${opened} tabs=${tabs} mute works=${muted} focus back=${back} wallet calls=${wallet.length}${ok ? '' : ' <-- FAIL'}`);
      await shot(s, `shell_replay_${vp.name}`);
      await s.close();
    }
    return [bad ? FAIL : PASS, ...ev];
  });

  await check('G7', 'keyboard: gear by Enter, arrows / Home / End on tabs, Space toggles a switch (never a spin), arrows and Home / End on sliders, radios by arrows', async () => {
    const ev = []; let bad = 0; const note = (ok, m) => { if (!ok) bad++; ev.push((ok ? 'ok   ' : 'FAIL ') + m); };
    const s = await sess({}); await mockClear();
    const active = () => s.page.evaluate(() => { const a = document.activeElement; return a ? (a.id || a.tagName) : null; });
    await openSettings(s, VIEWPORTS[0], 'key');
    note((await active()) === 'st-tab-sound', 'Enter on the gear opens the dialog, focus on the selected tab');
    await s.page.keyboard.press('ArrowRight'); note((await active()) === 'st-tab-display' && (await s.page.getAttribute('#st-tab-display', 'aria-selected')) === 'true', 'ArrowRight -> Display (automatic activation)');
    await s.page.keyboard.press('End'); note((await active()) === 'st-tab-info', 'End -> Info');
    await s.page.keyboard.press('ArrowRight'); note((await active()) === 'st-tab-sound', 'ArrowRight wraps to Sound');
    await s.page.keyboard.press('Home'); note((await active()) === 'st-tab-sound', 'Home -> Sound');
    await s.page.focus('#st-mute'); await s.page.keyboard.press('Space'); await sleep(100);
    note((await s.page.getAttribute('#st-mute', 'aria-checked')) === 'true' && (await s.page.evaluate(() => document.body.classList.contains('muted'))), 'Space toggles the mute switch (and the sound button follows)');
    await s.page.keyboard.press('Enter'); await sleep(100); note((await s.page.getAttribute('#st-mute', 'aria-checked')) === 'false', 'Enter toggles it back');
    const vol = () => s.page.evaluate(() => import('/src/audio.js').then((m) => m.audio.getVolume('sfx')));
    await s.page.focus('#st-vol-sfx'); await s.page.keyboard.press('ArrowRight'); await s.page.keyboard.press('ArrowRight'); note((await vol()) === 77, 'slider ArrowRight x2 -> 77');
    await s.page.keyboard.press('PageDown'); const pd = await vol(); note(pd < 77, 'PageDown lowers further (' + pd + ')');
    await s.page.keyboard.press('End'); note((await vol()) === 100, 'End -> 100'); await s.page.keyboard.press('Home'); note((await vol()) === 0, 'Home -> 0');
    note((await s.page.getAttribute('#st-vol-sfx', 'aria-valuetext')) === 'Off', 'aria-valuetext at 0 is "Off"');
    await s.page.keyboard.press('End'); await s.page.keyboard.press('ArrowLeft'); await s.page.keyboard.press('Home'); await s.page.keyboard.press('PageUp');
    await s.page.keyboard.press('Home'); await s.page.keyboard.press('End'); await s.page.keyboard.press('ArrowLeft'); // leave sfx at 99 -> reset below
    await s.page.evaluate(() => import('/src/audio.js').then((m) => m.audio.setVolume('sfx', 75)));
    await s.page.click('#st-tab-display');
    await s.page.focus('#st-motion-auto'); await s.page.keyboard.press('ArrowRight'); await sleep(100);
    note((await s.page.evaluate(() => document.documentElement.getAttribute('data-motion'))) === 'full' && (await active()) === 'st-motion-full', 'radio group: ArrowRight picks Full');
    await s.page.keyboard.press('ArrowRight'); await s.page.keyboard.press('ArrowRight'); note((await s.page.evaluate(() => document.documentElement.getAttribute('data-motion'))) === 'still', 'two more arrows -> Still (data-motion=still)');
    // Tab reaches every control of the visible tab
    await s.page.focus('#st-tab-display');
    const seen = new Set(); for (let i = 0; i < 12; i++) { await s.page.keyboard.press('Tab'); seen.add(await active()); }
    const want = ['st-motion-still', 'st-flash', 'st-contrast', 'st-ledger'];
    note(want.every((w) => seen.has(w) || (w === 'st-motion-still' && [...seen].some((x) => /^st-motion-/.test(x)))), 'Tab reaches the display controls: ' + [...seen].join(','));
    await s.page.evaluate(() => document.activeElement && document.activeElement.blur());
    await s.page.keyboard.press('Space'); await sleep(500);
    note(plays(await mockLog()).length === 0, 'Space with nothing focused inside the dialog starts no round');
    await s.page.keyboard.press('Escape'); await sleep(200);
    note((await active()) === 'btn-settings', 'Escape closes, focus back on the gear');
    await s.page.keyboard.press('Space'); await sleep(800);
    note(plays(await mockLog()).length === 1, 'Space spins again once the dialog is closed (a round per press, no double)');
    return [bad ? FAIL : PASS, ...ev];
  });

  await check('G8', 'social=true, currency XSC: dialog (all tabs), summary, door cards and gear have no restricted word and no "$"', async () => {
    const ev = []; let bad = 0;
    await mockCfg({ currency: 'XSC', balance: 100000000 });
    const doors = await doctoredRules();
    const s = await sess({ social: 'true' }, { routes: (ctx) => ctx.route('**/data/rules_data.json', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: J(doors) })) });
    let all = await s.visibleText();
    await openSettings(s, VIEWPORTS[0]);
    for (const t of TABS) all += '\n' + (await tabText(s, t));
    await s.page.keyboard.press('Escape'); await sleep(200);
    await s.click('#btn-unleash'); await s.page.waitForSelector('#modal-confirm.open', { timeout: 3000 }).catch(() => {});
    all += '\n' + (await s.visibleText());
    await s.page.keyboard.press('Escape');
    const hits = [...new Set((all.match(restrictedRe) || []).map((x) => x.toLowerCase()))];
    const dollar = /\$/.test(all);
    const sc = /SC\b/.test(all);
    const doorsShown = /Coat Check/.test(all) && /Service Stairs/.test(all);
    if (hits.length || dollar || !sc || !doorsShown) bad++;
    ev.push(`restricted words: ${J(hits)}; "$" present: ${dollar}; SC amounts shown: ${sc}; three door cards scanned: ${doorsShown}; text length ${all.length}`);
    await s.close();
    return [bad ? FAIL : PASS, ...ev];
  });

  await check('FLAGS', 'all 12 jurisdiction flags honoured by the shell (each flag alone)', async () => {
    const ev = []; let bad = 0; const note = (ok, m) => { if (!ok) bad++; ev.push((ok ? 'ok   ' : 'FAIL ') + m); };
    let n = 0;
    // a fresh mock session per case: the mock MERGES jurisdiction flags inside a session, so cases must not share one
    const withFlags = async (flags, fn, q = {}, o = {}) => { setSid('sh-FLAGS-' + (++n)); await mockReset(); await mockCfg({ jurisdiction: flags, force: 'loss' }); const s = await sess(q, o); try { await fn(s); } finally { await s.close(); } };
    await withFlags({ disabledFullscreen: true }, async (s) => note(!(await vis(s, '#btn-fullscreen')) && (await vis(s, '#btn-turbo')) && (await vis(s, '#btn-autoplay')) && (await vis(s, '#btn-unleash')), 'disabledFullscreen hides the fullscreen button only'));
    await withFlags({ disabledTurbo: true }, async (s) => { note(!(await vis(s, '#btn-turbo')), 'disabledTurbo hides the turbo button'); await openSettings(s, VIEWPORTS[0]); await s.page.click('#st-tab-play'); note(!(await vis(s, '[data-row=turbo]')) && (await vis(s, '[data-row=autoplay]')), '... and the Turbo row of the Play tab only'); });
    await withFlags({ disabledAutoplay: true }, async (s) => { note(!(await vis(s, '#btn-autoplay')), 'disabledAutoplay hides the autoplay button'); await openSettings(s, VIEWPORTS[0]); await s.page.click('#st-tab-play'); note((await vis(s, '[data-row=turbo]')) && !(await vis(s, '[data-row=autoplay]')), '... and the Autoplay row only'); });
    await withFlags({ disabledAutoplay: true, disabledTurbo: true }, async (s) => { await openSettings(s, VIEWPORTS[0]); note(!(await vis(s, '#st-tab-play')) && (await s.page.locator('#modal-settings [role=tab]:visible').count()) === 3, 'both shortcuts off: the Play tab disappears (3 tabs)'); });
    await withFlags({ disabledBuyFeature: true }, async (s) => note(!(await vis(s, '#btn-unleash')) && (await s.page.evaluate(() => document.getElementById('btn-unleash').disabled)), 'disabledBuyFeature hides and disables the Secret Entrance button (so no dialog, no doors)'));
    await withFlags({ disabledSlamstop: true }, async (s) => note((await s.page.evaluate(() => import('/src/settings.js').then((m) => m.settings.capabilities.slamstop))) === false && (await s.page.evaluate(() => document.body.classList.contains('no-slam'))), 'disabledSlamstop -> capabilities.slamstop=false and body.no-slam (the event player, WP4, reads it)'));
    await withFlags({ disabledSuperTurbo: true }, async (s) => { note((await s.page.evaluate(() => import('/src/settings.js').then((m) => m.settings.capabilities.superTurbo))) === false, 'disabledSuperTurbo -> capabilities.superTurbo=false'); });
    // replay SKIP follows superTurbo (replay itself never gets flags from the RGS: applied through the store)
    {
      const q = { replay: 'true', game: 'the_unleashed_mine', version: '1', mode: 'bonus', event: '3', amount: '1000000', sessionID: null };
      const s = await sess(q, { noWait: true }); await sleep(800);
      const before = await vis(s, '#replay-skip');
      await s.page.evaluate(() => import('/src/settings.js').then((m) => m.settings.applyJurisdiction({ disabledSuperTurbo: true })));
      const after = await vis(s, '#replay-skip'); const turbo = await vis(s, '#replay-turbo');
      note(before && !after && turbo, `replay: SKIP shown=${before}; with disabledSuperTurbo SKIP=${after}, TURBO stays=${turbo}`);
      await s.close();
    }
    await withFlags({ disabledSpacebar: true }, async (s) => {
      await s.page.evaluate(() => document.activeElement && document.activeElement.blur()); await s.page.keyboard.press('Space'); await sleep(600);
      const a = plays(await mockLog()).length;
      await s.page.focus('#btn-bet'); await s.page.keyboard.press('Space'); await sleep(600);
      const b = plays(await mockLog()).length;
      const prevented = await s.page.evaluate(() => window.__qa.keys.filter((k) => k.code === 'Space').every((k) => k.prevented));
      note(a === 0 && b === 0 && prevented, `disabledSpacebar: Space starts nothing (${a}, with SPIN focused ${b}), keydown prevented=${prevented}`);
      await s.page.keyboard.press('Enter'); await sleep(900);
      note(plays(await mockLog()).length === 1, 'disabledSpacebar: Enter on SPIN still works');
    });
    for (const flag of ['displayNetPosition', 'displaySessionTimer']) {
      await withFlags({ [flag]: true }, async (s) => {
        await s.page.evaluate(() => { try { localStorage.setItem('am_settings', JSON.stringify({ v: 1, ledger: false })); } catch (e) {} });
        await s.page.reload(); await s.waitIdle(15000).catch(() => {}); await sleep(300);
        const shown = await vis(s, '#ledger');
        await openSettings(s, VIEWPORTS[0]); await s.page.click('#st-tab-display');
        const locked = (await s.page.getAttribute('#st-ledger', 'aria-disabled')) === 'true' && (await s.page.getAttribute('#st-ledger', 'aria-checked')) === 'true';
        await s.page.click('#st-ledger', { force: true });
        const still = (await s.page.getAttribute('#st-ledger', 'aria-checked')) === 'true' && (await vis(s, '#ledger'));
        note(shown && locked && still, `${flag}: summary shown even though the player switched it off (${shown}), switch locked on (${locked}), cannot be switched off (${still})`);
      });
    }
    await withFlags({ displayRTP: true }, async (s) => { await openSettings(s, VIEWPORTS[0]); await s.page.click('#st-tab-info'); await sleep(800); const t = await s.page.evaluate(() => { const e = document.getElementById('st-rtp'); return e && !e.hidden ? e.textContent : null; }); note(!!t && /\d\d\.\d\d%/.test(t), 'displayRTP: RTP line in the Info tab: ' + t); });
    await withFlags({}, async (s) => { await openSettings(s, VIEWPORTS[0]); await s.page.click('#st-tab-info'); await sleep(800); note(await s.page.evaluate(() => document.getElementById('st-rtp').hidden), 'no displayRTP: no RTP line (the Modes and RTP section is always there)'); });
    await withFlags({ minimumRoundDuration: 2500 }, async (s) => {
      await s.page.click('#btn-turbo'); const t0 = Date.now(); await s.page.click('#btn-bet');
      await s.page.waitForFunction(() => !document.body.classList.contains('state-idle'), null, { timeout: 3000, polling: 20 }).catch(() => {});
      await s.page.waitForFunction(() => document.body.classList.contains('state-idle'), null, { timeout: 20000, polling: 20 });
      const dt = Date.now() - t0; note(dt >= 2400 && dt < 6000, `minimumRoundDuration 2500: next round possible after ${dt} ms with turbo on`);
    });
    await withFlags({ socialCasino: true }, async (s) => { const t = await s.visibleText(); note(/PLAY AMOUNT/i.test(t) && !/\bBET\b/.test(t), 'socialCasino: social wording without the URL parameter'); });
    return [bad ? FAIL : PASS, ...ev];
  });

  await check('HERO', 'the heroine box stands LEFT of the grid and never overlaps the grid or a button at 1024x576, 800x450, 400x225, 425x812', async () => {
    const ev = []; let bad = 0;
    for (const vp of VIEWPORTS) {
      const s = await sess({}, { viewport: vp });
      // a stand-in rig (any <svg>) is enough: the box is what is under test
      await s.page.evaluate(() => { const slot = document.getElementById('heroine-slot'); slot.innerHTML = '<svg viewBox="0 0 400 600" preserveAspectRatio="xMidYMax meet" style="width:100%;height:100%;display:block;overflow:visible"><rect x="120" y="40" width="160" height="530" rx="40" fill="#F0472F" stroke="#14102B" stroke-width="8"/></svg>'; });
      await sleep(500);
      const r = await s.page.evaluate(() => {
        const rect = (el) => { const b = el.getBoundingClientRect(); return { l: b.left, t: b.top, r: b.right, b: b.bottom, w: b.width, h: b.height }; };
        const slot = document.getElementById('heroine-slot'); const mascot = document.getElementById('mascot-slot');
        const hit = (a, b) => a.l < b.r - 0.5 && a.r > b.l + 0.5 && a.t < b.b - 0.5 && a.b > b.t + 0.5;
        const sr = rect(slot); const bad = [];
        const consider = (name, el) => { const b = rect(el); if (b.w > 0 && b.h > 0 && getComputedStyle(el).visibility !== 'hidden' && hit(sr, b)) bad.push(name); };
        const board = document.querySelector('.board-wrap'); if (board) consider('grid', board);
        document.querySelectorAll('#hud-ctrl button, #hud-info .stat, #hud-info button, #logo-area svg').forEach((e) => consider(e.id || e.className.toString().slice(0, 20) || e.tagName, e));
        const bw = board ? rect(board) : null;
        const d = document.documentElement;
        return { hidden: slot.hidden, sr, mode: slot.dataset.mode, crop: slot.dataset.crop, mascotHidden: mascot.hidden, bad, leftOfGrid: bw ? (sr.r <= bw.l + 1 || sr.b <= bw.t + 1 || sr.t >= bw.b - 1) : null, inView: sr.l >= 0 && sr.t >= 0 && sr.r <= innerWidth && sr.b <= innerHeight, scroll: d.scrollWidth > innerWidth || d.scrollHeight > innerHeight, w: Math.round(sr.w), h: Math.round(sr.h), hasBody: document.body.classList.contains('has-heroine') };
      });
      const portrait = vp.width / vp.height <= 1.1;
      const okMode = portrait ? ['corner', 'none'].includes(r.mode) : r.mode === 'left';
      const okSide = portrait ? true : r.sr.r <= (await s.page.evaluate(() => document.querySelector('.board-wrap').getBoundingClientRect().left)) + 1;
      const ok = !r.bad.length && r.inView && !r.scroll && r.mascotHidden && okMode && okSide && (r.hidden ? r.mode === 'none' : r.w >= 40 && r.h >= 56);
      if (!ok) bad++;
      ev.push(`${vp.name}: mode=${r.mode} crop=${r.crop} box ${r.w}x${r.h} at (${Math.round(r.sr.l)},${Math.round(r.sr.t)}) hidden=${r.hidden} v1 mascot box retired=${r.mascotHidden} overlaps=${J(r.bad)} left of the grid=${okSide} in view=${r.inView} page scroll=${r.scroll}${ok ? '' : ' <-- FAIL'}`);
      await shot(s, `shell_hero_${vp.name}`);
      await s.close();
    }
    return [bad ? FAIL : PASS, ...ev];
  });

  await check('MOTION', 'Motion Auto follows prefers-reduced-motion live (emulateMedia); an explicit choice wins and persists', async () => {
    const ev = []; let bad = 0; const note = (ok, m) => { if (!ok) bad++; ev.push((ok ? 'ok   ' : 'FAIL ') + m); };
    const s = await sess({}); const attr = (a) => s.page.evaluate((k) => document.documentElement.getAttribute(k), a);
    // media-query changes arrive asynchronously: wait for the attribute instead of a fixed pause (a loaded machine is slower)
    const until = (a, v) => s.page.waitForFunction(([k, val]) => document.documentElement.getAttribute(k) === val, [a, v], { timeout: 4000 }).catch(() => {});
    note((await attr('data-motion')) === 'full', 'default: data-motion=full');
    await s.page.emulateMedia({ reducedMotion: 'reduce' }); await until('data-motion', 'calm'); await until('data-flash', 'reduced');
    note((await attr('data-motion')) === 'calm' && (await attr('data-flash')) === 'reduced', 'OS reduce -> Auto becomes calm and flashes reduced, live');
    const anim = await s.page.evaluate(() => getComputedStyle(document.querySelector('.cell .sym-svg') || document.body).animationName);
    note(anim === 'none', 'calm switches the idle bob off (animation-name ' + anim + ')');
    await s.page.emulateMedia({ reducedMotion: 'no-preference' }); await until('data-motion', 'full');
    note((await attr('data-motion')) === 'full', 'OS back to no-preference -> full');
    await openSettings(s, VIEWPORTS[0]); await s.page.click('#st-tab-display');
    await s.page.emulateMedia({ reducedMotion: 'reduce' }); await until('data-motion', 'calm');
    note((await s.page.locator('#st-motion-auto').isChecked()) === true, 'Auto stays selected while the OS changes');
    await s.page.click('#st-motion-full', { force: true }); await sleep(150);
    note((await attr('data-motion')) === 'full', 'explicit Full beats the OS reduce');
    const anim2 = await s.page.evaluate(() => getComputedStyle(document.querySelector('.cell .sym-svg') || document.body).animationName);
    note(anim2 !== 'none', 'Full keeps the idle bob although the OS asks for reduced motion (' + anim2 + ')');
    await s.page.click('#st-motion-still', { force: true }); await sleep(450);
    await s.page.reload(); await s.waitIdle(15000).catch(() => {});
    note((await attr('data-motion')) === 'still', 'Still persisted over a reload');
    await s.page.emulateMedia({ reducedMotion: 'no-preference' });
    // contrast follows prefers-contrast
    await s.page.emulateMedia({ contrast: 'more' }); await until('data-contrast', 'more');
    note((await attr('data-contrast')) === 'more', 'prefers-contrast: more -> data-contrast=more');
    await s.close();
    return [bad ? FAIL : PASS, ...ev];
  });

  await check('LEDGER', 'session summary: net position and time played follow the rounds (loss, win, Secret Entrance cost) and persist nothing', async () => {
    const ev = []; let bad = 0; const note = (ok, m) => { if (!ok) bad++; ev.push((ok ? 'ok   ' : 'FAIL ') + m); };
    await mockCfg({ balance: 5000000000, bet: { betLevels: [2000000], minBet: 2000000, maxBet: 2000000, stepBet: 2000000, defaultBetLevel: 2000000 } });
    const s = await sess({});
    const txt = (sel) => s.page.evaluate((q) => { const e = document.querySelector(q); return e ? e.textContent : null; }, sel);
    note((await vis(s, '#ledger')) && /0\.00/.test(await txt('[data-ledger=net]')), 'visible by default, net 0.00: ' + (await txt('[data-ledger=net]')));
    await mockCfg({ force: 'loss' }); await s.playRound();
    note(/-\$2\.00/.test(await txt('[data-ledger=net]')), 'after a 0x round at 2.00 the net is -2.00: ' + (await txt('[data-ledger=net]')));
    await mockCfg({ force: 'win' }); await mockClear(); await s.playRound();
    const rnd = (await mockState()).round;
    const expect = Math.round(2000000 * rnd.payoutMultiplier) - 2000000 * 2;
    const shown = await txt('[data-ledger=net]'); const num = parseFloat(shown.replace(/[^0-9.\-]/g, ''));
    note(Math.abs(num * 1e6 - expect) < 1e4, `after a win of ${rnd.payoutMultiplier}x the net is ${(expect / 1e6).toFixed(2)}: shown "${shown}"`);
    const t1 = await txt('[data-ledger=time]'); await sleep(2200); const t2 = await txt('[data-ledger=time]');
    note(t1 !== t2 && /^\d+:\d\d$/.test(t2), `time played runs (${t1} -> ${t2})`);
    await s.page.reload(); await s.waitIdle(15000).catch(() => {});
    note(/\$0\.00/.test(await txt('[data-ledger=net]')), 'a reload starts a new session: net back to 0.00 (nothing stored)');
    const stored = await s.page.evaluate(() => { try { return Object.keys(localStorage); } catch (e) { return []; } });
    note(stored.every((k) => ['am_muted', 'am_vol_master', 'am_vol_music', 'am_vol_sfx', 'am_settings'].includes(k)), 'storage keys are whitelisted only: ' + J(stored));
    await s.close();
    return [bad ? FAIL : PASS, ...ev];
  });

  await check('PICKER', 'Secret Entrance: one button, confirm shows the real cost, focus on Cancel, nothing pre-selected; three doors only when the data has them', async () => {
    const ev = []; let bad = 0; const note = (ok, m) => { if (!ok) bad++; ev.push((ok ? 'ok   ' : 'FAIL ') + m); };
    await mockCfg({ balance: 5000000000, force: 'loss' });
    let s = await sess({});
    await s.waitEnabled('#btn-unleash', 3000).catch(() => {});
    note((await s.page.locator('#btn-unleash').count()) === 1, 'exactly one Secret Entrance button');
    await s.click('#btn-unleash'); await s.page.waitForSelector('#modal-confirm.open', { timeout: 3000 });
    let st = await s.page.evaluate(() => ({ focus: document.activeElement && document.activeElement.id, cards: [...document.querySelectorAll('#door-cards .door')].map((d) => d.dataset.mode), radios: [...document.querySelectorAll('#door-cards input:checked')].length, ok: document.getElementById('confirm-ok').disabled, text: document.getElementById('modal-confirm').innerText }));
    note(st.focus === 'confirm-cancel', 'focus on Cancel'); note(J(st.cards) === '["bonus"]', 'today: only Stage Door (the math for the others does not exist): ' + J(st.cards)); note(st.radios === 0, 'nothing pre-selected');
    note(/100\.00/.test(st.text), 'real cost 100.00 shown: ' + snippet(st.text.replace(/\s+/g, ' '), 120)); note(!/\b\d+\s*(s|sec|seconds)\b|countdown|hurry|last chance|better odds/i.test(st.text), 'no countdown or pressure wording');
    note(plays(await mockLog()).length === 0, 'opening it sends no play');
    await s.close();
    const base = JSON.parse(fs.readFileSync(path.join(FRONT, 'data/rules_data.json'), 'utf8')); void base;
    const doors = await doctoredRules();
    s = await sess({}, { routes: (ctx) => ctx.route('**/data/rules_data.json', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: J(doors) })) });
    await s.click('#btn-unleash'); await s.page.waitForSelector('#modal-confirm.open', { timeout: 3000 });
    st = await s.page.evaluate(() => ({ focus: document.activeElement && document.activeElement.id, cards: [...document.querySelectorAll('#door-cards .door')].map((d) => d.dataset.mode), checked: [...document.querySelectorAll('#door-cards input:checked')].length, ok: document.getElementById('confirm-ok').disabled }));
    note(st.cards.length === 3 && st.checked === 0 && st.ok && st.focus === 'confirm-cancel', `three doors in the data: ${st.cards.length} cards, none selected, Confirm off until a door is chosen, focus on Cancel`);
    await s.page.click('.door[data-mode=entrance_blackout]'); await s.page.click('#confirm-ok'); await sleep(1200);
    const pl = plays(await mockLog());
    note(pl.length === 1 && pl[0].body.mode === 'entrance_blackout', 'the chosen door is the mode played: ' + J(pl.map((p) => p.body.mode)));
    await s.close();
    return [bad ? FAIL : PASS, ...ev];
  });

  await check('PACE', 'minimumRoundDuration: autoplay and turbo never start a round earlier than t0 + minimum', async () => {
    await mockCfg({ jurisdiction: { minimumRoundDuration: 2500 }, force: 'loss' });
    const s = await sess({});
    await s.page.click('#btn-turbo');
    await s.page.click('#btn-autoplay'); await s.page.selectOption('#ap-count', '10'); await s.page.click('#ap-confirm');
    await s.page.waitForFunction(() => document.body.classList.contains('autoplay'), null, { timeout: 3000 }).catch(() => {});
    await sleep(8000);
    const log = await mockLog(); const pl = plays(log);
    await s.page.click('#btn-autoplay').catch(() => {});
    const gaps = pl.slice(1).map((p, i) => p.t - pl[i].t);
    await s.waitIdle(15000).catch(() => {});
    await s.close();
    return [pl.length >= 2 && gaps.every((g) => g >= 2400) ? PASS : FAIL, `autoplay + turbo, minimum 2500 ms: ${pl.length} rounds in 8 s, gaps between /wallet/play calls ${J(gaps)} ms`];
  });
}

// the data file plus the two later doors with their shares (what WP9/WP11 will ship): used to see the picker with three doors
async function doctoredRules() {
  const d = JSON.parse(fs.readFileSync(path.join(FRONT, 'data/rules_data.json'), 'utf8'));
  d.modes.push({ name: 'entrance_orders', cost: 100, rtp: 0.96, maxWin: 5000 }, { name: 'entrance_blackout', cost: 100, rtp: 0.96, maxWin: 5000 });
  d.shares = { bonus: { medianX: 64.1, pGtPrice: 0.288 }, entrance_orders: { medianX: 66, pGtPrice: 0.31 }, entrance_blackout: { medianX: 61.5, pGtPrice: 0.3 } };
  return d;
}

function writeReport() {
  const count = (st) => results.filter((r) => r.status === st).length;
  let md = `# Shell checks (WP1)\n\nGenerated ${new Date().toISOString()} by \`node tests/guidelines/shell.mjs\`.\n\nTotals: ${count(PASS)} PASS, ${count(FAIL)} FAIL, ${count(RISK)} AT RISK.\n\n| Id | Check | Verdict |\n|---|---|---|\n` + results.map((r) => `| ${r.id} | ${r.title.replace(/\|/g, '/')} | **${r.status}** |`).join('\n') + '\n\n## Evidence\n\n';
  md += results.map((r) => `### [${r.id}] ${r.title} - ${r.status}\n\n${r.evidence.map((e) => '- ' + String(e).replace(/\|/g, '\\|')).join('\n')}\n`).join('\n');
  md += '\n## Console\n\n';
  const ce = [...new Set(allSessions.flatMap((s) => s.consoleErrors))].filter((m) => !/Failed to load resource.*(404|400|500)/.test(m));
  const pe = [...new Set(allSessions.flatMap((s) => s.pageErrors))];
  const ext = [...new Set(allSessions.flatMap((s) => s.externalReqs()).map((r) => r.url))];
  md += `- console errors: ${J(ce.slice(0, 6))}\n- page errors: ${J(pe.slice(0, 6))}\n- external requests: ${J(ext.slice(0, 6))}\n`;
  fs.writeFileSync(REPORT, md);
  console.log(`\nreport written to ${REPORT}\nTOTAL: ${count(PASS)} PASS, ${count(FAIL)} FAIL, ${count(RISK)} AT RISK; console errors ${ce.length}, page errors ${pe.length}, external ${ext.length}`);
  return count(FAIL) + ce.length + pe.length + ext.length;
}

async function main() {
  await ensureServers();
  const pw = loadPlaywright();
  browser = await pw.chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  await runShellChecks();
  await browser.close();
  const bad = writeReport();
  stopServers();
  process.exit(bad ? 1 : 0);
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch((e) => { console.error(e); stopServers(); process.exit(1); });
