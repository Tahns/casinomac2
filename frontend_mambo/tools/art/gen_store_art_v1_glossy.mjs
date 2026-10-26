// Hand-authored vector art for "The Unleashed Mine" store images.
// No generative AI: every shape below is built procedurally from paths/gradients/filters.
// Usage: node gen_store_art.mjs <outDir>   (writes tile_3x4.svg + cover_16x9.svg)
import fs from 'node:fs';
import path from 'node:path';

const out = process.argv[2] || '.';
const f = (n) => Math.round(n * 10) / 10;

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- colour helpers ----------
const hex2 = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const toHex = (c) => '#' + c.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
function ramp(pal, t) { // pal: 4 hex stops light->dark, t 0..1
  t = Math.max(0, Math.min(1, t)) * (pal.length - 1);
  const i = Math.min(pal.length - 2, Math.floor(t));
  const u = t - i, a = hex2(pal[i]), b = hex2(pal[i + 1]);
  return toHex(a.map((v, k) => v + (b[k] - v) * u));
}
const PAL = {
  ruby: ['#ffc2cf', '#f0194a', '#9a0626', '#4a0314'],
  sapphire: ['#c2e2ff', '#2f78ff', '#123aa8', '#081a5a'],
  emerald: ['#c6ffd8', '#18d06a', '#07803c', '#033f1e'],
  topaz: ['#fff6bf', '#ffbe22', '#c76d0a', '#6c3504'],
  amethyst: ['#f0ccff', '#aa48f0', '#6420ac', '#300c5e'],
};
const GEMS = Object.keys(PAL);

// ---------- gem (faceted, hand-built ring geometry) ----------
function gem(cx, cy, r, palName, rot = 0, n = 8, sy = 1, glow = false) {
  const pal = PAL[palName];
  const s = (Math.PI * 2) / n, rr = (rot * Math.PI) / 180;
  const lightAng = -2.3 - rr;
  const P = (k, rad, off = 0) => [Math.cos(k * s + off + s * 0.0) * rad, Math.sin(k * s + off) * rad];
  const O = [], M = [], T = [];
  for (let k = 0; k < n; k++) {
    O.push(P(k, r, -Math.PI / 2));
    M.push(P(k, r * 0.74, -Math.PI / 2 + s / 2));
    T.push(P(k, r * 0.44, -Math.PI / 2));
  }
  const pt = (p) => `${f(p[0])},${f(p[1])}`;
  const shade = (pts, bias = 0) => {
    const cx0 = pts.reduce((a, p) => a + p[0], 0) / pts.length;
    const cy0 = pts.reduce((a, p) => a + p[1], 0) / pts.length;
    const a = Math.atan2(cy0, cx0);
    const L = Math.cos(a - lightAng);
    const rad = Math.hypot(cx0, cy0) / r;
    return ramp(pal, 0.5 - 0.46 * L + bias + (rad < 0.5 ? -0.12 : 0.04));
  };
  let g = `<g transform="translate(${f(cx)} ${f(cy)}) rotate(${f(rot)}) scale(1 ${sy})">`;
  if (glow) g += `<circle r="${f(r * 1.6)}" fill="url(#glow_${palName})"/>`;
  g += `<polygon points="${O.map(pt).join(' ')}" fill="${ramp(pal, 0.85)}" stroke="${pal[3]}" stroke-width="${f(Math.max(1.5, r * 0.07))}" stroke-linejoin="round"/>`;
  const tri = (a, b, c, bias) => {
    const col = shade([a, b, c], bias);
    return `<polygon points="${pt(a)} ${pt(b)} ${pt(c)}" fill="${col}" stroke="${ramp(pal, 0.9)}" stroke-opacity=".55" stroke-width="${f(Math.max(0.8, r * 0.025))}" stroke-linejoin="round"/>`;
  };
  for (let k = 0; k < n; k++) {
    const km = (k + n - 1) % n, kn = (k + 1) % n;
    g += tri(O[k], O[kn], M[k], 0.02);
    g += tri(O[k], M[km], M[k], -0.04);
    g += tri(M[km], M[k], T[k], 0.0);
    g += tri(T[k], T[kn], M[k], 0.06);
  }
  const table = shade(T, -0.08);
  g += `<polygon points="${T.map(pt).join(' ')}" fill="${table}" stroke="${pal[0]}" stroke-opacity=".7" stroke-width="${f(Math.max(1, r * 0.03))}"/>`;
  // glints
  g += `<polygon points="${f(-r * .42)},${f(-r * .36)} ${f(-r * .12)},${f(-r * .5)} ${f(-r * .2)},${f(-r * .2)}" fill="#fff" opacity=".8"/>`;
  g += `<circle cx="${f(-r * .3)}" cy="${f(-r * .3)}" r="${f(r * .07)}" fill="#fff"/>`;
  g += `</g>`;
  return g;
}

function sparkle(x, y, r, col = '#fff', op = 1) {
  const w = r * 0.14;
  return `<path d="M${f(x)} ${f(y - r)} Q${f(x + w)} ${f(y - w)} ${f(x + r)} ${f(y)} Q${f(x + w)} ${f(y + w)} ${f(x)} ${f(y + r)} Q${f(x - w)} ${f(y + w)} ${f(x - r)} ${f(y)} Q${f(x - w)} ${f(y - w)} ${f(x)} ${f(y - r)}Z" fill="${col}" opacity="${op}"/>`;
}

