// Cavern scene drawn procedurally: parallax rock layers, glowing crystal veins, timber, flickering lanterns, drifting dust and embers.
const TAU = Math.PI * 2;

function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function makeNoise(seed) {
  const r = rng(seed), N = 256, g = new Float32Array(N * N);
  for (let i = 0; i < g.length; i++) g[i] = r();
  const sm = (t) => t * t * (3 - 2 * t);
  const at = (i, j) => g[((j & 255) * N) + (i & 255)];
  const n2 = (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y), xf = sm(x - xi), yf = sm(y - yi);
    const a = at(xi, yi), b = at(xi + 1, yi), c = at(xi, yi + 1), d = at(xi + 1, yi + 1);
    return a + (b - a) * xf + (c - a) * yf + (a - b - c + d) * xf * yf;
  };
  return (x, y, o = 4) => { let s = 0, amp = 0.5, f = 1, tot = 0; for (let i = 0; i < o; i++) { s += n2(x * f, y * f) * amp; tot += amp; amp *= .5; f *= 2.03; } return s / tot; };
}

function drawFar(c, w, h) {
  const ctx = c.getContext('2d');
  const noise = makeNoise(7);
  const sw = Math.max(60, Math.round(w / 3)), sh = Math.max(40, Math.round(h / 3));
  const off = document.createElement('canvas'); off.width = sw; off.height = sh;
  const octx = off.getContext('2d'); const img = octx.createImageData(sw, sh); const d = img.data;
  const lamps = [[.17, .06], [.83, .06], [.5, .5]];
  for (let y = 0; y < sh; y++) {
    for (let x = 0; x < sw; x++) {
      const u = x / sw, v = y / sh;
      const n = noise(u * 7, v * 5 * (h / w + .4), 5);
      const rid = 1 - Math.abs(noise(u * 4 + 11, v * 3 + 3, 4) - .5) * 2.2; // ridged strata
      const strata = Math.sin((v * 22 + n * 5) * 1) * .5 + .5;
      let lum = .28 + n * .5 + Math.max(0, rid) * .16 + strata * .05;
      let lit = 0;
      for (const [lx, ly] of lamps) { const dx = (u - lx) * (w / h), dy = v - ly; lit += Math.max(0, 1 - Math.sqrt(dx * dx + dy * dy) * (lx === .5 ? 1.5 : 2.1)) * (lx === .5 ? .35 : .8); }
      lum *= .55 + lit * .9;
      const edge = Math.pow(Math.abs(u - .5) * 2, 3) * .35 + Math.pow(v, 3) * .25;
      lum *= 1 - edge;
      const i = (y * sw + x) * 4;
      d[i] = Math.min(255, 38 * lum * 2.9 + lit * 70);
      d[i + 1] = Math.min(255, 26 * lum * 2.6 + lit * 34);
      d[i + 2] = Math.min(255, 22 * lum * 2.5 + (1 - lit) * 6 + 6);
      d[i + 3] = 255;
    }
  }
  octx.putImageData(img, 0, 0);
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(off, 0, 0, w, h);
  const r = rng(21);
  // rock facets
  for (let i = 0; i < 90; i++) {
    const x = r() * w, y = r() * h, s = (20 + r() * 120) * (w / 1000 + .4);
    ctx.beginPath(); ctx.moveTo(x, y);
    for (let k = 0; k < 3 + (r() * 2 | 0); k++) ctx.lineTo(x + (r() - .5) * s * 2, y + (r() - .5) * s * 1.4);
    ctx.closePath();
    ctx.fillStyle = r() < .55 ? `rgba(0,0,0,${.06 + r() * .18})` : `rgba(255,190,120,${.015 + r() * .035})`;
    ctx.fill();
  }
  // cracks
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (let i = 0; i < 28; i++) {
    let x = r() * w, y = r() * h; ctx.beginPath(); ctx.moveTo(x, y);
    const L = 4 + (r() * 8 | 0), ang0 = r() * TAU;
    for (let k = 0; k < L; k++) { x += Math.cos(ang0 + (r() - .5) * 1.4) * (8 + r() * 26); y += Math.sin(ang0 + (r() - .5) * 1.4) * (8 + r() * 26); ctx.lineTo(x, y); }
    ctx.strokeStyle = 'rgba(0,0,0,.45)'; ctx.lineWidth = 1 + r() * 2; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,200,140,.05)'; ctx.lineWidth = 1; ctx.translate(1, 1); ctx.stroke(); ctx.translate(-1, -1);
  }
}

