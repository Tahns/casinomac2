// 1960s cartoon cavern drawn procedurally with large FLAT shapes: three parallax layers of rounded-polygon rocks
// (warm browns / plums + halftone dots), flat wooden beams with drawn grain, atomic-age sparkles, flat lantern glow.
// No gradients-as-light, no fog, no volumetric rays. Palette comes from CSS variables (free-spin mode swaps them).
const TAU = Math.PI * 2;
const INK = '#2B1A12';

function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

function pal(host) {
  const cs = getComputedStyle(host);
  const g = (n, d) => (cs.getPropertyValue(n) || '').trim() || d;
  return {
    bg: g('--sc-bg', '#3A2230'), rockC: g('--sc-rock-c', '#4B2B3E'), rockB: g('--sc-rock-b', '#5E3347'), rockA: g('--sc-rock-a', '#7A4A33'),
    lite: g('--sc-lite', '#8A5A55'), dot: g('--sc-dot', '#2B1A12'), beamA: g('--sc-beam-a', '#A8642F'), beamB: g('--sc-beam-b', '#7E4624'),
    grain: g('--sc-grain', '#5E3318'), strap: g('--sc-strap', '#1E2F4A'), c1: g('--sc-crys1', '#2E8C8C'), c2: g('--sc-crys2', '#E8A92B'), spark: g('--sc-spark', '#F4E8C8'),
  };
}

function dotPattern(ctx, color, step, r, alpha = 1) {
  const c = document.createElement('canvas'); c.width = c.height = Math.max(4, Math.round(step));
  const x = c.getContext('2d'); x.fillStyle = color; x.globalAlpha = alpha;
  x.beginPath(); x.arc(c.width / 2, c.height / 2, r, 0, TAU); x.fill();
  return ctx.createPattern(c, 'repeat');
}

// rounded polygon: jittered points around an ellipse, joined by quadratic curves through the midpoints
function blobPath(ctx, cx, cy, rx, ry, r, n = 8, jit = .28, rot = 0) {
  const pts = [];
  for (let i = 0; i < n; i++) { const a = rot + (i / n) * TAU, k = 1 + (r() - .5) * 2 * jit; pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]); }
  ctx.beginPath();
  const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  let m0 = mid(pts[n - 1], pts[0]); ctx.moveTo(m0[0], m0[1]);
  for (let i = 0; i < n; i++) { const m = mid(pts[i], pts[(i + 1) % n]); ctx.quadraticCurveTo(pts[i][0], pts[i][1], m[0], m[1]); }
  ctx.closePath();
}

// one rock: flat fill, lighter top cap, halftone shadow on the lower-right, optional misregistered outline
function rock(ctx, x, y, rx, ry, r, p, fill, o = {}) {
  const u = o.u || 1;
  const seed = r() * 1e6;
  const mk = () => blobPath(ctx, x, y, rx, ry, rng(seed), o.n || 8, o.jit == null ? .26 : o.jit);
  mk(); ctx.fillStyle = fill; ctx.fill();
  ctx.save(); mk(); ctx.clip();
  if (o.cap) { ctx.fillStyle = o.cap; ctx.beginPath(); ctx.ellipse(x - rx * .18, y - ry * .55, rx * .75, ry * .55, -.2, 0, TAU); ctx.fill(); }
  if (o.dots) { ctx.fillStyle = o.dots; ctx.beginPath(); ctx.ellipse(x + rx * .35, y + ry * .45, rx * .9, ry * .75, .3, 0, TAU); ctx.fill(); }
  ctx.restore();
  if (o.line) { mk(); ctx.lineWidth = o.line * u; ctx.strokeStyle = INK; ctx.lineJoin = 'round'; ctx.stroke(); }
}

function sparkle(ctx, x, y, s, color, kind) {
  ctx.fillStyle = color; ctx.beginPath();
  if (kind === 0) { // 4-point star
    ctx.moveTo(x, y - s); ctx.quadraticCurveTo(x, y, x + s, y); ctx.quadraticCurveTo(x, y, x, y + s); ctx.quadraticCurveTo(x, y, x - s, y); ctx.quadraticCurveTo(x, y, x, y - s);
  } else if (kind === 1) { // diamond
    ctx.moveTo(x, y - s); ctx.lineTo(x + s * .6, y); ctx.lineTo(x, y + s); ctx.lineTo(x - s * .6, y);
  } else { // boomerang
    ctx.moveTo(x - s, y - s * .3); ctx.quadraticCurveTo(x, y + s * .5, x + s, y - s * .3); ctx.quadraticCurveTo(x + s * .1, y + s * .05, x - s, y - s * .3);
  }
  ctx.closePath(); ctx.fill();
}

