// Direction C "Spy dossier noir": shared hand-written SVG art (palette, symbols, logo, scene, console frame, HUD pieces).
// Everything is drawn in code: paths, circles, one dot pattern family. No bitmaps, no generative AI, no filters inside the art
// (the win glow is a CSS drop-shadow on the cell, as the game already does).
// Symbols are drawn in a 100 x 100 box. All text uses the display font "Luckiest" (Luckiest Guy, Apache-2.0, vendored).

// ------------------------------------------------------------------ the closed palette (9 tokens, all taken from the heroine PAL)
export const C = {
  ink: '#2B1A12',     // outlines, deepest shadow (heroine ink)
  night: '#162338',   // DOMINANT mood colour: sky, board well, console body (heroine navyDeep)
  navy: '#27447E',    // secondary blue: far city, panels, heroine jacket (heroine navyJ)
  cream: '#F4E8C8',   // dossier paper, index cards, skin (heroine cream)
  white: '#FFFBF0',   // gloves, glints, lettering highlight (heroine white)
  mustard: '#E8A92B', // brass, gold, lamps: the main glow accent (heroine mustard)
  red: '#B8352A',     // stamps, TOP SECRET, lips, SPIN core: the second accent (heroine brick)
  turq: '#2E8C8C',    // gadget glow, irises, the scatter's searchlight (heroine turquoise)
  brown: '#4A2216',   // hair, leather, wood, lettering extrusion (heroine hair)
};
// the only derived value: night overprinted with ink at about 45 % (board well, nearest skyline); not a new hue
export const NIGHT_INK = '#0E1626';
export const PALETTE = [
  ['night', 'mood / sky / well'], ['navy', 'city / panels / jacket'], ['ink', 'outline'], ['cream', 'dossier paper'], ['white', 'glint'],
  ['mustard', 'brass / gold glow'], ['red', 'stamp accent'], ['turq', 'gadget glow'], ['brown', 'leather / hair'],
];
// the heroine override: her off-palette derived tones are folded into the 9 tokens (applied to the shared PAL object before createHeroine)
export function harmoniseHeroine(PAL) {
  Object.assign(PAL, {
    navyLight: '#3B5B96', gold: C.mustard, goldDeep: C.brown, lips: C.red, lipsDeep: '#7E2018', eyeshadow: C.cream, blush: C.red,
    orange: C.red, plum: C.navy, olive: C.turq, camel: C.mustard, steel: C.cream, glass: C.cream, burgundy: C.brown,
  });
}

const f = (n) => Math.round(n * 10) / 10;
const I = C.ink;
// fill with a small print misregistration under a clean ink line (the 60s print look)
export const pp = (d, fill, sw = 3.2, mis = [1.3, 1.0], extra = '') =>
  `<path d="${d}" fill="${fill}" transform="translate(${mis[0]} ${mis[1]})"${extra}/><path d="${d}" fill="none" stroke="${I}" stroke-width="${sw}" stroke-linejoin="round" stroke-linecap="round"/>`;
export const ln = (d, w = 2.4, col = I, extra = '') => `<path d="${d}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"${extra}/>`;
export const ci = (x, y, r, fill, extra = '') => `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="${fill}"${extra}/>`;
const ell = (cx, cy, rx, ry) => `M${cx - rx} ${cy}a${rx} ${ry} 0 1 0 ${2 * rx} 0a${rx} ${ry} 0 1 0 ${-2 * rx} 0Z`;
const circD = (cx, cy, r) => ell(cx, cy, r, r);
const rr = (x, y, w, h, r) => `M${x + r} ${y}H${x + w - r}Q${x + w} ${y} ${x + w} ${y + r}V${y + h - r}Q${x + w} ${y + h} ${x + w - r} ${y + h}H${x + r}Q${x} ${y + h} ${x} ${y + h - r}V${y + r}Q${x} ${y} ${x + r} ${y}Z`;
export function rays(cx, cy, n, r, col, op = 1, rot = 0) {
  let d = '';
  for (let i = 0; i < n; i++) {
    const a0 = ((i / n) * 2 * Math.PI) + rot, a1 = a0 + Math.PI / n;
    d += `M${f(cx)} ${f(cy)}L${f(cx + Math.cos(a0) * r)} ${f(cy + Math.sin(a0) * r)}L${f(cx + Math.cos(a1) * r)} ${f(cy + Math.sin(a1) * r)}Z`;
  }
  return `<path d="${d}" fill="${col}" opacity="${op}"/>`;
}
export function star4(x, y, r, fill = C.white, op = 1) {
  return `<path d="M${f(x)} ${f(y - r)}Q${f(x + r * .18)} ${f(y - r * .18)} ${f(x + r)} ${f(y)}Q${f(x + r * .18)} ${f(y + r * .18)} ${f(x)} ${f(y + r)}Q${f(x - r * .18)} ${f(y + r * .18)} ${f(x - r)} ${f(y)}Q${f(x - r * .18)} ${f(y - r * .18)} ${f(x)} ${f(y - r)}Z" fill="${fill}" opacity="${op}"/>`;
}
function keyholeD(cx, cy, s) { return circD(cx, cy - s * .35, s * .42) + `M${f(cx - s * .2)} ${f(cy - s * .1)}L${f(cx + s * .2)} ${f(cy - s * .1)}L${f(cx + s * .34)} ${f(cy + s * .72)}L${f(cx - s * .34)} ${f(cy + s * .72)}Z`; }

// ------------------------------------------------------------------ defs (inject once per page in a 0x0 svg)
export const DEFS = `<svg width="0" height="0" style="position:absolute"><defs>
<pattern id="htI" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(30)"><circle cx="2.5" cy="2.5" r="1.25" fill="${I}" opacity=".32"/></pattern>
<pattern id="htIs" width="3.4" height="3.4" patternUnits="userSpaceOnUse" patternTransform="rotate(30)"><circle cx="1.7" cy="1.7" r=".75" fill="${I}" opacity=".3"/></pattern>
<pattern id="htC" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(30)"><circle cx="2.5" cy="2.5" r="1.1" fill="${C.cream}" opacity=".22"/></pattern>
<pattern id="htBig" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(30)"><circle cx="6" cy="6" r="2" fill="${C.cream}" opacity=".07"/></pattern>
<pattern id="htBigI" width="11" height="11" patternUnits="userSpaceOnUse" patternTransform="rotate(30)"><circle cx="5.5" cy="5.5" r="2.6" fill="${I}" opacity=".22"/></pattern>
<pattern id="lines" width="100" height="12" patternUnits="userSpaceOnUse"><path d="M0 11.5H100" stroke="${C.navy}" stroke-width=".9" opacity=".22"/></pattern>
<clipPath id="cell"><rect x="2" y="2" width="96" height="96" rx="9"/></clipPath>
</defs></svg>`;

