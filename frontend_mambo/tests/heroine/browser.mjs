// WP3 HEROINE browser acceptance (headless Chromium through playwright-core). Run: cd frontend_mambo && node tests/heroine/browser.mjs [--shots] [--report]
// Spawns its OWN static server and mock RGS (ports 5842 / 5843, override with PORTS="a,b"), kills only those PIDs, exit code 1 on any FAIL.
// Sections: A rig budget and soak, B fallback chain, C motion levels / hidden tab / live settings, D the real game at 4 viewports
// (bounding boxes, no overlap, no scroll, no console error, perf), E readability at 100 px and the two screenshots.
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
const [gp, rp] = (process.env.PORTS || '5842,5843').split(',').map(Number);
const wantShots = process.argv.includes('--shots');

const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok: !!ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  [' + detail + ']' : ''}`); };

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
const browser = await chromium.launch({ executablePath: exe, args: ['--no-sandbox'] });
fs.mkdirSync(SHOTS, { recursive: true });

async function harness(viewport = { width: 420, height: 620 }, opt = {}) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: opt.dsf || 1, serviceWorkers: 'block' });
  const page = await ctx.newPage(); const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  await page.goto(`${GAME}/tests/heroine/harness.html`);
  await page.waitForFunction(() => window.__ready);
  return { page, ctx, errors };
}

// ------------------------------------------------------------------------------------------------ A. rig budget and soak
{
  const { page, ctx, errors } = await harness();
  const perf = await page.evaluate(() => {
    const { rig, clips, createDirector, clock } = window.H;
    const box = document.getElementById('box'); box.innerHTML = '';
    const ck = clock(); const h = rig.createHeroine(box, { raf: false, seed: 7, limited: 12, followOs: false, clips: { hairFlip: clips.buildClip('shiftWeight', { windUp: false }) } });
    const d = createDirector({ rig: h, now: ck.now, setTimer: ck.setTimer, clearTimer: ck.clearTimer, rand: () => 0.4 });
    const seq = [['win', { ratio: 3 }], ['bigwin', { ratio: 9 }], ['epic', { ratio: 40 }], ['blast'], ['fizzle'], ['anticipate'], ['spin'], ['trigger', { outfit: 'lab' }], ['meter'], ['end', { ratio: 3 }], ['gag']];
    const times = []; let n = 0, tot = 0, max = 0;
    for (let round = 0; round < 6 && n < 600; round++) for (const [k, info] of seq) {
      d.react(k, info);
      for (let i = 0; i < 60 && n < 600; i++) { const t0 = performance.now(); ck.advance(1000 / 60); h.step(1 / 60); const ms = performance.now() - t0; tot += ms; if (ms > max) max = ms; times.push(ms); n++; }
    }
    times.sort((a, b) => a - b);
    return { frames: n, avgMs: +(tot / n).toFixed(3), p95: +times[Math.floor(n * 0.95)].toFixed(3), maxMs: +max.toFixed(2) };
  });
  check('A1 budget: <= 2 ms/frame average over 600 frames (update + forced render, busiest reactions, director on)', perf.frames >= 600 && perf.avgMs <= 2, JSON.stringify(perf));

  const soak = await page.evaluate(() => {
    const { rig, createDirector, clock, REACT_KINDS } = window.H;
    const bad = []; let steps = 0;
    for (const motion of ['full', 'calm', 'still']) for (const outfit of ['inspectrice', 'lab', 'trench', 'casino', 'vault']) for (const crop of ['full', 'bust', 'head']) {
      const box = document.getElementById('box'); box.innerHTML = '';
      const ck = clock(); const h = rig.createHeroine(box, { raf: false, seed: 3, outfit, crop, followOs: false, reduced: motion === 'still' });
      const d = createDirector({ rig: h, getMotion: () => motion, now: ck.now, setTimer: ck.setTimer, clearTimer: ck.clearTimer, rand: () => 0.7, onFail: (e) => bad.push(String(e)) });
      d.setMotion(motion);
      for (const k of REACT_KINDS) {
        d.react(k, { level: 3, ratio: 30, outfit: k === 'outfit' ? 'casino' : undefined, mission: 'blackout' });
        for (let i = 0; i < 40; i++) { ck.advance(50); h.step(0.05); steps++; const s = h.state(); for (const key in s) if (typeof s[key] === 'number' && !isFinite(s[key])) bad.push(`${motion}/${outfit}/${crop}/${k}/${key}`); }
        ck.advance(15000);
      }
    }
    return { steps, bad: [...new Set(bad)].slice(0, 8) };
  });
  check('A2 soak: every reaction kind x 5 outfits x 3 crops x 3 motion levels, no non-finite value, no failure callback', soak.bad.length === 0 && soak.steps > 20000, JSON.stringify(soak));

  // the rig's own idle director (gags every 5-12 s) never plays hairFlip, only whitelisted gags
  const gags = await page.evaluate(() => {
    const { rig, clips } = window.H;
    const box = document.getElementById('box'); box.innerHTML = '';
    const names = {}; const h = rig.createHeroine(box, { raf: false, seed: 11, idle: true, followOs: false, clips: { hairFlip: clips.buildClip('shiftWeight', { windUp: false }) } });
    for (let i = 0; i < 3600 * 20; i++) { h.step(0.05); const c = h.stats().clip; if (c) names[c] = (names[c] || 0) + 1; }
    return names;
  });
  const allowed = new Set(['checkFlashlight', 'blowWhistle', 'examineNails', 'glancePlayer', 'shiftWeight']);
  check('A3 idle director over one simulated hour: no hairFlip, only whitelisted gags, at least 3 different ones', !gags.hairFlip && Object.keys(gags).every((k) => allowed.has(k)) && Object.keys(gags).length >= 3, JSON.stringify(gags));
  check('A4 harness page: no console error', errors.length === 0, errors.join(' | ').slice(0, 200));
  await ctx.close();
}