function drawFar(c, w, h, p) {
  const ctx = c.getContext('2d'); const r = rng(7); const u = Math.min(w, h) / 600;
  ctx.fillStyle = p.bg; ctx.fillRect(0, 0, w, h);
  const dots = dotPattern(ctx, p.dot, Math.max(5, 7 * u), Math.max(1.1, 1.5 * u), .35);
  // wide flat strata bands
  for (let i = 0; i < 5; i++) {
    const y = (i + .5) / 5 * h; ctx.fillStyle = i % 2 ? p.rockC : p.bg;
    ctx.beginPath(); ctx.moveTo(0, y); for (let x = 0; x <= w; x += w / 8) ctx.lineTo(x, y + (r() - .5) * h * .09); ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath(); ctx.globalAlpha = .55; ctx.fill(); ctx.globalAlpha = 1;
  }
  // big far rocks
  for (let i = 0; i < 11; i++) {
    const x = r() * w, y = r() * h, rx = (.12 + r() * .16) * w, ry = (.1 + r() * .16) * h;
    rock(ctx, x, y, rx, ry, r, p, i % 3 ? p.rockC : p.rockB, { cap: i % 2 ? p.lite : null, dots, n: 7, u });
  }
  // sparse little cracks drawn as thick short strokes
  ctx.strokeStyle = p.dot; ctx.globalAlpha = .35; ctx.lineWidth = 3 * u; ctx.lineCap = 'round';
  for (let i = 0; i < 14; i++) { let x = r() * w, y = r() * h; ctx.beginPath(); ctx.moveTo(x, y); for (let k = 0; k < 3; k++) { x += (r() - .3) * 40 * u; y += (r() - .2) * 34 * u; ctx.lineTo(x, y); } ctx.stroke(); }
  ctx.globalAlpha = 1;
}

// middle layer: mid rocks, crystal clusters and atomic-age sparkles
function drawMidRocks(c, w, h, p) {
  const ctx = c.getContext('2d'); ctx.clearRect(0, 0, w, h);
  const r = rng(99); const u = Math.min(w, h) / 600;
  const dots = dotPattern(ctx, p.dot, Math.max(5, 6 * u), Math.max(1.2, 1.6 * u), .45);
  for (let i = 0; i < 9; i++) {
    const left = i % 2 === 0; const x = left ? w * (.02 + r() * .2) : w * (.78 + r() * .2);
    const y = h * (.08 + r() * .84), rx = w * (.07 + r() * .08), ry = h * (.09 + r() * .1);
    rock(ctx, x, y, rx, ry, r, p, i % 3 === 0 ? p.rockA : p.rockB, { cap: p.lite, dots, line: 2, n: 7, u });
  }
  // crystal clusters (flat, outlined)
  const cluster = (cx, cy, s, col, flip) => {
    for (let i = 0; i < 5; i++) {
      const a = (flip ? -1 : 1) * (-.65 + i * .3 + (r() - .5) * .14) - Math.PI / 2;
      const L = s * (.55 + r() * .6), W2 = s * (.1 + r() * .05);
      const tx = cx + Math.cos(a) * L, ty = cy + Math.sin(a) * L, px = Math.cos(a + Math.PI / 2) * W2, py = Math.sin(a + Math.PI / 2) * W2;
      ctx.beginPath(); ctx.moveTo(cx - px, cy - py); ctx.lineTo(tx - px * .6, ty - py * .6); ctx.lineTo(tx + Math.cos(a) * W2 * 1.2, ty + Math.sin(a) * W2 * 1.2); ctx.lineTo(tx + px * .6, ty + py * .6); ctx.lineTo(cx + px, cy + py); ctx.closePath();
      ctx.fillStyle = col; ctx.fill(); ctx.lineWidth = 2.5 * u; ctx.strokeStyle = INK; ctx.lineJoin = 'round'; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx + px * .1, cy + py * .1); ctx.lineTo(tx + Math.cos(a) * W2 * 1.2, ty + Math.sin(a) * W2 * 1.2); ctx.lineTo(tx + px * .6, ty + py * .6); ctx.lineTo(cx + px, cy + py); ctx.closePath(); ctx.fillStyle = dots; ctx.fill();
    }
  };
  const S = Math.min(w, h);
  cluster(w * .05, h * .99, S * .22, p.c1, false); cluster(w * .95, h * .99, S * .26, p.c2, true);
  cluster(w * .12, h * 1.0, S * .13, p.c2, false); cluster(w * .88, h * 1.0, S * .12, p.c1, true);
  // atomic-age sparkles, boomerangs and diamonds (kept to the sides; the board covers the middle)
  for (let i = 0; i < 34; i++) {
    const left = r() < .5; const x = left ? w * r() * .3 : w * (.7 + r() * .3), y = h * r();
    sparkle(ctx, x, y, (5 + r() * 9) * u * 1.4, i % 3 === 0 ? p.c2 : i % 3 === 1 ? p.spark : p.c1, i % 3);
  }
}