// ---------- rock ----------
function rock(cx, cy, r, rot, seed, trail = 0) {
  const R = rng(seed);
  const n = 8, pts = [];
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2, rad = r * (0.66 + R() * 0.38);
    pts.push([Math.cos(a) * rad, Math.sin(a) * rad * 0.88]);
  }
  const pt = (p) => `${f(p[0])},${f(p[1])}`;
  let g = `<g transform="translate(${f(cx)} ${f(cy)}) rotate(${f(rot)})">`;
  if (trail) g += `<path d="M${f(-r * .6)} ${f(-r * .5)} L${f(-r * trail)} ${f(-r * .1)} L${f(-r * .6)} ${f(r * .45)}Z" fill="url(#trail)" />`;
  g += `<polygon points="${pts.map(pt).join(' ')}" fill="url(#rockfill)" stroke="#120a0a" stroke-width="${f(r * 0.07)}" stroke-linejoin="round"/>`;
  g += `<polygon points="${pt(pts[5])} ${pt(pts[6])} ${pt(pts[7])} ${pt(pts[0])} 0,0" fill="#a58770" opacity=".55"/>`;
  g += `<polygon points="${pt(pts[1])} ${pt(pts[2])} ${pt(pts[3])} 0,0" fill="#000" opacity=".35"/>`;
  g += `<polyline points="${pt(pts[6])} ${f(pts[6][0] * .3)},${f(pts[6][1] * .3)} ${pt(pts[2])}" fill="none" stroke="#2a1812" stroke-width="${f(r * .05)}" opacity=".7"/>`;
  g += `</g>`;
  return g;
}

// ---------- spark burst ----------
function spark(x, y, r, seed = 1) {
  const R = rng(seed);
  let g = `<g>`;
  g += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r * 3.2)}" fill="url(#sparkglow)"/>`;
  const rays = 12;
  let d = '';
  for (let k = 0; k < rays; k++) {
    const a = (k / rays) * Math.PI * 2 + 0.2, L = r * (k % 2 ? 1.1 : 2.1) * (0.8 + R() * 0.5);
    const w = 0.13;
    d += `M${f(x + Math.cos(a - w) * r * .35)} ${f(y + Math.sin(a - w) * r * .35)} L${f(x + Math.cos(a) * L)} ${f(y + Math.sin(a) * L)} L${f(x + Math.cos(a + w) * r * .35)} ${f(y + Math.sin(a + w) * r * .35)}Z`;
  }
  g += `<path d="${d}" fill="#ffd45a" stroke="#ff8a1a" stroke-width="${f(r * 0.04)}" stroke-linejoin="round"/>`;
  g += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r * .55)}" fill="#fff6c8"/><circle cx="${f(x)}" cy="${f(y)}" r="${f(r * .3)}" fill="#fff"/>`;
  for (let k = 0; k < 22; k++) {
    const a = R() * Math.PI * 2, d1 = r * (1.6 + R() * 3.4), len = r * (0.25 + R() * 0.5);
    const x1 = x + Math.cos(a) * d1, y1 = y + Math.sin(a) * d1;
    g += `<line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x1 + Math.cos(a) * len)}" y2="${f(y1 + Math.sin(a) * len)}" stroke="${R() > .5 ? '#ffe27a' : '#ff9a30'}" stroke-width="${f(r * (0.06 + R() * .08))}" stroke-linecap="round"/>`;
  }
  g += `</g>`;
  return g;
}

// ---------- dynamite bundle (origin = bundle centre, S = stick length) ----------
function dynamite(S, fuseTip) {
  const w = S * 0.27;
  const stick = (dx, rot, shadeId) => `
  <g transform="translate(${f(dx)} 0) rotate(${rot})">
    <rect x="${f(-w / 2)}" y="${f(-S / 2)}" width="${f(w)}" height="${f(S)}" rx="${f(w * .22)}" fill="url(#dynred)" stroke="#3a0608" stroke-width="${f(S * .018)}"/>
    <rect x="${f(-w / 2)}" y="${f(-S * .5)}" width="${f(w)}" height="${f(S * .07)}" rx="${f(w * .1)}" fill="#5a3a22" stroke="#2a160a" stroke-width="${f(S * .012)}"/>
    <rect x="${f(-w / 2)}" y="${f(S * .43)}" width="${f(w)}" height="${f(S * .07)}" rx="${f(w * .1)}" fill="#5a3a22" stroke="#2a160a" stroke-width="${f(S * .012)}"/>
    <rect x="${f(-w / 2)}" y="${f(-S * .13)}" width="${f(w)}" height="${f(S * .26)}" fill="#f3e2b0" stroke="#7a5a2a" stroke-width="${f(S * .01)}"/>
    <text x="0" y="${f(S * .065)}" text-anchor="middle" font-family="'Arial Black','DejaVu Sans',sans-serif" font-weight="900" font-size="${f(S * .105)}" fill="#a3140f" stroke="#a3140f" stroke-width="${f(S * .004)}">TNT</text>
    <rect x="${f(-w * .42)}" y="${f(-S * .46)}" width="${f(w * .14)}" height="${f(S * .9)}" rx="${f(w * .05)}" fill="#fff" opacity=".22"/>
  </g>`;
  let g = stick(-w * 1.1, -4) + stick(w * 1.1, 4) + stick(0, 0);
  // rope
  g += `<g stroke-linecap="round"><path d="M${f(-w * 1.7)} ${f(-S * .22)} Q0 ${f(-S * .3)} ${f(w * 1.7)} ${f(-S * .22)}" stroke="#2b1a0c" stroke-width="${f(S * .07)}" fill="none"/><path d="M${f(-w * 1.7)} ${f(-S * .22)} Q0 ${f(-S * .3)} ${f(w * 1.7)} ${f(-S * .22)}" stroke="#d2a460" stroke-width="${f(S * .045)}" fill="none" stroke-dasharray="${f(S * .03)} ${f(S * .02)}"/>
  <path d="M${f(-w * 1.7)} ${f(S * .27)} Q0 ${f(S * .19)} ${f(w * 1.7)} ${f(S * .27)}" stroke="#2b1a0c" stroke-width="${f(S * .07)}" fill="none"/><path d="M${f(-w * 1.7)} ${f(S * .27)} Q0 ${f(S * .19)} ${f(w * 1.7)} ${f(S * .27)}" stroke="#d2a460" stroke-width="${f(S * .045)}" fill="none" stroke-dasharray="${f(S * .03)} ${f(S * .02)}"/></g>`;
  // fuse
  const [fx, fy] = fuseTip;
  g += `<path d="M0 ${f(-S * .5)} C${f(S * .02)} ${f(-S * .7)} ${f(fx * .2)} ${f(fy * .5)} ${f(fx)} ${f(fy)}" fill="none" stroke="#1a0f08" stroke-width="${f(S * .06)}" stroke-linecap="round"/>`;
  g += `<path d="M0 ${f(-S * .5)} C${f(S * .02)} ${f(-S * .7)} ${f(fx * .2)} ${f(fy * .5)} ${f(fx)} ${f(fy)}" fill="none" stroke="#c9a46a" stroke-width="${f(S * .03)}" stroke-linecap="round" stroke-dasharray="${f(S * .05)} ${f(S * .03)}"/>`;
  return g;
}

