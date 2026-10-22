// Particle engine on one overlay canvas (shards, sparks, coins, smoke, rings). Runs only while particles exist.
const TAU = Math.PI * 2;
const rnd = (a, b) => a + Math.random() * (b - a);
const REDUCE = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

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
  let raf = 0, last = 0;
  const MAX = 900;

  function resize() {
    const r = app.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = Math.max(1, Math.round(r.width)); H = Math.max(1, Math.round(r.height));
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
  }
  resize();

  function add(p) {
    if (REDUCE && Math.random() < .6) return;
    if (document.hidden) return;
    if (parts.length > MAX) parts.shift();
    parts.push(p);
    if (!raf) { last = performance.now(); raf = requestAnimationFrame(tick); }
  }

  function shards(x, y, color, size, n = 8) {
    for (let i = 0; i < n; i++) {
      const a = rnd(0, TAU), sp = rnd(size * 2.2, size * 7);
      const k = rnd(0.12, 0.3) * size;
      const pts = [];
      const m = 3 + (Math.random() * 2 | 0);
      for (let j = 0; j < m; j++) pts.push([Math.cos(j / m * TAU + rnd(-.3, .3)) * k * rnd(.6, 1.2), Math.sin(j / m * TAU + rnd(-.3, .3)) * k * rnd(.6, 1.2)]);
      add({ t: 'shard', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - size * 2.5, g: size * 16, rot: rnd(0, TAU), vr: rnd(-12, 12), life: rnd(.55, 1.0), age: 0, color, pts });
    }
  }
  function sparks(x, y, color, size, n = 10, speed = 6) {
    for (let i = 0; i < n; i++) {
      const a = rnd(0, TAU), sp = rnd(size * 1.5, size * speed);
      add({ t: 'spark', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: size * 5, drag: 1.8, life: rnd(.35, .9), age: 0, color, r: rnd(.03, .08) * size });
    }
  }
  function embers(x, y, w, h, n, size) {
    for (let i = 0; i < n; i++) {
      add({ t: 'spark', x: x + rnd(0, w), y: y + rnd(0, h), vx: rnd(-.5, .5) * size, vy: -rnd(1, 4) * size, g: -size * .5, drag: .5, life: rnd(.8, 1.8), age: 0, color: Math.random() < .5 ? '#ffb347' : '#ff6a2a', r: rnd(.02, .06) * size });
    }
  }
  function coins(x, y, size, n = 30, spread = 1, angle = -Math.PI / 2, power = 1) {
    for (let i = 0; i < n; i++) {
      const a = angle + rnd(-1, 1) * spread, sp = rnd(size * 1.0, size * 2.1) * power;
      add({ t: 'coin', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: size * 2.4, rot: rnd(0, TAU), vr: rnd(5, 12), life: rnd(1.4, 2.4), age: 0, r: rnd(.022, .036) * size });
    }
  }
  function coinRain(n, size) {
    for (let i = 0; i < n; i++) {
      add({ t: 'coin', x: rnd(0, W), y: -rnd(10, H * .5), vx: rnd(-30, 30), vy: rnd(100, 260), g: size * .5, rot: rnd(0, TAU), vr: rnd(5, 12), life: rnd(2, 3.5), age: 0, r: rnd(.02, .033) * size });
    }
  }
  function smoke(x, y, size, n = 6, color = '60,50,44') {
    for (let i = 0; i < n; i++) {
      const a = rnd(0, TAU), sp = rnd(0, size * 1.8);
      add({ t: 'smoke', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - size * .6, drag: 1.2, life: rnd(.8, 1.5), age: 0, r: rnd(.4, .8) * size, color });
    }
  }
  function ring(x, y, r1, color = '255,220,140', life = .6, lw = 6) {
    add({ t: 'ring', x, y, r: r1 * .1, r1, life, age: 0, color, lw });
  }
  function glow(x, y, r, color = '255,200,100', life = .35) {
    add({ t: 'glow', x, y, r, life, age: 0, color });
  }

  function tick(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'source-over';
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.age += dt;
      if (p.age >= p.life) { parts.splice(i, 1); continue; }
      const k = p.age / p.life;
      if (p.t === 'ring') {
        const e = 1 - Math.pow(1 - k, 3);
        ctx.strokeStyle = `rgba(${p.color},${(1 - k) * .9})`; ctx.lineWidth = p.lw * (1 - k) + 1;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r + (p.r1 - p.r) * e, 0, TAU); ctx.stroke();
        continue;
      }
      if (p.t === 'glow') {
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
        g.addColorStop(0, `rgba(${p.color},${(1 - k) * .9})`); g.addColorStop(1, `rgba(${p.color},0)`);
        ctx.fillStyle = g; ctx.fillRect(p.x - p.r, p.y - p.r, p.r * 2, p.r * 2);
        continue;
      }
      if (p.drag) { const d = Math.exp(-p.drag * dt); p.vx *= d; p.vy *= d; }
      p.vy += (p.g || 0) * dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.t === 'smoke') {
        const rr = p.r * (0.6 + k);
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, rr);
        g.addColorStop(0, `rgba(${p.color},${(1 - k) * .55})`); g.addColorStop(1, `rgba(${p.color},0)`);
        ctx.fillStyle = g; ctx.fillRect(p.x - rr, p.y - rr, rr * 2, rr * 2);
      } else if (p.t === 'spark') {
        const a = 1 - k;
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = p.color; ctx.globalAlpha = a;
        ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(.6, p.r * (1 - k * .5)), 0, TAU); ctx.fill();
        ctx.globalAlpha = a * .35; ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(1, p.r * 3), 0, TAU); ctx.fill();
        ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      } else if (p.t === 'shard') {
        p.rot += p.vr * dt;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.globalAlpha = Math.min(1, (1 - k) * 1.6);
        ctx.fillStyle = p.color; ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 1;
        ctx.beginPath(); p.pts.forEach((q, j) => (j ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]))); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.restore(); ctx.globalAlpha = 1;
      } else if (p.t === 'coin') {
        p.rot += p.vr * dt;
        const sx = Math.abs(Math.cos(p.rot));
        ctx.save(); ctx.translate(p.x, p.y);
        ctx.globalAlpha = Math.min(1, (1 - k) * 3);
        const r = p.r;
        const g = ctx.createLinearGradient(-r, -r, r, r);
        g.addColorStop(0, '#fff6b8'); g.addColorStop(.5, '#ffc928'); g.addColorStop(1, '#a86a00');
        ctx.fillStyle = g; ctx.strokeStyle = '#6d4300'; ctx.lineWidth = Math.max(1, r * .18);
        ctx.beginPath(); ctx.ellipse(0, 0, Math.max(.6, r * sx), r, 0, 0, TAU); ctx.fill(); ctx.stroke();
        if (sx > .35) { ctx.strokeStyle = 'rgba(120,70,0,.7)'; ctx.lineWidth = Math.max(1, r * .1); ctx.beginPath(); ctx.ellipse(0, 0, Math.max(.4, r * sx * .62), r * .62, 0, 0, TAU); ctx.stroke(); }
        ctx.restore(); ctx.globalAlpha = 1;
      }
    }
    if (parts.length) raf = requestAnimationFrame(tick);
    else { raf = 0; ctx.clearRect(0, 0, W, H); }
  }

  return { resize, shards, sparks, embers, coins, coinRain, smoke, ring, glow, clear() { parts.length = 0; }, get count() { return parts.length; } };
}