// ------------------------------------------------------------------ chunky lettering (Luckiest, ink extrusion, cream sticker rim)
export function letter(txt, x, y, size, fill, o = {}) {
  const a = `x="${f(x)}" y="${f(y)}" text-anchor="${o.anchor || 'middle'}" font-family="Luckiest" font-size="${f(size)}" letter-spacing="${f(size * (o.ls ?? .03))}"`;
  const rim = o.rim ?? C.cream, ext = o.ext ?? I, depth = o.depth ?? .07;
  let s = '';
  s += `<text ${a} fill="${ext}" stroke="${ext}" stroke-width="${f(size * .22)}" stroke-linejoin="round" transform="translate(${f(size * depth * .8)} ${f(size * depth)})">${txt}</text>`;
  if (rim) s += `<text ${a} fill="${I}" stroke="${rim}" stroke-width="${f(size * .2)}" stroke-linejoin="round" paint-order="stroke">${txt}</text>`;
  s += `<text ${a} fill="${fill}" stroke="${I}" stroke-width="${f(size * .09)}" stroke-linejoin="round" paint-order="stroke">${txt}</text>`;
  if (o.shine !== false) s += `<text ${a} fill="none" stroke="${C.white}" stroke-width="${f(size * .026)}" stroke-dasharray="${f(size * .06)} ${f(size * .5)}" stroke-linecap="round" opacity=".8" transform="translate(${f(-size * .018)} ${f(-size * .028)})">${txt}</text>`;
  return s;
}
// plain label text (HUD), optional ink offset
export const label = (txt, x, y, size, fill, o = {}) => `<text x="${f(x)}" y="${f(y)}" text-anchor="${o.anchor || 'middle'}" font-family="Luckiest" font-size="${f(size)}" letter-spacing="${f(size * (o.ls ?? .04))}" fill="${fill}"${o.stroke ? ` stroke="${o.stroke}" stroke-width="${f(o.sw || size * .14)}" paint-order="stroke" stroke-linejoin="round"` : ''}${o.extra || ''}>${txt}</text>`;

// ------------------------------------------------------------------ SYMBOL CARDS
// HIGH = an "evidence photo": brass rim with rivets, a full-bleed coloured panel, cream spotlight behind a big full-colour object.
// LOW  = a cream index card (red head rule, faint blue lines, dog-ear) with a single object stamped in one ink colour.
function cardHigh(bg, inner, o = {}) {
  let s = `<rect x="2.5" y="2.5" width="95" height="95" rx="10" fill="${C.mustard}" stroke="${I}" stroke-width="3"/>`;
  s += `<path d="M8 16V12Q8 8 12 8H40" fill="none" stroke="${C.white}" stroke-width="2" stroke-linecap="round" opacity=".75"/>`;
  s += `<rect x="9" y="9" width="82" height="82" rx="5" fill="${bg}" stroke="${I}" stroke-width="2.6"/>`;
  s += `<g clip-path="url(#cellIn)"><rect x="9" y="9" width="82" height="82" fill="url(#htI)" opacity=".55"/>`;
  s += o.halo === false ? '' : ci(50, 52, 33, C.cream, ' opacity=".2"') + ci(50, 52, 24, C.cream, ' opacity=".16"');
  s += `</g>`;
  for (const [x, y] of [[6, 6], [94, 6], [6, 94], [94, 94]]) s += ci(x, y, 1.9, C.brown);
  return `<clipPath id="cellIn"><rect x="9" y="9" width="82" height="82" rx="5"/></clipPath>` + s + inner;
}
function cardLow(inner) {
  let s = `<path d="M2.5 11Q2.5 2.5 11 2.5H80L97.5 20V89Q97.5 97.5 89 97.5H11Q2.5 97.5 2.5 89Z" fill="${C.cream}" stroke="${I}" stroke-width="3"/>`;
  s += `<g clip-path="url(#cell)"><rect x="0" y="0" width="100" height="100" fill="${C.mustard}" opacity=".13"/><rect x="0" y="22" width="100" height="78" fill="url(#lines)"/>`;
  s += `<path d="M6 19H94" stroke="${C.red}" stroke-width="1.6" opacity=".55"/>`;
  s += `<path d="M60 97.5L97.5 60V97.5Z" fill="url(#htIs)" opacity=".7"/></g>`;
  s += `<path d="M80 2.5V16Q80 20 84 20H97.5Z" fill="${C.white}" stroke="${I}" stroke-width="2.4" stroke-linejoin="round"/>`;
  return s + inner;
}