function drawVeins(c, w, h) {
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, w, h);
  const r = rng(99);
  const pal = [['#47e6d6', '#c9fff7'], ['#d24bff', '#ffd6ff'], ['#ffb347', '#fff3c4'], ['#47e6d6', '#c9fff7']];
  function branch(x, y, ang, len, wd, col, depth) {
    ctx.beginPath(); ctx.moveTo(x, y);
    const pts = [[x, y]];
    for (let k = 0; k < len; k++) {
      ang += (r() - .5) * .9; x += Math.cos(ang) * (6 + r() * 14); y += Math.sin(ang) * (6 + r() * 14);
      ctx.lineTo(x, y); pts.push([x, y]);
      if (depth < 2 && r() < .14) branch(x, y, ang + (r() < .5 ? -1 : 1) * (.5 + r() * .8), Math.floor(len * .55), wd * .6, col, depth + 1);
    }
    ctx.shadowColor = col[0]; ctx.shadowBlur = wd * 7 + 6; ctx.strokeStyle = col[0]; ctx.lineWidth = wd * 1.6; ctx.globalAlpha = .55; ctx.stroke();
    ctx.shadowBlur = 0; ctx.strokeStyle = col[1]; ctx.lineWidth = wd * .55; ctx.globalAlpha = .9; ctx.stroke(); ctx.globalAlpha = 1;
  }
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (let i = 0; i < 9; i++) {
    const side = i % 2 ? 1 : 0;
    const x = side ? w * (.78 + r() * .22) : w * r() * .22;
    branch(x, r() * h * .9, (side ? Math.PI : 0) + (r() - .5) * 1.8, 8 + (r() * 8 | 0), 1.5 + r() * 2.2, pal[i % pal.length], 0);
  }
  // crystal clusters in lower corners
  function cluster(cx, cy, s, col, flip) {
    for (let i = 0; i < 6; i++) {
      const a = (flip ? -1 : 1) * (-.7 + i * .28 + (r() - .5) * .2) - Math.PI / 2;
      const L = s * (.5 + r() * .7), W2 = s * (.1 + r() * .08);
      const tx = cx + Math.cos(a) * L, ty = cy + Math.sin(a) * L;
      const px = Math.cos(a + Math.PI / 2) * W2, py = Math.sin(a + Math.PI / 2) * W2;
      ctx.beginPath(); ctx.moveTo(cx - px, cy - py); ctx.lineTo(tx - px * .5, ty - py * .5); ctx.lineTo(tx + Math.cos(a) * W2 * 1.4, ty + Math.sin(a) * W2 * 1.4); ctx.lineTo(tx + px * .5, ty + py * .5); ctx.lineTo(cx + px, cy + py); ctx.closePath();
      const g = ctx.createLinearGradient(cx, cy, tx, ty); g.addColorStop(0, col[0]); g.addColorStop(1, col[1]);
      ctx.shadowColor = col[0]; ctx.shadowBlur = 18; ctx.globalAlpha = .85; ctx.fillStyle = g; ctx.fill();
      ctx.shadowBlur = 0; ctx.globalAlpha = .9; ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 1; ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
  const u = Math.min(w, h);
  cluster(w * .035, h * .98, u * .22, ['#7a2cff', '#e6b8ff'], false);
  cluster(w * .965, h * .98, u * .26, ['#18b8aa', '#c9fff7'], true);
  cluster(w * .09, h * .99, u * .14, ['#d24bff', '#ffe6ff'], false);
  cluster(w * .91, h * .99, u * .12, ['#47e6d6', '#e6fffb'], true);
}

function drawMid(c, w, h) {
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, w, h);
  const r = rng(5);
  // stalactites
  const nS = Math.round(w / 55);
  for (let i = 0; i < nS; i++) {
    const x = (i + r() * .8) * (w / nS), bw = 24 + r() * 70, len = (h * .03 + r() * h * .13) * (1 - Math.abs(x / w - .5) * .6);
    ctx.beginPath(); ctx.moveTo(x - bw / 2, 0);
    const steps = 4;
    for (let k = 1; k <= steps; k++) ctx.lineTo(x - bw / 2 + (bw / 2) * (k / steps) + (r() - .5) * 6, len * (k / steps) ** 1.4);
    ctx.lineTo(x + (r() - .5) * 4, len);
    for (let k = steps - 1; k >= 0; k--) ctx.lineTo(x + (bw / 2) * (1 - k / steps) + (r() - .5) * 6, len * (k / steps) ** 1.4);
    ctx.lineTo(x + bw / 2, 0); ctx.closePath();
    const g = ctx.createLinearGradient(x, 0, x, len); g.addColorStop(0, '#0c0705'); g.addColorStop(1, '#2a1c13');
    ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = 'rgba(255,170,90,.18)'; ctx.lineWidth = 1.5; ctx.stroke();
  }
  // ceiling band
  const cg = ctx.createLinearGradient(0, 0, 0, h * .09); cg.addColorStop(0, '#080403'); cg.addColorStop(1, 'rgba(8,4,3,0)');
  ctx.fillStyle = cg; ctx.fillRect(0, 0, w, h * .09);
  // side rock masses
  function side(left) {
    ctx.beginPath(); const sx = left ? 0 : w; ctx.moveTo(sx, 0);
    const base = w * .035;
    for (let y = 0; y <= h; y += h / 22) { const jag = base * (.6 + r() * 1.7) * (1 + Math.sin(y / h * 7) * .3); ctx.lineTo(left ? jag : w - jag, y); }
    ctx.lineTo(sx, h); ctx.closePath();
    const g = ctx.createLinearGradient(left ? 0 : w, 0, left ? w * .09 : w * .91, 0);
    g.addColorStop(0, '#050302'); g.addColorStop(1, '#2d1f15');
    ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = 'rgba(255,170,90,.22)'; ctx.lineWidth = 2; ctx.stroke();
  }
  side(true); side(false);
  // bottom rubble
  ctx.beginPath(); ctx.moveTo(0, h);
  for (let x = 0; x <= w; x += 16) ctx.lineTo(x, h - (4 + r() * h * .035) * (1 + Math.abs(x / w - .5) * 1.2));
  ctx.lineTo(w, h); ctx.closePath();
  const bg = ctx.createLinearGradient(0, h * .94, 0, h); bg.addColorStop(0, '#2a1c13'); bg.addColorStop(1, '#060302');
  ctx.fillStyle = bg; ctx.fill();
  // gold glints in rubble
  for (let i = 0; i < 26; i++) {
    const x = r() * w, y = h - r() * h * .03; const s = 1.5 + r() * 3;
    ctx.fillStyle = `rgba(255,${200 + (r() * 40 | 0)},90,${.5 + r() * .5})`;
    ctx.beginPath(); ctx.moveTo(x, y - s); ctx.lineTo(x + s, y); ctx.lineTo(x, y + s * .7); ctx.lineTo(x - s, y); ctx.closePath(); ctx.fill();
  }
}