// foreground: side rock masses, stalactites, rubble; flat shapes with thick outline
function drawFore(c, w, h, p) {
  const ctx = c.getContext('2d'); ctx.clearRect(0, 0, w, h);
  const r = rng(5); const u = Math.min(w, h) / 600;
  const dots = dotPattern(ctx, p.dot, Math.max(5, 6 * u), Math.max(1.2, 1.6 * u), .5);
  // stalactites: rounded teeth across the ceiling
  const nS = Math.max(5, Math.round(w / 110));
  for (let i = 0; i < nS; i++) {
    const x = (i + .15 + r() * .7) * (w / nS), bw = (36 + r() * 60) * u * 1.4, len = (h * .04 + r() * h * .1) * (1 - Math.abs(x / w - .5) * .5);
    ctx.beginPath(); ctx.moveTo(x - bw / 2, -4); ctx.quadraticCurveTo(x - bw * .3, len * .7, x, len); ctx.quadraticCurveTo(x + bw * .3, len * .7, x + bw / 2, -4); ctx.closePath();
    ctx.fillStyle = i % 2 ? p.rockB : p.rockC; ctx.fill(); ctx.lineWidth = 3 * u; ctx.strokeStyle = INK; ctx.lineJoin = 'round'; ctx.stroke();
    ctx.save(); ctx.clip(); ctx.fillStyle = dots; ctx.fillRect(x, 0, bw, len); ctx.restore();
  }
  // side masses
  const side = (left) => {
    const sx = left ? 0 : w; const base = w * .05; const pts = [];
    for (let y = -h * .05; y <= h * 1.05; y += h / 7) pts.push([left ? base * (.7 + r() * 1.2) : w - base * (.7 + r() * 1.2), y]);
    ctx.beginPath(); ctx.moveTo(sx, -10);
    pts.forEach((q, i) => { const n = pts[i + 1] || [sx, h + 10]; ctx.quadraticCurveTo(q[0], q[1], (q[0] + n[0]) / 2, (q[1] + n[1]) / 2); });
    ctx.lineTo(sx, h + 10); ctx.closePath();
    ctx.fillStyle = p.rockA; ctx.fill(); ctx.lineWidth = 4 * u; ctx.strokeStyle = INK; ctx.lineJoin = 'round'; ctx.stroke();
    ctx.save(); ctx.clip(); ctx.fillStyle = dots; ctx.fillRect(left ? 0 : w * .93, 0, w * .07, h); ctx.restore();
  };
  side(true); side(false);
  // rubble along the bottom + nuggets
  ctx.beginPath(); ctx.moveTo(0, h + 5);
  for (let x = 0; x <= w + 30; x += 30 * u * 1.6) ctx.quadraticCurveTo(x, h - (6 + r() * h * .035) * (1 + Math.abs(x / w - .5)), x + 15 * u * 1.6, h - 2);
  ctx.lineTo(w, h + 5); ctx.closePath(); ctx.fillStyle = p.rockC; ctx.fill(); ctx.lineWidth = 3 * u; ctx.strokeStyle = INK; ctx.stroke();
  for (let i = 0; i < 12; i++) {
    const x = r() * w, y = h - r() * h * .02 - 4 * u, s = (4 + r() * 5) * u * 1.3;
    ctx.beginPath(); ctx.ellipse(x, y, s * 1.3, s, 0, 0, TAU); ctx.fillStyle = '#E8A92B'; ctx.fill(); ctx.lineWidth = 2 * u; ctx.strokeStyle = INK; ctx.stroke();
  }
}

