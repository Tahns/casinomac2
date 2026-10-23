// Store art, 1960s cartoon style. Hand-built SVG, no generative AI.
// Usage: node gen_store_art.mjs <storeDir>   (writes tile_3x4.svg, cover_16x9.svg)
import fs from 'node:fs';
import path from 'node:path';

const C = {
  cream: '#F4E8C8', mustard: '#E8A92B', orange: '#D9622B', brick: '#B8352A', turq: '#2E8C8C',
  night: '#1E2F4A', ink: '#2B1A12', olive: '#7A8B3A', plum: '#6A3D6E',
  skin: '#F0B98A', skin2: '#E0956A', wood: '#B5642B', wood2: '#8A4420', steel: '#8FA3A8', yellow: '#F6C23A',
};
const OFF = 4; // print offset of fills vs. outlines

// shape with print-offset fill + thick outline
const sh = (tag, a, fill, sw = 6, extra = '') => {
  const attrs = Object.entries(a).map(([k, v]) => `${k}="${v}"`).join(' ');
  return `<${tag} ${attrs} fill="${fill}" stroke="none" transform="translate(${OFF} ${OFF})" ${extra}/>` +
         `<${tag} ${attrs} fill="none" stroke="${C.ink}" stroke-width="${sw}" stroke-linejoin="round" stroke-linecap="round" ${extra}/>`;
};
const P = (d, fill, sw = 6) => sh('path', { d }, fill, sw);
const E = (cx, cy, rx, ry, fill, sw = 6) => sh('ellipse', { cx, cy, rx, ry }, fill, sw);
const R = (x, y, w, h, r, fill, sw = 6) => sh('rect', { x, y, width: w, height: h, rx: r }, fill, sw);
const line = (d, col, w) => `<path d="${d}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
const dots = (d, op = 0.45) => `<path d="${d}" fill="url(#dots)" opacity="${op}"/>`;
const star4 = (x, y, r, fill = C.cream, sw = 4) =>
  P(`M${x},${y - r} Q${x + r * 0.14},${y - r * 0.14} ${x + r},${y} Q${x + r * 0.14},${y + r * 0.14} ${x},${y + r} Q${x - r * 0.14},${y + r * 0.14} ${x - r},${y} Q${x - r * 0.14},${y - r * 0.14} ${x},${y - r}Z`, fill, sw);
function starN(x, y, ro, ri, n, fill, sw = 5, rot = -90) {
  let d = '';
  for (let i = 0; i < n * 2; i++) {
    const r = i % 2 ? ri : ro, a = (rot + (i * 180) / n) * Math.PI / 180;
    d += (i ? 'L' : 'M') + (x + r * Math.cos(a)).toFixed(1) + ',' + (y + r * Math.sin(a)).toFixed(1);
  }
  return P(d + 'Z', fill, sw);
}

// ---------------- Old Gus (local coords: feet at y=0, x centered, ~500 tall) ----------------
function gus() {
  let s = '';
  // pickaxe behind
  s += line('M150,-30 L222,-340', C.ink, 30) + line('M150,-30 L222,-340', C.wood, 18);
  s += P('M140,-360 Q225,-420 320,-345 Q255,-372 226,-325 Q198,-370 140,-360Z', C.steel, 6);
  s += line('M170,-366 Q225,-394 282,-358', C.cream, 5);
  // boots + legs
  s += E(-62, -28, 62, 32, '#7A4A2A') + E(62, -28, 62, 32, '#7A4A2A');
  s += line('M-110,-40 q50,-12 100,0', C.ink, 5) + line('M10,-40 q50,-12 100,0', C.ink, 5);
  s += P('M-108,-285 Q-120,-150 -98,-52 L-10,-52 L0,-140 L10,-52 L98,-52 Q120,-150 108,-285 Z', C.brick, 6);
  s += dots('M-108,-285 Q-120,-150 -98,-52 L-10,-52 L0,-140 L-30,-200 L-60,-285 Z', 0.35);
  // bib pocket
  s += R(-34, -215, 68, 52, 8, C.mustard, 5) + line('M-24,-206 h48', C.ink, 3);
  // arms: left cheering (viewer left), right holding pickaxe
  s += line('M-100,-275 Q-165,-300 -196,-410', C.ink, 52) + line('M-100,-275 Q-165,-300 -196,-410', C.cream, 40);
  s += E(-200, -430, 30, 30, C.skin, 6);
  s += line('M100,-275 Q150,-250 160,-182', C.ink, 52) + line('M100,-275 Q150,-250 160,-182', C.cream, 40);
  s += E(160, -166, 30, 30, C.skin, 6);
  s += line('M-208,-448 l-8,-18 M-196,-455 l0,-20 M-182,-452 l8,-18', C.ink, 5);
  // collar + buttons
  s += E(0, -292, 74, 26, C.cream, 6);
  s += E(-70, -266, 11, 11, C.mustard, 4) + E(70, -266, 11, 11, C.mustard, 4);
  // head
  s += E(-90, -345, 22, 26, C.skin, 6) + E(90, -345, 22, 26, C.skin, 6);
  s += E(0, -348, 92, 88, C.skin, 7);
  s += dots('M60,-420 Q96,-380 78,-310 Q50,-290 20,-300 Q70,-340 60,-420Z', 0.3);
  s += E(-52, -322, 17, 12, '#E88A78', 0) + E(52, -322, 17, 12, '#E88A78', 0);
  // mouth (open, cheering)
  s += P('M-30,-286 Q0,-255 30,-286 Q0,-296 -30,-286Z', '#7A1F1A', 5) + `<path d="M-14,-274 Q0,-262 14,-274 Q0,-268 -14,-274Z" fill="#E8776F"/>`;
  // eyes + brows
  s += E(-34, -378, 21, 25, '#FFFDF4', 5) + E(34, -378, 21, 25, '#FFFDF4', 5);
  s += `<circle cx="-30" cy="-374" r="9" fill="${C.ink}"/><circle cx="38" cy="-374" r="9" fill="${C.ink}"/><circle cx="-27" cy="-378" r="3" fill="#fff"/><circle cx="41" cy="-378" r="3" fill="#fff"/>`;
  s += `<g transform="translate(0 8)">` + line('M-64,-418 Q-36,-440 -8,-414', C.ink, 20) + line('M-64,-418 Q-36,-440 -8,-414', '#D8D4C8', 11);
  s += line('M8,-414 Q36,-440 64,-418', C.ink, 20) + line('M8,-414 Q36,-440 64,-418', '#D8D4C8', 11) + '</g>';
  // nose
  s += E(0, -340, 30, 25, C.skin2, 6);
  s += `<path d="M-14,-350 q6,-6 12,-2" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round"/>`;
  // moustache
  s += P('M0,-318 Q-38,-346 -88,-326 Q-142,-306 -112,-262 Q-120,-290 -66,-292 Q-30,-290 0,-304 Q30,-290 66,-292 Q120,-290 112,-262 Q142,-306 88,-326 Q38,-346 0,-318Z', '#DAD6CA', 6);
  s += line('M-30,-312 q-24,8 -50,2 M30,-312 q24,8 50,2 M-60,-300 q-20,10 -40,2 M60,-300 q20,10 40,2', '#8E8A80', 3);
  // helmet
  s += '<g transform="translate(0 -52)">';
  s += P('M-98,-378 Q-108,-496 0,-506 Q108,-496 98,-378 Z', C.yellow, 7);
  s += dots('M40,-500 Q100,-490 98,-378 L50,-380 Q60,-450 40,-500Z', 0.3);
  s += R(-116, -394, 232, 28, 14, C.mustard, 6);
  s += R(-12, -506, 24, 112, 6, C.orange, 4);
  s += E(0, -446, 30, 30, C.cream, 6) + starN(0, -446, 22, 8, 8, C.yellow, 3);
  s += line('M-46,-470 l-22,-16 M46,-470 l22,-16 M0,-486 l0,-26', C.cream, 6);
  s += '</g>';
  return s;
}

