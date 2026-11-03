// Direction B "Atomic Lounge": shared scene pieces (stage, curtains, atomic wallpaper, marquee frame, logo, buttons).
// Hand-written SVG strings, closed palette from symbols_b.js. No bitmaps, no gradients except one blur filter for bulb glow.
import { C, starPts, rays, letters } from './symbols_b.js';
const { ink, abyss, teal, turq, gold, goldL, cream, paper, brick } = C;
const r1 = (n) => Math.round(n * 10) / 10;
let seed = 5; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

export function sceneDefs() {
  return `
  <filter id="bulbGlow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="3.2"/></filter>
  <filter id="softGlow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="14"/></filter>
  <pattern id="htDark" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(30)"><circle cx="4.5" cy="4.5" r="1.7" fill="${ink}" opacity=".3"/></pattern>
  <pattern id="htLight" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(30)"><circle cx="4.5" cy="4.5" r="1.5" fill="${goldL}" opacity=".16"/></pattern>
  <pattern id="atomic" width="150" height="130" patternUnits="userSpaceOnUse">
    <path d="M20 30Q40 6 64 22Q44 22 34 40Q30 30 20 30Z" fill="${turq}" opacity=".27"/>
    <path d="${starPts(108, 34, 13, 3.4, 4)}" fill="${goldL}" opacity=".27"/>
    <path d="${starPts(108, 34, 7, 2, 4, -45)}" fill="${goldL}" opacity=".20"/>
    <g fill="${turq}" opacity=".37"><circle cx="58" cy="82" r="4"/><circle cx="72" cy="94" r="2.6"/><circle cx="46" cy="98" r="2"/></g>
    <path d="M60 82L72 94M60 82L46 98" stroke="${turq}" stroke-width="1.6" opacity=".34"/>
    <path d="M100 96Q124 84 140 104Q120 100 112 118Q110 104 100 96Z" fill="${turq}" opacity=".20"/>
    <path d="${starPts(18, 110, 6, 1.8, 4)}" fill="${cream}" opacity=".24"/>
  </pattern>`;
}

// back wall + atomic wallpaper + stage floor
export function stage(W, H, floorY, o = {}) {
  let s = `<rect width="${W}" height="${H}" fill="${abyss}"/>`;
  s += `<rect width="${W}" height="${floorY}" fill="${teal}"/><rect width="${W}" height="${floorY}" fill="url(#atomic)"/>`;
  // wall panels: vertical slats (mid-century wood-slat wall in teal values)
  for (let x = 0; x < W; x += o.slat || 64) s += `<path d="M${x} 0V${floorY}" stroke="${abyss}" stroke-width="2" opacity=".35"/>`;
  // big soft starburst behind the board (the "neon" glow of the lounge)
  if (o.burst) { const [bx, by, br] = o.burst; s += `<g opacity=".9">${rays(bx, by, br, 28, goldL, 0.07, 3)}</g><circle cx="${bx}" cy="${by}" r="${br * 0.55}" fill="${turq}" opacity=".18" filter="url(#softGlow)"/>`; }
  // floor: polished stage, boards + halftone
  s += `<rect x="0" y="${floorY}" width="${W}" height="${H - floorY}" fill="${abyss}"/>`;
  s += `<path d="M0 ${floorY}H${W}" stroke="${gold}" stroke-width="5"/><path d="M0 ${floorY + 3}H${W}" stroke="${ink}" stroke-width="2"/>`;
  for (let i = 1; i < 5; i++) { const y = floorY + (H - floorY) * (i / 5) ** 1.3; s += `<path d="M0 ${r1(y)}H${W}" stroke="${teal}" stroke-width="2" opacity=".8"/>`; }
  s += `<rect x="0" y="${floorY}" width="${W}" height="${H - floorY}" fill="url(#htLight)"/>`;
  return s;
}

// spotlight pool: concentric flat discs (print look, no gradient)
export function spotlight(cx, cy, R, beamTopX) {
  let s = '';
  if (beamTopX != null) s += `<path d="M${beamTopX - 26} -10L${beamTopX + 26} -10L${cx + R * 0.95} ${cy + R * 0.2}L${cx - R * 0.95} ${cy + R * 0.2}Z" fill="${goldL}" opacity=".07"/>`;
  s += `<circle cx="${cx}" cy="${cy}" r="${R}" fill="${goldL}" opacity=".08"/><circle cx="${cx}" cy="${cy}" r="${R * 0.82}" fill="${goldL}" opacity=".1"/>`;
  s += `<circle cx="${cx}" cy="${cy}" r="${R * 0.64}" fill="${cream}" opacity=".9" stroke="${gold}" stroke-width="${R * 0.03}"/>`;
  s += `<circle cx="${cx}" cy="${cy}" r="${R * 0.64}" fill="url(#htDark)" opacity=".25"/>`;
  return s;
}

