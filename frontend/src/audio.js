// WebAudio synthesis only (no samples). One master gain => one mute for everything. Starts after the first user gesture.
const KEY = 'tum_muted';
const SCALE = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24, 26, 28, 31];

let ctx = null, master = null, sfx = null, verb = null, verbSend = null, ambGain = null, comp = null;
let muted = false;
let started = false, bonus = false, dripTimer = 0, ambNodes = null;
const VOL = 0.8;

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

function impulse(c, secs, decay) {
  const len = Math.floor(c.sampleRate * secs), buf = c.createBuffer(2, len, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) { const d = buf.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay); }
  return buf;
}
let noiseBuf = null;
function noiseBuffer() {
  if (noiseBuf) return noiseBuf;
  const len = ctx.sampleRate * 2; noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  return noiseBuf;
}

function init() {
  if (ctx) return true;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return false;
  try { ctx = new AC(); } catch (e) { return false; }
  master = ctx.createGain(); master.gain.value = muted ? 0 : VOL;
  comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4; comp.attack.value = 0.005; comp.release.value = 0.2;
  master.connect(comp); comp.connect(ctx.destination);
  sfx = ctx.createGain(); sfx.gain.value = 0.9; sfx.connect(master);
  verb = ctx.createConvolver(); verb.buffer = impulse(ctx, 2.4, 2.6);
  verbSend = ctx.createGain(); verbSend.gain.value = 0.28; verbSend.connect(verb);
  const vo = ctx.createGain(); vo.gain.value = 0.9; verb.connect(vo); vo.connect(master);
  ambGain = ctx.createGain(); ambGain.gain.value = 0.0; ambGain.connect(master); ambGain.connect(verbSend);
  return true;
}

function tone({ f = 440, f2 = null, dur = 0.2, type = 'sine', vol = 0.3, a = 0.004, when = 0, wet = 0.25, q = 0, lp = 0, det = 0 }) {
  const t = ctx.currentTime + when;
  const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t); o.detune.value = det;
  if (f2) o.frequency.exponentialRampToValueAtTime(Math.max(1, f2), t + dur);
  const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  let node = o;
  if (lp) { const fl = ctx.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = lp; fl.Q.value = q || 0.7; o.connect(fl); node = fl; }
  node.connect(g); g.connect(sfx);
  if (wet) { const w = ctx.createGain(); w.gain.value = wet; g.connect(w); w.connect(verbSend); }
  o.start(t); o.stop(t + dur + 0.05);
}
function noise({ dur = 0.2, vol = 0.3, type = 'bandpass', f = 1000, f2 = null, q = 1, when = 0, a = 0.003, wet = 0.15 }) {
  const t = ctx.currentTime + when;
  const s = ctx.createBufferSource(); s.buffer = noiseBuffer(); s.loop = true;
  const fl = ctx.createBiquadFilter(); fl.type = type; fl.frequency.setValueAtTime(f, t); fl.Q.value = q;
  if (f2) fl.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t + dur);
  const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(fl); fl.connect(g); g.connect(sfx);
  if (wet) { const w = ctx.createGain(); w.gain.value = wet; g.connect(w); w.connect(verbSend); }
  s.start(t, Math.random()); s.stop(t + dur + 0.05);
}
const hz = (semi, base = 523.25) => base * Math.pow(2, semi / 12);

function brass(freqs, when, dur, vol = 0.12) {
  freqs.forEach((f, i) => {
    tone({ f, dur, type: 'sawtooth', vol: vol / (1 + i * 0.25), a: 0.04, when, lp: 1800 + i * 300, q: 1.2, wet: 0.35, det: i * 3 });
    tone({ f: f * 2, dur: dur * 0.8, type: 'square', vol: vol * 0.25, a: 0.05, when, lp: 2400, wet: 0.3 });
  });
}
function coin(when = 0, p = 0) {
  const f = 1318 * Math.pow(2, p / 12);
  tone({ f, dur: 0.09, type: 'square', vol: 0.06, a: 0.001, when, wet: 0.1 });
  tone({ f: f * 1.5, dur: 0.22, type: 'sine', vol: 0.08, a: 0.001, when: when + 0.07, wet: 0.2 });
}

