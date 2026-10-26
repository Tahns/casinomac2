// Offline + live audio QA for src/audio.js.
// Usage: PW_DIR=/path/to/dir-with-node_modules/playwright-core PORT=5405 node frontend_mambo/tests/audio/audio.test.mjs
// (starts frontend_mambo/serve.mjs itself when nothing listens on PORT)
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FRONT = path.resolve(HERE, '../..');
const PORT = process.env.PORT || '5405';
const URL = `http://localhost:${PORT}/tests/audio/harness.html`;
const require = createRequire((process.env.PW_DIR || '/tmp/claude-0/pw') + '/');
const { chromium } = require('playwright-core');
const exe = process.env.CHROMIUM || '/opt/pw-browsers/chromium/chrome';

let fails = 0;
const ok = (c, msg) => { if (!c) fails++; console.log((c ? 'PASS ' : 'FAIL ') + msg); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function up() { try { return (await fetch(URL)).ok; } catch (e) { return false; } }
let srv = null;
if (!(await up())) { srv = spawn('node', ['serve.mjs'], { cwd: FRONT, env: { ...process.env, PORT }, stdio: 'ignore' }); for (let i = 0; i < 40 && !(await up()); i++) await sleep(150); }

const fs = await import('node:fs');
let execPath = exe; if (!fs.existsSync(execPath)) { const d = '/opt/pw-browsers/chromium'; execPath = undefined; }
const browser = await chromium.launch({ executablePath: execPath, args: ['--autoplay-policy=no-user-gesture-required', '--no-sandbox'] });
const INIT = `(() => { // same graph introspection as tests/guidelines/lib.mjs (guideline 107)
  window.__qa = { destSources: [], ctxs: [] };
  const AC = window.AudioContext;
  const origConnect = AudioNode.prototype.connect;
  AudioNode.prototype.connect = function (dest, ...a) { try { if (dest && dest instanceof AudioDestinationNode) window.__qa.destSources.push(this); if (dest instanceof AudioNode) (this.__out || (this.__out = [])).push(dest); (window.__qa.nodes || (window.__qa.nodes = new Set())).add(this); } catch (e) {} return origConnect.call(this, dest, ...a); };
  window.__qa.audible = () => { const memo = new Map(); const aud = (n, seen) => { if (n instanceof AudioDestinationNode) return true; if (n instanceof GainNode && n.gain.value < 0.001) return false; if (memo.has(n)) return memo.get(n); if (seen.has(n)) return false; seen.add(n); const r = (n.__out || []).some((m) => aud(m, seen)); memo.set(n, r); return r; }; const srcs = [...(window.__qa.nodes || [])].filter((n) => n instanceof OscillatorNode || n instanceof AudioBufferSourceNode); return { sources: srcs.length, audibleSources: srcs.filter((n) => aud(n, new Set())).length }; };
  const W = function (...a) { const c = new AC(...a); window.__qa.ctxs.push(c); return c; }; W.prototype = AC.prototype; window.AudioContext = W;
})();`;

// ---------------------------------------------------------------- offline
{
  const ctx = await browser.newContext(); const page = await ctx.newPage();
  page.on('pageerror', (e) => { fails++; console.log('FAIL pageerror ' + e.message); });
  await page.goto(URL); await page.waitForFunction(() => window.__ready);

  const IDS = ['click', 'error', 'nearmiss', 'wahwah', 'spin', 'whoosh', 'land', 'pop', 'win', 'xylo', 'scatter', 'antic', 'fuse', 'explosion', 'mult', 'fsStart', 'retrigger', 'fsEnd', 'tada', 'bigwin', 'kaching', 'coin', 'count', 'heart', 'rumble', 'crack', 'shower', 'stinger', 'tick', 'drip', 'mascot_hop', 'mascot_gasp', 'dossier', 'wire', 'ticks', 'defuse', 'snip', 'blast', 'stamp', 'metermax', 'meterTick', 'meter', 'meterRise', 'riser', 'phone', 'shutter', 'vault'];
  const OPTS = { pop: [{}, { combo: 1 }, { combo: 8 }], win: [{ combo: 1 }, { combo: 3, size: 8 }, { combo: 6, size: 30 }], bigwin: [{ level: 1 }, { level: 3 }], scatter: [{ n: 1 }, { n: 4 }], wire: [{ i: 0 }, { i: 12 }], tick: [{}, { p: 1 }], ticks: [{ burn: 0, total: 8 }, { burn: 7, total: 8 }], mult: [{ level: 1 }, { level: 12 }], stinger: [{ level: 1 }, { level: 4 }], land: [{ vol: 0.5 }] };
  const tests = []; for (const id of IDS) for (const o of (OPTS[id] || [{}])) tests.push([id, o]);

  const stats = await page.evaluate(async (tests) => {
    const out = [];
    for (const [id, o] of tests) {
      const sr = 44100, secs = 4.2;
      const oc = new OfflineAudioContext(2, sr * secs, sr);
      const e = window.A.createEngine(oc, { noLimit: true }); // pre-limiter peak
      e.SOUNDS[id](o);
      const buf = await oc.startRendering();
      let peak = 0, sum = 0, nan = 0, last = 0, n = 0; const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) { const v = d[i]; if (!Number.isFinite(v)) { nan++; continue; } const a = Math.abs(v); if (a > peak) peak = a; sum += v * v; n++; if (a > 0.002) last = i; }
      out.push({ id, o, peak, rms: Math.sqrt(sum / n), nan, len: last / sr, voices: e.voices });
    }
    return out;
  }, tests);
  for (const s of stats) {
    const good = s.nan === 0 && s.peak > 0.02 && s.rms > 1e-4 && s.peak < 0.99;
    ok(good, `sfx ${s.id} ${JSON.stringify(s.o)} peak=${s.peak.toFixed(3)} (${(20 * Math.log10(s.peak)).toFixed(1)} dBFS) rms=${(20 * Math.log10(s.rms)).toFixed(1)} dB len=${s.len.toFixed(2)}s nan=${s.nan}`);
    if (s.id === 'nearmiss') ok(s.len < 1.4, `nearmiss is short (${s.len.toFixed(2)}s)`);
  }
  // win length scales with win size
  const wl = stats.filter((s) => s.id === 'win').map((s) => s.len); ok(wl[0] <= wl[1] && wl[1] <= wl[2] && wl[2] > wl[0], `xylophone gliss length scales with size (${wl.map((x) => x.toFixed(2)).join(' < ')})`);
  // pop pitch climbs with combo: compare zero-crossing rate of combo 1 vs combo 8
  const pit = await page.evaluate(async () => {
    const f = async (combo) => { const oc = new OfflineAudioContext(1, 44100 * 0.5, 44100); const e = window.A.createEngine(oc); e.SOUNDS.pop({ combo }); const d = (await oc.startRendering()).getChannelData(0); let z = 0; for (let i = 1; i < 22050; i++) if ((d[i - 1] < 0) !== (d[i] < 0)) z++; return z; };
    return [await f(1), await f(8)];
  });
  ok(pit[1] > pit[0] * 1.25, `pop pitch climbs with combo (zero crossings ${pit[0]} -> ${pit[1]})`);

  // worst case pile-up: voice cap + peak
  const pile = await page.evaluate(async () => {
    const oc = new OfflineAudioContext(2, 44100 * 3, 44100); const e = window.A.createEngine(oc, { noLimit: true });
    for (let i = 0; i < 40; i++) e.SOUNDS.pop({ combo: 1 + (i % 9) });
    e.SOUNDS.explosion(); e.SOUNDS.bigwin({ level: 3 }); e.SOUNDS.shower({ n: 40 }); e.SOUNDS.win({ combo: 6, size: 30 });
    const v = e.voices; const d = (await oc.startRendering()).getChannelData(0); let peak = 0, nan = 0; for (const x of d) { if (!Number.isFinite(x)) nan++; else peak = Math.max(peak, Math.abs(x)); }
    return { v, peak, nan };
  });
  ok(pile.v <= 56 && pile.nan === 0, `voice cap holds under pile-up (voices=${pile.v} <= 56, nan=${pile.nan})`);
  console.log(`INFO pile-up pre-limiter peak ${pile.peak.toFixed(3)}; the soft limiter keeps the output <= 0.97`);
  const lim = await page.evaluate(async () => {
    const oc = new OfflineAudioContext(2, 44100 * 3, 44100); const e = window.A.createEngine(oc);
    for (let i = 0; i < 40; i++) e.SOUNDS.pop({ combo: 1 + (i % 9) }); e.SOUNDS.explosion(); e.SOUNDS.bigwin({ level: 3 });
    const d = (await oc.startRendering()).getChannelData(0); let peak = 0; for (const x of d) peak = Math.max(peak, Math.abs(x)); return peak;
  });
  ok(lim < 0.98, `final output below 0 dBFS even in pile-up (peak=${lim.toFixed(3)})`);

  // beds
  for (const mood of ['base', 'freespins']) {
    const r = await page.evaluate(async (mood) => {
      const sr = 44100, e0 = window.A.createEngine(new OfflineAudioContext(1, 10, sr)); const info = e0.bedInfo(mood);
      const L = info.loopSecs, loops = 3, secs = L * loops + 2;
      const oc = new OfflineAudioContext(2, Math.ceil(sr * secs), sr); const e = window.A.createEngine(oc, { noLimit: true });
      const B = e.newBus(mood); const t0 = 0.05;
      for (let i = 0; i < info.loopBeats * loops; i++) e.bedBeat(mood, i, t0 + i * info.beat, B);
      const d = (await oc.startRendering()).getChannelData(0);
      let peak = 0, nan = 0, sum = 0; for (const x of d) { if (!Number.isFinite(x)) nan++; else { peak = Math.max(peak, Math.abs(x)); sum += x * x; } }
      // envelope per 50 ms window for loop 2 vs loop 3 (steady-state)
      const W = Math.floor(sr * 0.05), env = (start) => { const a = []; for (let k = 0; k < Math.floor(L / 0.05); k++) { let s = 0; const o = Math.floor((start + k * 0.05) * sr); for (let j = 0; j < W; j++) s += d[o + j] * d[o + j]; a.push(Math.sqrt(s / W)); } return a; };
      const e2 = env(t0 + L), e3 = env(t0 + 2 * L); let maxd = 0, mean = 0, peakEnv = 0; for (let k = 0; k < e2.length; k++) { mean += e2[k]; peakEnv = Math.max(peakEnv, e2[k]); maxd = Math.max(maxd, Math.abs(e2[k] - e3[k])); } mean /= e2.length;
      // seam: loop boundary at t0+2L. Largest sample-to-sample jump near the seam vs a typical busy region; RMS before/after
      const stepAt = (t) => { const c0 = Math.floor(t * sr); let m = 0; for (let i = c0 - 300; i < c0 + 300; i++) m = Math.max(m, Math.abs(d[i] - d[i - 1])); return m; };
      const bars = info.loopBeats / 4, barLen = L / bars; let ref = 0; for (let k = 1; k < bars; k++) ref = Math.max(ref, stepAt(t0 + L + k * barLen));
      const jump = stepAt(t0 + 2 * L), before = 0, after = 0;
      let tail = 0; for (let i = Math.floor((t0 + 3 * L + 1.5) * sr); i < d.length; i++) tail = Math.max(tail, Math.abs(d[i]));
      return { L, bpm: info.bpm, peak, nan, rms: Math.sqrt(sum / d.length), mean, peakEnv, maxd, jump, ref, before, after, tail };
    }, mood);
    const db = (x) => (20 * Math.log10(x)).toFixed(1);
    ok(r.nan === 0 && r.peak > 0.05 && r.peak < 0.9, `bed ${mood} ${r.bpm}bpm loop=${r.L.toFixed(2)}s peak=${db(r.peak)} dBFS rms=${db(r.rms)} dB nan=${r.nan}`);
    ok(r.maxd < r.peakEnv * 0.5, `bed ${mood} loop 2 vs 3 envelope matches (max diff ${r.maxd.toFixed(4)}, peak env ${r.peakEnv.toFixed(4)})`);
    ok(r.jump <= r.ref * 1.25 + 1e-4, `bed ${mood} seam continuous: largest sample step at the seam ${r.jump.toFixed(4)} <= other bar lines ${r.ref.toFixed(4)}`);
    ok(r.tail < 0.01, `bed ${mood} decays cleanly after the last scheduled beat (tail ${r.tail.toFixed(4)})`);
  }
  await ctx.close();
}

