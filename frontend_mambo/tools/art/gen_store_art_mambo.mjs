// Store art for AGENT MAMBO (1960s spy-jazz cartoon). Hand-built SVG, no generative AI.
// Usage: node gen_store_art_mambo.mjs <storeDir>   (writes tile_3x4.svg, cover_16x9.svg)
// Mascot: baked fragments from mambo_poses.json (bake_mambo.mjs). Props: the real in-game symbols (src/render/symbols.js).
// Logo: same drawing as src/render/logo.js 'stack' (re-implemented here because logo.js does not export build()).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { symbolMarkup } from '../../src/render/symbols.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const OUT = process.argv[2] || path.join(here, '../../assets/store');
const POSES = JSON.parse(fs.readFileSync(path.join(here, 'mambo_poses.json'), 'utf8')).poses;

const INK = '#14102B', INDIGO = '#2B2A6B', TEAL = '#1FB5A3', CORAL = '#F0472F', FLAM = '#F5799F', LEMON = '#FFD23F',
  PAPER = '#FBF1D9', LILAC = '#9A7BD0', LIME = '#A5D63B', STEEL = '#6FA7D9', BG = '#181640', BRASS = '#E8A92B', AUB = '#3B1F52';
const FONT = "'Arial Black','Futura','Century Gothic','Arial Rounded MT Bold','DejaVu Sans',Verdana,sans-serif";
const f = (n) => Math.round(n * 100) / 100;
let UID = 0;
const uid = (p) => `${p}${++UID}`;
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// ---------- primitives ----------
const OFF = 2.2;
const T = (d, fill, sw = 3.4, o = {}) =>
  `<path d="${d}" fill="${fill}" transform="translate(${OFF} ${OFF})"/>` + (o.ht ? `<path d="${d}" fill="url(#ht)" transform="translate(${OFF} ${OFF})"/>` : '') +
  `<path d="${d}" fill="none" stroke="${INK}" stroke-width="${sw}" stroke-linejoin="round" stroke-linecap="round"/>`;
const ELL = (cx, cy, rx, ry) => `M${f(cx - rx)} ${cy}A${rx} ${ry} 0 1 0 ${f(cx + rx)} ${cy}A${rx} ${ry} 0 1 0 ${f(cx - rx)} ${cy}Z`;
const RR = (x, y, w, h, r) => `M${x + r} ${y}H${x + w - r}Q${x + w} ${y} ${x + w} ${y + r}V${y + h - r}Q${x + w} ${y + h} ${x + w - r} ${y + h}H${x + r}Q${x} ${y + h} ${x} ${y + h - r}V${y + r}Q${x} ${y} ${x + r} ${y}Z`;
function starPts(cx, cy, n, ro, ri, rot = -Math.PI / 2, jit = 0, r = null) {
  const p = [];
  for (let i = 0; i < n * 2; i++) {
    const a = rot + (i * Math.PI) / n, rr = (i % 2 ? ri : ro) * (1 + (jit && r ? (r() - .5) * jit : 0));
    p.push([cx + rr * Math.cos(a), cy + rr * Math.sin(a)]);
  }
  return p;
}
const poly = (pts) => 'M' + pts.map((q) => `${f(q[0])} ${f(q[1])}`).join('L') + 'Z';
const spark4 = (x, y, r, fill = PAPER, sw = 2.4) => T(`M${x} ${y - r}L${f(x + r * .26)} ${f(y - r * .26)}L${x + r} ${y}L${f(x + r * .26)} ${f(y + r * .26)}L${x} ${y + r}L${f(x - r * .26)} ${f(y + r * .26)}L${x - r} ${y}L${f(x - r * .26)} ${f(y - r * .26)}Z`, fill, sw);
const plain4 = (x, y, r, fill) => `<path d="M${x} ${y - r}L${f(x + r * .24)} ${f(y - r * .24)}L${x + r} ${y}L${f(x + r * .24)} ${f(y + r * .24)}L${x} ${y + r}L${f(x - r * .24)} ${f(y + r * .24)}L${x - r} ${y}L${f(x - r * .24)} ${f(y - r * .24)}Z" fill="${fill}"/>`;
const boomerang = (x, y, s, rot, fill) => `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})"><path d="M-30 -6Q-8 -34 30 -18Q6 -16 -2 8Q-8 24 -30 6Z" fill="${fill}"/></g>`;
const amoeba = (x, y, s, rot, fill) => `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})"><path d="M-22 -4Q-26 -22 -6 -20Q8 -30 20 -14Q34 -2 18 10Q10 26 -8 18Q-30 22 -22 -4Z" fill="${fill}"/></g>`;
const text = (str, x, y, size, o = {}) =>
  `<text x="${x}" y="${y}" text-anchor="middle" font-family="${FONT}" font-weight="900" font-size="${size}"${o.len ? ` textLength="${o.len}" lengthAdjust="spacingAndGlyphs"` : ''}${o.rot ? ` transform="rotate(${o.rot} ${x} ${y})"` : ''} fill="${o.fill || PAPER}" stroke="${o.stroke || INK}" stroke-width="${o.sw || size * .16}" paint-order="stroke" stroke-linejoin="round">${str}</text>`;

