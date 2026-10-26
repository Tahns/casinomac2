// mambo_outfits.mjs - the five costume layers of Mambo (same body, same face, swappable wardrobe).
// A inspectrice (base) · B casino evening · C laboratory · D vault / commando · E trench and fedora.
// Every costume only draws: skirt/lower garment, torso/jacket, headgear, face gear, hand prop, sleeve + glove colours,
// leg and shoe styling. Coordinates are the REST skeleton of mambo_art.mjs (upper body / lower body world coordinates,
// head-local coordinates for headgear and face gear, grip-local coordinates for props).
// [217] discipline: every costume is fully covering (high necklines, long sleeves or gloves, knee-length or longer,
// no slit, no cleavage); glamour comes from style, not exposure.

import { PAL, INK, OL, part, line, circ, G, star, rectD, ellD, tf, f, spl, silBack as SB, silFront as SF, silCl as CL, garmentD } from './mambo_art.mjs';


// ---- shared pieces of the body language (pass 2) ------------------------------------------------------------
const NECK_B = [[190, 238], [174, 246]], NECK_F = [[211, 238], [229, 246]];   // neckline + shoulder points of every torso (back side / front side, top down)
// below y0 the back / front edges ease toward the hem positions bx / fx (power curve): gown, coat and trench flares
function flare(y0, y1, bx, fx, pw = 1.8) {
  const bb = SB(y0), ff = SF(y0), u = (y) => Math.pow(Math.max(0, Math.min(1, (y - y0) / (y1 - y0))), pw);
  return { eB: (y) => (y <= y0 ? 0 : SB(y) - (bb + (bx - bb) * u(y))), eF: (y) => (y <= y0 ? 0 : ff + (fx - ff) * u(y) - SF(y)) };
}
// halftone side: right of a line that follows the centre-front line
const shadeRight = (yTop, yBot) => `M${CL(yTop) + 10} ${yTop}L340 ${yTop}L340 ${yBot}L${CL(Math.min(yBot, 456)) - 4} ${yBot}Z`;
// 3/4 view shirt V (far lapel edge nearly vertical, near edge diagonal) and its collar flaps
const shirtV = (c, fill, collar) => part(c, 'M189 240L212 240L215 284Z', fill, { sw: 4, mis: [1.4, 1.2] })
  + (collar ? part(c, 'M190 238L180 247L194 252L199 243Z M211 238L219 246L207 250L203 242Z', collar, { sw: 3.4, mis: [1.2, 1] }) : '');
// notch lapels in 3/4 view: near lapel wide, far lapel a sliver (o.big = wide trench collar)
function lapelPair(c, o = {}) {
  const sw = o.sw ?? 3.8, big = !!o.big;
  let s = part(c, big ? 'M190 240L166 256L176 273L214 300L216 288L203 262Z' : 'M190 240L171 255L179 266L214 296L216 286L203 262Z', o.fill, { sw })
    + part(c, big ? 'M212 240L233 252L227 265L215 296L215 286Z' : 'M212 240L229 251L224 260L215 292L215 284Z', o.fill, { sw: sw - 0.2 });
  if (o.pipe) s += line(big ? 'M189 243L169 257L178 272L212 297' : 'M189 243L173 255L181 265L212 293', 2.6, o.pipe) + line(big ? 'M213 243L231 253L226 264' : 'M213 243L228 252L222 261', 2.4, o.pipe);
  return s;
}
// princess seams that give the chest its curve
const seams = (col, op = 0.8) => line(spl([[183, 264], [179, 284], [186, 306]]), 2.6, col, ` opacity="${op}"`) + line(spl([[234, 268], [230, 286], [224, 304]]), 2.6, col, ` opacity="${op - 0.1}"`);

const dotsShade = (x, y, w, h) => `M${x} ${y}h${w}v${h}h${-w}Z`;
const R_SHADE = 'M208 250L290 250L290 480L208 480Z';       // right-hand shade band on the body (halftone side)

