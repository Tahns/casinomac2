// Shared helpers for the browser captures (WP5 wrote them, WP10 reuses them): static server, browser, harness page, screencast
// frames, luminance analysis (flash counting), frame-time stats, compositor layers, canvas memory.
//
// Nothing here needs a dependency beyond playwright-core (loaded from PW_DIR, default /tmp/claude-0/pw/) and node built-ins.
// The server is started on the port you give and only the PID started here is ever killed.
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const HARNESS = '/tests/fx/harness.html';

export function args(argv = process.argv.slice(2)) {
  const o = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const k = a.slice(2), n = argv[i + 1];
    if (n == null || n.startsWith('--')) o[k] = true; else { o[k] = n; i++; }
  }
  return o;
}

export function loadPlaywright() {
  const dir = process.env.PW_DIR || '/tmp/claude-0/pw/';
  return createRequire(dir.endsWith('/') ? dir : dir + '/')('playwright-core');
}

/** Start `node serve.mjs <port>` unless BASE is given; returns { base, stop() } (stop kills only that PID). */
export async function startServer(port) {
  if (process.env.BASE) return { base: process.env.BASE.replace(/\/$/, ''), stop() {} };
  const child = spawn(process.execPath, [path.join(ROOT, 'serve.mjs'), String(port)], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
  await new Promise((res, rej) => {
    const to = setTimeout(() => rej(new Error('server did not start')), 8000);
    child.stdout.on('data', (d) => { if (String(d).includes('http://')) { clearTimeout(to); res(); } });
    child.on('exit', (c) => { clearTimeout(to); rej(new Error('server exited ' + c)); });
  });
  return { base: `http://localhost:${port}`, pid: child.pid, stop() { try { process.kill(child.pid); } catch (e) { /* already gone */ } } };
}

export async function launch() {
  const { chromium } = loadPlaywright();
  const exe = process.env.CHROME || undefined;
  return chromium.launch({ headless: true, executablePath: exe, args: ['--no-sandbox', '--disable-gpu-vsync-throttling'] });
}

/** Open the WP5 harness (real index.html markup + real renderer). opts: { viewport, dpr, css, motion, flashReduced, touch } */
export async function openHarness(browser, base, opts = {}) {
  const ctx = await browser.newContext({ viewport: opts.viewport || { width: 1024, height: 576 }, deviceScaleFactor: opts.dpr || 1, hasTouch: !!opts.touch, isMobile: !!opts.touch });
  if (opts.motion || opts.flashReduced != null) {
    const blob = JSON.stringify({ v: 1, ...(opts.motion ? { motion: opts.motion } : {}), ...(opts.flashReduced != null ? { reduceFlash: !!opts.flashReduced } : {}) });
    await ctx.addInitScript((b) => { try { localStorage.setItem('am_settings', b); } catch (e) { /* ignore */ } }, blob);
  }
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e && e.message || e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(base + (opts.path || HARNESS), { waitUntil: 'load' });
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 30000 });
  if (opts.css) await page.addStyleTag({ content: opts.css });
  await page.waitForTimeout(opts.settle || 1200);
  const cdp = await ctx.newCDPSession(page);
  return { ctx, page, cdp, errors };
}

