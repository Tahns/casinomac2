// The Unleashed Mine - 1960s cartoon sound design. WebAudio synthesis only (no samples, no files, no generative AI).
// One master gain => one mute for everything. Starts after the first user gesture.
// The engine is a factory (createEngine) so the very same synthesis can be rendered offline in tests.
const KEY = 'tum_muted';
const SCALE = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24, 26, 28, 31];
const PENT = [0, 2, 4, 7, 9];
const MAX_VOICES = 56;           // simultaneous (non-bed) oscillator/noise voices
const MOODS = ['base', 'freespins', 'off'];

const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
const hz = (semi, base = 523.25) => base * Math.pow(2, semi / 12);
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

// ---- bed definitions (swing / bossa jazz, 4/4, one swung beat grid) ----
// prog entries: [root semitone from key, chord quality]
const BEDS = {
  base: {
    bpm: 110, key: 0,
    prog: [[0, 'maj7'], [9, 'm7'], [2, 'm7'], [7, '7'], [4, 'm7'], [9, '7'], [2, 'm7'], [7, '7']],
  },
  freespins: {
    bpm: 125, key: 2,
    prog: [[0, '7'], [5, '7'], [0, '7'], [0, '7'], [5, '7'], [5, '7'], [0, '7'], [9, '7'], [2, 'm7'], [7, '7'], [0, '7'], [7, '7']],
  },
};
const QUAL = { maj7: { third: 4, v: [4, 11, 14] }, m7: { third: 3, v: [3, 10, 14] }, 7: { third: 4, v: [4, 10, 14] } };
const SWING = 2 / 3; // swung off-beat position inside a beat
function bedInfo(mood) {
  const b = BEDS[mood]; if (!b) return null;
  const beat = 60 / b.bpm, beats = b.prog.length * 4;
  return { bpm: b.bpm, beat, loopBeats: beats, loopSecs: beats * beat };
}