function drawWood(ctx, x, y, w, h, vertical, r) {
  const g = vertical ? ctx.createLinearGradient(x, 0, x + w, 0) : ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, '#3a2412'); g.addColorStop(.18, '#7a4f2a'); g.addColorStop(.5, '#5a3819'); g.addColorStop(.85, '#3a2412'); g.addColorStop(1, '#1c0f06');
  ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
  ctx.lineWidth = 1;
  const n = Math.round((vertical ? w : h) / 3);
  for (let i = 0; i < n; i++) {
    ctx.strokeStyle = r() < .5 ? 'rgba(0,0,0,.22)' : 'rgba(255,200,130,.08)';
    ctx.beginPath();
    if (vertical) { const gx = x + r() * w; ctx.moveTo(gx, y); for (let t = 0; t <= h; t += 40) ctx.lineTo(gx + Math.sin(t * .02 + i) * 1.5, y + t); }
    else { const gy = y + r() * h; ctx.moveTo(x, gy); for (let t = 0; t <= w; t += 40) ctx.lineTo(x + t, gy + Math.sin(t * .02 + i) * 1.5); }
    ctx.stroke();
  }
  for (let i = 0; i < 3; i++) {
    const kx = vertical ? x + w * (.3 + r() * .4) : x + r() * w, ky = vertical ? y + r() * h : y + h * (.3 + r() * .4);
    ctx.fillStyle = 'rgba(20,10,4,.55)'; ctx.beginPath(); ctx.ellipse(kx, ky, 3 + r() * 4, 5 + r() * 5, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(255,210,150,.28)'; ctx.lineWidth = 1.5;
  ctx.strokeRect(x + .5, y + .5, w - 1, h - 1);
}
function ironBand(ctx, x, y, w, h) {
  const g = ctx.createLinearGradient(x, y, x + w, y + h); g.addColorStop(0, '#5a5f66'); g.addColorStop(.5, '#2b2e33'); g.addColorStop(1, '#16181b');
  ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#9aa0a8';
  [[x + w * .2, y + h / 2], [x + w * .8, y + h / 2]].forEach(([cx, cy]) => { ctx.beginPath(); ctx.arc(cx, cy, Math.min(w, h) * .13 + 1, 0, TAU); ctx.fill(); });
}

function drawTimber(c, w, h) {
  const ctx = c.getContext('2d'); ctx.clearRect(0, 0, w, h);
  const r = rng(13);
  const u = Math.min(w, h);
  const post = Math.max(12, u * .045), beam = Math.max(14, u * .06);
  // posts
  drawWood(ctx, 0, 0, post, h, true, r); drawWood(ctx, w - post, 0, post, h, true, r);
  // top beam
  drawWood(ctx, 0, 0, w, beam, false, r);
  // braces
  const bl = u * .16;
  [[post, beam, 1], [w - post, beam, -1]].forEach(([x0, y0, dir]) => {
    ctx.save(); ctx.translate(x0, y0); ctx.rotate(dir * Math.PI / 4 * -1 + (dir === 1 ? 0 : 0));
    ctx.restore();
    ctx.save(); ctx.beginPath(); ctx.moveTo(x0, y0 + bl); ctx.lineTo(x0 + dir * bl, y0); ctx.lineTo(x0 + dir * (bl + post * .8), y0); ctx.lineTo(x0, y0 + bl + post * .8); ctx.closePath();
    ctx.fillStyle = '#4a2f17'; ctx.fill(); ctx.strokeStyle = 'rgba(255,210,150,.25)'; ctx.stroke(); ctx.restore();
  });
  // iron straps
  for (const x of [post * 1.0 + 0, w - post * 2 - 0]) ironBand(ctx, x, 0, post, beam);
  for (const y of [h * .2, h * .55, h * .85]) { ironBand(ctx, 0, y, post, post * .5); ironBand(ctx, w - post, y, post, post * .5); }
  // beam shadow
  const sg = ctx.createLinearGradient(0, beam, 0, beam + u * .06); sg.addColorStop(0, 'rgba(0,0,0,.55)'); sg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = sg; ctx.fillRect(post, beam, w - post * 2, u * .06);
  [[post, 0], [w - post - u * .05, 0]].forEach(([x]) => { const g = ctx.createLinearGradient(x, 0, x + (x < w / 2 ? u * .05 : u * .05), 0); void g; });
}

const LANTERN = `<svg viewBox="0 0 60 150" aria-hidden="true">
<defs><radialGradient id="lg-glow" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ffe9a0" stop-opacity=".95"/><stop offset=".35" stop-color="#ffb347" stop-opacity=".55"/><stop offset="1" stop-color="#ff8a2a" stop-opacity="0"/></radialGradient>
<linearGradient id="lg-fl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff9d0"/><stop offset=".5" stop-color="#ffc247"/><stop offset="1" stop-color="#e0701a"/></linearGradient></defs>
<g class="arm"><path d="M-70 -4H34V6H-70Z" fill="#6a4423" stroke="#1c0f06" stroke-width="2"/><path d="M-50 6L-24 6L-50 30Z" fill="#4a2f17" stroke="#1c0f06" stroke-width="1.5"/><path d="M-70 -2H34" stroke="#c99a5a" stroke-opacity=".5" stroke-width="1.5"/></g>
<g class="lglow"><circle cx="30" cy="105" r="95" fill="url(#lg-glow)"/></g>
<path d="M30 0V52" stroke="#1d1710" stroke-width="3.5"/><path d="M30 0V52" stroke="#8a7550" stroke-width="1.4" stroke-dasharray="3 3"/>
<path d="M22 66q8-18 16 0" fill="none" stroke="#1d1710" stroke-width="3.5" stroke-linecap="round"/>
<path d="M14 76L22 62H38L46 76Z" fill="#3b3f45" stroke="#14110c" stroke-width="2" stroke-linejoin="round"/>
<rect x="13" y="76" width="34" height="38" rx="5" fill="#ffd36a" fill-opacity=".35" stroke="#14110c" stroke-width="2"/>
<path d="M30 110C21 103 25 94 30 86C32 92 40 96 38 103C37 107 34 110 30 110Z" fill="url(#lg-fl)" stroke="#ff9a1a" stroke-width="1.2"/>
<path d="M24 77V113M36 77V113" stroke="#14110c" stroke-width="2.4"/>
<path d="M17 80V108" stroke="#fff" stroke-opacity=".5" stroke-width="2" stroke-linecap="round"/>
<path d="M11 114H49L45 124H15Z" fill="#3b3f45" stroke="#14110c" stroke-width="2" stroke-linejoin="round"/></svg>`;

const GLINTS = [[4.5, 83, 0, '#e6b8ff'], [8, 90, 1.7, '#ffe6ff'], [95, 80, 3.1, '#c9fff7'], [92, 88, .9, '#e6fffb'], [10, 36, 2.4, '#c9fff7'], [90, 28, 4.0, '#ffd6ff'], [3, 60, 3.6, '#ffe9a8'], [97, 55, 1.2, '#ffe9a8']];

export function createScene(app) {
  let host = app.querySelector('#scene');
  if (!host) { host = document.createElement('div'); host.id = 'scene'; app.insertBefore(host, app.firstChild); }
  if (host.dataset.built) return host._scene;
  host.dataset.built = '1';
  host.innerHTML = `
    <div class="lay drift-a" data-k=".35"><canvas data-l="far"></canvas></div>
    <div class="lay veins drift-b" data-k=".6"><canvas data-l="veins"></canvas></div>
    <div class="lay drift-b" data-k="1"><canvas data-l="mid"></canvas></div>
    <div class="shafts"><i></i><i></i><i></i><i></i></div>
    <div class="heat"></div>
    <div class="warm"></div>
    <div class="fstint"></div>
    <div class="fog"><i></i><i></i></div>
    ${GLINTS.map(([x, y, d, c]) => `<span class="glint" style="left:${x}%;top:${y}%;animation-delay:${d}s"><svg viewBox="-10 -10 20 20"><path d="M0 -10 L1.6 -1.6 L10 0 L1.6 1.6 L0 10 L-1.6 1.6 L-10 0 L-1.6 -1.6Z" fill="${c}"/><circle r="2.4" fill="#fff"/></svg></span>`).join('')}
    <canvas class="dustc" style="position:absolute;inset:0;width:100%;height:100%"></canvas>
    <div class="lay2" data-k=".2" style="position:absolute;inset:0"><canvas data-l="timber"></canvas></div>
    <div class="lantern l">${LANTERN}</div><div class="lantern r">${LANTERN.replace(/lg-glow/g, 'lg-glow2').replace(/lg-fl/g, 'lg-fl2')}</div>
    <div class="vig"></div>`;
  const cv = (k) => host.querySelector(`canvas[data-l="${k}"]`);
  const fns = { far: drawFar, veins: drawVeins, mid: drawMid, timber: drawTimber };
  let lastW = 0, lastH = 0, timer = 0;
  function draw() {
    const rect = host.getBoundingClientRect();
    const W = Math.max(2, Math.round(rect.width)), H = Math.max(2, Math.round(rect.height));
    if (W === lastW && H === lastH) return;
    lastW = W; lastH = H;
    const sc = Math.min(window.devicePixelRatio || 1, 1.5);
    for (const k of Object.keys(fns)) {
      const c = cv(k);
      const w = Math.round(W * (k === 'timber' ? 1 : 1.08) * sc), h = Math.round(H * (k === 'timber' ? 1 : 1.08) * sc);
      c.width = w; c.height = h;
      try { fns[k](c, w, h); } catch (e) { console.error('scene', k, e); }
    }
    sizeDust(W, H);
  }
  // ---- dust + embers
  const dust = host.querySelector('.dustc'); const dctx = dust.getContext('2d');
  let DW = 1, DH = 1; const motes = [];
  const sprite = document.createElement('canvas'); sprite.width = sprite.height = 32;
  { const s = sprite.getContext('2d'); const g = s.createRadialGradient(16, 16, 0, 16, 16, 16); g.addColorStop(0, 'rgba(255,240,200,1)'); g.addColorStop(.3, 'rgba(255,200,120,.5)'); g.addColorStop(1, 'rgba(255,170,80,0)'); s.fillStyle = g; s.fillRect(0, 0, 32, 32); }
  function sizeDust(W, H) { DW = W; DH = H; dust.width = W; dust.height = H; }
  function spawn(m, init) {
    m.ember = Math.random() < .35;
    m.x = Math.random() * DW; m.y = init ? Math.random() * DH : DH + 10;
    m.s = m.ember ? 3 + Math.random() * 5 : 2 + Math.random() * 6;
    m.vx = (Math.random() - .5) * 8; m.vy = m.ember ? -(14 + Math.random() * 26) : -(2 + Math.random() * 8);
    m.ph = Math.random() * TAU; m.a = m.ember ? .55 + Math.random() * .4 : .12 + Math.random() * .3; m.hot = Math.random();
  }
  const reduce = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  for (let i = 0; i < (reduce ? 14 : 46); i++) { const m = {}; spawn(m, true); motes.push(m); }
  let lt = 0, running = true;
  function loop(now) {
    if (!running) return;
    requestAnimationFrame(loop);
    if (document.hidden || now - lt < 33) { if (document.hidden) lt = now; return; } const dt = Math.min(.1, (now - lt) / 1000); lt = now;
    dctx.clearRect(0, 0, DW, DH); dctx.globalCompositeOperation = 'lighter';
    const bonus = document.body.classList.contains('fs-mode');
    for (const m of motes) {
      m.ph += dt * (m.ember ? 3 : 1);
      m.x += (m.vx + Math.sin(m.ph) * 8) * dt; m.y += m.vy * dt * (bonus && m.ember ? 1.8 : 1);
      if (m.y < -10 || m.x < -20 || m.x > DW + 20) spawn(m, false);
      const tw = .6 + Math.sin(m.ph * 1.7) * .4;
      dctx.globalAlpha = m.a * tw * (bonus && m.ember ? 1.3 : 1);
      const s = m.s * (m.ember ? 1.6 : 1) * (DH / 600 + .6);
      dctx.drawImage(sprite, m.x - s, m.y - s, s * 2, s * 2);
    }
    dctx.globalAlpha = 1;
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
  draw();

  const api = {
    host,
    redraw() { lastW = 0; draw(); },
    shakeTargets() { return [host]; },
    destroy() { running = false; if (ro) ro.disconnect(); },
  };
  host._scene = api;
  return api;
}