/** Busy books. 'busy' = a free-spin round: trigger, dial at step 8, a 30-cell tumble chain of 10+ steps, a wire that blasts. */
export async function bookFor(page, name, opts = {}) {
  return page.evaluate(async ({ name, opts }) => {
    const D = await import('../../src/render/devbooks.js');
    if (name === 'busy' || name === 'tumble') {
      const steps = opts.steps || 12;
      for (let seed = opts.seed || 1; seed < 4000; seed++) {
        const gm = { v: 1, step: 8, cap: 100 };
        const free = name === 'busy';
        const sp = D.makeSpin({ seed, free, fsIndex: free ? 1 : undefined, fsTotal: free ? 10 : undefined, gm, pool: ['H4', 'L1', 'L2', 'H2'], cascades: steps, fuse: name === 'busy' ? { adv: 1, detmin: 3 } : null });
        const tumbles = sp.events.filter((e) => e.type === 'tumbleBoard').length;
        if (tumbles < (opts.minTumbles || 9)) continue;
        if (name === 'busy' && !sp.events.some((e) => e.type === 'fuseBlast')) continue;
        let out = [];
        if (free) {
          const b = D.bonus(2);
          out = b.slice(0, b.findIndex((e) => e.type === 'freeSpinTrigger') + 1);
          out.push({ type: 'missionAssigned', mission: 'briefing', totalFs: 10, dialStart: 1, dialStep: 8, dialCap: 100, payTiming: 'step', layout: 'mezzanine', fuseLen: 8 });
          out.push({ type: 'updateGlobalMult', globalMult: 1 });
        }
        sp.events.forEach((e) => out.push(e));
        const W = sp.win;
        if (free) out.push({ type: 'freeSpinEnd', amount: W, winLevel: 3 });
        out.push({ type: 'setTotalWin', amount: W }, { type: 'finalWin', amount: W });
        out.forEach((e, i) => { e.index = i; });
        return { events: out, seed, tumbles, label: `${name} seed ${seed}: ${tumbles} tumbles, ${out.length} events` };
      }
      return null;
    }
    if (D.BOOKS[name]) { const ev = D.BOOKS[name](...(opts.args || [])); return { events: ev, label: name }; }
    return null;
  }, { name, opts });
}

/** The busiest book of a fixture .jsonl (most flash-prone events: blasts, retriggers, tumbles, dial steps). */
export async function busiestFixture(file, maxEvents = 400) {
  const fs = await import('node:fs');
  const rl = fs.readFileSync(file, 'utf8').split('\n').filter(Boolean);
  let best = null;
  for (const line of rl) {
    let b; try { b = JSON.parse(line); } catch (e) { continue; }
    const ev = b.events || [];
    if (ev.length > maxEvents) continue;
    const score = ev.reduce((a, e) => a + ({ fuseBlast: 6, freeSpinRetrigger: 6, freeSpinTrigger: 6, wincap: 6, tumbleBoard: 2, updateGlobalMult: 1, winInfo: 1 }[e.type] || 0), 0) / Math.max(20, ev.length) * 100 + ev.length * .01;
    if (!best || score > best.score) best = { score, id: b.id, payoutMultiplier: b.payoutMultiplier, events: ev };
  }
  return best;
}

/** Record the screencast while fn() runs. Returns frames [{ t (ms), data (base64 jpeg) }]. */
export async function screencast(cdp, fn, opts = {}) {
  const frames = [];
  const on = (f) => { frames.push({ t: f.metadata.timestamp * 1000, data: f.data }); cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {}); };
  cdp.on('Page.screencastFrame', on);
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: opts.quality || 70, maxWidth: opts.maxWidth || 320, maxHeight: opts.maxHeight || 320, everyNthFrame: 1 });
  try { await fn(); } finally { await cdp.send('Page.stopScreencast').catch(() => {}); cdp.off('Page.screencastFrame', on); }
  return frames;
}

/**
 * Decode the jpeg frames in a blank page and return per-frame relative luminance (WCAG sRGB formula) of a set of regions:
 * the full frame plus a 3x3 grid of overlapping windows, each 1/3 of the width and height (about the 341 x 256 px "10 degree"
 * area of WCAG 2.3.1 on a 1024 x 768 screen), stepped by 1/6.
 */