// side drape: vertical folds, gold tie-back, tassel
export function drape(x0, x1, H, side, tieY) {
  const w = x1 - x0, n = Math.max(3, Math.round(w / 26));
  let s = '';
  // pulled-back silhouette: wide at top, pinched at the tie, flares again at the floor
  const pinch = side === 'L' ? x0 + w * 0.55 : x1 - w * 0.55;
  const edge = side === 'L' ? x1 : x0;
  const d = side === 'L'
    ? `M${x0} -5H${edge}Q${edge - w * 0.1} ${tieY * 0.6} ${pinch} ${tieY}Q${edge - w * 0.05} ${tieY + (H - tieY) * 0.5} ${edge + w * 0.12} ${H + 5}H${x0}Z`
    : `M${x1} -5H${edge}Q${edge + w * 0.1} ${tieY * 0.6} ${pinch} ${tieY}Q${edge + w * 0.05} ${tieY + (H - tieY) * 0.5} ${edge - w * 0.12} ${H + 5}H${x1}Z`;
  s += `<path d="${d}" fill="${turq}" stroke="${ink}" stroke-width="4"/>`;
  s += `<clipPath id="dr${side}"><path d="${d}"/></clipPath><g clip-path="url(#dr${side})">`;
  for (let i = 0; i < n; i++) {
    const fx = x0 + (i + 0.5) * (w / n), fx2 = side === 'L' ? x0 + (pinch - x0) * ((i + 0.5) / n) : pinch + (x1 - pinch) * ((i + 0.5) / n);
    s += `<path d="M${r1(fx)} -5Q${r1(fx)} ${tieY * 0.5} ${r1(fx2)} ${tieY}Q${r1(fx)} ${tieY + (H - tieY) * 0.6} ${r1(fx + (side === 'L' ? w * 0.1 : -w * 0.1))} ${H + 5}" stroke="${teal}" stroke-width="${r1(w / n * 0.45)}" fill="none"/>`;
    s += `<path d="M${r1(fx + w / n * 0.3)} -5Q${r1(fx + w / n * 0.3)} ${tieY * 0.5} ${r1(fx2 + 2)} ${tieY}" stroke="${ink}" stroke-width="1.6" fill="none" opacity=".5"/>`;
  }
  s += `<rect x="${x0 - 10}" y="0" width="${w + 20}" height="${H}" fill="url(#htDark)" opacity=".6"/></g>`;
  // tie-back + tassel
  const tx = pinch;
  s += `<path d="M${tx - 16} ${tieY - 6}Q${tx} ${tieY + 6} ${tx + 16} ${tieY - 6}L${tx + 14} ${tieY + 6}Q${tx} ${tieY + 16} ${tx - 14} ${tieY + 6}Z" fill="${gold}" stroke="${ink}" stroke-width="3"/>`;
  s += `<path d="M${tx} ${tieY + 10}V${tieY + 26}" stroke="${ink}" stroke-width="3"/><path d="M${tx - 8} ${tieY + 50}L${tx - 5} ${tieY + 26}H${tx + 5}L${tx + 8} ${tieY + 50}Z" fill="${gold}" stroke="${ink}" stroke-width="3" stroke-linejoin="round"/><circle cx="${tx}" cy="${tieY + 26}" r="5" fill="${brick}" stroke="${ink}" stroke-width="2.4"/>`;
  return s;
}