// ---------------- gems ----------------
function gem(x, y, s, kind) {
  const g = {
    ruby: ['#D6303F', '#8E1E2C', '#FF8A8F'], sapphire: ['#2F67B8', '#1C3B72', '#8EC0FF'],
    emerald: ['#2FA568', '#1A6A45', '#9BEAB4'], topaz: ['#F6B72A', '#C97B14', '#FFE49A'],
    amethyst: ['#9157AD', '#5B2F78', '#D7ADEA'],
  }[kind];
  const [m, d, l] = g, T = (p) => p.map(([a, b]) => `${(x + a * s).toFixed(1)},${(y + b * s).toFixed(1)}`).join(' ');
  const poly = (pts, fill, sw = 0) => `<polygon points="${T(pts)}" fill="${fill}" ${sw ? `stroke="${C.ink}" stroke-width="${sw}"` : ''} stroke-linejoin="round"/>`;
  let outline, facets = '';
  if (kind === 'ruby') { // brilliant cut
    outline = [[-.55, -.55], [.55, -.55], [1, -.1], [0, 1], [-1, -.1]];
    facets = poly([[-.55, -.55], [0, -.1], [-1, -.1]], l) + poly([[.55, -.55], [1, -.1], [0, -.1]], d) + poly([[-1, -.1], [0, -.1], [0, 1]], d) + poly([[-.55, -.55], [.55, -.55], [0, -.1]], m);
  } else if (kind === 'sapphire') { // oval
    outline = [[-.7, -.8], [.7, -.8], [1, 0], [.7, .8], [-.7, .8], [-1, 0]];
    facets = poly([[-.7, -.8], [.7, -.8], [.35, -.2], [-.35, -.2]], l) + poly([[.7, -.8], [1, 0], [.35, -.2]], m) + poly([[-.35, -.2], [.35, -.2], [.7, .8], [-.7, .8]], d);
  } else if (kind === 'emerald') { // step cut
    outline = [[-.6, -.9], [.6, -.9], [1, -.5], [1, .5], [.6, .9], [-.6, .9], [-1, .5], [-1, -.5]];
    facets = poly([[-.6, -.9], [.6, -.9], [.4, -.5], [-.4, -.5]], l) + poly([[-.4, -.5], [.4, -.5], [.4, .5], [-.4, .5]], m) + poly([[.4, -.5], [1, -.5], [1, .5], [.4, .5]], d) + poly([[-.4, .5], [.4, .5], [.6, .9], [-.6, .9]], d);
  } else if (kind === 'topaz') { // kite
    outline = [[0, -1.1], [.8, -.1], [0, 1.1], [-.8, -.1]];
    facets = poly([[0, -1.1], [-.8, -.1], [0, -.1]], l) + poly([[0, -1.1], [.8, -.1], [0, -.1]], m) + poly([[0, -.1], [.8, -.1], [0, 1.1]], d) + poly([[0, -.1], [-.8, -.1], [0, 1.1]], m);
  } else { // amethyst hexagon
    outline = [[-.5, -.9], [.5, -.9], [1, 0], [.5, .9], [-.5, .9], [-1, 0]];
    facets = poly([[-.5, -.9], [.5, -.9], [0, 0]], l) + poly([[.5, -.9], [1, 0], [0, 0]], m) + poly([[1, 0], [.5, .9], [0, 0]], d) + poly([[.5, .9], [-.5, .9], [0, 0]], m) + poly([[-.5, .9], [-1, 0], [0, 0]], d) + poly([[-1, 0], [-.5, -.9], [0, 0]], m);
  }
  const sw = Math.max(4, s * 0.09);
  return `<g>${poly(outline.map(([a, b]) => [a + .08, b + .08]), d)}${facets}<polygon points="${T(outline)}" fill="none" stroke="${C.ink}" stroke-width="${sw}" stroke-linejoin="round"/>` +
    `<path d="M${x - s * .5},${y - s * .35} l${s * .22},${-s * .12}" stroke="#fff" stroke-width="${Math.max(3, s * .07)}" stroke-linecap="round"/></g>`;
}