// ------------------------------------------------------------------------------------------------ B. fallback chain
{
  const { page, ctx, errors } = await harness();
  const r = await page.evaluate(async () => {
    const { createHeroineMascot, rig } = window.H; const out = {};
    const host = document.createElement('div'); host.style.cssText = 'position:absolute;left:10px;top:10px;width:200px;height:300px'; document.body.appendChild(host);
    // 1. createHeroine throws
    const m1 = await createHeroineMascot(host, { size: 300, loadRig: async () => ({ createHeroine() { throw new Error('boom'); } }) });
    out.createThrows = { mode: m1.mode(), react: m1.react('win', { ratio: 3 }), pose: m1.setPose('happy'), svg: !!host.querySelector('svg'), flag: host.querySelector('.heroine-stage').dataset.heroine, vb: host.querySelector('svg').getAttribute('viewBox'), paths: host.querySelectorAll('path').length };
    m1.say('still talking', 100); out.createThrows.bubble = !!document.querySelector('.hero-bubble');
    m1.setCrop('bust'); out.createThrows.bustVb = host.querySelector('svg').getAttribute('viewBox');
    m1.destroy(); out.createThrows.cleaned = host.children.length === 0;
    // 2. the rig module cannot load
    const m2 = await createHeroineMascot(host, { size: 300, loadRig: async () => { throw new Error('404'); } });
    out.noModule = { mode: m2.mode(), svg: !!host.querySelector('svg'), react: m2.react('epic', { ratio: 40 }) }; m2.destroy();
    // 3. the rig throws later, inside its frame loop (a cue handler throws while a clip plays): the loop guard hands over to the static picture
    const m3 = await createHeroineMascot(host, { size: 300, onCue: () => { throw new Error('cue'); } });
    out.runtime = { before: m3.mode() };
    m3.react('win', { ratio: 3 });
    await new Promise((res) => setTimeout(res, 700));
    out.runtime.after = m3.mode(); out.runtime.flag = host.querySelector('.heroine-stage').dataset.heroine; out.runtime.svg = !!host.querySelector('svg'); out.runtime.react = m3.react('bigwin', { ratio: 9 });
    m3.destroy();
    // 4. the director's rig call throws
    const m4 = await createHeroineMascot(host, { size: 300, loadRig: async () => ({ ...rig, createHeroine(el, o) { const h = rig.createHeroine(el, o); h.play = () => { throw new Error('play'); }; return h; } }) });
    out.playThrows = { before: m4.mode(), react: m4.react('win', { ratio: 3 }) }; await new Promise((res) => setTimeout(res, 300)); out.playThrows.after = m4.mode(); m4.destroy();
    // 5. nothing at all (no rig, no static): createHeroineMascot rejects, the public createMascot draws the v1 character
    let rejected = false; try { await createHeroineMascot(host, { size: 300, loadRig: async () => { throw new Error('x'); }, loadFallback: async () => { throw new Error('y'); } }); } catch (e) { rejected = true; }
    out.nothing = { rejected, hostClean: host.children.length === 0 };
    const pub = window.H.createMascot(host, { size: 200, loadRig: async () => { throw new Error('x'); }, loadFallback: async () => { throw new Error('y'); } });
    pub.setPose('happy'); await pub.ready;
    out.v1 = { mode: pub.mode(), v1svg: !!host.querySelector('svg.gus'), pose: pub.getPose(), react: pub.react('win', {}) }; pub.destroy();
    return out;
  });
  check('B1 createHeroine throws: static picture of the same heroine (svg, 400x600 viewBox), react false, say still works, crop applies, destroy cleans', r.createThrows.mode === 'static' && r.createThrows.react === false && r.createThrows.svg && r.createThrows.flag === 'static' && r.createThrows.vb === '60 30 280 556' && r.createThrows.paths > 150 && r.createThrows.bubble && r.createThrows.bustVb === '86 24 226 322' && r.createThrows.cleaned, JSON.stringify(r.createThrows));
  check('B2 rig module cannot load: static picture, no throw', r.noModule.mode === 'static' && r.noModule.svg && r.noModule.react === false, JSON.stringify(r.noModule));
  check('B3 the rig throws inside its frame loop (cue handler): the loop guard swaps in the static picture', r.runtime.before === 'rig' && r.runtime.after === 'static' && r.runtime.flag === 'static' && r.runtime.svg && r.runtime.react === false, JSON.stringify(r.runtime));
  check('B4 a rig call made by the director throws: static picture', r.playThrows.before === 'rig' && r.playThrows.react === false && r.playThrows.after === 'static', JSON.stringify(r.playThrows));
  check('B5 no rig and no static picture: createHeroineMascot rejects, createMascot falls back to the v1 character', r.nothing.rejected && r.nothing.hostClean && r.v1.mode === 'v1' && r.v1.v1svg && r.v1.pose === 'happy' && r.v1.react === false, JSON.stringify({ n: r.nothing, v1: r.v1 }));
  const expected = errors.filter((e) => /heroine:|Failed to load resource/.test(e)), unexpected = errors.filter((e) => !/heroine:|Failed to load resource/.test(e));
  check('B6 the fallbacks log their reason (console.error "heroine: ...") and nothing else is reported', expected.length >= 4 && unexpected.length === 0, `${expected.length} expected, unexpected: ${unexpected.join(' | ').slice(0, 200)}`);
  await ctx.close();
}