const DEFS = `
<pattern id="ht" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(30)"><circle cx="3" cy="3" r="1.3" fill="${INK}" opacity=".32"/></pattern>
<pattern id="htl" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(30)"><circle cx="3.5" cy="3.5" r="1.5" fill="${LILAC}" opacity=".55"/></pattern>
<pattern id="htc" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(30)"><circle cx="3.5" cy="3.5" r="1.6" fill="#FFFFFF" opacity=".5"/></pattern>
<pattern id="mb-ht" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(32)"><circle cx="2.5" cy="2.5" r="1.25" fill="${INK}" opacity=".4"/></pattern>
<pattern id="mb-ht2" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(32)"><circle cx="2" cy="2" r="1" fill="${INK}" opacity=".28"/></pattern>
<filter id="rim" x="-10%" y="-10%" width="120%" height="120%"><feMorphology in="SourceAlpha" operator="dilate" radius="2.6" result="d"/><feFlood flood-color="${PAPER}"/><feComposite in2="d" operator="in" result="r"/><feMerge><feMergeNode in="r"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
<filter id="rimk" x="-10%" y="-10%" width="120%" height="120%"><feMorphology in="SourceAlpha" operator="dilate" radius="2" result="d"/><feFlood flood-color="${INK}"/><feComposite in2="d" operator="in" result="r"/><feMerge><feMergeNode in="r"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`;
const STYLE = `<style>.mb-open{display:none}</style>`;

// ---------- mascot + symbols ----------
// baked fragment viewBox -20 -24 240 280, feet centre (100,249)
const mambo = (pose, x, y, h, rim = true, flip = 1) => {
  const k = h / 280;
  return `<g ${rim ? 'filter="url(#rim)" ' : ''}transform="translate(${x} ${y}) scale(${f(k * flip)} ${f(k)}) translate(-100 -249)">${POSES[pose]}</g>`;
};
const symInner = (name) => symbolMarkup(name).replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
const sym = (name, x, y, size, rot = 0, rim = 'rim') =>
  `<g filter="url(#${rim})" transform="translate(${x} ${y}) rotate(${rot}) scale(${f(size / 100)}) translate(-50 -50)">${symInner(name)}</g>`;