// ====================================================================== A. INSPECTRICE (base)
const inspectrice = {
  key: 'inspectrice', label: 'A. Inspectrice (base)', accent: PAL.navy,
  sleeve: { fill: PAL.navyJ, trim: PAL.mustard, trimAt: [0.8, 0.9], gloveFrom: null },
  glove: PAL.white, cuff: PAL.white,
  legs: { fill: INK, w: 13, shine: '#7A5646' },
  shoe: { base: PAL.white },
  lidFill: PAL.eyeshadow, propKind: 'flashlight', whistle: true, accBase: 90, accGain: 1, hairTop: () => '', capOver: false,
  skirt(c) { // pencil skirt: waist tucked under the peplum, hips on the S-curve, narrow hem, front fold line
    const d = garmentD(292, 447, { eB: (y) => (y > 430 ? 1 : 0), eF: (y) => (y > 430 ? 1 : 0), hem: 5 });
    return part(c, d, PAL.navyJ, { shade: `M${CL(300) + 4} 296L280 296L280 470L${CL(456) - 8} 470C${CL(420)} 420 ${CL(360)} 350 ${CL(320) + 4} 296Z` })
      + line(spl([[CL(312) - 5, 314], [CL(346) - 7, 350], [CL(404) - 9, 404], [CL(450) - 8, 450]]), 3, PAL.navyLight, ' opacity=".75"')
      + line(spl([[SB(330) + 7, 330], [SB(380) + 5, 382], [SB(430) + 4, 432]]), 2.6, PAL.navyLight, ' opacity=".5"');
  },
  torso(c) { // fitted jacket with a peplum, notch lapels in 3/4 view, thin tie, three gold buttons on the centre-front line
    const J = garmentD(256, 326, { headB: NECK_B, headF: NECK_F, eB: (y) => (y > 312 ? (y - 312) * 0.12 : 0), eF: (y) => (y > 312 ? (y - 312) * 0.1 : 0), hem: 5, hemShift: 6 });
    let s = part(c, J, PAL.navyJ, { shade: shadeRight(236, 350) });
    s += seams(PAL.navyLight);
    s += shirtV(c, PAL.white, PAL.white);
    s += part(c, 'M201 247L208 247L217 283L213 296L208 285Z', INK, { sw: 3, mis: [1, 1] });
    s += part(c, 'M200 241L207 241L208 248L201 248Z', INK, { sw: 2.8, mis: [1, 1] });
    s += lapelPair(c, { fill: PAL.navyLight, pipe: PAL.gold });
    for (const y of [294, 307, 320]) s += part(c, ellD(CL(y) + 1, y, 4.6, 4.6), PAL.gold, { sw: 3, mis: [1, 1] });
    s += part(c, 'M168 250L182 244L185 252L170 259Z', PAL.cream, { sw: 3.4, mis: [1.2, 1] }) + part(c, 'M232 250L222 244L219 251L231 258Z', PAL.cream, { sw: 3.4, mis: [1.2, 1] });
    s += line(spl([[SB(322) + 3, 322], [CL(323), 325], [SF(322) - 3, 322]]), 2.8, PAL.gold, ' opacity=".9"');
    // whistle chain (dynamic path) + whistle (positioned by the runtime)
    s += `<path id="${c.pre}chain" d="" fill="none" stroke="${PAL.gold}" stroke-width="3" stroke-linecap="round"/>`;
    s += `<g id="${c.pre}whistle"><g transform="rotate(-12)">${part(c, 'M-9 -5L7 -7L11 -1L9 6L-9 6Z', PAL.gold, { sw: 3.4, mis: [1.2, 1] })}${circ(-2, 0, 2, INK)}${part(c, ellD(-12, 0, 4, 4), 'none', { sw: 2.6 })}</g></g>`;
    return s;
  },
  head(c) { // garrison cap (calot): big boat shape tilted over the back-left of the head, gold piping, 8-point fictional star
    let s = '';
    const body = 'M-82 -112C-60 -135 -30 -156 -7 -166L11 -156C17 -140 20 -130 20 -122C8 -108 -8 -101 -22 -99C-40 -97 -58 -92 -72 -90C-74 -98 -78 -106 -82 -112Z';
    s += part(c, body, PAL.navyJ, { shade: 'M-6 -176L30 -176L30 -80L-30 -80Z' });
    s += `<path d="M-78 -110C-52 -126 -24 -142 2 -150" fill="none" stroke="${INK}" stroke-width="8.4" stroke-linecap="round"/><path d="M-78 -110C-52 -126 -24 -142 2 -150" fill="none" stroke="${PAL.gold}" stroke-width="3.4" stroke-linecap="round"/>`;
    s += `<path d="M-7 -166L2 -168L14 -158L11 -156Z" fill="${PAL.navyLight}" stroke="${INK}" stroke-width="4.4" stroke-linejoin="round"/>`;
    s += `<g transform="translate(-9 -125) rotate(-12)">${star(0, 0, 17, PAL.gold, 3.2, 22.5, 8)}${circ(0, 0, 4.4, PAL.navy, ` stroke="${INK}" stroke-width="2.2"`)}</g>`;
    return s;
  },
  gear: () => '',
  prop(c) { // flashlight, grip at origin, working end toward +y
    const beam = `<g id="${c.pre}beam" opacity="0"><path d="M-12 56L-46 205L46 205L12 56Z" fill="#FFF1A8" opacity=".5"/><path d="M-12 56L-46 205L46 205L12 56Z" fill="url(#${c.pre}htl)" opacity=".6"/></g>`;
    return beam + `<g transform="scale(1.22)">`
      + part(c, 'M-9 -30L9 -30L9 12L-9 12Z', '#4A2A1C', { sw: 4.8, mis: [1.6, 1.4] })
      + part(c, 'M-9 6L9 6L19 40L-19 40Z', '#4A2A1C', { sw: 4.8, mis: [1.6, 1.4] })
      + part(c, ellD(0, 41, 20, 7), PAL.gold, { sw: 4.4, mis: [1.4, 1.2] }) + `<ellipse cx="0" cy="41.5" rx="12.5" ry="3.8" fill="${PAL.cream}"/>`
      + part(c, 'M-10 -30L10 -30L10 -24L-10 -24Z', PAL.gold, { sw: 3.6, mis: [1.2, 1] }) + line('M-3.4 -18L-3.4 -2', 2.6, PAL.goldDeep, ' opacity=".9"') + `</g>`;
  },
};



