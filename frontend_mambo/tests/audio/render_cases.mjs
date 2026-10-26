// Offline render cases shared by the baseline writer (tests/audio/baseline_render.mjs) and the A4 regression test
// (tests/audio/audio.test.mjs). `inPageRender` is serialised by Playwright and runs inside tests/audio/harness.html,
// where window.A.createEngine is the engine under test. It must stay self-contained (no outer references).

// The sound ids and option sets that existed in the v1 engine: the fixture covers exactly these.
export const V1_IDS = ['click', 'error', 'nearmiss', 'wahwah', 'spin', 'whoosh', 'land', 'pop', 'win', 'xylo', 'scatter', 'antic', 'fuse', 'explosion', 'mult', 'fsStart', 'retrigger', 'fsEnd', 'tada', 'bigwin', 'kaching', 'coin', 'count', 'heart', 'rumble', 'crack', 'shower', 'stinger', 'tick', 'drip', 'mascot_hop', 'mascot_gasp', 'dossier', 'wire', 'ticks', 'defuse', 'snip', 'blast', 'stamp', 'metermax', 'meterTick', 'meter', 'meterRise', 'riser', 'phone', 'shutter', 'vault'];
export const V1_OPTS = {
  pop: [{}, { combo: 1 }, { combo: 8 }], win: [{ combo: 1 }, { combo: 3, size: 8 }, { combo: 6, size: 30 }], bigwin: [{ level: 1 }, { level: 3 }],
  scatter: [{ n: 1 }, { n: 4 }], wire: [{ i: 0 }, { i: 12 }], tick: [{}, { p: 1 }], ticks: [{ burn: 0, total: 8 }, { burn: 7, total: 8 }],
  mult: [{ level: 1 }, { level: 12 }], stinger: [{ level: 1 }, { level: 4 }], land: [{ vol: 0.5 }],
};

export function v1Specs() {
  const specs = [];
  for (const id of V1_IDS) for (const o of (V1_OPTS[id] || [{}])) specs.push({ kind: 'sfx', id, o });
  specs.push({ kind: 'bed', mood: 'base' }, { kind: 'bed', mood: 'freespins' });
  // a mixed scene: bed + three cues at once (checks the gain structure of the whole graph, limiter included)
  specs.push({ kind: 'mix', name: 'bed_base+bigwin3+win+pop', mood: 'base', cues: [['bigwin', { level: 3 }], ['win', { combo: 3, size: 8 }], ['pop', { combo: 4 }]] });
  specs.push({ kind: 'mix', name: 'bed_freespins+explosion+shower', mood: 'freespins', cues: [['explosion', {}], ['shower', { n: 24 }], ['stinger', { level: 2 }]] });
  return specs;
}
export const specKey = (s) => (s.kind === 'sfx' ? `sfx:${s.id}:${JSON.stringify(s.o)}` : s.kind === 'bed' ? `bed:${s.mood}` : `mix:${s.name}`);

/** Runs inside the page. args = [specs, engOpts] (createEngine options: volumes, duck, ...). Returns {key: {rms, peak, env, win}} in dBFS. */
export async function inPageRender(args) {
  const [specs, engOpts] = args;
  const sr = 44100;
  const db = (x) => (x > 1e-6 ? 20 * Math.log10(x) : -120);
  const out = {};
  for (const s of specs) {
    const key = s.kind === 'sfx' ? `sfx:${s.id}:${JSON.stringify(s.o)}` : s.kind === 'bed' ? `bed:${s.mood}` : `mix:${s.name}`;
    let secs; let win = 0.1;
    if (s.kind === 'sfx') secs = 4.2;
    else { const e0 = window.A.createEngine(new OfflineAudioContext(1, 10, sr)); const info = e0.bedInfo(s.mood); secs = s.kind === 'bed' ? info.loopSecs + 2 : 6; win = s.kind === 'bed' ? 0.25 : 0.1; }
    const oc = new OfflineAudioContext(2, Math.ceil(sr * secs), sr);
    const e = window.A.createEngine(oc, engOpts || {});
    if (s.kind === 'sfx') e.SOUNDS[s.id](s.o);
    else {
      const info = e.bedInfo(s.mood), B = e.newBus(s.mood), t0 = 0.05;
      const beats = s.kind === 'bed' ? info.loopBeats : Math.floor((secs - 1) / info.beat);
      for (let i = 0; i < beats; i++) e.bedBeat(s.mood, i, t0 + i * info.beat, B);
      if (s.kind === 'mix') for (const [id, o] of s.cues) e.SOUNDS[id](o);
    }
    const buf = await oc.startRendering();
    const L = buf.getChannelData(0), R = buf.getChannelData(1), n = L.length, W = Math.floor(sr * win);
    let sum = 0, peak = 0; const env = [];
    for (let i = 0; i < n; i += W) {
      let w = 0; const end = Math.min(n, i + W);
      for (let j = i; j < end; j++) { const a = L[j], b = R[j]; w += a * a + b * b; const m = Math.max(Math.abs(a), Math.abs(b)); if (m > peak) peak = m; }
      sum += w; env.push(Math.round(db(Math.sqrt(w / (2 * (end - i)))) * 100) / 100);
    }
    out[key] = { rms: Math.round(db(Math.sqrt(sum / (2 * n))) * 1000) / 1000, peak: Math.round(db(peak) * 1000) / 1000, win, env };
  }
  return out;
}

/** Compare two result maps; returns the list of problems (empty = within tolerance). tol in dB. */
export function compareRenders(base, cur, tol = 0.1, floor = -70) {
  const bad = [];
  for (const key of Object.keys(base)) {
    const a = base[key], b = cur[key];
    if (!b) { bad.push(`${key}: missing`); continue; }
    if (Math.abs(a.rms - b.rms) > tol) bad.push(`${key}: rms ${a.rms} -> ${b.rms}`);
    if (Math.abs(a.peak - b.peak) > tol) bad.push(`${key}: peak ${a.peak} -> ${b.peak}`);
    if (a.env.length !== b.env.length) { bad.push(`${key}: length ${a.env.length} -> ${b.env.length}`); continue; }
    for (let i = 0; i < a.env.length; i++) {
      if (a.env[i] < floor && b.env[i] < floor) continue;
      if (Math.abs(a.env[i] - b.env[i]) > tol) { bad.push(`${key}: window ${i} ${a.env[i]} -> ${b.env[i]}`); break; }
    }
  }
  return bad;
}
