// Direction A, "1960s title sequence": shared hand-written vector art (ES module, no dependencies, no bitmaps, no filters).
// Cut-paper language: flat shapes with slightly irregular hand-cut edges (seeded jitter), a thick ink outline with a small
// print misregistration of the fill, halftone dots for shade, strong negative space, ONE font (Luckiest Guy).
// Everything here returns SVG markup strings; the pages assemble them.

// ------------------------------------------------------------------ closed palette (9 swatches, includes the heroine's own colours)
export const C = {
  ink: '#2B1A12',      // outlines, deepest darks (= heroine PAL.ink)
  night: '#14303A',    // dominant mood colour: deep teal night (scene, board backing)
  turq: '#2E8C8C',     // city, low-tier rims, cocktail card (= heroine PAL.turq)
  navy: '#27447E',     // heroine jacket, bongos card (= heroine PAL.navyJ)
  mustard: '#E8A92B',  // spotlight, gold, frame, the main glow (= heroine PAL.mustard)
  brick: '#B8352A',    // curtains, MAMBO, safe card, scatter (= heroine PAL.brick)
  chestnut: '#5A2A1C', // wood, handles, deep warm shade (heroine hair family)
  cream: '#F4E8C8',    // cards, paper (= heroine PAL.cream)
  paper: '#FFFBF0',    // highlights, sticker rims, lettering (= heroine PAL.white)
};
export const PALETTE = [
  ['ink', C.ink, 'outline, darkest'], ['night', C.night, 'dominant mood'], ['turq', C.turq, 'city, low tier'],
  ['navy', C.navy, 'heroine, H4'], ['mustard', C.mustard, 'spotlight, gold, glow'], ['brick', C.brick, 'curtain, H1, scatter'],
  ['chestnut', C.chestnut, 'wood, hair'], ['cream', C.cream, 'cards, paper'], ['paper', C.paper, 'highlight, rims'],
];

// ------------------------------------------------------------------ seeded jitter (hand-cut edges, stable between renders)
let S = 1;
export const seed = (n) => { S = (n * 9301 + 49297) % 233280 || 1; };
const rnd = () => ((S = (S * 16807) % 2147483647) / 2147483647);
const j = (a) => (rnd() * 2 - 1) * a;
const F = (n) => Math.round(n * 10) / 10;