// ---------- logo (copy of the logo.js 'stack' drawing, drawn at 300x190) ----------
const LW = { A: .76, G: .82, E: .66, N: .82, T: .7, M: .92, B: .76, O: .84 };
const BOUNCE = [-3, 2.5, -2, 3, -2.5];
function lword(txt, cx, y, size, gap, tilt, fill) {
  const lens = [...txt].map((ch) => f(LW[ch] * size)); const total = lens.reduce((a, b) => a + b, 0) + gap * (lens.length - 1);
  let x = cx - total / 2; const out = [];
  [...txt].forEach((ch, i) => {
    const cxl = x + lens[i] / 2; x += lens[i] + gap;
    const rot = tilt + BOUNCE[i % 5] * size / 60, dy = (i % 2 ? -1 : 1) * size * .018;
    out.push({ ch, x: f(cxl), y: f(y + dy), len: lens[i], size, rot: f(rot), cx, cy: y, tilt, fill });
  });
  return { letters: out, size, y };
}
const lAttrs = (l) => `x="${l.x}" y="${l.y}" text-anchor="middle" font-family="${FONT}" font-weight="900" font-size="${l.size}" textLength="${l.len}" lengthAdjust="spacingAndGlyphs" transform="rotate(${l.rot} ${l.x} ${f(l.y - l.size * .3)})"`;
function logoMarkup() {
  const id = uid('lg');
  const a = lword('AGENT', 150, 74, 35, 3, -4, LEMON), m = lword('MAMBO', 150, 138, 62, 2.5, 0, CORAL);
  const L = [a, m].flatMap((w) => w.letters);
  const wr = (l, inner) => `<g transform="rotate(${l.tilt} ${l.cx} ${l.cy})">${inner}</g>`;
  const sh = [5, 6];
  const txt = (l, at) => wr(l, `<text ${lAttrs(l)} ${at}>${l.ch}</text>`);
  const pts = []; for (let i = 0; i < 28; i++) { const ang = .06 + (i / 28) * Math.PI * 2, k = i % 2 ? .8 : 1; pts.push(`${f(150 + Math.cos(ang) * 148 * k)},${f(98 + Math.sin(ang) * 88 * k)}`); }
  const bp = pts.join(' ');
  const bg = `<polygon points="${bp}" fill="${LEMON}" transform="translate(3 3)"/><polygon points="${bp}" fill="url(#${id}h)" transform="translate(3 3)" opacity=".5"/><polygon points="${bp}" fill="none" stroke="${INK}" stroke-width="4.5" stroke-linejoin="round"/>`;
  const shadow = L.map((l) => wr(l, `<g transform="translate(${sh[0]} ${sh[1]})"><text ${lAttrs(l)} fill="${INDIGO}" stroke="${INDIGO}" stroke-width="15" stroke-linejoin="round">${l.ch}</text></g>`)).join('');
  const outer = L.map((l) => txt(l, `fill="${INK}" stroke="${INK}" stroke-width="12.5" stroke-linejoin="round"`)).join('');
  const cream = L.map((l) => txt(l, `fill="${PAPER}" stroke="${PAPER}" stroke-width="6.2" stroke-linejoin="round"`)).join('');
  const fill = L.map((l) => wr(l, `<g transform="translate(1.6 1.3)"><text ${lAttrs(l)} fill="${l.fill}" stroke="${INK}" stroke-width="1.3" stroke-linejoin="round">${l.ch}</text></g>`)).join('');
  const clip = `<clipPath id="${id}c">${L.map((l) => wr(l, `<text ${lAttrs(l)}>${l.ch}</text>`)).join('')}</clipPath>`;
  const ht = `<g clip-path="url(#${id}c)"><rect x="-20" y="${f(m.y - m.size * .3)}" width="700" height="200" fill="url(#${id}h)"/></g>`;
  const o = m.letters[4];
  const clk = bombClockSmall(o.x + o.len * .46, o.y - o.size * .86, 11);
  const stars = spark4(272, 40, 12, PAPER, 2) + spark4(30, 158, 8, PAPER, 2);
  return `<defs><pattern id="${id}h" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(30)"><circle cx="3" cy="3" r="1.4" fill="${INK}" opacity=".38"/></pattern></defs>${bg}${clip}${shadow}${outer}${cream}${fill}${ht}${clk}${stars}`;
}
function bombClockSmall(x, y, r) {
  return `<g transform="translate(${f(x)} ${f(y)})">
    <circle cx="${f(-r * .78)}" cy="${f(-r * .78)}" r="${f(r * .42)}" fill="${CORAL}" stroke="${INK}" stroke-width="2.4"/><circle cx="${f(r * .78)}" cy="${f(-r * .78)}" r="${f(r * .42)}" fill="${CORAL}" stroke="${INK}" stroke-width="2.4"/>
    <circle r="${r}" fill="${PAPER}" stroke="${INK}" stroke-width="3.6"/><circle r="${f(r * .8)}" fill="none" stroke="${CORAL}" stroke-width="1.6"/>
    <path d="M0 ${f(-r * .62)}V0" stroke="${INK}" stroke-width="2.6" stroke-linecap="round"/><path d="M0 0L${f(r * .46)} ${f(r * .1)}" stroke="${INK}" stroke-width="2.6" stroke-linecap="round"/><circle r="2" fill="${INK}"/>
    <path d="M0 ${f(-r - 1)}V${f(-r - 6)}" stroke="${INK}" stroke-width="2.4" stroke-linecap="round"/>${spark4(0, f(-r - 9), 5.4, PAPER, 2)}</g>`;
}
// logo placed with its centre at (cx,cy), scaled so the 300x190 box is `w` wide, tilted
const logo = (cx, cy, w, rot = 0) => `<g transform="translate(${cx} ${cy}) rotate(${rot}) scale(${f(w / 300)}) translate(-150 -95)">${logoMarkup()}</g>`;

