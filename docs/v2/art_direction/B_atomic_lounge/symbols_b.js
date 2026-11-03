// Direction B "Atomic Lounge": the 10 Agent Mambo symbols as enamel-pin badge cards.
// Hand-written SVG only (no bitmaps, no generative AI). Every symbol lives in a 100 x 100 box and fills the whole cell
// (full-bleed card): high symbols = gold-rimmed premium cards on a warm field with sunburst rays, low symbols = a slim
// turquoise rim on the deep "abyss" field, WILD and SCATTER = lettered plates that break out of their card.
// Usage: import { C, symbolDefs, symbol } from './symbols_b.js';  svg.innerHTML = `<defs>${symbolDefs()}</defs>` + symbol('H2', { x, y, size, win, dim });

// ---- the closed palette (9 swatches; ink, cream, gold, brick and turquoise are the heroine's own colours)
export const C = {
  ink: '#2B1A12',     // outline, heroine ink
  abyss: '#0C2A2F',   // darkest mood value (night)
  teal: '#17484D',    // dominant mood colour (stage, curtain)
  turq: '#2E8C8C',    // heroine turquoise, low-tier rim, lit curtain
  gold: '#E8A92B',    // heroine mustard: metal, rims, logo
  goldL: '#F8D46A',   // bulb glow / gold highlight
  cream: '#F4E8C8',   // heroine cream
  paper: '#FFFBF0',   // highlights, gloves
  brick: '#B8352A',   // heroine brick: the single hot accent
};
const { ink, abyss, teal, turq, gold, goldL, cream, paper, brick } = C;
const r1 = (n) => Math.round(n * 10) / 10;

export function starPts(cx, cy, ro, ri, n, rot = -90) {
  let d = '';
  for (let i = 0; i < n * 2; i++) {
    const a = ((rot + (i * 180) / n) * Math.PI) / 180, r = i % 2 ? ri : ro;
    d += (i ? 'L' : 'M') + r1(cx + Math.cos(a) * r) + ' ' + r1(cy + Math.sin(a) * r);
  }
  return d + 'Z';
}
// sunburst wedges (alternate rays) centred on cx,cy
export function rays(cx, cy, R, n, fill, op, rot = 0) {
  let d = '';
  for (let i = 0; i < n; i++) {
    const a0 = ((rot + (i * 360) / n) * Math.PI) / 180, a1 = ((rot + ((i + 0.5) * 360) / n) * Math.PI) / 180;
    d += `M${cx} ${cy}L${r1(cx + Math.cos(a0) * R)} ${r1(cy + Math.sin(a0) * R)}L${r1(cx + Math.cos(a1) * R)} ${r1(cy + Math.sin(a1) * R)}Z`;
  }
  return `<path d="${d}" fill="${fill}" opacity="${op}"/>`;
}

export function symbolDefs(pre = 'sb') {
  return `
  <pattern id="${pre}-dotL" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(30)"><circle cx="2.5" cy="2.5" r="1.05" fill="${paper}" opacity=".16"/></pattern>
  <pattern id="${pre}-dotD" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(30)"><circle cx="2.5" cy="2.5" r="1.1" fill="${ink}" opacity=".22"/></pattern>
  <filter id="${pre}-glow" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="5"/></filter>
  <clipPath id="${pre}-inHi"><rect x="9" y="9" width="82" height="82" rx="10"/></clipPath>
  <clipPath id="${pre}-inLo"><rect x="6.5" y="6.5" width="87" height="87" rx="11"/></clipPath>`;
}