// ---------------- mine cart (local: center x=0, rim at y=0) ----------------
function cart() {
  let s = '';
  const kinds = ['ruby', 'sapphire', 'emerald', 'topaz', 'amethyst'];
  // back row of gems
  const back = [[-190, -70, 62, 'sapphire'], [-60, -110, 70, 'emerald'], [75, -105, 68, 'ruby'], [195, -65, 60, 'amethyst'], [0, -40, 60, 'topaz']];
  back.forEach(([x, y, z, k]) => (s += gem(x, y, z, k)));
  // gold nuggets
  s += E(-120, -20, 42, 30, C.yellow, 6) + E(130, -10, 38, 28, C.yellow, 6);
  const front = [[-215, -12, 58, 'ruby'], [-110, -28, 56, 'topaz'], [-5, -14, 62, 'amethyst'], [105, -30, 56, 'sapphire'], [210, -14, 58, 'emerald']];
  front.forEach(([x, y, z, k]) => (s += gem(x, y, z, k)));
  // body
  s += P('M-300,-8 L300,-8 L262,205 Q258,225 238,225 L-238,225 Q-258,225 -262,205 Z', C.turq, 7);
  s += dots('M-300,-8 L-120,-8 L-90,225 L-238,225 Q-258,225 -262,205Z', 0.35);
  s += R(-318, -24, 636, 36, 14, C.mustard, 7);
  s += line('M-282,70 H282', C.ink, 6) + line('M-272,150 H272', C.ink, 6);
  for (const x of [-230, -115, 0, 115, 230]) s += E(x, 108, 11, 11, C.cream, 4);
  s += line('M-300,0 l22,-10 M250,-8 l22,-10', C.cream, 5);
  s += R(-60, 150, 120, 50, 10, C.cream, 5) + `<text x="0" y="190" text-anchor="middle" font-family="'Arial Black','DejaVu Sans',sans-serif" font-weight="900" font-size="38" fill="${C.brick}">No.7</text>`;
  // wheels
  for (const x of [-170, 170]) s += E(x, 250, 62, 62, C.night, 7) + E(x, 250, 26, 26, C.mustard, 5) + `<circle cx="${x}" cy="250" r="7" fill="${C.ink}"/>`;
  return s;
}