// ---- the 10 symbols -----------------------------------------------------------------------------------------------------------
const SYM = {
  // H1 SAFE: navy strongbox, brass dial with a red index, lever handle, on a red panel
  H1: () => cardHigh(C.red,
    pp(rr(19, 20, 62, 60, 7), C.navy, 3.4)
    + `<path d="${rr(19, 20, 62, 60, 7)}" fill="url(#htIs)" opacity=".6"/>`
    + pp(rr(25, 26, 50, 48, 4), C.navy, 2.6)
    + ln('M27 30V68', 2, C.white, ' opacity=".45"') + ln('M31 28H60', 2, C.white, ' opacity=".45"')
    + pp(rr(15, 32, 7, 8, 2), C.mustard, 2.2) + pp(rr(15, 60, 7, 8, 2), C.mustard, 2.2)
    + pp(circD(47, 50, 17), C.mustard, 3) + pp(circD(47, 50, 12.5), C.cream, 2.4)
    + [...Array(12)].map((_, i) => { const a = (i / 12) * Math.PI * 2; return ln(`M${f(47 + Math.cos(a) * 9.4)} ${f(50 + Math.sin(a) * 9.4)}L${f(47 + Math.cos(a) * 12)} ${f(50 + Math.sin(a) * 12)}`, 1.6); }).join('')
    + pp(circD(47, 50, 4.6), C.navy, 2) + pp('M47 34L50 39H44Z', C.red, 1.6)
    + pp(rr(68, 38, 6, 24, 3), C.mustard, 2.4) + pp(circD(71, 50, 4), C.mustard, 2)
    + pp(rr(24, 80, 10, 6, 1.5), I, 1.6) + pp(rr(66, 80, 10, 6, 1.5), I, 1.6)
    + star4(80, 18, 5) + star4(16, 82, 3.4, C.white, .8)),

  // H2 COCKTAIL: cream martini glass, red drink, brass lemon wheel and pick with a cherry, on a turquoise panel
  H2: () => cardHigh(C.turq,
    pp('M50 60L50 79', C.cream, 0) + pp(rr(47, 58, 6, 22, 2), C.white, 2.6)
    + pp(ell(50, 81, 17, 5), C.white, 2.8)
    + pp('M15 25H85L50 62Z', C.white, 3.4)
    + pp('M22 31H78L50 58Z', C.red, 0) + `<path d="M22 31H78L50 58Z" fill="url(#htIs)" opacity=".5"/>` + ln('M22 31H78', 2.4)
    + ln('M24 29L45 51', 2.6, C.white, ' opacity=".85"')
    + ln('M66 12L44 44', 2.6, C.brown) + pp(circD(66, 13, 6.5), C.red, 2.4) + ci(64, 11, 1.8, C.white)
    + pp(circD(23, 24, 10), C.mustard, 2.6) + pp(circD(23, 24, 6.4), C.cream, 1.6)
    + ln('M23 18V30M17 24H29M19 20L27 28M27 20L19 28', 1.2, C.mustard)
    + star4(82, 46, 5) + star4(78, 76, 3.4, C.white, .8)),

  // H3 VINYL: black record with a red label and a brass note, cream spotlight behind, on a navy panel
  H3: () => cardHigh(C.navy,
    ci(52, 52, 37, C.cream, ' opacity=".9"') + `<circle cx="52" cy="52" r="37" fill="url(#htIs)"/>`
    + pp(circD(48, 54, 33), I, 3, [0, 0])
    + [29, 25, 21].map((r) => `<circle cx="48" cy="54" r="${r}" fill="none" stroke="${C.navy}" stroke-width="1.2"/>`).join('')
    + ln('M24 40Q30 28 42 24', 3, C.white, ' opacity=".7"') + ln('M70 70Q64 80 54 84', 2.4, C.white, ' opacity=".4"')
    + pp(circD(48, 54, 12), C.red, 2) + `<circle cx="48" cy="54" r="8.4" fill="none" stroke="${C.mustard}" stroke-width="1.4"/>` + ci(48, 54, 2.4, C.cream)
    + pp('M74 34V14L88 11V29', 'none', 3) + pp(ell(70, 34, 5.4, 4.2), C.mustard, 2.4) + pp(ell(84, 30, 5.4, 4.2), C.mustard, 2.4) + ln('M74 18L88 15', 3.4)),

  // H4 BONGOS: two red bongos with brass hoops and cream heads, on a brown panel
  H4: () => {
    const drum = (cx, top, rx, h, k) => {
      const bot = top + h, rb = rx * .7;
      return pp(`M${cx - rx} ${top}L${cx - rb} ${bot}Q${cx} ${bot + rb * .45} ${cx + rb} ${bot}L${cx + rx} ${top}Z`, C.red, 3)
        + `<path d="M${cx + rx * .2} ${top + 3}L${cx + rx - 1} ${top + 2}L${cx + rb - 1} ${bot - 1}L${cx + rb * .2} ${bot + 2}Z" fill="url(#htIs)"/>`
        + pp(`M${cx - rx * .93} ${top + h * .42}Q${cx} ${top + h * .42 + rx * .5} ${cx + rx * .93} ${top + h * .42}`, 'none', 4.6, [0, 0]) + ln(`M${cx - rx * .93} ${top + h * .42}Q${cx} ${top + h * .42 + rx * .5} ${cx + rx * .93} ${top + h * .42}`, 2.4, C.mustard)
        + pp(ell(cx, top, rx + 2, rx * .42 + 1.5), C.mustard, 3) + pp(ell(cx, top - 1, rx - 1.5, rx * .34), C.cream, 2) + ln(`M${cx - rx * .5} ${top - 3}Q${cx - rx * .1} ${top - 5} ${cx + rx * .3} ${top - 4}`, 1.8, C.white)
        + ln(`M${cx - rx * .6} ${top + 4}L${cx - rx * .5} ${top + 12}M${cx + rx * .6} ${top + 4}L${cx + rx * .5} ${top + 12}`, 2.2, I) + (k ? '' : '');
    };
    return cardHigh(C.brown, pp(rr(44, 46, 14, 10, 2), C.mustard, 2.4) + drum(68, 40, 15, 36) + drum(33, 33, 19, 44)
      + star4(84, 18, 5) + ln('M14 18Q18 14 22 18M80 84Q84 80 88 84', 2.2, C.mustard));
  },

  // L1 FEDORA (brown stamp)
  L1: () => cardLow(
    pp('M14 64C14 56 86 56 86 64C86 73 14 73 14 64Z', C.brown, 3.2)
    + pp('M28 62C27 46 31 30 50 29C69 30 73 46 72 62C60 66 40 66 28 62Z', C.brown, 3.2)
    + `<path d="M50 29C69 30 73 46 72 62C66 64 60 65 54 65C58 50 58 38 50 29Z" fill="url(#htI)"/>`
    + pp('M28.6 52C40 56 60 56 71.4 52L72 61C60 65 40 65 28 61Z', C.red, 2.6)
    + ln('M38 33Q50 42 62 33', 2.6) + ln('M33 60Q50 63 67 60', 0) + ln('M20 63Q30 60 40 61', 2, C.cream, ' opacity=".7"')),

  // L2 ROTARY PHONE (red stamp)
  L2: () => cardLow(
    pp('M22 82L28 52C30 46 70 46 72 52L78 82Z', C.red, 3.2)
    + `<path d="M58 48C66 48 71 50 72 52L78 82H62Z" fill="url(#htI)"/>`
    + pp('M12 42C12 26 88 26 88 42C88 47 82 49 78 46C72 37 28 37 22 46C18 49 12 47 12 42Z', C.red, 3.2)
    + ln('M24 33Q50 26 76 33', 2, C.cream, ' opacity=".7"')
    + pp(circD(50, 64, 13), C.cream, 2.6)
    + [...Array(8)].map((_, i) => { const a = -2.4 + i * 0.62; return ci(50 + Math.cos(a) * 8.6, 64 + Math.sin(a) * 8.6, 2.1, I); }).join('')
    + pp(circD(50, 64, 4), C.red, 1.8)),

  // L3 MAGNIFIER (navy + brass stamp)
  L3: () => cardLow(
    pp('M57 60L63 54L86 79Q88 84 83 86L80 87Z', C.navy, 3.2)
    + pp('M55 58L61 52L67 58L61 64Z', C.mustard, 2.6)
    + pp(circD(42, 44, 25), C.mustard, 3.2) + pp(circD(42, 44, 18), C.white, 2.6)
    + `<circle cx="42" cy="44" r="18" fill="${C.turq}" opacity=".25"/>`
    + ln('M30 38Q33 30 41 28', 3, C.white) + ln('M36 50Q42 56 50 50M34 44Q42 52 52 44M38 56Q44 60 50 56', 1.6, C.navy, ' opacity=".55"')),

  // L4 BOW TIE (turquoise stamp with cream polka dots)
  L4: () => cardLow(
    pp('M44 50L14 32Q8 50 14 68Z', C.turq, 3.2) + pp('M56 50L86 32Q92 50 86 68Z', C.turq, 3.2)
    + `<path d="M56 50L86 32Q92 50 86 68Z" fill="url(#htI)" opacity=".7"/>`
    + [[20, 42], [24, 56], [32, 50], [70, 44], [78, 55], [68, 56]].map(([x, y]) => ci(x, y, 2.6, C.cream)).join('')
    + pp(rr(42, 40, 16, 20, 5), C.turq, 3) + ln('M46 44Q50 50 46 56', 1.8, C.cream, ' opacity=".8"')
    + ln('M22 38L34 46M22 62L34 54', 1.8, I, ' opacity=".6"')),

  // WILD: die-cut gold agency badge (12-point scalloped star, keyhole core) on golden rays, red ribbon lettered WILD
  W: (win) => {
    let s = `<rect x="2" y="2" width="96" height="96" rx="9" fill="${C.night}"/>`;
    s += `<g clip-path="url(#cell)">` + rays(50, 42, 14, 90, C.mustard, win ? .55 : .28, win ? .12 : 0) + ci(50, 42, 40, C.mustard, ` opacity="${win ? .3 : .14}"`) + `</g>`;
    s += `<rect x="2" y="2" width="96" height="96" rx="9" fill="none" stroke="${C.mustard}" stroke-width="${win ? 4 : 2.6}"/>`;
    let d = ''; const n = 12, R = 34, r = 28.5;
    for (let i = 0; i < n * 2; i++) { const a = (i / (n * 2)) * Math.PI * 2 - Math.PI / 2, rad = i % 2 ? r : R; d += (i ? 'L' : 'M') + f(50 + Math.cos(a) * rad) + ' ' + f(42 + Math.sin(a) * rad); }
    d += 'Z';
    s += `<path d="${d}" fill="${C.cream}" stroke="${C.cream}" stroke-width="7" stroke-linejoin="round"/>`;
    s += pp(d, C.mustard, 3.2);
    s += `<path d="M50 42L${d.slice(1).split('L').slice(6, 13).join('L')}Z" fill="url(#htI)" opacity=".55"/>`;
    s += pp(circD(50, 42, 20), C.navy, 2.8) + `<circle cx="50" cy="42" r="16.5" fill="none" stroke="${C.mustard}" stroke-width="1.6" stroke-dasharray="2.4 2.2"/>`;
    s += pp(keyholeD(50, 42, 15), C.cream, 2.2, [0.8, 0.6]);
    s += star4(24, 16, 4.4) + star4(80, 22, 3.4);
    // ribbon
    s += pp('M8 66L18 62L18 86L8 90L13 78Z', C.brown, 2.6) + pp('M92 66L82 62L82 86L92 90L87 78Z', C.brown, 2.6);
    s += pp('M14 60Q50 54 86 60L86 84Q50 78 14 84Z', C.red, 3);
    s += letter('WILD', 50, 80, 25, C.cream, { rim: false, depth: .06, ls: .04 });
    if (win) s += star4(14, 40, 6) + star4(88, 46, 5) + star4(70, 8, 4.4);
    return s;
  },

  // SCATTER: die-cut TOP SECRET dossier (mustard folder, cream sheets, red rubber stamp plate) on turquoise searchlight rays
  S: (win) => {
    let s = `<rect x="2" y="2" width="96" height="96" rx="9" fill="${C.night}"/>`;
    s += `<g clip-path="url(#cell)">` + rays(50, 50, 12, 90, C.turq, win ? .6 : .38, win ? .2 : 0.1) + ci(50, 50, 36, C.turq, ` opacity="${win ? .35 : .18}"`) + `</g>`;
    s += `<rect x="2" y="2" width="96" height="96" rx="9" fill="none" stroke="${win ? C.mustard : C.turq}" stroke-width="${win ? 4 : 2.6}"/>`;
    s += `<g transform="rotate(-8 50 52)">`;
    const back = 'M14 28Q14 24 18 24H38L43 30H82Q86 30 86 34V80Q86 84 82 84H18Q14 84 14 80Z';
    s += `<path d="${back}" fill="${C.cream}" stroke="${C.cream}" stroke-width="7" stroke-linejoin="round"/>` + pp(back, C.mustard, 3);
    s += pp(rr(22, 22, 52, 50, 2), C.white, 2.2) + ln('M28 32H62M28 39H66M28 46H56', 1.8, C.navy, ' opacity=".5"');
    s += pp('M12 42Q12 38 16 38H84Q88 38 88 42L86 80Q86 84 82 84H18Q14 84 14 80Z', C.mustard, 3);
    s += `<path d="M50 38H84Q88 38 88 42L86 80Q86 84 82 84H50Z" fill="url(#htI)" opacity=".5"/>`;
    s += `</g>`;
    s += `<g transform="rotate(-14 50 62)">` + pp(rr(10, 50, 80, 26, 4), C.red, 3) + `<rect x="14" y="54" width="72" height="18" rx="2" fill="none" stroke="${C.cream}" stroke-width="1.6" stroke-dasharray="3 1.6"/>`
      + letter('TOP SECRET', 50, 69, 15.5, C.cream, { rim: false, depth: .05, shine: false, ls: .02 }) + `</g>`;
    if (win) s += star4(12, 18, 6) + star4(88, 14, 5) + star4(90, 88, 4.4);
    else s += star4(86, 16, 4);
    return s;
  },
};
export const SYMBOL_IDS = ['H1', 'H2', 'H3', 'H4', 'L1', 'L2', 'L3', 'L4', 'W', 'S'];
export const SYMBOL_NAMES = { H1: 'safe', H2: 'cocktail', H3: 'vinyl', H4: 'bongos', L1: 'fedora', L2: 'phone', L3: 'magnifier', L4: 'bow tie', W: 'wild', S: 'scatter' };
let uid = 0;
export function symbolInner(id, win = false) {
  // unique clip ids per instance (cellIn is local to the high card)
  const k = 'c' + (++uid);
  return SYM[id](win).replace(/cellIn/g, k);
}
export const symbolSVG = (id, size, win = false, extra = '') => `<svg width="${size}" height="${size}" viewBox="0 0 100 100"${extra}>${symbolInner(id, win)}</svg>`;