// top valance: scalloped swags with gold fringe
export function valance(W, y, depth) {
  const n = Math.max(4, Math.round(W / 150)), sw = W / n;
  let s = `<rect x="-5" y="-5" width="${W + 10}" height="${y + 5}" fill="${teal}" stroke="${ink}" stroke-width="4"/>`;
  let d = `M-5 ${y}`;
  for (let i = 0; i < n; i++) { const x0 = i * sw; d += `L${r1(x0)} ${y}Q${r1(x0 + sw / 2)} ${r1(y + depth * 2)} ${r1(x0 + sw)} ${y}`; }
  d += `L${W + 5} ${y}L${W + 5} -5L-5 -5Z`;
  s += `<path d="${d}" fill="${turq}" stroke="${ink}" stroke-width="4"/>`;
  for (let i = 0; i < n; i++) {
    const x0 = i * sw, cx = x0 + sw / 2;
    s += `<path d="M${r1(x0 + sw * 0.18)} ${y + 2}Q${r1(cx)} ${r1(y + depth * 1.3)} ${r1(x0 + sw * 0.82)} ${y + 2}" stroke="${teal}" stroke-width="5" fill="none"/>`;
    // fringe: little gold ticks along the swag edge
    for (let k = 1; k < 12; k++) { const t = k / 12, px = x0 + sw * t, py = y + depth * 2 * 2 * t * (1 - t) * 1; s += `<path d="M${r1(px)} ${r1(py)}v8" stroke="${gold}" stroke-width="3.4" stroke-linecap="round"/>`; }
    s += `<circle cx="${r1(x0)}" cy="${y + 4}" r="7" fill="${gold}" stroke="${ink}" stroke-width="2.6"/>`;
  }
  s += `<rect x="-5" y="-5" width="${W + 10}" height="${y * 0.4}" fill="${abyss}" opacity=".5"/>`;
  return s;
}

// marquee bulb
export function bulb(x, y, r, on = true) {
  return (on ? `<circle cx="${r1(x)}" cy="${r1(y)}" r="${r * 2}" fill="${goldL}" opacity=".55" filter="url(#bulbGlow)"/>` : '')
    + `<circle cx="${r1(x)}" cy="${r1(y)}" r="${r}" fill="${on ? paper : cream}" stroke="${ink}" stroke-width="${Math.max(1.2, r * 0.32)}"/>`
    + (on ? `<circle cx="${r1(x - r * 0.3)}" cy="${r1(y - r * 0.3)}" r="${r * 0.3}" fill="${goldL}"/>` : '');
}
export function bulbRow(x0, y0, x1, y1, step, r, phase = 0) {
  const L = Math.hypot(x1 - x0, y1 - y0), n = Math.max(1, Math.round(L / step)); let s = '';
  for (let i = 0; i <= n; i++) s += bulb(x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n, r, (i + phase) % 3 !== 0);
  return s;
}

// the gold marquee frame around the board. x,y,w,h = board (cells) rect.
export function marqueeFrame(x, y, w, h, k = 1) {
  const m = 30 * k, R = 26 * k;
  const X0 = x - m, Y0 = y - m, X1 = x + w + m, Y1 = y + h + m;
  let s = '';
  s += `<rect x="${X0 + 8 * k}" y="${Y0 + 12 * k}" width="${X1 - X0}" height="${Y1 - Y0}" rx="${R}" fill="${ink}" opacity=".45"/>`; // drop shadow
  s += `<rect x="${X0}" y="${Y0}" width="${X1 - X0}" height="${Y1 - Y0}" rx="${R}" fill="${gold}" stroke="${ink}" stroke-width="${5 * k}"/>`;
  s += `<rect x="${X0 + 6 * k}" y="${Y0 + 6 * k}" width="${X1 - X0 - 12 * k}" height="${Y1 - Y0 - 12 * k}" rx="${R - 5 * k}" fill="none" stroke="${goldL}" stroke-width="${3 * k}"/>`;
  s += `<rect x="${X0}" y="${Y0}" width="${X1 - X0}" height="${Y1 - Y0}" rx="${R}" fill="url(#htDark)" opacity=".35"/>`;
  // brick inner liner + board well
  s += `<rect x="${x - 12 * k}" y="${y - 12 * k}" width="${w + 24 * k}" height="${h + 24 * k}" rx="${14 * k}" fill="${brick}" stroke="${ink}" stroke-width="${4 * k}"/>`;
  s += `<rect x="${x - 6 * k}" y="${y - 6 * k}" width="${w + 12 * k}" height="${h + 12 * k}" rx="${10 * k}" fill="${ink}"/>`;
  // bulbs along the gold rail
  const bm = m * 0.5, step = 30 * k, br = 4.6 * k;
  s += bulbRow(X0 + R, y - bm - 0, X1 - R, y - bm, step, br, 0);
  s += bulbRow(X0 + R, y + h + bm, X1 - R, y + h + bm, step, br, 1);
  s += bulbRow(x - bm, Y0 + R, x - bm, Y1 - R, step, br, 2);
  s += bulbRow(x + w + bm, Y0 + R, x + w + bm, Y1 - R, step, br, 0);
  // atomic starburst corners
  for (const [cx, cy] of [[X0 + 6 * k, Y0 + 6 * k], [X1 - 6 * k, Y0 + 6 * k], [X0 + 6 * k, Y1 - 6 * k], [X1 - 6 * k, Y1 - 6 * k]]) {
    s += `<path d="${starPts(cx, cy, 24 * k, 8 * k, 8)}" fill="${goldL}" stroke="${ink}" stroke-width="${3 * k}" stroke-linejoin="round"/><circle cx="${cx}" cy="${cy}" r="${7 * k}" fill="${brick}" stroke="${ink}" stroke-width="${2.6 * k}"/>`;
  }
  return s;
}

