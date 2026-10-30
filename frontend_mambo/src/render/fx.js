// AGENT MAMBO cartoon particle engine on one overlay canvas (cut-paper look: flat colour, thick ink outline, ~12 fps steps).
// Original API kept (shards/sparks/embers/coins/coinRain/smoke/ring/glow/clear/count/resize).
// Added: stars, burstBubble (comic POW!/BAM!/BOOM! bubble), confetti, breakCell (paper-piece break of a removed cell),
// pieces, dust, iris (iris wipe, resolves when done; a 'close' holds until iris('open') or clear()), shake.
// All counts are capped (FX_CAPS: live particles, per-call counts; every helper clamps its own n).
// v2 (WP5): caps live in FX_CAPS; the quality governor (quality.js) is fed every frame of the loop and thins the particles on a slow
// device (EMA > 24 ms: half, > 40 ms: Calm); the motion store (motion.js) is read live (Still: no particle, no shake; the
// per-call counts for Calm are scaled by the caller through motion.count). The per-cell break flash is cream, <= 0.5, and only
// drawn when screen flashes are on. The canvas backing store is capped (FX_CAPS.canvasBytes) whatever the device pixel ratio.
import { t } from '../i18n/index.js';
import { motion } from './motion.js';
import { quality } from './quality.js';
const TAU = Math.PI * 2;
const INK = '#14102B', PAPER = '#FBF1D9';
export const FX_COLORS = { ink: INK, cream: PAPER, teal: '#1FB5A3', coral: '#F0472F', flamingo: '#F5799F', lemon: '#FFD23F', lilac: '#9A7BD0', lime: '#A5D63B', steel: '#6FA7D9', indigo: '#2B2A6B' };
const STAR_COLS = [FX_COLORS.lemon, PAPER, FX_COLORS.flamingo, FX_COLORS.teal, FX_COLORS.lilac];
const CONF_COLS = [FX_COLORS.lemon, FX_COLORS.coral, FX_COLORS.teal, FX_COLORS.flamingo, PAPER, FX_COLORS.lilac, FX_COLORS.lime];
const DISP = "'Arial Black','Futura','Century Gothic',Impact,sans-serif";
const safeT = (key, dflt) => { try { const v = t(key); return v && v !== key ? v : dflt; } catch (e) { return dflt; } };
const rnd = (a, b) => a + Math.random() * (b - a);
export const FX_CAPS = Object.freeze({
  live: 200,                 // particles alive at once (oldest dropped first)
  liveLite: 110,             // same on a slow device (quality tier lite / calm)
  shards: 5, sparks: 5, stars: 12, confetti: 30, confettiMaxWin: 60, dust: 5, pieces: 6, embers: 18, coins: 14, coinRain: 24, smoke: 6,
  breakFlashPeak: 0.5,       // the per-cell break flash (cream)
  canvasBytes: 24 * 1048576, // backing store of the overlay canvas (W * H * dpr^2 * 4); dpr is lowered to stay under it
  maxDpr: 2,
  fps: 12,                   // the canvas is redrawn on the limited-animation grid only (physics still integrates real time)
});
/** Pure: the device pixel ratio to use for a W x H css px canvas under the byte cap. */
export function cappedDpr(W, H, dpr, capBytes = FX_CAPS.canvasBytes, maxDpr = FX_CAPS.maxDpr) {
  const d = Math.max(1, Math.min(Number(dpr) || 1, maxDpr));
  const px = Math.max(1, W) * Math.max(1, H) * 4;
  return Math.max(0.5, Math.min(d, Math.sqrt(capBytes / px)));
}
const still = () => { try { return motion.level === 'still'; } catch (e) { return false; } };
const STEP = 1 / 12; // limited-animation frame length
const q = (t) => Math.floor(t / STEP) * STEP;

