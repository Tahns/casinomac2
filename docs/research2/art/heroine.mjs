// heroine.mjs - "Mambo" (Mabel "Mambo" Fontaine), the Agent Mambo heroine, drawn in code.
// Rubber-hose 1960s cartoon: noodle limbs without elbows, big white three-finger gloves, big round two-tone shoes,
// big expressive head, thick brown-black outline, flat fills with a print offset, halftone dots for shadows.
// No external assets, no images, no generative AI: only paths, ellipses and one dot pattern.
//
//   import { pose, poseGroup, OUTFITS, POSES, PIVOTS, IDS, poseSpec } from './heroine.mjs';
//   const svg = pose('inspectrice', 'idle');              // full <svg> string, viewBox 0 0 400 600
//
// Coordinates: viewBox 0 0 400 600, figure centred on x = 200, ground line y = 568.
// L / R in every id and pose field mean SCREEN left / right (the grid is on her screen-left).
// See NOTES_heroine.md for the rig, the pivots, the [217] decisions and the event wiring.

// ------------------------------------------------------------------ palette
export const PAL = {
  cream: '#F4E8C8', mustard: '#E8A92B', orange: '#D9622B', brick: '#B8352A', turq: '#2E8C8C',
  navy: '#1E2F4A', ink: '#2B1A12', olive: '#7A8B3A', plum: '#6A3D6E',
  // derived tones (flat, same family)
  white: '#FFFBF0', skin: '#F7D2A9', skinShade: '#E3A173', blush: '#E98A6A',
  hair: '#6E2F18', hairHi: '#B4592B', leather: '#9A5B33', steel: '#B9C7CC', night: '#14213A',
  mouth: '#7A1F1A', glass: '#CFEDEA', gold: '#F2C14E',
};
const INK = PAL.ink;
const OL = 6;                 // outline weight (viewBox units; 100 px figure height = ~1.2 px)
const MIS = [3.4, 3.0];       // print misregistration for filled shapes (fill is shifted, outline is not)
const MIS_T = [1.5, 1.3];     // same for tube limbs
const GROUND = 568, CX = 200;

export const OUTFITS = ['inspectrice', 'casino', 'lab', 'vault', 'trench'];
export const OUTFIT_LABEL = {
  inspectrice: 'A. Inspectrice (base)', casino: 'B. Casino evening', lab: 'C. Laboratory',
  vault: 'D. Vault / commando', trench: 'E. Trench and fedora',
};
export const POSES = ['idle', 'wink', 'smallwin', 'bigwin', 'shock', 'shrug', 'point', 'anticipation', 'think'];

// ------------------------------------------------------------------ small helpers
const f = (n) => { const v = Math.round(n * 10) / 10; return Object.is(v, -0) ? 0 : v; };
const rad = (d) => (d * Math.PI) / 180;
const rotp = (p, a, o = [0, 0]) => { const c = Math.cos(rad(a)), s = Math.sin(rad(a)); const x = p[0] - o[0], y = p[1] - o[1]; return [o[0] + x * c - y * s, o[1] + x * s + y * c]; };
const lerp = (a, b, t) => a + (b - a) * t;
const lerp2 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];

// cubic [P0,P1,P2,P3]
const cubicAt = (c, t) => { const u = 1 - t; return [0, 1].map((i) => u * u * u * c[0][i] + 3 * u * u * t * c[1][i] + 3 * u * t * t * c[2][i] + t * t * t * c[3][i]); };
const cubicD = (c) => `M${f(c[0][0])} ${f(c[0][1])}C${f(c[1][0])} ${f(c[1][1])} ${f(c[2][0])} ${f(c[2][1])} ${f(c[3][0])} ${f(c[3][1])}`;
function cubicSplit(c, t) {
  const a = lerp2(c[0], c[1], t), b = lerp2(c[1], c[2], t), d = lerp2(c[2], c[3], t);
  const e = lerp2(a, b, t), g = lerp2(b, d, t), h = lerp2(e, g, t);
  return [[c[0], a, e, h], [h, g, d, c[3]]];
}
const cubicSub = (c, t0, t1) => { const r = cubicSplit(c, t1)[0]; return t0 <= 0 ? r : cubicSplit(r, t0 / t1)[1]; };
function cubicTan(c, t) { // unit tangent
  const u = 1 - t;
  const x = 3 * u * u * (c[1][0] - c[0][0]) + 6 * u * t * (c[2][0] - c[1][0]) + 3 * t * t * (c[3][0] - c[2][0]);
  const y = 3 * u * u * (c[1][1] - c[0][1]) + 6 * u * t * (c[2][1] - c[1][1]) + 3 * t * t * (c[3][1] - c[2][1]);
  const L = Math.hypot(x, y) || 1; return [x / L, y / L];
}
// noodle limb from S to W, bowed by b1/b2 (signed, perpendicular units; + = to the left of the S->W direction in screen space)
function limb(S, W, b1 = 0, b2 = 0) {
  const dx = W[0] - S[0], dy = W[1] - S[1], L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
  return [S, [S[0] + dx * 0.33 + nx * b1, S[1] + dy * 0.33 + ny * b1], [S[0] + dx * 0.67 + nx * b2, S[1] + dy * 0.67 + ny * b2], W];
}
const rectD = (x, y, w, h) => `M${f(x)} ${f(y)}h${f(w)}v${f(h)}h${f(-w)}Z`;
const ellD = (cx, cy, rx, ry) => `M${f(cx - rx)} ${f(cy)}a${f(rx)} ${f(ry)} 0 1 0 ${f(2 * rx)} 0a${f(rx)} ${f(ry)} 0 1 0 ${f(-2 * rx)} 0Z`;
const polyD = (pts, close = true) => 'M' + pts.map((p) => `${f(p[0])} ${f(p[1])}`).join('L') + (close ? 'Z' : '');
const tf = (x, y, a = 0, s = 1, sy) => `translate(${f(x)} ${f(y)})${a ? ` rotate(${f(a)})` : ''}${s !== 1 || (sy !== undefined && sy !== s) ? ` scale(${f(s)} ${f(sy === undefined ? s : sy)})` : ''}`;