// AGENT MAMBO logo: atomic emblem with keyhole, chunky sticker lettering. Centered on cx, top at y, total width ~ 5.2*S
export function logo(cx, y, S) {
  let s = '';
  const ey = y + S * 1.45;
  // emblem: big starburst + orbit rings behind the words
  s += `<g>${rays(cx, ey, S * 3.1, 24, goldL, 0.1, 0)}</g>`;
  s += `<path d="${starPts(cx, ey, S * 1.75, S * 1.12, 12, -90)}" fill="${gold}" stroke="${ink}" stroke-width="${S * 0.09}" stroke-linejoin="round"/>`;
  s += `<path d="${starPts(cx, ey, S * 1.45, S * 1.05, 12, -75)}" fill="${goldL}" stroke="${ink}" stroke-width="${S * 0.04}" stroke-linejoin="round" opacity=".9"/>`;
  s += `<g fill="none" stroke="${ink}" stroke-width="${S * 0.17}"><ellipse cx="${cx}" cy="${ey}" rx="${S * 2.75}" ry="${S * 0.62}" transform="rotate(-12 ${cx} ${ey})"/></g>`;
  s += `<g fill="none" stroke="${cream}" stroke-width="${S * 0.08}"><ellipse cx="${cx}" cy="${ey}" rx="${S * 2.75}" ry="${S * 0.62}" transform="rotate(-12 ${cx} ${ey})"/></g>`;
  s += `<circle cx="${cx + S * 2.62}" cy="${ey - S * 0.64}" r="${S * 0.16}" fill="${brick}" stroke="${ink}" stroke-width="${S * 0.05}"/>`;
  // words
  s += letters('AGENT', cx, y + S * 0.95, S * 0.88, cream, paper, ink, S * 0.05);
  s += letters('MAMBO', cx, y + S * 2.25, S * 1.32, gold, paper, ink, S * 0.06);
  // keyhole medallion pin sitting on the O-line divider
  const my = y + S * 1.14, mr = S * 0.34;
  s += `<rect x="${cx - S * 1.5}" y="${my - S * 0.09}" width="${S * 3}" height="${S * 0.18}" rx="${S * 0.09}" fill="${brick}" stroke="${ink}" stroke-width="${S * 0.05}"/>`;
  s += `<circle cx="${cx}" cy="${my}" r="${mr + S * 0.06}" fill="${paper}"/><circle cx="${cx}" cy="${my}" r="${mr}" fill="${brick}" stroke="${ink}" stroke-width="${S * 0.06}"/>`;
  s += `<circle cx="${cx}" cy="${my - mr * 0.18}" r="${mr * 0.3}" fill="${ink}"/><path d="M${cx - mr * 0.18} ${my - mr * 0.1}L${cx + mr * 0.18} ${my - mr * 0.1}L${cx + mr * 0.28} ${my + mr * 0.55}L${cx - mr * 0.28} ${my + mr * 0.55}Z" fill="${ink}"/>`;
  // sparkles
  s += `<path d="${starPts(cx - S * 2.55, y + S * 0.3, S * 0.3, S * 0.07, 4)}" fill="${paper}"/><path d="${starPts(cx + S * 2.35, y + S * 2.55, S * 0.22, S * 0.06, 4)}" fill="${paper}"/>`;
  return s;
}