// ---------- the bomb-timer alarm clock ----------
function alarmClock(x, y, r, rot = 0, withWire = true) {
  const bell = (s) => `<g transform="rotate(${s * 42})"><path d="M${f(-r * .36)} ${f(-r * 1.0)}Q0 ${f(-r * 1.5)} ${f(r * .36)} ${f(-r * 1.0)}Z" fill="${TEAL}" stroke="${INK}" stroke-width="${f(r * .075)}" stroke-linejoin="round"/><path d="M0 ${f(-r * 1.4)}V${f(-r * 1.52)}" stroke="${INK}" stroke-width="${f(r * .09)}" stroke-linecap="round"/></g>`;
  const ticks = [...Array(12)].map((_, i) => { const a = (i * Math.PI) / 6; const r1 = r * (i % 3 ? .66 : .6), r2 = r * .74; return `<path d="M${f(Math.sin(a) * r1)} ${f(-Math.cos(a) * r1)}L${f(Math.sin(a) * r2)} ${f(-Math.cos(a) * r2)}" stroke="${INK}" stroke-width="${f(r * (i % 3 ? .04 : .075))}" stroke-linecap="round"/>`; }).join('');
  let g = `<g transform="translate(${x} ${y}) rotate(${rot})">`;
  g += `<path d="M${f(-r * .62)} ${f(r * .78)}L${f(-r * .86)} ${f(r * 1.12)}M${f(r * .62)} ${f(r * .78)}L${f(r * .86)} ${f(r * 1.12)}" stroke="${INK}" stroke-width="${f(r * .22)}" stroke-linecap="round"/><path d="M${f(-r * .62)} ${f(r * .78)}L${f(-r * .86)} ${f(r * 1.12)}M${f(r * .62)} ${f(r * .78)}L${f(r * .86)} ${f(r * 1.12)}" stroke="${LEMON}" stroke-width="${f(r * .1)}" stroke-linecap="round"/>`;
  g += bell(-1) + bell(1);
  g += `<path d="M0 ${f(-r * 1.0)}V${f(-r * 1.18)}" stroke="${INK}" stroke-width="${f(r * .12)}" stroke-linecap="round"/>`;
  g += `<circle r="${r}" fill="${CORAL}" transform="translate(${f(r * .05)} ${f(r * .05)})"/><circle r="${r}" fill="url(#ht)" transform="translate(${f(r * .05)} ${f(r * .05)})"/><circle r="${r}" fill="none" stroke="${INK}" stroke-width="${f(r * .09)}"/>`;
  g += `<circle r="${f(r * .8)}" fill="${PAPER}" stroke="${INK}" stroke-width="${f(r * .06)}"/>`;
  g += `<path d="M${f(r * .62)} ${f(-r * .1)}A${f(r * .8)} ${f(r * .8)} 0 0 1 ${f(r * .1)} ${f(r * .8)}Q${f(r * .7)} ${f(r * .5)} ${f(r * .62)} ${f(-r * .1)}Z" fill="url(#ht)"/>`;
  g += ticks;
  g += `<path d="M0 0L${f(-r * .12)} ${f(-r * .5)}" stroke="${INK}" stroke-width="${f(r * .1)}" stroke-linecap="round"/><path d="M0 0L${f(r * .3)} ${f(-r * .3)}" stroke="${INK}" stroke-width="${f(r * .08)}" stroke-linecap="round"/><path d="M0 0L${f(-r * .1)} ${f(r * .56)}" stroke="${CORAL}" stroke-width="${f(r * .045)}" stroke-linecap="round"/><circle r="${f(r * .09)}" fill="${INK}"/>`;
  g += `<path d="M${f(-r * .55)} ${f(-r * .42)}Q${f(-r * .5)} ${f(-r * .6)} ${f(-r * .3)} ${f(-r * .68)}" fill="none" stroke="#fff" stroke-width="${f(r * .07)}" stroke-linecap="round"/>`;
  if (withWire) {
    g += `<path d="M${f(r * .97)} ${f(r * .15)}Q${f(r * 1.5)} ${f(r * .3)} ${f(r * 1.45)} ${f(r * .8)}T${f(r * 1.9)} ${f(r * 1.0)}" fill="none" stroke="${INK}" stroke-width="${f(r * .13)}" stroke-linecap="round"/><path d="M${f(r * .97)} ${f(r * .15)}Q${f(r * 1.5)} ${f(r * .3)} ${f(r * 1.45)} ${f(r * .8)}T${f(r * 1.9)} ${f(r * 1.0)}" fill="none" stroke="${LEMON}" stroke-width="${f(r * .05)}" stroke-linecap="round" stroke-dasharray="${f(r * .12)} ${f(r * .1)}"/>`;
    g += spark4(f(r * 1.95), f(r * 1.0), f(r * .3), LEMON, 2.4);
  }
  return g + '</g>';
}