// ====================================================================== B. CASINO EVENING (gown, mask, fan, chips)
const casino = {
  key: 'casino', label: 'B. Casino evening', accent: PAL.brick,
  sleeve: { fill: PAL.brick, trim: null, gloveFrom: 0.52 }, glove: PAL.white, cuff: PAL.white,
  legs: { fill: INK, w: 13 }, shoe: { base: PAL.white }, shoesUnder: true,
  lidFill: '#1E1411', lidShadowOp: 0, accBase: 180, accGain: 0.5, capOver: false,
  hairTop(c) { // big 60s wave on top (no hat)
    return part(c, 'M-86 -104C-84 -140 -52 -162 -14 -160C24 -158 44 -142 44 -118C30 -128 8 -134 -12 -126C-34 -118 -58 -112 -86 -104Z', PAL.hair, { shade: 'M-96 -170L-20 -170L-20 -100L-96 -100Z' })
      + line('M-50 -146C-34 -154 -14 -152 0 -146', 3.4, PAL.hairHi, ' opacity=".9"') + line('M10 -140C20 -138 28 -132 32 -126', 3, PAL.hairHi, ' opacity=".8"');
  },
  skirt(c) { // fitted gown: pencil to the knee, mermaid flare to the floor (no slit), godet seams
    const fl = flare(446, 556, 126, 278, 1.9), RD = '#8E1F1B';
    const d = garmentD(290, 556, { extraYs: [470, 490, 512, 534, 548], eB: fl.eB, eF: fl.eF, hem: 9, hemShift: 6 });
    return part(c, d, PAL.brick, { shade: shadeRight(290, 580) })
      + line(spl([[SB(452) + 6, 452], [152, 510], [142, 552]]), 3, RD, ' opacity=".8"') + line(spl([[CL(452) - 2, 452], [CL(452) - 4, 510], [CL(452) - 8, 560]]), 3, RD, ' opacity=".8"')
      + line(spl([[SF(452) - 6, 452], [250, 510], [260, 552]]), 3, RD, ' opacity=".8"')
      + line(spl([[CL(312) - 5, 314], [CL(346) - 7, 350], [CL(404) - 9, 404], [CL(450) - 8, 450]]), 3, RD, ' opacity=".55"');
  },
  torso(c) { // fitted bodice, high gold collar, waist sash, brooch; closure line shifted right (3/4 turn)
    const RD = '#8E1F1B';
    const J = garmentD(256, 312, { headB: NECK_B, headF: NECK_F, hem: 3, hemShift: 2 });
    let s = part(c, J, PAL.brick, { shade: shadeRight(236, 330) });
    s += seams(RD) + line(spl([[CL(252), 252], [CL(282), 282], [CL(306), 306]]), 2.4, RD, ' opacity=".6"');
    s += part(c, spl([[SB(298) - 1, 299], [CL(300), 302], [SF(298) + 1, 299], [SF(312) + 1, 311], [CL(314), 314], [SB(312) - 1, 311]], { closed: true, corners: [0, 2, 3, 5] }), PAL.gold, { sw: 3.8, mis: [1.4, 1.2] });
    s += part(c, 'M188 232L212 232L217 248C207 253 195 253 184 247Z', PAL.gold, { sw: 4, mis: [1.4, 1.2] });
    s += part(c, ellD(CL(272) - 9, 272, 5.2, 5.2), PAL.gold, { sw: 3, mis: [1, 1] }) + circ(CL(272) - 9, 272, 2, PAL.white);
    return s;
  },
  maskUnder(c) {
    return part(c, 'M-47 -66C-44 -78 -28 -80 -14 -76C-6 -74 2 -72 10 -76C22 -82 36 -80 42 -68C46 -58 42 -44 34 -36C28 -30 22 -34 18 -40C10 -30 -2 -30 -8 -38C-14 -30 -28 -30 -36 -40C-44 -48 -48 -58 -47 -66Z', '#1E1411', { sw: OL })
      + `<path d="M-40 -70C-30 -76 -18 -74 -10 -72" fill="none" stroke="${PAL.white}" stroke-width="2.4" stroke-linecap="round" opacity=".5"/>`;
  },
  head: () => '', gear: () => '',
  prop(c) { // folded fan, opened: handle at the grip, working end (+y) = the fan spread
    const rib = (a) => `M0 8L${f(Math.sin((a * Math.PI) / 180) * 62)} ${f(8 + Math.cos((a * Math.PI) / 180) * 62)}`;
    let ribs = ''; for (const a of [-50, -32, -16, 0, 16, 32, 50]) ribs += rib(a);
    return part(c, 'M-4 -26L4 -26L5 10L-5 10Z', PAL.gold, { sw: 3.6, mis: [1.2, 1] })
      + part(c, 'M0 8L-52 40Q0 78 52 40Z', PAL.brick, { sw: 4.4, mis: [1.6, 1.4], shade: 'M10 8L60 8L60 80L10 80Z' })
      + `<path d="${ribs}" fill="none" stroke="${PAL.gold}" stroke-width="2.4" stroke-linecap="round"/>` + `<path d="M-52 40Q0 78 52 40" fill="none" stroke="${PAL.gold}" stroke-width="3.4" stroke-linecap="round"/>`;
  },
  prop2(c) { // chips stack
    let s = '';
    const cols = [PAL.brick, INK, PAL.cream, PAL.brick];
    for (let i = 0; i < 4; i++) s += part(c, `M-15 ${-8 + i * 7}C-15 ${-13 + i * 7} 15 ${-13 + i * 7} 15 ${-8 + i * 7}L15 ${-3 + i * 7}C15 ${2 + i * 7} -15 ${2 + i * 7} -15 ${-3 + i * 7}Z`, cols[i], { sw: 3.2, mis: [1.2, 1] }) + line(`M-9 ${-2 + i * 7}h4M-1 ${-0.5 + i * 7}h4M7 ${-2 + i * 7}h4`, 2, PAL.white);
    return s;
  },
};