// ------------------------------------------------------------------------------------------------ C. motion levels, hidden tab, live settings
{
  const { page, ctx, errors } = await harness();
  const r = await page.evaluate(async () => {
    const { createHeroineMascot } = window.H; const out = {};
    const level = { v: 'still' }; const subs = [];
    const settings = { get: (k) => (k === 'motionLevel' ? level.v : undefined), on: (k, f) => { subs.push(f); return () => {}; } };
    const host = document.createElement('div'); host.style.cssText = 'position:absolute;left:10px;top:10px;width:200px;height:300px'; document.body.appendChild(host);
    const m = await createHeroineMascot(host, { size: 300, settings });
    const rig = m.rig(); const fxLayer = () => host.querySelector('[id$="-fx"]');
    out.stillStart = { reduced: rig.reduced, mode: m.mode() };
    const ok = m.react('bigwin', { ratio: 9 });
    for (let i = 0; i < 6; i++) rig.step(1 / 30);                       // the gaze target settles on the first updates
    const s0 = JSON.stringify(rig.state()); for (let i = 0; i < 30; i++) rig.step(1 / 30); const s1 = JSON.stringify(rig.state());
    out.still = { ok, pose: rig.pose, clip: rig.stats().clip, frozen: s0 === s1, particles: fxLayer() ? fxLayer().childElementCount : -1, blast: m.react('blast'), pose2: rig.pose };
    m.react('outfit', { outfit: 'casino' }); out.still.outfit = rig.outfit; out.still.screen = fxLayer() ? fxLayer().childElementCount : -1;
    // back to Full at runtime
    level.v = 'full'; subs.forEach((f) => f('full')); out.full = { reduced: rig.reduced };
    m.react('epic', { ratio: 40 }); for (let i = 0; i < 30; i++) rig.step(1 / 30); out.full.clip = rig.stats().clip; out.full.particles = fxLayer().childElementCount;
    level.v = 'calm'; subs.forEach((f) => f('calm')); out.calm = { reduced: rig.reduced };
    m.react('epic', { ratio: 40 }); let sawJump = false; for (let i = 0; i < 60; i++) { rig.step(1 / 30); if (rig.state().ry < -1) sawJump = true; } out.calm.jump = sawJump; out.calm.clip = rig.stats().clip;
    m.destroy();
    return out;
  });
  check('C1 Still: static poses only (pose swapped, no clip, no spring motion, no particle), outfit swapped without a screen', r.stillStart.reduced === true && r.still.ok === true && r.still.pose === 'bigwin' && r.still.clip === '' && r.still.frozen && r.still.particles === 0 && r.still.blast === true && r.still.pose2 === 'shock' && r.still.outfit === 'casino' && r.still.screen === 0, JSON.stringify(r.still));
  check('C2 the motion level changes live: Full runs clips with particles, Calm runs them without a jump', r.full.reduced === false && r.full.clip === 'megaWin' && r.full.particles > 0 && r.calm.reduced === false && r.calm.jump === false, JSON.stringify({ f: r.full, c: r.calm }));

  // hidden tab: the rig stops advancing while document.hidden, resumes after
  const h = await page.evaluate(async () => {
    const { createHeroineMascot } = window.H;
    const host = document.createElement('div'); host.style.cssText = 'position:absolute;left:10px;top:10px;width:200px;height:300px'; document.body.appendChild(host);
    const m = await createHeroineMascot(host, { size: 300, settings: null, reduced: false }); const rig = m.rig();
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    await sleep(300); const f0 = rig.stats().frames; await sleep(300); const f1 = rig.stats().frames;
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange'));
    await sleep(100); const g0 = rig.stats().frames; await sleep(500); const g1 = rig.stats().frames;
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => false }); document.dispatchEvent(new Event('visibilitychange'));
    await sleep(400); const k1 = rig.stats().frames;
    // the shell says the box is gone (portrait without room): paused as well
    host.dispatchEvent(new CustomEvent('am:heroine-layout', { detail: { mode: 'none', crop: 'full' } }));
    m.destroy();
    return { running: f1 - f0, hidden: g1 - g0, resumed: k1 - g1 };
  });
  check('C3 pause when the document is hidden: frames advance while visible, stop while hidden, resume after', h.running > 5 && h.hidden === 0 && h.resumed > 5, JSON.stringify(h));

  const sh = await page.evaluate(async () => {
    const { createHeroineMascot } = window.H;
    const slot = document.createElement('div'); slot.id = 'heroine-slot'; slot.dataset.crop = 'full'; slot.style.cssText = 'position:absolute;left:10px;top:10px;width:178px;height:272px'; document.body.appendChild(slot);
    const m = await createHeroineMascot(slot, { settings: null, reduced: false }); const rig = m.rig();
    const out = { start: rig.crop };
    slot.dataset.crop = 'bust'; slot.dispatchEvent(new CustomEvent('am:heroine-layout', { bubbles: true, detail: { mode: 'corner', crop: 'bust', rect: null } }));
    out.bust = rig.crop; out.vb = slot.querySelector('svg').getAttribute('viewBox');
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    slot.dispatchEvent(new CustomEvent('am:heroine-layout', { bubbles: true, detail: { mode: 'none', crop: 'head', rect: null } }));
    await sleep(100); const a = rig.stats().frames; await sleep(400); out.pausedFrames = rig.stats().frames - a; out.head = rig.crop;
    slot.dispatchEvent(new CustomEvent('am:heroine-layout', { bubbles: true, detail: { mode: 'corner', crop: 'bust', rect: null } }));
    await sleep(400); out.resumedFrames = rig.stats().frames - a;
    out.child = slot.firstElementChild.className; out.only = slot.childElementCount;
    m.destroy(); out.gone = slot.childElementCount;
    return out;
  });
  check('C4 the shell contract: the crop follows data-crop and the am:heroine-layout event, mode none pauses the rig, the slot holds exactly one child', sh.start === 'full' && sh.bust === 'bust' && sh.vb === '86 24 226 322' && sh.head === 'head' && sh.pausedFrames <= 1 && sh.resumedFrames > 5 && sh.only === 1 && sh.gone === 0, JSON.stringify(sh));
  check('C5 no console error in the motion / pause pages', errors.length === 0, errors.join(' | ').slice(0, 200));
  await ctx.close();
}