function dynAt(tx, ty, rot, S, tip) {
  const a = (rot * Math.PI) / 180;
  return `<g transform="translate(${tx} ${ty}) rotate(${rot})">${dynamite(S, tip)}</g>` + spark(tx + tip[0] * Math.cos(a) - tip[1] * Math.sin(a), ty + tip[0] * Math.sin(a) + tip[1] * Math.cos(a), S * 0.14, 7);
}
// ---------- wood ----------
function post(x, y, w, h, vertical = true, seed = 1) {
  const R = rng(seed);
  const fill = vertical ? 'url(#woodV)' : 'url(#woodH)';
  let g = `<g><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" filter="url(#${vertical ? 'grainV' : 'grainH'})" stroke="#1e0e04" stroke-width="6"/>`;
  // plank seams + grain strokes
  const n = vertical ? 3 : 2;
  for (let k = 1; k < n; k++) {
    if (vertical) g += `<line x1="${x + (w * k) / n}" y1="${y}" x2="${x + (w * k) / n}" y2="${y + h}" stroke="#1e0e04" stroke-width="5" opacity=".8"/>`;
    else g += `<line x1="${x}" y1="${y + (h * k) / n}" x2="${x + w}" y2="${y + (h * k) / n}" stroke="#1e0e04" stroke-width="5" opacity=".8"/>`;
  }
  // highlight edge
  if (vertical) g += `<rect x="${x + 6}" y="${y + 4}" width="${w * .09}" height="${h - 8}" fill="#ffd9a0" opacity=".28"/>`;
  else g += `<rect x="${x + 4}" y="${y + 6}" width="${w - 8}" height="${h * .09}" fill="#ffd9a0" opacity=".28"/>`;
  // knots
  for (let k = 0; k < 2; k++) {
    const kx = vertical ? x + w * (.25 + R() * .5) : x + w * (.1 + R() * .8), ky = vertical ? y + h * (.15 + R() * .7) : y + h * (.3 + R() * .4);
    g += `<ellipse cx="${f(kx)}" cy="${f(ky)}" rx="${f(Math.min(w, h) * .12)}" ry="${f(Math.min(w, h) * .17)}" fill="#3a1c0a" opacity=".75" stroke="#1e0e04" stroke-width="3"/><ellipse cx="${f(kx)}" cy="${f(ky)}" rx="${f(Math.min(w, h) * .05)}" ry="${f(Math.min(w, h) * .08)}" fill="#1a0c04"/>`;
  }
  g += `</g>`;
  return g;
}
const bolt = (x, y, r) => `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="url(#iron)" stroke="#120a06" stroke-width="${f(r * .25)}"/><circle cx="${f(x - r * .3)}" cy="${f(y - r * .3)}" r="${f(r * .25)}" fill="#fff" opacity=".6"/>`;
function ironStrap(x, y, w, h) {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#iron)" stroke="#0e0806" stroke-width="5"/>` +
    bolt(x + w / 2, y + h * .2, Math.min(w, h) * .18) + bolt(x + w / 2, y + h * .8, Math.min(w, h) * .18);
}

// ---------- title ----------
const FONT = "Georgia,'DejaVu Serif','Liberation Serif','Times New Roman',serif";
function titleBlock(lines) {
  // lines: [{id,text,x,y,size,len}]
  let defs = '', body = '';
  for (const L of lines) {
    defs += `<text id="${L.id}" x="${L.x}" y="${L.y}" text-anchor="${L.anchor || 'middle'}" font-family="${FONT}" font-weight="900" font-size="${L.size}" letter-spacing="${L.ls || 0}"${L.len ? ` textLength="${L.len}" lengthAdjust="spacingAndGlyphs"` : ''}>${L.text}</text>`;
  }
  // soft glow behind
  for (const L of lines) body += `<use href="#${L.id}" fill="#ff8a1a" stroke="#ff7a10" stroke-width="40" stroke-linejoin="round" opacity=".55" filter="url(#blur18)"/>`;
  for (const L of lines) {
    // extrusion
    for (let d = L.size * 0.075; d >= 1; d -= 2) body += `<use href="#${L.id}" y="${f(d)}" fill="${d > L.size * .05 ? '#5a2f05' : '#7a430a'}" stroke="#2a1202" stroke-width="${f(L.size * .1)}" stroke-linejoin="round"/>`;
    body += `<use href="#${L.id}" fill="#1e0c01" stroke="#1e0c01" stroke-width="${f(L.size * .1)}" stroke-linejoin="round"/>`;
    body += `<use href="#${L.id}" fill="url(#gold)" stroke="#fff0b0" stroke-width="${f(L.size * .018)}" stroke-linejoin="round" filter="url(#bevel)"/>`;
    body += `<use href="#${L.id}" fill="none" stroke="#7a4108" stroke-width="${f(L.size * .008)}" stroke-linejoin="round" opacity=".8"/>`;
  }
  return { defs, body };
}