// ------------------------------------------------------------------ LOGO (viewBox 0 0 640 300): agency badge emblem on top, a riveted brass-rimmed ticket plate, two lettered words
export function badgeD(cx, cy, R, r, n = 12) { let d = ''; for (let i = 0; i < n * 2; i++) { const a = (i / (n * 2)) * Math.PI * 2 - Math.PI / 2, q = i % 2 ? r : R; d += (i ? 'L' : 'M') + f(cx + Math.cos(a) * q) + ' ' + f(cy + Math.sin(a) * q); } return d + 'Z'; }
// emblem: gold 12-point agency badge, red ring, navy core, cream keyhole (R = outer radius)
export function emblem(cx, cy, R) {
  const k = R / 66;
  let s = `<path d="${badgeD(cx, cy, R, R * .85)}" fill="${C.cream}" stroke="${C.cream}" stroke-width="${14 * k}" stroke-linejoin="round"/>`;
  s += `<path d="${badgeD(cx, cy, R, R * .85)}" fill="${I}" opacity=".5" transform="translate(${6 * k} ${8 * k})"/>`;
  s += pp(badgeD(cx, cy, R, R * .85), C.mustard, 5 * k, [3 * k, 3 * k]);
  s += `<path d="${badgeD(cx, cy, R, R * .85)}" fill="url(#htI)" opacity=".35"/>`;
  s += pp(circD(cx, cy, 40 * k), C.red, 4.4 * k, [2 * k, 2 * k]) + `<circle cx="${cx}" cy="${cy}" r="${33 * k}" fill="none" stroke="${C.cream}" stroke-width="${2.6 * k}" stroke-dasharray="${6 * k} ${5 * k}"/>`;
  s += pp(circD(cx, cy, 26 * k), C.navy, 3.4 * k, [0, 0]) + pp(keyholeD(cx, cy - 2 * k, 24 * k), C.cream, 3 * k, [1.5 * k, 1.5 * k]);
  s += ln(`M${f(cx - 46 * k)} ${f(cy - 30 * k)}Q${f(cx - 30 * k)} ${f(cy - 50 * k)} ${f(cx - 6 * k)} ${f(cy - 54 * k)}`, 4 * k, C.white, ' opacity=".7"');
  return s;
}
const ticket = (x0, y0, x1, y1, n) => `M${x0 + n} ${y0}H${x1 - n}L${x1} ${y0 + n}L${x1 - n * .7} ${(y0 + y1) / 2}L${x1} ${y1 - n}L${x1 - n} ${y1}H${x0 + n}L${x0} ${y1 - n}L${x0 + n * .7} ${(y0 + y1) / 2}L${x0} ${y0 + n}Z`;
function plateArt(x0, y0, x1, y1, n) {
  const d = ticket(x0, y0, x1, y1, n), di = ticket(x0 + 12, y0 + 12, x1 - 12, y1 - 12, n - 4);
  let s = `<path d="${d}" fill="${I}" opacity=".55" transform="translate(8 10)"/>` + `<path d="${d}" fill="${C.cream}" stroke="${C.cream}" stroke-width="14" stroke-linejoin="round"/>`;
  s += pp(d, C.mustard, 5, [0, 0]) + pp(di, C.navy, 3.4, [0, 0]) + `<path d="${di}" fill="url(#htI)" opacity=".6"/>`;
  for (const x of [x0 + 26, x1 - 26]) for (const y of [y0 + 24, y1 - 24]) s += ci(x, y, 4.4, C.mustard, ` stroke="${I}" stroke-width="2"`);
  return s;
}
// mode 'stack' (viewBox 0 0 640 320, portrait / splash) or 'wide' (viewBox 0 0 960 230, one line over the landscape board)
export function logo(mode = 'stack') {
  let s = '';
  if (mode === 'wide') {
    const cx = 480, cy = 112;
    s += rays(cx, cy, 18, 200, C.mustard, .13, .1);
    s += plateArt(40, 52, 920, 176, 34);
    s += ln('M86 72H330M630 72H874', 3, C.mustard, ' opacity=".6"') + ln('M86 156H330M630 156H874', 3, C.mustard, ' opacity=".6"');
    s += emblem(cx, cy, 94);
    s += star4(cx - 150, 26, 13) + star4(cx + 160, 20, 10) + star4(60, 200, 8, C.cream, .8) + star4(905, 34, 9, C.cream, .8);
    s += letter('AGENT', 232, 150, 96, C.mustard, { depth: .06, ls: .06 });
    s += letter('MAMBO', 730, 154, 104, C.red, { depth: .06, ls: .04 });
    return s;
  }
  const cx = 320;
  s += rays(cx, 80, 16, 160, C.mustard, .14, .1);
  s += plateArt(40, 108, 600, 224, 32);
  s += ln('M104 132H236M404 132H536', 3, C.mustard, ' opacity=".7"');
  s += emblem(cx, 78, 66);
  s += star4(cx - 104, 44, 12) + star4(cx + 108, 34, 9) + star4(cx + 84, 62, 5, C.cream, .8);
  s += letter('AGENT', cx, 206, 62, C.mustard, { depth: .06, ls: .12 });
  s += letter('MAMBO', cx, 308, 108, C.red, { depth: .06 });
  return s;
}