export function createEngine(c, o = {}) {
  const VOL = o.vol == null ? 0.8 : o.vol;
  const sr = c.sampleRate;
  let seed = 12345;
  const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };

  // master chain: master -> compressor -> transparent soft limiter -> destination
  const master = c.createGain(); master.gain.value = o.muted ? 0 : VOL;
  const comp = c.createDynamicsCompressor(); comp.threshold.value = -16; comp.knee.value = 8; comp.ratio.value = 8; comp.attack.value = 0.003; comp.release.value = 0.2;
  const lim = c.createWaveShaper();
  { const N = 2049, cv = new Float32Array(N); for (let i = 0; i < N; i++) { const x = (i / (N - 1)) * 2 - 1, ax = Math.abs(x); const y = ax < 0.7 ? ax : 0.7 + 0.27 * Math.tanh((ax - 0.7) / 0.27); cv[i] = x < 0 ? -y : y; } lim.curve = cv; }
  master.connect(comp); comp.connect(lim); lim.connect(c.destination);

  const sfx = c.createGain(); sfx.gain.value = 0.9; sfx.connect(master);
  // reverb (short, shared)
  const verb = c.createConvolver();
  { const len = Math.floor(sr * 1.3), buf = c.createBuffer(2, len, sr); for (let ch = 0; ch < 2; ch++) { const d = buf.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (rnd() * 2 - 1) * Math.pow(1 - i / len, 3); } verb.buffer = buf; }
  const verbSend = c.createGain(); verbSend.gain.value = 0.25; verbSend.connect(verb);
  const vo = c.createGain(); vo.gain.value = 0.8; verb.connect(vo); vo.connect(master);
  // shared noise buffer (2s, deterministic)
  const noiseBuf = c.createBuffer(1, sr * 2, sr);
  { const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = rnd() * 2 - 1; }

  // ---- voice registry (cap + kill-all on mute) ----
  const live = new Set(); let voices = 0;
  function reg(src, bed) {
    live.add(src); if (!bed) voices++;
    src.onended = () => { live.delete(src); if (!bed) voices--; try { src.disconnect(); } catch (e) { /* ignore */ } };
  }
  function killAll() { live.forEach((s) => { try { s.stop(); } catch (e) { /* ignore */ } }); live.clear(); voices = 0; }
  const full = (bed) => !bed && voices >= MAX_VOICES;
  const T0 = (p) => (p.at == null ? c.currentTime : p.at) + (p.when || 0);

  function tone(p) {
    const { f = 440, f2 = null, dur = 0.2, type = 'sine', vol = 0.3, a = 0.004, wet = 0.25, q = 0, lp = 0, det = 0, dest = sfx, bed = false, vib = 0, vibHz = 6 } = p;
    if (full(bed)) return;
    const t = T0(p);
    const osc = c.createOscillator(); osc.type = type; osc.frequency.setValueAtTime(f, t); osc.detune.value = det;
    if (f2) osc.frequency.exponentialRampToValueAtTime(Math.max(1, f2), t + dur);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let node = osc;
    if (lp) { const fl = c.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = lp; fl.Q.value = q || 0.7; osc.connect(fl); node = fl; }
    node.connect(g); g.connect(dest);
    if (wet) { const w = c.createGain(); w.gain.value = wet; g.connect(w); w.connect(verbSend); }
    if (vib) { const l = c.createOscillator(); l.frequency.value = vibHz; const lg = c.createGain(); lg.gain.value = vib; l.connect(lg); lg.connect(osc.detune); l.start(t); l.stop(t + dur + 0.05); reg(l, true); }
    osc.start(t); osc.stop(t + dur + 0.05); reg(osc, bed);
  }
  function noise(p) {
    const { dur = 0.2, vol = 0.3, type = 'bandpass', f = 1000, f2 = null, q = 1, a = 0.003, wet = 0.15, dest = sfx, bed = false } = p;
    if (full(bed)) return;
    const t = T0(p), off = p.off == null ? rnd() * 1.5 : p.off;
    const s = c.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
    const fl = c.createBiquadFilter(); fl.type = type; fl.frequency.setValueAtTime(f, t); fl.Q.value = q;
    if (f2) fl.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t + dur);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(fl); fl.connect(g); g.connect(dest);
    if (wet) { const w = c.createGain(); w.gain.value = wet; g.connect(w); w.connect(verbSend); }
    s.start(t, off); s.stop(t + dur + 0.05); reg(s, bed);
  }
  // crescendo roll (drum roll / cymbal roll): amplitude-modulated noise
  function roll({ dur = 0.9, vol = 0.2, f = 5000, type = 'highpass', q = 0.7, rate = 22, when = 0, at = null, wet = 0.25, end = 0.6 }) {
    if (full(false)) return;
    const t = T0({ at, when });
    const s = c.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
    const fl = c.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q;
    const g = c.createGain(); g.gain.setValueAtTime(vol * 0.12, t); g.gain.exponentialRampToValueAtTime(vol, t + dur * end); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    const l = c.createOscillator(); l.type = 'square'; l.frequency.value = rate; const lg = c.createGain();
    const am = c.createGain(); am.gain.value = 0.55; l.connect(lg); lg.gain.value = 0.45; lg.connect(am.gain);
    s.connect(fl); fl.connect(g); g.connect(am); am.connect(sfx);
    if (wet) { const w = c.createGain(); w.gain.value = wet; am.connect(w); w.connect(verbSend); }
    s.start(t, rnd() * 1.5); s.stop(t + dur + 0.05); l.start(t); l.stop(t + dur + 0.05); reg(s, false); reg(l, true);
  }
  // cartoon boing: pitch starts high and wobbles down onto f
  function boing({ f = 300, dur = 0.45, vol = 0.22, wob = 6, depth = 0.5, when = 0, at = null, wet = 0.15 }) {
    if (full(false)) return;
    const t = T0({ at, when }), N = 40, cv = new Float32Array(N);
    for (let i = 0; i < N; i++) { const x = i / (N - 1); cv[i] = f * (1 + depth * Math.exp(-3.2 * x) * Math.cos(2 * Math.PI * wob * x)); }
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    [[1, 'sine', 1], [2, 'triangle', 0.35]].forEach(([m, type, v]) => {
      const osc = c.createOscillator(); osc.type = type;
      const cc = m === 1 ? cv : cv.map((x) => x * m);
      osc.frequency.setValueCurveAtTime(cc, t, dur);
      const gg = c.createGain(); gg.gain.value = v; osc.connect(gg); gg.connect(g);
      osc.start(t); osc.stop(t + dur + 0.05); reg(osc, false);
    });
    g.connect(sfx);
    if (wet) { const w = c.createGain(); w.gain.value = wet; g.connect(w); w.connect(verbSend); }
  }
  // slide whistle (with vibrato)
  const whistle = (f, f2, dur, when = 0, vol = 0.12) => tone({ f, f2, dur, type: 'sine', vol, a: 0.03, when, vib: 28, vibHz: 7, wet: 0.3 });
  // trombone / kazoo-ish: saw through a wah-wah lowpass
  function trombone({ f = 300, f2 = null, dur = 0.25, vol = 0.14, when = 0, at = null, wah = true }) {
    if (full(false)) return;
    const t = T0({ at, when });
    const osc = c.createOscillator(); osc.type = 'sawtooth'; osc.frequency.setValueAtTime(f, t); if (f2) osc.frequency.exponentialRampToValueAtTime(f2, t + dur);
    const fl = c.createBiquadFilter(); fl.type = 'lowpass'; fl.Q.value = 5; fl.frequency.setValueAtTime(wah ? 350 : 900, t);
    if (wah) { fl.frequency.linearRampToValueAtTime(1500, t + dur * 0.4); fl.frequency.linearRampToValueAtTime(450, t + dur); }
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.03); g.gain.setValueAtTime(vol, t + dur * 0.7); g.gain.linearRampToValueAtTime(0.0001, t + dur);
    osc.connect(fl); fl.connect(g); g.connect(sfx);
    const w = c.createGain(); w.gain.value = 0.2; g.connect(w); w.connect(verbSend);
    osc.start(t); osc.stop(t + dur + 0.05); reg(osc, false);
  }
  const woodblock = (f, when = 0, vol = 0.18) => {
    tone({ f, f2: f * 0.82, dur: 0.07, type: 'triangle', vol, a: 0.001, when, wet: 0.08 });
    tone({ f: f * 1.55, dur: 0.035, type: 'sine', vol: vol * 0.5, a: 0.001, when, wet: 0.05 });
    noise({ dur: 0.025, vol: vol * 0.5, f: 2600, q: 3, a: 0.001, when, wet: 0.05 });
  };
  const xylo = (m, when = 0, vol = 0.12, dur = 0.28, long = false) => {
    tone({ f: mtof(m), dur: long ? dur * 2 : dur, type: 'sine', vol, a: 0.0015, when, wet: 0.2 });
    tone({ f: mtof(m) * 3.97, dur: 0.07, type: 'sine', vol: vol * 0.45, a: 0.001, when, wet: 0.1 });
  };
  const brass = (freqs, when, dur, vol = 0.1) => {
    freqs.forEach((f, i) => tone({ f, dur, type: 'sawtooth', vol: vol / (1 + i * 0.2), a: 0.03, when, lp: 1700 + i * 250, q: 1.2, wet: 0.3, det: i * 3 }));
    tone({ f: freqs[freqs.length - 1] * 2, dur: dur * 0.8, type: 'square', vol: vol * 0.2, a: 0.04, when, lp: 2400, wet: 0.3 });
  };
  const brassM = (ms, when, dur, vol) => brass(ms.map(mtof), when, dur, vol);
  const cymbal = (when = 0, vol = 0.12, dur = 1.3) => { noise({ dur, vol, type: 'highpass', f: 6000, q: 0.6, a: 0.002, when, wet: 0.35 }); noise({ dur: dur * 0.6, vol: vol * 0.5, type: 'bandpass', f: 9000, q: 1.5, a: 0.002, when, wet: 0.3 }); };
  const coin = (when = 0, p = 0) => {
    const f = 1318 * Math.pow(2, p / 12);
    tone({ f, dur: 0.09, type: 'square', vol: 0.05, a: 0.001, when, wet: 0.1 });
    tone({ f: f * 1.5, dur: 0.22, type: 'sine', vol: 0.07, a: 0.001, when: when + 0.07, wet: 0.2 });
  };
  function tada(when = 0, lv = 1) {
    brassM([55, 59, 62, 67], when, 0.16, 0.11);
    brassM([60, 64, 67, 72], when + 0.2, 0.8 + lv * 0.2, 0.13);
    cymbal(when + 0.2, 0.1, 1.0 + lv * 0.3);
  }

  const SOUNDS = {
    click() { woodblock(1050, 0, 0.18); },
    error() { trombone({ f: 233, f2: 220, dur: 0.14, vol: 0.12 }); trombone({ f: 207, f2: 185, dur: 0.22, vol: 0.12, when: 0.15 }); },
    nearmiss() { // sad trombone, short (< 1s)
      trombone({ f: 392, dur: 0.17, when: 0 }); trombone({ f: 370, dur: 0.17, when: 0.2 }); trombone({ f: 349, dur: 0.17, when: 0.4 });
      trombone({ f: 330, f2: 233, dur: 0.38, when: 0.6, vol: 0.15, wah: false });
    },
    wahwah() { SOUNDS.nearmiss(); },
    spin() { whistle(260, 1300, 0.4, 0, 0.09); noise({ dur: 0.45, vol: 0.12, f: 250, f2: 2200, q: 0.8, a: 0.05 }); tone({ f: 150, f2: 300, dur: 0.3, type: 'triangle', vol: 0.05 }); },
    whoosh() { noise({ dur: 0.3, vol: 0.1, f: 1800, f2: 300, q: 0.9, a: 0.02 }); whistle(1100, 420, 0.26, 0, 0.05); },
    land(p) { const v = (p && p.vol) || 1; tone({ f: 140, f2: 55, dur: 0.14, type: 'sine', vol: 0.3 * v, wet: 0.1 }); woodblock(420, 0, 0.1 * v); },
    pop(p) {
      const cb = Math.max(1, (p && p.combo) || 1), s = SCALE[Math.min(cb - 1, SCALE.length - 1)];
      boing({ f: hz(s, 261.63), dur: 0.38, vol: 0.2, wob: 5 + Math.min(3, cb * 0.3), depth: 0.45 });
      noise({ dur: 0.06, vol: 0.1, type: 'highpass', f: 3500, q: 0.7, wet: 0.1 });
    },
    win(p) { // xylophone glissando; length scales with cluster size / win size
      const cb = Math.max(1, (p && p.combo) || 1), size = (p && (p.size || p.n)) || 3 + cb;
      const n = clamp(Math.round(4 + size * 0.9 + cb * 0.4), 5, 14);
      const base = 60 + Math.min(12, (cb - 1) * 2);
      for (let k = 0; k < n; k++) {
        const m = base + 12 * Math.floor(k / 5) + PENT[k % 5];
        const last = k === n - 1;
        xylo(m, k * 0.04, last ? 0.14 : 0.1 - k * 0.002, last ? 0.5 : 0.22, last);
      }
    },
    xylo(p) { SOUNDS.win(p); },
    scatter(p) {
      const n = Math.max(1, (p && p.n) || 1), b = (n - 1) * 2;
      [0, 7, 12].forEach((s, i) => xylo(76 + b + s, i * 0.05, 0.1, 0.4, true));
      whistle(600, 1600 + b * 60, 0.3, 0, 0.06);
      [0, 4, 7].forEach((s) => tone({ f: mtof(64 + b + s), dur: 1.1, type: 'sine', vol: 0.05, a: 0.01, wet: 0.5, vib: 6, vibHz: 5 }));
    },
    antic() { // drum roll + rising slide whistle
      roll({ dur: 0.95, vol: 0.2, f: 1700, type: 'bandpass', q: 0.9, rate: 24, end: 0.9, wet: 0.2 });
      whistle(300, 1800, 0.95, 0, 0.07);
    },
    fuse() { // sizzle
      noise({ dur: 1.0, vol: 0.05, type: 'highpass', f: 5500, q: 0.6, a: 0.05, wet: 0.05 });
      for (let i = 0; i < 18; i++) noise({ dur: 0.035, vol: 0.07, type: 'highpass', f: 4000 + rnd() * 3500, q: 0.7, when: i * 0.055 + rnd() * 0.03, wet: 0.05 });
      tone({ f: 1400, f2: 2800, dur: 0.95, type: 'sine', vol: 0.015, a: 0.2, wet: 0.2, vib: 40, vibHz: 14 });
    },
    explosion() {
      SOUNDS.crack(); SOUNDS.rumble();
      noise({ dur: 2.0, vol: 0.6, type: 'lowpass', f: 4200, f2: 70, q: 0.9, a: 0.004, wet: 0.4 });
      tone({ f: 150, f2: 26, dur: 1.5, type: 'sine', vol: 0.7, a: 0.003, wet: 0.3 });
      tone({ f: 70, f2: 24, dur: 1.9, type: 'triangle', vol: 0.35, a: 0.01, wet: 0.35 });
      boing({ f: 140, dur: 1.1, vol: 0.28, wob: 5, depth: 0.7, when: 0.22, wet: 0.3 }); // spring "boing" after the boom
      cymbal(0.05, 0.08, 1.4);
      for (let i = 0; i < 8; i++) noise({ dur: 0.05, vol: 0.12, type: 'bandpass', f: 800 + rnd() * 4000, q: 1.5, when: 0.15 + rnd() * 1.1, wet: 0.2 });
    },
    mult() { whistle(500, 1500, 0.22, 0, 0.08); [0, 4, 7, 12].forEach((s, i) => xylo(79 + s, 0.16 + i * 0.045, 0.08, 0.3)); },
    fsStart() {
      for (let k = 0; k < 12; k++) xylo(60 + 12 * Math.floor(k / 5) + PENT[k % 5], k * 0.04, 0.09, 0.2);
      brassM([55, 59, 62], 0.5, 0.3, 0.1); brassM([57, 61, 64], 0.8, 0.3, 0.1);
      brassM([60, 64, 67, 72], 1.1, 1.4, 0.13); cymbal(1.1, 0.12, 1.6);
    },
    retrigger() {
      [0, 0.12, 0.24].forEach((w, i) => brassM([60 + i * 2, 64 + i * 2, 67 + i * 2], w, 0.1, 0.1));
      brassM([67, 71, 74, 79], 0.38, 0.9, 0.13); cymbal(0.38, 0.1, 1.1);
      for (let k = 0; k < 6; k++) xylo(79 + PENT[k % 5] + (k > 4 ? 12 : 0), 0.38 + k * 0.045, 0.07, 0.25);
    },
    fsEnd() { brassM([67, 71, 74], 0, 0.3, 0.1); brassM([64, 67, 71], 0.35, 0.3, 0.1); brassM([60, 64, 67, 72], 0.7, 1.5, 0.13); cymbal(0.7, 0.1, 1.5); },
    tada(p) { tada(0, (p && p.level) || 1); },
    bigwin(p) {
      const lv = clamp((p && p.level) || 1, 1, 4), rl = 0.8 + lv * 0.12;
      roll({ dur: rl, vol: 0.22, f: 6000, type: 'highpass', rate: 26, end: 0.92 });
      roll({ dur: rl, vol: 0.12, f: 1800, type: 'bandpass', q: 0.9, rate: 22, end: 0.92, wet: 0.1 });
      tada(rl, lv);
      for (let i = 0; i < 4 + lv * 2; i++) coin(rl + 0.1 + i * 0.07, i % 5);
    },
    kaching() {
      noise({ dur: 0.03, vol: 0.12, f: 2500, q: 2, a: 0.001, wet: 0.05 }); tone({ f: 110, f2: 70, dur: 0.1, vol: 0.2, wet: 0.05 });
      [2093, 2637, 3136].forEach((f, i) => tone({ f, dur: 0.55 - i * 0.08, type: 'sine', vol: 0.08, a: 0.001, when: 0.06 + i * 0.012, wet: 0.35 }));
    },
    coin(p) { coin(0, (p && p.pitch) || 0); },
    count(p) { const q = (p && p.p) || 0; woodblock(1400 + q * 900, 0, 0.05); },
    heart(p) { // lub-dub on soft toms
      const k = Math.min(1, 0.55 + ((p && p.i) || 0) * 0.15);
      tone({ f: 100, f2: 58, dur: 0.15, vol: 0.45 * k, a: 0.003, wet: 0.1 });
      tone({ f: 88, f2: 52, dur: 0.17, vol: 0.34 * k, a: 0.003, when: 0.17, wet: 0.1 });
      woodblock(520, 0, 0.05 * k);
    },
    rumble() {
      noise({ dur: 2.6, vol: 0.4, type: 'lowpass', f: 160, f2: 40, q: 1.2, a: 0.5, wet: 0.2 });
      tone({ f: 40, f2: 32, dur: 2.4, vol: 0.45, a: 0.6, wet: 0.2 });
      roll({ dur: 2.2, vol: 0.1, f: 400, type: 'lowpass', rate: 18, end: 0.95 });
    },
    crack() {
      noise({ dur: 0.09, vol: 0.55, type: 'highpass', f: 1800, q: 0.6, a: 0.001, wet: 0.3 });
      noise({ dur: 0.35, vol: 0.3, type: 'bandpass', f: 3200, f2: 700, q: 1.2, a: 0.001, wet: 0.35 });
      tone({ f: 1900, f2: 300, dur: 0.12, type: 'square', vol: 0.1, a: 0.001, lp: 4000 });
    },
    shower(p) { const n = Math.min(24, (p && p.n) || 18); for (let i = 0; i < n; i++) coin(rnd() * 1.4, [0, 2, 4, 7, 9, 12][(rnd() * 6) | 0]); },
    stinger(p) {
      const lv = clamp((p && p.level) || 1, 1, 4), b = (lv - 1) * 2;
      brassM([60 + b, 64 + b, 67 + b], 0, 0.12 + lv * 0.05, 0.09);
      [0, 4, 7, 12, 16].slice(0, 3 + lv).forEach((s, i) => xylo(72 + b + s, 0.1 + i * 0.06, 0.09, 0.3));
    },
    tick(p) { woodblock(1200 + ((p && p.p) || 0) * 500, 0, 0.05); },
    drip() { xylo(84 + ((rnd() * 7) | 0), 0, 0.05, 0.25); },
    mascot_hop() { boing({ f: 360, dur: 0.28, vol: 0.18, wob: 3, depth: 0.5 }); woodblock(700, 0.2, 0.08); },
    mascot_gasp() { noise({ dur: 0.22, vol: 0.12, f: 700, f2: 2600, q: 1.5, a: 0.07, wet: 0.1 }); whistle(1100, 560, 0.25, 0.18, 0.06); },
  };

  // ---- jazz bed ----
  // A bus per mood instance: fades in, and fades out when the mood changes (so already-queued lookahead notes die with it).
  function newBus() {
    const bus = c.createGain(); bus.gain.setValueAtTime(0.0001, c.currentTime); bus.gain.linearRampToValueAtTime(o.bedVol == null ? 0.7 : o.bedVol, c.currentTime + 0.1);
    bus.connect(master);
    const send = c.createGain(); send.gain.value = 0.18; bus.connect(send); send.connect(verbSend);
    const trem = c.createGain(); trem.gain.value = 0.75; trem.connect(bus);
    const lfo = c.createOscillator(); lfo.frequency.value = 4.6; const lg = c.createGain(); lg.gain.value = 0.25; lfo.connect(lg); lg.connect(trem.gain); lfo.start(c.currentTime); reg(lfo, true);
    return {
      bus, trem,
      release() { const t = c.currentTime; try { bus.gain.cancelScheduledValues(t); bus.gain.setValueAtTime(bus.gain.value, t); bus.gain.linearRampToValueAtTime(0, t + 0.2); lfo.stop(t + 0.3); } catch (e) { /* ignore */ } },
    };
  }
  function bedBeat(mood, idx, t, B) {
    const b = BEDS[mood]; if (!b || !B) return;
    const beat = 60 / b.bpm, beats = b.prog.length * 4, i = ((idx % beats) + beats) % beats;
    const bar = Math.floor(i / 4), bt = i % 4, fs = mood === 'freespins';
    const [rs, ql] = b.prog[bar], nrs = b.prog[(bar + 1) % b.prog.length][0], Q = QUAL[ql];
    const root = 36 + ((b.key + rs) % 12), nroot = 36 + ((b.key + nrs) % 12);
    const D = B.bus, dry = { dest: D, bed: true, wet: 0.04 };
    const off = (k) => ((i * 0.173 + k * 0.331) % 1.5);
    // walking upright bass (plucked)
    const odd = bar % 2 === 1;
    let note;
    if (bt === 0) note = root; else if (bt === 1) note = odd ? root + 7 : root + Q.third; else if (bt === 2) note = odd ? root + 12 : root + 7;
    else { note = nroot + (odd ? 1 : -1) + (nroot < root - 6 ? 12 : 0); }
    const f = mtof(note);
    tone({ ...dry, at: t, f, dur: beat * 0.9, type: 'triangle', vol: fs ? 0.34 : 0.3, a: 0.006, lp: 650 });
    tone({ ...dry, at: t, f: f * 2, dur: 0.12, type: 'sine', vol: 0.07, a: 0.002 });
    tone({ ...dry, at: t, f: f * 0.5, dur: beat * 0.5, type: 'sine', vol: 0.12, a: 0.008 });
    // brushes + ride + hat
    noise({ ...dry, at: t, dur: 0.2, vol: 0.026, f: 3000, q: 0.5, a: 0.05, off: off(1) });                  // brush swish on each beat
    noise({ ...dry, at: t, dur: 0.09, vol: fs ? 0.055 : 0.04, type: 'bandpass', f: 7000, q: 1.5, a: 0.001, off: off(2) }); // ride ping
    if (bt === 1 || bt === 3) {
      noise({ ...dry, at: t, dur: 0.08, vol: fs ? 0.075 : 0.055, f: 2300, q: 0.8, a: 0.001, off: off(3) });    // brushed snare on 2 & 4
      noise({ ...dry, at: t, dur: 0.04, vol: 0.05, type: 'highpass', f: 8000, q: 0.6, a: 0.001, off: off(4) }); // foot hi-hat
    } else {
      tone({ ...dry, at: t, f: 90, f2: 50, dur: 0.12, vol: fs ? 0.1 : 0.05, a: 0.002 });                     // feathered kick
    }
    noise({ ...dry, at: t + beat * SWING, dur: 0.08, vol: 0.03, type: 'bandpass', f: 7000, q: 1.5, a: 0.001, off: off(5) }); // swung skip note
    // vibraphone / electric piano comp: Charleston rhythm, soft, with tremolo
    const pc = (b.key + rs) % 12, vb = 60 + pc - (pc > 6 ? 12 : 0);
    const comp = (when, dur, vol) => Q.v.forEach((iv, k) => {
      const m = vb + iv; if (full(true)) return;
      tone({ at: t + when, f: mtof(m), dur, type: 'sine', vol, a: 0.004, det: 5, dest: B.trem, bed: true, wet: 0.2 });
      tone({ at: t + when, f: mtof(m) * 4, dur: 0.18, type: 'sine', vol: vol * 0.25, a: 0.002, dest: B.trem, bed: true, wet: 0.1 });
    });
    if (bt === 0) comp(0, beat * 1.6, 0.05);
    if (bt === 1) comp(beat * SWING, beat * 1.2, 0.04);
    if (fs && bt === 3) comp(beat * SWING, beat * 0.6, 0.035);
    // horn work
    const stab = (ms, when, dur, vol, lp) => ms.forEach((m) => tone({ at: t + when, f: mtof(m), f2: mtof(m) * 1.0, dur, type: 'sawtooth', vol, a: 0.012, lp, q: 3, dest: D, bed: true, wet: 0.2, det: m % 3 }));
    const tp = vb + 12 + Q.v[2 % 3] - 2; // upper-register chord tone
    if (!fs) {
      // occasional muted trumpet stab (bars 4 and 8 of the loop)
      if (bar === 3 && bt === 2) stab([tp + 0], beat * SWING, 0.2, 0.05, 1300);
      if (bar === 7 && bt === 1) { stab([tp], beat * SWING, 0.16, 0.05, 1300); }
      if (bar === 7 && bt === 3) stab([tp - 2], 0, 0.28, 0.05, 1300);
    } else {
      // hot brass stabs on the swung "and of 2" and on 4
      const sh = [vb + Q.v[0], vb + Q.v[1], vb + Q.v[2] - 12 + 12];
      if (bt === 1) stab(sh, beat * SWING, 0.14, 0.035, 2600);
      if (bt === 3) stab(sh, 0, 0.18, 0.035, 2600);
      if (bt === 0 && bar % 4 === 0) stab(sh, 0, 0.22, 0.035, 2600);
      // xylophone runs: ascending pentatonic over the last beat of every 4th bar
      if (bt === 3 && bar % 4 === 3) for (let k = 0; k < 6; k++) { const m = 72 + pc + PENT[k % 5] + (k > 4 ? 12 : 0); xylo2(m, t + k * beat / 6, 0.05); }
    }
    function xylo2(m, at, vol) {
      tone({ at, f: mtof(m), dur: 0.2, type: 'sine', vol, a: 0.0015, dest: D, bed: true, wet: 0.12 });
      tone({ at, f: mtof(m) * 3.97, dur: 0.06, type: 'sine', vol: vol * 0.4, a: 0.001, dest: D, bed: true, wet: 0.05 });
    }
  }

  return {
    ctx: c, master, SOUNDS, BEDS, bedInfo, bedBeat, newBus, killAll, noiseBuf,
    get voices() { return voices; }, get liveCount() { return live.size; },
  };
}