// bounding box (page px) of the pixels the heroine paints: everything else on the page is hidden over a flat green, one screenshot, PIL finds the non-green box
import { spawnSync } from 'node:child_process';
async function paintedBox(page, box) {
  const pad = 70, vp = page.viewportSize();
  const clip = { x: Math.max(0, Math.floor(box.l - pad)), y: Math.max(0, Math.floor(box.t - pad)), width: 0, height: 0 };
  clip.width = Math.min(vp.width - clip.x, Math.ceil(box.w + 2 * pad)); clip.height = Math.min(vp.height - clip.y, Math.ceil(box.h + 2 * pad));
  await page.evaluate(async () => {
    const { mascotOf } = await import('/src/render/mascot.js'); const m = mascotOf(document.getElementById('heroine-slot'));
    m.impl.director().release(); const rig = m.impl.rig(); rig.pause(); rig.setPose('idle', { snap: true }); rig.snap();
    const st = document.createElement('style'); st.id = '__green'; st.textContent = '#app{background:#00ff00!important} #app>*:not(#heroine-slot){visibility:hidden!important} #heroine-slot{background:transparent!important}'; document.head.appendChild(st);
  });
  const a = path.join(SHOTS, '_a.png');
  await page.screenshot({ path: a, clip });
  await page.evaluate(async () => { document.getElementById('__green').remove(); const { mascotOf } = await import('/src/render/mascot.js'); mascotOf(document.getElementById('heroine-slot')).impl.rig().resume(); });
  const py = spawnSync('python3', ['-I', '-c', `
import sys, json
from PIL import Image
a=Image.open(sys.argv[1]).convert('RGB')
m=a.point(lambda v: 0).convert('L')
px=a.load(); w,h=a.size
mask=Image.new('L',(w,h),0); mp=mask.load()
for y in range(h):
  for x in range(w):
    r,g,b=px[x,y]
    if not (r<30 and g>225 and b<30): mp[x,y]=255
print(json.dumps(mask.getbbox()))`, a], { encoding: 'utf8' });
  fs.unlinkSync(a);
  if (py.status !== 0) return null;
  const bb = JSON.parse(py.stdout.trim()); if (!bb) return null;
  return { l: clip.x + bb[0], t: clip.y + bb[1], r: clip.x + bb[2], b: clip.y + bb[3], w: bb[2] - bb[0], h: bb[3] - bb[1] };
}