// ---------------- TNT bundle with lit fuse (local: base center at 0,0) ----------------
function tnt() {
  let s = '';
  const stick = (x, rot, lab) => `<g transform="translate(${x} 0) rotate(${rot})">` +
    R(-38, -250, 76, 250, 18, C.brick, 7) + R(-38, -170, 76, 72, 0, C.cream, 5) +
    (lab ? `<text x="0" y="-122" text-anchor="middle" font-family="'Arial Black','DejaVu Sans',sans-serif" font-weight="900" font-size="38" fill="${C.ink}">TNT</text>` : '') +
    dots('M-38,-250 h24 v250 h-24z', 0.35) + `</g>`;
  s += stick(-62, -6, 0) + stick(62, 6, 0) + stick(0, 0, 1);
  s += R(-100, -225, 200, 26, 10, C.mustard, 5) + R(-100, -50, 200, 26, 10, C.mustard, 5);
  s += line('M0,-250 Q-30,-300 20,-330 Q60,-355 40,-395', C.ink, 14) + line('M0,-250 Q-30,-300 20,-330 Q60,-355 40,-395', C.cream, 6);
  s += starN(40, -410, 62, 24, 8, C.yellow, 6, -90) + starN(40, -410, 34, 14, 8, C.cream, 4, -67);
  s += star4(-40, -470, 26, C.cream, 4) + star4(112, -440, 20, C.cream, 4);
  return s;
}

// comic burst
function burst(x, y, r, text, fs) {
  let s = starN(x, y, r, r * 0.68, 14, C.mustard, 9, -80);
  s += `<g transform="translate(${x} ${y}) scale(.74) translate(${-x} ${-y})">${starN(x, y, r, r * 0.68, 14, C.brick, 6, -80)}</g>`;
  s += `<g transform="rotate(-8 ${x} ${y})"><text x="${x + 6}" y="${y + fs * .34 + 6}" text-anchor="middle" font-family="'Arial Black','Impact','DejaVu Sans',sans-serif" font-weight="900" font-size="${fs}" fill="${C.ink}" textLength="${r * 1.15}" lengthAdjust="spacingAndGlyphs">${text}</text>` +
    `<text x="${x}" y="${y + fs * .34}" text-anchor="middle" font-family="'Arial Black','Impact','DejaVu Sans',sans-serif" font-weight="900" font-size="${fs}" fill="${C.cream}" stroke="${C.ink}" stroke-width="5" paint-order="stroke" textLength="${r * 1.15}" lengthAdjust="spacingAndGlyphs">${text}</text></g>`;
  return s;
}

// rocks with halftone
function rock(pts, fill, sh2 = C.ink) {
  const d = pts;
  return P(d, fill, 7) + dots(d, 0.28);
}

function post(x, y, w, h) {
  let s = R(x, y, w, h, 14, C.wood, 7);
  s += line(`M${x + w * .3},${y + 20} V${y + h * .45} M${x + w * .65},${y + h * .2} V${y + h * .8} M${x + w * .4},${y + h * .55} V${y + h - 20}`, C.wood2, 5);
  s += E(x + w * .5, y + h * .12, 8, 6, C.wood2, 3);
  return s;
}
function beam(x, y, w, h) {
  let s = R(x, y, w, h, 14, C.wood, 7);
  for (let i = 0; i < 6; i++) { const px = x + w * (0.08 + i * 0.17); s += line(`M${px},${y + h * .3} h${w * .09} M${px + 30},${y + h * .7} h${w * .08}`, C.wood2, 5); }
  s += E(x + 26, y + h / 2, 8, 8, C.cream, 3) + E(x + w - 26, y + h / 2, 8, 8, C.cream, 3);
  return s;
}