// ------------------------------------------------------------------ drawing context + primitives
function makeCtx(o = {}) {
  return {
    pre: o.idPrefix ?? 'mambo-', n: 0, defs: [], mis: o.misreg ?? MIS, misT: o.misregTube ?? MIS_T,
    halftone: o.halftone !== false,
    uid(k = 'x') { return `${this.pre}${k}${++this.n}`; },
  };
}
const attr = (o) => (o.id ? ` id="${o.id}"` : '') + (o.cls ? ` class="${o.cls}"` : '');

// filled + outlined shape, fill shifted by the print offset; optional halftone shade (path region clipped to the shape)
function part(c, d, fill, o = {}) {
  const sw = o.sw ?? OL, mis = o.mis ?? c.mis;
  let s = fill && fill !== 'none' ? `<path d="${d}" fill="${fill}" transform="translate(${f(mis[0])} ${f(mis[1])})"/>` : '';
  if (o.shade && c.halftone) {
    const cid = c.uid('c');
    c.defs.push(`<clipPath id="${cid}"><path d="${d}" transform="translate(${f(mis[0])} ${f(mis[1])})"/></clipPath>`);
    s += `<g clip-path="url(#${cid})"><path d="${o.shade}" fill="url(#${c.pre}${o.ht || 'ht'})"/></g>`;
  }
  if (sw > 0) s += `<path d="${d}" fill="none" stroke="${o.ink || INK}" stroke-width="${sw}" stroke-linejoin="round" stroke-linecap="round"/>`;
  return s;
}
// ink line (no fill)
const line = (d, w = 4.5, col = INK, extra = '') => `<path d="${d}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"${extra}/>`;
// noodle tube: ink stroke, then colour stroke (shifted a hair)
function tube(c, cv, w, fill, o = {}) {
  const d = cubicD(cv), mis = o.mis ?? c.misT, cap = o.cap || 'round';
  let s = `<path d="${d}" fill="none" stroke="${INK}" stroke-width="${f(w + 2 * OL)}" stroke-linecap="${cap}" stroke-linejoin="round"/>`;
  s += `<path d="${d}" fill="none" stroke="${fill}" stroke-width="${f(w)}" stroke-linecap="${cap}" transform="translate(${f(mis[0])} ${f(mis[1])})"/>`;
  if (o.shine) s += `<path d="${d}" fill="none" stroke="${o.shine}" stroke-width="${f(w * 0.22)}" stroke-linecap="round" transform="translate(${f(-w * 0.2)} 0)" opacity=".55"/>`;
  return s;
}
const g = (o, inner, extra = '') => `<g${attr(o)}${extra}>${inner}</g>`;
const star = (x, y, r, fill = PAL.white, rot = 0) => `<path d="M${f(x)} ${f(y - r)}Q${f(x + r * 0.16)} ${f(y - r * 0.16)} ${f(x + r)} ${f(y)}Q${f(x + r * 0.16)} ${f(y + r * 0.16)} ${f(x)} ${f(y + r)}Q${f(x - r * 0.16)} ${f(y + r * 0.16)} ${f(x - r)} ${f(y)}Q${f(x - r * 0.16)} ${f(y - r * 0.16)} ${f(x)} ${f(y - r)}Z" fill="${fill}" stroke="${INK}" stroke-width="3.2" stroke-linejoin="round"${rot ? ` transform="rotate(${rot} ${f(x)} ${f(y)})"` : ''}/>`;