function grainLines(ctx, x, y, w, h, vertical, r, p, u) {
  ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  ctx.strokeStyle = p.grain; ctx.lineWidth = 2 * u; ctx.lineCap = 'round';
  const n = Math.max(2, Math.round((vertical ? w : h) / (9 * u)));
  for (let i = 1; i < n; i++) {
    const t = i / n;
    ctx.beginPath();
    if (vertical) { const gx = x + t * w; ctx.moveTo(gx, y); for (let s = 0; s <= h; s += 36 * u) ctx.lineTo(gx + Math.sin(s * .05 + i * 2) * 2.2 * u, y + s); }
    else { const gy = y + t * h; ctx.moveTo(x, gy); for (let s = 0; s <= w; s += 36 * u) ctx.lineTo(x + s, gy + Math.sin(s * .05 + i * 2) * 2.2 * u); }
    ctx.globalAlpha = .55 + r() * .4; ctx.stroke();
  }
  ctx.globalAlpha = 1; ctx.restore();
}
function plank(ctx, x, y, w, h, vertical, r, p, u) {
  ctx.fillStyle = p.beamA; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = p.beamB; if (vertical) ctx.fillRect(x + w * .62, y, w * .38, h); else ctx.fillRect(x, y + h * .62, w, h * .38);
  grainLines(ctx, x, y, w, h, vertical, r, p, u);
  for (let i = 0; i < 2; i++) { const kx = vertical ? x + w * (.3 + r() * .4) : x + w * (.1 + r() * .8), ky = vertical ? y + h * (.1 + r() * .8) : y + h * (.3 + r() * .4); ctx.beginPath(); ctx.ellipse(kx, ky, 5 * u * 1.2, 7 * u * 1.2, 0, 0, TAU); ctx.strokeStyle = INK; ctx.lineWidth = 2.2 * u; ctx.stroke(); ctx.beginPath(); ctx.ellipse(kx, ky, 2 * u * 1.2, 3 * u * 1.2, 0, 0, TAU); ctx.stroke(); }
  ctx.strokeStyle = '#F4E8C8'; ctx.globalAlpha = .6; ctx.lineWidth = 2.4 * u; ctx.lineCap = 'round'; ctx.beginPath();
  if (vertical) { ctx.moveTo(x + w * .16, y + h * .04); ctx.lineTo(x + w * .16, y + h * .5); } else { ctx.moveTo(x + w * .04, y + h * .22); ctx.lineTo(x + w * .45, y + h * .22); }
  ctx.stroke(); ctx.globalAlpha = 1;
  ctx.lineWidth = 4 * u; ctx.strokeStyle = INK; ctx.lineJoin = 'round'; ctx.strokeRect(x, y, w, h);
}
function strap(ctx, x, y, w, h, p, u) {
  ctx.fillStyle = p.strap; ctx.fillRect(x, y, w, h); ctx.lineWidth = 3 * u; ctx.strokeStyle = INK; ctx.strokeRect(x, y, w, h);
  ctx.fillStyle = '#F4E8C8';
  [[.25, .5], [.75, .5]].forEach(([a, b]) => { ctx.beginPath(); ctx.arc(x + w * a, y + h * b, Math.max(1.5, Math.min(w, h) * .13), 0, TAU); ctx.fill(); });
}
function drawTimber(c, w, h, p) {
  const ctx = c.getContext('2d'); ctx.clearRect(0, 0, w, h);
  const r = rng(13); const s = Math.min(w, h); const u = s / 600;
  const post = Math.max(12, s * .045), beam = Math.max(14, s * .06);
  plank(ctx, 0, 0, post, h, true, r, p, u); plank(ctx, w - post, 0, post, h, true, r, p, u);
  const bl = s * .16;
  [[post, beam, 1], [w - post, beam, -1]].forEach(([x0, y0, dir]) => {
    ctx.beginPath(); ctx.moveTo(x0, y0 + bl); ctx.lineTo(x0 + dir * bl, y0); ctx.lineTo(x0 + dir * (bl + post * .9), y0); ctx.lineTo(x0, y0 + bl + post * .9); ctx.closePath();
    ctx.fillStyle = p.beamB; ctx.fill(); ctx.lineWidth = 4 * u; ctx.strokeStyle = INK; ctx.lineJoin = 'round'; ctx.stroke();
  });
  plank(ctx, 0, 0, w, beam, false, r, p, u);
  for (const x of [post * 1.2, w - post * 2.2]) strap(ctx, x, 0, post, beam, p, u);
  for (const y of [h * .22, h * .56, h * .86]) { strap(ctx, 0, y, post, post * .6, p, u); strap(ctx, w - post, y, post, post * .6, p, u); }
}

