// Offline + live audio QA for src/audio.js (v1 checks kept; v2 WP2: buses, taper, sliders, preview, cues, winLike, duck).
// Usage: PW_DIR=/path/to/dir-with-node_modules/playwright-core PORT=5830 node frontend_mambo/tests/audio/audio.test.mjs
// (starts frontend_mambo/serve.mjs itself when nothing listens on PORT; set NO_GAME=1 to skip the replay check that needs the mock RGS)
//   U1  taper (node:test, tests/audio/taper.test.mjs)         A1  music 0 / sfx 0 silence one side only
//   A2  two reverb returns, each on its own bus               A3  all sliders 100: post-limiter peak <= 0.97
//   A4  defaults within 0.1 dB of the v1 render (fixture)     A5  voice cap, killAll
//   L1-L7 live: persist, invalid values, blocked storage, mute vs slider, music 0, master 0, preview rate limit
import { spawn, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { v1Specs, inPageRender, compareRenders } from './render_cases.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FRONT = path.resolve(HERE, '../..');
const PORT = process.env.PORT || '5405';
const URL = `http://localhost:${PORT}/tests/audio/harness.html`;
const require = createRequire((process.env.PW_DIR || '/tmp/claude-0/pw') + '/');
const { chromium } = require('playwright-core');
const exe = [process.env.CHROMIUM, '/opt/pw-browsers/chromium/chrome', '/opt/pw-browsers/chromium'].find((p) => p && fs.existsSync(p) && fs.statSync(p).isFile());

let fails = 0;
const ok = (c, msg) => { if (!c) fails++; console.log((c ? 'PASS ' : 'FAIL ') + msg); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const db = (x) => (x > 1e-12 ? 20 * Math.log10(x) : -Infinity);
const f1 = (x) => (Number.isFinite(x) ? x.toFixed(1) : '-inf');
const sameSet = (a, b) => a.length === b.length && a.every((x) => b.includes(x));

async function up(u = URL) { try { return (await fetch(u)).ok; } catch (e) { return false; } }
const kids = [];
if (!(await up())) { kids.push(spawn('node', ['serve.mjs'], { cwd: FRONT, env: { ...process.env, PORT }, stdio: 'ignore' })); for (let i = 0; i < 40 && !(await up()); i++) await sleep(150); }

const browser = await chromium.launch({ executablePath: exe, args: ['--autoplay-policy=no-user-gesture-required', '--no-sandbox'] });
const INIT = `(() => { // same graph introspection as tests/guidelines/lib.mjs (guideline 107), plus a "bypass" probe
  window.__qa = { destSources: [], ctxs: [] };
  const AC = window.AudioContext;
  const origConnect = AudioNode.prototype.connect;
  AudioNode.prototype.connect = function (dest, ...a) { try { if (dest && dest instanceof AudioDestinationNode) window.__qa.destSources.push(this); if (dest instanceof AudioNode) (this.__out || (this.__out = [])).push(dest); (window.__qa.nodes || (window.__qa.nodes = new Set())).add(this); } catch (e) {} return origConnect.call(this, dest, ...a); };
  window.__qa.audible = () => { const memo = new Map(); const aud = (n, seen) => { if (n instanceof AudioDestinationNode) return true; if (n instanceof GainNode && n.gain.value < 0.001) return false; if (memo.has(n)) return memo.get(n); if (seen.has(n)) return false; seen.add(n); const r = (n.__out || []).some((m) => aud(m, seen)); memo.set(n, r); return r; }; const srcs = [...(window.__qa.nodes || [])].filter((n) => n instanceof OscillatorNode || n instanceof AudioBufferSourceNode); return { sources: srcs.length, audibleSources: srcs.filter((n) => aud(n, new Set())).length }; };
  window.__qa.bypass = (skip) => { const srcs = [...(window.__qa.nodes || [])].filter((n) => n instanceof OscillatorNode || n instanceof AudioBufferSourceNode); let bad = 0; for (const s of srcs) { const seen = new Set(), st = [s]; let hit = false; while (st.length) { const n = st.pop(); if (n === skip) continue; if (n instanceof AudioDestinationNode) { hit = true; break; } if (seen.has(n)) continue; seen.add(n); for (const m of (n.__out || [])) st.push(m); } if (hit) bad++; } return { sources: srcs.length, bypass: bad }; };
  const W = function (...a) { const c = new AC(...a); window.__qa.ctxs.push(c); return c; }; W.prototype = AC.prototype; window.AudioContext = W;
})();`;
const NEW_IDS = ['ledgerTick', 'settingsTest', 'stamp', 'caseSeal', 'caseOpen', 'lightsOut', 'spotlightStep', 'layoutDraw', 'doorCreak', 'dialStep'];

// ---------------------------------------------------------------- U1 (pure functions, node:test)
{
  const r = spawnSync('node', ['--test', path.join(HERE, 'taper.test.mjs')], { cwd: FRONT, encoding: 'utf8' });
  const m = /# pass (\d+)/.exec(r.stdout || ''), n = /# fail (\d+)/.exec(r.stdout || '');
  ok(r.status === 0 && m && +m[1] > 0 && n && +n[1] === 0, `U1 taper + cue table unit tests (node --test tests/audio/taper.test.mjs: ${m ? m[1] : '?'} pass, ${n ? n[1] : '?'} fail)`);
  if (r.status !== 0) console.log((r.stdout || '').split('\n').filter((l) => /not ok|error|expected|actual/i.test(l)).slice(0, 12).join('\n'));
}

// ---------------------------------------------------------------- offline
{
  const ctx = await browser.newContext(); const page = await ctx.newPage();
  page.on('pageerror', (e) => { fails++; console.log('FAIL pageerror ' + e.message); });
  await page.goto(URL); await page.waitForFunction(() => window.__ready);
  const S = (spec) => page.evaluate((s) => window.H.scene(s), spec);

  // ---- cue table: every sound has a winLike flag
  const meta = await page.evaluate(() => { const e = window.A.createEngine(new OfflineAudioContext(1, 10, 44100)); return { sounds: Object.keys(e.SOUNDS), ids: [...window.A.CUE_IDS], info: Object.fromEntries(Object.entries(window.A.CUE_INFO).map(([k, v]) => [k, { ...v, frozen: Object.isFrozen(v) }])) }; });
  ok(sameSet(meta.sounds, meta.ids), `every sound has a CUE_INFO entry and nothing else does (${meta.sounds.length} sounds)`);
  ok(Object.values(meta.info).every((v) => typeof v.winLike === 'boolean' && v.frozen), 'winLike is an explicit boolean on EVERY sound');
  ok(NEW_IDS.every((id) => meta.sounds.includes(id)) && NEW_IDS.every((id) => meta.info[id].winLike === false), `the ten v2 cues exist and none is win-like (${NEW_IDS.join(', ')})`);
  const WL_TRUE = ['win', 'xylo', 'scatter', 'dossier', 'tada', 'bigwin', 'kaching', 'coin', 'shower', 'stinger', 'fsStart', 'fsEnd', 'retrigger', 'metermax', 'mult', 'pop'];
  const WL_FALSE = ['click', 'error', 'spin', 'whoosh', 'land', 'antic', 'wire', 'tick', 'ticks', 'snip', 'explosion', 'count', 'heart', 'rumble', 'crack', 'phone', 'shutter'];
  ok(WL_TRUE.every((id) => meta.info[id].winLike) && WL_FALSE.every((id) => !meta.info[id].winLike), 'reward-like cues are flagged, mechanical and neutral ones are not');
  ok(meta.info.settingsTest.minGap === 0.25, 'settingsTest carries the 250 ms rate limit');

  // ---- every sound renders (pre-limiter), v1 option sets kept, v2 cues added
  const IDS = meta.sounds;
  const OPTS = { pop: [{}, { combo: 1 }, { combo: 8 }], win: [{ combo: 1 }, { combo: 3, size: 8 }, { combo: 6, size: 30 }], bigwin: [{ level: 1 }, { level: 3 }], scatter: [{ n: 1 }, { n: 4 }], wire: [{ i: 0 }, { i: 12 }], tick: [{}, { p: 1 }], ticks: [{ burn: 0, total: 8 }, { burn: 7, total: 8 }], mult: [{ level: 1 }, { level: 12 }], stinger: [{ level: 1 }, { level: 4 }], land: [{ vol: 0.5 }], settingsTest: [{ kind: 'sfx' }, { kind: 'music' }, { kind: 'master' }], layoutDraw: [{}, { dur: 0.2 }], doorCreak: [{}, { dur: 0.4 }], dialStep: [{}, { n: 4 }], spotlightStep: [{ i: 0 }, { i: 1 }], stamp: [{}, { pitch: 0.8, vol: 0.7 }] };
  const stats = [];
  for (const id of IDS) for (const o of (OPTS[id] || [{}])) { const s = await S({ secs: 4.2, noLimit: true, cues: [{ id, o }] }); stats.push({ id, o, ...s }); }
  for (const s of stats) {
    const good = s.nan === 0 && s.peak > 0.02 && s.rms > 1e-4 && s.peak < 0.99;
    ok(good, `sfx ${s.id} ${JSON.stringify(s.o)} peak=${f1(db(s.peak))} dBFS rms=${f1(db(s.rms))} dB len=${s.len.toFixed(2)}s nan=${s.nan}`);
    if (s.id === 'nearmiss') ok(s.len < 1.4, `nearmiss is short (${s.len.toFixed(2)}s)`);
  }
  const wl = stats.filter((s) => s.id === 'win').map((s) => s.len); ok(wl[0] <= wl[1] && wl[1] <= wl[2] && wl[2] > wl[0], `xylophone gliss length scales with size (${wl.map((x) => x.toFixed(2)).join(' < ')})`);
  const one = (id, o) => stats.find((s) => s.id === id && JSON.stringify(s.o) === JSON.stringify(o || {}));
  ok(one('ledgerTick').len < 0.12 && one('ledgerTick').peak < 0.12, `ledgerTick is a quiet tick (len ${one('ledgerTick').len.toFixed(2)} s, peak ${f1(db(one('ledgerTick').peak))} dBFS)`);
  ok(one('layoutDraw').len <= 0.55 && one('layoutDraw', { dur: 0.2 }).len <= 0.3, `layoutDraw fits the blueprint draw-on (default ${one('layoutDraw').len.toFixed(2)} s <= 0.55, turbo ${one('layoutDraw', { dur: 0.2 }).len.toFixed(2)} s <= 0.3)`);
  const big = await S({ secs: 3, noLimit: true, cues: [{ id: 'doorCreak', o: { dur: 9 } }] });
  ok(one('doorCreak').len <= 1.2 && big.len <= 1.2, `doorCreak fits the 1.2 s door transition (default ${one('doorCreak').len.toFixed(2)} s, dur clamped ${big.len.toFixed(2)} s)`);
  ok(['dialStep', 'spotlightStep', 'caseSeal', 'caseOpen'].every((id) => one(id, OPTS[id] ? OPTS[id][0] : {}).len < 0.5), 'dial step, spotlight step, case seal and case open are short');

  // pop pitch climbs with combo; bomb clock speeds up (v1 checks)
  const pit = await page.evaluate(async () => {
    const f = async (combo) => { const oc = new OfflineAudioContext(1, 44100 * 0.5, 44100); const e = window.A.createEngine(oc); e.SOUNDS.pop({ combo }); const d = (await oc.startRendering()).getChannelData(0); let z = 0; for (let i = 1; i < 22050; i++) if ((d[i - 1] < 0) !== (d[i] < 0)) z++; return z; };
    return [await f(1), await f(8)];
  });
  ok(pit[1] > pit[0] * 1.25, `pop pitch climbs with combo (zero crossings ${pit[0]} -> ${pit[1]})`);
  const clk = await page.evaluate(async () => {
    const f = async (burn) => { const oc = new OfflineAudioContext(1, 44100 * 1.5, 44100); const e = window.A.createEngine(oc); e.SOUNDS.ticks({ burn, total: 8, dur: 1.2 }); const d = (await oc.startRendering()).getChannelData(0); let n = 0, quiet = 0; for (let i = 0; i < d.length; i++) { if (Math.abs(d[i]) > 0.02) { if (quiet > 1500) n++; quiet = 0; } else quiet++; } return n; };
    return [await f(0), await f(7)];
  });
  ok(clk[1] > clk[0], `bomb-clock ticks get denser with burn count (${clk[0]} -> ${clk[1]} ticks in 1.2 s)`);

  // ---- quiet-result path, unknown ids
  const quiet = await page.evaluate(() => {
    const out = [];
    for (const id of window.A.CUE_IDS) {
      const e = window.A.createEngine(new OfflineAudioContext(2, 4410, 44100));
      const r = e.cue(id, { quiet: true });
      out.push({ id, r, wl: window.A.CUE_INFO[id].winLike, live: e.liveCount, voices: e.voices });
    }
    return out;
  });
  const badQuiet = quiet.filter((q) => (q.wl && (q.r || q.live > 0)) || (!q.wl && (!q.r || q.live === 0)));
  ok(badQuiet.length === 0, `quiet-result path (R <= C): ${quiet.filter((q) => q.wl).length} win-like cues refused with no node created, ${quiet.filter((q) => !q.wl).length} neutral cues play${badQuiet.length ? ' BAD: ' + badQuiet.map((q) => q.id).join(',') : ''}`);
  ok(quiet.find((q) => q.id === 'ledgerTick').r === true, 'the quiet-result cue (ledgerTick) plays on the quiet path');
  const unk = await page.evaluate(() => { const e = window.A.createEngine(new OfflineAudioContext(2, 4410, 44100)); return ['nope', 'constructor', '__proto__', 'toString', 'hasOwnProperty', '', 5, null, undefined, {}, ['win']].map((id) => ({ r: e.cue(id), live: e.liveCount })); });
  ok(unk.every((u) => u.r === false && u.live === 0), 'unknown, non-string and prototype ids are no-ops (nothing created, false returned)');

  // ---- settingsTest: path per slider, gating, never win-like
  const stGate = await page.evaluate(() => {
    const mk = (v, muted) => window.A.createEngine(new OfflineAudioContext(2, 4410, 44100), { volumes: v, muted });
    const t = (v, kind, muted) => { const e = mk(v, muted); return e.cue('settingsTest', { kind }) && (e.liveCount > 0); };
    return {
      all: ['sfx', 'music', 'master'].map((k) => t({}, k)),
      sfx0: ['sfx', 'music', 'master'].map((k) => t({ sfx: 0 }, k)),
      music0: ['sfx', 'music', 'master'].map((k) => t({ music: 0 }, k)),
      master0: ['sfx', 'music', 'master'].map((k) => t({ master: 0 }, k)),
      muted: ['sfx', 'music', 'master'].map((k) => t({}, k, true)),
      twice: (() => { const e = mk({}); return [e.cue('settingsTest', { kind: 'sfx' }), e.cue('settingsTest', { kind: 'music' })]; })(),
    };
  });
  ok(stGate.all.every(Boolean), 'settingsTest plays for each slider kind');
  ok(JSON.stringify(stGate.sfx0) === '[false,true,true]' && JSON.stringify(stGate.music0) === '[true,false,true]' && stGate.master0.every((x) => x === false) && stGate.muted.every((x) => x === false), 'preview follows its own bus: Effects 0 mutes only the Effects preview, Music 0 only the Music preview, Master 0 and mute silence all three');
  ok(stGate.twice[0] === true && stGate.twice[1] === false, 'settingsTest: a second preview within 250 ms is refused (engine level)');
  const lv = ['sfx', 'music', 'master'].map((k) => stats.find((s) => s.id === 'settingsTest' && s.o.kind === k).peak);
  ok(Math.max(...lv) / Math.min(...lv) < 1.2, `settingsTest has the same loudness on all three paths (peaks ${lv.map((x) => f1(db(x))).join(' / ')} dBFS)`);

  // ---- A1: music 0 silences the bed only, sfx 0 the inverse
  const BED = { bed: 'base', beats: 16, secs: 9 }, WIN = { cues: [{ id: 'win', o: { combo: 3, size: 8 } }], secs: 3 };
  const bedDef = await S({ ...BED }), winDef = await S({ ...WIN });
  const bedM0 = await S({ ...BED, eo: { volumes: { music: 0 } } }), winM0 = await S({ ...WIN, eo: { volumes: { music: 0 } } });
  const bedS0 = await S({ ...BED, eo: { volumes: { sfx: 0 } } }), winS0 = await S({ ...WIN, eo: { volumes: { sfx: 0 } } });
  ok(bedM0.peak < 1e-4 && bedM0.live <= 2 /* the bus's two LFOs only */ && Math.abs(db(winM0.rms) - db(winDef.rms)) < 0.001, `A1 music 0: bed silent (peak ${bedM0.peak}, nothing queued) while the win cue is unchanged (${f1(db(winM0.rms))} vs ${f1(db(winDef.rms))} dB)`);
  ok(winS0.peak < 1e-4 && winS0.live === 0 && Math.abs(db(bedS0.rms) - db(bedDef.rms)) < 0.001 && bedS0.live > 2, `A1 sfx 0: effects silent (peak ${winS0.peak}, nothing queued) while the bed is unchanged (${f1(db(bedS0.rms))} vs ${f1(db(bedDef.rms))} dB)`);
  const bedM = await S({ ...BED, poke: { musicBus: 0 } }), winSb = await S({ ...WIN, poke: { sfxBus: 0 } });
  ok(bedM.peak < 1e-6 && winSb.peak < 1e-6 && bedDef.peak > 0.02 && winDef.peak > 0.02, 'A1 the bus gains alone also silence their side (musicBus 0 -> bed, sfxBus 0 -> effects)');

  // ---- A2: two reverb returns, each ends on its own bus
  const inj = async (node, poke) => (await S({ secs: 1.2, poke, inject: [{ node }], windows: [[0.0, 0.5]] })).win[0];
  const rM = [await inj('verbSendM', {}), await inj('verbSendM', { sfxBus: 0 }), await inj('verbSendM', { musicBus: 0 })];
  const rS = [await inj('verbSend', {}), await inj('verbSend', { musicBus: 0 }), await inj('verbSend', { sfxBus: 0 })];
  ok(rM[0] > 1e-4 && Math.abs(rM[1] - rM[0]) < 1e-7 && rM[2] === 0, `A2 the bed's reverb return follows the Music bus only (return ${f1(db(rM[0]))} dB, with Effects 0 ${f1(db(rM[1]))} dB, with Music 0 ${f1(db(rM[2]))} dB)`);
  ok(rS[0] > 1e-4 && Math.abs(rS[1] - rS[0]) < 1e-7 && rS[2] === 0, `A2 the effects' reverb return follows the Effects bus only (return ${f1(db(rS[0]))} dB, with Music 0 ${f1(db(rS[1]))} dB, with Effects 0 ${f1(db(rS[2]))} dB)`);
  const sepIdentity = await page.evaluate(() => { const e = window.A.createEngine(new OfflineAudioContext(1, 10, 44100)); return e.verbSend !== e.verbSendM && e.sfxBus !== e.musicBus; });
  ok(sepIdentity, 'A2 two distinct reverb sends and two distinct buses exist');
  const lk = [await S({ ...BED, poke: { sfxBus: 0 }, windows: [[0, 9]] }), await S({ secs: 3, cues: [{ id: 'bigwin', o: { level: 2 } }], poke: { musicBus: 0 }, windows: [[0, 3]] }), await S({ secs: 3, cues: [{ id: 'bigwin', o: { level: 2 } }], windows: [[0, 3]] })];
  ok(Math.abs(lk[0].rms - bedDef.rms) < 1e-7 && Math.abs(lk[1].rms - lk[2].rms) < 1e-7, 'A2 the bed does not change with the Effects bus and the effects do not change with the Music bus (no leak through the reverb)');

  // ---- A3: all sliders 100 -> post-limiter peak <= 0.97
  const LOUD = { secs: 8, bed: 'freespins', beats: 24, cues: [{ id: 'explosion' }, { id: 'bigwin', o: { level: 4 } }, { id: 'shower', o: { n: 40 } }, { id: 'win', o: { combo: 6, size: 30 } }, { id: 'rumble' }] };
  const V100 = { volumes: { master: 100, music: 100, sfx: 100 } };
  const pre100 = await S({ ...LOUD, noLimit: true, eo: V100 }), post100 = await S({ ...LOUD, eo: V100 }), post75 = await S({ ...LOUD });
  ok(post100.peak <= 0.97 && post100.nan === 0 && post100.peak > post75.peak, `A3 all sliders 100: post-limiter peak ${post100.peak.toFixed(3)} <= 0.97 (pre-limiter ${pre100.peak.toFixed(3)}, defaults ${post75.peak.toFixed(3)}), nan=${post100.nan}`);

  // ---- A4: defaults within 0.1 dB of the v1 render (fixture recorded before the buses), free-spins bed at the v1 key
  const base = JSON.parse(fs.readFileSync(path.join(HERE, 'fixtures', 'baseline_v1.json'), 'utf8')).cases;
  const cur = await page.evaluate(inPageRender, [v1Specs(), { fsTranspose: 2 }]);
  const bad = compareRenders(base, cur, 0.1);
  let worst = 0; for (const k of Object.keys(base)) worst = Math.max(worst, Math.abs(base[k].rms - cur[k].rms));
  ok(bad.length === 0, `A4 ${Object.keys(base).length} cases (every v1 cue, both beds, two mixes) within 0.1 dB of the v1 render, worst rms difference ${worst.toFixed(4)} dB${bad.length ? '\n' + bad.slice(0, 8).join('\n') : ''}`);

  // ---- free-spins bed: new key (F# dorian), same loudness, still a seamless loop
  const fsNew = await page.evaluate(inPageRender, [v1Specs().filter((s) => s.kind !== 'sfx'), {}]);
  const dRms = Math.abs(fsNew['bed:freespins'].rms - base['bed:freespins'].rms), dPk = Math.abs(fsNew['bed:freespins'].peak - base['bed:freespins'].peak);
  ok(dRms <= 0.5 && dPk <= 1, `free-spins bed moved off the E tonic: loudness kept (rms ${base['bed:freespins'].rms} -> ${fsNew['bed:freespins'].rms} dB, peak ${base['bed:freespins'].peak} -> ${fsNew['bed:freespins'].peak} dBFS)  [NEEDS A HUMAN EAR CHECK]`);
  ok(Math.abs(fsNew['bed:base'].rms - base['bed:base'].rms) < 0.001, 'the base bed is untouched by the key change');
  const tn = async (tr) => page.evaluate((tr) => window.H.tones({ secs: 1.5, bed: 'freespins', beats: 1, eo: { fsTranspose: tr } }, [82.41, 92.5], 0.07, 0.4), tr);
  const t2 = await tn(2), t4 = await tn(undefined);
  ok(t2[0] > t2[1] * 20 && t4[1] > t4[0] * 20, `free-spins bass root: legacy key sits on E2 (${t2[0].toExponential(1)} vs ${t2[1].toExponential(1)}), the default sits on F#2 (${t4[1].toExponential(1)} vs ${t4[0].toExponential(1)})`);

  // ---- optional duck: -6 dB of the bed under the big stingers
  const dk = async (duck) => (await S({ secs: 8, eo: { duck }, cues: [{ id: 'bigwin', o: { level: 3 } }], reads: [0.5, 2.0, 7.5].map((t) => ({ t, node: 'duckGain' })) })).reads.sort((a, b) => a.t - b.t).map((r) => r.v);
  const dOn = await dk(true), dOff = await dk(false);
  ok(Math.abs(dOn[0] - 0.501) < 0.01 && Math.abs(dOn[1] - 0.501) < 0.01 && dOn[2] > 0.999, `duck: -6 dB (gain ${dOn[0].toFixed(3)}) while the big-win stinger plays, released afterwards (${dOn[2].toFixed(3)})`);
  ok(dOff.every((v) => v === 1), 'duck is off by default in the engine (offline renders stay comparable) and does nothing then');
  const dkQ = await S({ secs: 3, eo: { duck: true }, cues: [{ id: 'win', o: { combo: 2 } }, { id: 'coin' }, { id: 'click' }, { id: 'stinger', o: { level: 1 } }], reads: [{ t: 1, node: 'duckGain' }] });
  ok(dkQ.reads[0].v === 1, 'small cues (win, coin, click, level-1 stinger) never duck the bed');

  // ---- A5: voice cap, killAll
  const pile = await page.evaluate(async () => {
    const oc = new OfflineAudioContext(2, 44100 * 3, 44100); const e = window.A.createEngine(oc, { noLimit: true });
    for (let i = 0; i < 40; i++) e.SOUNDS.pop({ combo: 1 + (i % 9) });
    e.SOUNDS.explosion(); e.SOUNDS.bigwin({ level: 3 }); e.SOUNDS.shower({ n: 40 }); e.SOUNDS.win({ combo: 6, size: 30 });
    const v = e.voices; const live = e.liveCount;
    const d = (await oc.startRendering()).getChannelData(0); let peak = 0, nan = 0; for (const x of d) { if (!Number.isFinite(x)) nan++; else peak = Math.max(peak, Math.abs(x)); }
    e.killAll(); const after = { v: e.voices, live: e.liveCount };
    return { v, live, after, peak, nan };
  });
  ok(pile.v <= 56 && pile.nan === 0 && pile.peak > 0.1, `A5 voice cap holds under pile-up (voices=${pile.v} <= 56, nan=${pile.nan})`);
  ok(pile.after.v === 0 && pile.after.live === 0 && pile.live >= 56, `A5 killAll stops every voice (live ${pile.live} -> ${pile.after.live}, voices -> ${pile.after.v})`);
  console.log(`INFO pile-up pre-limiter peak ${pile.peak.toFixed(3)}; the soft limiter keeps the output <= 0.97`);
  const lim = await page.evaluate(async () => {
    const oc = new OfflineAudioContext(2, 44100 * 3, 44100); const e = window.A.createEngine(oc);
    for (let i = 0; i < 40; i++) e.SOUNDS.pop({ combo: 1 + (i % 9) }); e.SOUNDS.explosion(); e.SOUNDS.bigwin({ level: 3 });
    const d = (await oc.startRendering()).getChannelData(0); let peak = 0; for (const x of d) peak = Math.max(peak, Math.abs(x)); return peak;
  });
  ok(lim < 0.98, `final output below 0 dBFS even in pile-up (peak=${lim.toFixed(3)})`);

  // ---- beds (v1 checks kept)
  for (const mood of ['base', 'freespins']) {
    const r = await page.evaluate(async (mood) => {
      const sr = 44100, e0 = window.A.createEngine(new OfflineAudioContext(1, 10, sr)); const info = e0.bedInfo(mood);
      const L = info.loopSecs, loops = 3, secs = L * loops + 2;
      const oc = new OfflineAudioContext(2, Math.ceil(sr * secs), sr); const e = window.A.createEngine(oc, { noLimit: true });
      const B = e.newBus(mood); const t0 = 0.05;
      for (let i = 0; i < info.loopBeats * loops; i++) e.bedBeat(mood, i, t0 + i * info.beat, B);
      const d = (await oc.startRendering()).getChannelData(0);
      let peak = 0, nan = 0, sum = 0; for (const x of d) { if (!Number.isFinite(x)) nan++; else { peak = Math.max(peak, Math.abs(x)); sum += x * x; } }
      const W = Math.floor(sr * 0.05), env = (start) => { const a = []; for (let k = 0; k < Math.floor(L / 0.05); k++) { let s = 0; const o = Math.floor((start + k * 0.05) * sr); for (let j = 0; j < W; j++) s += d[o + j] * d[o + j]; a.push(Math.sqrt(s / W)); } return a; };
      const e2 = env(t0 + L), e3 = env(t0 + 2 * L); let maxd = 0, mean = 0, peakEnv = 0; for (let k = 0; k < e2.length; k++) { mean += e2[k]; peakEnv = Math.max(peakEnv, e2[k]); maxd = Math.max(maxd, Math.abs(e2[k] - e3[k])); } mean /= e2.length;
      const stepAt = (t) => { const c0 = Math.floor(t * sr); let m = 0; for (let i = c0 - 300; i < c0 + 300; i++) m = Math.max(m, Math.abs(d[i] - d[i - 1])); return m; };
      const bars = info.loopBeats / 4, barLen = L / bars; let ref = 0; for (let k = 1; k < bars; k++) ref = Math.max(ref, stepAt(t0 + L + k * barLen));
      const jump = stepAt(t0 + 2 * L);
      let tail = 0; for (let i = Math.floor((t0 + 3 * L + 1.5) * sr); i < d.length; i++) tail = Math.max(tail, Math.abs(d[i]));
      return { L, bpm: info.bpm, peak, nan, rms: Math.sqrt(sum / d.length), mean, peakEnv, maxd, jump, ref, tail };
    }, mood);
    ok(r.nan === 0 && r.peak > 0.05 && r.peak < 0.9, `bed ${mood} ${r.bpm}bpm loop=${r.L.toFixed(2)}s peak=${f1(db(r.peak))} dBFS rms=${f1(db(r.rms))} dB nan=${r.nan}`);
    ok(r.maxd < r.peakEnv * 0.5, `bed ${mood} loop 2 vs 3 envelope matches (max diff ${r.maxd.toFixed(4)}, peak env ${r.peakEnv.toFixed(4)})`);
    ok(r.jump <= r.ref * 1.25 + 1e-4, `bed ${mood} seam continuous: largest sample step at the seam ${r.jump.toFixed(4)} <= other bar lines ${r.ref.toFixed(4)}`);
    ok(r.tail < 0.01, `bed ${mood} decays cleanly after the last scheduled beat (tail ${r.tail.toFixed(4)})`);
  }
  await ctx.close();
}

// ---------------------------------------------------------------- live helpers
async function openLive(init, opts = {}) {
  const ctx = await browser.newContext(); await ctx.addInitScript(INIT); if (init) await ctx.addInitScript(init);
  const page = await ctx.newPage(); const errs = [];
  page.on('pageerror', (e) => { fails++; errs.push(e.message); console.log('FAIL pageerror ' + e.message); });
  page.on('console', (m) => { if (m.type() === 'error' && !/favicon|404/.test(m.text())) { errs.push(m.text()); if (opts.strictConsole !== false) { fails++; console.log('FAIL console.error ' + m.text()); } } });
  await page.goto(URL); await page.waitForFunction(() => window.__ready);
  const st = () => page.evaluate(() => { const a = window.A.audio, e = a._engine; return { live: e ? e.liveCount : -1, g: e ? e.master.gain.value : -1, gm: e ? e.musicBus.gain.value : -1, gs: e ? e.sfxBus.gain.value : -1, state: e ? e.ctx.state : 'none', aud: window.__qa.audible(), muted: document.body.classList.contains('muted'), pressed: document.getElementById('btn-sound').getAttribute('aria-pressed'), ls: localStorage.getItem('am_muted'), mood: a.mood, vol: a.volumes, silent: a.silent, amuted: a.muted }; });
  return { ctx, page, st, errs };
}
const tp = (s) => Math.pow(10, (s <= 75 ? -45 * (75 - s) / 75 : 3 * (s - 75) / 25) / 20);

// ---------------------------------------------------------------- live: mute silences everything (v1 checks kept)
{
  const { ctx, page, st } = await openLive();
  let s = await st(); ok(s.state === 'none', 'no AudioContext before a user gesture');
  await page.mouse.click(5, 5); await sleep(1500); s = await st();
  ok(s.state === 'running' && s.live > 0 && Math.abs(s.g - 0.8) < 0.01 && s.mood === 'base', `after gesture the base bed plays (live=${s.live}, master=${s.g.toFixed(2)})`);
  ok(Math.abs(s.gm - tp(5)) < 1e-6 && Math.abs(s.gs - 1) < 1e-6, `default sliders: Effects 75 = unity, Music 5 % (slot guide) = taper(5) (music ${s.gm.toFixed(4)}, effects ${s.gs.toFixed(4)})`);
  await page.evaluate(() => { const a = window.A.audio; a.play('explosion'); a.play('bigwin', { level: 3 }); a.play('shower', { n: 30 }); });
  await sleep(100); s = await st(); ok(s.live > 40, `sfx + bed voices live (${s.live})`);
  await page.evaluate(() => window.A.audio.setMuted(true)); await sleep(300); s = await st();
  ok(s.live === 0 && s.g < 0.001 && s.aud.audibleSources === 0 && s.muted && s.pressed === 'true' && s.ls === '1', `muted: every voice stopped, master 0, no audible source, body.muted, aria-pressed, localStorage (${JSON.stringify({ live: s.live, g: s.g, aud: s.aud })})`);
  const vc = await page.evaluate(async () => { const e = window.A.audio._engine; await new Promise((r) => setTimeout(r, 1500)); return e.voices; });
  ok(vc === 0, `A5 after a mute (killAll) the voice counter stays at 0 when the stopped sources end (voices ${vc}, it used to go negative)`);
  await page.evaluate(() => { const a = window.A.audio; a.play('bigwin'); a.play('click'); a.setMood('freespins'); }); await sleep(1200); s = await st();
  ok(s.live === 0 && s.aud.audibleSources === 0, `while muted nothing is queued or scheduled (live=${s.live})`);
  await page.evaluate(() => window.A.audio.setMuted(false)); await sleep(1500); s = await st();
  ok(s.live > 0 && Math.abs(s.g - 0.8) < 0.01 && s.mood === 'freespins' && s.ls === '0' && s.pressed === 'false', `unmute: bed resumes in the chosen mood (live=${s.live}, mood=${s.mood})`);
  const dk = await page.evaluate(async () => { const a = window.A.audio, e = a._engine, out = { def: a.duck }; a.duck = true; a.play('bigwin', { level: 2 }); await new Promise((r) => setTimeout(r, 500)); out.during = e.duckGain.gain.value; await new Promise((r) => setTimeout(r, 4600)); out.after = e.duckGain.gain.value; a.duck = false; return out; });
  ok(dk.def === false && Math.abs(dk.during - 0.501) < 0.02 && dk.after > 0.99, `live duck is opt-in (audio.duck default ${dk.def}); switched on, the bed gives way by 6 dB (gain ${dk.during.toFixed(3)}) under the big-win stinger and comes back (${dk.after.toFixed(3)})`);
  const n1 = (await st()).live; await sleep(3000); const n2 = (await st()).live; ok(n2 < 200 && n1 < 200, `scheduler keeps node count bounded (${n1} -> ${n2})`);
  await page.evaluate(() => window.A.audio.setMood('off')); await sleep(1200); s = await st(); ok(s.live === 0 || s.live < 8, `mood 'off' stops the bed (live=${s.live})`);
  await page.evaluate(() => { window.A.audio.setMuted(true); }); await page.reload(); await page.waitForFunction(() => window.__ready);
  const mm = await page.evaluate(() => ({ m: window.A.audio.muted, b: document.body.classList.contains('muted') })); ok(mm.m && mm.b, 'mute is remembered across reload');
  await ctx.close();
}

// ---------------------------------------------------------------- L1 persist, L4 mute vs slider, L5 music 0, L6 master 0, L7 preview, no bypass
{
  const { ctx, page, st } = await openLive();
  await page.mouse.click(5, 5); await sleep(1200);
  // L1: each slider persists; the storage keys are exactly the four names; reload restores and applies the taper
  const calls = await page.evaluate(() => { // the gains must be moved with setTargetAtTime(g, t, 0.03) (mute keeps 0.02)
    const a = window.A.audio, e = a._engine, rec = [], orig = AudioParam.prototype.setTargetAtTime;
    AudioParam.prototype.setTargetAtTime = function (v, t, tc) { rec.push([this, v, tc]); return orig.call(this, v, t, tc); };
    a.setVolume('music', 50); a.setVolume('sfx', 40); a.setVolume('master', 55); a.setMuted(true); a.setMuted(false);
    AudioParam.prototype.setTargetAtTime = orig;
    const find = (node) => rec.filter((r) => r[0] === node.gain).map((r) => [+r[1].toFixed(4), r[2]]);
    a.setVolume('music', 75); a.setVolume('sfx', 75); a.setVolume('master', 75);
    return { music: find(e.musicBus), sfx: find(e.sfxBus), master: find(e.master) };
  });
  const tcOk = (list, v) => list.some(([val, tc]) => Math.abs(val - v) < 0.002 && tc === 0.03);
  ok(tcOk(calls.music, +tp(50).toFixed(4)) && tcOk(calls.sfx, +tp(40).toFixed(4)) && tcOk(calls.master, +(0.8 * tp(55)).toFixed(4)) && calls.master.some(([v, tc]) => v === 0 && tc === 0.02), `gains move by setTargetAtTime(g, t, 0.03), mute by 0.02 (${JSON.stringify(calls.music)} ...)`);
  await page.evaluate(() => { const a = window.A.audio; a.setVolume('master', 60); a.setVolume('music', 30); a.setVolume('sfx', 90); a.setMuted(false); });
  const keys = await page.evaluate(() => Object.keys(localStorage).sort());
  ok(JSON.stringify(keys) === JSON.stringify(['am_muted', 'am_vol_master', 'am_vol_music', 'am_vol_sfx']), `L1 localStorage keys are exactly the four audio names (${keys.join(', ')})`);
  await sleep(300); let s = await st();
  ok(Math.abs(s.g - 0.8 * tp(60)) < 0.005 && Math.abs(s.gm - tp(30)) < 0.002 && Math.abs(s.gs - tp(90)) < 0.01, `L1 sliders move the gains by the taper (master ${s.g.toFixed(3)} want ${(0.8 * tp(60)).toFixed(3)}, music ${s.gm.toFixed(4)} want ${tp(30).toFixed(4)}, effects ${s.gs.toFixed(3)} want ${tp(90).toFixed(3)})`);
  await page.reload(); await page.waitForFunction(() => window.__ready);
  const r1 = await page.evaluate(() => window.A.audio.volumes);
  ok(r1.master === 60 && r1.music === 30 && r1.sfx === 90, `L1 reload restores the sliders (${JSON.stringify(r1)})`);
  await page.mouse.click(5, 5); await sleep(1200); s = await st();
  ok(Math.abs(s.g - 0.8 * tp(60)) < 1e-6 && Math.abs(s.gm - tp(30)) < 1e-6 && Math.abs(s.gs - tp(90)) < 1e-6, 'L1 the engine starts at the restored levels (no ramp from default)');
  await page.evaluate(() => window.A.audio.resetVolumes()); await sleep(300); s = await st();
  ok(s.vol.master === 75 && s.vol.music === 5 && s.vol.sfx === 75 && Math.abs(s.g - 0.8) < 0.005 && Math.abs(s.gm - tp(5)) < 0.001, 'resetVolumes brings the defaults back (Master 75, Music 5, Effects 75)');

  // L4: mute vs slider
  await page.evaluate(() => { const a = window.A.audio; a.setVolume('master', 50); a.setMuted(true); }); await sleep(300);
  await page.evaluate(() => { const a = window.A.audio; a.setVolume('music', 40); a.setVolume('sfx', 55); a.setVolume('master', 65); }); await sleep(400); s = await st();
  ok(s.g < 0.001 && s.live === 0 && s.amuted && s.ls === '1' && s.aud.audibleSources === 0, `L4 muted, then sliders move: master stays 0, nothing live, still muted (master ${s.g}, live ${s.live}, am_muted ${s.ls})`);
  const pm = await page.evaluate(() => window.A.audio.play('click')); ok(pm === false, 'L4 no cue plays while muted, whatever the sliders say');
  await page.evaluate(() => window.A.audio.setMuted(false)); await sleep(1500); s = await st();
  ok(s.ls === '0' && s.live > 0 && Math.abs(s.g - 0.8 * tp(65)) < 0.005 && Math.abs(s.gm - tp(40)) < 0.003 && Math.abs(s.gs - tp(55)) < 0.003, `L4 unmute: the bed returns at the slider levels (master ${s.g.toFixed(3)}, music ${s.gm.toFixed(4)} want ${tp(40).toFixed(4)}, effects ${s.gs.toFixed(4)}, live ${s.live})`);
  await page.evaluate(() => window.A.audio.resetVolumes());

  // L5: music 0 stops the bed only; raising it brings the bed back on a bar line
  await page.evaluate(() => window.A.audio.setVolume('music', 0)); await sleep(1500); s = await st();
  const p5 = await page.evaluate(() => window.A.audio.play('click'));
  ok(s.live < 8 && s.gm < 0.001 && p5 === true, `L5 music 0: bed stops queuing within 1.5 s (live ${s.live}), musicBus ${s.gm}, effects still play`);
  await page.evaluate(() => window.A.audio.setVolume('music', 70)); await sleep(1500); s = await st();
  ok(s.live > 8 && Math.abs(s.gm - tp(70)) < 0.003 && s.aud.audibleSources > 0, `L5 raising Music brings the bed back (live ${s.live}, musicBus ${s.gm.toFixed(4)})`);
  await page.evaluate(() => window.A.audio.setVolume('sfx', 0)); await sleep(300);
  const p5b = await page.evaluate(() => [window.A.audio.play('click'), window.A.audio.play('bigwin'), window.A.audio.preview('sfx'), window.A.audio.preview('music')]); s = await st();
  ok(p5b[0] === false && p5b[1] === false && p5b[2] === false && p5b[3] === true && s.live > 8, `L5 Effects 0: no effect is queued (click/bigwin/effects preview refused) while the bed keeps playing (live ${s.live})`);
  await page.evaluate(() => window.A.audio.resetVolumes()); await sleep(400);

  // L6: master 0 is silent and honest; the speaker button and a slider bring back the last level
  await page.evaluate(() => { const a = window.A.audio; a.setVolume('master', 40); a.setVolume('master', 0); }); await sleep(1500); s = await st();
  ok(s.silent && s.muted && s.pressed === 'true' && !s.amuted && s.g < 0.001 && s.live < 8 && s.aud.audibleSources === 0, `L6 master 0: silent, body.muted + aria-pressed show it, am_muted untouched (muted flag ${s.amuted}), master ${s.g}, live ${s.live}`);
  const p6 = await page.evaluate(() => [window.A.audio.play('click'), window.A.audio.preview('master')]); ok(p6[0] === false && p6[1] === false, 'L6 master 0: nothing is queued, not even a preview');
  const tg = await page.evaluate(() => ({ r: window.A.audio.toggleMute(), v: window.A.audio.volumes, last: window.A.audio.lastVolume('master') })); await sleep(1500); s = await st();
  ok(tg.r === false && tg.v.master === 40 && tg.last === 40 && !s.silent && !s.muted && Math.abs(s.g - 0.8 * tp(40)) < 0.005 && s.live > 8, `L6 the speaker button restores the last non-zero master level (${tg.v.master}) and the bed returns (live ${s.live})`);
  await page.evaluate(() => { const a = window.A.audio; a.setVolume('master', 0); a.setVolume('master', 65); }); await sleep(1500); s = await st();
  ok(!s.silent && Math.abs(s.g - 0.8 * tp(65)) < 0.005 && s.live > 8, `L6 raising master from 0 restores sound at the new level (master ${s.g.toFixed(3)}, live ${s.live})`);
  await page.evaluate(() => { const a = window.A.audio; a.setVolume('music', 55); a.setVolume('sfx', 35); a.setVolume('music', 0); a.setVolume('sfx', 0); }); await sleep(300); s = await st();
  const tg2 = await page.evaluate(() => ({ r: window.A.audio.toggleMute(), v: window.A.audio.volumes }));
  ok(s.silent && s.muted && tg2.r === false && tg2.v.music === 55 && tg2.v.sfx === 35, `L6 Music and Effects both 0 count as silent too, and the speaker button restores both (${JSON.stringify(tg2.v)})`);
  await page.evaluate(() => { const a = window.A.audio; a.resetVolumes(); a.setMuted(true); a.setVolume('master', 0); }); await sleep(300);
  const tg3 = await page.evaluate(() => ({ r: window.A.audio.toggleMute(), m: window.A.audio.muted, v: window.A.audio.volumes }));
  ok(tg3.r === false && tg3.m === false && tg3.v.master === 75, 'L6 muted + master 0: one press unmutes and restores the level');
  const tg4 = await page.evaluate(() => ({ a: window.A.audio.toggleMute(), m: window.A.audio.muted, b: window.A.audio.toggleMute(), m2: window.A.audio.muted }));
  ok(tg4.a === true && tg4.m === true && tg4.b === false && tg4.m2 === false, 'toggleMute is a plain mute toggle when the sliders are up');

  // L7: preview rate limit (one per 250 ms), nothing while muted
  const pv = await page.evaluate(async () => {
    const a = window.A.audio, e = a._engine; let n = 0; const f = e.SOUNDS.settingsTest; e.SOUNDS.settingsTest = (p) => { n++; return f(p); };
    const res = [], t0 = performance.now(); for (let i = 0; i < 8; i++) { res.push(a.preview(['master', 'music', 'sfx'][i % 3])); await new Promise((r) => setTimeout(r, 60)); }
    const burst = n, span = performance.now() - t0; await new Promise((r) => setTimeout(r, 320)); const later = a.preview('sfx'); const afterGap = n;
    a.setMuted(true); const muted = a.preview('sfx'); const nMuted = n; a.setMuted(false);
    return { burst, span, res, later, afterGap, muted, nMuted };
  });
  ok(pv.burst >= 1 && pv.burst <= Math.floor(pv.span / 250) + 1 && pv.res[0] === true, `L7 eight previews in ${Math.round(pv.span)} ms start ${pv.burst} sound(s) (<= 1 per 250 ms)`);
  ok(pv.later === true && pv.afterGap === pv.burst + 1, 'L7 after 250 ms quiet the next preview plays');
  ok(pv.muted === false && pv.nMuted === pv.afterGap, 'L7 no preview while muted');

  // every source, every cue, both beds and the previews end in `master` (so the mute and the Master slider cover them all)
  await page.evaluate(async () => { const a = window.A.audio; for (const id of window.A.CUE_IDS) { a.play(id, { kind: 'music', level: 2, n: 3 }); } a.preview('music'); a.setMood('freespins'); await new Promise((r) => setTimeout(r, 700)); a.setMood('base'); });
  await sleep(800);
  const byp = await page.evaluate(() => window.__qa.bypass(window.A.audio._engine.master));
  ok(byp.sources > 100 && byp.bypass === 0, `no source bypasses the mute: ${byp.bypass} of ${byp.sources} sources reach the destination without passing master`);
  await ctx.close();
}

// ---------------------------------------------------------------- L2 invalid stored values, L3 blocked storage
{
  const { ctx, page, st } = await openLive(`try { localStorage.setItem('am_vol_music', '999'); localStorage.setItem('am_vol_sfx', 'abc'); localStorage.setItem('am_vol_master', '-5'); localStorage.setItem('am_muted', 'garbage'); } catch (e) {}`);
  const v = await page.evaluate(() => ({ v: window.A.audio.volumes, m: window.A.audio.muted }));
  ok(v.v.music === 100 && v.v.sfx === 75 && v.v.master === 0 && v.m === false, `L2 invalid stored values: '999' -> 100, 'abc' -> 75, '-5' -> 0, 'garbage' mute -> off (${JSON.stringify(v.v)}), no page error`);
  await page.mouse.click(5, 5); await sleep(800); const s = await st();
  ok(s.silent && s.muted && s.state === 'running', 'L2 master stored as 0 starts silent and the header shows it');
  await ctx.close();
}
{
  const { ctx, page, st, errs } = await openLive(`Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('blocked', 'SecurityError'); }, configurable: true });`);
  await page.mouse.click(5, 5); await sleep(1200); let s = await st().catch(() => null);
  const r = await page.evaluate(() => { const a = window.A.audio; a.setVolume('music', 33); a.setMuted(true); const m1 = a.muted; a.setMuted(false); return { v: a.getVolume('music'), m1, m2: a.muted, play: a.play('click') }; });
  await sleep(600);
  ok(r.v === 33 && r.m1 === true && r.m2 === false && r.play === true && errs.length === 0, `L3 localStorage getter throws: audio boots, sliders and mute work in memory, no console error (${errs.length} errors)`);
  await ctx.close();
}
{
  const { ctx, page, errs } = await openLive(`Storage.prototype.setItem = function () { throw new DOMException('quota', 'QuotaExceededError'); };`);
  await page.mouse.click(5, 5); await sleep(800);
  const r = await page.evaluate(async () => { const a = window.A.audio; a.setVolume('sfx', 20); a.setMuted(true); a.setMuted(false); await new Promise((r) => setTimeout(r, 700)); return { v: a.getVolume('sfx'), live: a._engine.liveCount }; });
  ok(r.v === 20 && r.live > 2 && errs.length === 0, 'L3 setItem throws (quota): values still work in memory, no console error');
  await ctx.close();
}

// ---------------------------------------------------------------- replay: the same graph, no bypass (needs the mock RGS)
if (!process.env.NO_GAME) {
  const MOCK = process.env.MOCK_PORT || String(Number(PORT) + 1);
  const gameUp = await up(`http://localhost:${PORT}/index.html`);
  if (!(await up(`http://localhost:${MOCK}/__mock/health`))) { kids.push(spawn('node', ['tools/mock-rgs/server.mjs'], { cwd: FRONT, env: { ...process.env, MOCK_PORT: MOCK }, stdio: 'ignore' })); for (let i = 0; i < 40 && !(await up(`http://localhost:${MOCK}/__mock/health`)); i++) await sleep(150); }
  if (gameUp && await up(`http://localhost:${MOCK}/__mock/health`)) {
    const ctx = await browser.newContext({ viewport: { width: 1024, height: 576 } }); await ctx.addInitScript(INIT);
    const page = await ctx.newPage(); const errs = [];
    page.on('pageerror', (e) => errs.push(e.message));
    const sid = 'wp2audio' + Date.now();
    const q = new URLSearchParams({ sessionID: sid, rgs_url: `http://localhost:${MOCK}/s/${sid}`, lang: 'en', replay: 'true', game: 'agent_mambo', version: '1', mode: 'base', event: '2', amount: '1000000' });
    await page.goto(`http://localhost:${PORT}/index.html?${q}`, { waitUntil: 'load' });
    await page.waitForFunction(() => { const b = document.querySelector('#replay-btn'); return b && !b.disabled; }, null, { timeout: 12000 }).catch(() => {});
    await page.click('#replay-btn', { timeout: 3000 }).catch(() => {});
    await sleep(4000);
    const rp = await page.evaluate(async () => {
      const { audio } = await import('/src/audio.js'); const e = audio._engine; if (!e) return { engine: false };
      const before = window.__qa.bypass(e.master); audio.setMuted(true); await new Promise((r) => setTimeout(r, 400));
      return { engine: true, before, aud: window.__qa.audible(), g: e.master.gain.value, live: e.liveCount, muted: document.body.classList.contains('muted') };
    });
    ok(rp.engine && rp.before.sources > 20 && rp.before.bypass === 0 && rp.aud.audibleSources === 0 && rp.g < 0.001 && rp.live === 0 && rp.muted && errs.length === 0, `replay mode: ${rp.engine ? rp.before.sources : 0} sources, none bypasses master; mute silences them all (audible ${rp.aud && rp.aud.audibleSources}, master ${rp.g}, live ${rp.live}), page errors ${errs.length}`);
    await ctx.close();
  } else console.log('INFO replay check skipped (game or mock RGS not reachable)');
}

await browser.close(); for (const k of kids) { try { k.kill(); } catch (e) { /* ignore */ } }
console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED'); process.exit(fails ? 1 : 0);