// ------------------------------------------------------------------ gloves (local: wrist at 0,0, fingers toward +y, cuff on top)
// every glove is big, white, with THREE fingers + a thumb (rubber-hose "mitt" proportions)
function glove(c, kind, o = {}) {
  const W = PAL.white, sh = (d) => ({ shade: d, ht: 'ht' });
  const cuff = part(c, 'M-17 -14Q0 -19 17 -14L18 3Q0 8 -18 3Z', o.cuff || W, { sw: 5.5 }) + line('M-12 -6Q0 -2 12 -6', 3, INK, ' opacity=".55"');
  const finger = (x, y, a, len, w) => part(c, `M${f(-w)} 0L${f(-w)} ${f(len)}Q${f(-w)} ${f(len + w * 1.3)} 0 ${f(len + w * 1.3)}Q${f(w)} ${f(len + w * 1.3)} ${f(w)} ${f(len)}L${f(w)} 0Z`, W, { sw: 5, mis: [2.2, 1.8] }).replace(/^/, `<g transform="${tf(x, y, a)}">`) + '</g>';
  let s = '';
  switch (kind) {
    case 'open': // jazz hands: three fingers fanned + thumb
      s += finger(0, 16, 0, 26, 6.4) + finger(-14, 14, 32, 24, 6.2) + finger(14, 14, -32, 24, 6.2);
      s += part(c, 'M-19 4C-26 20 -20 38 0 40C20 38 26 20 19 4Z', W, sh(rectD(2, 14, 30, 40)));
      s += `<g transform="${tf(-19, 24, 62)}">${part(c, 'M-6.5 0L-6.5 17Q-6.5 25 0 25Q6.5 25 6.5 17L6.5 0Z', W, { sw: 5, mis: [2, 1.6] })}</g>`;
      break;
    case 'point': // index out, two curled, thumb up
      s += `<g transform="${tf(2, 12, 0)}">${part(c, 'M-6 0L-6 40Q-6 48 0 48Q6 48 6 40L6 0Z', W, { sw: 5, mis: [2.2, 1.8] })}</g>`;
      s += part(c, 'M-19 4C-26 20 -20 36 -2 36C18 36 26 22 19 4Z', W, sh(rectD(2, 14, 30, 40)));
      s += `<path d="M-6 30Q2 34 11 29M-8 22Q1 26 12 21" fill="none" stroke="${INK}" stroke-width="3.6" stroke-linecap="round"/>`;
      s += `<g transform="${tf(-17, 14, 32)}">${part(c, 'M-6.5 0L-6.5 14Q-6.5 21 0 21Q6.5 21 6.5 14L6.5 0Z', W, { sw: 5, mis: [2, 1.6] })}</g>`;
      break;
    case 'flat': // fingers together, salute / palm
      s += part(c, 'M-17 4C-21 28 -17 52 0 52C17 52 21 28 17 4Z', W, sh(rectD(2, 14, 30, 50)));
      s += line('M-6 52L-6 28M5 52L5 28', 3.6) + `<g transform="${tf(-17, 14, 40)}">${part(c, 'M-6 0L-6 12Q-6 19 0 19Q6 19 6 12L6 0Z', W, { sw: 5, mis: [2, 1.6] })}</g>`;
      break;
    case 'fist': default: // big bulb of a fist, knuckle bumps, thumb across
      s += part(c, 'M-20 4C-27 22 -23 36 -17 41Q-12 48 -6 42Q0 49 6 42Q12 48 17 41C23 36 27 22 20 4Z', W, sh(rectD(3, 10, 32, 44)));
      s += line('M-6 42L-5.5 27M6 42L5.5 27', 3.6);
      s += `<g transform="${tf(-15, 30, 76)}">${part(c, 'M-6.5 0L-6.5 14Q-6.5 21 0 21Q6.5 21 6.5 14L6.5 0Z', W, { sw: 5, mis: [2, 1.6] })}</g>`;
  }
  return s + cuff;
}
const GLOVE_GRIP = { fist: [0, 26], open: [0, 24], point: [0, 24], flat: [0, 28] };

// ------------------------------------------------------------------ shoes (local: ankle at 0,0, toe toward +x, ground at y=+34)
function shoe(c, o = {}) {
  const base = o.base || PAL.white, toe = o.toe || PAL.navy, sole = o.sole || INK;
  const d = 'M-23 -3C-26 14 -26 30 -14 34L36 34C58 34 66 24 64 14C62 2 44 -4 28 -4C12 -10 -8 -10 -23 -3Z';
  const cid = c.uid('s');
  c.defs.push(`<clipPath id="${cid}"><path d="${d}" transform="translate(${f(c.mis[0])} ${f(c.mis[1])})"/></clipPath>`);
  let s = part(c, d, base, { shade: 'M-30 20L70 8L70 60L-30 60Z', ht: 'ht' });
  // toe cap (two-tone) + sole + small heel + lace tab
  s += `<g clip-path="url(#${cid})"><path d="M30 -12Q22 12 32 40L80 40L80 -12Z" fill="${toe}" transform="translate(${f(c.mis[0])} ${f(c.mis[1])})"/></g>`;
  s += line('M30 -6Q22 12 33 33', 4.5);
  s += `<path d="M-24 30L60 30" fill="none" stroke="${sole}" stroke-width="9" stroke-linecap="round"/>`;
  s += part(c, 'M-24 31L-24 42L-12 42L-8 31Z', sole, { sw: 3 });
  s += `<path d="M-14 -6Q-2 -2 10 -6" fill="none" stroke="${INK}" stroke-width="3.5" stroke-linecap="round" opacity=".6"/>`;
  s += part(c, 'M2 -10Q14 -4 24 -9L22 -1Q12 3 4 -2Z', o.tab || PAL.mustard, { sw: 3.5, mis: [1.4, 1.2] });
  return s;
}

// ------------------------------------------------------------------ face
// head-local coordinates: origin at the neck pivot, face centre about (0,-72), chin at y=-8, crown at y=-130.
const FACE_D = 'M0 -8C36 -8 68 -32 68 -72C68 -112 38 -130 0 -130C-38 -130 -68 -112 -68 -72C-68 -32 -36 -8 0 -8Z';
const EYE_D = 'M-19 3C-16 -17 16 -17 19 3C15 17 -15 17 -19 3Z';
const EYE_WIDE = 'M-21 2C-20 -24 20 -24 21 2C20 24 -20 24 -21 2Z';

