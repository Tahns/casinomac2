// WP1/WP3 M2/M3 visual acceptance: node tests/heroine/visual.mjs [--shots]   (own ports 5932/5933, PORTS="a,b"; exit 1 on a FAIL)
//   R  no raster: no bitmap image shipped with the game (source scan + every response of a live session); only data:image/svg+xml favicons
//   F  fonts: at most 2 embedded families, all local (@font-face url in the game folder, font-display swap, licence file next to it), the
//      display font actually used by a title and loaded
//   D  devicePixelRatio 1 / 2 / 3: the game and the heroine render (no console error, svg painted, no horizontal scroll)
//   K  flicker: during idle no element toggles its visibility more than twice in any 100 ms window (4 s sampled on every frame)
//   S  screenshots at 1280x720, 1024x576, 425x812, 400x225 (tests/heroine/shots/m23_*.png), no page scroll, heroine box beside the grid
import fs from 'node:fs';
import path from 'node:path';
import { FRONT, chromium, startServers, gameUrl, reporter, sleep, VIEWPORTS, shotsDir } from './m23_lib.mjs';

const { check, done } = reporter();
const RASTER = /\.(png|jpe?g|gif|webp|bmp|ico|avif|tiff?)$/i;

// ---------------------------------------------------------------- R1 source scan (what the build would ship: index.html, styles.css, src/**)
{
  const files = ['index.html', 'styles.css'];
  (function walk(d) { for (const e of fs.readdirSync(path.join(FRONT, d), { withFileTypes: true })) { const r = path.join(d, e.name); if (e.isDirectory()) walk(r); else files.push(r); } })('src');
  const rasterFiles = files.filter((f) => RASTER.test(f));
  const hits = [];
  for (const f of files) {
    if (!/\.(js|css|html|json)$/.test(f)) continue;
    const t = fs.readFileSync(path.join(FRONT, f), 'utf8');
    for (const m of t.matchAll(/data:image\/(?!svg\+xml)[a-z0-9.+-]+/gi)) hits.push(`${f}: ${m[0]}`);
    for (const m of t.matchAll(/["'(]([^"'()\s]+\.(?:png|jpe?g|gif|webp|bmp|avif))["')]/gi)) hits.push(`${f}: ${m[1]}`);
  }
  check('R1 no raster image file under src/ and no bitmap reference or bitmap data URI in index.html, styles.css, src/**', rasterFiles.length === 0 && hits.length === 0, [...rasterFiles, ...hits].slice(0, 6).join(' | ') || `${files.length} files scanned`);
  const favicon = /<link rel="icon" href="data:image\/svg\+xml/.test(fs.readFileSync(path.join(FRONT, 'index.html'), 'utf8'));
  check('R1b the favicon is an inline SVG data URI', favicon);
}