// SPIN: brick disc in a bulb ring, sticker label
export function spinButton(cx, cy, R) {
  let s = `<circle cx="${cx + R * 0.06}" cy="${cy + R * 0.1}" r="${R}" fill="${ink}" opacity=".5"/>`;
  s += `<circle cx="${cx}" cy="${cy}" r="${R}" fill="${gold}" stroke="${ink}" stroke-width="${R * 0.07}"/>`;
  s += `<circle cx="${cx}" cy="${cy}" r="${R * 0.93}" fill="none" stroke="${goldL}" stroke-width="${R * 0.035}"/>`;
  for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; s += bulb(cx + Math.cos(a) * R * 0.86, cy + Math.sin(a) * R * 0.86, R * 0.055, i % 2 === 0); }
  s += `<circle cx="${cx}" cy="${cy}" r="${R * 0.72}" fill="${brick}" stroke="${ink}" stroke-width="${R * 0.06}"/>`;
  s += `<clipPath id="spc${Math.round(cx)}"><circle cx="${cx}" cy="${cy}" r="${R * 0.72}"/></clipPath><g clip-path="url(#spc${Math.round(cx)})">${rays(cx, cy, R, 16, goldL, 0.14, 0)}<rect x="${cx - R}" y="${cy - R}" width="${R * 2}" height="${R * 2}" fill="url(#htDark)" opacity=".5"/></g>`;
  // circular arrows icon
  const a = R * 0.36, sw = R * 0.13;
  s += `<g fill="none" stroke-linecap="round"><path d="M${cx - a} ${cy - a * 0.15}A${a} ${a} 0 0 1 ${cx + a * 0.8} ${cy - a * 0.62}" stroke="${ink}" stroke-width="${sw + R * 0.07}"/><path d="M${cx + a} ${cy + a * 0.15}A${a} ${a} 0 0 1 ${cx - a * 0.8} ${cy + a * 0.62}" stroke="${ink}" stroke-width="${sw + R * 0.07}"/>`
    + `<path d="M${cx - a} ${cy - a * 0.15}A${a} ${a} 0 0 1 ${cx + a * 0.8} ${cy - a * 0.62}" stroke="${paper}" stroke-width="${sw}"/><path d="M${cx + a} ${cy + a * 0.15}A${a} ${a} 0 0 1 ${cx - a * 0.8} ${cy + a * 0.62}" stroke="${paper}" stroke-width="${sw}"/></g>`;
  const h = R * 0.24;
  s += `<path d="M${cx + a * 0.55} ${cy - a * 1.05}L${cx + a * 1.25} ${cy - a * 0.55}L${cx + a * 0.45} ${cy - a * 0.18}Z" fill="${paper}" stroke="${ink}" stroke-width="${R * 0.035}" stroke-linejoin="round"/>`;
  s += `<path d="M${cx - a * 0.55} ${cy + a * 1.05}L${cx - a * 1.25} ${cy + a * 0.55}L${cx - a * 0.45} ${cy + a * 0.18}Z" fill="${paper}" stroke="${ink}" stroke-width="${R * 0.035}" stroke-linejoin="round"/>`;
  // label tab
  s += `<rect x="${cx - R * 0.42}" y="${cy - R * 1.13}" width="${R * 0.84}" height="${h * 1.25}" rx="${h * 0.4}" fill="${paper}" stroke="${ink}" stroke-width="${R * 0.05}"/>`;
  s += `<text x="${cx}" y="${cy - R * 1.13 + h * 1.0}" text-anchor="middle" font-family="Luckiest" font-size="${h * 0.95}" fill="${ink}" letter-spacing="1">SPIN</text>`;
  return s;
}