// ---------------------------------------------------------------- cards
function cardHigh(pre, field, rayCol = paper, rayOp = 0.1) {
  return `<rect x="2" y="2" width="96" height="96" rx="15" fill="${gold}" stroke="${ink}" stroke-width="3.6"/>`
    + `<path d="M8 40V18Q8 8 18 8H62" fill="none" stroke="${goldL}" stroke-width="3" stroke-linecap="round"/>`
    + `<path d="M92 60V82Q92 92 82 92H38" fill="none" stroke="${ink}" stroke-width="2" stroke-linecap="round" opacity=".28"/>`
    + `<rect x="9" y="9" width="82" height="82" rx="10" fill="${field}" stroke="${ink}" stroke-width="2.6"/>`
    + `<g clip-path="url(#${pre}-inHi)">${rays(50, 52, 80, 16, rayCol, rayOp, 4)}<rect x="9" y="9" width="82" height="82" fill="url(#${pre}-dotD)"/></g>`;
}
function cardLow(pre) {
  return `<rect x="2.5" y="2.5" width="95" height="95" rx="15" fill="${turq}" stroke="${ink}" stroke-width="3.2"/>`
    + `<rect x="6.5" y="6.5" width="87" height="87" rx="11" fill="${abyss}" stroke="${ink}" stroke-width="2"/>`
    + `<g clip-path="url(#${pre}-inLo)"><circle cx="50" cy="50" r="34" fill="${teal}"/><rect x="0" y="0" width="100" height="100" fill="url(#${pre}-dotL)" opacity=".7"/>`
    + `<path d="M14 16a3 3 0 1 0 .1 0M86 82a3 3 0 1 0 .1 0M84 18a2 2 0 1 0 .1 0" fill="${turq}" opacity=".7"/></g>`;
}
// enamel-pin highlight: one paper swoosh
const shine = (d, w = 3.4) => `<path d="${d}" fill="none" stroke="${paper}" stroke-width="${w}" stroke-linecap="round" opacity=".9"/>`;
const O = `stroke="${ink}" stroke-width="3.4" stroke-linejoin="round"`;
const o2 = `stroke="${ink}" stroke-width="2.4" stroke-linejoin="round"`;
// chunky lettering: ink extrusion, paper rim, coloured face
function letters(txt, x, y, size, face, rim = paper, ext = ink, ls = 0) {
  const a = `x="${x}" y="${y}" text-anchor="middle" font-family="Luckiest, 'Luckiest Guy', sans-serif" font-size="${size}" letter-spacing="${ls}"`;
  return `<text ${a} fill="${ext}" stroke="${ext}" stroke-width="${size * 0.3}" stroke-linejoin="round" transform="translate(${r1(size * 0.05)} ${r1(size * 0.09)})">${txt}</text>`
    + `<text ${a} fill="${ext}" stroke="${rim}" stroke-width="${size * 0.3}" stroke-linejoin="round" paint-order="stroke">${txt}</text>`
    + `<text ${a} fill="${face}" stroke="${ext}" stroke-width="${size * 0.12}" stroke-linejoin="round" paint-order="stroke">${txt}</text>`;
}
export { letters };

