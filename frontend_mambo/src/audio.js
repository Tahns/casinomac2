// Agent Mambo - 1960s spy-jazz sound design. WebAudio synthesis only (no samples, no files, no generative AI).
// One master gain => one mute for everything. Starts after the first user gesture.
// The engine is a factory (createEngine) so the very same synthesis can be rendered offline in tests.
const KEY = 'am_muted'; // NEW key: does not clash with the mining game ('tum_muted') on the same origin
const PENT = [0, 2, 4, 7, 9];
const SCALE = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24, 26, 28, 31];
const MAX_VOICES = 56;           // simultaneous (non-bed) oscillator/noise voices
const MOODS = ['base', 'freespins', 'off'];

const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
const hz = (semi, base = 523.25) => base * Math.pow(2, semi / 12);
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const NN = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const nn = (s) => { const m = /^([A-G])([#b]?)(-?\d)$/.exec(s); return (+m[3] + 1) * 12 + NN[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0); };
const nl = (s) => s.trim().split(/\s+/).map((x) => (x === '.' || x === '-' ? x : nn(x)));

// ---- bed definitions: 8 bars of 4/4, D dorian (base, 118 bpm) and the same chart a tone up in E dorian (free spins, 132 bpm) ----
// chords: voicings per bar (one chord, or two chords of two beats each); bass: four quarter notes per bar (null = rest)
const CHORDS = [
  [nl('F4 A4 C5 E5')], [nl('F4 A4 C5 E5')], [nl('B3 F4 A4 E5')], [nl('B3 F4 A4 E5')],
  [nl('G4 Bb4 D5 F5'), nl('G4 Bb4 C#5 E5')], [nl('F4 A4 C5 E5')], [nl('Ab4 C5 D5 E5'), nl('G4 Bb4 C#5 Eb5')], [nl('F4 A4 C5 E5')],
];
const BASS = [
  nl('D2 F2 A2 C3'), nl('D3 C3 A2 F2'), nl('G2 B2 D3 E3'), nl('F3 E3 D3 B2'),
  nl('E2 G2 A2 C#3'), nl('D2 A2 F2 A2'), nl('Bb2 D3 A2 C#3'), [nn('D2'), null, null, null],
];
// surf guitar, eighth-note slots, bars 1-4 ('-' = tremolo-picked hold of the previous note)
const GUIT = [
  nl('D5 . F5 A5 . G5 F5 .'), nl('E5 D5 . C5 A4 - . .'), nl('D5 . F5 A5 . G5 F5 .'), nl('E5 D5 . C5 A4 - . .'),
];
const BONGO = 'H.HL.HL.H.HL.HLH';
const BEDS = {
  base: { bpm: 118, key: 0, tr: 0, prog: CHORDS },
  freespins: { bpm: 132, key: 2, tr: 2, prog: CHORDS },
};
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
  master.connect(comp); if (o.noLimit) comp.connect(c.destination); else { comp.connect(lim); lim.connect(c.destination); } // noLimit: test hook to measure the pre-limiter peak

  const sfx = c.createGain(); sfx.gain.value = 0.9; sfx.connect(master);
  // short room reverb (shared, 0.35 s decaying noise burst)
  const verb = c.createConvolver();
  { const len = Math.floor(sr * 0.35), buf = c.createBuffer(2, len, sr); for (let ch = 0; ch < 2; ch++) { const d = buf.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (rnd() * 2 - 1) * Math.pow(1 - i / len, 3); } verb.buffer = buf; }
  const verbSend = c.createGain(); verbSend.gain.value = 0.3; verbSend.connect(verb);
  const vo = c.createGain(); vo.gain.value = 0.8; verb.connect(vo); vo.connect(master);
  // spring-reverb-like short feedback delay (used by the surf guitar): returns the input node, tail goes to `out`
  function makeSpring(out, wet = 0.5) {
    const inp = c.createGain(), dl = c.createDelay(0.2), fb = c.createGain(), lp = c.createBiquadFilter(), og = c.createGain();
    dl.delayTime.value = 0.037; fb.gain.value = 0.42; lp.type = 'lowpass'; lp.frequency.value = 2600; og.gain.value = wet;
    inp.connect(dl); dl.connect(lp); lp.connect(fb); fb.connect(dl); lp.connect(og); og.connect(out);
    return { inp, off() { try { inp.disconnect(); dl.disconnect(); lp.disconnect(); fb.disconnect(); og.disconnect(); } catch (e) { /* ignore */ } } };
  }
  const sfxSpring = makeSpring(master, 0.5);
  // shared noise buffer (2s, deterministic)
  const noiseBuf = c.createBuffer(1, sr * 2, sr);
  { const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = rnd() * 2 - 1; }
  // shared vibraphone tremolo for SFX (free-running LFO; only feeds a gain param, so it is never audible by itself)
  const vibSfx = c.createGain(); vibSfx.gain.value = 0.8; vibSfx.connect(sfx);
  { const l = c.createOscillator(); l.frequency.value = 5.5; const lg = c.createGain(); lg.gain.value = 0.2; l.connect(lg); lg.connect(vibSfx.gain); l.start(0); }

  // mission meter (set from the game; read by the free-spins bed and by the 'mult' sound)
  let meter = 1;

  // ---- voice registry (cap + kill-all on mute) ----
  const live = new Set(); let voices = 0;
  const buses = new Set();
  function reg(src, bed) {
    live.add(src); if (!bed) voices++;
    src.onended = () => { live.delete(src); if (!bed) voices--; try { src.disconnect(); } catch (e) { /* ignore */ } };
  }
  function killAll() { live.forEach((s) => { try { s.stop(); } catch (e) { /* ignore */ } }); live.clear(); voices = 0; buses.forEach((b) => b.kill()); buses.clear(); }
  const full = (bed) => !bed && voices >= MAX_VOICES;
  const T0 = (p) => (p.at == null ? c.currentTime : p.at) + (p.when || 0);

  function tone(p) {
    const { f = 440, f2 = null, dur = 0.2, type = 'sine', vol = 0.3, a = 0.004, wet = 0.2, q = 0, lp = 0, ft = 'lowpass', det = 0, dest = sfx, bed = false, vib = 0, vibHz = 6, sp = null, spw = 0, detSrc = null } = p;
    if (full(bed)) return;
    const t = T0(p);
    const osc = c.createOscillator(); osc.type = type; osc.frequency.setValueAtTime(f, t); osc.detune.value = det;
    if (f2) osc.frequency.exponentialRampToValueAtTime(Math.max(1, f2), t + dur);
    if (detSrc) detSrc.connect(osc.detune);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let node = osc;
    if (lp) { const fl = c.createBiquadFilter(); fl.type = ft; fl.frequency.value = lp; fl.Q.value = q || 0.7; osc.connect(fl); node = fl; }
    node.connect(g); g.connect(dest);
    if (wet) { const w = c.createGain(); w.gain.value = wet; g.connect(w); w.connect(verbSend); }
    if (sp && spw) { const w = c.createGain(); w.gain.value = spw; g.connect(w); w.connect(sp); }
    if (vib) { const l = c.createOscillator(); l.frequency.value = vibHz; const lg = c.createGain(); lg.gain.value = vib; l.connect(lg); lg.connect(osc.detune); l.start(t); l.stop(t + dur + 0.05); reg(l, true); }
    osc.start(t); osc.stop(t + dur + 0.05); reg(osc, bed);
  }
  function noise(p) {
    const { dur = 0.2, vol = 0.3, type = 'bandpass', f = 1000, f2 = null, q = 1, a = 0.003, wet = 0.1, dest = sfx, bed = false } = p;
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
  // crescendo roll (snare roll / cymbal roll): amplitude-modulated noise
  function roll({ dur = 0.9, vol = 0.2, f = 5000, type = 'highpass', q = 0.7, rate = 22, when = 0, at = null, wet = 0.2, end = 0.6 }) {
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
  // swanee (slide) whistle with vibrato
  const whistle = (f, f2, dur, when = 0, vol = 0.12) => tone({ f, f2, dur, type: 'sine', vol, a: 0.03, when, vib: 28, vibHz: 7, wet: 0.25 });
  // muted trombone: saw through a wah-wah lowpass (error / near miss)
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

  // ---- spy-jazz instruments ----
  // surf guitar: bright saw through a 1.2 kHz band-pass, plucked, spring-reverb tail, optional pitch slide
  const twang = (m, p = {}) => tone({ f: mtof(m), f2: p.to ? mtof(p.to) : null, dur: p.dur || 0.35, type: 'sawtooth', vol: (p.vol == null ? 0.2 : p.vol) * 2.4, a: 0.003, lp: 1200, ft: 'bandpass', q: 3, wet: 0.05, dest: p.dest || sfx, bed: !!p.bed, at: p.at, when: p.when, sp: p.sp || sfxSpring.inp, spw: 0.9, vib: p.vib == null ? 10 : p.vib, vibHz: 7, detSrc: p.detSrc });
  // vibraphone: fundamental + detuned 4th partial (x4 at 0.2), long decay, tremolo from the shared LFO
  const vibe = (m, when = 0, vol = 0.12, dur = 0.9, p = {}) => {
    const f = mtof(m), base = { at: p.at, when, dest: p.dest || vibSfx, bed: !!p.bed, wet: 0.2, a: 0.002 };
    tone({ ...base, f, dur, vol }); tone({ ...base, f: f * 4, det: 7, dur: dur * 0.3, vol: vol * 0.2, wet: 0.1 });
  };
  const bongo = (hi, when = 0, vol = 0.22, p = {}) => {
    const base = { at: p.at, when, dest: p.dest || sfx, bed: !!p.bed, wet: 0.04 };
    tone({ ...base, f: hi ? 420 : 300, f2: hi ? 330 : 240, dur: 0.11, vol, a: 0.001 });
    noise({ ...base, dur: 0.025, vol: vol * 0.45, type: 'highpass', f: hi ? 2800 : 1800, q: 0.7, a: 0.001, off: p.off });
  };
  const conga = (when = 0, vol = 0.26, p = {}) => {
    const base = { at: p.at, when, dest: p.dest || sfx, bed: !!p.bed, wet: 0.06 };
    tone({ ...base, f: 210, f2: 150, dur: 0.2, vol, a: 0.002 });
    noise({ ...base, dur: 0.04, vol: vol * 0.4, type: 'bandpass', f: 1500, q: 1.2, a: 0.001, off: p.off });
  };
  const brass = (ms, when, dur, vol = 0.1, p = {}) => {
    ms.forEach((m, i) => {
      const f = mtof(m), base = { at: p.at, when, dest: p.dest || sfx, bed: !!p.bed, type: 'sawtooth', dur, vol: vol / (1 + i * 0.15), a: p.a == null ? 0.02 : p.a, lp: p.lp || 1600, q: 1.2, wet: 0.25 };
      tone({ ...base, f, det: -8 }); tone({ ...base, f, det: 8 });
    });
  };
  const cymbal = (when = 0, vol = 0.12, dur = 1.3) => { noise({ dur, vol, type: 'highpass', f: 6000, q: 0.6, a: 0.002, when, wet: 0.3 }); noise({ dur: dur * 0.6, vol: vol * 0.5, type: 'bandpass', f: 9000, q: 1.5, a: 0.002, when, wet: 0.25 }); };
  // office / spy props
  const typeKey = (when = 0, vol = 0.18, pitch = 1) => {
    noise({ dur: 0.03, vol, type: 'bandpass', f: 2800 * pitch, q: 2, a: 0.001, when, wet: 0.05 });
    tone({ f: 210 * pitch, f2: 110 * pitch, dur: 0.05, type: 'triangle', vol: vol * 0.9, a: 0.001, when, wet: 0.05 });
  };
  const bell = (f, when = 0, vol = 0.1, dur = 0.8) => {
    tone({ f, dur, type: 'sine', vol, a: 0.001, when, wet: 0.25 });
    tone({ f: f * 2.76, dur: dur * 0.4, type: 'sine', vol: vol * 0.4, a: 0.001, when, wet: 0.2 });
  };
  const shutter = (when = 0, vol = 0.2) => {
    noise({ dur: 0.022, vol, type: 'bandpass', f: 4200, q: 1.5, a: 0.001, when, wet: 0.05 });
    tone({ f: 130, f2: 70, dur: 0.04, type: 'square', vol: vol * 0.25, a: 0.001, when, lp: 600, wet: 0 });
    noise({ dur: 0.03, vol: vol * 0.8, type: 'bandpass', f: 2200, q: 1.5, a: 0.001, when: when + 0.05, wet: 0.05 });
  };
  const safeClick = (when = 0, vol = 0.14, pitch = 1) => {
    noise({ dur: 0.014, vol, type: 'bandpass', f: 5200 * pitch, q: 4, a: 0.0008, when, wet: 0.04 });
    tone({ f: 1900 * pitch, f2: 1500 * pitch, dur: 0.02, type: 'sine', vol: vol * 0.6, a: 0.0008, when, wet: 0.03 });
    tone({ f: 320, f2: 160, dur: 0.05, type: 'triangle', vol: vol * 0.7, a: 0.001, when, wet: 0.03 });
  };
  const snip = (when = 0, vol = 0.14) => {
    noise({ dur: 0.03, vol, type: 'highpass', f: 5000, q: 0.8, a: 0.001, when, wet: 0.05 });
    noise({ dur: 0.03, vol: vol * 0.9, type: 'highpass', f: 6000, q: 0.8, a: 0.001, when: when + 0.055, wet: 0.05 });
    tone({ f: 3300, f2: 2500, dur: 0.05, type: 'triangle', vol: vol * 0.3, a: 0.001, when, wet: 0.03 });
  };
  const phoneBell = (when = 0, rings = 6, vol = 0.07) => {
    for (let i = 0; i < rings; i++) {
      const w = when + i * 0.032;
      tone({ f: i % 2 ? 1568 : 1318, dur: 0.05, type: 'square', vol, a: 0.001, when: w, wet: 0.2, lp: 4000 });
      tone({ f: (i % 2 ? 1568 : 1318) * 2.4, dur: 0.12, type: 'sine', vol: vol * 0.45, a: 0.001, when: w, wet: 0.3 });
    }
  };
  const coin = (when = 0, p = 0) => {
    const f = 1318 * Math.pow(2, p / 12);
    tone({ f, dur: 0.09, type: 'square', vol: 0.05, a: 0.001, when, wet: 0.1 });
    tone({ f: f * 1.5, dur: 0.22, type: 'sine', vol: 0.07, a: 0.001, when: when + 0.07, wet: 0.2 });
  };
  function tada(when = 0, lv = 1) {
    brass([55, 59, 62, 67], when, 0.16, 0.11);
    brass([60, 64, 67, 72], when + 0.2, 0.8 + lv * 0.2, 0.13);
    cymbal(when + 0.2, 0.1, 1.0 + lv * 0.3);
  }
  // wire / bomb-clock state (sounds without parameters step on by themselves)
  let wireN = 0, wireAt = -9, tickAlt = 0;
  const wireStep = (p) => {
    const now = c.currentTime;
    if (p && p.i != null) wireN = p.i; else { if (now - wireAt > 1.2) wireN = 0; else wireN++; }
    wireAt = now; return wireN;
  };

  const SOUNDS = {
    click() { typeKey(0, 0.2); typeKey(0.045, 0.1, 1.25); },
    error() { trombone({ f: 233, f2: 220, dur: 0.14, vol: 0.12 }); trombone({ f: 207, f2: 185, dur: 0.22, vol: 0.12, when: 0.15 }); },
    nearmiss() { // sad trombone, short (< 1s)
      trombone({ f: 392, dur: 0.17, when: 0 }); trombone({ f: 370, dur: 0.17, when: 0.2 }); trombone({ f: 349, dur: 0.17, when: 0.4 });
      trombone({ f: 330, f2: 233, dur: 0.38, when: 0.6, vol: 0.15, wah: false });
    },
    wahwah() { SOUNDS.nearmiss(); },
    spin() { noise({ dur: 0.45, vol: 0.13, f: 250, f2: 2200, q: 0.8, a: 0.05 }); [0, 0.07, 0.14, 0.21].forEach((w, i) => noise({ dur: 0.04, vol: 0.06 + i * 0.01, type: 'highpass', f: 7500, q: 0.6, a: 0.001, when: w + 0.1, wet: 0.05 })); tone({ f: 150, f2: 300, dur: 0.3, type: 'triangle', vol: 0.05 }); },
    whoosh() { noise({ dur: 0.3, vol: 0.12, f: 1800, f2: 300, q: 0.9, a: 0.02 }); noise({ dur: 0.1, vol: 0.05, type: 'highpass', f: 7500, q: 0.6, a: 0.001, when: 0.03 }); },
    land(p) { const v = (p && p.vol) || 1; bongo(false, 0, 0.26 * v); tone({ f: 120, f2: 60, dur: 0.1, vol: 0.12 * v, wet: 0.03 }); },
    pop(p) { // pizzicato removal, climbing with the combo
      const cb = Math.max(1, (p && p.combo) || 1), f = hz(SCALE[Math.min(cb - 1, SCALE.length - 1)], 261.63);
      tone({ f, f2: f * 0.97, dur: 0.22, type: 'triangle', vol: 0.3, a: 0.002, wet: 0.12 });
      tone({ f: f * 2, dur: 0.07, type: 'sine', vol: 0.08, a: 0.001, wet: 0.05 });
      noise({ dur: 0.03, vol: 0.1, type: 'highpass', f: 3500, q: 0.7, a: 0.001, wet: 0.05 });
    },
    win(p) { // vibraphone pentatonic run; length scales with cluster size / win size, pitch with the combo
      const cb = Math.max(1, (p && p.combo) || 1), size = (p && (p.size || p.n)) || 3 + cb;
      const n = clamp(Math.round(4 + size * 0.9 + cb * 0.4), 5, 14);
      const base = 60 + Math.min(12, (cb - 1) * 2);
      for (let k = 0; k < n; k++) {
        const m = base + 12 * Math.floor(k / 5) + PENT[k % 5], last = k === n - 1;
        vibe(m, k * 0.04, last ? 0.15 : 0.11 - k * 0.002, last ? 1.0 : 0.45);
      }
    },
    xylo(p) { SOUNDS.win(p); },
    scatter(p) { // typewriter clack + telegraph ding, rising with the number of dossiers
      const n = Math.max(1, (p && p.n) || 1), b = (n - 1) * 2;
      for (let i = 0; i < 3; i++) typeKey(i * 0.06, 0.2, 1 + i * 0.05);
      bell(hz(b, 2093), 0.2, 0.1, 0.9); bell(hz(b + 4, 2093), 0.32, 0.07, 0.9);
      [0, 4, 7].forEach((s, i) => vibe(64 + b + s, 0.2 + i * 0.05, 0.07, 1.0));
    },
    dossier(p) { SOUNDS.scatter(p); },
    antic() { // snare roll under tremolo-picked surf guitar, rising
      roll({ dur: 0.95, vol: 0.2, f: 1700, type: 'bandpass', q: 0.9, rate: 24, end: 0.9, wet: 0.2 });
      for (let k = 0; k < 14; k++) twang(64 + (k > 8 ? 3 : 0), { when: k * 0.066, dur: 0.1, vol: 0.05 + k * 0.004, vib: 0 });
    },
    wire(p) { // relay click + beep, one semitone higher per node
      const i = Math.min(24, wireStep(p));
      noise({ dur: 0.012, vol: 0.12, f: 3200, q: 2, a: 0.0008, wet: 0.03 });
      tone({ f: 130, f2: 80, dur: 0.025, type: 'square', vol: 0.05, a: 0.001, lp: 900, wet: 0 });
      tone({ f: hz(i, 880), dur: 0.09, type: 'sine', vol: 0.11, a: 0.002, when: 0.02, wet: 0.15 });
    },
    fuse() { SOUNDS.wire({}); },
    tick(p) { // clock tick / tock; p (0..1) or burn/total makes it higher and louder as the wire burns down
      const pr = clamp(p && p.p != null ? p.p : (p && p.total ? (p.burn || 0) / p.total : 0), 0, 1);
      const tock = (tickAlt++ & 1) === 1, pit = (tock ? 0.72 : 1) * (1 + pr * 0.3), v = 0.12 + pr * 0.1;
      noise({ dur: 0.016, vol: v, type: 'bandpass', f: 3600 * pit, q: 4, a: 0.0008, wet: 0.03 });
      tone({ f: 2300 * pit, f2: 1800 * pit, dur: 0.03, type: 'sine', vol: v * 0.7, a: 0.001, wet: 0.03 });
      tone({ f: tock ? 110 : 150, f2: 70, dur: 0.05, type: 'triangle', vol: v * 0.8, a: 0.001, wet: 0.02 });
    },
    ticks(p) { // a whole accelerating bomb-clock run: more burnt cells => faster and higher
      const burn = Math.max(0, (p && p.burn) || 0), total = Math.max(1, (p && p.total) || 8), dur = (p && p.dur) || 1.2;
      let t = 0, k = 0; const pr0 = clamp(burn / total, 0, 1);
      while (t < dur && k < 40) {
        const pr = clamp(pr0 + (t / dur) * (1 - pr0) * 0.7, 0, 1);
        const pit = (k & 1 ? 0.72 : 1) * (1 + pr * 0.3), v = 0.12 + pr * 0.1;
        noise({ dur: 0.016, vol: v, type: 'bandpass', f: 3600 * pit, q: 4, a: 0.0008, when: t, wet: 0.03 });
        tone({ f: 2300 * pit, f2: 1800 * pit, dur: 0.03, type: 'sine', vol: v * 0.7, a: 0.001, when: t, wet: 0.03 });
        t += 0.5 - 0.38 * pr; k++;
      }
    },
    defuse() { snip(0, 0.16); vibe(84, 0.14, 0.1, 0.7); vibe(91, 0.22, 0.09, 0.9); vibe(96, 0.3, 0.07, 1.0); },
    snip() { snip(0, 0.16); },
    explosion() { // comic blast: noise burst, sine drop 200 -> 40 Hz, cymbal, boing
      SOUNDS.crack(); SOUNDS.rumble();
      noise({ dur: 1.6, vol: 0.55, type: 'lowpass', f: 4200, f2: 70, q: 0.9, a: 0.004, wet: 0.3 });
      tone({ f: 200, f2: 40, dur: 1.3, type: 'sine', vol: 0.7, a: 0.003, wet: 0.2 });
      tone({ f: 70, f2: 28, dur: 1.6, type: 'triangle', vol: 0.3, a: 0.01, wet: 0.25 });
      boing({ f: 150, dur: 1.0, vol: 0.28, wob: 5, depth: 0.7, when: 0.22, wet: 0.25 });
      cymbal(0.05, 0.1, 1.5);
      for (let i = 0; i < 8; i++) noise({ dur: 0.05, vol: 0.1, type: 'bandpass', f: 800 + rnd() * 4000, q: 1.5, when: 0.15 + rnd() * 1.0, wet: 0.15 });
    },
    blast() { SOUNDS.explosion(); },
    stamp() { // "ACCEPTED": thump + paper snap
      tone({ f: 140, f2: 55, dur: 0.18, type: 'sine', vol: 0.5, a: 0.002, wet: 0.08 });
      noise({ dur: 0.05, vol: 0.2, type: 'bandpass', f: 1200, q: 0.8, a: 0.001, wet: 0.05 });
      noise({ dur: 0.07, vol: 0.14, type: 'highpass', f: 4500, q: 0.6, a: 0.001, when: 0.04, wet: 0.08 });
    },
    mult(p) { // vibraphone ting, pitch by meter level
      const lv = Math.max(1, Math.round((p && (p.level || p.n)) || meter));
      const m = 72 + PENT[(lv - 1) % 5] + 12 * Math.min(1, Math.floor((lv - 1) / 5));
      vibe(m, 0, 0.14, 0.9); vibe(m + 12, 0.02, 0.05, 0.5);
      noise({ dur: 0.03, vol: 0.06, type: 'highpass', f: 6000, q: 0.6, a: 0.001, wet: 0.05 });
    },
    meterTick(p) { SOUNDS.mult(p); },
    meter(p) { SOUNDS.mult(p); },
    meterRise() { // noise upsweep riser
      noise({ dur: 1.3, vol: 0.2, type: 'bandpass', f: 400, f2: 7000, q: 1.2, a: 0.9, wet: 0.2 });
      tone({ f: 300, f2: 1800, dur: 1.2, type: 'triangle', vol: 0.05, a: 0.8, wet: 0.2 });
    },
    riser() { SOUNDS.meterRise(); },
    metermax() {
      [0, 4, 7, 12, 16, 19, 24].forEach((s, i) => vibe(72 + s, i * 0.05, 0.1, 1.0));
      brass([64, 67, 71, 76], 0.32, 0.6, 0.12); cymbal(0.32, 0.1, 1.3); shutter(0.3, 0.12);
    },
    fsStart() {
      twang(52, { to: 76, dur: 0.7, vol: 0.2, vib: 0 });
      for (let k = 0; k < 8; k++) vibe(60 + 12 * Math.floor(k / 5) + PENT[k % 5], 0.05 + k * 0.04, 0.09, 0.4);
      brass([55, 59, 62], 0.5, 0.3, 0.1); brass([57, 61, 64], 0.8, 0.3, 0.1);
      brass([60, 64, 67, 72], 1.1, 1.4, 0.13); cymbal(1.1, 0.12, 1.6);
    },
    retrigger() { // telegraph chatter + brass
      for (let k = 0; k < 6; k++) typeKey(k * 0.05, 0.14, 1.1);
      bell(2349, 0.32, 0.09, 0.8);
      [0, 0.12, 0.24].forEach((w, i) => brass([60 + i * 2, 64 + i * 2, 67 + i * 2], 0.1 + w, 0.1, 0.1));
      brass([67, 71, 74, 79], 0.5, 0.9, 0.13); cymbal(0.5, 0.1, 1.1);
    },
    fsEnd() { twang(79, { to: 55, dur: 0.6, vol: 0.18, vib: 0 }); tada(0.55, 1); },
    tada(p) { tada(0, (p && p.level) || 1); },
    bigwin(p) {
      const lv = clamp((p && p.level) || 1, 1, 4), rl = 0.8 + lv * 0.12;
      roll({ dur: rl, vol: 0.2, f: 6000, type: 'highpass', rate: 26, end: 0.92 });
      roll({ dur: rl, vol: 0.12, f: 1800, type: 'bandpass', q: 0.9, rate: 22, end: 0.92, wet: 0.1 });
      twang(48, { to: 84, dur: rl, vol: 0.2, vib: 0 });
      tada(rl, lv);
      for (let i = 0; i < 4 + lv * 2; i++) coin(rl + 0.1 + i * 0.07, i % 5);
    },
    kaching() { phoneBell(0, 7, 0.07); bell(2637, 0.22, 0.09, 0.7); tone({ f: 110, f2: 70, dur: 0.1, vol: 0.2, wet: 0.05 }); },
    phone() { phoneBell(0, 10, 0.07); phoneBell(0.5, 10, 0.07); },
    shutter() { shutter(0, 0.22); },
    vault() { // safe tumbler clicks, then the bolt
      for (let i = 0; i < 5; i++) safeClick(i * 0.075, 0.13, 0.9 + i * 0.07);
      tone({ f: 90, f2: 45, dur: 0.3, type: 'sine', vol: 0.5, a: 0.002, when: 0.42, wet: 0.1 });
      noise({ dur: 0.05, vol: 0.2, type: 'bandpass', f: 1400, q: 1.5, a: 0.001, when: 0.42, wet: 0.1 });
      bell(1760, 0.5, 0.06, 0.6);
    },
    coin(p) { coin(0, (p && p.pitch) || 0); },
    count(p) { const q = (p && p.p) || 0; typeKey(0, 0.07, 1.2 + q * 0.5); },
    heart(p) { // lub-dub on soft congas
      const k = Math.min(1, 0.55 + ((p && p.i) || 0) * 0.15);
      tone({ f: 100, f2: 58, dur: 0.15, vol: 0.45 * k, a: 0.003, wet: 0.1 });
      tone({ f: 88, f2: 52, dur: 0.17, vol: 0.34 * k, a: 0.003, when: 0.17, wet: 0.1 });
      bongo(false, 0, 0.1 * k);
    },
    rumble() {
      noise({ dur: 2.6, vol: 0.4, type: 'lowpass', f: 160, f2: 40, q: 1.2, a: 0.5, wet: 0.2 });
      tone({ f: 40, f2: 32, dur: 2.4, vol: 0.45, a: 0.6, wet: 0.2 });
      roll({ dur: 2.2, vol: 0.1, f: 400, type: 'lowpass', rate: 18, end: 0.95 });
    },
    crack() {
      noise({ dur: 0.09, vol: 0.55, type: 'highpass', f: 1800, q: 0.6, a: 0.001, wet: 0.3 });
      noise({ dur: 0.35, vol: 0.3, type: 'bandpass', f: 3200, f2: 700, q: 1.2, a: 0.001, wet: 0.3 });
      tone({ f: 1900, f2: 300, dur: 0.12, type: 'square', vol: 0.1, a: 0.001, lp: 4000 });
    },
    shower(p) { const n = Math.min(24, (p && p.n) || 18); for (let i = 0; i < n; i++) coin(rnd() * 1.4, [0, 2, 4, 7, 9, 12][(rnd() * 6) | 0]); },
    stinger(p) {
      const lv = clamp((p && p.level) || 1, 1, 4), b = (lv - 1) * 2;
      brass([60 + b, 64 + b, 67 + b], 0, 0.12 + lv * 0.05, 0.09);
      [0, 4, 7, 12, 16].slice(0, 3 + lv).forEach((s, i) => vibe(72 + b + s, 0.1 + i * 0.06, 0.09, 0.5));
    },
    drip() { vibe(84 + ((rnd() * 7) | 0), 0, 0.06, 0.5); },
    mascot_hop() { boing({ f: 360, dur: 0.28, vol: 0.18, wob: 3, depth: 0.5 }); bongo(true, 0.2, 0.12); },
    mascot_gasp() { noise({ dur: 0.22, vol: 0.12, f: 700, f2: 2600, q: 1.5, a: 0.07, wet: 0.1 }); whistle(1100, 560, 0.25, 0.18, 0.06); },
  };

  // ---- spy-jazz bed ----
  // A bus per mood instance: fades in, and fades out when the mood changes (so already-queued lookahead notes die with it).
  function newBus(mood) {
    const b = BEDS[mood], rate = b ? b.bpm / 60 : 2;
    const bus = c.createGain(); bus.gain.setValueAtTime(0.0001, c.currentTime); bus.gain.linearRampToValueAtTime(o.bedVol == null ? 0.45 : o.bedVol, c.currentTime + 0.1);
    bus.connect(master);
    const send = c.createGain(); send.gain.value = 0.12; bus.connect(send); send.connect(verbSend);
    const spring = makeSpring(bus, 0.45);
    // vibraphone tremolo: whole cycles per bar so the loop is seamless (3 per beat in base = 5.9 Hz, 2.5 per beat in free spins = 5.5 Hz)
    const trem = c.createGain(); trem.gain.value = 0.78; trem.connect(bus);
    const lfo = c.createOscillator(); lfo.frequency.value = (mood === 'freespins' ? 2.5 : 3) * rate; const lg = c.createGain(); lg.gain.value = 0.22; lfo.connect(lg); lg.connect(trem.gain); lfo.start(c.currentTime); reg(lfo, true);
    // surf-guitar vibrato 7 Hz (cents), fans out to every guitar note
    const gv = c.createOscillator(); gv.frequency.value = 7; const gvg = c.createGain(); gvg.gain.value = 9; gv.connect(gvg); gv.start(c.currentTime); reg(gv, true);
    // percussion pans: highs left, lows right
    const panH = c.createStereoPanner(), panL = c.createStereoPanner(); panH.pan.value = -0.45; panL.pan.value = 0.45; panH.connect(bus); panL.connect(bus);
    const B = {
      bus, trem, spring: spring.inp, panH, panL, gvib: gvg,
      release() { const t = c.currentTime; try { bus.gain.cancelScheduledValues(t); bus.gain.setValueAtTime(bus.gain.value, t); bus.gain.linearRampToValueAtTime(0, t + 0.2); lfo.stop(t + 0.3); gv.stop(t + 0.3); } catch (e) { /* ignore */ } setTimeout(() => { spring.off(); buses.delete(B); }, 1500); },
      kill() { try { bus.gain.cancelScheduledValues(c.currentTime); bus.gain.value = 0; } catch (e) { /* ignore */ } spring.off(); },
    };
    buses.add(B);
    return B;
  }
  function bedBeat(mood, idx, t, B) {
    const b = BEDS[mood]; if (!b || !B) return;
    const beat = 60 / b.bpm, s16 = beat / 4, beats = b.prog.length * 4, i = ((idx % beats) + beats) % beats;
    const bar = Math.floor(i / 4), bt = i % 4, fs = mood === 'freespins', tr = b.tr;
    const dry = { bed: true, wet: 0.03, at: t };
    const D = B.bus;
    // walking upright bass (triangle + lowpass 600 Hz)
    const bn = BASS[bar][bt];
    if (bn != null) {
      const f = mtof(bn + tr);
      tone({ ...dry, dest: D, f, dur: beat * 0.9, type: 'triangle', vol: 0.34, a: 0.006, lp: 600 });
      if (fs && bar >= 6) tone({ ...dry, at: t + beat / 2, dest: D, f, dur: beat * 0.42, type: 'triangle', vol: 0.28, a: 0.006, lp: 600 });
    }
    // bongos (16ths, high/low panned apart) + conga accent on beat 4
    for (let k = 0; k < 4; k++) {
      const ch = BONGO[bt * 4 + k], tk = t + k * s16, off = (i * 0.173 + k * 0.331) % 1.5;
      if (ch === 'H') bongo(true, 0, 0.16, { at: tk, dest: B.panH, bed: true, off });
      else if (ch === 'L') bongo(false, 0, 0.15, { at: tk, dest: B.panL, bed: true, off });
      else if (fs && k % 2 === 1) bongo(k === 1, 0, 0.07, { at: tk, dest: k === 1 ? B.panH : B.panL, bed: true, off }); // doubled: ghost notes in the gaps
    }
    if (bt === 3) conga(0, fs ? 0.26 : 0.2, { at: t, dest: B.panL, bed: true, off: 0.4 });
    // brushed hats: off-beat eighths (16ths in free spins), no kick
    const off1 = (i * 0.211) % 1.5;
    if (fs) { for (let k = 0; k < 4; k++) noise({ ...dry, at: t + k * s16, dest: D, dur: 0.05, vol: k % 2 ? 0.075 : 0.04, type: 'highpass', f: 7500, q: 0.6, a: 0.002, off: off1 + k * 0.17 }); }
    else noise({ ...dry, at: t + beat / 2, dest: D, dur: 0.07, vol: 0.08, type: 'highpass', f: 7000, q: 0.6, a: 0.003, off: off1 });
    // chord of this beat
    const cs = b.prog[bar], vo = cs[cs.length > 1 && bt >= 2 ? 1 : 0].map((m) => m + tr);
    // vibraphone off-beat comping (base: and of 1 and of 3; free spins adds the and of 2)
    const comp = (when, dur, vol) => vo.forEach((m) => vibe(m, 0, vol, dur, { at: t + when, dest: B.trem, bed: true }));
    if (bt === 0 || bt === 2) comp(beat / 2, 1.1, 0.05);
    else if (fs && bt === 1) comp(beat / 2, 0.7, 0.04);
    // free spins: vibraphone arpeggio, one semitone higher per 5 meter levels (cap +5)
    if (fs) { const st = Math.min(5, Math.floor(meter / 5)); for (let k = 0; k < 2; k++) vibe(vo[(bt * 2 + k) % 4] + 12 + st, 0, 0.035, 0.35, { at: t + k * beat / 2 + beat / 4, dest: B.trem, bed: true }); }
    // surf guitar: eighth-note line over bars 1-4, tremolo-picked holds, gliss D4 -> D5 at the end of bar 4
    const gk = { bed: true, dest: D, sp: B.spring, detSrc: B.gvib, vib: 0 };
    if (bar < 4) {
      const G = GUIT[bar];
      for (let h = 0; h < 2; h++) {
        const e = G[bt * 2 + h], th = t + h * beat / 2;
        if (typeof e === 'number') twang(e + tr, { ...gk, at: th, dur: beat * 0.55, vol: 0.2 });
        else if (e === '-') { let pm = null; for (let q = bt * 2 + h - 1; q >= 0; q--) if (typeof G[q] === 'number') { pm = G[q]; break; } if (pm != null) for (let k = 0; k < 2; k++) twang(pm + tr, { ...gk, at: th + k * s16 * 1, dur: s16 * 1.4, vol: 0.1 }); }
      }
      if (bar === 3 && bt === 3) twang(62 + tr, { ...gk, at: t, to: 74 + tr, dur: beat * 0.95, vol: 0.2 });
    }
    if (fs) for (let k = 0; k < 4; k++) twang(vo[3] + 12, { ...gk, at: t + k * s16, dur: s16 * 1.3, vol: 0.04 }); // constant tremolo picking at 0.1 gain
    // brass stabs: D4 F4 A4 C5 on bar 4 and bar 8 beat 4 (free spins: every bar, beat 4-and)
    if (!fs && bt === 3 && (bar === 3 || bar === 7)) brass([62, 65, 69, 72], 0, 0.12, 0.05, { at: t, dest: D, bed: true });
    if (fs && bt === 3) brass(vo.slice(0, 4), 0, 0.12, 0.05, { at: t + beat / 2, dest: D, bed: true });
  }

  return {
    ctx: c, master, SOUNDS, BEDS, bedInfo, bedBeat, newBus, killAll, noiseBuf,
    setMeter(n) { const prev = meter; meter = Math.max(1, Math.round(n) || 1); return { prev, now: meter }; },
    get meter() { return meter; },
    get voices() { return voices; }, get liveCount() { return live.size; },
  };
}

// ============================ live wiring ============================
let ctx = null, engine = null, master = null;
let muted = false;
let started = false, bonus = false, mood = 'base';
const bed = { cur: 'off', B: null, idx: 0, next: 0, timer: 0 };

try { muted = localStorage.getItem(KEY) === '1'; } catch (e) { muted = false; }

// ---- v2 API skeleton (frozen in step 0, WP2 implements the buses behind it) ----
// Volumes (0-100 per kind) are kept, persisted (am_vol_*) and announced through onChange, but until WP2 adds the master/music/sfx
// buses they have NO audible effect: the mix is exactly the v1 mix (which equals the defaults, 75/75/75).
export const VOLUME_KINDS = Object.freeze(['master', 'music', 'sfx']);
export const DEFAULT_VOLUME = 75;
const VOL_KEYS = { master: 'am_vol_master', music: 'am_vol_music', sfx: 'am_vol_sfx' };
/** Pure: anything -> integer 0..100, or null when it is not a usable number ('', 'abc', NaN, null, undefined, booleans). */
export function parseVolume(raw) {
  if (raw == null || typeof raw === 'boolean' || (typeof raw === 'string' && raw.trim() === '')) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? Math.round(clamp(n, 0, 100)) : null;
}
const vol = { master: DEFAULT_VOLUME, music: DEFAULT_VOLUME, sfx: DEFAULT_VOLUME };
for (const k of VOLUME_KINDS) {
  try { const v = parseVolume(localStorage.getItem(VOL_KEYS[k])); if (v != null) vol[k] = v; } catch (e) { /* default */ }
}
const changeFns = new Set();
function notify(ev) { for (const fn of [...changeFns]) { try { fn({ ...ev, volumes: { ...vol }, muted }); } catch (e) { /* a listener must never break the audio */ } } }

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
  if (!engine || !started || muted || bed.cur === mood) return;
  if (bed.B) bed.B.release();
  bed.B = mood === 'off' ? null : engine.newBus(mood);
  bed.cur = mood; bed.idx = 0; bed.next = 0;
}

// lookahead scheduler: timers only wake us up; all timing comes from the audio clock, so there is no drift.
// Nothing is scheduled while muted, while the tab is hidden or while the context is not running.
const LOOKAHEAD = 0.35, TICK = 80;
function tick() {
  bed.timer = setTimeout(tick, TICK);
  try {
    if (!ctx || !engine || muted || document.hidden || ctx.state !== 'running') { bed.next = 0; return; }
    applyMood();
    if (!bed.B || bed.cur === 'off') { bed.next = 0; return; }
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
    if (document.hidden) ctx.suspend().catch(() => {}); else if (started) { bed.next = 0; if (!muted) ctx.resume().catch(() => {}); }
  });
}

export const audio = {
  /** Play a cue by id. Unknown ids (also ids WP2 has not added yet) are no-ops. Returns true when a cue was started. */
  play(name, opt) {
    try {
      if (!ctx || muted || !engine) return false;
      if (typeof name !== 'string' || !Object.prototype.hasOwnProperty.call(engine.SOUNDS, name)) return false;
      if (ctx.state === 'suspended') { ctx.resume().catch(() => {}); }
      const fn = engine.SOUNDS[name];
      if (typeof fn !== 'function') return false;
      fn(opt || {});
      return true;
    } catch (e) { return false; /* audio must never break the game */ }
  },
  setMuted(b) {
    const was = muted;
    muted = !!b;
    try { localStorage.setItem(KEY, muted ? '1' : '0'); } catch (e) { /* ignore */ }
    if (master && ctx) {
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.setTargetAtTime(muted ? 0 : 0.8, ctx.currentTime, 0.02);
      if (muted) { engine.killAll(); bed.next = 0; bed.B = null; bed.cur = 'off'; } // nothing queued may sound after unmute
    }
    syncUi();
    if (was !== muted) notify({ type: 'mute' });
  },
  /** kind 'master' | 'music' | 'sfx', pct 0-100 (rounded, clamped). Returns false for an unknown kind or a non-number. */
  setVolume(kind, pct) {
    if (!VOLUME_KINDS.includes(kind)) return false;
    const v = parseVolume(pct);
    if (v == null) return false;
    if (vol[kind] === v) return true;
    vol[kind] = v;
    try { localStorage.setItem(VOL_KEYS[kind], String(v)); } catch (e) { /* in-memory value still works */ }
    notify({ type: 'volume', kind, value: v });
    return true;
  },
  /** Integer 0-100, or null for an unknown kind. */
  getVolume(kind) { return VOLUME_KINDS.includes(kind) ? vol[kind] : null; },
  get volumes() { return { ...vol }; },
  /** Short neutral test sound for a slider (WP2: the 'settingsTest' cue, rate limited). A no-op until that cue exists. */
  preview(kind) { if (!VOLUME_KINDS.includes(kind)) return false; return audio.play('settingsTest', { kind }); },
  /** fn({ type: 'volume'|'mute', kind?, value?, volumes, muted }) after every change; returns the unsubscribe function. */
  onChange(fn) { if (typeof fn !== 'function') return () => {}; changeFns.add(fn); return () => { changeFns.delete(fn); }; },
  get muted() { return muted; },
  set muted(b) { audio.setMuted(b); },
  unlock,
  setMood(m) { if (!MOODS.includes(m)) return; mood = m; applyMood(); },
  get mood() { return mood; },
  setBonus(b) { // legacy: free-spins flag drives the bed unless it was switched off
    bonus = !!b;
    if (mood !== 'off') audio.setMood(bonus ? 'freespins' : 'base');
  },
  // Mission Meter level (x1..): steers the free-spins vibraphone arpeggio and fires the riser when it passes x10. Optional to call.
  setMeter(n) {
    try {
      if (!engine) return;
      const r = engine.setMeter(n);
      if (r.prev < 10 && r.now >= 10 && !muted) audio.play('meterRise');
    } catch (e) { /* ignore */ }
  },
  get ready() { return !!ctx && ctx.state === 'running'; },
  get bonus() { return bonus; },
  _stop() { clearTimeout(bed.timer); bed.timer = 0; },
  _sounds: null, // set below: test hook, lets the dev harness call a sound without the try/catch
  get _engine() { return engine; },
};
Object.defineProperty(audio, '_sounds', { get() { return engine ? engine.SOUNDS : {}; } });
export default audio;