// SECRET ENTRANCE: tilted sticker ticket with a keyhole door
export function secretButton(cx, cy, w, rot = -5) {
  const h = w * 0.56, k = w / 200;
  let s = `<g transform="rotate(${rot} ${cx} ${cy})">`;
  const notch = (x0, y0) => `M${x0} ${y0}`;
  const d = `M${cx - w / 2 + 14 * k} ${cy - h / 2}H${cx + w / 2 - 14 * k}Q${cx + w / 2} ${cy - h / 2} ${cx + w / 2} ${cy - h / 2 + 14 * k}V${cy - 12 * k}A${12 * k} ${12 * k} 0 0 0 ${cx + w / 2} ${cy + 12 * k}V${cy + h / 2 - 14 * k}Q${cx + w / 2} ${cy + h / 2} ${cx + w / 2 - 14 * k} ${cy + h / 2}H${cx - w / 2 + 14 * k}Q${cx - w / 2} ${cy + h / 2} ${cx - w / 2} ${cy + h / 2 - 14 * k}V${cy + 12 * k}A${12 * k} ${12 * k} 0 0 0 ${cx - w / 2} ${cy - 12 * k}V${cy - h / 2 + 14 * k}Q${cx - w / 2} ${cy - h / 2} ${cx - w / 2 + 14 * k} ${cy - h / 2}Z`;
  void notch;
  s += `<path d="${d}" fill="${ink}" opacity=".5" transform="translate(${5 * k} ${8 * k})"/>`;
  s += `<path d="${d}" fill="${paper}" stroke="${paper}" stroke-width="${16 * k}" stroke-linejoin="round"/>`;
  s += `<path d="${d}" fill="${turq}" stroke="${ink}" stroke-width="${4.5 * k}" stroke-linejoin="round"/>`;
  s += `<clipPath id="sec${Math.round(cx)}"><path d="${d}"/></clipPath><g clip-path="url(#sec${Math.round(cx)})">${rays(cx - w * 0.3, cy, w, 18, teal, 0.6, 0)}</g>`;
  // keyhole door
  const dx = cx - w * 0.3, dy = cy, dr = h * 0.36;
  s += `<circle cx="${dx}" cy="${dy}" r="${dr}" fill="${gold}" stroke="${ink}" stroke-width="${4 * k}"/><circle cx="${dx}" cy="${dy}" r="${dr * 0.76}" fill="${brick}" stroke="${ink}" stroke-width="${2.6 * k}"/>`;
  s += `<circle cx="${dx}" cy="${dy - dr * 0.18}" r="${dr * 0.22}" fill="${ink}"/><path d="M${dx - dr * 0.13} ${dy - dr * 0.1}L${dx + dr * 0.13} ${dy - dr * 0.1}L${dx + dr * 0.22} ${dy + dr * 0.48}L${dx - dr * 0.22} ${dy + dr * 0.48}Z" fill="${ink}"/>`;
  s += letters('SECRET', cx + w * 0.13, cy - h * 0.04, h * 0.27, goldL, paper, ink);
  s += letters('ENTRANCE', cx + w * 0.13, cy + h * 0.3, h * 0.2, cream, paper, ink);
  s += `</g>`;
  return s;
}

// HUD value: small ink tag + big lettering
export function hudValue(x, y, label, value, size, anchor = 'middle', face = cream) {
  const tw = label.length * size * 0.36 + size * 0.5, th = size * 0.5;
  const tx = anchor === 'start' ? x : anchor === 'end' ? x - tw : x - tw / 2;
  let s = `<rect x="${tx}" y="${y - size * 1.25}" width="${tw}" height="${th}" rx="${th * 0.3}" fill="${ink}"/>`;
  s += `<text x="${tx + tw / 2}" y="${y - size * 1.25 + th * 0.8}" text-anchor="middle" font-family="Luckiest" font-size="${th * 0.78}" fill="${turq === face ? cream : goldL}" letter-spacing="1">${label}</text>`;
  s += letters(value, anchor === 'start' ? x + 0 : anchor === 'end' ? x : x, y, size, face, paper, ink).replaceAll('text-anchor="middle"', `text-anchor="${anchor}"`);
  return s;
}
export function chevron(cx, cy, s, dir) {
  const d = dir < 0 ? `M${cx + s * 0.35} ${cy - s * 0.6}L${cx - s * 0.35} ${cy}L${cx + s * 0.35} ${cy + s * 0.6}` : `M${cx - s * 0.35} ${cy - s * 0.6}L${cx + s * 0.35} ${cy}L${cx - s * 0.35} ${cy + s * 0.6}`;
  return `<path d="${d}" fill="none" stroke="${ink}" stroke-width="${s * 0.5}" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="${goldL}" stroke-width="${s * 0.26}" stroke-linecap="round" stroke-linejoin="round"/>`;
}
export function iconBtn(cx, cy, r, kind) {
  let s = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${teal}" stroke="${ink}" stroke-width="${r * 0.16}"/><circle cx="${cx}" cy="${cy}" r="${r * 0.82}" fill="none" stroke="${turq}" stroke-width="${r * 0.08}"/>`;
  if (kind === 'menu') s += [-0.3, 0, 0.3].map((t) => `<path d="M${cx - r * 0.4} ${cy + t * r}H${cx + r * 0.4}" stroke="${cream}" stroke-width="${r * 0.16}" stroke-linecap="round"/>`).join('');
  if (kind === 'sound') s += `<path d="M${cx - r * 0.45} ${cy - r * 0.18}h${r * 0.25}l${r * 0.3} -${r * 0.28}v${r * 0.92}l-${r * 0.3} -${r * 0.28}h-${r * 0.25}Z" fill="${cream}"/><path d="M${cx + r * 0.25} ${cy - r * 0.25}q${r * 0.2} ${r * 0.25} 0 ${r * 0.5}" stroke="${cream}" stroke-width="${r * 0.12}" fill="none" stroke-linecap="round"/>`;
  if (kind === 'auto') s += `<path d="M${cx - r * 0.25} ${cy - r * 0.4}L${cx + r * 0.42} ${cy}L${cx - r * 0.25} ${cy + r * 0.4}Z" fill="${cream}"/>`;
  return s;
}
export { rnd };