// ---------------------------------------------------------------- the art
const ART = {
  // H1 SAFE: teal strongbox, gold dial, on a brick field
  H1: (p) => cardHigh(p, brick)
    + `<path d="M24 79h10v6H24zM66 79h10v6H66z" fill="${ink}"/>`
    + `<rect x="18" y="21" width="64" height="60" rx="8" fill="${turq}" ${O}/>`
    + `<rect x="25" y="28" width="50" height="46" rx="4" fill="${teal}" ${o2}/>`
    + `<rect x="15" y="32" width="8" height="10" rx="2" fill="${gold}" ${o2}/><rect x="15" y="60" width="8" height="10" rx="2" fill="${gold}" ${o2}/>`
    + `<circle cx="50" cy="51" r="15" fill="${gold}" ${O}/><circle cx="50" cy="51" r="9" fill="${cream}" ${o2}/>`
    + `<path d="M50 37v4M50 61v4M36 51h4M60 51h4M40 41l2.6 2.6M60 41l-2.6 2.6M40 61l2.6-2.6M60 61l-2.6-2.6" stroke="${ink}" stroke-width="2.4" stroke-linecap="round"/>`
    + `<path d="M50 51L55 45" stroke="${brick}" stroke-width="3.4" stroke-linecap="round"/><circle cx="50" cy="51" r="2.8" fill="${ink}"/>`
    + `<rect x="68" y="43" width="7" height="17" rx="3" fill="${gold}" ${o2}/>`
    + shine('M23 33V27Q23 25 26 25H40'),
  // H2 COCKTAIL: martini, gold drink, brick cherry, on turquoise
  H2: (p) => cardHigh(p, turq)
    + `<path d="M50 59V78" stroke="${ink}" stroke-width="9" stroke-linecap="round"/><path d="M50 59V78" stroke="${cream}" stroke-width="3.6" stroke-linecap="round"/>`
    + `<ellipse cx="50" cy="80" rx="17" ry="5" fill="${cream}" ${O}/>`
    + `<path d="M17 25H83L50 62Z" fill="${cream}" ${O}/>`
    + `<path d="M24 31H76L50 59.5Z" fill="${gold}"/><path d="M24 31H76" stroke="${goldL}" stroke-width="2.4"/>`
    + `<path d="M17 25H83L50 62Z" fill="none" ${O}/>`
    + `<path d="M40 38L70 13" stroke="${ink}" stroke-width="3" stroke-linecap="round"/>`
    + `<circle cx="40" cy="37" r="8.5" fill="${brick}" ${O}/><circle cx="37" cy="34" r="2.2" fill="${paper}"/>`
    + `<path d="M70 13l3 -3M70 13l4 1" stroke="${ink}" stroke-width="2.6" stroke-linecap="round"/>`
    + shine('M28 30L44 50', 3)
    + `<path d="${starPts(78, 44, 6, 2, 4)}" fill="${paper}"/><path d="${starPts(22, 52, 4, 1.4, 4)}" fill="${paper}" opacity=".85"/>`,
  // H3 VINYL: black record, gold label, on brick
  H3: (p) => cardHigh(p, brick)
    + `<circle cx="50" cy="51" r="34" fill="${ink}" stroke="${ink}" stroke-width="3"/>`
    + `<circle cx="50" cy="51" r="34" fill="none" stroke="${gold}" stroke-width="2" opacity=".9"/>`
    + `<g fill="none" stroke="${turq}" stroke-width="1.3" opacity=".75"><circle cx="50" cy="51" r="28"/><circle cx="50" cy="51" r="23.5"/><circle cx="50" cy="51" r="19"/></g>`
    + `<circle cx="50" cy="51" r="13" fill="${gold}" ${o2}/><path d="M38 51a12 12 0 0 1 24 0Z" fill="${goldL}" opacity=".7"/>`
    + `<circle cx="50" cy="51" r="8" fill="none" stroke="${brick}" stroke-width="2.6"/><circle cx="50" cy="51" r="2.6" fill="${cream}" stroke="${ink}" stroke-width="1.4"/>`
    + `<path d="M24 38A29 29 0 0 1 40 23" fill="none" stroke="${paper}" stroke-width="3.6" stroke-linecap="round" opacity=".85"/>`
    + `<path d="M76 64A29 29 0 0 1 66 76" fill="none" stroke="${paper}" stroke-width="2.4" stroke-linecap="round" opacity=".5"/>`,
  // H4 BONGOS: brick + gold drums, cream skins, on turquoise
  H4: (p) => cardHigh(p, turq)
    + `<path d="M44 52H56" stroke="${ink}" stroke-width="7"/>`
    + `<path d="M15 36H47L42 82H20Z" fill="${brick}" ${O}/><path d="M16.6 50H45.6M18.4 66H43.8" stroke="${gold}" stroke-width="4"/><path d="M16.6 50H45.6M18.4 66H43.8" stroke="${ink}" stroke-width="1.4" opacity=".6"/>`
    + `<ellipse cx="31" cy="36" rx="16" ry="5.6" fill="${cream}" ${O}/>`
    + `<path d="M53 46H87L82 84H58Z" fill="${gold}" ${O}/><path d="M54.4 60H85.4M56 74H83.6" stroke="${brick}" stroke-width="4"/>`
    + `<ellipse cx="70" cy="46" rx="17" ry="6" fill="${cream}" ${O}/>`
    + shine('M21 42L23 60', 3) + shine('M59 52L61 68', 3)
    + `<path d="M26 18l4 8M36 16l-1 9M64 26l3 8M76 26l-3 8" stroke="${paper}" stroke-width="2.6" stroke-linecap="round" opacity=".85"/>`,
  // L1 FEDORA: cream hat, brick band
  L1: (p) => cardLow(p)
    + `<path d="M10 62Q12 54 24 56Q50 63 76 56Q88 54 90 62Q86 74 50 76Q14 74 10 62Z" fill="${cream}" ${O}/>`
    + `<path d="M26 59Q22 30 36 25Q44 23 50 31Q56 23 64 25Q78 30 74 59Q50 66 26 59Z" fill="${cream}" ${O}/>`
    + `<path d="M25.5 48Q50 55 74.5 48L74 58Q50 65 26 58Z" fill="${brick}" ${o2}/>`
    + `<path d="M50 31Q49 38 50 46" stroke="${ink}" stroke-width="2.4" fill="none" stroke-linecap="round"/>`
    + `<path d="M62 50l6 -1l-1 8l-6 1z" fill="${gold}" ${o2}/>`
    + shine('M32 44Q30 34 37 30', 3),
  // L2 ROTARY PHONE: brick body, cream dial
  L2: (p) => cardLow(p)
    + `<path d="M20 80L30 47H70L80 80Z" fill="${brick}" ${O}/>`
    + `<path d="M12 40Q12 25 27 27H73Q88 25 88 40L78 46Q74 37 66 38H34Q26 37 22 46Z" fill="${brick}" ${O}/>`
    + `<circle cx="50" cy="64" r="13.5" fill="${cream}" ${O}/>`
    + `<g fill="${ink}">${[0, 1, 2, 3, 4, 5, 6, 7].map((i) => { const a = ((i * 40 - 200) * Math.PI) / 180; return `<circle cx="${r1(50 + Math.cos(a) * 8.6)}" cy="${r1(64 + Math.sin(a) * 8.6)}" r="2"/>`; }).join('')}</g>`
    + `<circle cx="50" cy="64" r="3.4" fill="${gold}" stroke="${ink}" stroke-width="1.6"/>`
    + shine('M20 36Q22 31 30 31', 3) + shine('M33 53L28 70', 2.6),
  // L3 MAGNIFIER: gold rim, turquoise lens, brick handle
  L3: (p) => cardLow(p)
    + `<path d="M58 58L82 82" stroke="${ink}" stroke-width="15" stroke-linecap="round"/><path d="M60 60L81 81" stroke="${brick}" stroke-width="8" stroke-linecap="round"/>`
    + `<circle cx="42" cy="42" r="25" fill="${gold}" ${O}/><circle cx="42" cy="42" r="18" fill="${turq}" ${o2}/>`
    + `<path d="M30 40A13 13 0 0 1 42 28" fill="none" stroke="${paper}" stroke-width="4" stroke-linecap="round"/><circle cx="51" cy="51" r="2.4" fill="${paper}" opacity=".8"/>`
    + shine('M22 30Q26 22 34 19', 2.4),
  // L4 BOW TIE: turquoise with cream dots, gold knot
  L4: (p) => cardLow(p)
    + `<path d="M50 50L16 30Q8 50 16 70Z" fill="${turq}" ${O}/><path d="M50 50L84 30Q92 50 84 70Z" fill="${turq}" ${O}/>`
    + `<g fill="${cream}"><circle cx="22" cy="42" r="3"/><circle cx="24" cy="58" r="3"/><circle cx="34" cy="50" r="2.6"/><circle cx="78" cy="42" r="3"/><circle cx="76" cy="58" r="3"/><circle cx="66" cy="50" r="2.6"/></g>`
    + `<rect x="41" y="39" width="18" height="22" rx="6" fill="${gold}" ${O}/>`
    + shine('M18 40Q17 34 20 32', 2.6) + shine('M45 44V50', 2.4),
  // WILD: gold atomic starburst + keyhole medallion, lettered WILD plate
  W: (p, o) => `<rect x="2" y="2" width="96" height="96" rx="15" fill="${gold}" stroke="${ink}" stroke-width="3.6"/>`
    + `<rect x="9" y="9" width="82" height="82" rx="10" fill="${gold}" stroke="${ink}" stroke-width="2.6"/>`
    + `<g clip-path="url(#${p}-inHi)">${rays(50, 44, 80, 20, o.win ? paper : goldL, o.win ? 0.55 : 0.9, o.win ? 9 : 0)}<rect x="9" y="9" width="82" height="82" fill="url(#${p}-dotD)"/></g>`
    + [14, 50, 86].map((x) => `<circle cx="${x}" cy="5.5" r="2.4" fill="${o.win ? paper : goldL}" stroke="${ink}" stroke-width="1"/>`).join('')
    + `<path d="${starPts(50, 41, 32, 21, 8, -90)}" fill="${brick}" ${O}/>`
    + `<path d="${starPts(50, 41, 24, 18, 8, -67.5)}" fill="${goldL}" stroke="${ink}" stroke-width="1.6"/>`
    + `<g fill="none" stroke="${cream}" stroke-width="2.4"><ellipse cx="50" cy="41" rx="36" ry="10" transform="rotate(-16 50 41)" stroke="${ink}" stroke-width="5"/><ellipse cx="50" cy="41" rx="36" ry="10" transform="rotate(-16 50 41)"/></g>`
    + `<circle cx="84" cy="31" r="3.6" fill="${paper}" stroke="${ink}" stroke-width="1.6"/>`
    + `<circle cx="50" cy="41" r="14" fill="${cream}" ${O}/><circle cx="50" cy="41" r="10.5" fill="none" stroke="${gold}" stroke-width="2.4"/>`
    + `<circle cx="50" cy="37.6" r="4.4" fill="${ink}"/><path d="M47 39L53 39L55 49H45Z" fill="${ink}"/>`
    + letters('WILD', 50, 89, 27, brick, paper, ink, 1),
  // SCATTER: dossier on turquoise rays, cream marquee rim with brick bulbs, TOP SECRET stamp
  S: (p, o) => `<rect x="2" y="2" width="96" height="96" rx="15" fill="${cream}" stroke="${ink}" stroke-width="3.6"/>`
    + [14, 32, 50, 68, 86].map((x) => `<circle cx="${x}" cy="5.6" r="2.3" fill="${brick}"/><circle cx="${x}" cy="94.4" r="2.3" fill="${brick}"/>`).join('')
    + [28, 50, 72].map((y) => `<circle cx="5.6" cy="${y}" r="2.3" fill="${brick}"/><circle cx="94.4" cy="${y}" r="2.3" fill="${brick}"/>`).join('')
    + `<rect x="9" y="9" width="82" height="82" rx="10" fill="${teal}" stroke="${ink}" stroke-width="2.6"/>`
    + `<g clip-path="url(#${p}-inHi)">${rays(50, 50, 80, 18, turq, 1, o.win ? 10 : 0)}<circle cx="50" cy="48" r="26" fill="${goldL}" opacity="${o.win ? 0.5 : 0.22}"/></g>`
    + `<g transform="rotate(-9 50 50)">`
    + `<path d="M17 28H40L45 22H62L66 28H83V80H17Z" fill="${gold}" ${O}/>`
    + `<rect x="22" y="19" width="50" height="22" fill="${paper}" stroke="${ink}" stroke-width="2.2" transform="rotate(5 47 30)"/>`
    + `<path d="M28 25H62M28 30H54" stroke="${ink}" stroke-width="1.8" opacity=".5" transform="rotate(5 47 30)"/>`
    + `<path d="M15 34H85V82H15Z" fill="${gold}" ${O}/><path d="M18 37H82" stroke="${goldL}" stroke-width="2.4"/>`
    + `<rect x="20" y="45" width="60" height="28" rx="5" fill="none" stroke="${brick}" stroke-width="3.6" transform="rotate(-8 50 59)"/>`
    + `<text x="50" y="57" text-anchor="middle" font-family="Luckiest, 'Luckiest Guy', sans-serif" font-size="11.5" fill="${brick}" transform="rotate(-8 50 59)">TOP</text>`
    + `<text x="50" y="70" text-anchor="middle" font-family="Luckiest, 'Luckiest Guy', sans-serif" font-size="12" fill="${brick}" transform="rotate(-8 50 59)">SECRET</text>`
    + `</g>`
    + `<path d="${starPts(86, 18, 9, 3, 4)}" fill="${paper}" stroke="${ink}" stroke-width="1.4"/><path d="${starPts(14, 84, 7, 2.4, 4)}" fill="${paper}" stroke="${ink}" stroke-width="1.4"/>`,
};
export const SYMBOL_IDS = ['H1', 'H2', 'H3', 'H4', 'L1', 'L2', 'L3', 'L4', 'W', 'S'];
export const SYMBOL_NAMES = { H1: 'Safe', H2: 'Cocktail', H3: 'Vinyl record', H4: 'Bongos', L1: 'Fedora', L2: 'Phone', L3: 'Magnifier', L4: 'Bow tie', W: 'Wild', S: 'Scatter (dossier)' };

// symbol(id, {x,y,size,win,dim,pre}) -> <g> string. win = halo + bright rim; dim = darkened (not part of the win)
export function symbol(id, o = {}) {
  const { x = 0, y = 0, size = 100, win = false, dim = false, pre = 'sb' } = o;
  const k = size / 100;
  let s = `<g transform="translate(${r1(x)} ${r1(y)}) scale(${k})">`;
  if (win) {
    s += `<rect x="-4" y="-4" width="108" height="108" rx="20" fill="${goldL}" filter="url(#${pre}-glow)" opacity=".95"/>`;
  }
  s += ART[id](pre, o);
  if (win) s += `<rect x="1" y="1" width="98" height="98" rx="16" fill="none" stroke="${paper}" stroke-width="3.2"/><rect x="-1.5" y="-1.5" width="103" height="103" rx="18" fill="none" stroke="${ink}" stroke-width="2"/>`;
  if (dim) s += `<rect x="2" y="2" width="96" height="96" rx="15" fill="${abyss}" opacity=".42"/>`;
  return s + `</g>`;
}