function title(cx, cy, lines, sizes, widths, rot = -3) {
  let out = '';
  const ys = []; let y = cy; lines.forEach((_, i) => { ys.push(y); y += (sizes[i + 1] || 0) * 0.95; });
  const t = (i, extra) => `<text x="${cx}" y="${ys[i]}" text-anchor="middle" font-family="Rockwell,'Rockwell Extra Bold','Roboto Slab','Arvo','Courier New','DejaVu Serif',Georgia,serif" font-weight="900" font-size="${sizes[i]}" textLength="${widths[i]}" lengthAdjust="spacingAndGlyphs" stroke-linejoin="round" ${extra}>${lines[i]}</text>`;
  lines.forEach((_, i) => {
    out += t(i, `transform="translate(11 14)" fill="${C.ink}" stroke="${C.ink}" stroke-width="40"`);
    out += t(i, `fill="${C.ink}" stroke="${C.ink}" stroke-width="40"`);
    out += t(i, `fill="${C.cream}" stroke="${C.cream}" stroke-width="24"`);
    out += t(i, `fill="${C.ink}" stroke="${C.ink}" stroke-width="10"`);
    out += t(i, `fill="${i === 1 ? C.mustard : C.orange}" stroke="none"`);
    out += t(i, `fill="url(#dotsDark)" stroke="none" opacity=".35" clip-path="url(#lowerHalf${i})"`);
  });
  return `<g transform="rotate(${rot} ${cx} ${cy})">${out}</g>`;
}

function defs(W, H, sizes) {
  return `<defs>
  <pattern id="dots" width="16" height="16" patternUnits="userSpaceOnUse" patternTransform="rotate(30)"><circle cx="8" cy="8" r="3.4" fill="${C.ink}"/></pattern>
  <pattern id="dotsDark" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(30)"><circle cx="6" cy="6" r="2.8" fill="${C.ink}"/></pattern>
  <radialGradient id="vg" cx="50%" cy="50%" r="70%"><stop offset="55%" stop-color="#000"/><stop offset="100%" stop-color="#fff"/></radialGradient>
  <mask id="vm"><rect width="${W}" height="${H}" fill="url(#vg)"/></mask>
  </defs>`;
}

function rays(cx, cy, W, H) {
  let s = `<rect width="${W}" height="${H}" fill="${C.night}"/>`;
  const n = 28, R0 = Math.hypot(W, H);
  for (let i = 0; i < n; i += 2) {
    const a0 = (i / n) * 2 * Math.PI, a1 = ((i + 1) / n) * 2 * Math.PI;
    s += `<path d="M${cx},${cy} L${cx + R0 * Math.cos(a0)},${cy + R0 * Math.sin(a0)} L${cx + R0 * Math.cos(a1)},${cy + R0 * Math.sin(a1)}Z" fill="${C.turq}"/>`;
  }
  s += `<rect width="${W}" height="${H}" fill="url(#dots)" opacity=".5" mask="url(#vm)"/>`;
  s += `<circle cx="${cx}" cy="${cy}" r="${Math.min(W, H) * .36}" fill="${C.mustard}" opacity=".95"/><circle cx="${cx}" cy="${cy}" r="${Math.min(W, H) * .36}" fill="url(#dots)" opacity=".12"/>`;
  return s;
}

function sparkles(list) { return list.map(([x, y, r, f]) => star4(x, y, r, f || C.cream, 4)).join(''); }
function boom(x, y, r, c) { return `<g transform="translate(${x} ${y}) rotate(${c || 0})">${starN(0, 0, r, r * .4, 4, C.cream, 4)}</g>`; }

const clipsFor = (n, ys, sizes, cx, w) => ys.map((y, i) => `<clipPath id="lowerHalf${i}"><rect x="${cx - w}" y="${y - sizes[i] * .3}" width="${w * 2}" height="${sizes[i]}"/></clipPath>`).join('');