// ------------------------------------------------------------------ SCENE: rooftop city at night with searchlights
export function scene(W, H, o = {}) {
  let seed = o.seed || 5; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647), R = (a, b) => a + (b - a) * rnd();
  const gy = o.horizon ?? H * .78; // roof line
  let s = `<rect width="${W}" height="${H}" fill="${C.night}"/>`;
  // darker zenith bands (ink over night, stepped, no gradient)
  [0, .12, .24].forEach((y, i) => { s += `<rect y="0" width="${W}" height="${H * (.36 - y)}" fill="${I}" opacity=".16"/>`; });
  // a low navy glow band over the city
  s += `<path d="M0 ${gy - H * .3}Q${W * .5} ${gy - H * .36} ${W} ${gy - H * .3}V${gy}H0Z" fill="${C.navy}" opacity=".45"/>`;
  s += `<path d="M0 ${gy - H * .16}Q${W * .5} ${gy - H * .2} ${W} ${gy - H * .16}V${gy}H0Z" fill="${C.navy}" opacity=".45"/>`;
  s += `<rect width="${W}" height="${H}" fill="url(#htBig)"/>`;
  // stars
  for (let i = 0; i < W / 18; i++) { const x = R(0, W), y = R(0, gy * .55); s += star4(x, y, R(1.4, 3.6), C.cream, R(.35, .85)); }
  // moon (a cream disc with brass ring, keyhole shadow) top-left behind the heroine
  if (o.moon) { const [mx, my, mr] = o.moon; s += ci(mx, my, mr * 1.5, C.cream, ' opacity=".05"') + ci(mx, my, mr * 1.22, C.cream, ' opacity=".07"') + `<circle cx="${mx}" cy="${my}" r="${mr}" fill="${C.cream}" stroke="${C.mustard}" stroke-width="${mr * .06}"/>` + `<circle cx="${mx}" cy="${my}" r="${mr}" fill="url(#htIs)" opacity=".35"/>` + ci(mx - mr * .35, my + mr * .2, mr * .14, C.mustard, ' opacity=".35"') + ci(mx + mr * .3, my - mr * .32, mr * .1, C.mustard, ' opacity=".35"'); }
  // searchlight beams from the rooftops
  (o.beams || [[.08, 14], [.3, -22], [.93, -12], [.7, 26]]).forEach(([fx, a], i) => {
    const bx = W * fx, len = gy * 1.4, wd = len * .09, t = Math.tan(a * Math.PI / 180) * len;
    s += `<path d="M${bx - 5} ${gy}L${bx - wd + t} ${gy - len}L${bx + wd + t} ${gy - len}L${bx + 5} ${gy}Z" fill="${C.cream}" opacity="${i % 2 ? .07 : .1}"/>`;
    s += `<path d="M${bx - 2} ${gy}L${bx - wd * .35 + t} ${gy - len}L${bx + wd * .35 + t} ${gy - len}L${bx + 2} ${gy}Z" fill="${C.cream}" opacity=".06"/>`;
  });
  // far city (navy) and near city (ink-night) with lit windows
  const city = (base, hmin, hmax, fill, op, win, scale) => {
    let x = -10;
    while (x < W + 10) {
      const bw = R(40, 110) * scale, bh = R(hmin, hmax), top = base - bh;
      s += `<path d="M${f(x)} ${base}V${f(top)}H${f(x + bw)}V${base}Z" fill="${fill}" opacity="${op}"/>`;
      const r = rnd();
      if (r < .2) s += `<path d="M${f(x + bw * .5)} ${f(top)}v${f(-bh * .35)}" stroke="${fill}" stroke-width="3" opacity="${op}"/>` + (win ? ci(x + bw * .5, top - bh * .35, 3, C.red) : '');
      else if (r < .35) s += `<path d="M${f(x + bw * .15)} ${f(top)}L${f(x + bw * .5)} ${f(top - bw * .3)}L${f(x + bw * .85)} ${f(top)}Z" fill="${fill}" opacity="${op}"/>`;
      if (win) for (let wy = top + 10 * scale; wy < base - 12; wy += 18 * scale) for (let wx = x + 8 * scale; wx < x + bw - 10 * scale; wx += 15 * scale) if (rnd() < .22) s += `<rect x="${f(wx)}" y="${f(wy)}" width="${f(6 * scale)}" height="${f(9 * scale)}" fill="${rnd() < .85 ? C.mustard : C.cream}" opacity=".75"/>`;
      x += bw + R(2, 10) * scale;
    }
  };
  const sc = o.scale || 1, ch = o.cityH || 1;
  city(gy, H * .12 * ch, H * .34 * ch, C.navy, .55, false, sc);
  city(gy, H * .07 * ch, H * .22 * ch, NIGHT_INK, 1, true, sc);
  // rooftop: parapet in night/ink with brass coping, water tower on one side
  s += `<rect x="0" y="${gy}" width="${W}" height="${H - gy}" fill="${C.night}"/><rect x="0" y="${gy}" width="${W}" height="${H - gy}" fill="url(#htBigI)"/>`;
  s += `<path d="M0 ${gy}H${W}" stroke="${I}" stroke-width="6"/><rect x="0" y="${gy - 3}" width="${W}" height="6" fill="${C.mustard}" opacity=".55"/>`;
  for (let x = 20; x < W; x += 64 * sc) s += `<path d="M${x} ${gy + 6}V${H}" stroke="${I}" stroke-width="2" opacity=".5"/>`;
  if (o.tower) { const [tx, ty, ts] = o.tower; // water tower silhouette
    s += `<g opacity=".95">` + `<path d="M${tx - 26 * ts} ${ty}L${tx - 34 * ts} ${ty + 70 * ts}M${tx + 26 * ts} ${ty}L${tx + 34 * ts} ${ty + 70 * ts}M${tx} ${ty}V${ty + 70 * ts}M${tx - 30 * ts} ${ty + 36 * ts}H${tx + 30 * ts}" stroke="#0E1626" stroke-width="${5 * ts}"/>`
      + `<path d="M${tx - 32 * ts} ${ty}V${ty - 54 * ts}H${tx + 32 * ts}V${ty}Z" fill="${NIGHT_INK}"/><path d="M${tx - 38 * ts} ${ty - 54 * ts}L${tx} ${ty - 82 * ts}L${tx + 38 * ts} ${ty - 54 * ts}Z" fill="${NIGHT_INK}"/>`
      + `<path d="M${tx - 32 * ts} ${ty - 40 * ts}H${tx + 32 * ts}M${tx - 32 * ts} ${ty - 20 * ts}H${tx + 32 * ts}" stroke="${C.navy}" stroke-width="${2 * ts}"/>` + ci(tx, ty - 86 * ts, 3.4 * ts, C.red) + `</g>`; }
  return s;
}