// ---------- shared defs ----------
function commonDefs(W, H) {
  let d = '';
  d += `<linearGradient id="gold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fffbd8"/><stop offset=".22" stop-color="#ffe066"/><stop offset=".48" stop-color="#e5a216"/><stop offset=".56" stop-color="#fff0a0"/><stop offset=".7" stop-color="#e8aa1c"/><stop offset="1" stop-color="#8a4f06"/></linearGradient>`;
  d += `<filter id="bevel" x="-5%" y="-10%" width="110%" height="125%"><feGaussianBlur in="SourceAlpha" stdDeviation="3.5" result="b"/><feSpecularLighting in="b" surfaceScale="7" specularConstant="1.2" specularExponent="24" lighting-color="#fffbe0" result="s"><feDistantLight azimuth="225" elevation="52"/></feSpecularLighting><feComposite in="s" in2="SourceAlpha" operator="in" result="s2"/><feComposite in="SourceGraphic" in2="s2" operator="arithmetic" k1="0" k2="1" k3="0.85" k4="0"/></filter>`;
  d += `<filter id="blur18" x="-20%" y="-40%" width="140%" height="180%"><feGaussianBlur stdDeviation="18"/></filter>`;
  d += `<filter id="blur6" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="6"/></filter>`;
  d += `<filter id="blur40" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="40"/></filter>`;
  d += `<filter id="grainV" x="0" y="0" width="1" height="1"><feTurbulence type="fractalNoise" baseFrequency="0.02 0.35" numOctaves="3" seed="4" result="n"/><feColorMatrix in="n" type="matrix" values="0 0 0 0 0.1  0 0 0 0 0.05  0 0 0 0 0.01  0 0 0 -1.7 1.1" result="g"/><feComposite in="g" in2="SourceGraphic" operator="in" result="gi"/><feMerge><feMergeNode in="SourceGraphic"/><feMergeNode in="gi"/></feMerge></filter>`;
  d += `<filter id="grainH" x="0" y="0" width="1" height="1"><feTurbulence type="fractalNoise" baseFrequency="0.35 0.02" numOctaves="3" seed="9" result="n"/><feColorMatrix in="n" type="matrix" values="0 0 0 0 0.1  0 0 0 0 0.05  0 0 0 0 0.01  0 0 0 -1.7 1.1" result="g"/><feComposite in="g" in2="SourceGraphic" operator="in" result="gi"/><feMerge><feMergeNode in="SourceGraphic"/><feMergeNode in="gi"/></feMerge></filter>`;
  d += `<filter id="rocky" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency="0.012 0.02" numOctaves="4" seed="12" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="38" xChannelSelector="R" yChannelSelector="G"/></filter>`;
  d += `<linearGradient id="woodV" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#5a3216"/><stop offset=".3" stop-color="#9b6030"/><stop offset=".55" stop-color="#7a4622"/><stop offset="1" stop-color="#3e2010"/></linearGradient>`;
  d += `<linearGradient id="woodH" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b87a40"/><stop offset=".35" stop-color="#8a5228"/><stop offset="1" stop-color="#3e2010"/></linearGradient>`;
  d += `<linearGradient id="iron" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8c97a8"/><stop offset=".5" stop-color="#4a5262"/><stop offset="1" stop-color="#1e222c"/></linearGradient>`;
  d += `<linearGradient id="cartbody" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#2a303c"/><stop offset=".25" stop-color="#6a7488"/><stop offset=".5" stop-color="#434b5c"/><stop offset="1" stop-color="#1a1e28"/></linearGradient>`;
  d += `<linearGradient id="dynred" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ff6a52"/><stop offset=".3" stop-color="#e62a1c"/><stop offset=".7" stop-color="#b3120c"/><stop offset="1" stop-color="#5e0508"/></linearGradient>`;
  d += `<radialGradient id="rockfill" cx=".35" cy=".3" r=".9"><stop offset="0" stop-color="#8a7260"/><stop offset=".6" stop-color="#4a3a32"/><stop offset="1" stop-color="#241a18"/></radialGradient>`;
  d += `<linearGradient id="trail" x1="1" y1="0" x2="0" y2="0"><stop offset="0" stop-color="#ffb060" stop-opacity=".55"/><stop offset="1" stop-color="#ffb060" stop-opacity="0"/></linearGradient>`;
  d += `<radialGradient id="sparkglow"><stop offset="0" stop-color="#ffe58a" stop-opacity=".95"/><stop offset=".35" stop-color="#ff9a2a" stop-opacity=".55"/><stop offset="1" stop-color="#ff5a10" stop-opacity="0"/></radialGradient>`;
  d += `<radialGradient id="ember"><stop offset="0" stop-color="#fff2b0"/><stop offset=".4" stop-color="#ffa030"/><stop offset="1" stop-color="#ff4a10" stop-opacity="0"/></radialGradient>`;
  d += `<radialGradient id="lamp"><stop offset="0" stop-color="#fff3b8" stop-opacity="1"/><stop offset=".25" stop-color="#ffc050" stop-opacity=".75"/><stop offset="1" stop-color="#ff8a20" stop-opacity="0"/></radialGradient>`;
  for (const k of GEMS) d += `<radialGradient id="glow_${k}"><stop offset="0" stop-color="${PAL[k][1]}" stop-opacity=".75"/><stop offset="1" stop-color="${PAL[k][1]}" stop-opacity="0"/></radialGradient>`;
  d += `<pattern id="rockpat" width="90" height="90" patternUnits="userSpaceOnUse" patternTransform="rotate(12)"><path d="M0 20 L45 0 L90 28 M0 70 L38 52 L90 80 M38 52 L45 0 M60 90 L68 52" fill="none" stroke="#000" stroke-opacity=".28" stroke-width="3"/><path d="M4 24 L45 5 M6 74 L38 57" fill="none" stroke="#7a6a9a" stroke-opacity=".12" stroke-width="2"/></pattern>`;
  return d;
}