// ====================================================================== C. LABORATORY (coat, butterfly glasses, test tube, clipboard)
const COAT = '#FBF3DC';
const lab = {
  key: 'lab', label: 'C. Laboratory', accent: PAL.turq,
  sleeve: { fill: COAT, trim: '#E4D6AE', trimAt: [0.82, 0.9], gloveFrom: null }, glove: PAL.white, cuff: PAL.white,
  legs: { fill: '#3A1A10', w: 13, shine: '#8A5A44' }, shoe: { base: PAL.white },
  lidFill: PAL.eyeshadow, accBase: 180, accGain: 0.3, capOver: false,
  hairTop(c) { // big curl on top
    return part(c, 'M-88 -104C-90 -146 -56 -170 -18 -168C16 -170 44 -154 50 -126C52 -112 44 -102 34 -98C32 -118 14 -134 -6 -130C-34 -126 -60 -116 -88 -104Z', PAL.hair, { shade: 'M-100 -176L-24 -176L-24 -100L-100 -100Z' })
      + part(c, 'M16 -158C34 -162 50 -150 48 -134C46 -122 34 -122 32 -130C38 -132 38 -140 30 -140Z', PAL.hair, { sw: OL * 0.9 })
      + line('M-56 -150C-38 -160 -16 -160 2 -152', 3.4, PAL.hairHi, ' opacity=".9"');
  },
  skirt(c) { // turquoise dress, long coat open on the centre-front line, patch pockets
    const e = (y) => 2 + Math.max(0, y - 306) * 0.075;
    let s = part(c, garmentD(292, 456, { eB: (y) => (y > 440 ? 1 : 0), eF: (y) => (y > 440 ? 1 : 0), hem: 5 }), PAL.turq, {});
    s += part(c, garmentD(292, 462, { eB: e, eF: e, hem: 6, hemShift: 5 }), COAT, { shade: shadeRight(290, 480) });
    s += part(c, spl([[CL(300) - 3, 300], [CL(380) - 6, 380], [CL(462) - 10, 462], [CL(462) + 10, 462], [CL(380) + 6, 380], [CL(300) + 3, 300]], { closed: true, corners: [0, 2, 3, 5] }), PAL.turq, { sw: 3.6, mis: [1.2, 1] });
    s += line(spl([[CL(300) - 3, 300], [CL(380) - 6, 380], [CL(462) - 10, 462]]), 0, PAL.turq);
    s += part(c, rectD(SB(380) + 8, 372, 20, 22), COAT, { sw: 3.4, mis: [1.2, 1] }) + part(c, rectD(SF(380) - 28, 372, 20, 22), COAT, { sw: 3.4, mis: [1.2, 1] });
    s += line(spl([[SB(456) + 6, 454], [CL(456), 460], [SF(456) - 4, 454]]), 2.4, '#E4D6AE', ' opacity=".9"');
    return s;
  },
  torso(c) { // coat bodice: turquoise blouse V, cream notch lapels, breast pocket with pens, two buttons
    const e = (y) => 1.5 + Math.max(0, y - 300) * 0.05;
    const J = garmentD(256, 333, { headB: NECK_B, headF: NECK_F, eB: e, eF: e, hem: 5 });
    let s = part(c, J, COAT, { shade: shadeRight(236, 350) });
    s += seams('#E4D6AE', 0.9);
    s += shirtV(c, PAL.turq, null);
    s += lapelPair(c, { fill: COAT, sw: 4 });
    s += part(c, rectD(SB(290) + 6, 286, 18, 18), COAT, { sw: 3.4, mis: [1.2, 1] }) + line(`M${SB(290) + 11} 286l0 -7M${SB(290) + 16} 286l0 -9M${SB(290) + 21} 286l0 -6`, 2.8, PAL.brick) + line(`M${SB(290) + 16} 286l0 -9`, 2.8, PAL.turq);
    for (const y of [304, 320]) s += part(c, ellD(CL(y) + 1, y, 3.4, 3.4), '#CFC6A8', { sw: 2.6, mis: [1, 1] });
    return s;
  },
  gear(c) { // butterfly glasses (frames above the eyes)
    const fr = PAL.turq;
    const lensN = 'M-44 -78C-30 -88 -4 -84 6 -70C10 -56 4 -36 -12 -32C-30 -30 -44 -44 -46 -62Z';
    const lensF = 'M12 -80C26 -88 42 -84 46 -68C48 -52 40 -36 28 -34C16 -34 10 -50 12 -80Z';
    return `<path d="${lensN}" fill="${PAL.glass}" fill-opacity=".22"/><path d="${lensF}" fill="${PAL.glass}" fill-opacity=".22"/>`
      + `<path d="${lensN}" fill="none" stroke="${INK}" stroke-width="6.6" stroke-linejoin="round"/><path d="${lensF}" fill="none" stroke="${INK}" stroke-width="6.6" stroke-linejoin="round"/>`
      + `<path d="${lensN}" fill="none" stroke="${fr}" stroke-width="3.4" stroke-linejoin="round"/><path d="${lensF}" fill="none" stroke="${fr}" stroke-width="3.4" stroke-linejoin="round"/>`
      + `<path d="M6 -66C8 -70 10 -72 12 -72" fill="none" stroke="${INK}" stroke-width="5.8" stroke-linecap="round"/><path d="M6 -66C8 -70 10 -72 12 -72" fill="none" stroke="${fr}" stroke-width="2.6" stroke-linecap="round"/>`
      + line('M-40 -70C-30 -78 -18 -80 -8 -76', 2.2, PAL.white, ' opacity=".7"');
  },
  head: () => '',
  prop(c) { // test tube: +y = open end (up when held upright), rounded bottom at -y
    return part(c, 'M-8 36L-8 -30C-8 -44 8 -44 8 -30L8 36Z', PAL.glass, { sw: 4, mis: [1.4, 1.2] })
      + `<path d="M-8 -6L-8 -30C-8 -44 8 -44 8 -30L8 -6Z" fill="#A4E24E"/>` + line('M-8 -6Q0 -2 8 -6', 2.6, '#6FB82E')
      + part(c, 'M-11 34L11 34L11 40L-11 40Z', PAL.glass, { sw: 3.6, mis: [1.2, 1] }) + line('M-3 -20L-3 -34', 2.6, PAL.white, ' opacity=".9"')
      + circ(-3, 52, 4.4, '#B9F06A', ` stroke="${INK}" stroke-width="2.2"`) + circ(6, 62, 3.2, '#B9F06A', ` stroke="${INK}" stroke-width="2"`) + circ(-1, 72, 2.4, '#B9F06A', ` stroke="${INK}" stroke-width="1.8"`);
  },
  prop2(c) { // clipboard
    return part(c, 'M-18 -26L18 -26L18 26L-18 26Z', '#8A5A33', { sw: 4, mis: [1.4, 1.2] }) + part(c, 'M-13 -20L13 -20L13 20L-13 20Z', PAL.white, { sw: 2.6, mis: [1, 1] })
      + line('M-8 -10h16M-8 -3h16M-8 4h10', 2, PAL.turq) + part(c, 'M-7 -30L7 -30L7 -23L-7 -23Z', PAL.gold, { sw: 2.8, mis: [1, 1] });
  },
};