// ------------------------------------------------------------------ CONSOLE FRAME around the well (x, y, w, h = the well)
export function consoleFrame(x, y, w, h, o = {}) {
  const t = o.t || 24, b = o.brass || 8, k = o.k || 1;
  let s = '';
  // drop shadow
  s += `<rect x="${x - t + 10 * k}" y="${y - t + 14 * k}" width="${w + 2 * t}" height="${h + 2 * t}" rx="${18 * k}" fill="${I}" opacity=".55"/>`;
  // brass outer rim
  s += `<rect x="${x - t}" y="${y - t}" width="${w + 2 * t}" height="${h + 2 * t}" rx="${18 * k}" fill="${C.mustard}" stroke="${I}" stroke-width="${4 * k}"/>`;
  s += `<rect x="${x - t}" y="${y - t}" width="${w + 2 * t}" height="${h + 2 * t}" rx="${18 * k}" fill="url(#htI)" opacity=".35"/>`;
  s += `<path d="M${x - t + 8 * k} ${y + h * .4}V${y - t + 20 * k}Q${x - t + 8 * k} ${y - t + 8 * k} ${x - t + 20 * k} ${y - t + 8 * k}H${x + w * .45}" fill="none" stroke="${C.white}" stroke-width="${2.4 * k}" stroke-linecap="round" opacity=".6"/>`;
  // console body (night steel) inset
  const ib = b * k;
  s += `<rect x="${x - t + ib}" y="${y - t + ib}" width="${w + 2 * (t - ib)}" height="${h + 2 * (t - ib)}" rx="${12 * k}" fill="${C.navy}" stroke="${I}" stroke-width="${3 * k}"/>`;
  s += `<rect x="${x - t + ib}" y="${y - t + ib}" width="${w + 2 * (t - ib)}" height="${h + 2 * (t - ib)}" rx="${12 * k}" fill="url(#htI)" opacity=".5"/>`;
  // rivets along the body
  const rv = (cx, cy) => ci(cx, cy, 3.2 * k, C.mustard, ` stroke="${I}" stroke-width="${1.4 * k}"`) + ci(cx - 1 * k, cy - 1 * k, 1 * k, C.white);
  const mid = (t + ib) / 2;
  for (let xx = x + 30 * k; xx < x + w - 20 * k; xx += 46 * k) { s += rv(xx, y - mid); s += rv(xx, y + h + mid); }
  for (let yy = y + 30 * k; yy < y + h - 20 * k; yy += 46 * k) { s += rv(x - mid, yy); s += rv(x + w + mid, yy); }
  // the well
  s += `<rect x="${x - 4 * k}" y="${y - 4 * k}" width="${w + 8 * k}" height="${h + 8 * k}" rx="${10 * k}" fill="${NIGHT_INK}" stroke="${I}" stroke-width="${3 * k}"/>`;
  s += `<rect x="${x - 4 * k}" y="${y - 4 * k}" width="${w + 8 * k}" height="${h + 8 * k}" rx="${10 * k}" fill="none" stroke="${C.cream}" stroke-width="${1.4 * k}" opacity=".25" transform="translate(${2 * k} ${2 * k})"/>`;
  // corner gauges (cream face, ink ticks, red needle)
  if (o.gauges !== false) {
    const gauge = (cx, cy, r, a) => {
      let g = ci(cx + 3 * k, cy + 4 * k, r + 4 * k, I, ' opacity=".5"') + ci(cx, cy, r + 4 * k, C.mustard, ` stroke="${I}" stroke-width="${3 * k}"`) + ci(cx, cy, r, C.cream, ` stroke="${I}" stroke-width="${2 * k}"`);
      for (let i = 0; i <= 8; i++) { const aa = Math.PI * (0.8 + i * 0.175); g += ln(`M${f(cx + Math.cos(aa) * r * .62)} ${f(cy + Math.sin(aa) * r * .62)}L${f(cx + Math.cos(aa) * r * .86)} ${f(cy + Math.sin(aa) * r * .86)}`, (i % 4 ? 1.6 : 2.6) * k); }
      g += `<path d="M${f(cx + Math.cos(Math.PI * 1.75) * r * .58)} ${f(cy + Math.sin(Math.PI * 1.75) * r * .58)}A${r * .58} ${r * .58} 0 0 1 ${f(cx + Math.cos(Math.PI * 2.2) * r * .58)} ${f(cy + Math.sin(Math.PI * 2.2) * r * .58)}" fill="none" stroke="${C.red}" stroke-width="${3 * k}"/>`;
      g += ln(`M${cx} ${cy}L${f(cx + Math.cos(a) * r * .8)} ${f(cy + Math.sin(a) * r * .8)}`, 3 * k, C.red) + ci(cx, cy, 4 * k, I);
      return g;
    };
    const gr = o.gr || 22 * k;
    const gy = o.gaugesBottom ? y + h + t * .3 : y - t * .3;
    s += gauge(x - t * .3, gy, gr, Math.PI * 1.3) + gauge(x + w + t * .3, gy, gr, Math.PI * 1.9);
  }
  // bottom lamps
  if (o.lamps !== false) for (let i = 0; i < 6; i++) { const lx = x + w * (i + .5) / 6, ly = y + h + t - ib / 2 - 1 * k; s += ci(lx, ly, 3.6 * k, i % 2 ? C.turq : C.red, ` stroke="${I}" stroke-width="${1.4 * k}"`); }
  return s;
}