// ============================ live wiring ============================
let ctx = null, engine = null, master = null;
let muted = false;
let started = false, bonus = false, mood = 'base';
const bed = { cur: 'off', B: null, idx: 0, next: 0, timer: 0 };

try { muted = localStorage.getItem(KEY) === '1'; } catch (e) { muted = false; }

function syncUi() {
  try {
    const apply = () => {
      document.body.classList.toggle('muted', muted);
      const b = document.getElementById('btn-sound'); if (b) b.setAttribute('aria-pressed', String(muted));
    };
    if (document.body) apply(); else document.addEventListener('DOMContentLoaded', apply, { once: true });
  } catch (e) { /* ignore */ }
}
syncUi();

function init() {
  if (ctx) return true;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return false;
  try { ctx = new AC(); } catch (e) { return false; }
  engine = createEngine(ctx, { muted });
  master = engine.master;
  return true;
}

function applyMood() {
  if (!engine || !started || bed.cur === mood) return;
  if (bed.B) bed.B.release();
  bed.B = mood === 'off' ? null : engine.newBus();
  bed.cur = mood; bed.idx = 0; bed.next = 0;
}

// lookahead scheduler: timers only wake us up; all timing comes from the audio clock, so there is no drift
const LOOKAHEAD = 0.35, TICK = 80;
function tick() {
  bed.timer = setTimeout(tick, TICK);
  try {
    if (!ctx || !engine || muted || document.hidden || ctx.state !== 'running' || !bed.B || bed.cur === 'off') { bed.next = 0; return; }
    const info = engine.bedInfo(bed.cur), now = ctx.currentTime;
    if (!bed.next || bed.next < now - 0.1) { bed.next = now + 0.06; bed.idx = Math.ceil(bed.idx / 4) * 4; } // (re)start on a bar line
    while (bed.next < now + LOOKAHEAD) { engine.bedBeat(bed.cur, bed.idx, bed.next, bed.B); bed.next += info.beat; bed.idx++; }
  } catch (e) { /* audio must never break the game */ }
}