const SOUNDS = {
  click() { tone({ f: 880, f2: 600, dur: 0.05, type: 'triangle', vol: 0.16, wet: 0.05 }); },
  error() { tone({ f: 220, dur: 0.18, type: 'square', vol: 0.12, lp: 900 }); tone({ f: 165, dur: 0.28, type: 'square', vol: 0.12, when: 0.16, lp: 700 }); },
  spin() { noise({ dur: 0.45, vol: 0.18, f: 250, f2: 2200, q: 0.8, a: 0.05 }); tone({ f: 160, f2: 320, dur: 0.3, type: 'triangle', vol: 0.07 }); },
  whoosh() { noise({ dur: 0.3, vol: 0.12, f: 1800, f2: 300, q: 0.9, a: 0.02 }); },
  land(o) { const v = (o && o.vol) || 1; tone({ f: 130, f2: 52, dur: 0.16, type: 'sine', vol: 0.34 * v, wet: 0.12 }); noise({ dur: 0.07, vol: 0.12 * v, type: 'highpass', f: 2500, q: 0.7, wet: 0.05 }); },
  pop(o) {
    const c = Math.max(1, (o && o.combo) || 1), s = SCALE[Math.min(c - 1, SCALE.length - 1)], f = hz(s);
    noise({ dur: 0.12, vol: 0.2, type: 'highpass', f: 3500, q: 0.7, wet: 0.2 });
    tone({ f: f / 4, f2: f / 8, dur: 0.14, type: 'sine', vol: 0.2, a: 0.002, wet: 0.05 });
    tone({ f, dur: 0.32, type: 'sine', vol: 0.22, a: 0.002 });
    tone({ f: f * 2.01, dur: 0.22, type: 'sine', vol: 0.1, a: 0.002 });
    tone({ f: f * 3.02, dur: 0.14, type: 'triangle', vol: 0.05, a: 0.002 });
  },
  win(o) {
    const c = Math.max(1, (o && o.combo) || 1), b = SCALE[Math.min(c - 1, 6)] - 12;
    [0, 4, 7, 12].forEach((n, i) => tone({ f: hz(n + b), dur: 0.35, type: 'triangle', vol: 0.13, a: 0.003, when: i * 0.055, wet: 0.3 }));
  },
  scatter(o) {
    const n = Math.max(1, (o && o.n) || 1), b = (n - 1) * 2;
    [0, 7, 12, 19].forEach((s, i) => tone({ f: hz(s + b, 659.25), dur: 1.3, type: 'sine', vol: 0.12 / (1 + i * 0.3), a: 0.003, when: i * 0.03, wet: 0.5 }));
    tone({ f: hz(24 + b, 659.25), dur: 0.5, type: 'sine', vol: 0.06, when: 0.1, wet: 0.5 });
  },
  antic() { tone({ f: 180, f2: 900, dur: 0.9, type: 'sawtooth', vol: 0.08, a: 0.2, lp: 1200, q: 4, wet: 0.3 }); noise({ dur: 0.9, vol: 0.06, f: 500, f2: 4000, q: 2, a: 0.3 }); },
  fuse() { for (let i = 0; i < 14; i++) noise({ dur: 0.04, vol: 0.07, type: 'highpass', f: 4000 + Math.random() * 3000, q: 0.7, when: i * 0.06 + Math.random() * 0.03, wet: 0.05 }); },
  explosion() {
    SOUNDS.crack(); SOUNDS.rumble();
    noise({ dur: 2.0, vol: 0.9, type: 'lowpass', f: 4200, f2: 70, q: 0.9, a: 0.004, wet: 0.5 });
    tone({ f: 150, f2: 26, dur: 1.5, type: 'sine', vol: 0.9, a: 0.003, wet: 0.35 });
    tone({ f: 70, f2: 24, dur: 1.9, type: 'triangle', vol: 0.5, a: 0.01, wet: 0.4 });
    for (let i = 0; i < 16; i++) noise({ dur: 0.05, vol: 0.18, type: 'bandpass', f: 800 + Math.random() * 4000, q: 1.5, when: 0.15 + Math.random() * 1.1, wet: 0.2 });
  },
  mult() { [0, 7, 12, 16].forEach((s, i) => tone({ f: hz(s, 440), f2: hz(s + 2, 440), dur: 0.3, type: 'sine', vol: 0.1, when: i * 0.045, wet: 0.45 })); },
  fsStart() {
    brass([hz(-12, 440), hz(-5, 440), hz(0, 440)], 0, 0.5); brass([hz(-10, 440), hz(-3, 440), hz(2, 440)], 0.45, 0.5);
    brass([hz(-8, 440), hz(-1, 440), hz(4, 440)], 0.9, 0.5); brass([hz(-12, 440), hz(-5, 440), hz(0, 440), hz(7, 440)], 1.4, 1.5, 0.14);
  },
  retrigger() { brass([hz(-5, 440), hz(0, 440), hz(4, 440)], 0, 0.35); brass([hz(0, 440), hz(4, 440), hz(7, 440), hz(12, 440)], 0.3, 0.9, 0.12); },
  fsEnd() { brass([hz(-12, 440), hz(-5, 440), hz(0, 440)], 0, 0.4); brass([hz(-8, 440), hz(-1, 440), hz(4, 440)], 0.4, 0.4); brass([hz(-5, 440), hz(0, 440), hz(4, 440), hz(12, 440)], 0.8, 1.6, 0.14); },
  bigwin(o) {
    const lv = Math.max(1, (o && o.level) || 1);
    brass([hz(-12, 440), hz(-5, 440), hz(0, 440)], 0, 0.35); brass([hz(-10, 440), hz(-3, 440), hz(2, 440)], 0.3, 0.35);
    brass([hz(-8, 440), hz(-1, 440), hz(4, 440), hz(12, 440)], 0.6, 1.0 + lv * 0.2, 0.14);
    for (let i = 0; i < 6 + lv * 3; i++) coin(0.9 + i * 0.07, (i % 5));
  },
  coin(o) { coin(0, (o && o.pitch) || 0); },
  count(o) { const p = (o && o.p) || 0; tone({ f: 1400 + p * 900, dur: 0.03, type: 'square', vol: 0.05, a: 0.001, wet: 0.02 }); },
  heart(o) {
    // lub-dub heartbeat for anticipation; o.i grows the intensity
    const k = Math.min(1, 0.55 + ((o && o.i) || 0) * 0.15);
    tone({ f: 62, f2: 38, dur: 0.16, type: 'sine', vol: 0.5 * k, a: 0.004, wet: 0.1 });
    tone({ f: 54, f2: 34, dur: 0.18, type: 'sine', vol: 0.36 * k, a: 0.004, when: 0.17, wet: 0.1 });
    noise({ dur: 0.1, vol: 0.05 * k, type: 'lowpass', f: 300, q: 0.7, wet: 0.05 });
  },
  rumble() {
    noise({ dur: 2.6, vol: 0.5, type: 'lowpass', f: 140, f2: 40, q: 1.2, a: 0.5, wet: 0.2 });
    tone({ f: 38, f2: 30, dur: 2.4, type: 'sine', vol: 0.55, a: 0.6, wet: 0.2 });
  },
  crack() {
    noise({ dur: 0.09, vol: 0.7, type: 'highpass', f: 1800, q: 0.6, a: 0.001, wet: 0.35 });
    noise({ dur: 0.35, vol: 0.35, type: 'bandpass', f: 3200, f2: 700, q: 1.2, a: 0.001, wet: 0.4 });
    tone({ f: 1900, f2: 300, dur: 0.12, type: 'square', vol: 0.12, a: 0.001, lp: 4000 });
  },
  shower(o) {
    // coin shower: n coins clinking with random pitch
    const n = Math.min(40, (o && o.n) || 18);
    for (let i = 0; i < n; i++) coin(Math.random() * 1.4, [0, 2, 4, 7, 9, 12][(Math.random() * 6) | 0]);
  },
  stinger(o) {
    // major-key win stinger, level 1..4
    const lv = Math.max(1, Math.min(4, (o && o.level) || 1)), b = (lv - 1) * 2;
    [0, 4, 7, 12, 16].slice(0, 3 + lv).forEach((n, i) => tone({ f: hz(n + b, 392), dur: 0.5 + i * 0.12, type: 'triangle', vol: 0.12, a: 0.004, when: i * 0.07, wet: 0.4 }));
    tone({ f: hz(24 + b, 392), dur: 0.9, type: 'sine', vol: 0.06, when: 0.3, wet: 0.6 });
  },
  tick(o) { tone({ f: 700 + ((o && o.p) || 0) * 500, dur: 0.025, type: 'triangle', vol: 0.06, a: 0.001, wet: 0.02 }); },
  drip() {
    const f = 900 + Math.random() * 900;
    tone({ f, f2: f * 0.5, dur: 0.12, type: 'sine', vol: 0.1, a: 0.002, wet: 0.9 });
    tone({ f: f * 1.5, f2: f * 0.7, dur: 0.09, type: 'sine', vol: 0.04, a: 0.002, when: 0.02, wet: 0.9 });
  },
};