// ------------------------------------------------------------------ searchlights mounted on the console (beam behind, lamp in front)
export function beam(x, y, a, len, w, op = .12) {
  const r = a * Math.PI / 180, dx = Math.sin(r), dy = -Math.cos(r), nx = -dy, ny = dx;
  const ex = x + dx * len, ey = y + dy * len;
  return `<path d="M${f(x + nx * 8)} ${f(y + ny * 8)}L${f(ex + nx * w)} ${f(ey + ny * w)}L${f(ex - nx * w)} ${f(ey - ny * w)}L${f(x - nx * 8)} ${f(y - ny * 8)}Z" fill="${C.cream}" opacity="${op}"/>`
    + `<path d="M${f(x + nx * 4)} ${f(y + ny * 4)}L${f(ex + nx * w * .4)} ${f(ey + ny * w * .4)}L${f(ex - nx * w * .4)} ${f(ey - ny * w * .4)}L${f(x - nx * 4)} ${f(y - ny * 4)}Z" fill="${C.cream}" opacity="${op * .8}"/>`;
}
export function lamp(x, y, a, k = 1) {
  // a brass drum lamp on a yoke, cream lens facing the beam direction
  let s = `<g transform="translate(${x} ${y})">`;
  s += `<path d="M${-16 * k} ${16 * k}L${-10 * k} ${-2 * k}M${16 * k} ${16 * k}L${10 * k} ${-2 * k}" stroke="${I}" stroke-width="${7 * k}" stroke-linecap="round"/><path d="M${-16 * k} ${16 * k}L${-10 * k} ${-2 * k}M${16 * k} ${16 * k}L${10 * k} ${-2 * k}" stroke="${C.mustard}" stroke-width="${3.4 * k}" stroke-linecap="round"/>`;
  s += `<rect x="${-22 * k}" y="${12 * k}" width="${44 * k}" height="${10 * k}" rx="${3 * k}" fill="${C.mustard}" stroke="${I}" stroke-width="${2.6 * k}"/>`;
  s += `<g transform="rotate(${a})">` + `<rect x="${-14 * k}" y="${-22 * k}" width="${28 * k}" height="${30 * k}" rx="${5 * k}" fill="${C.navy}" stroke="${I}" stroke-width="${3 * k}"/>`
    + `<path d="M${-14 * k} ${-8 * k}H${14 * k}M${-14 * k} ${0}H${14 * k}" stroke="${I}" stroke-width="${1.6 * k}" opacity=".6"/>`
    + `<rect x="${-18 * k}" y="${-30 * k}" width="${36 * k}" height="${10 * k}" rx="${4 * k}" fill="${C.mustard}" stroke="${I}" stroke-width="${2.6 * k}"/>`
    + `<ellipse cx="0" cy="${-31 * k}" rx="${15 * k}" ry="${4 * k}" fill="${C.white}" stroke="${I}" stroke-width="${2 * k}"/>` + `</g>`;
  s += ci(0, 4 * k, 3.4 * k, C.mustard, ` stroke="${I}" stroke-width="${1.6 * k}"`) + `</g>`;
  return s;
}
// a sagging wire of brass bulbs between two points
export function bulbs(x0, y0, x1, y1, n, sag, k = 1) {
  let s = `<path d="M${x0} ${y0}Q${(x0 + x1) / 2} ${(y0 + y1) / 2 + sag * 2} ${x1} ${y1}" fill="none" stroke="${I}" stroke-width="${2.4 * k}"/>`;
  for (let i = 1; i < n; i++) {
    const t = i / n, x = (1 - t) * (1 - t) * x0 + 2 * t * (1 - t) * (x0 + x1) / 2 + t * t * x1, y = (1 - t) * (1 - t) * y0 + 2 * t * (1 - t) * ((y0 + y1) / 2 + sag * 2) + t * t * y1;
    const col = i % 3 === 0 ? C.red : C.mustard;
    s += ci(x, y + 6 * k, 9 * k, col, ' opacity=".18"') + `<rect x="${x - 2.4 * k}" y="${y}" width="${4.8 * k}" height="${4 * k}" fill="${I}"/>` + ci(x, y + 7 * k, 4.4 * k, col, ` stroke="${I}" stroke-width="${1.6 * k}"`) + ci(x - 1.4 * k, y + 5.6 * k, 1.3 * k, C.white);
  }
  return s;
}