function eye(c, side, st, o) { // side -1 left eye, +1 right eye; outer corner is toward `side`
  const e = st.eyes[side < 0 ? 'l' : 'r'], s = side, cx = s * 26 + (st.fx || 0), cy = -72;
  const X = (x) => s * x;
  const look = st.look || [0, 0.2];
  let inner = '';
  const id = side < 0 ? 'eye-l' : 'eye-r';
  if (e.k === 'open' || e.k === 'wide') {
    const wide = e.k === 'wide', d = wide ? EYE_WIDE : EYE_D;
    const cid = c.uid('e');
    c.defs.push(`<clipPath id="${cid}"><path d="${d}"/></clipPath>`);
    const ix = Math.max(-8, Math.min(8, look[0] * 8)), iy = look[1] * 6 + (wide ? 0 : 3);
    const ir = wide ? 8.5 : 10.5, pr = wide ? 3.6 : 5.6;
    inner += `<path d="${d}" fill="${PAL.white}"/>`;
    inner += `<g clip-path="url(#${cid})"><circle cx="${f(ix)}" cy="${f(iy)}" r="${ir}" fill="${wide ? PAL.turq : PAL.turq}"/><circle cx="${f(ix)}" cy="${f(iy)}" r="${pr}" fill="${INK}"/><circle cx="${f(ix - 3.2)}" cy="${f(iy - 3.4)}" r="2.6" fill="${PAL.white}"/>`;
    if (!wide) { // half lid: eyeshadow-coloured lid above the lid line
      const ly = e.lid ?? -4;
      inner += `<path d="M-30 -30L30 -30L30 ${f(ly + 2)}Q${f(X(0) * 0)} ${f(ly - 9)} -30 ${f(ly + 2)}Z" fill="${o.lid || PAL.skinShade}" transform="${s > 0 ? '' : ''}"/>`;
    }
    inner += '</g>';
    inner += `<path d="${d}" fill="none" stroke="${INK}" stroke-width="4.2" stroke-linejoin="round"/>`;
    if (!wide) {
      const ly = e.lid ?? -4;
      // heavy lid line (convex up) with a small liner wing at the outer corner
      const lidp = `M${X(-20)} ${f(ly + 6)}Q${X(-2)} ${f(ly - 11)} ${X(19)} ${f(ly + 1)}L${X(27)} ${f(ly - 6)}`;
      inner += line(lidp, 6.2);
      for (const [t, ang, len] of [[0.52, 62, 12], [0.7, 40, 13.5], [0.88, 18, 12]]) { // long lashes fanned off the outer lid
        const px = lerp(-20, 19, t), py = ly + 6 - Math.sin(Math.PI * t * 0.95) * 13 + t * 2;
        inner += line(`M${X(px)} ${f(py)}L${X(px + Math.cos(rad(ang)) * len)} ${f(py - Math.sin(rad(ang)) * len)}`, 4.2);
      }
    } else {
      inner += line(`M${X(-20)} -12Q${X(0)} -26 ${X(21)} -10`, 4.5);
    }
  } else if (e.k === 'happy') { // joy arc with lashes on top
    inner += line(`M${X(-19)} 6Q${X(0)} -22 ${X(20)} 6`, 6.6);
    for (const [px, ang, len] of [[8, 55, 12], [14, 34, 12], [19, 10, 11]]) inner += line(`M${X(px)} ${f(-12 + (px - 8) * 1.1)}L${X(px + Math.cos(rad(ang)) * len)} ${f(-12 + (px - 8) * 1.1 - Math.sin(rad(ang)) * len)}`, 4.2);
  } else if (e.k === 'closed') { // wink / blink: lid line curved down, lashes pointing down-out
    inner += line(`M${X(-19)} -3Q${X(0)} 13 ${X(20)} -3`, 6.6);
    for (const [px, ang, len] of [[7, 62, 11], [13, 40, 12], [19, 16, 11]]) inner += line(`M${X(px)} ${f(3 + (px - 7) * -0.4)}L${X(px + Math.cos(rad(ang)) * len)} ${f(3 + (px - 7) * -0.4 + Math.sin(rad(ang)) * len)}`, 4.2);
  }
  return g({ id: o.pre + id }, `<g transform="translate(${f(cx)} ${cy})">${inner}</g>`);
}

function brow(c, side, st, o) {
  const b = st.brows[side < 0 ? 'l' : 'r'], s = side;
  const cx = s * 27 + (st.fx || 0) + (b.dx || 0), cy = -72 - 25 + (b.dy || 0), a = (b.rot || 0) * s;
  const arch = b.arch ?? 6, th = 8;
  // tapered brow: thick inner end, pointed outer end
  const x0 = -s * 19, x1 = s * 22;
  const d = `M${x0} ${f(2)}Q${f(s * 0)} ${f(-arch - 2)} ${x1} ${f(-1 - arch * 0.3)}Q${f(s * 2)} ${f(-arch + 3 + th * 0.6)} ${x0} ${f(2 + th)}Q${f(x0 - s * 3)} ${f(2 + th / 2)} ${x0} 2Z`;
  return g({ id: o.pre + (side < 0 ? 'brow-l' : 'brow-r') }, `<g transform="translate(${f(cx)} ${f(cy)}) rotate(${f(a)})"><path d="${d}" fill="${INK}" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/></g>`);
}