// ---------- scene parts ----------
function rays(cx, cy, R, count, seed, spread = [0, Math.PI * 2], op = 0.45) {
  const Rn = rng(seed);
  let g = `<defs><radialGradient id="rayg" gradientUnits="userSpaceOnUse" cx="${cx}" cy="${cy}" r="${R}"><stop offset="0" stop-color="#fff0b0" stop-opacity="${op}"/><stop offset=".5" stop-color="#ffc050" stop-opacity="${op * .45}"/><stop offset="1" stop-color="#ff9020" stop-opacity="0"/></radialGradient></defs><g style="mix-blend-mode:screen">`;
  for (let k = 0; k < count; k++) {
    const a = spread[0] + (spread[1] - spread[0]) * (k + Rn() * 0.7) / count, w = 0.025 + Rn() * 0.05;
    g += `<polygon points="${cx},${cy} ${f(cx + Math.cos(a - w) * R)},${f(cy + Math.sin(a - w) * R)} ${f(cx + Math.cos(a + w) * R)},${f(cy + Math.sin(a + w) * R)}" fill="url(#rayg)"/>`;
  }
  return g + `</g>`;
}
function embers(count, seed, box, rmax = 7) {
  const R = rng(seed);
  let g = '';
  for (let k = 0; k < count; k++) {
    const x = box[0] + R() * box[2], y = box[1] + R() * box[3], r = 2 + R() * rmax;
    g += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r * 2.6)}" fill="url(#ember)" opacity="${f(.5 + R() * .5)}"/><circle cx="${f(x)}" cy="${f(y)}" r="${f(r * .55)}" fill="#fff6c8"/>`;
  }
  return g;
}
function crystalCluster(x, y, s, pals, rot, seed) {
  const R = rng(seed);
  let g = `<g transform="translate(${x} ${y}) rotate(${rot})">`;
  g += `<ellipse cx="0" cy="0" rx="${f(s * 1.4)}" ry="${f(s * 1.2)}" fill="url(#glow_${pals[0]})" />`;
  const N = 5;
  for (let k = 0; k < N; k++) {
    const a = -Math.PI / 2 + (k - 2) * 0.32 + (R() - .5) * .1, L = s * (0.9 + R() * .9), w = s * (.16 + R() * .08);
    const pal = PAL[pals[k % pals.length]];
    const tx = Math.cos(a) * L, ty = Math.sin(a) * L, nx = -Math.sin(a) * w, ny = Math.cos(a) * w;
    const bx = Math.cos(a) * L * .72, by = Math.sin(a) * L * .72;
    g += `<polygon points="${f(nx)},${f(ny)} ${f(bx + nx)},${f(by + ny)} ${f(tx)},${f(ty)} ${f(bx - nx)},${f(by - ny)} ${f(-nx)},${f(-ny)}" fill="${pal[1]}" stroke="${pal[3]}" stroke-width="${f(s * .03)}" stroke-linejoin="round"/>`;
    g += `<polygon points="${f(nx)},${f(ny)} ${f(bx + nx)},${f(by + ny)} ${f(tx)},${f(ty)} 0,0" fill="${pal[0]}" opacity=".75"/>`;
    g += `<polygon points="${f(-nx)},${f(-ny)} ${f(bx - nx)},${f(by - ny)} ${f(tx)},${f(ty)} 0,0" fill="${pal[3]}" opacity=".5"/>`;
  }
  return g + `</g>`;
}

function cart(W, name) {
  // origin: bottom-centre of the wheels. Returns svg. width W.
  const H = W * 0.52, topW = W, botW = W * 0.8, wr = W * 0.115;
  const by = -wr * 1.4; // body bottom y
  const ty = by - H;
  let g = '';
  // rails
  g += `<ellipse cx="0" cy="${f(wr * .6)}" rx="${f(W * .8)}" ry="${f(W * .09)}" fill="#000" opacity=".5" filter="url(#blur18)"/>`;
  // pile (back layer)
  const R = rng(77);
  const items = [];
  const nG = 46;
  for (let k = 0; k < nG; k++) {
    const u = R() * 2 - 1, v = R();
    const hh = Math.sqrt(Math.max(0, 1 - u * u)); // mound
    const x = u * topW * 0.46;
    const y = ty + H * 0.12 - hh * W * 0.3 * (0.35 + 0.65 * v) - v * W * 0.02;
    items.push({ x, y: y, r: W * (0.07 + R() * 0.045), c: GEMS[k % 5], rot: R() * 360, n: R() > .45 ? 8 : 6, sy: 0.85 + R() * .2 });
  }
  items.sort((a, b) => a.y - b.y);
  // body
  const body = `<path d="M${f(-topW / 2)} ${f(ty)} L${f(topW / 2)} ${f(ty)} L${f(botW / 2)} ${f(by)} Q0 ${f(by + wr * .5)} ${f(-botW / 2)} ${f(by)}Z`;
  // glow inside cart
  g += `<ellipse cx="0" cy="${f(ty - W * .12)}" rx="${f(W * .75)}" ry="${f(W * .4)}" fill="#ffb030" opacity=".55" filter="url(#blur40)"/>`;
  g += items.filter((i) => i.y < ty - W * .05).map((i) => gem(i.x, i.y, i.r, i.c, i.rot, i.n, i.sy, false)).join('');
  g += body + `" fill="url(#cartbody)" stroke="#0a0c12" stroke-width="${f(W * .016)}" stroke-linejoin="round"/>`;
  // wooden slats / panels
  g += `<path d="M${f(-topW * .5 * .66)} ${f(ty)} L${f(-botW * .5 * .66)} ${f(by)} M${f(topW * .5 * .66)} ${f(ty)} L${f(botW * .5 * .66)} ${f(by)} M0 ${f(ty)} L0 ${f(by + 2)}" stroke="#0a0c12" stroke-width="${f(W * .014)}" fill="none"/>`;
  g += `<path d="M${f(-topW * .5 * .66 - W * .012)} ${f(ty)} L${f(-botW * .5 * .66 - W * .012)} ${f(by)} M${f(W * 0.012)} ${f(ty)} L${f(W * .012)} ${f(by)}" stroke="#aab4c6" stroke-width="${f(W * .006)}" opacity=".5" fill="none"/>`;
  g += `<path d="M${f(-topW / 2 + W * .05)} ${f(ty + H * .5)} L${f(topW / 2 - W * .05)} ${f(ty + H * .5)}" stroke="#0a0c12" stroke-width="${f(W * .012)}" opacity=".6"/>`;
  // orange glow lighting from gems/rim on the body
  g += `<path d="${body.slice(6)}" fill="url(#cartwarm)" opacity=".8"/>`;
  // rim
  g += `<path d="M${f(-topW / 2 - W * .02)} ${f(ty)} L${f(topW / 2 + W * .02)} ${f(ty)} L${f(topW / 2 + W * .0)} ${f(ty + H * .13)} L${f(-topW / 2)} ${f(ty + H * .13)}Z" fill="url(#iron)" stroke="#0a0c12" stroke-width="${f(W * .016)}" stroke-linejoin="round"/>`;
  g += `<rect x="${f(-topW / 2)}" y="${f(ty + H * .015)}" width="${f(topW)}" height="${f(H * .03)}" fill="#e4eaf6" opacity=".45"/>`;
  for (let k = 0; k < 7; k++) g += bolt(-topW * .43 + k * topW * .86 / 6, ty + H * .075, W * .016);
  // bottom band
  g += `<rect x="${f(-botW / 2 - W * .005)}" y="${f(by - H * .12)}" width="${f(botW + W * .01)}" height="${f(H * .12)}" fill="url(#iron)" stroke="#0a0c12" stroke-width="${f(W * .012)}" opacity=".95"/>`;
  // front gems pouring over rim
  g += items.filter((i) => i.y >= ty - W * .05).map((i) => gem(i.x, i.y + W * .04, i.r * 1.05, i.c, i.rot, i.n, i.sy, false)).join('');
  // spilled gems on ground
  const spill = [[-0.62, 0.0, 0.07, 'ruby'], [0.66, 0.02, 0.075, 'sapphire'], [-0.78, -0.03, 0.05, 'topaz'], [0.8, -0.0, 0.055, 'emerald'], [0.52, 0.07, 0.05, 'amethyst']];
  // wheels
  for (const sx of [-0.3, 0.3]) {
    const cx = sx * W, cy = -wr;
    g += `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(wr)}" fill="url(#iron)" stroke="#0a0c12" stroke-width="${f(W * .014)}"/><circle cx="${f(cx)}" cy="${f(cy)}" r="${f(wr * .66)}" fill="#1e222c" stroke="#aab4c6" stroke-width="${f(W * .006)}" opacity=".95"/>`;
    for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3 + .3; g += `<line x1="${f(cx)}" y1="${f(cy)}" x2="${f(cx + Math.cos(a) * wr * .66)}" y2="${f(cy + Math.sin(a) * wr * .66)}" stroke="#8c97a8" stroke-width="${f(W * .01)}"/>`; }
    g += `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(wr * .2)}" fill="#c9d2e2" stroke="#0a0c12" stroke-width="${f(W * .006)}"/>`;
  }
  // rail
  g += `<rect x="${f(-W * .85)}" y="${f(wr * .08)}" width="${f(W * 1.7)}" height="${f(wr * .24)}" fill="#3a2a22"/><rect x="${f(-W * .85)}" y="${f(wr * .06)}" width="${f(W * 1.7)}" height="${f(wr * .08)}" fill="#c9a074"/>`;
  g += spill.map(([x, y, r, c], i) => gem(x * W, y * W - W * .04, r * W, c, i * 40, i % 2 ? 6 : 8, 0.9)).join('');
  return g;
}