// ---------- comic bursts ----------
function comicBurst(cx, cy, ro, label, o = {}) {
  const r = rng(o.seed || 7), n = o.n || 12;
  const pts = starPts(cx, cy, n, ro, ro * .62, -Math.PI / 2 + (o.rot || 0), .28, r);
  const pts2 = starPts(cx, cy, n, ro * .78, ro * .5, -Math.PI / 2 + (o.rot || 0) + .12, .2, r);
  let g = `<path d="${poly(pts)}" fill="${INK}" transform="translate(${f(ro * .07)} ${f(ro * .08)})"/>`;
  g += T(poly(pts), o.col || LEMON, f(ro * .045 + 1.5), { ht: 1 });
  g += `<path d="${poly(pts2)}" fill="${o.col2 || CORAL}" stroke="${INK}" stroke-width="${f(ro * .03 + 1)}" stroke-linejoin="round"/>`;
  const fs = o.fs || ro * .34;
  const lines = label.split('|');
  lines.forEach((ln, i) => {
    const y = cy + (i - (lines.length - 1) / 2) * fs * 1.0 + fs * .34;
    g += text(ln, cx, f(y), fs, { fill: PAPER, sw: fs * .2, len: o.len ? o.len[i] : undefined, rot: o.trot || 0 });
  });
  return g;
}