function mouth(c, st, o) {
  const m = st.mouth, mx = (st.fx || 0) * 1.2 + 3, my = -33;
  let s = '';
  const R = PAL.brick;
  switch (m) {
    case 'grin': // wide open grin, teeth, tongue
      s += part(c, 'M-27 -6C-14 21 16 21 29 -8C14 -2 -14 -2 -27 -6Z', PAL.mouth, { sw: 4.8, mis: [1.2, 1] });
      s += `<path d="M-24 -4C-10 0 12 0 26 -6C20 4 -4 6 -24 -4Z" fill="${PAL.white}"/>`;
      s += `<path d="M-12 14Q0 6 12 13Q2 21 -12 14Z" fill="${PAL.orange}"/>`;
      s += line('M-27 -6C-14 21 16 21 29 -8', 4.8);
      s += line('M-24 -4C-10 0 12 0 26 -6', 4.8, R);
      break;
    case 'o': // little startled O
      s += part(c, ellD(0, 2, 11, 13), R, { sw: 4.8, mis: [1, 1] });
      s += `<ellipse cx="0" cy="3" rx="6" ry="8" fill="${PAL.mouth}"/>`;
      break;
    case 'flat': // wry sideways pout (lose)
      s += `<path d="M-15 3Q-2 -3 14 -1" fill="none" stroke="${INK}" stroke-width="9.5" stroke-linecap="round"/><path d="M-15 3Q-2 -3 14 -1" fill="none" stroke="${R}" stroke-width="4" stroke-linecap="round"/>`;
      break;
    case 'smirkWide': // bigger smirk (small win)
      s += part(c, 'M-20 2C-12 -4 -4 -4 1 0C7 -4 16 -8 24 -15C20 8 4 14 -8 11C-14 9 -18 6 -20 2Z', R, { sw: 4.5, mis: [1.2, 1] });
      s += `<path d="M-14 3C-4 2 6 -1 19 -9C10 3 -2 8 -14 3Z" fill="${PAL.white}"/>`;
      s += line('M-20 2C-6 4 8 1 24 -15', 3.2);
      s += line('M24 -15q5 -2 6 -8', 3.4);
      break;
    case 'hmm': // tight little smile, lips pressed (anticipation)
      s += part(c, 'M-16 1C-8 -5 -3 -4 1 -2C6 -5 12 -7 19 -12C15 4 4 8 -4 6C-10 5 -14 3 -16 1Z', R, { sw: 4.5, mis: [1.2, 1] });
      s += line('M-16 1C-4 3 8 0 19 -12', 3.2);
      s += line('M19 -12q4 -2 5 -7', 3.4);
      break;
    case 'smirk': default: // small red lips, one corner up
      s += part(c, 'M-17 1C-10 -5 -4 -5 0 -2C5 -6 12 -8 19 -14C15 4 4 8 -4 6C-10 5 -15 3 -17 1Z', R, { sw: 4.5, mis: [1.2, 1] });
      s += line('M-17 1C-5 3 8 0 19 -14', 3.2);
      s += line('M19 -14q4 -2 5 -8', 3.4);
  }
  return g({ id: o.pre + 'mouth' }, `<g transform="translate(${f(mx)} ${my})">${s}</g>`);
}

// ------------------------------------------------------------------ hair
function hairBack(c, style, st) {
  const col = PAL.hair;
  if (style === 'bun') {
    return part(c, 'M-72 -78C-80 -140 -34 -158 0 -158C34 -158 80 -140 72 -78C80 -60 82 -36 70 -12C60 -26 62 -50 60 -60L-60 -60C-62 -50 -60 -26 -70 -12C-82 -36 -80 -60 -72 -78Z', col, { shade: 'M10 -170L90 -170L90 0L10 0Z', ht: 'ht' })
      + part(c, ellD(0, -170, 30, 28), col, { shade: 'M8 -200L50 -200L50 -140L8 -140Z' });
  }
  if (style === 'beehive') {
    return part(c, 'M-70 -70C-86 -130 -60 -180 0 -192C60 -180 86 -130 70 -70C80 -50 76 -26 62 -10C56 -26 60 -46 56 -58L-56 -58C-60 -46 -56 -26 -62 -10C-76 -26 -80 -50 -70 -70Z', col, { shade: 'M10 -200L100 -200L100 0L10 0Z' });
  }
  // bouffant flip (default): wide dome, ends flipped out
  return part(c, 'M-70 -100C-78 -152 -30 -170 0 -170C30 -170 80 -152 70 -100C84 -84 92 -58 86 -34C82 -12 66 0 50 -8C62 -22 62 -40 58 -56L-58 -56C-62 -40 -62 -22 -50 -8C-66 0 -82 -12 -86 -34C-92 -58 -84 -84 -70 -100Z', col, { shade: 'M12 -180L100 -180L100 10L12 10Z', ht: 'ht' });
}
function bangs(c, style, st) {
  const col = PAL.hair;
  let s = part(c, 'M-66 -92C-60 -134 8 -142 52 -118C60 -114 66 -106 68 -96C46 -112 22 -114 0 -104C-18 -96 -44 -84 -66 -92Z', col, { sw: OL, shade: 'M-70 -140L10 -140L10 -100L-70 -100Z' });
  s += `<path d="M-36 -112Q-6 -122 28 -112" fill="none" stroke="${PAL.hairHi}" stroke-width="5" stroke-linecap="round" opacity=".9"/>`;
  return s;
}