function defsCart() {
  return `<linearGradient id="cartwarm" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffb040" stop-opacity=".55"/><stop offset=".5" stop-color="#ff7a20" stop-opacity=".12"/><stop offset="1" stop-color="#000" stop-opacity="0"/></linearGradient>`;
}

function stalactites(W, y0, seed, h = 120, step = 90, col = '#0a0712') {
  const R = rng(seed);
  let d = `M0 0 L0 ${y0}`;
  let x = 0;
  while (x < W) {
    const w = step * (0.7 + R() * 0.8), hh = h * (0.3 + R() * 0.9);
    d += ` L${f(x + w * .5)} ${f(y0 + hh)} L${f(x + w)} ${f(y0 + 8)}`;
    x += w;
  }
  d += ` L${W} 0Z`;
  return `<path d="${d}" fill="${col}" stroke="#4a3a7a" stroke-width="3" stroke-linejoin="round"/>`;
}

function cavernBg(W, H, cx, cy, seed) {
  let g = `<rect width="${W}" height="${H}" fill="url(#cav)"/>`;
  g += `<rect width="${W}" height="${H}" fill="url(#rockpat)"/>`;
  // distant rock ribs
  const R = rng(seed);
  for (let k = 0; k < 9; k++) {
    const x = R() * W, y = R() * H * .8, s = 120 + R() * 220;
    g += `<polygon points="${f(x)},${f(y)} ${f(x + s * .7)},${f(y + s * .3)} ${f(x + s * .4)},${f(y + s)} ${f(x - s * .3)},${f(y + s * .6)}" fill="#0a0612" opacity=".28"/>`;
  }
  return g;
}

function vignette(W, H) {
  return `<rect width="${W}" height="${H}" fill="url(#vig)"/>`;
}