function unlock() {
  if (!init()) return;
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  if (!started) { started = true; applyMood(); if (!bed.timer) bed.timer = setTimeout(tick, TICK); }
}
if (typeof window !== 'undefined') {
  const once = () => { unlock(); };
  ['pointerdown', 'touchstart', 'keydown', 'mousedown', 'click'].forEach((ev) => window.addEventListener(ev, once, { capture: true, passive: true }));
  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.hidden) ctx.suspend().catch(() => {}); else if (started) { bed.next = 0; ctx.resume().catch(() => {}); }
  });
}

export const audio = {
  play(name, opt) {
    try {
      if (!ctx || muted || !engine) return;
      if (ctx.state === 'suspended') { ctx.resume().catch(() => {}); }
      const fn = engine.SOUNDS[name];
      if (fn) fn(opt || {});
    } catch (e) { /* audio must never break the game */ }
  },
  setMuted(b) {
    muted = !!b;
    try { localStorage.setItem(KEY, muted ? '1' : '0'); } catch (e) { /* ignore */ }
    if (master && ctx) {
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.setTargetAtTime(muted ? 0 : 0.8, ctx.currentTime, 0.02);
      if (muted) { engine.killAll(); bed.next = 0; } // nothing queued may sound after unmute
    }
    syncUi();
  },
  get muted() { return muted; },
  set muted(b) { audio.setMuted(b); },
  unlock,
  setMood(m) { if (!MOODS.includes(m)) return; mood = m; applyMood(); },
  get mood() { return mood; },
  setBonus(b) { // legacy: free-spins flag drives the bed unless it was switched off
    bonus = !!b;
    if (mood !== 'off') audio.setMood(bonus ? 'freespins' : 'base');
  },
  get ready() { return !!ctx && ctx.state === 'running'; },
  get bonus() { return bonus; },
  _stop() { clearTimeout(bed.timer); bed.timer = 0; },
  _sounds: null, // set below: test hook, lets the dev harness call a sound without the try/catch
  get _engine() { return engine; },
};
Object.defineProperty(audio, '_sounds', { get() { return engine ? engine.SOUNDS : {}; } });
export default audio;