// ---------------------------------------------------------------- F1 fonts (static)
const css = fs.readFileSync(path.join(FRONT, 'styles.css'), 'utf8');
{
  const faces = [...css.matchAll(/@font-face\s*\{([^}]*)\}/g)].map((m) => m[1]);
  const fams = new Set(faces.map((f) => (/font-family:\s*["']?([^"';]+)/.exec(f) || [])[1]));
  const local = faces.every((f) => { const u = /url\(["']?([^"')]+)/.exec(f); return u && !/^[a-z]+:/i.test(u[1]) && fs.existsSync(path.join(FRONT, u[1])); });
  const swap = faces.every((f) => /font-display:\s*swap/.test(f));
  const lic = fs.existsSync(path.join(FRONT, 'assets/fonts/LICENSE-LuckiestGuy-Apache-2.0.txt')) && /Apache License/.test(fs.readFileSync(path.join(FRONT, 'assets/fonts/LICENSE-LuckiestGuy-Apache-2.0.txt'), 'utf8'));
  check('F1 at most 2 embedded font families, every one local with font-display swap, licence file next to it', faces.length >= 1 && fams.size <= 2 && local && swap && lic, `families ${[...fams].join(', ')}; local ${local}; swap ${swap}; licence ${lic}`);
  check('F1b no external font host (no Google Fonts / http url in styles.css or index.html)', !/https?:\/\/(?!www\.w3\.org)/.test(css) && !/fonts\.googleapis|fonts\.gstatic/.test(fs.readFileSync(path.join(FRONT, 'index.html'), 'utf8')));
}

const servers = await startServers('5932,5933');
const browser = await chromium.launch();
const shots = shotsDir('tests/heroine/shots');

async function open(vp, dsf = 1, extra = {}) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: dsf, hasTouch: !!vp.touch, isMobile: !!vp.touch, serviceWorkers: 'block' });
  const page = await ctx.newPage(); const errors = []; const images = []; const external = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('response', (r) => { const ct = (r.headers()['content-type'] || '').toLowerCase(); const u = r.url(); if ((ct.startsWith('image/') && !ct.includes('svg')) || RASTER.test(new URL(u).pathname)) images.push(u + ' ' + ct); });
  page.on('request', (r) => { const u = new URL(r.url()); if (!/^(localhost|127\.0\.0\.1)$/.test(u.hostname) && !/^(data|blob):/.test(r.url())) external.push(r.url()); });
  await page.goto(gameUrl(servers, { device: vp.touch ? 'mobile' : 'desktop', ...extra }));
  await page.waitForFunction(() => document.body.classList.contains('state-idle'), null, { timeout: 25000 }).catch(() => {});
  await page.waitForFunction(() => { const s = document.querySelector('#heroine-slot svg'); return !!s && !document.getElementById('heroine-slot').hidden; }, null, { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(900);
  return { ctx, page, errors, images, external };
}

// ---------------------------------------------------------------- F2 + R2 + S at the four viewports
for (const vp of VIEWPORTS) {
  const name = `${vp.width}x${vp.height}`;
  const { ctx, page, errors, images, external } = await open(vp);
  const st = await page.evaluate(async () => {
    await document.fonts.ready;
    const h = document.querySelector('.modal-box h2, .ld-title, .spin-lbl, .mbtn') || document.body;
    const sc = document.scrollingElement;
    const slot = document.getElementById('heroine-slot'), wrap = document.querySelector('.board-wrap');
    const r = (e) => { if (!e) return null; const b = e.getBoundingClientRect(); return { l: b.left, t: b.top, r: b.right, b: b.bottom, w: b.width, h: b.height }; };
    const hs = slot && !slot.hidden ? r(slot) : null, bw = r(wrap);
    const overlap = hs && bw ? !(hs.r <= bw.l + 1 || hs.l >= bw.r - 1 || hs.b <= bw.t + 1 || hs.t >= bw.b - 1) : false;
    const imgs = [...document.images].map((i) => i.currentSrc || i.src).filter((s) => s && !s.startsWith('data:image/svg'));
    const bgs = [...document.querySelectorAll('*')].map((e) => getComputedStyle(e).backgroundImage).filter((b) => /url\((?!["']?data:image\/svg)/.test(b));
    return {
      fontLoaded: document.fonts.check('20px "Luckiest Guy"'), fontFamily: getComputedStyle(h).fontFamily.split(',')[0],
      scrollX: sc.scrollWidth > sc.clientWidth + 1, scrollY: sc.scrollHeight > sc.clientHeight + 1,
      hero: hs, mode: slot && slot.dataset.mode, overlap, imgs, bgs: bgs.slice(0, 3),
    };
  });
  if (vp.width === 1280) check('F2 the display font is loaded locally and used by the titles', st.fontLoaded && /Luckiest Guy/.test(st.fontFamily), `${st.fontFamily}, loaded ${st.fontLoaded}`);
  check(`R2 ${name}: no bitmap image requested or drawn by the live game (responses, <img>, CSS backgrounds)`, images.length === 0 && st.imgs.length === 0 && st.bgs.length === 0, [...images, ...st.imgs, ...st.bgs].slice(0, 3).join(' | '));
  check(`S ${name}: no page scroll, no external request, no console error, heroine box (${st.mode}) never over the grid`, !st.scrollX && !st.scrollY && external.length === 0 && errors.length === 0 && !st.overlap,
    `scroll ${st.scrollX}/${st.scrollY}, ext ${external.length}, errors ${errors.slice(0, 2).join(' / ')}, hero ${st.hero ? Math.round(st.hero.w) + 'x' + Math.round(st.hero.h) : 'hidden'}`);
  await page.screenshot({ path: path.join(shots, `m23_${name}.png`) });
  await ctx.close();
}

// ---------------------------------------------------------------- D devicePixelRatio 1 / 2 / 3
for (const dsf of [1, 2, 3]) {
  const { ctx, page, errors } = await open({ width: 1024, height: 576 }, dsf);
  const st = await page.evaluate(() => {
    const svg = document.querySelector('#heroine-slot svg'); const b = svg ? svg.getBoundingClientRect() : null;
    const board = document.querySelector('.board'); const bb = board ? board.getBoundingClientRect() : null;
    const sc = document.scrollingElement;
    return { dpr: devicePixelRatio, svg: b ? [Math.round(b.width), Math.round(b.height)] : null, paths: svg ? svg.querySelectorAll('path').length : 0, board: bb ? [Math.round(bb.width), Math.round(bb.height)] : null, scroll: sc.scrollWidth > sc.clientWidth + 1 };
  });
  const png = await page.screenshot();
  check(`D dpr ${dsf}: game + heroine render (svg painted, board sized, no scroll, no console error)`, st.dpr === dsf && st.svg && st.svg[0] > 40 && st.paths > 50 && st.board && st.board[0] > 200 && !st.scroll && errors.length === 0 && png.length > 20000,
    `${JSON.stringify(st)}, png ${png.length} B${errors.length ? ', ' + errors[0] : ''}`);
  if (dsf === 3) await page.screenshot({ path: path.join(shots, 'm23_dpr3_heroine.png'), clip: await page.locator('#heroine-slot').boundingBox() || undefined });
  await ctx.close();
}

// ---------------------------------------------------------------- K flicker during idle
{
  const { ctx, page } = await open({ width: 1024, height: 576 });
  const res = await page.evaluate(() => new Promise((resolve) => {
    const els = [...document.querySelectorAll('#app *, #app')];
    const vis = (e) => { if (!e.isConnected) return false; const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) return false; if (e.getAttribute && (e.getAttribute('visibility') === 'hidden' || e.getAttribute('display') === 'none')) return false; return true; };
    const state = new Map(els.map((e) => [e, vis(e)])); const flips = new Map();
    const t0 = performance.now();
    function tick(now) {
      for (const e of els) { const v = vis(e); if (v !== state.get(e)) { state.set(e, v); const a = flips.get(e) || []; a.push(now); flips.set(e, a); } }
      if (now - t0 < 4000) requestAnimationFrame(tick); else {
        let worst = 0, who = '';
        for (const [e, a] of flips) for (let i = 0; i < a.length; i++) { let n = 1; for (let j = i + 1; j < a.length && a[j] - a[i] < 100; j++) n++; if (n > worst) { worst = n; who = (e.id ? '#' + e.id : '') + '.' + (e.getAttribute('class') || e.tagName); } }
        resolve({ elements: els.length, toggling: flips.size, worst, who });
      }
    }
    requestAnimationFrame(tick);
  }));
  check('K idle flicker: no element toggles visibility more than twice in any 100 ms (4 s, every frame)', res.worst <= 2, JSON.stringify(res));
  await ctx.close();
}

await browser.close();
done();
