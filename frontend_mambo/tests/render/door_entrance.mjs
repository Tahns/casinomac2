// H2-01 (round 2): every door plays its Secret Entrance right after CONFIRM, before the free-spin intro.
//   Run: cd frontend_mambo && node tests/render/door_entrance.mjs   (PORTS="game,rgs" to choose ports; spawns and kills only its own servers)
// For each door (Stage Door = bonus, Coat Check = entrance_orders, Service Stairs = entrance_blackout), normal speed and turbo:
//   the dossier door .l-door is visible within 400 ms of CONFIRM, and it is gone before body.fs-mode (the MISSION START burst).
// Stage Door books carry no missionAssigned event: the player falls back to The Briefing for the entrance (render/index.js playBook).
import * as L from '../guidelines/lib.mjs';

const DOORS = ['bonus', 'entrance_orders', 'entrance_blackout'];
const VPS = [{ width: 1280, height: 720 }, { width: 425, height: 812 }];
const pw = L.loadPlaywright();
await L.ensureServers();
const browser = await pw.chromium.launch();
let fails = 0;
const check = (name, ok, detail = '') => { if (!ok) fails++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  [' + detail + ']' : ''}`); };

for (const vp of VPS) {
  for (const mode of DOORS) {
    const turbo = vp.width < vp.height; // portrait runs in turbo (the tightest timing)
    const sid = L.setSid(`door-${mode}-${vp.width}`);
    await L.mockReset();
    const touch = vp.height > vp.width;
    const ctx = await browser.newContext({ viewport: vp, hasTouch: touch, isMobile: touch, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    const errs = [];
    page.on('pageerror', (e) => errs.push(e.message));
    const q = new URLSearchParams({ sessionID: sid, rgs_url: L.RGS + '/s/' + sid, lang: 'en', device: touch ? 'mobile' : 'desktop' });
    await page.goto(L.GAME + '/index.html?' + q, { waitUntil: 'load' });
    await page.waitForFunction(() => document.body.classList.contains('state-idle'), null, { timeout: 20000 });
    await page.waitForTimeout(400);
    await page.keyboard.press('Escape');
    if (turbo) await page.evaluate(() => { if (!document.body.classList.contains('turbo')) document.querySelector('#btn-turbo')?.click(); });
    await page.click('#btn-unleash', { force: true });
    await page.waitForTimeout(500);
    await page.click(`#door-cards .door[data-mode="${mode}"]`, { force: true, timeout: 3000 });
    await page.waitForTimeout(300);
    // timeline probe from the CONFIRM click (rAF sampled)
    await page.evaluate(() => {
      const vis = (e) => { const s = getComputedStyle(e); return s.display !== 'none' && s.visibility !== 'hidden' && +s.opacity > 0.05 && e.getBoundingClientRect().width > 0; };
      window.__door = { t0: 0, on: -1, off: -1, fs: -1 };
      document.querySelector('#confirm-ok').addEventListener('click', () => { window.__door.t0 = performance.now(); }, { capture: true, once: true });
      const tick = () => {
        const d = window.__door;
        if (d.t0) {
          const t = Math.round(performance.now() - d.t0);
          const door = [...document.querySelectorAll('.l-door')].some(vis);
          if (door && d.on < 0) d.on = t;
          if (!door && d.on >= 0 && d.off < 0) d.off = t;
          if (document.body.classList.contains('fs-mode') && d.fs < 0) d.fs = t;
        }
        if (window.__door.fs < 0) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    await page.click('#confirm-ok', { force: true });
    await page.waitForFunction(() => window.__door.fs >= 0, null, { timeout: 30000 }).catch(() => {});
    const d = await page.evaluate(() => window.__door);
    const tag = `${mode} ${vp.width}x${vp.height}${turbo ? ' turbo' : ''}`;
    check(`${tag}: door within 400 ms of CONFIRM`, d.on >= 0 && d.on <= 400, `on ${d.on} ms`);
    check(`${tag}: door gone before fs-mode`, d.off >= 0 && d.fs >= 0 && d.off <= d.fs, `off ${d.off} ms, fs-mode ${d.fs} ms`);
    check(`${tag}: no page errors`, !errs.length, errs.join(' | ').slice(0, 200));
    await ctx.close();
  }
}
await browser.close();
L.stopServers();
console.log(fails ? `${fails} FAIL` : 'ALL PASS');
process.exit(fails ? 1 : 0);