// ------------------------------------------------------------------------------------------------ D. the real game at 4 viewports
const VIEWPORTS = [
  { name: '1024x576', width: 1024, height: 576 }, { name: '800x450', width: 800, height: 450 }, { name: '400x225', width: 400, height: 225 }, { name: '425x812', width: 425, height: 812, touch: true },
];
const liveInfo = {};
for (const vp of VIEWPORTS) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, hasTouch: !!vp.touch, isMobile: !!vp.touch, deviceScaleFactor: 1, serviceWorkers: 'block' });
  const page = await ctx.newPage(); const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); }); page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  const sid = 'wp3-' + Math.random().toString(36).slice(2, 8);
  await page.goto(`${GAME}/index.html?${new URLSearchParams({ sessionID: sid, rgs_url: `${RGS}/s/${sid}`, lang: 'en', device: vp.touch ? 'mobile' : 'desktop' })}`);
  await page.waitForFunction(() => document.body.classList.contains('state-idle'), null, { timeout: 25000 }).catch(() => {});
  await page.waitForTimeout(1200);
  const geo = await page.evaluate(async () => {
    const { mascotOf } = await import('/src/render/mascot.js');
    const slot = document.getElementById('heroine-slot'), m = mascotOf(slot);
    const R = (e) => { const r = e.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height }; };
    const vis = (e) => { const r = e.getBoundingClientRect(), cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && !e.closest('[hidden]'); };
    const hit = (a, b) => a.l < b.r - 0.5 && a.r > b.l + 0.5 && a.t < b.b - 0.5 && a.b > b.t + 0.5;
    const obstacles = [];
    const board = document.querySelector('.board-wrap'); if (board) obstacles.push(['grid', R(board)]);
    document.querySelectorAll('#hud-ctrl button, #hud-info .stat, #logo-area .logo, #meter-slot .mm:not([hidden])').forEach((e) => { if (vis(e)) obstacles.push([e.id || e.className.toString().slice(0, 24), R(e)]); });
    const box = R(slot), shown = !slot.hidden && vis(slot);
    const bad = shown ? obstacles.filter(([, r]) => hit(box, r)).map(([n]) => n) : [];
    // painted figure extents (idle) against the box
    let fig = null; const g = slot.querySelector('[id$="-mirror"]'); if (g) fig = R(g);
    const d = document.documentElement;
    return { shown, mode: slot.dataset.mode, crop: slot.dataset.crop, box, bad, fig, figInside: fig ? fig.l >= box.l - 1 && fig.r <= box.r + 1 && fig.b <= box.b + 1 : null, svgs: slot.querySelectorAll('svg').length, heroine: m ? m.mode() : null, mascotHidden: document.getElementById('mascot-slot').hidden,
      scroll: d.scrollWidth > innerWidth || d.scrollHeight > innerHeight, left: box.r <= (board ? R(board).l + 1 : 1e9) || box.b <= (board ? R(board).t + 1 : 0) || box.t >= (board ? R(board).b - 1 : 1e9) };
  });
  liveInfo[vp.name] = geo;
  check(`D1 ${vp.name}: the heroine is drawn by the rig into #heroine-slot, the v1 box is retired${geo.shown ? '' : ' (portrait, no room: slot hidden)'}`, geo.heroine === 'rig' && geo.svgs === 1 && geo.mascotHidden, JSON.stringify({ shown: geo.shown, mode: geo.mode, crop: geo.crop, heroine: geo.heroine }));
  check(`D2 ${vp.name}: bounding box ${Math.round(geo.box.w)}x${Math.round(geo.box.h)} never overlaps the grid, a button, a HUD plate or the logo, and never scrolls the page`, geo.shown && geo.bad.length === 0 && !geo.scroll && geo.left, JSON.stringify({ bad: geo.bad, scroll: geo.scroll, left: geo.left }));
  // painted pixels: screenshot around the slot with and without the heroine, diff them (invisible geometry such as the torch beam does not count)
  const painted = await paintedBox(page, geo.box);
  liveInfo[vp.name].painted = painted;
  check(`D3 ${vp.name}: the painted figure (idle) is inside her box${geo.crop === 'full' ? ' and clear of its left, right and bottom edge' : ' (crop ' + geo.crop + ': cut by design at the waist)'}`, painted && painted.w > 10 && painted.l >= geo.box.l - 0.5 && painted.r <= geo.box.r + 0.5 && painted.b <= geo.box.b + 0.5 && painted.t >= geo.box.t - 0.5 - (geo.crop === 'full' ? geo.box.h * 0.18 : 0) && (geo.crop !== 'full' || (painted.l >= geo.box.l + 1 && painted.r <= geo.box.r - 1 && painted.b <= geo.box.b - 1)), JSON.stringify(painted) + ' box ' + JSON.stringify({ l: Math.round(geo.box.l), t: Math.round(geo.box.t), r: Math.round(geo.box.r), b: Math.round(geo.box.b) }));

  // the reactions in the live page (clips sped up with info.speed to keep the run short), live frame cost sampled every frame
  const live = await page.evaluate(async () => {
    const { mascotOf } = await import('/src/render/mascot.js');
    const m = mascotOf(document.getElementById('heroine-slot')); const rig = m.impl.rig();
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const samples = []; const timer = setInterval(() => samples.push(rig.stats().avgMs), 16);
    const res = {}; const f0 = rig.stats().frames, t0 = performance.now();
    const seq = [['spin', 300], ['anticipate', 300], ['win', 500], ['bigwin', 500], ['epic', 1700], ['blast', 800], ['fizzle', 900], ['meter', 800], ['trigger', 600], ['end', 1100], ['gag', 1100], ['idle', 200]];
    // after the planned gap, wait (capped at 3 s) until the running clip has ended or is only holding: a lower-priority kind is refused
    // by design while a higher one runs (director.js), so a fixed sleep made the test depend on setTimeout lateness (megaWin = 1533 ms)
    const dir = m.impl.director();
    const free = async () => { const tEnd = performance.now() + 3000; while (performance.now() < tEnd) { const s = dir.state(); if ((!s.cur || s.cur.holding) && !s.locked) return; await sleep(20); } };
    for (const [k, ms] of seq) { res[k] = m.react(k, { level: 2, ratio: 8, speed: 2.5, at: { x: 600, y: 200 } }); m.say('x', 300); await sleep(ms); await free(); }
    m.react('outfit', { outfit: 'casino' }); await sleep(2300); const outfit = rig.outfit; m.react('outfit', { outfit: 'inspectrice' }); await sleep(2300);
    clearInterval(timer);
    const st = rig.stats(); const fps = (st.frames - f0) / ((performance.now() - t0) / 1000);
    const avg = samples.reduce((a, v) => a + v, 0) / Math.max(1, samples.length);
    return { res, outfit, back: rig.outfit, avgMs: +avg.toFixed(3), maxMs: +st.maxMs.toFixed(2), fps: Math.round(fps), n: samples.length };
  });
  const started = Object.entries(live.res).filter(([k, v]) => v).map(([k]) => k);
  liveInfo[vp.name].live = { started, avgMs: live.avgMs, maxMs: live.maxMs, fps: live.fps };
  check(`D4 ${vp.name}: ten reactions start in the live page, rig frame cost <= 2 ms on average, costume change there and back`, ['spin', 'anticipate', 'win', 'bigwin', 'epic', 'blast', 'fizzle', 'meter', 'trigger', 'end'].every((k) => live.res[k]) && live.avgMs <= 2 && live.outfit === 'casino' && live.back === 'inspectrice', JSON.stringify({ started: started.join(','), avgMs: live.avgMs, maxMs: live.maxMs, fps: live.fps, back: live.back }));
  check(`D5 ${vp.name}: no console error or page error`, errors.length === 0, errors.join(' | ').slice(0, 300));
  if (vp.name === '1024x576' || vp.name === '425x812' || wantShots) { await page.waitForTimeout(500); await page.screenshot({ path: path.join(SHOTS, `game_${vp.name}.png`) }); }
  await ctx.close();
}