const LANTERN = `<svg viewBox="0 0 60 150" aria-hidden="true">
<g class="arm"><path d="M-70 -4H34V8H-70Z" fill="#A8642F" stroke="#2B1A12" stroke-width="3" stroke-linejoin="round"/><path d="M-50 8L-22 8L-50 32Z" fill="#7E4624" stroke="#2B1A12" stroke-width="3" stroke-linejoin="round"/><path d="M-66 1H20" stroke="#F4E8C8" stroke-width="2.4" stroke-linecap="round" opacity=".6"/></g>
<g class="lglow"><circle cx="30" cy="102" r="70" fill="#E8A92B" opacity=".2"/><circle cx="30" cy="102" r="48" fill="#F7D774" opacity=".25"/></g>
<path d="M30 0V50" stroke="#2B1A12" stroke-width="5"/><path d="M30 0V50" stroke="#C9A45C" stroke-width="1.6" stroke-dasharray="3 3"/>
<path d="M21 66q9-20 18 0" fill="none" stroke="#2B1A12" stroke-width="5" stroke-linecap="round"/><path d="M21 66q9-20 18 0" fill="none" stroke="#2E8C8C" stroke-width="2" stroke-linecap="round"/>
<path d="M13 78L21 62H39L47 78Z" fill="#2E8C8C" stroke="#2B1A12" stroke-width="3" stroke-linejoin="round"/>
<rect x="14" y="78" width="32" height="36" rx="5" fill="#F7D774" stroke="#2B1A12" stroke-width="3"/>
<rect x="33" y="78" width="13" height="36" rx="4" fill="#E8A92B" opacity=".8"/>
<g class="lflame"><path d="M30 110C21 103 25 94 30 86C32 92 40 96 38 103C37 107 34 110 30 110Z" fill="#D9622B" stroke="#2B1A12" stroke-width="2"/><path d="M30 110C27 106 28 102 30 99C32 102 33 106 30 110Z" fill="#F7E7A0"/></g>
<path d="M24 79V113M36 79V113" stroke="#2B1A12" stroke-width="3"/>
<path d="M18 83V106" stroke="#fff" stroke-width="3" stroke-linecap="round"/>
<path d="M11 114H49L45 126H15Z" fill="#2E8C8C" stroke="#2B1A12" stroke-width="3" stroke-linejoin="round"/></svg>`;