// ------------------------------------------------------------------ props (local: hand grip at 0,0, handle axis along +y, working end toward +y)
const props = {
  flashlight(c, o = {}) {
    let s = '';
    if (o.beam) s += `<g opacity=".92"><path d="M-14 62L-52 190L52 190L14 62Z" fill="${PAL.gold}" opacity=".45"/><path d="M-14 62L-52 190L52 190L14 62Z" fill="url(#${c.pre}ht)" opacity=".7"/></g>`;
    s += part(c, 'M-10 -34L10 -34L10 12L-10 12Z', PAL.mustard, { sw: 5.5, mis: [2, 1.6] });                 // handle
    s += part(c, 'M-10 8L10 8L21 46L-21 46Z', PAL.navy, { sw: 5.5, mis: [2, 1.6] });                           // head
    s += part(c, ellD(0, 47, 21, 7), PAL.cream, { sw: 5, mis: [1.5, 1.2] });                                    // lens rim
    s += `<ellipse cx="0" cy="47" rx="13" ry="3.8" fill="${o.on ? PAL.white : PAL.glass}"/>`;
    s += part(c, 'M-12 -34L12 -34L12 -26L-12 -26Z', PAL.navy, { sw: 4.5, mis: [1.4, 1.2] });                  // end cap
    s += line('M-4 -20L-4 0', 3, PAL.cream, ' opacity=".8"');
    return s;
  },
};

// ------------------------------------------------------------------ outfits
// Each wardrobe returns drawing strings in upper-body / lower-body world coordinates (rest skeleton).
const OUTFIT = {};

OUTFIT.inspectrice = {
  hair: 'flip', sleeve: PAL.navy, sleeveTrim: PAL.mustard, glove: PAL.white, legs: { fill: PAL.ink, shine: '#6B4A3C' }, shoe: { base: PAL.white, toe: PAL.navy, tab: PAL.mustard },
  skirtHem: 420, acc: 'flashlight',
  lower(c, st) { // pencil skirt (navy), knee length, no slit
    const d = 'M158 298L242 298C250 322 248 340 246 356C246 382 242 402 238 420Q200 426 162 420C158 402 154 382 154 356C152 340 150 322 158 298Z';
    return part(c, d, PAL.navy, { shade: 'M205 290L260 290L260 440L205 440Z' })
      + part(c, 'M162 412Q200 418 238 412L238 420Q200 426 162 420Z', PAL.mustard, { sw: 4.5, mis: [1.5, 1.2] });
  },
  torso(c, st) {
    const J = 'M156 250C168 238 184 236 200 238C216 236 232 238 244 250C253 264 247 284 239 304C234 318 246 338 246 358L154 358C154 338 166 318 161 304C153 284 147 264 156 250Z';
    let s = part(c, J, PAL.navy, { shade: 'M208 230L270 230L270 370L208 370Z' });
    // shirt V, lapels, thin tie
    s += part(c, 'M184 238L216 238L200 292Z', PAL.cream, { sw: 4.5, mis: [1.5, 1.2] });
    s += part(c, 'M186 236L170 254L192 296L201 288L190 258Z', PAL.navy, { sw: 5 }) + part(c, 'M214 236L230 254L208 296L199 288L210 258Z', PAL.navy, { sw: 5 });
    s += part(c, 'M197.5 262L202.5 262L205 300L200 308L195 300Z', PAL.mustard, { sw: 3.8, mis: [1.2, 1] });
    s += part(c, 'M194 246L206 246L203 262L197 262Z', PAL.mustard, { sw: 3.5, mis: [1.2, 1] });
    // buttons (two columns), pockets, hem trim, epaulettes
    for (const y of [318, 338]) for (const x of [-17, 17]) s += part(c, ellD(200 + x, y, 4.6, 4.6), PAL.mustard, { sw: 3.2, mis: [1, 1] });
    s += part(c, 'M153 348L247 348L246 358L154 358Z', PAL.mustard, { sw: 4.5, mis: [1.5, 1.2] });
    s += part(c, 'M158 258L184 246L186 255L160 268Z', PAL.mustard, { sw: 4, mis: [1.5, 1.2] }) + part(c, 'M242 258L216 246L214 255L240 268Z', PAL.mustard, { sw: 4, mis: [1.5, 1.2] });
    // breast pocket + fictional badge + whistle on a chain
    s += part(c, 'M166 296L186 296L186 316L176 322L166 316Z', PAL.navy, { sw: 4, mis: [1.2, 1] });
    s += part(c, 'M171 300L181 300L181 309Q176 314 171 309Z', PAL.mustard, { sw: 3.2, mis: [1, 1] });
    s += line('M176 306l0 -2M173 308l6 0', 2.4, PAL.navy);
    s += line('M188 244Q214 270 192 300', 3, PAL.mustard);
    s += part(c, 'M186 300L198 296L202 304L190 308Z', PAL.mustard, { sw: 3.5, mis: [1.2, 1] }) + `<circle cx="196" cy="301" r="1.6" fill="${INK}"/>`;
    return s;
  },
  head(c, st) { // kepi (flat-top cap with a visor) + fictional agency badge. local to head pivot.
    let s = '';
    s += part(c, 'M-58 -112L-64 -150Q0 -168 64 -150L58 -112Q0 -100 -58 -112Z', PAL.navy, { shade: 'M10 -170L80 -170L80 -96L10 -96Z' });
    s += part(c, 'M-64 -150Q0 -168 64 -150Q0 -136 -64 -150Z', '#2B4466', { sw: 5, mis: [1.5, 1.2] });
    s += part(c, 'M-60 -125Q0 -112 60 -125L58 -112Q0 -100 -58 -112Z', PAL.mustard, { sw: 5, mis: [1.5, 1.2] });
    s += part(c, 'M-62 -112Q-50 -88 0 -86Q50 -88 62 -112Q0 -100 -62 -112Z', PAL.ink, { sw: 5, mis: [1.5, 1.2] });
    s += line('M-44 -100Q-20 -93 -6 -92', 3, PAL.cream, ' opacity=".6"');
    // badge: shield with a note-star, fictional (Mezzanine Bureau "MB")
    s += part(c, 'M-15 -146L15 -146L15 -130Q15 -120 0 -114Q-15 -120 -15 -130Z', PAL.mustard, { sw: 4.6, mis: [1.3, 1.1] });
    s += star(0, -133, 8.4, PAL.navy);
    return s;
  },
};