// polygon through points, each point nudged by up to `a` (hand cut)
export function cutPoly(pts, a = 0.8) { return 'M' + pts.map(([x, y]) => `${F(x + j(a))} ${F(y + j(a))}`).join('L') + 'Z'; }
// rectangle cut by hand: edges sampled every `step`, small perpendicular wobble, slightly clipped corners
export function cutRect(x, y, w, h, a = 0.7, step = 9, k = 1.4) {
  const p = [];
  const edge = (x0, y0, x1, y1, nx, ny) => { const L = Math.hypot(x1 - x0, y1 - y0), n = Math.max(1, Math.round(L / step));
    for (let i = 0; i < n; i++) { const t = i / n; p.push([x0 + (x1 - x0) * t + nx * j(a), y0 + (y1 - y0) * t + ny * j(a)]); } };
  edge(x + k, y, x + w - k, y, 0, 1); p.push([x + w, y + k]);
  edge(x + w, y + k, x + w, y + h - k, 1, 0); p.push([x + w - k, y + h]);
  edge(x + w - k, y + h, x + k, y + h, 0, 1); p.push([x, y + h - k]);
  edge(x, y + h - k, x, y + k, 1, 0);
  return 'M' + p.map(([a1, b]) => `${F(a1)} ${F(b)}`).join('L') + 'Z';
}
// circle / ellipse cut by hand (polygon of n points, smoothed with quadratic midpoints)
export function cutEll(cx, cy, rx, ry = rx, a = 0.6, n = 0, rot = 0) {
  n = n || Math.max(14, Math.round((rx + ry) * 0.9));
  const pts = [];
  for (let i = 0; i < n; i++) { const t = (i / n) * Math.PI * 2 + rot; const d = 1 + j(a) / Math.max(rx, ry); pts.push([cx + Math.cos(t) * rx * d, cy + Math.sin(t) * ry * d]); }
  const mid = (p, q) => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
  let d = `M${F(mid(pts[n - 1], pts[0])[0])} ${F(mid(pts[n - 1], pts[0])[1])}`;
  for (let i = 0; i < n; i++) { const m = mid(pts[i], pts[(i + 1) % n]); d += `Q${F(pts[i][0])} ${F(pts[i][1])} ${F(m[0])} ${F(m[1])}`; }
  return d + 'Z';
}
// smooth closed blob through points (for organic cut shapes)
export function blob(pts, a = 0.6) {
  const q = pts.map(([x, y]) => [x + j(a), y + j(a)]), n = q.length, mid = (p, r) => [(p[0] + r[0]) / 2, (p[1] + r[1]) / 2];
  let m0 = mid(q[n - 1], q[0]), d = `M${F(m0[0])} ${F(m0[1])}`;
  for (let i = 0; i < n; i++) { const m = mid(q[i], q[(i + 1) % n]); d += `Q${F(q[i][0])} ${F(q[i][1])} ${F(m[0])} ${F(m[1])}`; }
  return d + 'Z';
}
// draw a cut shape: misregistered fill (shifted) + ink outline on top
export function sh(d, fill, ol = 2.6, o = {}) {
  const mx = o.mx ?? 0.9, my = o.my ?? 0.8;
  if (!ol) return `<path d="${d}" fill="${fill}"${o.extra || ''}/>`;
  return `<path d="${d}" fill="${fill}" transform="translate(${mx} ${my})"${o.extra || ''}/><path d="${d}" fill="none" stroke="${o.stroke || C.ink}" stroke-width="${ol}" stroke-linejoin="round" stroke-linecap="round"/>`;
}
export const ln = (d, w = 2.4, col = C.ink, extra = '') => `<path d="${d}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"${extra}/>`;
// 4-point twinkle (cut paper star)
export const twinkle = (x, y, r, fill = C.paper, ol = 0) => { const k = r * 0.28;
  const d = `M${x} ${y - r}Q${x + k} ${y - k} ${x + r} ${y}Q${x + k} ${y + k} ${x} ${y + r}Q${x - k} ${y + k} ${x - r} ${y}Q${x - k} ${y - k} ${x} ${y - r}Z`;
  return ol ? `<path d="${d}" fill="${fill}" stroke="${C.ink}" stroke-width="${ol}" stroke-linejoin="round"/>` : `<path d="${d}" fill="${fill}"/>`; };
// sunburst wedges around (cx,cy)
export function rays(cx, cy, r0, r1, n, fill, phase = 0, wfrac = 0.5) {
  let d = '';
  for (let i = 0; i < n; i++) { const a0 = ((i + phase) / n) * Math.PI * 2, a1 = ((i + phase + wfrac) / n) * Math.PI * 2;
    d += `M${F(cx + Math.cos(a0) * r0)} ${F(cy + Math.sin(a0) * r0)}L${F(cx + Math.cos(a0) * r1 + j(0.6))} ${F(cy + Math.sin(a0) * r1 + j(0.6))}L${F(cx + Math.cos(a1) * r1 + j(0.6))} ${F(cy + Math.sin(a1) * r1 + j(0.6))}L${F(cx + Math.cos(a1) * r0)} ${F(cy + Math.sin(a1) * r0)}Z`; }
  return `<path d="${d}" fill="${fill}"/>`;
}