export function createScene(app) {
  let host = app.querySelector('#scene');
  if (!host) { host = document.createElement('div'); host.id = 'scene'; app.insertBefore(host, app.firstChild); }
  if (host.dataset.built) return host._scene;
  host.dataset.built = '1';
  host.innerHTML = `
    <div class="lay drift-a" data-k=".35"><canvas data-l="far"></canvas></div>
    <div class="lay veins drift-b" data-k=".6"><canvas data-l="veins"></canvas></div>
    <div class="lay drift-b" data-k="1"><canvas data-l="mid"></canvas></div>
    <canvas class="dustc" style="position:absolute;inset:0;width:100%;height:100%"></canvas>
    <div class="lay2" data-k=".2" style="position:absolute;inset:0"><canvas data-l="timber"></canvas></div>
    <div class="lantern l">${LANTERN}</div><div class="lantern r">${LANTERN}</div>`;
  const cv = (k) => host.querySelector(`canvas[data-l="${k}"]`);
  const fns = { far: drawFar, veins: drawMidRocks, mid: drawFore, timber: drawTimber };
  let lastW = 0, lastH = 0, timer = 0, P = null;
  function draw(force) {
    const rect = host.getBoundingClientRect();
    const W = Math.max(2, Math.round(rect.width)), H = Math.max(2, Math.round(rect.height));
    if (!force && W === lastW && H === lastH) return;
    lastW = W; lastH = H; P = pal(host);
    const sc = Math.min(window.devicePixelRatio || 1, 1.5);
    for (const k of Object.keys(fns)) {
      const c = cv(k);
      const w = Math.round(W * (k === 'timber' ? 1 : 1.08) * sc), h = Math.round(H * (k === 'timber' ? 1 : 1.08) * sc);
      c.width = w; c.height = h;
      try { fns[k](c, w, h, P); } catch (e) { console.error('scene', k, e); }
    }
    sizeDust(W, H);
  }

  // ---- atomic-age twinkles (limited animation: ~7 fps, hard on/off steps) + hot-mode embers (flat diamonds)
  const dust = host.querySelector('.dustc'); const dctx = dust.getContext('2d');
  let DW = 1, DH = 1; const motes = [];
  function sizeDust(W, H) { DW = W; DH = H; dust.width = W; dust.height = H; }
  const r0 = rng(31);
  const reduce = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  for (let i = 0; i < (reduce ? 6 : 16); i++) {
    const left = i % 2 === 0;
    motes.push({ x: left ? r0() * .24 : .76 + r0() * .24, y: .06 + r0() * .86, s: .6 + r0() * .8, ph: r0() * 10, kind: i % 3, ember: false });
  }
  for (let i = 0; i < (reduce ? 0 : 10); i++) motes.push({ x: r0(), y: r0(), s: .5 + r0() * .5, ph: r0() * 10, kind: 1, ember: true });
  let lt = 0, running = true;
  function loop(now) {
    if (!running) return;
    requestAnimationFrame(loop);
    if (document.hidden || now - lt < 140) { if (document.hidden) lt = now; return; }
    const dt = Math.min(.5, (now - lt) / 1000); lt = now;
    dctx.clearRect(0, 0, DW, DH);
    const hot = document.body.classList.contains('fs-mode'); const u = Math.min(DW, DH) / 600;
    const pc = P || pal(host);
    for (const m of motes) {
      if (m.ember) {
        if (!hot) continue;
        m.y -= dt * .12 * (.6 + m.s); m.x += Math.sin(m.ph + now / 900) * .004; if (m.y < -.05) { m.y = 1.05; m.x = Math.random(); }
        sparkle(dctx, m.x * DW, m.y * DH, 4.5 * u * 1.4 * m.s, '#F7D774', 1);
        continue;
      }
      const t = Math.floor((now / 140 + m.ph * 3)) % 9; // on for 2 of 9 steps
      if (t > 1) continue;
      sparkle(dctx, m.x * DW, m.y * DH, (t === 0 ? 7 : 10) * u * 1.5 * m.s, pc.spark, m.kind);
    }
  }
  requestAnimationFrame(loop);

  // ---- parallax
  const lays = [...host.querySelectorAll('.lay,.lay2')];
  let tx = 0, ty = 0, cx = 0, cy = 0, pr = 0;
  function par() {
    cx += (tx - cx) * .08; cy += (ty - cy) * .08;
    for (const l of lays) { const k = Number(l.dataset.k || 0); l.style.transform = `translate3d(${(cx * k * -14).toFixed(2)}px,${(cy * k * -9).toFixed(2)}px,0)`; }
    if (Math.abs(tx - cx) > .002 || Math.abs(ty - cy) > .002) pr = requestAnimationFrame(par); else pr = 0;
  }
  window.addEventListener('pointermove', (e) => { tx = e.clientX / window.innerWidth - .5; ty = e.clientY / window.innerHeight - .5; if (!pr) pr = requestAnimationFrame(par); }, { passive: true });

  let ro = null;
  const onResize = () => { clearTimeout(timer); timer = setTimeout(draw, 120); };
  if (typeof ResizeObserver !== 'undefined') { ro = new ResizeObserver(onResize); ro.observe(host); } else window.addEventListener('resize', onResize);
  // free-spin mode swaps CSS variables -> repaint the flat layers once
  let mo = null, wasHot = document.body.classList.contains('fs-mode');
  if (typeof MutationObserver !== 'undefined') {
    mo = new MutationObserver(() => { const hot = document.body.classList.contains('fs-mode'); if (hot !== wasHot) { wasHot = hot; draw(true); } });
    mo.observe(document.body, { attributes: true, attributeFilter: ['class'] });
  }
  draw(true);

  const api = {
    host,
    redraw() { lastW = 0; draw(true); },
    shakeTargets() { return [host]; },
    destroy() { running = false; if (ro) ro.disconnect(); if (mo) mo.disconnect(); },
  };
  host._scene = api;
  return api;
}