// sputnik chandelier hanging from the ceiling: brass ball, spokes tipped with bulbs
export function sputnik(cx, cy, R, ropeTop = -10) {
  let s = `<path d="M${cx} ${ropeTop}V${cy - R * 0.5}" stroke="${ink}" stroke-width="${R * 0.14}"/><path d="M${cx} ${ropeTop}V${cy - R * 0.5}" stroke="${gold}" stroke-width="${R * 0.06}"/>`;
  const n = 10;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + 0.3, ex = cx + Math.cos(a) * R * 1.5, ey = cy + Math.sin(a) * R * 0.95;
    s += `<path d="M${cx} ${cy}L${r1(ex)} ${r1(ey)}" stroke="${ink}" stroke-width="${R * 0.12}" stroke-linecap="round"/><path d="M${cx} ${cy}L${r1(ex)} ${r1(ey)}" stroke="${gold}" stroke-width="${R * 0.05}" stroke-linecap="round"/>`;
    s += bulb(ex, ey, R * 0.14, true);
  }
  s += `<circle cx="${cx}" cy="${cy}" r="${R * 0.42}" fill="${gold}" stroke="${ink}" stroke-width="${R * 0.09}"/><path d="M${cx - R * 0.26} ${cy - R * 0.14}A${R * 0.3} ${R * 0.3} 0 0 1 ${cx - R * 0.02} ${cy - R * 0.3}" stroke="${paper}" stroke-width="${R * 0.07}" fill="none" stroke-linecap="round"/>`;
  return s;
}

// marquee sign above the board: idle text or the WIN meter
export function marqueeSign(cx, cy, w, h, label, value) {
  let s = `<rect x="${cx - w / 2 + 4}" y="${cy - h / 2 + 6}" width="${w}" height="${h}" rx="${h / 2}" fill="${ink}" opacity=".45"/>`;
  s += `<rect x="${cx - w / 2}" y="${cy - h / 2}" width="${w}" height="${h}" rx="${h / 2}" fill="${gold}" stroke="${ink}" stroke-width="${h * 0.07}"/>`;
  s += `<rect x="${cx - w / 2 + h * 0.14}" y="${cy - h / 2 + h * 0.14}" width="${w - h * 0.28}" height="${h * 0.72}" rx="${h * 0.36}" fill="${ink}"/>`;
  s += bulbRow(cx - w / 2 + h * 0.5, cy - h / 2 + h * 0.07, cx + w / 2 - h * 0.5, cy - h / 2 + h * 0.07, h * 0.42, h * 0.06, 1);
  s += bulbRow(cx - w / 2 + h * 0.5, cy + h / 2 - h * 0.07, cx + w / 2 - h * 0.5, cy + h / 2 - h * 0.07, h * 0.42, h * 0.06, 2);
  if (value) {
    s += `<text x="${cx - w * 0.26}" y="${cy + h * 0.13}" text-anchor="middle" font-family="Luckiest" font-size="${h * 0.4}" fill="${cream}" letter-spacing="1">WIN</text>`;
    s += letters(value, cx + w * 0.1, cy + h * 0.22, h * 0.58, goldL, paper, ink);
  } else s += `<text x="${cx}" y="${cy + h * 0.14}" text-anchor="middle" font-family="Luckiest" font-size="${h * 0.38}" fill="${goldL}" letter-spacing="2">${label}</text>`;
  return s;
}