function startAmbient() {
  if (!ctx || ambNodes) return;
  const t = ctx.currentTime;
  const lpf = ctx.createBiquadFilter(); lpf.type = 'lowpass'; lpf.frequency.value = 260; lpf.Q.value = 2;
  const mk = (type, f, v, det = 0) => { const o = ctx.createOscillator(); o.type = type; o.frequency.value = f; o.detune.value = det; const g = ctx.createGain(); g.gain.value = v; o.connect(g); g.connect(lpf); o.start(t); return o; };
  const oscs = [mk('sine', 55, 0.5), mk('triangle', 82.5, 0.25, 7), mk('sawtooth', 110, 0.1, -9), mk('sine', 41.2, 0.45)];
  const lfo = ctx.createOscillator(); lfo.frequency.value = 0.07; const lg = ctx.createGain(); lg.gain.value = 110; lfo.connect(lg); lg.connect(lpf.frequency); lfo.start(t);
  lpf.connect(ambGain);
  const w = ctx.createBufferSource(); w.buffer = noiseBuffer(); w.loop = true;
  const wf = ctx.createBiquadFilter(); wf.type = 'bandpass'; wf.frequency.value = 420; wf.Q.value = 0.8;
  const wg = ctx.createGain(); wg.gain.value = 0.05;
  const wl = ctx.createOscillator(); wl.frequency.value = 0.11; const wlg = ctx.createGain(); wlg.gain.value = 0.035; wl.connect(wlg); wlg.connect(wg.gain); wl.start(t);
  w.connect(wf); wf.connect(wg); wg.connect(ambGain); w.start(t);
  ambGain.gain.cancelScheduledValues(t); ambGain.gain.setValueAtTime(0.0001, t); ambGain.gain.linearRampToValueAtTime(0.16, t + 3);
  ambNodes = { oscs, lpf, lfo };
  const drip = () => {
    dripTimer = setTimeout(drip, 1800 + Math.random() * 4800);
    if (ctx && ctx.state === 'running' && !document.hidden) SOUNDS.drip();
  };
  dripTimer = setTimeout(drip, 1500);
}