// ---------- scenery ----------
const star4Field = (r, W, H, n, yMax) => {
  let g = '';
  for (let i = 0; i < n; i++) {
    const x = r() * W, y = r() * yMax, s = 6 + r() * 12, k = r();
    g += k < .55 ? plain4(f(x), f(y), f(s), k < .3 ? PAPER : LEMON) : k < .75 ? boomerang(f(x), f(y), f(.5 + r() * .5), f(r() * 360), k < .65 ? LILAC : FLAM) : amoeba(f(x), f(y), f(.4 + r() * .4), f(r() * 360), k < .9 ? LILAC : LEMON);
  }
  return g;
};
function blinds(W, H, angle = -24, w = 46, gap = 112, op = .085) {
  let g = `<g transform="rotate(${angle} ${W / 2} ${H / 2})" opacity="${op}" fill="${PAPER}">`;
  for (let x = -W; x < W * 2; x += gap) g += `<rect x="${x}" y="${-H}" width="${w}" height="${H * 3}"/>`;
  return g + '</g>';
}
function skyline(W, baseY, maxH, seed, fill, windows, o = {}) {
  const r = rng(seed); let x = -20, g = '', wins = '', roofs = '';
  while (x < W + 20) {
    const w = (o.minW || 38) + r() * (o.varW || 60), h = maxH * (.35 + r() * .65);
    g += `<rect x="${f(x)}" y="${f(baseY - h)}" width="${f(w)}" height="${h + 40}" fill="${fill}"/>`;
    if (r() < .35) g += `<rect x="${f(x + w * .4)}" y="${f(baseY - h - 18)}" width="3" height="18" fill="${fill}"/><circle cx="${f(x + w * .4 + 1.5)}" cy="${f(baseY - h - 18)}" r="3.5" fill="${CORAL}"/>`;
    if (r() < .25) g += `<path d="M${f(x + w * .2)} ${f(baseY - h)}h${f(w * .6)}l-6 -14h${f(-w * .6 + 12)}z" fill="${fill}"/>`;
    if (windows) for (let wy = baseY - h + 10; wy < baseY - 8; wy += 15) for (let wx = x + 6; wx < x + w - 8; wx += 12) if (r() < (o.density || .2)) wins += `<rect x="${f(wx)}" y="${f(wy)}" width="${o.ws || 6}" height="${o.wh || 8}" fill="${LEMON}" opacity="${r() < .2 ? 1 : .85}"/>`;
    x += w + (o.gap ?? 0) + r() * 4;
  }
  return g + wins + roofs;
}
function clubSign(x, y, s) {
  return `<g transform="translate(${x} ${y}) scale(${s})"><rect x="-4" y="0" width="5" height="30" fill="${INK}"/><rect x="-46" y="-26" width="92" height="30" rx="8" fill="${INK}" transform="translate(3 3)"/><rect x="-46" y="-26" width="92" height="30" rx="8" fill="${CORAL}" stroke="${INK}" stroke-width="3"/>
  <rect x="-40" y="-20" width="80" height="18" rx="5" fill="none" stroke="${PAPER}" stroke-width="1.6" stroke-dasharray="3 3"/>${text('CLUB', 0, -5, 17, { fill: PAPER, sw: 3.4, len: 62 })}</g>`;
}
function crescent(cx, cy, R, fill) {
  const id = uid('cr');
  return `<mask id="${id}"><rect x="${cx - R * 2}" y="${cy - R * 2}" width="${R * 4}" height="${R * 4}" fill="#fff"/><circle cx="${cx - R * .42}" cy="${cy - R * .12}" r="${R * .86}" fill="#000"/></mask>
  <g mask="url(#${id})"><circle cx="${cx}" cy="${cy}" r="${R}" fill="${fill}"/><circle cx="${cx}" cy="${cy}" r="${R}" fill="url(#htl)" opacity=".5" transform="translate(-14 14)"/></g>`;
}
const sputnik = (x, y, s, rot) => `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})"><path d="M-34 -22L34 22M-34 22L34 -22M-40 0H40" stroke="${INK}" stroke-width="7" stroke-linecap="round"/><path d="M-34 -22L34 22M-34 22L34 -22M-40 0H40" stroke="${PAPER}" stroke-width="3" stroke-linecap="round"/>${T(ELL(0, 0, 15, 15), STEEL, 4)}<circle cx="-5" cy="-5" r="4" fill="#fff"/></g>`;
function lightStarburst(cx, cy, R, n, fill) {
  const pts = starPts(cx, cy, n, R, R * .72, -Math.PI / 2 + .05);
  return `<path d="${poly(pts)}" fill="${INK}" opacity=".35" transform="translate(6 8)"/>` + T(poly(pts), fill, 4, { ht: 0 }) + `<path d="${poly(pts)}" fill="url(#htc)" opacity=".7" clip-path="none" transform="translate(${OFF} ${OFF})"/>`;
}

// =============================================================== TILE 3:4 (768x1024 user units, rendered at 2x)
function tile() {
  const W = 768, H = 1024, r = rng(11);
  let s = `<svg xmlns="http://www.w3.org/2000/svg" width="1536" height="2048" viewBox="0 0 ${W} ${H}" role="img" aria-label="Agent Mambo">${STYLE}<defs>${DEFS}</defs>`;
  s += `<rect width="${W}" height="${H}" fill="${BG}"/>`;
  // stepped flat glow behind the heroine (no gradients)
  s += `<circle cx="384" cy="600" r="470" fill="#1C1A4A"/><circle cx="384" cy="600" r="360" fill="#211F58"/><circle cx="384" cy="600" r="250" fill="#27256A" opacity=".8"/>`;
  s += star4Field(r, W, H, 34, 700);
  s += crescent(640, 168, 205, '#FFF1A8');
  s += sputnik(130, 400, .9, -18);
  s += blinds(W, H);
  // far skyline + neon sign
  s += skyline(W, 930, 250, 5, '#23226A', true, { density: .14, minW: 46, varW: 60 });
  s += clubSign(642, 705, .95);
  s += skyline(W, 990, 150, 9, '#100C2B', true, { density: .22, minW: 50, varW: 70 });
  // cream starburst behind Mambo
  s += lightStarburst(384, 640, 300, 18, PAPER);
  // props behind and around
  // Mambo (bigwin)
  s += mambo('bigwin', 384, 968, 700, false);
  s += sym('H3', 96, 520, 160, -12);
  s += sym('S', 668, 452, 170, 9);
  s += sym('L1', 100, 700, 120, -14);
  s += sym('L3', 676, 730, 118, 12);
  // foreground rooftop, safe + bongos on it
  s += `<path d="M0 960H${W}V${H}H0Z" fill="${INK}"/><path d="M0 960H${W}" stroke="${INDIGO}" stroke-width="4"/>`;
  for (let x = 12; x < W; x += 24) s += `<rect x="${x}" y="976" width="10" height="14" fill="${LEMON}" opacity=".55"/>`;
  s += sym('H1', 118, 872, 210, -7);
  s += sym('H4', 656, 872, 210, 8);
  // bomb clock between the safe and Mambo
  s += alarmClock(236, 905, 46, -10, false);
  // comic bursts
  s += comicBurst(640, 590, 84, 'KA-|BOOM!', { seed: 3, n: 11, trot: -8, fs: 32, len: [74, 116] });
  s += spark4(40, 300, 14, PAPER, 3) + spark4(716, 350, 10, LEMON, 3) + spark4(60, 960, 12, PAPER, 3);
  // logo on top
  s += logo(384, 196, 630, 0);
  return s + '</svg>';
}