// ====================================================================== D. VAULT / COMMANDO (jumpsuit, scarf, aviator cap + goggles, grappling hook)
const SUIT = PAL.mustard, LEATHER = '#7A4A2A';
const vault = {
  key: 'vault', label: 'D. Vault / commando', accent: PAL.mustard, scarf: true,
  sleeve: { fill: SUIT, trim: LEATHER, trimAt: [0.8, 0.9], gloveFrom: null }, glove: PAL.white, cuff: PAL.white,
  legs: { fill: SUIT, w: 17, sock: '#5A3A22' }, shoe: { base: PAL.white },
  lidFill: PAL.eyeshadow, accBase: 90, accGain: 1, capOver: true, hairTop: () => '',
  skirt(c) { // jumpsuit hips down to the leg tops, centre seam, thigh pockets
    const d = garmentD(290, 414, { hem: 3, hemShift: 2 });
    return part(c, d, SUIT, { shade: shadeRight(290, 440) }) + line(spl([[CL(310), 310], [CL(360), 360], [CL(410), 410]]), 2.6, '#B77A12', ' opacity=".8"')
      + part(c, rectD(SB(372) + 4, 362, 18, 22), SUIT, { sw: 3.4, mis: [1.2, 1] }) + part(c, rectD(SF(372) - 22, 362, 18, 22), SUIT, { sw: 3.4, mis: [1.2, 1] });
  },
  torso(c) { // zip-front jumpsuit, belt with buckle, hip pouches, olive scarf (neck wrap + two swinging tails)
    const J = garmentD(256, 322, { headB: NECK_B, headF: NECK_F, hem: 3, hemShift: 2 });
    let s = part(c, J, SUIT, { shade: shadeRight(236, 340) });
    s += seams('#B77A12', 0.8);
    s += `<path d="M${CL(246)} 246L${CL(300)} 300" stroke="${INK}" stroke-width="3.2" stroke-linecap="round"/><path d="M${CL(252)} 252L${CL(296)} 296" stroke="${PAL.cream}" stroke-width="1.6" stroke-dasharray="1.6 3.4"/>` + part(c, 'M210 254L216 254L216 264L213 268L210 264Z', PAL.steel, { sw: 2.4, mis: [0.8, 0.8] });
    // belt + buckle + pouches
    s += part(c, spl([[SB(298) - 1, 296], [CL(300), 299], [SF(298) + 1, 296], [SF(312) + 1, 306], [CL(314), 309], [SB(312) - 1, 306]], { closed: true, corners: [0, 2, 3, 5] }), LEATHER, { sw: 3.8, mis: [1.4, 1.2] });
    s += part(c, rectD(CL(305) - 7, 297, 14, 14), PAL.gold, { sw: 3.2, mis: [1, 1] }) + `<rect x="${CL(305) - 3}" y="301" width="6" height="6" fill="${INK}"/>`;
    s += part(c, rectD(SB(326) - 1, 316, 21, 24), LEATHER, { sw: 3.8, mis: [1.4, 1.2] }) + line(`M${SB(326) + 1} 324h17`, 2.2, PAL.goldDeep) + part(c, rectD(SF(326) - 20, 316, 21, 24), LEATHER, { sw: 3.8, mis: [1.4, 1.2] }) + line(`M${SF(326) - 18} 324h17`, 2.2, PAL.goldDeep);
    // scarf: two tails (swing) then the neck wrap on top
    s += `<g id="${c.pre}scarf-2" transform="rotate(0 188 250)">${part(c, 'M182 250C168 262 152 280 150 308C160 300 170 292 180 292C176 276 182 262 191 254Z', PAL.olive, { sw: OL * 0.95, shade: 'M144 290L194 290L194 320L144 320Z' })}</g>`;
    s += `<g id="${c.pre}scarf-1" transform="rotate(0 188 250)">${part(c, 'M185 252C173 268 168 292 172 322C180 312 186 300 190 290C190 278 192 266 196 256Z', PAL.olive, { sw: OL * 0.95 })}</g>`;
    s += part(c, 'M186 232C194 238 210 238 219 232L223 246C211 254 195 254 183 246Z', PAL.olive, { sw: OL * 0.95, shade: 'M204 228L234 228L234 258L204 258Z' }) + line('M189 244C199 249 209 249 217 244', 2.4, '#55611F', ' opacity=".9"');
    return s;
  },
  head(c) { // leather aviator cap (over the hair), strap, ear flap, goggles on the front
    let s = '';
    s += part(c, 'M-92 -96C-96 -146 -58 -172 -12 -170C28 -168 48 -142 46 -112C40 -102 30 -97 22 -94C10 -100 -10 -102 -26 -99C-44 -96 -58 -98 -70 -104Z', LEATHER, { shade: 'M-6 -176L56 -176L56 -92L-6 -92Z' });
    s += part(c, 'M-92 -96C-98 -76 -94 -52 -82 -38C-70 -32 -62 -46 -62 -64L-70 -104Z', '#8F5A34', { sw: OL, shade: 'M-96 -60L-70 -60L-70 -30L-96 -30Z' });
    s += `<path d="M-84 -122C-60 -140 -20 -148 20 -142" fill="none" stroke="${INK}" stroke-width="8" stroke-linecap="round"/><path d="M-84 -122C-60 -140 -20 -148 20 -142" fill="none" stroke="#B0763F" stroke-width="3.6" stroke-linecap="round"/>`;
    s += line('M-40 -168C-30 -150 -28 -130 -30 -108M0 -170C6 -150 6 -130 2 -106', 2.6, '#5A3A22', ' opacity=".8"');
    // goggles: two round lenses with a strap
    const lens = (x, y) => `<g transform="translate(${x} ${y})">${part(c, ellD(0, 0, 17, 15), PAL.gold, { sw: 4.2, mis: [1.4, 1.2] })}<ellipse cx="0" cy="0" rx="11.5" ry="10" fill="#1E4A52" stroke="${INK}" stroke-width="2.6"/><path d="M-6 -5C-3 -8 3 -8 6 -5" fill="none" stroke="${PAL.white}" stroke-width="2.6" stroke-linecap="round" opacity=".9"/></g>`;
    s += lens(-30, -140) + lens(4, -144) + part(c, 'M-14 -142L-9 -144L-9 -138L-14 -137Z', PAL.goldDeep, { sw: 2.6, mis: [0.8, 0.8] });
    return s;
  },
  gear: () => '',
  prop(c) { // grappling hook with rope coil; +y = working end (hook)
    let s = '';
    s += part(c, ellD(-22, 8, 17, 15), 'none', { sw: 0 });
    for (const r of [15, 10, 5]) s += `<ellipse cx="-24" cy="10" rx="${r + 3}" ry="${r}" fill="none" stroke="${INK}" stroke-width="6.6"/>`;
    for (const r of [15, 10, 5]) s += `<ellipse cx="-24" cy="10" rx="${r + 3}" ry="${r}" fill="none" stroke="#B0763F" stroke-width="3"/>`;
    s += part(c, 'M-8 -30L8 -30L8 14L-8 14Z', LEATHER, { sw: 4.4, mis: [1.6, 1.4] }) + line('M-8 -18h16M-8 -8h16M-8 2h16', 2, '#4A2A16');
    s += part(c, 'M-5 12L5 12L5 52L-5 52Z', PAL.steel, { sw: 4, mis: [1.4, 1.2] });
    s += part(c, 'M0 50C-6 56 -22 58 -30 48C-24 66 -6 72 0 66C6 72 24 66 30 48C22 58 6 56 0 50Z', PAL.steel, { sw: 4.2, mis: [1.6, 1.4] });
    s += part(c, 'M-2 60L2 60L2 78L-2 78Z', PAL.steel, { sw: 3.4, mis: [1.2, 1] });
    return s;
  },
};