export async function luminanceSeries(browser, frames) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.setContent('<canvas id="c"></canvas>');
  const out = [];
  const B = 40;
  for (let i = 0; i < frames.length; i += B) {
    const chunk = frames.slice(i, i + B).map((f) => f.data);
    const res = await page.evaluate(async (list) => {
      const lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
      const LUT = new Float32Array(256); for (let k = 0; k < 256; k++) LUT[k] = lin(k);
      const c = document.getElementById('c'); const g = c.getContext('2d', { willReadFrequently: true });
      const r = [];
      for (const b64 of list) {
        const bmp = await createImageBitmap(await (await fetch('data:image/jpeg;base64,' + b64)).blob());
        c.width = bmp.width; c.height = bmp.height; g.drawImage(bmp, 0, 0);
        const { data, width: W, height: H } = g.getImageData(0, 0, bmp.width, bmp.height);
        const wins = [[0, 0, W, H]];
        for (let y = 0; y < 5; y++) for (let x = 0; x < 5; x++) wins.push([Math.round(x * W / 6), Math.round(y * H / 6), Math.round(W / 3), Math.round(H / 3)]);
        const lum = wins.map(([x0, y0, w, h]) => {
          let s = 0, n = 0, red = 0;
          for (let y = y0; y < y0 + h; y += 2) for (let x = x0; x < x0 + w; x += 2) {
            const p = (y * W + x) * 4, R = data[p], G = data[p + 1], Bl = data[p + 2];
            s += 0.2126 * LUT[R] + 0.7152 * LUT[G] + 0.0722 * LUT[Bl]; n++;
            const sum = R + G + Bl; if (sum > 0 && R / sum >= 0.8) red++;
          }
          return [s / n, red / n];
        });
        r.push(lum);
      }
      return r;
    }, chunk);
    res.forEach((lum, k) => out.push({ t: frames[i + k].t, lum: lum.map((x) => x[0]), red: lum.map((x) => x[1]) }));
  }
  await ctx.close();
  return out;
}

/**
 * WCAG 2.3.1 style flash count on one luminance series: a flash is a pair of opposing changes of at least 0.10 relative
 * luminance where the darker state is below 0.80. Returns { transitions: [t...], maxPerSecond } (flashes = transitions / 2 in
 * the worst 1 s window).
 */
export function countFlashes(series, idx, opts = {}) {
  const d = opts.delta || 0.1;
  const tr = [];
  if (!series.length) return { transitions: tr, maxPerSecond: 0 };
  // zig-zag turning points with a d hysteresis: each confirmed swing of >= d (darker side < 0.8) is one transition
  let dir = 0, C = 0, lo = series[0].lum[idx], hi = lo;
  for (const f of series) {
    const L = f.lum[idx];
    if (dir === 0) {
      lo = Math.min(lo, L); hi = Math.max(hi, L);
      if (L - lo >= d && lo < 0.8) { tr.push(f.t); dir = 1; C = L; } else if (hi - L >= d && L < 0.8) { tr.push(f.t); dir = -1; C = L; }
    } else if (dir > 0) {
      if (L > C) C = L; else if (C - L >= d && L < 0.8) { tr.push(f.t); dir = -1; C = L; }
    } else if (L < C) C = L; else if (L - C >= d && C < 0.8) { tr.push(f.t); dir = 1; C = L; }
  }
  let maxT = 0;
  for (let i = 0; i < tr.length; i++) { let j = i; while (j + 1 < tr.length && tr[j + 1] - tr[i] < 1000) j++; maxT = Math.max(maxT, j - i + 1); }
  return { transitions: tr, maxPerSecond: Math.floor(maxT / 2) };
}

export const pct = (a, p) => { if (!a.length) return NaN; const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };

/** Track the compositor layer count through LayerTree events. Returns { get idle/max/median/now, start(), stop(), describe() }. */
export async function layerProbe(cdp) {
  await cdp.send('DOM.enable').catch(() => {}); await cdp.send('LayerTree.enable');
  let now = [], track = false; const seen = [];
  cdp.on('LayerTree.layerTreeDidChange', (e) => { if (e.layers) { now = e.layers; if (track) seen.push(e.layers.length); } });
  return {
    get now() { return now.length; },
    get max() { return seen.length ? Math.max(...seen) : now.length; },
    get median() { return seen.length ? pct(seen, 0.5) : now.length; },
    get p90() { return seen.length ? pct(seen, 0.9) : now.length; },
    start() { track = true; seen.length = 0; }, stop() { track = false; },
    async reasons() {
      const g = {};
      for (const l of now) { let r = []; try { r = (await cdp.send('LayerTree.compositingReasons', { layerId: l.layerId })).compositingReasonIds; } catch (e) { /* gone */ } const k = r.join(',') || '-'; g[k] = (g[k] || 0) + 1; }
      return g;
    },
  };
}