function unlock() {
  if (!init()) return;
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  if (!started) { started = true; startAmbient(); }
}
if (typeof window !== 'undefined') {
  const once = () => { unlock(); };
  ['pointerdown', 'touchstart', 'keydown', 'mousedown', 'click'].forEach((ev) => window.addEventListener(ev, once, { capture: true, passive: true }));
  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.hidden) ctx.suspend().catch(() => {}); else if (started) ctx.resume().catch(() => {});
  });
}

export const audio = {
  play(name, opt) {
    try {
      if (!ctx || muted) return;
      if (ctx.state === 'suspended') { ctx.resume().catch(() => {}); }
      const fn = SOUNDS[name];
      if (fn) fn(opt || {});
    } catch (e) { /* audio must never break the game */ }
  },
  setMuted(b) {
    muted = !!b;
    try { localStorage.setItem(KEY, muted ? '1' : '0'); } catch (e) { /* ignore */ }
    if (master && ctx) master.gain.setTargetAtTime(muted ? 0 : VOL, ctx.currentTime, 0.02);
    syncUi();
  },
  get muted() { return muted; },
  set muted(b) { audio.setMuted(b); },
  unlock,
  setBonus(b) {
    bonus = !!b;
    if (ctx && ambNodes) {
      const t = ctx.currentTime;
      ambNodes.lpf.frequency.cancelScheduledValues(t);
      ambNodes.lpf.frequency.setTargetAtTime(bonus ? 520 : 260, t, 0.8);
      ambNodes.oscs.forEach((o, i) => o.frequency.setTargetAtTime([55, 82.5, 110, 41.2][i] * (bonus ? 1.19 : 1), t, 1.2));
    }
  },
  get ready() { return !!ctx && ctx.state === 'running'; },
  get bonus() { return bonus; },
  _stop() { clearTimeout(dripTimer); },
  _sounds: SOUNDS, // test hook: lets the dev harness call a sound without the try/catch
};
export default audio;