// ====================================================================== E. TRENCH AND FEDORA (trench coat, tie, magnifying glass)
const CAMEL = PAL.camel, BURG = PAL.burgundy;
const trench = {
  key: 'trench', label: 'E. Trench and fedora', accent: BURG,
  sleeve: { fill: CAMEL, trim: '#8A5E34', trimAt: [0.78, 0.86], gloveFrom: null }, glove: PAL.white, cuff: PAL.white,
  legs: { fill: '#3A1A10', w: 13, shine: '#8A5A44' }, shoe: { base: PAL.white },
  lidFill: PAL.eyeshadow, accBase: 90, accGain: 1, capOver: true, hairTop: () => '',
  skirt(c) { // belted trench coat, flares to the hem, double row of buttons, storm flap
    const e = (y) => 2 + Math.max(0, y - 310) * 0.1;
    let s = part(c, garmentD(290, 456, { eB: e, eF: e, hem: 6 }), CAMEL, { shade: shadeRight(290, 480) });
    s += line(spl([[CL(306), 306], [CL(380), 380], [CL(454) + 1, 454]]), 3.2, '#8A5E34');
    for (const y of [352, 384, 416]) s += part(c, ellD(CL(y) - 9, y, 3.8, 3.8), '#4A2E1A', { sw: 2.4, mis: [0.8, 0.8] }) + part(c, ellD(CL(y) + 9, y, 3.8, 3.8), '#4A2E1A', { sw: 2.4, mis: [0.8, 0.8] });
    s += part(c, spl([[SB(344) + 4, 344], [SB(344) + 22, 349], [SB(344) + 20, 376], [SB(344) + 2, 370]], { closed: true, corners: [0, 1, 2, 3] }), CAMEL, { sw: 3.4, mis: [1.2, 1] });
    s += line(spl([[SB(456) + 4, 452], [CL(456), 458], [SF(456) - 2, 452]]), 2.6, '#8A5E34');
    return s;
  },
  torso(c) { // trench bodice: big collar and lapels in 3/4 view, burgundy tie, belt with gold buckle, shoulder straps
    const J = garmentD(256, 312, { headB: NECK_B, headF: NECK_F, eB: () => 1.5, eF: () => 1.5, hem: 3, hemShift: 2 });
    let s = part(c, J, CAMEL, { shade: shadeRight(236, 330) });
    s += seams('#8A5E34', 0.8);
    s += shirtV(c, PAL.white, null);
    s += part(c, 'M201 247L208 247L217 283L213 296L208 285Z', BURG, { sw: 3, mis: [1, 1] });
    s += lapelPair(c, { fill: '#C99C66', sw: 4.2, big: true });
    s += part(c, ellD(CL(292) + 1, 292, 3.8, 3.8), '#4A2E1A', { sw: 2.4, mis: [0.8, 0.8] });
    s += part(c, 'M168 250L182 242L186 250L170 259Z', '#8A5E34', { sw: 3.2, mis: [1.2, 1] }) + part(c, 'M232 250L220 242L216 250L230 258Z', '#8A5E34', { sw: 3.2, mis: [1.2, 1] });
    s += part(c, spl([[SB(298) - 1, 296], [CL(300), 299], [SF(298) + 1, 296], [SF(312) + 1, 306], [CL(314), 309], [SB(312) - 1, 306]], { closed: true, corners: [0, 2, 3, 5] }), '#5A3A22', { sw: 3.6, mis: [1.4, 1.2] });
    s += part(c, rectD(CL(305) - 8, 295, 16, 16), PAL.gold, { sw: 3.2, mis: [1, 1] }) + `<rect x="${CL(305) - 4}" y="299" width="8" height="8" fill="none" stroke="${INK}" stroke-width="2.4"/>`;
    return s;
  },
  head(c) { // fedora, tilted over the back-left of the head
    let s = '';
    s += part(c, 'M-46 -108C-50 -142 -36 -170 -8 -172C18 -172 34 -148 32 -116C14 -108 -22 -104 -46 -108Z', BURG, { shade: 'M-4 -176L40 -176L40 -100L-4 -100Z' });
    s += `<path d="M-16 -170C-8 -158 0 -156 10 -166" fill="none" stroke="${INK}" stroke-width="3.6" stroke-linecap="round"/>`;
    s += part(c, 'M-47 -112C-20 -102 14 -106 33 -114L33 -128C14 -120 -20 -116 -47 -126Z', '#3A1626', { sw: 4, mis: [1.4, 1.2] });
    s += part(c, 'M-76 -104C-70 -120 -34 -128 6 -126C42 -124 66 -114 66 -102C58 -90 20 -84 -14 -86C-48 -88 -70 -92 -76 -104Z', BURG, { sw: OL, shade: 'M8 -130L80 -130L80 -76L8 -76Z' });
    s += line('M-66 -102C-44 -94 -10 -94 24 -96', 2.6, '#4A1A2E', ' opacity=".8"');
    return s;
  },
  gear: () => '',
  prop(c) { // magnifying glass; +y = working end (the lens)
    return part(c, 'M-5 -28L5 -28L5 16L-5 16Z', '#4A2A1C', { sw: 4.2, mis: [1.4, 1.2] })
      + part(c, ellD(0, 42, 25, 25), PAL.gold, { sw: 4.4, mis: [1.6, 1.4] }) + `<ellipse cx="0" cy="42" rx="18" ry="18" fill="#D2EEF2" stroke="${INK}" stroke-width="3"/>`
      + `<path d="M-10 36C-8 30 -2 26 4 26" fill="none" stroke="${PAL.white}" stroke-width="3.4" stroke-linecap="round"/>` + line('M8 52L12 48', 2.4, PAL.white);
  },
  prop2: () => '',
};

export const OUTFIT_DEFS = { inspectrice, casino, lab, vault, trench };
export const OUTFIT_KEYS = ['inspectrice', 'casino', 'lab', 'vault', 'trench'];

// second hand-held item per pose (hand letter = screen side); only used when that hand is free
casino.prop2On = { shrug: 'R', smallwin: 'R', laugh: '' };
lab.prop2On = { idle: 'R', shrug: 'R' };