// ------------------------------------------------------------------ defs (halftone patterns; ids are prefixed so several SVGs can coexist)
export const defs = (p = 'a') => `
<pattern id="${p}-ht" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(30)"><circle cx="2.5" cy="2.5" r="1.05" fill="${C.ink}" opacity=".32"/></pattern>
<pattern id="${p}-htl" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(30)"><circle cx="2.5" cy="2.5" r="1" fill="${C.paper}" opacity=".35"/></pattern>
<pattern id="${p}-htB" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(30)"><circle cx="6" cy="6" r="2.2" fill="${C.ink}" opacity=".22"/></pattern>
<pattern id="${p}-htBL" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(30)"><circle cx="6" cy="6" r="1.8" fill="${C.paper}" opacity=".14"/></pattern>`;

// ------------------------------------------------------------------ SYMBOLS (100 x 100 card, full bleed)
// Tier system, readable at 40 px by value alone:
//   HIGH  = saturated full-colour card (brick / turquoise / mustard / navy) with a cream matte line and a big cut-paper object.
//   LOW   = cream card with a thin coloured inner rim, a smaller single-object icon (negative space = lower value).
//   SPECIAL = night card with a sunburst and a LETTERED plate (WILD: golden keyhole badge; SCATTER: TOP SECRET dossier).
export const SYMBOLS = ['H1', 'H2', 'H3', 'H4', 'L1', 'L2', 'L3', 'L4', 'W', 'S'];
export const SYMBOL_NAMES = { H1: 'Safe', H2: 'Cocktail', H3: 'Vinyl', H4: 'Bongos', L1: 'Fedora', L2: 'Phone', L3: 'Magnifier', L4: 'Bow tie', W: 'Wild badge', S: 'Dossier scatter' };
const SEEDS = { H1: 11, H2: 23, H3: 37, H4: 41, L1: 53, L2: 67, L3: 71, L4: 89, W: 97, S: 103 };

function cardHigh(p, field, matte = C.cream) {
  return sh(cutRect(3, 3, 94, 94, 0.6), field, 2.6)
    + ln(cutRect(9, 9, 82, 82, 0.5, 12), 1.6, matte, ' opacity=".9"');
}
function cardLow(rim) {
  return sh(cutRect(3, 3, 94, 94, 0.6), C.cream, 2.6) + ln(cutRect(8, 8, 84, 84, 0.5, 12), 2.2, rim);
}
function cardSpecial(p, rayCol, win) {
  return sh(cutRect(3, 3, 94, 94, 0.6), C.night, 2.6)
    + `<g clip-path="url(#${p}-cc)">${rays(50, 46, 6, 80, 16, rayCol, 0, 0.5)}<rect width="100" height="100" fill="url(#${p}-htBL)"/></g>`
    + ln(cutRect(3, 3, 94, 94, 0.6), 2.6) + (win ? '' : '');
}
// lettered plate: chunky Luckiest word, ink extrude (3D-ish), paper rim
function plate(word, y, fill, plateFill, size = 22, w = 84) {
  const x = 50, h = size * 1.12;
  const a = `x="${x}" y="${y + size * 0.36}" text-anchor="middle" font-family="Luckiest, 'Luckiest Guy', sans-serif" font-size="${size}" letter-spacing="${size * 0.03}"`;
  return sh(cutPoly([[x - w / 2, y - h / 2 + 2], [x + w / 2, y - h / 2], [x + w / 2 - 3, y + h / 2], [x - w / 2 + 2, y + h / 2 + 1.5]], 0.5), plateFill, 2.4)
    + `<text ${a} fill="${C.ink}" stroke="${C.ink}" stroke-width="${size * 0.16}" stroke-linejoin="round" transform="translate(1.6 2.2)">${word}</text>`
    + `<text ${a} fill="${fill}" stroke="${C.ink}" stroke-width="${size * 0.12}" stroke-linejoin="round" paint-order="stroke">${word}</text>`
    + `<text ${a} fill="none" stroke="${C.paper}" stroke-width="${size * 0.035}" stroke-dasharray="${size * 0.1} ${size * 0.6}" stroke-linecap="round" opacity=".9" transform="translate(-0.5 -0.8)">${word}</text>`;
}