// ------------------------------------------------------------------------------------------------ D6/D7. gaze and the settings in the real game
{
  const sid = 'wp3-gaze-' + Math.random().toString(36).slice(2, 7);
  const url = `${GAME}/index.html?${new URLSearchParams({ sessionID: sid, rgs_url: `${RGS}/s/${sid}`, lang: 'en', device: 'desktop' })}`;
  // D6: the eyes really turn toward the spin button, the grid and a cluster
  let ctx = await browser.newContext({ viewport: { width: 1024, height: 576 }, deviceScaleFactor: 1, serviceWorkers: 'block' });
  let page = await ctx.newPage(); const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); }); page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  await page.goto(url); await page.waitForFunction(() => document.body.classList.contains('state-idle'), null, { timeout: 25000 }); await page.waitForTimeout(1000);
  const g = await page.evaluate(async () => {
    const { mascotOf } = await import('/src/render/mascot.js'); const m = mascotOf(document.getElementById('heroine-slot')); const rig = m.impl.rig(); rig.pause();
    const out = {};
    const look = (t) => { rig.setLook(t); for (let i = 0; i < 40; i++) rig.step(1 / 60); const s = rig.state(); return { x: +s.lookx.toFixed(2), y: +s.looky.toFixed(2), turn: +s.turn.toFixed(2) }; };
    out.player = look('player'); out.grid = look('grid'); out.spin = look('spin'); out.meter = look('meter');
    m.impl.gaze.setCluster({ x: 700, y: 90 }); out.clusterTop = look('cluster'); m.impl.gaze.setCluster({ x: 700, y: 500 }); out.clusterLow = look('cluster');
    const t = m.impl.gaze.targets; out.targets = { grid: t.grid(), spin: t.spin() };
    return out;
  });
  check('D6 gaze in the live page: the eyes turn right toward the grid and the spin button, up to a high cluster and down to a low one, back to the player on request', g.grid.x > 0.7 && g.spin.x > 0.5 && g.player.x < 0 && g.clusterTop.y < g.clusterLow.y && g.clusterTop.y < -0.1 && g.clusterLow.y > g.clusterTop.y + 0.15, JSON.stringify(g));
  check('D6b no console error', errors.length === 0, errors.join(' | ').slice(0, 200));
  await ctx.close();

  // D7: the OS asks for reduced motion -> Auto = Still; the player's own Full beats the OS, live
  ctx = await browser.newContext({ viewport: { width: 1024, height: 576 }, deviceScaleFactor: 1, serviceWorkers: 'block', reducedMotion: 'reduce' });
  page = await ctx.newPage(); const errors2 = [];
  page.on('console', (m) => { if (m.type() === 'error') errors2.push(m.text()); }); page.on('pageerror', (e) => errors2.push('pageerror: ' + e.message));
  await page.goto(url + '&x=2'); await page.waitForFunction(() => document.body.classList.contains('state-idle'), null, { timeout: 25000 }); await page.waitForTimeout(1000);
  const mo = await page.evaluate(async () => {
    const { mascotOf } = await import('/src/render/mascot.js'); const { settings } = await import('/src/settings.js');
    const m = mascotOf(document.getElementById('heroine-slot')); const rig = m.impl.rig(); const out = {};
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    out.level = settings.get('motionLevel'); out.reduced = rig.reduced;
    out.stillReact = m.react('bigwin', { ratio: 9 }); out.pose = rig.pose; out.clip = rig.stats().clip;
    settings.set('motion', 'calm'); await sleep(50);
    out.calmReduced = rig.reduced; out.calmReact = m.react('epic', { ratio: 40 }); await sleep(200); out.calmClip = rig.stats().clip; rig.stop();
    settings.set('motion', 'full'); await sleep(50);
    out.fullLevel = settings.get('motionLevel'); out.fullReduced = rig.reduced;
    out.fullReact = m.react('epic', { ratio: 40 }); await sleep(300); out.fullClip = rig.stats().clip;
    settings.set('motion', 'still'); await sleep(50); out.stillReduced = rig.reduced;
    settings.set('motion', 'auto'); await sleep(50); out.autoReduced = rig.reduced;
    try { settings.reset(); } catch (e) { /* ignore */ }
    return out;
  });
  check('D7 settings in the real game: Auto + OS reduced motion = static poses (no clip), the player choosing Calm or Full wins live, Still and Auto go back to static', mo.level === 'calm' && mo.reduced === true && mo.stillReact === true && mo.pose === 'bigwin' && mo.clip === '' && mo.calmReduced === false && mo.calmClip === 'megaWin' && mo.fullLevel === 'full' && mo.fullReduced === false && mo.fullReact === true && mo.fullClip === 'megaWin' && mo.stillReduced === true && mo.autoReduced === true, JSON.stringify(mo));
  check('D7b no console error', errors2.length === 0, errors2.join(' | ').slice(0, 200));
  await ctx.close();
}

