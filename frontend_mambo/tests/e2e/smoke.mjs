// WP10 milestone-1 smoke: menu + settings sliders + heroine, in the real game against the mock RGS, at the 4 Engine viewports.
//   node tests/e2e/smoke.mjs [--shots <dir>]     (PORTS="game,rgs" to choose ports; default: free ports; spawns and kills only its own servers)
// Exit 1 on any failed check, console error, page error or external request.
import fs from 'node:fs';
import path from 'node:path';
import { GAME, setSid, VIEWPORTS, loadPlaywright, ensureServers, stopServers, Session, mockReset, mockClear, mockLog, plays, sleep } from '../guidelines/lib.mjs';

const argv = process.argv.slice(2);
const SHOTS = (() => { const i = argv.indexOf('--shots'); return i >= 0 ? path.resolve(argv[i + 1]) : null; })();
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
let fails = 0;
const ok = (c, msg) => { if (!c) fails++; console.log((c ? 'PASS ' : 'FAIL ') + msg); };

await ensureServers();
const pw = loadPlaywright();
const browser = await pw.chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const sessions = [];
try {
  for (const vp of VIEWPORTS) {
    setSid('smoke-' + vp.name); await mockReset(); await mockClear();
    const s = new Session(browser); sessions.push(s);
    await s.open({}, { viewport: vp, idleMs: 20000 });
    await sleep(1200);
    const tag = `[${vp.name}]`;
    ok((await s.state()) === 'idle', `${tag} game reaches idle`);

    // heroine: drawn, left of the grid (or in the portrait corner), no overlap with the grid or a visible button
    const hero = await s.page.evaluate(() => {
      const slot = document.getElementById('heroine-slot'); const grid = document.getElementById('game');
      const r = (e) => { const b = e.getBoundingClientRect(); return { x: b.left, y: b.top, w: b.width, h: b.height, r: b.right, b: b.bottom }; };
      if (!slot || slot.hidden || !grid) return { shown: false, hasHero: document.body.classList.contains('has-heroine') };
      const hs = r(slot), gs = r(grid);
      const inter = (a, b) => Math.max(0, Math.min(a.r, b.r) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.b, b.b) - Math.max(a.y, b.y));
      const btns = [...document.querySelectorAll('button')].filter((b) => b.offsetParent !== null && b.getBoundingClientRect().width > 0).map((b) => ({ id: b.id, a: inter(hs, r(b)) })).filter((x) => x.a > 4);
      return { shown: true, hasHero: document.body.classList.contains('has-heroine'), slot: hs, grid: gs, gridOverlap: Math.round(inter(hs, gs)), btns, svg: !!slot.querySelector('svg, canvas'), centerLeftOfGrid: hs.x + hs.w / 2 < gs.x + gs.w / 2 };
    });
    ok(hero.shown && hero.svg, `${tag} heroine drawn (slot shown, has svg/canvas) ${JSON.stringify({ hasHero: hero.hasHero })}`);
    if (hero.shown) {
      ok(hero.gridOverlap <= 4, `${tag} heroine box does not overlap the grid (overlap px^2=${hero.gridOverlap})`);
      ok(hero.btns.length === 0, `${tag} heroine box overlaps no visible button ${JSON.stringify(hero.btns)}`);
      ok(hero.centerLeftOfGrid, `${tag} heroine stands on the LEFT half (slot x=${Math.round(hero.slot.x)} w=${Math.round(hero.slot.w)}, grid x=${Math.round(hero.grid.x)} w=${Math.round(hero.grid.w)})`);
    }
    if (SHOTS) await s.page.screenshot({ path: path.join(SHOTS, `smoke_${vp.name}_main.png`) });

    // settings: gear (in the MENU popup on short screens), dialog, sliders, persistence, Escape, focus return
    let viaMenu = false;
    if (!(await s.visible('#btn-settings')) && (await s.visible('#btn-menu'))) { await s.click('#btn-menu', { force: true }); await sleep(300); viaMenu = true; }
    ok(await s.visible('#btn-settings'), `${tag} settings gear reachable${viaMenu ? ' (via MENU)' : ''}`);
    await s.click('#btn-settings', { force: true }); await sleep(500);
    const dlg = await s.page.evaluate(() => { const d = document.getElementById('modal-settings'); const r = d && d.getBoundingClientRect(); return { open: !!d && d.offsetParent !== null || (d && getComputedStyle(d).display !== 'none' && !d.hidden), role: d?.querySelector('[role=dialog]')?.getAttribute('aria-modal') || d?.getAttribute('aria-modal'), inside: !!document.activeElement?.closest('#modal-settings'), tabs: d ? d.querySelectorAll('[role=tab]').length : 0, ranges: d ? d.querySelectorAll('input[type=range]').length : 0, fits: r ? r.bottom <= innerHeight + 1 && r.right <= innerWidth + 1 : false, scroll: document.scrollingElement.scrollHeight > innerHeight + 1 }; });
    ok(dlg.open && dlg.inside, `${tag} settings dialog open, focus inside (${JSON.stringify(dlg)})`);
    ok(dlg.tabs === 4 && dlg.ranges === 3, `${tag} 4 tabs and 3 sliders (tabs=${dlg.tabs}, sliders=${dlg.ranges})`);
    ok(!dlg.scroll, `${tag} no page scroll with the dialog open`);
    if (SHOTS) await s.page.screenshot({ path: path.join(SHOTS, `smoke_${vp.name}_settings.png`) });
    // keyboard: focus the master slider and press Left 5 times -> 70; End on music -> 100
    await s.page.focus('#st-vol-master'); for (let i = 0; i < 5; i++) await s.page.keyboard.press('ArrowLeft');
    await s.page.focus('#st-vol-music'); await s.page.keyboard.press('Home');
    await sleep(500); // 200 ms storage debounce
    const vol = await s.page.evaluate(() => ({ m: document.getElementById('st-vol-master').value, mu: document.getElementById('st-vol-music').value, out: document.getElementById('st-out-master')?.textContent, vt: document.getElementById('st-vol-music').getAttribute('aria-valuetext'), ls: (() => { try { return [localStorage.getItem('am_vol_master'), localStorage.getItem('am_vol_music')]; } catch (e) { return ['blocked']; } })() }));
    ok(vol.m === '70' && vol.out === '70%', `${tag} master slider by keyboard -> 70 (${JSON.stringify(vol)})`);
    ok(vol.mu === '0' && !!vol.vt, `${tag} music slider Home -> 0 with aria-valuetext "${vol.vt}"`);
    ok(String(vol.ls[0]) === '70' && String(vol.ls[1]) === '0', `${tag} volumes stored (am_vol_master=${vol.ls[0]}, am_vol_music=${vol.ls[1]})`);
    // Space inside the dialog starts no round
    await mockClear(); await s.page.keyboard.press('Space'); await sleep(400);
    ok(plays(await mockLog()).length === 0, `${tag} Space inside the dialog sends no /wallet/play`);
    await s.page.keyboard.press('Escape'); await sleep(400);
    const closed = await s.page.evaluate(() => { const d = document.getElementById('modal-settings'); return { closed: !d || d.hidden || getComputedStyle(d).display === 'none' || !d.classList.contains('open'), focus: document.activeElement?.id || document.activeElement?.tagName }; });
    ok(closed.closed, `${tag} Escape closes the dialog (focus returns to ${closed.focus})`);
    // reload: values persist
    await s.page.reload(); await s.waitIdle(20000).catch(() => {});
    const persisted = await s.page.evaluate(() => { try { return localStorage.getItem('am_vol_master'); } catch (e) { return 'blocked'; } });
    ok(String(persisted) === '70', `${tag} master volume persists across reload (${persisted})`);
    // one round still plays after all of this
    await mockClear(); await s.playRound(); const p = plays(await mockLog());
    ok(p.length === 1, `${tag} one round plays after the dialog (plays=${p.length})`);

    ok(s.consoleErrors.length === 0 && s.pageErrors.length === 0, `${tag} no console/page errors ${JSON.stringify([...s.consoleErrors, ...s.pageErrors].slice(0, 3))}`);
    ok(s.externalReqs().length === 0, `${tag} no external requests ${JSON.stringify(s.externalReqs().slice(0, 3).map((r) => r.url))}`);
    await s.close();
  }
} catch (e) { fails++; console.log('FAIL runner exception: ' + (e.stack || e.message)); }
await browser.close().catch(() => {});
stopServers();
console.log(fails ? `SMOKE: ${fails} FAIL` : 'SMOKE: all PASS', 'game', GAME);
process.exit(fails ? 1 : 0);
