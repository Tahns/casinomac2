// Cartoon particle engine on one overlay canvas: dust puffs, 4-point stars, flat coins, comic burst rings.
// Same API as before (shards/sparks/embers/coins/coinRain/smoke/ring/glow/clear) so index.js keeps working;
// shapes are flat colour with a thick dark outline and move in ~12 fps steps (limited animation). Counts are capped.
const TAU = Math.PI * 2;
const INK = '#2B1A12', PAPER = '#F4E8C8';
const rnd = (a, b) => a + Math.random() * (b - a);
const REDUCE = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
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
  let raf = 0, last = 0, ema = 16, lite = false; // lite: drop half the particles when frames are slow
  const MAX = 240;

  function resize() {
    const r = app.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = Math.max(1, Math.round(r.width)); H = Math.max(1, Math.round(r.height));
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
  }
  resize();

  function add(p) {
    if ((REDUCE && Math.random() < .6) || (lite && Math.random() < .5)) return;
    if (document.hidden) return;
    if (parts.length >= MAX) parts.shift();
    parts.push(p);
    if (!raf) { last = performance.now(); raf = requestAnimationFrame(tick); }
  }

  // dust puff clouds replace shards: the symbol "puffs away"
  function shards(x, y, color, size, n = 8) {
    const m = Math.min(5, 2 + Math.round(n / 4));
    for (let i = 0; i < m; i++) {
      const a = rnd(0, TAU), sp = rnd(size * .6, size * 2);
      add({ t: 'puff', x: x + Math.cos(a) * size * .25, y: y + Math.sin(a) * size * .25, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - size * .5, drag: 2.2, life: rnd(.45, .75), age: 0, r: rnd(.18, .3) * size, color: i % 2 ? PAPER : '#E6D3A8' });
    }
    for (let i = 0; i < Math.min(3, 1 + (n >> 2)); i++) {
      const a = rnd(0, TAU), sp = rnd(size * 2, size * 4.5);
      add({ t: 'star', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - size * 1.2, g: size * 7, drag: 1.2, rot: rnd(0, TAU), vr: rnd(-6, 6), life: rnd(.45, .8), age: 0, color, r: rnd(.12, .2) * size });
    }
  }
  function sparks(x, y, color, size, n = 10, speed = 6) {
    const m = Math.min(5, Math.ceil(n / 2));
    for (let i = 0; i < m; i++) {
      const a = rnd(0, TAU), sp = rnd(size * 1.5, size * speed);
      add({ t: 'star', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: size * 4, drag: 1.8, rot: rnd(0, TAU), vr: rnd(-5, 5), life: rnd(.35, .7), age: 0, color, r: rnd(.12, .2) * size + 3 });
    }
  }
  function embers(x, y, w, h, n, size) {
    const m = Math.min(18, n >> 1);
    for (let i = 0; i < m; i++) {
      add({ t: 'diamond', x: x + rnd(0, w), y: y + rnd(0, h), vx: rnd(-.5, .5) * size, vy: -rnd(1, 3.5) * size, g: -size * .3, drag: .5, life: rnd(.8, 1.6), age: 0, color: Math.random() < .5 ? '#E8A92B' : '#D9622B', r: rnd(.03, .06) * size + 2 });
    }
  }
  function coins(x, y, size, n = 30, spread = 1, angle = -Math.PI / 2, power = 1) {
    const m = Math.min(n, 14);
    for (let i = 0; i < m; i++) {
      const a = angle + rnd(-1, 1) * spread, sp = rnd(size * 1.0, size * 2.1) * power;
      add({ t: 'coin', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: size * 2.4, rot: rnd(0, TAU), vr: rnd(5, 12), life: rnd(1.3, 2.2), age: 0, r: rnd(.026, .04) * size + 3 });
    }
  }
  function coinRain(n, size) {
    const m = Math.min(n, 24);
    for (let i = 0; i < m; i++) {
      add({ t: 'coin', x: rnd(0, W), y: -rnd(10, H * .5), vx: rnd(-30, 30), vy: rnd(100, 260), g: size * .5, rot: rnd(0, TAU), vr: rnd(5, 12), life: rnd(2, 3.2), age: 0, r: rnd(.024, .036) * size + 3 });
    }
  }
  function smoke(x, y, size, n = 6) {
    const m = Math.min(n, 6);
    for (let i = 0; i < m; i++) {
      const a = rnd(0, TAU), sp = rnd(0, size * 1.4);
      add({ t: 'puff', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - size * .5, drag: 1.4, life: rnd(.7, 1.2), age: 0, r: rnd(.3, .55) * size, color: i % 2 ? '#CDB48C' : '#E6D3A8' });
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

  function tick(now) {
    const raw = now - last; ema = ema * .92 + Math.min(raw, 200) * .08; lite = ema > 42;
    const dt = Math.min(0.05, raw / 1000); last = now;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
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
      } else if (p.t === 'coin') {
        const sx = Math.max(.12, Math.abs(Math.cos(Math.floor(p.rot * 1.2) / 1.2))); // stepped spin
        const r = p.r;
        ctx.fillStyle = '#F2B52E'; ctx.strokeStyle = INK; ctx.lineWidth = Math.max(2, r * .26);
        ctx.beginPath(); ctx.ellipse(0, 0, Math.max(1, r * sx), r, 0, 0, TAU); ctx.stroke(); ctx.fill();
        if (sx > .4) { ctx.strokeStyle = '#B87A14'; ctx.lineWidth = Math.max(1.2, r * .16); ctx.beginPath(); ctx.ellipse(0, 0, Math.max(.6, r * sx * .6), r * .6, 0, 0, TAU); ctx.stroke(); ctx.strokeStyle = '#fff'; ctx.lineWidth = Math.max(1.2, r * .16); ctx.beginPath(); ctx.moveTo(-r * sx * .5, -r * .55); ctx.lineTo(-r * sx * .15, -r * .8); ctx.stroke(); }
      }
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    if (parts.length) raf = requestAnimationFrame(tick);
    else { raf = 0; ctx.clearRect(0, 0, W, H); }
  }

  return { resize, shards, sparks, embers, coins, coinRain, smoke, ring, glow, clear() { parts.length = 0; }, get count() { return parts.length; } };
}