// =============== TILE 3:4 (1536 x 2048) ===============
function buildTile() {
  const W = 1536, H = 2048;
  const cx = W / 2;
  const T = titleBlock([
    { id: 't1', text: 'THE', x: cx, y: 215, size: 120, ls: 60 },
    { id: 't2', text: 'UNLEASHED', x: cx, y: 445, size: 250, len: 1290 },
    { id: 't3', text: 'MINE', x: cx, y: 690, size: 270, len: 880 },
  ]);
  let s = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`;
  s += `<title>The Unleashed Mine - game tile</title><defs>${commonDefs(W, H)}${defsCart()}${T.defs}`;
  s += `<radialGradient id="cav" gradientUnits="userSpaceOnUse" cx="${cx}" cy="1320" r="1250"><stop offset="0" stop-color="#ffb347"/><stop offset=".18" stop-color="#d4641a"/><stop offset=".42" stop-color="#6a2a48"/><stop offset=".7" stop-color="#2a1448"/><stop offset="1" stop-color="#0b0618"/></radialGradient>`;
  s += `<radialGradient id="vig" cx=".5" cy=".5" r=".75"><stop offset=".6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".7"/></radialGradient>`;
  s += `<clipPath id="all"><rect width="${W}" height="${H}"/></clipPath></defs><g clip-path="url(#all)">`;
  s += cavernBg(W, H, cx, 1320, 5);
  s += rays(cx, 1320, 1700, 26, 3, [0, Math.PI * 2], 0.5);
  // crystals in walls
  s += crystalCluster(150, 1100, 210, ['sapphire', 'amethyst'], 28, 1);
  s += crystalCluster(1400, 980, 220, ['emerald', 'topaz'], -30, 2);
  s += crystalCluster(120, 1560, 170, ['ruby', 'amethyst'], 70, 3);
  s += crystalCluster(1430, 1530, 180, ['ruby', 'sapphire'], -75, 4);
  // top rock
  s += stalactites(W, 70, 11, 170, 110);
  s += `<polygon points="0,780 140,860 120,1400 0,1500" fill="#0c0714" opacity=".92"/><polygon points="${W},780 ${W - 140},860 ${W - 120},1400 ${W},1500" fill="#0c0714" opacity=".92"/>`;
  // title zone darker backdrop for contrast
  s += `<rect x="0" y="0" width="${W}" height="830" fill="url(#titleshade)"/>`;
  s += `<defs><linearGradient id="titleshade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#05020c" stop-opacity=".85"/><stop offset=".75" stop-color="#05020c" stop-opacity=".45"/><stop offset="1" stop-color="#05020c" stop-opacity="0"/></linearGradient></defs>`;
  s += stalactites(W, 40, 12, 120, 100, 'none').replace('fill="none"', 'fill="#0a0712"');
  s += embers(40, 31, [0, 0, W, 800], 5);
  // mine entrance wooden frame
  s += post(60, 800, 170, 1248, true, 1) + post(W - 230, 800, 170, 1248, true, 2);
  s += `<polygon points="230,1180 400,820 470,820 230,1330" fill="url(#woodH)" stroke="#1e0e04" stroke-width="6" filter="url(#grainH)"/><polygon points="${W - 230},1180 ${W - 400},820 ${W - 470},820 ${W - 230},1330" fill="url(#woodH)" stroke="#1e0e04" stroke-width="6" filter="url(#grainH)"/>`;
  s += post(20, 740, W - 40, 150, false, 3);
  s += [100, 300, 1236, 1436].map((x) => bolt(x, 815, 15)).join('');
  s += ironStrap(110, 740, 70, 150) + ironStrap(W - 180, 740, 70, 150);
  s += ironStrap(100, 1250, 90, 120) + ironStrap(W - 190, 1250, 90, 120);
  // lanterns
  for (const lx of [330, W - 330]) {
    s += `<line x1="${lx}" y1="890" x2="${lx}" y2="960" stroke="#120a06" stroke-width="7"/><circle cx="${lx}" cy="1020" r="190" fill="url(#lamp)" style="mix-blend-mode:screen"/>`;
    s += `<rect x="${lx - 34}" y="960" width="68" height="100" rx="12" fill="#2a1a0e" stroke="#0e0806" stroke-width="6"/><rect x="${lx - 22}" y="975" width="44" height="70" rx="8" fill="#ffe27a"/><rect x="${lx - 40}" y="948" width="80" height="18" rx="6" fill="url(#iron)" stroke="#0e0806" stroke-width="5"/>`;
  }
  // glowing deep tunnel & floor
  s += `<ellipse cx="${cx}" cy="1330" rx="520" ry="280" fill="#fff2b0" opacity=".42" filter="url(#blur40)"/>`;
  s += `<polygon points="0,1980 ${W},1980 ${W},${H} 0,${H}" fill="#120a10"/>`;
  s += `<path d="M0 1880 Q${cx} 1800 ${W} 1880 L${W} ${H} L0 ${H}Z" fill="#1a0e12" stroke="#4a2a30" stroke-width="4"/>`;
  s += `<ellipse cx="${cx}" cy="1880" rx="760" ry="110" fill="#ffb040" opacity=".35" filter="url(#blur40)"/>`;
  // flying debris behind
  s += rock(360, 1020, 70, 30, 41, 3.2) + rock(1190, 900, 60, -40, 42, 3) + rock(1100, 1230, 44, 60, 43);
  s += gem(250, 930, 52, 'emerald', 15, 8, .9, true) + gem(1280, 1100, 58, 'ruby', -20, 8, .9, true) + gem(780, 960, 46, 'sapphire', 22, 8, .9, true);
  // cart
  s += `<g transform="translate(${cx + 40} 1810)">${cart(780)}</g>`;
  // fireball burst above cart
  s += `<ellipse cx="${cx + 40}" cy="1160" rx="420" ry="190" fill="#fff0a0" opacity=".25" filter="url(#blur40)"/>`;
  // flying gems up
  s += gem(520, 1000, 78, 'amethyst', 18, 8, .92, true) + gem(1010, 1050, 84, 'topaz', -12, 6, .95, true) + gem(710, 880, 66, 'ruby', 30, 8, .9, true) + gem(920, 910, 58, 'emerald', 0, 8, .9, true);
  s += rock(640, 1130, 56, 40, 51, 3.4) + rock(1310, 1330, 70, -25, 52, 3) + rock(170, 1320, 60, 50, 53, 3);
  // dynamite bundle front left
  s += dynAt(400, 1650, -22, 450, [150, -380]);
  // front debris
  s += rock(1260, 1720, 90, 18, 61) + rock(960, 1900, 70, -20, 62) + rock(150, 1900, 100, 30, 63) + rock(1400, 1930, 80, 0, 64);
  s += gem(1130, 1820, 62, 'emerald', 12, 8, .9, true) + gem(260, 1850, 56, 'topaz', -20, 6, .9);
  // sparkles
  for (const [x, y, r] of [[560, 860, 46], [1000, 800, 38], [420, 1160, 30], [1220, 960, 40], [780, 1250, 34], [880, 1480, 36]]) s += sparkle(x, y, r, '#fff', .95);
  s += embers(70, 77, [0, 850, W, 1100], 6);
  // title
  s += `<g>${T.body}</g>`;
  s += vignette(W, H);
  s += `</g></svg>`;
  return s;
}