// ------------------------------------------------------------------ poses
// Resolved pose spec. All coordinates are REST-SKELETON world coordinates (viewBox 0 0 400 600) of the UPPER body
// (the whole upper group is then rotated by `lean` around the waist pivot and shifted by `ux,uy`).
const SH = { L: [160, 252], R: [240, 252] };          // shoulder pivots (upper body, rest)
const NECK = [200, 238];                               // head pivot (neck base)
const WAIST = [200, 306];                              // lean pivot
const HIPJ = { L: [184, 404], R: [216, 404] };         // leg roots (hidden under the skirt)

const DEF = {
  root: { dx: 0, dy: 0, sx: 1, sy: 1, rot: 0 },
  lean: 0, ux: 0, uy: 0, hipTilt: 0, hipX: 0,
  head: { tilt: 0, dx: 0, dy: 0 },
  fx: 0, look: [0, 0.25],
  eyes: { l: { k: 'open' }, r: { k: 'open' } },
  brows: { l: { dy: 3, rot: -4, arch: 4 }, r: { dy: -9, rot: -14, arch: 10 } },
  mouth: 'smirk',
  cap: { dy: 0, rot: 0, dx: 0 },
  armL: { w: [128, 360], b: [34, 34], glove: 'fist', gr: 0, front: false },
  armR: { w: [262, 392], b: [-6, -10], glove: 'fist', gr: 0, front: false },
  legL: { a: [168, 530], b: [10, -6], sr: -4, flip: -1, lift: 0 },
  legR: { a: [232, 530], b: [-6, 8], sr: 4, flip: 1, lift: 0 },
  acc: { hand: 'R', rot: 12, beam: false, on: false },
  fxs: [],
};

const POSE = {};
POSE.idle = {
  hipX: 8, hipTilt: -3, lean: 3.5, ux: -4,
  head: { tilt: -5, dx: 0, dy: 0 }, fx: -3, look: [-0.1, 0.25],
  armL: { w: [160, 346], b: [50, 46], glove: 'fist', gr: -64 },                 // hand on hip, noodle bowed outward
  armR: { w: [270, 390], b: [-4, -12], glove: 'fist', gr: 6 },                  // flashlight hanging
  legR: { a: [222, 530], b: [-4, 6], sr: 3, flip: 1 },                          // weight leg
  legL: { a: [160, 534], b: [8, -10], sr: -10, flip: -1 },                      // free leg, foot out
  acc: { hand: 'R', rot: 14 },
};

function resolve(outfit, name) {
  const p = POSE[name] || POSE.idle;
  const deep = (a, b) => { const o = Array.isArray(a) ? a.slice() : { ...a }; for (const k of Object.keys(b || {})) o[k] = b[k] && typeof b[k] === 'object' && !Array.isArray(b[k]) ? deep(a?.[k] || {}, b[k]) : b[k]; return o; };
  return deep(deep({}, DEF), p);
}

// ------------------------------------------------------------------ assemble
const DEFS_COMMON = (pre) => `<pattern id="${pre}ht" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(30)"><circle cx="3.5" cy="3.5" r="1.75" fill="${INK}" opacity=".34"/></pattern>`;

function armGroup(c, side, st, W, o) {
  const a = st['arm' + side], S = SH[side];
  const cv = limb(S, a.w, a.b[0], a.b[1]);
  const tan = cubicTan(cv, 1);
  const ang = (Math.atan2(tan[1], tan[0]) * 180) / Math.PI - 90 + (a.gr || 0);
  let tubeS = '';
  const sleeve = W.sleeve, trim = W.sleeveTrim;
  tubeS += tube(c, cv, 13, sleeve);
  if (trim) tubeS += tube(c, cubicSub(cv, 0.82, 0.9), 13, trim, { cap: 'butt' });
  const hand = g({ id: c.pre + 'hand-' + side.toLowerCase() }, `<g transform="${tf(a.w[0], a.w[1], ang)}">${st.acc.hand === side ? accDraw(c, st, W) : ''}${glove(c, a.glove, { cuff: W.glove })}</g>`);
  return { tube: g({ id: c.pre + 'arm-' + side.toLowerCase() + '-tube' }, tubeS), hand, cv };
}
function accDraw(c, st, W) {
  const a = st.acc; const gp = GLOVE_GRIP[st.acc.hand === 'L' ? st.armL.glove : st.armR.glove] || [0, 26];
  return `<g id="${c.pre}acc" transform="translate(${gp[0]} ${gp[1]}) rotate(${f(a.rot || 0)})">${props[W.acc](c, { beam: a.beam, on: a.on })}</g>`;
}

function legGroup(c, side, st, W) {
  const L = st['leg' + side], root = HIPJ[side];
  const cv = limb(root, L.a, L.b[0], L.b[1]);
  const t = tube(c, cv, 14, W.legs.fill, { shine: W.legs.shine });
  const sh = g({ id: c.pre + 'shoe-' + side.toLowerCase() }, `<g transform="translate(${f(L.a[0])} ${f(L.a[1] - (L.lift || 0))}) rotate(${f(L.sr)}) scale(${L.flip} 1)">${shoe(c, W.shoe)}</g>`);
  return { leg: g({ id: c.pre + 'leg-' + side.toLowerCase() }, t), shoe: sh };
}