// =============================================================== COVER 16:9 (960x540 user units, rendered at 2x)
function cover() {
  const W = 960, H = 540, r = rng(23);
  let s = `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 ${W} ${H}" role="img" aria-label="Agent Mambo">${STYLE}<defs>${DEFS}</defs>`;
  s += `<rect width="${W}" height="${H}" fill="${BG}"/>`;
  s += `<circle cx="200" cy="300" r="330" fill="#1C1A4A"/><circle cx="200" cy="300" r="230" fill="#211F58"/>`;
  s += star4Field(r, W, H, 30, 330);
  s += crescent(330, 120, 100, '#FFF1A8');
  s += sputnik(560, 70, .55, 14);
  s += blinds(W, H, -24, 34, 92);
  s += skyline(W, 470, 170, 31, '#23226A', true, { density: .14 });
  s += skyline(W, 520, 90, 41, '#100C2B', true, { density: .22 });
  // lair band on top
  s += `<rect x="0" y="0" width="${W}" height="30" fill="${TEAL}"/><rect x="0" y="0" width="${W}" height="30" fill="url(#ht)"/><path d="M0 30H${W}" stroke="${INK}" stroke-width="4"/>`;
  for (let x = 14; x < W; x += 40) s += `<circle cx="${x}" cy="15" r="4.2" fill="${LEMON}" stroke="${INK}" stroke-width="2"/>`;
  s += `<path d="M0 30H${W}V34H0Z" fill="${INK}" opacity=".0"/>`;
  // radar wedge + alarm lamp (lair)
  s += `<path d="M880 30L770 30L825 130Z" fill="${LIME}" opacity=".0"/>`;
  s += `<g transform="translate(906 14)"><circle r="11" fill="${CORAL}" stroke="${INK}" stroke-width="3"/><circle r="4" cx="-3" cy="-3" fill="#fff" opacity=".8"/></g>`;
  // mascot + starburst
  s += lightStarburst(190, 340, 200, 18, PAPER);
  s += mambo('plunger', 170, 522, 372);
  s += sym('H3', 44, 250, 86, -12);
  s += sym('L1', 330, 258, 74, 14);
  // logo
  s += logo(190, 118, 360, 0);
  s += sym('H1', 46, 488, 84, -8);
  // board
  const BX = 444, BY = 78, C = 80, bw = C * 6, bh = C * 5, P = 12;
  const px = BX - P, py = BY - P;
  s += `<rect x="${px + 5}" y="${py + 6}" width="${bw + 2 * P}" height="${bh + 2 * P}" rx="16" fill="${INK}"/>`;
  s += `<rect x="${px}" y="${py}" width="${bw + 2 * P}" height="${bh + 2 * P}" rx="16" fill="${INDIGO}" stroke="${INK}" stroke-width="6"/>`;
  s += `<rect x="${px + 4}" y="${py + 4}" width="${bw + 2 * P - 8}" height="${bh + 2 * P - 8}" rx="13" fill="none" stroke="${TEAL}" stroke-width="5"/>`;
  s += `<rect x="${px + 7}" y="${py + 7}" width="${bw + 2 * P - 14}" height="${bh + 2 * P - 14}" rx="11" fill="none" stroke="${INK}" stroke-width="2"/>`;
  const grid = [
    ['L1', 'H3', 'L3', 'X', 'H1', 'L4'],
    ['H4', 'H3', 'L2', 'L2', 'H1', 'H1'],
    ['H4', 'L1', 'L2', 'S', 'H1', 'L3'],
    ['L3', 'L4', 'H3', 'L2', 'L4', 'H4'],
    ['L1', 'H4', null, 'X', 'L3', 'L1'],
  ];
  const cc = (c, rr) => [BX + c * C + C / 2, BY + rr * C + C / 2];
  grid.forEach((row, rr) => row.forEach((k, c) => {
    const [x, y] = cc(c, rr);
    s += `<rect x="${x - C / 2 + 3}" y="${y - C / 2 + 3}" width="${C - 6}" height="${C - 6}" rx="9" fill="#1D1B58" stroke="${INK}" stroke-width="2.4"/>`;
  }));
  // wire path: Z through cell centres
  const z = [cc(0, 0), cc(5, 0), cc(0, 4), cc(5, 4)];
  const wirePath = `M${z[0].join(' ')}L${z[1].join(' ')}L${z[2].join(' ')}L${z[3].join(' ')}`;
  const symLayer = [];
  grid.forEach((row, rr) => row.forEach((k, c) => {
    const [x, y] = cc(c, rr);
    if (k && k !== 'X') symLayer.push(sym(k, x, y, 70, ((c * 7 + rr * 5) % 7 - 3) * 1.1, 'rimk'));
  }));
  s += symLayer.join('');
  // the wire, burnt (dark) to the first blast then lit
  s += `<path d="${wirePath}" fill="none" stroke="${INK}" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/>`;
  s += `<path d="${wirePath}" fill="none" stroke="${CORAL}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>`;
  s += `<path d="${wirePath}" fill="none" stroke="${LEMON}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="9 7"/>`;
  s += `<path d="M${z[0].join(' ')}L${cc(2.5, 0).join(' ')}" fill="none" stroke="#3A3358" stroke-width="6" stroke-linecap="round"/><path d="M${z[0].join(' ')}L${cc(2.5, 0).join(' ')}" fill="none" stroke="${INK}" stroke-width="2.6" stroke-linecap="round" stroke-dasharray="3 6"/>`;
  [z[0], z[1], z[2], z[3]].forEach(([x, y]) => (s += `<circle cx="${x}" cy="${y}" r="7" fill="${LEMON}" stroke="${INK}" stroke-width="3"/>`));
  // blasts
  const b1 = cc(3, 0), b2 = cc(3, 4);
  s += comicBurst(b1[0], b1[1] + 4, 56, 'POW!', { seed: 5, n: 9, fs: 21, trot: -8, len: [64] });
  s += comicBurst(b2[0], b2[1] - 2, 56, 'ZAP!', { seed: 9, n: 10, col: FLAM, col2: LEMON, fs: 21, trot: 7, len: [60] });
  s += spark4(cc(2.5, 0)[0] - 4, cc(2.5, 0)[1] - 6, 14, PAPER, 3);
  // meter badge on the board edge
  const mx = px + bw + 2 * P - 30, my = py + 2;
  const mb = starPts(mx, my, 10, 44, 36, -Math.PI / 2);
  s += `<path d="${poly(mb)}" fill="${INK}" transform="translate(5 6)"/>` + T(poly(mb), LEMON, 4.5, { ht: 1 });
  s += `<circle cx="${mx}" cy="${my}" r="28" fill="${CORAL}" stroke="${INK}" stroke-width="3.4"/>` + text('x12', mx, my + 10, 28, { fill: PAPER, sw: 6, len: 46 });
  // bomb clock at the board's bottom-left edge, wire running into the board
  s += alarmClock(px + 4, py + bh + 2 * P - 28, 40, -8, true);
  s += spark4(914, 420, 12, PAPER, 3) + spark4(446, 28 + 12, 9, LEMON, 3);
  return s + '</svg>';
}

fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'tile_3x4.svg'), tile());
fs.writeFileSync(path.join(OUT, 'cover_16x9.svg'), cover());
console.log('wrote svgs to', OUT);
