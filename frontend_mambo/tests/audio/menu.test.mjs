// L1-L7 again, but through WP1's settings dialog in the real game (static server on PORT, mock RGS on PORT+1).
// Skips (exit 0) when the dialog is not shipped yet (#btn-settings missing or hidden).
// Usage: PW_DIR=... PORT=5830 node frontend_mambo/tests/audio/menu.test.mjs      (STRICT_WP1=1 makes the speaker-button restore check count as a failure)
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FRONT = path.resolve(HERE, '../..');
const PORT = process.env.PORT || '5405';
const MOCK = process.env.MOCK_PORT || String(Number(PORT) + 1);
const require = createRequire((process.env.PW_DIR || '/tmp/claude-0/pw') + '/');
const { chromium } = require('playwright-core');
const exe = [process.env.CHROMIUM, '/opt/pw-browsers/chromium/chrome', '/opt/pw-browsers/chromium'].find((p) => p && fs.existsSync(p) && fs.statSync(p).isFile());
let fails = 0, warns = 0;
const ok = (c, msg) => { if (!c) fails++; console.log((c ? 'PASS ' : 'FAIL ') + msg); };
const soft = (c, msg) => { if (c) console.log('PASS ' + msg); else if (process.env.STRICT_WP1) { fails++; console.log('FAIL ' + msg); } else { warns++; console.log('WARN ' + msg); } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function up(u) { try { return (await fetch(u)).ok; } catch (e) { return false; } }
const kids = [];
if (!(await up(`http://localhost:${PORT}/index.html`))) { kids.push(spawn('node', ['serve.mjs'], { cwd: FRONT, env: { ...process.env, PORT }, stdio: 'ignore' })); for (let i = 0; i < 40 && !(await up(`http://localhost:${PORT}/index.html`)); i++) await sleep(150); }
if (!(await up(`http://localhost:${MOCK}/__mock/health`))) { kids.push(spawn('node', ['tools/mock-rgs/server.mjs'], { cwd: FRONT, env: { ...process.env, MOCK_PORT: MOCK }, stdio: 'ignore' })); for (let i = 0; i < 40 && !(await up(`http://localhost:${MOCK}/__mock/health`)); i++) await sleep(150); }
const done = (code) => { for (const k of kids) { try { k.kill(); } catch (e) { /* ignore */ } } process.exit(code); };

const INIT = `(() => {
  window.__qa = { };
  const AC = window.AudioContext, origConnect = AudioNode.prototype.connect;
  AudioNode.prototype.connect = function (dest, ...a) { try { if (dest instanceof AudioNode) (this.__out || (this.__out = [])).push(dest); (window.__qa.nodes || (window.__qa.nodes = new Set())).add(this); } catch (e) {} return origConnect.call(this, dest, ...a); };
  window.__qa.audible = () => { const memo = new Map(); const aud = (n, seen) => { if (n instanceof AudioDestinationNode) return true; if (n instanceof GainNode && n.gain.value < 0.001) return false; if (memo.has(n)) return memo.get(n); if (seen.has(n)) return false; seen.add(n); const r = (n.__out || []).some((m) => aud(m, seen)); memo.set(n, r); return r; }; const srcs = [...(window.__qa.nodes || [])].filter((n) => n instanceof OscillatorNode || n instanceof AudioBufferSourceNode); return srcs.filter((n) => aud(n, new Set())).length; };
  const W = function (...a) { return new AC(...a); }; W.prototype = AC.prototype; window.AudioContext = W;
})();`;
const browser = await chromium.launch({ executablePath: exe, args: ['--autoplay-policy=no-user-gesture-required', '--no-sandbox'] });
const tp = (s) => Math.pow(10, (s <= 75 ? -45 * (75 - s) / 75 : 3 * (s - 75) / 25) / 20);

async function openGame(init) {
  const ctx = await browser.newContext({ viewport: { width: 1024, height: 576 } }); await ctx.addInitScript(INIT); if (init) await ctx.addInitScript(init);
  const page = await ctx.newPage(); const errs = [];
  page.on('pageerror', (e) => errs.push('pageerror ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errs.push('console ' + m.text()); });
  const sid = 'wp2menu' + Math.random().toString(36).slice(2, 8);
  await page.goto(`http://localhost:${PORT}/index.html?` + new URLSearchParams({ sessionID: sid, rgs_url: `http://localhost:${MOCK}/s/${sid}`, lang: 'en' }), { waitUntil: 'load' });
  await page.waitForFunction(() => document.body.classList.contains('state-idle'), null, { timeout: 15000 }).catch(() => {});
  const gear = await page.evaluate(() => { const b = document.getElementById('btn-settings'); return !!b && !b.hidden && getComputedStyle(b).display !== 'none'; });
  const A = () => page.evaluate(async () => { const { audio } = await import('/src/audio.js'); const e = audio._engine; return { vol: audio.volumes, muted: audio.muted, silent: audio.silent, g: e ? e.master.gain.value : -1, gm: e ? e.musicBus.gain.value : -1, gs: e ? e.sfxBus.gain.value : -1, live: e ? e.liveCount : -1, aud: window.__qa.audible(), body: document.body.classList.contains('muted'), pressed: document.getElementById('btn-sound').getAttribute('aria-pressed'), ls: (() => { try { return localStorage.getItem('am_muted'); } catch (e) { return 'blocked'; } })() }; });
  const open = async () => { await page.click('#btn-settings'); await page.waitForSelector('#st-vol-music', { state: 'visible', timeout: 5000 }); };
  const slide = (kind, v, commit = true) => page.evaluate(([k, v, c]) => { const el = document.getElementById('st-vol-' + k); el.value = String(v); el.dispatchEvent(new Event('input', { bubbles: true })); if (c) el.dispatchEvent(new Event('change', { bubbles: true })); return [el.value, el.getAttribute('aria-valuetext'), document.getElementById('st-out-' + k).textContent]; }, [kind, v, commit]);
  return { ctx, page, errs, gear, A, open, slide };
}

{
  const g = await openGame();
  if (!g.gear) { console.log('SKIP settings dialog is not shipped yet (#btn-settings missing or hidden)'); await browser.close(); done(0); }
  const { page, A, open, slide } = g;
  await open(); await sleep(1200);
  const sl = await page.evaluate(() => ['master', 'music', 'sfx'].map((k) => { const e = document.getElementById('st-vol-' + k); return e && [e.type, e.min, e.max, e.value]; }));
  ok(sl.every((x) => x && x[0] === 'range' && x[1] === '0' && x[2] === '100') && sl.map((x) => x[3]).join() === '75,5,75', `the dialog has three 0-100 sliders at their defaults Master 75, Music 5 (slot guide), Effects 75 (${JSON.stringify(sl)})`);
  // L1 persist via the sliders
  const r = [await slide('master', 60), await slide('music', 30), await slide('sfx', 90)]; await sleep(400);
  let s = await A();
  ok(r[1][1] && r[1][2] === '30%' && Math.abs(s.g - 0.8 * tp(60)) < 0.005 && Math.abs(s.gm - tp(30)) < 0.003 && Math.abs(s.gs - tp(90)) < 0.01, `L1 sliders move the gains by the taper (master ${s.g.toFixed(3)}, music ${s.gm.toFixed(4)}, effects ${s.gs.toFixed(3)}); readout "${r[1][2]}", aria-valuetext "${r[1][1]}"`);
  const keys = await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('am_vol') || k === 'am_muted').sort());
  ok(JSON.stringify(keys) === JSON.stringify(['am_vol_master', 'am_vol_music', 'am_vol_sfx']), `L1 the sliders store exactly the three volume keys (${keys.join(', ')})`);
  await page.reload(); await page.waitForFunction(() => document.body.classList.contains('state-idle'), null, { timeout: 15000 }).catch(() => {});
  await open(); const back = await page.evaluate(() => ['master', 'music', 'sfx'].map((k) => document.getElementById('st-vol-' + k).value));
  ok(JSON.stringify(back) === JSON.stringify(['60', '30', '90']), `L1 reload: the dialog shows the stored levels (${back.join('/')})`);
  // keyboard on a slider
  await page.focus('#st-vol-music'); await page.keyboard.press('End'); await page.keyboard.press('ArrowLeft'); await page.keyboard.press('ArrowLeft'); await sleep(200);
  s = await A(); ok(s.vol.music === 98, `L1 keyboard: End then 2 x ArrowLeft gives 98 (${s.vol.music})`);
  await page.keyboard.press('Home'); await sleep(1500); s = await A(); ok(s.vol.music === 0 && s.live < 8 && s.gm < 0.001, `L5 Home on the Music slider: 0, the bed stops queuing (live ${s.live})`);
  await slide('music', 70); await sleep(1500); s = await A(); ok(s.vol.music === 70 && s.live > 8 && Math.abs(s.gm - tp(70)) < 0.003, `L5 raising it brings the bed back (live ${s.live})`);
  await slide('master', 75); await slide('music', 75); await slide('sfx', 75);
  // L4 mute switch, header speaker, sliders
  await page.click('#st-mute'); await sleep(400); s = await A();
  const sw1 = await page.getAttribute('#st-mute', 'aria-checked');
  ok(s.muted && s.g < 0.001 && s.live === 0 && s.body && s.pressed === 'true' && sw1 === 'true' && s.ls === '1', `L4 Mute switch: muted, master 0, nothing live, header speaker pressed, switch checked (${JSON.stringify({ muted: s.muted, g: s.g, live: s.live, sw: sw1 })})`);
  await slide('music', 40); await slide('sfx', 55); await sleep(300); s = await A(); ok(s.muted && s.g < 0.001 && s.live === 0, 'L4 sliders moved while muted: still silent, still muted');
  await page.evaluate(() => document.getElementById('btn-sound').click()); await sleep(1500); s = await A();
  const sw2 = await page.getAttribute('#st-mute', 'aria-checked');
  ok(!s.muted && sw2 === 'false' && s.live > 8 && Math.abs(s.gm - tp(40)) < 0.003 && Math.abs(s.gs - tp(55)) < 0.003 && s.pressed === 'false', `L4 the header speaker unmutes, the switch follows (${sw2}), the bed is back at the slider levels (music ${s.gm.toFixed(4)})`);
  await page.evaluate(() => document.getElementById('btn-sound').click()); await sleep(300); const sw3 = await page.getAttribute('#st-mute', 'aria-checked');
  ok(sw3 === 'true' && (await A()).muted, 'L4 the header speaker mutes, the switch follows');
  await page.click('#st-mute'); await sleep(1200);
  // L7 preview rate limit while dragging
  const pv = await page.evaluate(async () => {
    const { audio } = await import('/src/audio.js'); const e = audio._engine; let n = 0; const f = e.SOUNDS.settingsTest; e.SOUNDS.settingsTest = (p) => { n++; return f(p); };
    const el = document.getElementById('st-vol-sfx');
    const t0 = performance.now(); for (let i = 0; i < 10; i++) { el.value = String(50 + i); el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); await new Promise((r) => setTimeout(r, 40)); }
    const burst = n, span = performance.now() - t0; await new Promise((r) => setTimeout(r, 300)); el.dispatchEvent(new Event('change', { bubbles: true })); const later = n;
    audio.setMuted(true); el.dispatchEvent(new Event('change', { bubbles: true })); await new Promise((r) => setTimeout(r, 300)); el.dispatchEvent(new Event('change', { bubbles: true })); const muted = n; audio.setMuted(false);
    return { burst, span, later, muted };
  });
  ok(pv.burst >= 1 && pv.burst <= Math.floor(pv.span / 250) + 1 && pv.later === pv.burst + 1 && pv.muted === pv.later, `L7 ten slider changes in ${Math.round(pv.span)} ms start ${pv.burst} preview(s); one more after the pause; none while muted (${JSON.stringify(pv)})`);
  // L6 master 0
  await slide('master', 0); await sleep(1500); s = await A();
  ok(s.silent && s.body && s.pressed === 'true' && !s.muted && s.g < 0.001 && s.live < 8 && s.aud === 0, `L6 Master 0: silent, header speaker shows it, mute flag untouched (live ${s.live}, master ${s.g})`);
  await page.evaluate(() => document.getElementById('btn-sound').click()); await sleep(1500); s = await A();
  soft(!s.silent && s.vol.master === 75 && s.live > 8, `L6 the header speaker restores the last non-zero level (master ${s.vol.master}, silent ${s.silent}) [needs WP1's #btn-sound to call audio.toggleMute(), see docs/v2/requests/WP2_to_WP1.md]`);
  await page.evaluate(async () => { const { audio } = await import('/src/audio.js'); audio.setMuted(false); }); // whatever the speaker handler did
  await slide('master', 65); await sleep(1500); s = await A();
  ok(!s.silent && Math.abs(s.g - 0.8 * tp(65)) < 0.005 && s.live > 8, `L6 raising Master restores sound at the new level (master ${s.g.toFixed(3)}, live ${s.live})`);
  ok(g.errs.length === 0, `no console error or page error during the whole run (${g.errs.length}) ${g.errs.slice(0, 3).join(' | ')}`);
  await g.ctx.close();
}
{ // L2 invalid stored values, L3 blocked storage, through the dialog
  const g = await openGame(`try { localStorage.setItem('am_vol_music', '999'); localStorage.setItem('am_vol_sfx', 'abc'); localStorage.setItem('am_vol_master', '-5'); } catch (e) {}`);
  await g.open(); const v = await g.page.evaluate(() => ['master', 'music', 'sfx'].map((k) => document.getElementById('st-vol-' + k).value));
  ok(JSON.stringify(v) === JSON.stringify(['0', '100', '75']) && g.errs.length === 0, `L2 invalid stored volumes show as clamped values in the dialog (${v.join('/')}), no error`);
  await g.ctx.close();
}
{
  const g = await openGame(`Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('blocked', 'SecurityError'); }, configurable: true });`);
  await g.open(); const r = await g.slide('music', 20); await sleep(600); const s = await g.A();
  ok(s.vol.music === 20 && Math.abs(s.gm - tp(20)) < 0.003 && g.errs.length === 0, `L3 storage blocked: the dialog still works and moves the music gain (${s.gm.toFixed(4)}), errors ${g.errs.length}`);
  await g.ctx.close();
}
await browser.close();
console.log(fails ? `\n${fails} FAILED${warns ? `, ${warns} warning(s)` : ''}` : `\nALL PASSED${warns ? ` (${warns} warning(s))` : ''}`);
done(fails ? 1 : 0);