// =============== COVER 16:9 (1920 x 1080) ===============
function buildCover() {
  const W = 1920, H = 1080;
  const T = titleBlock([
    { id: 't1', text: 'THE', x: 630, y: 255, size: 84, ls: 46 },
    { id: 't2', text: 'UNLEASHED', x: 640, y: 470, size: 205, len: 960 },
    { id: 't3', text: 'MINE', x: 630, y: 690, size: 235, len: 640 },
  ]);
  const cx = 1430, cy = 560;
  let s = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`;
  s += `<title>The Unleashed Mine - cover art</title><defs>${commonDefs(W, H)}${defsCart()}${T.defs}`;
  s += `<radialGradient id="cav" gradientUnits="userSpaceOnUse" cx="${cx}" cy="${cy}" r="1300"><stop offset="0" stop-color="#ffb347"/><stop offset=".2" stop-color="#d4641a"/><stop offset=".45" stop-color="#6a2a48"/><stop offset=".72" stop-color="#2a1448"/><stop offset="1" stop-color="#0b0618"/></radialGradient>`;
  s += `<radialGradient id="vig" cx=".5" cy=".5" r=".78"><stop offset=".6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".7"/></radialGradient>`;
  s += `<linearGradient id="leftshade" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#05020c" stop-opacity=".8"/><stop offset=".7" stop-color="#05020c" stop-opacity=".5"/><stop offset="1" stop-color="#05020c" stop-opacity="0"/></linearGradient>`;
  s += `<clipPath id="all"><rect width="${W}" height="${H}"/></clipPath></defs><g clip-path="url(#all)">`;
  s += cavernBg(W, H, cx, cy, 8);
  s += rays(cx, cy, 1700, 30, 4, [0, Math.PI * 2], 0.5);
  s += `<rect x="0" y="0" width="1250" height="${H}" fill="url(#leftshade)"/>`;
  s += stalactites(W, 70, 21, 150, 120);
  s += crystalCluster(80, 330, 190, ['sapphire', 'amethyst'], 20, 5);
  s += crystalCluster(1850, 260, 190, ['emerald', 'topaz'], -25, 6);
  s += crystalCluster(900, 1060, 160, ['ruby', 'amethyst'], -5, 7);
  s += embers(40, 33, [0, 0, 1400, 700], 5);
  // glow & floor
  s += `<ellipse cx="${cx}" cy="${cy + 40}" rx="520" ry="330" fill="#fff2b0" opacity=".4" filter="url(#blur40)"/>`;
  s += `<path d="M0 940 Q${W / 2} 880 ${W} 940 L${W} ${H} L0 ${H}Z" fill="#150b10" stroke="#4a2a30" stroke-width="4"/>`;
  s += `<ellipse cx="${cx}" cy="960" rx="700" ry="90" fill="#ffb040" opacity=".35" filter="url(#blur40)"/>`;
  // wooden frame (left+right posts, top beam)
  s += post(0, 0, 110, H, true, 5) + post(W - 110, 0, 110, H, true, 6);
  s += post(0, 0, W, 96, false, 7);
  s += `<polygon points="110,96 330,96 110,310" fill="url(#woodH)" stroke="#1e0e04" stroke-width="6" filter="url(#grainH)"/><polygon points="${W - 110},96 ${W - 330},96 ${W - 110},310" fill="url(#woodH)" stroke="#1e0e04" stroke-width="6" filter="url(#grainH)"/>`;
  s += [60, 400, 1000, 1520, 1860].map((x) => bolt(x, 48, 13)).join('');
  s += ironStrap(20, 20, 70, 56).replace(/bolt/g, 'bolt');
  s += ironStrap(20, 760, 70, 130) + ironStrap(W - 90, 760, 70, 130) + ironStrap(W - 90, 150, 70, 130);
  // lantern
  s += `<line x1="1180" y1="96" x2="1180" y2="170" stroke="#120a06" stroke-width="7"/><circle cx="1180" cy="240" r="170" fill="url(#lamp)" style="mix-blend-mode:screen"/><rect x="1146" y="170" width="68" height="100" rx="12" fill="#2a1a0e" stroke="#0e0806" stroke-width="6"/><rect x="1158" y="185" width="44" height="70" rx="8" fill="#ffe27a"/><rect x="1140" y="158" width="80" height="18" rx="6" fill="url(#iron)" stroke="#0e0806" stroke-width="5"/>`;
  // debris behind cart
  s += rock(1700, 380, 62, 20, 41, 3.2) + rock(1150, 420, 52, -40, 42, 3) + rock(1830, 700, 46, 60, 43);
  s += gem(1250, 330, 50, 'emerald', 15, 8, .9, true) + gem(1760, 520, 54, 'ruby', -20, 8, .9, true) + gem(1560, 230, 44, 'sapphire', 22, 8, .9, true);
  // cart
  s += `<g transform="translate(${cx} 975)">${cart(640)}</g>`;
  s += gem(1290, 440, 74, 'amethyst', 18, 8, .92, true) + gem(1590, 400, 80, 'topaz', -12, 6, .95, true) + gem(1420, 300, 62, 'ruby', 30, 8, .9, true) + gem(1700, 300, 52, 'sapphire', 0, 8, .9, true) + gem(1130, 560, 48, 'emerald', 40, 8, .9, true);
  s += rock(1330, 540, 50, 40, 51, 3.4) + rock(1560, 600, 60, -25, 52, 3) + rock(1050, 330, 54, 50, 53, 3);
  // dynamite lower left
  s += dynAt(300, 905, -24, 270, [100, -235]);
  s += rock(880, 990, 76, 18, 61) + rock(150, 1010, 80, 30, 63) + rock(1810, 990, 70, 0, 64) + rock(1160, 1030, 52, 40, 65);
  s += gem(1020, 960, 52, 'emerald', 12, 8, .9, true) + gem(560, 1000, 44, 'topaz', -20, 6, .9);
  for (const [x, y, r] of [[1060, 260, 40], [1500, 500, 34], [1220, 640, 30], [1850, 480, 36], [1370, 180, 30]]) s += sparkle(x, y, r, '#fff', .95);
  s += embers(60, 78, [0, 100, W, 900], 6);
  s += `<g>${T.body}</g>`;
  s += vignette(W, H);
  s += `</g></svg>`;
  return s;
}

fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'tile_3x4.svg'), buildTile());
fs.writeFileSync(path.join(out, 'cover_16x9.svg'), buildCover());
console.log('wrote svgs to', out);