function build(kind) {
  if (kind === 'tile') {
    const W = 1536, H = 2048, sizes = [150, 215, 215], lines = ['THE', 'UNLEASHED', 'MINE'], widths = [420, 1260, 760];
    const cy0 = 230, ys = []; let y = cy0; lines.forEach((_, i) => { ys.push(y); y += (sizes[i + 1] || 0) * .95; });
    let s = defs(W, H) + `<defs>${clipsFor(3, ys, sizes, W / 2, 800)}</defs>`;
    s += rays(W / 2, 1150, W, H);
    // frame
    s += post(40, 0, 120, H) + post(W - 160, 0, 120, H);
    s += P(`M160,1180 L330,1000 L330,1060 L160,1250Z`, C.wood, 6) + P(`M${W - 160},1180 L${W - 330},1000 L${W - 330},1060 L${W - 160},1250Z`, C.wood, 6);
    s += beam(20, 20, W - 40, 100);
    // sparkles + burst
    s += sparkles([[250, 700, 38], [1300, 640, 30], [210, 1000, 26], [1330, 960, 40], [700, 760, 22, C.mustard], [1150, 820, 26]]);
    s += boom(1280, 1240, 56, 12) + boom(250, 1330, 44, -10);
    s += burst(1190, 790, 190, 'KA-BOOM!', 80);
    // ground rocks
    s += rock('M0,1740 Q60,1620 220,1640 Q330,1580 440,1680 Q520,1720 600,1760 L600,2048 L0,2048Z', C.orange);
    s += rock(`M${W},1720 Q${W - 80},1600 ${W - 260},1630 Q${W - 380},1580 ${W - 470},1690 Q${W - 540},1740 ${W - 640},1780 L${W - 640},2048 L${W},2048Z`, C.brick);
    s += rock('M300,1860 Q420,1790 560,1850 Q700,1800 860,1860 Q1000,1810 1150,1870 Q1300,1830 1400,1900 L1400,2048 L300,2048Z', '#8A4420');
    s += rock('M80,1900 Q140,1850 220,1880 Q270,1910 250,1960 Q150,1990 80,1960Z', C.steel);
    s += rock(`M${W - 90},1900 Q${W - 150},1850 ${W - 240},1880 Q${W - 290},1920 ${W - 270},1970 Q${W - 160},2000 ${W - 90},1960Z`, C.steel);
    // Gus
    s += `<g transform="translate(470 1780) scale(1.7)">${gus()}</g>`;
    // cart
    s += `<g transform="translate(930 1500) scale(1.08)">${cart()}</g>`;
    // TNT
    s += `<g transform="translate(1330 1840) scale(.95)">${tnt()}</g>`;
    s += rock('M560,1960 Q640,1900 740,1950 Q790,1990 740,2030 Q620,2048 560,2010Z', C.cream);
    // title
    s += title(W / 2, cy0 + 70, lines, sizes, widths, -3);
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${s}</svg>`;
  }
  const W = 1920, H = 1080, sizes = [90, 160, 160], lines = ['THE', 'UNLEASHED', 'MINE'], widths = [230, 900, 470];
  const cy0 = 190, ys = []; let y = cy0; lines.forEach((_, i) => { ys.push(y); y += (sizes[i + 1] || 0) * .95; });
  let s = defs(W, H) + `<defs>${clipsFor(3, ys, sizes, 1280, 700)}</defs>`;
  s += rays(1000, 640, W, H);
  s += post(30, 0, 100, H) + post(W - 130, 0, 100, H);
  s += beam(10, 10, W - 20, 84);
  s += sparkles([[600, 330, 34], [1760, 300, 30], [1700, 900, 26], [330, 200, 24], [900, 170, 20, C.mustard]]);
  s += boom(1800, 800, 44, 12) + boom(520, 620, 40, -10);
  s += burst(1745, 600, 120, 'KA-BOOM!', 48);
  s += rock('M0,900 Q80,830 200,850 Q300,810 420,880 L520,900 L520,1080 L0,1080Z', C.orange);
  s += rock(`M${W},880 Q${W - 100},800 ${W - 240},830 Q${W - 340},800 ${W - 420},870 L${W - 520},900 L${W - 520},1080 L${W},1080Z`, C.brick);
  s += rock('M300,980 Q500,930 700,980 Q900,940 1100,985 Q1300,945 1500,990 L1600,1080 L300,1080Z', '#8A4420');
  s += `<g transform="translate(340 1000) scale(1.5)">${gus()}</g>`;
  s += `<g transform="translate(1000 765) scale(.98)">${cart()}</g>`;
  s += `<g transform="translate(1530 1015) scale(.78)">${tnt()}</g>`;
  s += title(1280, cy0 + 40, lines, sizes, widths, -3);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${s}</svg>`;
}

const out = process.argv[2] || '.';
fs.writeFileSync(path.join(out, 'tile_3x4.svg'), build('tile'));
fs.writeFileSync(path.join(out, 'cover_16x9.svg'), build('cover'));
console.log('wrote svgs');