// ---------------------------------------------------------------- live: mute silences everything
{
  const ctx = await browser.newContext(); await ctx.addInitScript(INIT); const page = await ctx.newPage();
  page.on('pageerror', (e) => { fails++; console.log('FAIL pageerror ' + e.message); });
  await page.goto(URL); await page.waitForFunction(() => window.__ready);
  const st = () => page.evaluate(() => { const a = window.A.audio, e = a._engine; return { live: e ? e.liveCount : -1, g: e ? e.master.gain.value : -1, state: e ? e.ctx.state : 'none', aud: window.__qa.audible(), muted: document.body.classList.contains('muted'), pressed: document.getElementById('btn-sound').getAttribute('aria-pressed'), ls: localStorage.getItem('am_muted'), mood: a.mood }; });
  let s = await st(); ok(s.state === 'none', 'no AudioContext before a user gesture');
  await page.mouse.click(5, 5); await sleep(1500); s = await st();
  ok(s.state === 'running' && s.live > 0 && s.g > 0.7 && s.mood === 'base', `after gesture the base bed plays (live=${s.live}, master=${s.g.toFixed(2)})`);
  await page.evaluate(() => { const a = window.A.audio; a.play('explosion'); a.play('bigwin', { level: 3 }); a.play('shower', { n: 30 }); });
  await sleep(100); s = await st(); ok(s.live > 40, `sfx + bed voices live (${s.live})`);
  await page.evaluate(() => window.A.audio.setMuted(true)); await sleep(300); s = await st();
  ok(s.live === 0 && s.g < 0.001 && s.aud.audibleSources === 0 && s.muted && s.pressed === 'true' && s.ls === '1', `muted: every voice stopped, master 0, no audible source, body.muted, aria-pressed, localStorage (${JSON.stringify({ live: s.live, g: s.g, aud: s.aud })})`);
  await page.evaluate(() => { const a = window.A.audio; a.play('bigwin'); a.play('click'); a.setMood('freespins'); }); await sleep(1200); s = await st();
  ok(s.live === 0 && s.aud.audibleSources === 0, `while muted nothing is queued or scheduled (live=${s.live})`);
  await page.evaluate(() => window.A.audio.setMuted(false)); await sleep(1500); s = await st();
  ok(s.live > 0 && s.g > 0.7 && s.mood === 'freespins' && s.ls === '0' && s.pressed === 'false', `unmute: bed resumes in the chosen mood (live=${s.live}, mood=${s.mood})`);
  const n1 = (await st()).live; await sleep(3000); const n2 = (await st()).live; ok(n2 < 200 && n1 < 200, `scheduler keeps node count bounded (${n1} -> ${n2})`);
  await page.evaluate(() => window.A.audio.setMood('off')); await sleep(1200); s = await st(); ok(s.live === 0 || s.live < 8, `mood 'off' stops the bed (live=${s.live})`);
  await page.evaluate(() => { window.A.audio.setMuted(true); }); await page.reload(); await page.waitForFunction(() => window.__ready);
  const mm = await page.evaluate(() => ({ m: window.A.audio.muted, b: document.body.classList.contains('muted') })); ok(mm.m && mm.b, 'mute is remembered across reload');
  await ctx.close();
}
await browser.close(); if (srv) srv.kill();
console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED'); process.exit(fails ? 1 : 0);