// ------------------------------------------------------------------ HUD pieces
// a dossier tab plate: cream folder tab with a label tab on top
export function tabPlate(x, y, w, h, title, value, o = {}) {
  const k = o.k || 1, lw = o.lw || w * .52;
  let s = `<path d="M${x + 6 * k} ${y}H${x + lw}L${x + lw + 12 * k} ${y + 12 * k}H${x + w - 6 * k}Q${x + w} ${y + 12 * k} ${x + w} ${y + 18 * k}V${y + h - 6 * k}Q${x + w} ${y + h} ${x + w - 6 * k} ${y + h}H${x + 6 * k}Q${x} ${y + h} ${x} ${y + h - 6 * k}V${y + 6 * k}Q${x} ${y} ${x + 6 * k} ${y}Z" fill="${I}" opacity=".5" transform="translate(${4 * k} ${5 * k})"/>`;
  s += `<path d="M${x + 6 * k} ${y}H${x + lw}L${x + lw + 12 * k} ${y + 12 * k}H${x + w - 6 * k}Q${x + w} ${y + 12 * k} ${x + w} ${y + 18 * k}V${y + h - 6 * k}Q${x + w} ${y + h} ${x + w - 6 * k} ${y + h}H${x + 6 * k}Q${x} ${y + h} ${x} ${y + h - 6 * k}V${y + 6 * k}Q${x} ${y} ${x + 6 * k} ${y}Z" fill="${o.fill || C.cream}" stroke="${I}" stroke-width="${3 * k}"/>`;
  s += label(title, x + 10 * k, y + 15 * k, 13 * k, o.tc || C.red, { anchor: 'start', ls: .08 });
  s += label(value, x + w / 2 + (o.vdx || 0), y + h - 10 * k, o.vs || 26 * k, o.vc || I, { ls: .02 });
  return s;
}
// SPIN: a big brass safe-dial button, red core with cream arrows, tick ring, "SPIN" tab on top
export function spinButton(cx, cy, r) {
  const k = r / 80;
  let s = ci(cx + 6 * k, cy + 9 * k, r + 4 * k, I, ' opacity=".55"');
  s += ci(cx, cy, r, C.mustard, ` stroke="${I}" stroke-width="${4.5 * k}"`) + `<circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#htI)" opacity=".35"/>`;
  for (let i = 0; i < 40; i++) { const a = (i / 40) * Math.PI * 2, r0 = r * (i % 5 ? .86 : .8); s += ln(`M${f(cx + Math.cos(a) * r0)} ${f(cy + Math.sin(a) * r0)}L${f(cx + Math.cos(a) * r * .94)} ${f(cy + Math.sin(a) * r * .94)}`, (i % 5 ? 1.8 : 3) * k); }
  s += ln(`M${cx - r * .55} ${cy - r * .62}A${r * .84} ${r * .84} 0 0 1 ${cx + r * .2} ${cy - r * .82}`, 3 * k, C.white, ' opacity=".7"');
  s += ci(cx, cy, r * .72, C.night, ` stroke="${I}" stroke-width="${3.5 * k}"`);
  s += ci(cx, cy, r * .62, C.red, ` stroke="${I}" stroke-width="${3 * k}"`) + `<circle cx="${cx}" cy="${cy}" r="${r * .62}" fill="url(#htI)" opacity=".35"/>`;
  s += ln(`M${cx - r * .42} ${cy - r * .2}A${r * .46} ${r * .46} 0 0 1 ${cx - r * .1} ${cy - r * .45}`, 3 * k, C.white, ' opacity=".55"');
  // two chunky circular arrows
  const ar = r * .34, aw = 9 * k;
  const arc = (a0, a1) => `M${f(cx + Math.cos(a0) * ar)} ${f(cy + Math.sin(a0) * ar)}A${ar} ${ar} 0 0 1 ${f(cx + Math.cos(a1) * ar)} ${f(cy + Math.sin(a1) * ar)}`;
  const head = (a) => { const px = cx + Math.cos(a) * ar, py = cy + Math.sin(a) * ar, tx = -Math.sin(a), ty = Math.cos(a), nx = Math.cos(a), ny = Math.sin(a), L = 13 * k;
    return `M${f(px + nx * L)} ${f(py + ny * L)}L${f(px + tx * L * 1.2)} ${f(py + ty * L * 1.2)}L${f(px - nx * L)} ${f(py - ny * L)}Z`; };
  for (const [a0, a1] of [[Math.PI * 1.05, Math.PI * 1.75], [Math.PI * .05, Math.PI * .75]]) {
    s += ln(arc(a0, a1), aw + 5 * k, I) + `<path d="${head(a1)}" fill="${I}" stroke="${I}" stroke-width="${5 * k}" stroke-linejoin="round"/>`;
    s += ln(arc(a0, a1), aw, C.cream) + `<path d="${head(a1)}" fill="${C.cream}"/>`;
  }
  // tab label
  const tw = 70 * k, th = 24 * k, ty = cy - r - th * .45;
  s += `<rect x="${cx - tw / 2}" y="${ty}" width="${tw}" height="${th}" rx="${5 * k}" fill="${C.cream}" stroke="${I}" stroke-width="${3 * k}"/>` + label('SPIN', cx, ty + th * .8, 18 * k, I, { ls: .1 });
  return s;
}
export function roundBtn(cx, cy, r, glyph) {
  const k = r / 20;
  let s = ci(cx + 2 * k, cy + 3 * k, r, I, ' opacity=".5"') + ci(cx, cy, r, C.mustard, ` stroke="${I}" stroke-width="${3 * k}"`) + ci(cx, cy, r * .72, C.night, ` stroke="${I}" stroke-width="${2 * k}"`);
  s += ln(glyph === '+' ? `M${cx - 7 * k} ${cy}H${cx + 7 * k}M${cx} ${cy - 7 * k}V${cy + 7 * k}` : `M${cx - 7 * k} ${cy}H${cx + 7 * k}`, 4 * k, C.cream);
  return s;
}
// small square icon buttons (turbo / autoplay / menu) as brass toggles
export function iconBtn(cx, cy, s0, kind) {
  const k = s0 / 40;
  let s = `<rect x="${cx - s0 / 2 + 3 * k}" y="${cy - s0 / 2 + 4 * k}" width="${s0}" height="${s0}" rx="${9 * k}" fill="${I}" opacity=".5"/><rect x="${cx - s0 / 2}" y="${cy - s0 / 2}" width="${s0}" height="${s0}" rx="${9 * k}" fill="${C.night}" stroke="${C.mustard}" stroke-width="${3 * k}"/>`;
  if (kind === 'auto') s += ln(`M${cx + 9 * k} ${cy - 6 * k}A${10 * k} ${10 * k} 0 1 0 ${cx + 10 * k} ${cy + 4 * k}`, 3.4 * k, C.cream) + `<path d="M${cx + 13 * k} ${cy - 13 * k}L${cx + 12 * k} ${cy - 3 * k}L${cx + 3 * k} ${cy - 7 * k}Z" fill="${C.cream}"/>`;
  if (kind === 'turbo') s += `<path d="M${cx + 3 * k} ${cy - 14 * k}L${cx - 9 * k} ${cy + 2 * k}H${cx - 1 * k}L${cx - 4 * k} ${cy + 14 * k}L${cx + 9 * k} ${cy - 3 * k}H${cx + 1 * k}Z" fill="${C.cream}" stroke="${C.cream}" stroke-width="${1.5 * k}" stroke-linejoin="round"/>`;
  if (kind === 'menu') s += ln(`M${cx - 10 * k} ${cy - 7 * k}H${cx + 10 * k}M${cx - 10 * k} ${cy}H${cx + 10 * k}M${cx - 10 * k} ${cy + 7 * k}H${cx + 10 * k}`, 3.6 * k, C.cream);
  return s;
}
// SECRET ENTRANCE: a sticker-style manila folder with a red keyhole stamp, tilted, lettered
export function secretButton(cx, cy, w) {
  const k = w / 170, h = 128 * k, x = cx - w / 2, y = cy - h / 2;
  let s = `<g transform="rotate(-6 ${cx} ${cy})">`;
  const body = `M${x} ${y + 18 * k}Q${x} ${y + 10 * k} ${x + 8 * k} ${y + 10 * k}H${x + 52 * k}L${x + 62 * k} ${y + 22 * k}H${x + w - 8 * k}Q${x + w} ${y + 22 * k} ${x + w} ${y + 30 * k}V${y + h - 8 * k}Q${x + w} ${y + h} ${x + w - 8 * k} ${y + h}H${x + 8 * k}Q${x} ${y + h} ${x} ${y + h - 8 * k}Z`;
  s += `<path d="${body}" fill="${I}" opacity=".55" transform="translate(${5 * k} ${7 * k})"/>`;
  s += `<path d="${body}" fill="${C.white}" stroke="${C.white}" stroke-width="${12 * k}" stroke-linejoin="round"/>`;
  s += `<path d="${body}" fill="${C.mustard}" stroke="${I}" stroke-width="${3.4 * k}"/><path d="${body}" fill="url(#htI)" opacity=".4"/>`;
  // red keyhole seal
  const sx = x + 34 * k, sy = y + 62 * k;
  s += ci(sx, sy, 24 * k, C.red, ` stroke="${I}" stroke-width="${3 * k}"`) + `<circle cx="${sx}" cy="${sy}" r="${18 * k}" fill="none" stroke="${C.cream}" stroke-width="${1.8 * k}" stroke-dasharray="${3 * k} ${2.4 * k}"/>` + `<path d="${keyholeD(sx, sy - 1 * k, 17 * k)}" fill="${C.cream}"/>`;
  s += letter('SECRET', x + 112 * k, y + 64 * k, 25 * k, C.cream, { rim: false, depth: .06, shine: false });
  s += letter('ENTRANCE', x + 108 * k, y + 92 * k, 21 * k, C.cream, { rim: false, depth: .06, shine: false });
  s += `<rect x="${x + 20 * k}" y="${y + 100 * k}" width="${w - 40 * k}" height="${18 * k}" rx="${4 * k}" fill="${C.red}" stroke="${I}" stroke-width="${2.4 * k}"/>` + label('FEATURE BUY', cx, y + 114 * k, 11.5 * k, C.cream, { ls: .08 });
  s += `</g>`;
  return s;
}