export function poseSpec(outfit, name) { return resolve(outfit, name); }

export function poseGroup(outfit, name, opts = {}) {
  const c = makeCtx(opts), st = resolve(outfit, name), W = OUTFIT[outfit] || OUTFIT.inspectrice, P = c.pre;
  const R = st.root;
  // ---- lower body
  const legL = legGroup(c, 'L', st, W), legR = legGroup(c, 'R', st, W);
  const lower = g({ id: P + 'lower' }, `<g transform="translate(${f(st.hipX)} 0) rotate(${f(st.hipTilt)} 200 ${HIPJ.L[1] - 50})">${g({ id: P + 'skirt' }, W.lower(c, st))}</g>`);
  // ---- upper body
  const armL = armGroup(c, 'L', st, W), armR = armGroup(c, 'R', st, W);
  const faceTurn = st.fx;
  const faceInner =
    hairBack(c, W.hair, st) +
    part(c, FACE_D, PAL.skin, { shade: 'M10 -140L90 -140L90 0L-10 0Z' }) +
    `<ellipse cx="${f(-42 + faceTurn)}" cy="-46" rx="12" ry="7" fill="${PAL.blush}" opacity=".42"/><ellipse cx="${f(46 + faceTurn)}" cy="-46" rx="12" ry="7" fill="${PAL.blush}" opacity=".42"/>` +
    g({ id: P + 'eyes' }, eye(c, -1, st, { pre: P }) + eye(c, 1, st, { pre: P })) +
    brow(c, -1, st, { pre: P }) + brow(c, 1, st, { pre: P }) +
    g({ id: P + 'nose' }, line(`M${f(faceTurn * 1.3 + 3)} -62Q${f(faceTurn * 1.3 + 11)} -52 ${f(faceTurn * 1.3 + 3)} -48`, 4.2)) +
    mouth(c, st, { pre: P }) +
    g({ id: P + 'hair-front' }, bangs(c, W.hair, st));
  const capG = g({ id: P + 'cap' }, `<g transform="translate(${st.cap.dx} ${st.cap.dy}) rotate(${st.cap.rot} 0 -130)">${W.head(c, st)}</g>`);
  const head = g({ id: P + 'head' }, `<g transform="translate(${NECK[0] + st.head.dx} ${NECK[1] + st.head.dy}) rotate(${st.head.tilt})">${faceInner}${capG}</g>`);
  const neck = part(c, 'M188 226L212 226L212 250L188 250Z', PAL.skin, { sw: 5, mis: [1.5, 1.2] });
  const upper = g({ id: P + 'upper' },
    `<g transform="translate(${f(st.ux)} ${f(st.uy)}) rotate(${f(st.lean)} ${WAIST[0]} ${WAIST[1]})">` +
    (armL.cv && !st.armL.front ? armL.tube : '') + (!st.armR.front ? armR.tube : '') +
    neck + g({ id: P + 'torso' }, W.torso(c, st)) +
    (st.armL.front ? armL.tube : '') + (st.armR.front ? armR.tube : '') +
    head + armL.hand + armR.hand + `</g>`);
  const shadow = `<ellipse id="${P}shadow" cx="${200 + st.hipX}" cy="${GROUND + 2}" rx="${f(92 * (1 - (st.root.dy || 0) / -300))}" ry="12" fill="${INK}" opacity=".28"/>`;
  const body =
    shadow +
    g({ id: P + 'legs' }, legL.leg + legR.leg) + lower + g({ id: P + 'shoes' }, legL.shoe + legR.shoe) + upper;
  const rootT = `translate(${R.dx} ${R.dy}) translate(200 ${GROUND}) rotate(${R.rot}) scale(${R.sx} ${R.sy}) translate(-200 -${GROUND})`;
  return { defs: DEFS_COMMON(P) + c.defs.join(''), body: `<g id="${P}root" transform="${rootT}">${body}</g>` };
}

export function pose(outfit, name, opts = {}) {
  const { defs, body } = poseGroup(outfit, name, opts);
  const bg = opts.bg ? `<rect width="400" height="600" fill="${opts.bg}"/>` : '';
  const P = opts.idPrefix ?? 'mambo-';
  const sticker = opts.sticker ? `<filter id="${P}sticker" x="-20%" y="-20%" width="140%" height="140%"><feMorphology in="SourceAlpha" operator="dilate" radius="${opts.sticker === true ? 7 : opts.sticker}" result="d"/><feFlood flood-color="${PAL.white}"/><feComposite in2="d" operator="in" result="rim"/><feMerge><feMergeNode in="rim"/><feMergeNode in="SourceGraphic"/></feMerge></filter>` : '';
  const inner = opts.sticker ? `<g filter="url(#${P}sticker)">${body}</g>` : body;
  const size = opts.size ? ` width="${Math.round(opts.size * 400 / 600)}" height="${opts.size}"` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600"${size}><defs>${defs}${sticker}</defs>${bg}${inner}</svg>`;
}

export const PIVOTS = { neck: NECK, waist: WAIST, shoulderL: SH.L, shoulderR: SH.R, hipL: HIPJ.L, hipR: HIPJ.R, ground: [200, GROUND] };
export const IDS = [];