export function createFx(app) {
  let canvas = app.querySelector('#fx');
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.id = 'fx';
    app.appendChild(canvas);
  }
  const ctx = canvas.getContext('2d');
  let W = 0, H = 0, dpr = 1;
  const parts = [];
  let raf = 0, last = 0, lastStep = -1, acc = 0;
  const FRAME_MS = 1000 / FX_CAPS.fps;
  const DUST = '#E4DAEE';
  let irisP = null, irisTimer = 0;

  function resize() {
    const r = app.getBoundingClientRect();
    W = Math.max(1, Math.round(r.width)); H = Math.max(1, Math.round(r.height));
    dpr = cappedDpr(W, H, window.devicePixelRatio || 1);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
  }
  resize();

  function add(p) {
    if (document.hidden || still()) return;
    quality.keepAlive(3000);
    const g = quality.particles; // 1 | .5 | .4
    if (g < 1 && p.t !== 'flash' && p.t !== 'bubble' && Math.random() > g) return;
    const max = quality.tier === 'full' ? FX_CAPS.live : FX_CAPS.liveLite;
    while (parts.length >= max) parts.shift();
    parts.push(p);
    if (!raf) { last = performance.now(); raf = requestAnimationFrame(tick); }
  }

  // dust puff clouds replace shards: the symbol "puffs away"
  function shards(x, y, color, size, n = 8) {
    const m = Math.min(FX_CAPS.shards, 2 + Math.round(n / 4));
    for (let i = 0; i < m; i++) {
      const a = rnd(0, TAU), sp = rnd(size * .6, size * 2);
      add({ t: 'puff', x: x + Math.cos(a) * size * .25, y: y + Math.sin(a) * size * .25, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - size * .5, drag: 2.2, life: rnd(.45, .75), age: 0, r: rnd(.18, .3) * size, color: i % 2 ? PAPER : DUST });
    }
    for (let i = 0; i < Math.min(3, 1 + (n >> 2)); i++) {
      const a = rnd(0, TAU), sp = rnd(size * 2, size * 4.5);
      add({ t: 'star', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - size * 1.2, g: size * 7, drag: 1.2, rot: rnd(0, TAU), vr: rnd(-6, 6), life: rnd(.45, .8), age: 0, color, r: rnd(.12, .2) * size });
    }
  }
  function sparks(x, y, color, size, n = 10, speed = 6) {
    const m = Math.min(FX_CAPS.sparks, Math.ceil(n / 2));
    for (let i = 0; i < m; i++) {
      const a = rnd(0, TAU), sp = rnd(size * 1.5, size * speed);
      add({ t: 'star', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: size * 4, drag: 1.8, rot: rnd(0, TAU), vr: rnd(-5, 5), life: rnd(.35, .7), age: 0, color: color || STAR_COLS[i % STAR_COLS.length], r: rnd(.12, .2) * size + 3 });
    }
  }
  // new-palette stars: no colour needed, cycles lemon/cream/flamingo/teal/lilac (pass opts.colors to override)
  function stars(x, y, size, n = 8, opts = {}) {
    const cols = opts.colors || STAR_COLS, m = Math.min(FX_CAPS.stars, n), speed = opts.speed || 5;
    for (let i = 0; i < m; i++) {
      const a = rnd(0, TAU), sp = rnd(size * 1.5, size * speed);
      add({ t: 'star', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: size * 3, drag: 1.8, rot: rnd(0, TAU), vr: rnd(-5, 5), life: rnd(.4, .8), age: 0, color: cols[i % cols.length], r: rnd(.12, .22) * size + 3 });
    }
  }
  // comic burst bubble: spiky cream starburst with ink outline and a coral word that pops in (steps) and floats up a little
  function burstBubble(x, y, size, word, opts = {}) {
    const txt = word != null ? word : safeT(['fx.pow', 'fx.boom', 'fx.wow'][Math.floor(Math.random() * 3)], 'POW!');
    add({ t: 'bubble', x, y, r: size, text: txt, rot: opts.rot != null ? opts.rot : rnd(-.25, .25), life: opts.life || .75, age: 0, fill: opts.fill || PAPER, ink: opts.color || FX_COLORS.coral, spikes: 11 + Math.floor(rnd(0, 4)) });
  }
  // confetti: little flat paper rectangles that flutter (stepped x-scale) down with the new palette
  function confetti(x, y, size, n = 24, opts = {}) {
    const m = Math.min(opts.maxWin ? FX_CAPS.confettiMaxWin : FX_CAPS.confetti, n), cols = opts.colors || CONF_COLS, spread = opts.spread == null ? Math.PI : opts.spread, ang = opts.angle == null ? -Math.PI / 2 : opts.angle;
    for (let i = 0; i < m; i++) {
      const a = ang + rnd(-1, 1) * spread * .5, sp = rnd(size * .8, size * 3.2) * (opts.power || 1);
      add({ t: 'conf', x: opts.w ? x + rnd(0, opts.w) : x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: size * 2.2, drag: .9, rot: rnd(0, TAU), vr: rnd(-7, 7), fl: rnd(0, TAU), life: rnd(1.3, 2.3), age: 0, color: cols[i % cols.length], r: rnd(.03, .055) * size + 3 });
    }
  }
  // dust cloud (e.g. on the removed, now empty cell): big lingering puffs that rise a little
  function dust(x, y, size, n = 3) {
    const m = Math.min(FX_CAPS.dust, n);
    for (let i = 0; i < m; i++) {
      const a = rnd(0, TAU), sp = rnd(size * .15, size * .7);
      add({ t: 'puff', x: x + Math.cos(a) * size * .15, y: y + Math.sin(a) * size * .15, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - size * .25, drag: 1.6, life: rnd(.8, 1.2), age: 0, r: rnd(.28, .42) * size, color: i % 2 ? PAPER : DUST });
    }
  }
  // paper pieces: irregular cut-paper chunks (face colour on one side, cream back on the other) that tumble out and fall
  function pieces(x, y, color, size, n = 3) {
    const m = Math.min(FX_CAPS.pieces, n);
    for (let i = 0; i < m; i++) {
      const base = (i / m) * TAU + rnd(-.5, .5), sp = rnd(size * 2.2, size * 4.2);
      const k = 3 + (i % 2), pts = [];
      for (let j = 0; j < k; j++) { const a = (j / k) * TAU + rnd(-.35, .35), rr = rnd(.7, 1.15); pts.push([Math.cos(a) * rr, Math.sin(a) * rr]); }
      add({ t: 'piece', x, y, vx: Math.cos(base) * sp, vy: Math.sin(base) * sp - size * 1.6, g: size * 7, drag: .6, rot: rnd(0, TAU), vr: rnd(-9, 9), fl: rnd(0, TAU), life: rnd(.75, 1.15), age: 0, r: rnd(.2, .3) * size + 3, pts, color, back: PAPER });
    }
  }
  // breakCell(x, y, size, color, opts): the whole "removed cell" effect for the wire blast: 80 ms cream flash, comic bubble,
  // 3 paper pieces in the symbol colour, dust on the now empty cell. opts: {word, bubble:false, dust:false, pieces:n}
  function breakCell(x, y, size, color = FX_COLORS.flamingo, opts = {}) {
    // parts are drawn newest-first (underneath), so the order here is top-to-bottom: flash, bubble, pieces, stars, dust
    let flashes = false; try { flashes = motion.flashMode === 'flash'; } catch (e) { flashes = false; }
    if (flashes && opts.flash !== false) add({ t: 'flash', x, y, r: size * .48, life: .08, age: 0 });
    if (opts.bubble !== false) burstBubble(x, y - size * .05, size * .46, opts.word);
    pieces(x, y, color, size * .8, opts.pieces || 3);
    stars(x, y, size * .4, 3);
    if (opts.dust !== false) dust(x, y, size, 2);
  }
  // iris wipe: a flat colour covers the screen except a circle. dir 'close' shrinks the hole (holds closed until 'open'/clear),
  // 'open' grows it. Returns a promise resolved when the wipe finished. x,y default to the centre.
  function iris(x, y, o = {}) {
    const dir = o.dir === 'open' ? 'open' : 'close', ms = Math.max(120, o.ms || 700);
    const cx = x == null ? W / 2 : x, cy = y == null ? H / 2 : y;
    clearTimeout(irisTimer);
    irisP = { x: cx, y: cy, dir, life: ms / 1000, age: 0, color: o.color || INK, R: Math.max(Math.hypot(cx, cy), Math.hypot(W - cx, cy), Math.hypot(cx, H - cy), Math.hypot(W - cx, H - cy)) + 4 };
    if (!raf) { last = performance.now(); raf = requestAnimationFrame(tick); }
    return new Promise((res) => { irisTimer = setTimeout(() => { if (irisP && irisP.dir === 'open') irisP = null; res(); }, ms + 30); });
  }
  // screen shake: shakes #game and the scene (px amplitude scales with the viewport, amp 1 ~ 6 px at 500 px)
  function shake(amp = 1, ms = 250) {
    let gain = 1; try { gain = quality.effective(motion.state).shake; } catch (e) { gain = 1; }
    if (!(gain > 0)) return;
    amp *= gain;
    const els = [app.querySelector('#game'), app.querySelector('#scene')].filter(Boolean);
    const n = 10; const px = Math.min(app.clientWidth || 500, app.clientHeight || 500) * .012 * amp;
    const frames = Array.from({ length: n + 1 }, (_, i) => { const k = 1 - i / n; return { transform: i === n ? 'none' : `translate(${((Math.random() - .5) * 2 * px * k).toFixed(1)}px,${((Math.random() - .5) * 2 * px * k).toFixed(1)}px)` }; });
    els.forEach((e) => { try { e.animate(frames, { duration: ms, easing: 'steps(10,end)' }); } catch (x) { /* ignore */ } });
  }
  function embers(x, y, w, h, n, size) {
    const m = Math.min(FX_CAPS.embers, n >> 1);
    for (let i = 0; i < m; i++) {
      add({ t: 'diamond', x: x + rnd(0, w), y: y + rnd(0, h), vx: rnd(-.5, .5) * size, vy: -rnd(1, 3.5) * size, g: -size * .3, drag: .5, life: rnd(.8, 1.6), age: 0, color: Math.random() < .5 ? FX_COLORS.lemon : FX_COLORS.coral, r: rnd(.03, .06) * size + 2 });
    }
  }
  function coins(x, y, size, n = 30, spread = 1, angle = -Math.PI / 2, power = 1) {
    const m = Math.min(n, FX_CAPS.coins);
    for (let i = 0; i < m; i++) {
      const a = angle + rnd(-1, 1) * spread, sp = rnd(size * 1.0, size * 2.1) * power;
      add({ t: 'coin', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: size * 2.4, rot: rnd(0, TAU), vr: rnd(5, 12), life: rnd(1.3, 2.2), age: 0, r: rnd(.026, .04) * size + 3 });
    }
  }
  function coinRain(n, size) {
    const m = Math.min(n, FX_CAPS.coinRain);
    for (let i = 0; i < m; i++) {
      add({ t: 'coin', x: rnd(0, W), y: -rnd(10, H * .5), vx: rnd(-30, 30), vy: rnd(100, 260), g: size * .5, rot: rnd(0, TAU), vr: rnd(5, 12), life: rnd(2, 3.2), age: 0, r: rnd(.024, .036) * size + 3 });
    }
  }
  function smoke(x, y, size, n = 6) {
    const m = Math.min(n, FX_CAPS.smoke);
    for (let i = 0; i < m; i++) {
      const a = rnd(0, TAU), sp = rnd(0, size * 1.4);
      add({ t: 'puff', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - size * .5, drag: 1.4, life: rnd(.7, 1.2), age: 0, r: rnd(.3, .55) * size, color: i % 2 ? '#CFC3E6' : DUST });
    }
  }
  function ring(x, y, r1, color = '255,220,140', life = .6, lw = 6) {
    add({ t: 'ring', x, y, r: r1 * .1, r1, life: Math.min(life, .8), age: 0, color, lw: Math.min(lw, 8) });
  }
  function glow(x, y, r, color = '255,200,100', life = .35) {
    add({ t: 'burst', x, y, r: r * .8, life: Math.min(life, .6), age: 0, color, rot: rnd(0, TAU) });
  }

  function star4(r) {
    ctx.beginPath();
    ctx.moveTo(0, -r); ctx.lineTo(r * .3, -r * .3); ctx.lineTo(r, 0); ctx.lineTo(r * .3, r * .3);
    ctx.lineTo(0, r); ctx.lineTo(-r * .3, r * .3); ctx.lineTo(-r, 0); ctx.lineTo(-r * .3, -r * .3); ctx.closePath();
  }
  function spiky(r, n, inner) {
    ctx.beginPath();
    for (let i = 0; i < n * 2; i++) { const a = (i / (n * 2)) * TAU, rr = i % 2 ? r * inner : r; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
    ctx.closePath();
  }

  function drawTop(p, k) {
    if (p.t === 'flash') {
        ctx.save(); ctx.translate(p.x, p.y); ctx.globalAlpha = FX_CAPS.breakFlashPeak * (1 - k * .5); ctx.fillStyle = PAPER; ctx.strokeStyle = PAPER;
        ctx.beginPath(); ctx.rect(-p.r, -p.r, p.r * 2, p.r * 2); ctx.fill(); ctx.restore(); return;
      }
    if (p.t === 'bubble') {
        const pop = k < .18 ? .45 + k / .18 * .67 : k < .3 ? 1.12 - (k - .18) / .12 * .12 : 1; // pop in, settle (stepped by q)
        const rr = p.r * pop, yy = p.y - k * p.r * .35;
        ctx.save(); ctx.translate(p.x, yy); ctx.rotate(p.rot); ctx.globalAlpha = k > .8 ? Math.max(0, 1 - (k - .8) / .2) : 1;
        ctx.save(); ctx.translate(rr * .09, rr * .1); spiky(rr, p.spikes, .72); ctx.fillStyle = INK; ctx.fill(); ctx.restore(); // offset shadow
        spiky(rr, p.spikes, .72); ctx.fillStyle = p.fill; ctx.strokeStyle = INK; ctx.lineWidth = Math.max(2, rr * .09); ctx.fill(); ctx.stroke();
        const fs = Math.max(8, rr * (p.text.length > 4 ? .5 : .62)); ctx.font = `900 ${fs}px ${DISP}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.lineWidth = Math.max(2, fs * .2); ctx.strokeStyle = INK; ctx.strokeText(p.text, 0, rr * .04); ctx.fillStyle = p.ink; ctx.fillText(p.text, 0, rr * .04);
        ctx.restore();
    }
  }

  function tick(now) {
    const raw = now - last; if (!quality.monitoring) quality.sample(raw);
    last = now; acc += Math.min(50, Math.max(0, raw));
    // redraw only when the 12 fps grid advances: 5x fewer canvas uploads / recomposites than drawing every frame (the cut-paper
    // look already stepped its progress at 12 fps; positions now step too)
    const stepIdx = Math.floor(now / FRAME_MS);
    if (stepIdx === lastStep) { raf = requestAnimationFrame(tick); return; }
    lastStep = stepIdx;
    const dt = Math.min(0.1, acc / 1000); acc = 0;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    const tops = [];
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.age += dt;
      if (p.age >= p.life) { parts.splice(i, 1); continue; }
      const k = q(p.age) / p.life; // stepped progress
      if (p.t === 'ring') {
        const e = 1 - Math.pow(1 - k, 3), rr = p.r + (p.r1 - p.r) * e;
        ctx.save(); ctx.translate(p.x, p.y); ctx.globalAlpha = 1 - k * k;
        spiky(rr, 14, .86); ctx.strokeStyle = INK; ctx.lineWidth = p.lw + 4; ctx.stroke();
        ctx.strokeStyle = `rgb(${p.color})`; ctx.lineWidth = p.lw; ctx.stroke();
        ctx.restore(); continue;
      }
      if (p.t === 'burst') {
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.globalAlpha = Math.max(0, 1 - k * 1.2);
        const rr = p.r * (.55 + k * .6); spiky(rr, 9, .55);
        ctx.fillStyle = `rgb(${p.color})`; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = Math.max(2, rr * .06); ctx.stroke();
        ctx.restore(); continue;
      }
      if (p.t === 'flash' || p.t === 'bubble') { tops.push([p, k]); continue; } // drawn last, above dust/pieces
      if (p.drag) { const d = Math.exp(-p.drag * dt); p.vx *= d; p.vy *= d; }
      p.vy += (p.g || 0) * dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.rot != null && p.vr) p.rot += p.vr * dt;
      ctx.save(); ctx.translate(p.x, p.y);
      ctx.globalAlpha = Math.min(1, (1 - k) * 2.2);
      if (p.t === 'puff') {
        const rr = p.r * (.55 + k * .9);
        ctx.fillStyle = p.color; ctx.strokeStyle = INK; ctx.lineWidth = Math.max(2, rr * .13);
        const lobes = [[0, 0, 1], [-.6, .25, .62], [.62, .2, .66], [.05, -.55, .55]];
        ctx.beginPath(); lobes.forEach(([lx, ly, ls]) => { ctx.moveTo(lx * rr + rr * ls, ly * rr); ctx.arc(lx * rr, ly * rr, rr * ls, 0, TAU); });
        ctx.stroke(); ctx.fill(); // fill after stroke hides the inner lobe outlines
      } else if (p.t === 'star') {
        ctx.rotate(p.rot); const r = Math.max(2, p.r * (1 - k * .4));
        star4(r); ctx.fillStyle = p.color; ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1.5, r * .22); ctx.stroke(); ctx.fill();
      } else if (p.t === 'diamond') {
        ctx.rotate(p.rot || .6); const r = p.r;
        ctx.beginPath(); ctx.moveTo(0, -r); ctx.lineTo(r * .65, 0); ctx.lineTo(0, r); ctx.lineTo(-r * .65, 0); ctx.closePath();
        ctx.fillStyle = p.color; ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1.5, r * .24); ctx.stroke(); ctx.fill();
      } else if (p.t === 'conf') {
        ctx.rotate(p.rot); const sx = Math.max(.15, Math.abs(Math.cos(Math.floor((p.fl + p.age * 9) * 1.5) / 1.5))), r = p.r;
        ctx.fillStyle = p.color; ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1.2, r * .3);
        ctx.beginPath(); ctx.rect(-r, -r * .5 * sx, r * 2, r * sx); ctx.stroke(); ctx.fill();
      } else if (p.t === 'piece') {
        ctx.rotate(Math.floor(p.rot * 2) / 2); const sx = Math.cos(Math.floor((p.fl + p.age * 8) * 1.5) / 1.5), r = p.r;
        ctx.scale(Math.abs(sx) < .18 ? .18 : sx, 1);
        ctx.beginPath(); p.pts.forEach(([px, py], i) => (i ? ctx.lineTo(px * r, py * r) : ctx.moveTo(px * r, py * r))); ctx.closePath();
        ctx.fillStyle = sx >= 0 ? p.color : p.back; ctx.strokeStyle = INK; ctx.lineWidth = Math.max(2, r * .26); ctx.stroke(); ctx.fill();
      } else if (p.t === 'coin') {
        const sx = Math.max(.12, Math.abs(Math.cos(Math.floor(p.rot * 1.2) / 1.2))); // stepped spin
        const r = p.r;
        ctx.fillStyle = FX_COLORS.lemon; ctx.strokeStyle = INK; ctx.lineWidth = Math.max(2, r * .26);
        ctx.beginPath(); ctx.ellipse(0, 0, Math.max(1, r * sx), r, 0, 0, TAU); ctx.stroke(); ctx.fill();
        if (sx > .4) { ctx.strokeStyle = FX_COLORS.coral; ctx.lineWidth = Math.max(1.2, r * .16); ctx.beginPath(); ctx.ellipse(0, 0, Math.max(.6, r * sx * .6), r * .6, 0, 0, TAU); ctx.stroke(); ctx.strokeStyle = '#fff'; ctx.lineWidth = Math.max(1.2, r * .16); ctx.beginPath(); ctx.moveTo(-r * sx * .5, -r * .55); ctx.lineTo(-r * sx * .15, -r * .8); ctx.stroke(); }
      }
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    for (const [p, k] of tops) drawTop(p, k);
    ctx.globalAlpha = 1;
    if (irisP) {
      irisP.age = Math.min(irisP.life, irisP.age + dt);
      const k = q(irisP.age) / irisP.life, e = irisP.dir === 'close' ? 1 - k : k; // stepped
      const rr = Math.max(0, irisP.R * e * e * (3 - 2 * e));
      ctx.fillStyle = irisP.color; ctx.beginPath(); ctx.rect(0, 0, W, H); if (rr > 0.5) { ctx.moveTo(irisP.x + rr, irisP.y); ctx.arc(irisP.x, irisP.y, rr, 0, TAU, true); }
      ctx.fill('evenodd');
      if (rr > 0.5 && rr < irisP.R * .98) { ctx.strokeStyle = INK; ctx.lineWidth = Math.max(3, Math.min(W, H) * .012); ctx.beginPath(); ctx.arc(irisP.x, irisP.y, rr, 0, TAU); ctx.stroke(); }
      if (irisP.dir === 'open' && irisP.age >= irisP.life) irisP = null;
    }
    if (parts.length || irisP) raf = requestAnimationFrame(tick);
    else { raf = 0; ctx.clearRect(0, 0, W, H); }
  }

  // comic onomatopoeia (i18n keys fx.*) next to win / free-spin banners
  if (typeof MutationObserver !== 'undefined') {
    const KEY = { 'win.big': 'fx.kaching', 'win.mega': 'fx.pow', 'win.super': 'fx.wow', 'win.epic': 'fx.boom', 'win.max': 'fx.boom' };
    const layer = () => app.querySelector('.banner-layer');
    const sync = (banner) => {
      const L = layer(); if (!L || !banner) return;
      let s = L.querySelector('.sfx-pop');
      const key = banner.classList.contains('fs') ? 'fx.boom' : (KEY[banner.dataset.tier] || (banner.classList.contains('win') ? 'fx.kaching' : null));
      if (!key) { if (s) s.remove(); return; }
      let txt = ''; try { txt = t(key); } catch (e) { txt = ''; } if (!txt || txt === key) return;
      if (!s) { s = document.createElement('div'); s.className = 'sfx sfx-pop'; L.appendChild(s); }
      if (s.textContent !== txt) { s.textContent = txt; s.style.animation = 'none'; void s.offsetWidth; s.style.animation = ''; s.className = 'sfx sfx-pop ' + (key === 'fx.pow' ? 'teal' : key === 'fx.boom' ? 'brick' : key === 'fx.wow' ? 'mustard' : ''); }
    };
    const mo = new MutationObserver((recs) => {
      for (const r of recs) {
        if (r.type === 'attributes') { sync(r.target); continue; }
        r.addedNodes.forEach((n) => { if (n.classList && n.classList.contains('banner')) sync(n); });
        r.removedNodes.forEach((n) => { if (n.classList && n.classList.contains('banner')) { const L = layer(); const s = L && L.querySelector('.sfx-pop'); if (s && !L.querySelector('.banner')) s.remove(); } });
      }
    });
    const hook = () => { const L = layer(); if (L) mo.observe(L, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-tier'] }); else setTimeout(hook, 500); };
    hook();
  }

  return { resize, shards, sparks, stars, burstBubble, confetti, breakCell, pieces, dust, iris, shake, embers, coins, coinRain, smoke, ring, glow, clear() { parts.length = 0; irisP = null; clearTimeout(irisTimer); }, get count() { return parts.length; }, get canvasBytes() { return canvas.width * canvas.height * 4; }, caps: FX_CAPS };
}