// ------------------------------------------------------------------------------------------------ E. readability at 100 px
{
  const { page, ctx, errors } = await harness({ width: 760, height: 220 }, { dsf: 1 });
  await page.evaluate(async () => {
    const { createHeroineMascot } = window.H; document.body.style.background = '#181640';
    const mk = async (crop, left) => { const host = document.createElement('div'); host.style.cssText = `position:absolute;left:${left}px;top:10px;height:100px`; document.body.appendChild(host); return createHeroineMascot(host, { size: 100, crop, settings: null, reduced: true }); };
    let x = 10; for (const crop of ['full', 'bust', 'head']) { const m = await mk(crop, x); x += crop === 'full' ? 90 : crop === 'bust' ? 80 : 70; m.rig().setPose('idle', { snap: true }); m.rig().snap(); }
    // the other four costumes at 100 px (full)
    for (const o of ['lab', 'trench', 'casino', 'vault']) { const host = document.createElement('div'); host.style.cssText = `position:absolute;left:${x}px;top:10px;height:100px`; document.body.appendChild(host); const m = await createHeroineMascot(host, { size: 100, outfit: o, settings: null, reduced: true }); m.rig().snap(); x += 70; }
  });
  await page.screenshot({ path: path.join(SHOTS, 'readable_100px.png'), clip: { x: 0, y: 0, width: 760, height: 120 } });
  const px = await page.evaluate(() => [...document.querySelectorAll('.heroine-wrap')].map((w) => { const r = w.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; }));
  check('E1 100 px renders (full, waist-up, face, four more costumes): sizes as asked, screenshot saved for review', px.length === 7 && px.every(([w, h]) => h === 100 && w >= 45), JSON.stringify(px));
  check('E2 no console error', errors.length === 0, errors.join(' | ').slice(0, 200));
  await ctx.close();
}

await browser.close(); stopAll();
const fails = results.filter((r) => !r.ok);
console.log(`\n${results.length - fails.length}/${results.length} checks passed${fails.length ? '; FAILED: ' + fails.map((f) => f.name.split(' ')[0] + ' ' + f.name.split(' ')[1]).join(', ') : ''}`);
if (process.argv.includes('--report')) fs.writeFileSync(path.join(HERE, 'last_run.json'), JSON.stringify({ at: new Date().toISOString(), results, liveInfo }, null, 1));
process.exit(fails.length ? 1 : 0);