const ART = {
  H1(p) { // SAFE: navy strongbox with a mustard dial, on brick, spotlight disc behind
    return cardHigh(p, C.brick)
      + sh(cutEll(50, 44, 34, 34, 0.5), C.mustard, 0) + `<path d="${cutEll(50, 44, 34, 34, 0)}" fill="url(#${p}-ht)" opacity=".6"/>`
      + sh(cutRect(20, 22, 60, 58, 0.7, 10, 4), C.navy, 3)
      + sh(cutRect(26, 28, 48, 46, 0.6, 10, 2), C.navy, 2) + `<path d="M28 30h44v6h-44z" fill="${C.paper}" opacity=".25"/>`
      + sh(cutEll(50, 51, 15, 15, 0.4), C.mustard, 2.6) + sh(cutEll(50, 51, 8, 8, 0.3), C.cream, 2.2)
      + ln('M50 37v4M50 61v4M36 51h4M60 51h4', 2.2) + ln('M50 51l4 -5', 2.6)
      + sh(cutRect(71, 44, 6, 14, 0.3, 6, 1), C.cream, 2) // handle
      + sh(cutRect(24, 80, 10, 6, 0.3, 6, 1), C.ink, 0) + sh(cutRect(66, 80, 10, 6, 0.3, 6, 1), C.ink, 0)
      + twinkle(78, 18, 6, C.paper);
  },
  H2(p) { // COCKTAIL: martini glass, cherry, on turquoise with a mustard moon
    return cardHigh(p, C.turq)
      + sh(cutEll(64, 30, 20, 20, 0.5), C.mustard, 0)
      + `<path d="${cutRect(3, 70, 94, 27, 0)}" fill="url(#${p}-ht)" opacity=".5"/>`
      + sh(cutPoly([[18, 24], [82, 24], [52, 58], [48, 58]], 0.6), C.cream, 3)
      + sh(cutPoly([[25, 31], [75, 31], [51.5, 56], [48.5, 56]], 0.5), C.paper, 0) + `<path d="M28 33L72 33L58 47L42 47Z" fill="${C.mustard}" opacity=".55"/>`
      + sh(cutRect(47.5, 57, 5, 22, 0.3, 8, 0.5), C.cream, 2.4)
      + sh(cutEll(50, 82, 17, 5, 0.4), C.cream, 2.6)
      + ln('M40 16L60 44', 2.6) + sh(cutEll(39, 15, 7, 7, 0.4), C.brick, 2.4) + `<circle cx="37" cy="13" r="2" fill="${C.paper}"/>`
      + ln('M24 27L38 27', 2, C.paper, ' opacity=".9"');
  },
  H3(p) { // VINYL: black record with brick label, cream note, on mustard
    return cardHigh(p, C.mustard, C.paper)
      + sh(cutEll(48, 54, 36, 36, 0.5), C.ink, 2.6)
      + ln('M24 42A26 26 0 0 1 44 28', 2.2, C.paper, ' opacity=".55"') + ln('M20 58A30 30 0 0 0 30 78', 1.6, C.paper, ' opacity=".35"')
      + `<circle cx="48" cy="54" r="27" fill="none" stroke="${C.chestnut}" stroke-width="1.2"/><circle cx="48" cy="54" r="21" fill="none" stroke="${C.chestnut}" stroke-width="1.2"/>`
      + sh(cutEll(48, 54, 13, 13, 0.4), C.brick, 2) + `<circle cx="48" cy="54" r="2.6" fill="${C.ink}"/>` + ln('M42 49Q48 45 54 49', 1.6, C.cream)
      + sh('M70 14L84 10L84 36C84 41 76 43 73 39C70 35 76 31 81 33L81 18L73 20L73 40C73 45 65 47 62 43C59 39 65 35 70 37Z', C.cream, 2.4);
  },
  H4(p) { // BONGOS: two drums tied together, on navy
    return cardHigh(p, C.navy)
      + sh(cutEll(50, 40, 36, 30, 0.5), C.turq, 0) + `<path d="${cutEll(50, 40, 36, 30, 0)}" fill="url(#${p}-ht)" opacity=".55"/>`
      + sh(cutPoly([[14, 40], [46, 40], [42, 86], [18, 86]], 0.6), C.brick, 3) + sh(cutEll(30, 40, 16, 6, 0.4), C.cream, 2.6)
      + sh(cutPoly([[52, 46], [88, 46], [83, 88], [57, 88]], 0.6), C.mustard, 3) + sh(cutEll(70, 46, 18, 6.5, 0.4), C.cream, 2.6)
      + ln('M17 58L44 58M18 72L43 72', 2.6) + ln('M55 62L86 62M56 76L85 76', 2.6)
      + sh(cutRect(43, 60, 12, 9, 0.3, 6, 1), C.chestnut, 2.2)
      + ln('M20 48L22 82', 2, C.paper, ' opacity=".4"') + ln('M60 54L62 84', 2, C.paper, ' opacity=".5"');
  },
  L1(p) { // FEDORA: navy hat, brick band (cream card, navy rim)
    return cardLow(C.navy)
      + sh(cutEll(50, 66, 36, 11, 0.6), C.navy, 3)
      + sh('M28 64C26 46 30 30 38 27C44 25 46 31 50 31C54 31 56 25 62 27C70 30 74 46 72 64C62 68 38 68 28 64Z', C.navy, 3)
      + sh('M28.5 58C38 62 62 62 71.5 58L72 64C62 68 38 68 28 64Z', C.brick, 2.2)
      + ln('M40 34C38 42 37 50 37 56', 2, C.paper, ' opacity=".45"') + ln('M50 32L50 40', 2, C.ink, ' opacity=".6"');
  },
  L2(p) { // PHONE: brick rotary phone
    return cardLow(C.brick)
      + sh('M18 38C18 26 30 22 50 22C70 22 82 26 82 38L70 42L66 34L34 34L30 42Z', C.brick, 3)
      + sh(cutPoly([[30, 44], [70, 44], [80, 78], [20, 78]], 0.6), C.brick, 3)
      + sh(cutEll(50, 60, 14, 12, 0.4), C.cream, 2.4) + sh(cutEll(50, 60, 5, 4.4, 0.3), C.brick, 1.8)
      + [0, 1, 2, 3, 4, 5, 6].map((i) => { const a = (-150 + i * 40) * Math.PI / 180; return `<circle cx="${F(50 + Math.cos(a) * 9.6)}" cy="${F(60 + Math.sin(a) * 8.4)}" r="1.7" fill="${C.ink}"/>`; }).join('')
      + ln('M24 40L28 30', 2, C.paper, ' opacity=".45"');
  },
  L3(p) { // MAGNIFIER: mustard ring, turquoise lens, chestnut handle
    return cardLow(C.turq)
      + sh(cutPoly([[56, 58], [62, 52], [82, 74], [76, 80]], 0.4), C.chestnut, 3)
      + sh(cutEll(42, 42, 22, 22, 0.5), C.mustard, 3) + sh(cutEll(42, 42, 15, 15, 0.4), C.turq, 2.4)
      + ln('M33 35Q36 30 42 29', 2.6, C.paper) + `<circle cx="32" cy="41" r="1.6" fill="${C.paper}"/>`;
  },
  L4(p) { // BOW TIE: mustard bow with ink dots
    return cardLow(C.mustard)
      + sh('M50 50C40 40 26 30 18 34C12 38 12 62 18 66C26 70 40 60 50 50Z', C.mustard, 3)
      + sh('M50 50C60 40 74 30 82 34C88 38 88 62 82 66C74 70 60 60 50 50Z', C.mustard, 3)
      + [[24, 44], [26, 56], [34, 50], [76, 44], [74, 56], [66, 50]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.6" fill="${C.ink}"/>`).join('')
      + sh(cutRect(43, 41, 14, 18, 0.4, 6, 3), C.brick, 2.6)
      + ln('M21 40Q26 37 32 39', 2, C.paper, ' opacity=".6"');
  },
  W(p, win) { // WILD: golden keyhole badge (scalloped rosette), lettered WILD plate
    let s = cardSpecial(p, win ? C.mustard : C.chestnut, win);
    if (win) s += `<circle cx="50" cy="42" r="40" fill="${C.mustard}" opacity=".22"/><circle cx="50" cy="42" r="33" fill="${C.paper}" opacity=".18"/>`;
    // scalloped rosette
    let d = '', n = 14;
    for (let i = 0; i <= n; i++) { const a = (i / n) * Math.PI * 2 - Math.PI / 2; const x = 50 + Math.cos(a) * 30, y = 40 + Math.sin(a) * 30;
      if (i === 0) d += `M${F(x)} ${F(y)}`; else { const am = ((i - 0.5) / n) * Math.PI * 2 - Math.PI / 2; d += `Q${F(50 + Math.cos(am) * 37)} ${F(40 + Math.sin(am) * 37)} ${F(x)} ${F(y)}`; } }
    s += sh(d + 'Z', C.mustard, 2.8);
    s += sh(cutEll(50, 40, 23, 23, 0.4), C.brick, 2.4) + sh(cutEll(50, 40, 17, 17, 0.3), C.cream, 2.2);
    s += `<path d="M50 28a6.4 6.4 0 0 1 3.4 11.8L56 52H44l2.6 -12.2A6.4 6.4 0 0 1 50 28Z" fill="${C.ink}"/>`;
    s += ln('M30 24Q36 16 46 14', 2.4, C.paper, ' opacity=".8"');
    s += plate('WILD', 78, C.mustard, C.brick, 25, 86);
    if (win) s += twinkle(14, 16, 7) + twinkle(88, 22, 5) + twinkle(86, 60, 4.5, C.mustard);
    return s;
  },
  S(p, win) { // SCATTER: TOP SECRET dossier folder, papers, lettered SECRET plate
    let s = cardSpecial(p, win ? C.brick : C.turq, win);
    if (win) s += `<circle cx="50" cy="44" r="40" fill="${C.brick}" opacity=".3"/><circle cx="50" cy="44" r="32" fill="${C.mustard}" opacity=".2"/>`;
    s += `<g transform="rotate(-8 50 44)">`;
    s += sh(cutPoly([[22, 22], [44, 22], [48, 27], [80, 27], [80, 70], [22, 70]], 0.5), C.chestnut, 2.6);   // back of the folder + tab
    s += sh(cutRect(27, 18, 44, 44, 0.5, 10, 1), C.paper, 2.2) + ln('M33 28H62M33 34H58M33 40H64', 1.8, C.ink, ' opacity=".5"');
    s += sh(cutPoly([[18, 36], [84, 34], [80, 72], [22, 73]], 0.5), C.mustard, 2.8);  // front flap (manila = mustard)
    s += `<path d="M24 64L80 62L80 70L23 71Z" fill="url(#${p}-ht)" opacity=".7"/>`;
    s += `<g transform="rotate(-5 50 52)">` + ln(cutRect(25, 44, 52, 14, 0.4, 8, 1), 2.4, C.brick) + `<text x="51" y="55" text-anchor="middle" font-family="Luckiest, 'Luckiest Guy', sans-serif" font-size="9" fill="${C.brick}" letter-spacing=".3">TOP SECRET</text></g>`;
    s += `</g>`;
    s += plate('SECRET', 80, C.mustard, C.ink, 19, 88);
    if (win) s += twinkle(12, 14, 6.5) + twinkle(90, 18, 5, C.mustard) + twinkle(12, 60, 4.5);
    return s;
  },
};

// one symbol as a standalone <svg> (size px). state: '' | 'win' | 'dim'
let UID = 0;
export function symbolSVG(id, size = 100, state = '') {
  const p = 's' + (++UID);
  seed(SEEDS[id] || 1);
  const win = state === 'win';
  const body = ART[id](p, win);
  const dim = state === 'dim' ? `<rect x="2" y="2" width="96" height="96" rx="3" fill="${C.ink}" opacity=".42"/>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${size}" height="${size}" style="overflow:visible;display:block"><defs>${defs(p)}<clipPath id="${p}-cc"><rect x="3" y="3" width="94" height="94"/></clipPath></defs>${body}${dim}</svg>`;
}
// same, as a <g> to drop inside a larger SVG at (x,y) with cell size `s`
export function symbolG(id, x, y, s, state = '') {
  const p = 'g' + (++UID);
  seed(SEEDS[id] || 1);
  const win = state === 'win';
  const body = ART[id](p, win);
  const dim = state === 'dim' ? `<rect x="2" y="2" width="96" height="96" rx="3" fill="${C.ink}" opacity=".38"/>` : '';
  return `<g transform="translate(${F(x)} ${F(y)}) scale(${s / 100})"><defs>${defs(p)}<clipPath id="${p}-cc"><rect x="3" y="3" width="94" height="94"/></clipPath></defs>${body}${dim}</g>`;
}

// ------------------------------------------------------------------ LOGO: AGENT MAMBO title card with a keyhole emblem and a film-strip bar
export function logo(cx, cy, k = 1) {
  seed(5);
  const word = (txt, x, y, size, fill) => {
    const a = `x="${x}" y="${y}" text-anchor="middle" font-family="Luckiest, 'Luckiest Guy', sans-serif" font-size="${size}" letter-spacing="${size * 0.04}"`;
    return `<text ${a} fill="${C.ink}" stroke="${C.ink}" stroke-width="${size * 0.2}" stroke-linejoin="round" transform="translate(${size * 0.05} ${size * 0.07})">${txt}</text>`
      + `<text ${a} fill="${C.ink}" stroke="${C.paper}" stroke-width="${size * 0.2}" stroke-linejoin="round" paint-order="stroke">${txt}</text>`
      + `<text ${a} fill="${fill}" stroke="${C.ink}" stroke-width="${size * 0.09}" stroke-linejoin="round" paint-order="stroke">${txt}</text>`
      + `<text ${a} fill="none" stroke="${C.paper}" stroke-width="${size * 0.03}" stroke-dasharray="${size * 0.08} ${size * 0.5}" stroke-linecap="round" opacity=".85" transform="translate(${-size * 0.02} ${-size * 0.03})">${txt}</text>`;
  };
  let s = `<g transform="translate(${cx} ${cy}) scale(${k})">`;
  // cut-paper backing: a jazzy irregular navy lozenge with a mustard offset shadow (the title card)
  s += `<path d="${cutPoly([[-190, -58], [170, -66], [196, 6], [176, 66], [-176, 70], [-200, 4]], 1.5)}" fill="${C.mustard}" transform="translate(7 7)"/>`;
  s += sh(cutPoly([[-190, -58], [170, -66], [196, 6], [176, 66], [-176, 70], [-200, 4]], 1.5), C.night, 3.4);
  s += `<path d="${cutPoly([[-182, -50], [163, -57], [186, 6], [168, 58], [-168, 62], [-190, 4]], 0)}" fill="url(#lg-htBL)"/>`;
  s += word('AGENT', -10, -10, 50, C.mustard);
  // film-strip bar with sprockets
  s += sh(cutRect(-150, 2, 300, 16, 0.5, 14, 3), C.ink, 0);
  for (let x = -142; x < 140; x += 16) s += `<rect x="${x}" y="6" width="8" height="8" rx="1.5" fill="${C.mustard}"/>`;
  s += word('MAMBO', 0, 62, 58, C.brick);
  // keyhole emblem medallion breaking the frame on the left
  s += `<g transform="translate(-196 -30)">` + rays(0, 0, 18, 40, 12, C.mustard, 0.25) + sh(cutEll(0, 0, 26, 26, 0.5), C.brick, 3) + sh(cutEll(0, 0, 18, 18, 0.4), C.cream, 2.4)
    + `<path d="M0 -11a6.4 6.4 0 0 1 3.4 11.8L6 13H-6l2.6 -12.2A6.4 6.4 0 0 1 0 -11Z" fill="${C.ink}"/></g>`;
  s += twinkle(178, -60, 10, C.paper, 2) + twinkle(198, -30, 6, C.mustard);
  return s + `</g>`;
}

// ------------------------------------------------------------------ the heroine: harmonising PAL override + the new EYE proposal
// Small PAL override (mutates the shared PAL object before the rig builds its markup): the yellow eyeshadow lid goes (it read as
// a heavy half-closed yellow shutter), the gold trims follow the scene mustard, the jacket uses the palette navy.
export const HEROINE_PAL = { eyeshadow: '#E9CFA0', gold: '#E8A92B', goldDeep: '#B87F1E', navyJ: '#27447E', navy: '#1E2F4A' };
// New eye design, applied as a DOM patch after createHeroine (the proposal for mambo_art.mjs is in the structured notes):
//  - eyes OPEN by default (u 0.86..0.92, no slant), the "sly" read now comes from the BROWS (one raised), not from a half-shut lid;
//  - a readable two-tone iris: turquoise disc with a darker ring, a SMALL pupil, one big round highlight + one small one;
//  - lid fill = skin, not yellow; brows thicker (stroke 3.2), higher, with a clear arch.
export function patchEyes(M, pre) {
  const svg = M.svg;
  for (const side of ['eye-l', 'eye-r']) {
    const q = (s) => svg.querySelector('#' + CSS.escape(pre + side + s));
    const disc = q('-iris-disc'); if (disc) { disc.setAttribute('fill', C.turq); disc.setAttribute('rx', '10.4'); disc.setAttribute('ry', '13.6'); disc.setAttribute('stroke', '#173F45'); disc.setAttribute('stroke-width', '2.6'); }
    const pup = q('-pupil'); if (pup) { pup.setAttribute('rx', '4.6'); pup.setAttribute('ry', '6.4'); pup.setAttribute('cy', '3'); }
    const gl = q('-glint'); if (gl) { gl.setAttribute('d', 'M-1 -6a4.6 4.6 0 1 0 0.01 0Z'); gl.setAttribute('transform', 'translate(4.4 1)'); }
    const lid = q('-lidfill'); if (lid) lid.setAttribute('fill', '#F8EDCB');   // lid = skin: a closed or winking eye reads as one clean curve
    const iris = q('-iris'); if (iris) { const lo = iris.querySelector('ellipse:nth-of-type(2)'); if (lo) { lo.setAttribute('fill', '#7FC4BC'); lo.setAttribute('cy', '10.4'); lo.setAttribute('rx', '6'); } }
  }
  for (const b of ['brow-l', 'brow-r']) { const e = svg.querySelector('#' + CSS.escape(pre + b)); if (e) e.setAttribute('stroke-width', '3.4'); }
  // open, friendly-malicious default: eyes open, one brow up (instead of the half-lid "sly" mood)
  M.set({ uL: 0.9, uR: 0.92, slL: 0, slR: 0, lowL: 0.12, lowR: 0.12, bLy: -2, bLr: -4, bLa: 9, bRy: -9, bRr: -10, bRa: 13, pup: 1 }, true);
}
