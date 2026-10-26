// mambo_art.mjs - static art + shared geometry for "Mambo" (Mabel "Mambo" Fontaine), the Agent Mambo heroine.
// Hand-authored vector geometry (paths, ellipses, one dot pattern). No bitmaps, no <image>, no filters, no AI output:
// the Higgsfield pictures in ./higgs are visual MODEL SHEETS only. Everything here is drawn in code.
//
// Style: 1930s-60s rubber-hose cartoon, noodle limbs without elbows, big white three-finger gloves, big round white shoes,
// big expressive head, uniform dark-brown outline, flat fills with a small print offset and halftone dots for shadows.
// DOM-free: this module only builds markup strings and numbers (the runtime is mambo_rig.mjs).
//
// Coordinates: viewBox 0 0 400 600, figure centred on x=200, ground y=566. Head-local coordinates: origin = neck pivot,
// the face is drawn FACING RIGHT (toward the slot grid, which is on her right), chin y=-14, crown y=-141.
// L / R in ids always mean SCREEN left / right.

// ------------------------------------------------------------------ palette
export const PAL = {
  cream: '#F4E8C8', mustard: '#E8A92B', orange: '#D9622B', brick: '#B8352A', turq: '#2E8C8C',
  navy: '#1E2F4A', ink: '#2B1A12', olive: '#7A8B3A', plum: '#6A3D6E',
  // derived tones (same family, flat)
  white: '#FFFBF0', skin: '#F8EDCB', skinShade: '#E2C08C', blush: '#E98A6A', eyeshadow: '#EDC45A',
  hair: '#4A2216', hairShade: '#2E140D', hairHi: '#8E5230',
  navyLight: '#3C609A', navyDeep: '#162338', navyJ: '#27447E', gold: '#F2C14E', goldDeep: '#C98A1E', leather: '#7A4A2A', leatherLight: '#9A6236',
  steel: '#B9C7CC', lips: '#C4271E', lipsDeep: '#8E1712', mouth: '#5E1410', glass: '#CFEDEA', camel: '#B98A55', burgundy: '#6E2440',
};
export const INK = PAL.ink;
export const OL = 4.6;                 // uniform outline weight (viewBox units)
export const MIS = [2.8, 2.4];         // print misregistration (fill layer shifted against the outline)
export const MIS_T = [1.4, 1.2];
export const GROUND = 566;

// rest skeleton (upper-body coordinates at rest). Proportions measured on the model sheet (cap top 66 -> ground 566).
export const REST = {
  neck: [200, 225], shoulderL: [161, 258], shoulderR: [239, 258], waist: [200, 304], hip: [200, 346],
  hipJointL: [188, 420], hipJointR: [212, 420], ankleL: [164, 524], ankleR: [238, 524], ground: [200, GROUND], skirtHem: 452,
};

// ------------------------------------------------------------------ helpers
export const f = (n) => { const v = Math.round(n * 10) / 10; return Object.is(v, -0) ? 0 : v; };
export const rad = (d) => (d * Math.PI) / 180;
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const lerp2 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
export const rotp = (p, a, o = [0, 0]) => { const c = Math.cos(rad(a)), s = Math.sin(rad(a)); const x = p[0] - o[0], y = p[1] - o[1]; return [o[0] + x * c - y * s, o[1] + x * s + y * c]; };

// cubic = [P0,P1,P2,P3]
export const cubicAt = (c, t) => { const u = 1 - t; return [0, 1].map((i) => u * u * u * c[0][i] + 3 * u * u * t * c[1][i] + 3 * u * t * t * c[2][i] + t * t * t * c[3][i]); };
export const cubicD = (c) => `M${f(c[0][0])} ${f(c[0][1])}C${f(c[1][0])} ${f(c[1][1])} ${f(c[2][0])} ${f(c[2][1])} ${f(c[3][0])} ${f(c[3][1])}`;
export function cubicSplit(c, t) {
  const a = lerp2(c[0], c[1], t), b = lerp2(c[1], c[2], t), d = lerp2(c[2], c[3], t);
  const e = lerp2(a, b, t), g = lerp2(b, d, t), h = lerp2(e, g, t);
  return [[c[0], a, e, h], [h, g, d, c[3]]];
}
export const cubicSub = (c, t0, t1) => { const r = cubicSplit(c, t1)[0]; return t0 <= 0 ? r : cubicSplit(r, t0 / t1)[1]; };
export function cubicTan(c, t) {
  const u = 1 - t;
  const x = 3 * u * u * (c[1][0] - c[0][0]) + 6 * u * t * (c[2][0] - c[1][0]) + 3 * t * t * (c[3][0] - c[2][0]);
  const y = 3 * u * u * (c[1][1] - c[0][1]) + 6 * u * t * (c[2][1] - c[1][1]) + 3 * t * t * (c[3][1] - c[2][1]);
  const L = Math.hypot(x, y) || 1; return [x / L, y / L];
}
// noodle limb S -> W, bowed by b1/b2 (perpendicular units, + = left of the S->W direction in screen space)
export function limb(S, W, b1 = 0, b2 = 0) {
  const dx = W[0] - S[0], dy = W[1] - S[1], L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
  return [S, [S[0] + dx * 0.33 + nx * b1, S[1] + dy * 0.33 + ny * b1], [S[0] + dx * 0.67 + nx * b2, S[1] + dy * 0.67 + ny * b2], W];
}
export const rectD = (x, y, w, h) => `M${f(x)} ${f(y)}h${f(w)}v${f(h)}h${f(-w)}Z`;
export const ellD = (cx, cy, rx, ry) => `M${f(cx - rx)} ${f(cy)}a${f(rx)} ${f(ry)} 0 1 0 ${f(2 * rx)} 0a${f(rx)} ${f(ry)} 0 1 0 ${f(-2 * rx)} 0Z`;
export const tf = (x, y, a = 0, sx = 1, sy = sx) => `translate(${f(x)} ${f(y)})${a ? ` rotate(${f(a)})` : ''}${sx !== 1 || sy !== 1 ? ` scale(${f(sx)} ${f(sy)})` : ''}`;

// ------------------------------------------------------------------ drawing context + primitives
export function makeCtx(o = {}) {
  return {
    pre: o.idPrefix ?? 'mambo-', n: 0, defs: [], mis: o.misreg === false ? [0, 0] : (o.misreg ?? MIS), misT: o.misreg === false ? [0, 0] : MIS_T,
    halftone: o.halftone !== false, W: null,
    uid(k = 'x') { return `${this.pre}${k}${++this.n}`; },
  };
}
// shape = shifted fill (+ optional halftone shade clipped to the shape) + uniform outline
export function part(c, d, fill, o = {}) {
  const sw = o.sw ?? OL, mis = o.mis ?? c.mis;
  const tr = mis[0] || mis[1] ? ` transform="translate(${f(mis[0])} ${f(mis[1])})"` : '';
  let s = fill && fill !== 'none' ? `<path d="${d}" fill="${fill}"${tr}/>` : '';
  if (o.shade && c.halftone) {
    const cid = c.uid('c');
    c.defs.push(`<clipPath id="${cid}"><path d="${d}"${tr}/></clipPath>`);
    s += `<g clip-path="url(#${cid})"><path d="${o.shade}" fill="url(#${c.pre}${o.ht || 'ht'})"/></g>`;
  }
  if (sw > 0) s += `<path d="${d}" fill="none" stroke="${o.ink || INK}" stroke-width="${sw}" stroke-linejoin="round" stroke-linecap="round"/>`;
  return s;
}
export const line = (d, w = 4, col = INK, extra = '') => `<path d="${d}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"${extra}/>`;
export const circ = (x, y, r, fill, extra = '') => `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="${fill}"${extra}/>`;
export const G = (id, inner, extra = '') => `<g${id ? ` id="${id}"` : ''}${extra}>${inner}</g>`;
export function star(x, y, r, fill = PAL.white, sw = 3.2, rot = 0, pts = 4) {
  let d = '';
  const n = pts * 2;
  for (let i = 0; i < n; i++) {
    const a = (Math.PI * 2 * i) / n - Math.PI / 2 + rad(rot), rr = i % 2 ? r * (pts === 4 ? 0.28 : pts === 8 ? 0.62 : 0.46) : r;
    d += `${i ? 'L' : 'M'}${f(x + Math.cos(a) * rr)} ${f(y + Math.sin(a) * rr)}`;
  }
  return `<path d="${d}Z" fill="${fill}" stroke="${INK}" stroke-width="${sw}" stroke-linejoin="round"/>`;
}
// tube element pair (dynamic: runtime writes `d` into both). returns markup with ids `${id}-ink` and `${id}-fill`
export function tubeEls(c, id, w, fill, o = {}) {
  const mis = c.misT, tr = mis[0] || mis[1] ? ` transform="translate(${f(mis[0])} ${f(mis[1])})"` : '';
  return `<path id="${c.pre}${id}-ink" d="${o.d || ''}" fill="none" stroke="${INK}" stroke-width="${f(w + 2 * OL)}" stroke-linecap="round" stroke-linejoin="round"/>` +
    `<path id="${c.pre}${id}-fill" d="${o.d || ''}" fill="none" stroke="${fill}" stroke-width="${w}" stroke-linecap="round"${tr}/>`;
}

// ------------------------------------------------------------------ EYES: geometry (pure functions of openness etc.)
// local to the eye centre; `s` = +1 for the screen-right eye (outer corner at +x), -1 for the screen-left eye.
const lp = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
export const EYE = { w: 34, h: 38 };
export function eyeGeom(s, p) {
  const X = (x) => s * x;
  const u = clamp(p.u ?? 0.55, 0, 1), joy = clamp(p.joy ?? 0, 0, 1), low = clamp(p.low ?? 0, 0, 1);
  const Pi = [X(-17), 1], Po = [X(17), 1];
  const UP = [[X(-19), -28], [X(19), -28]];            // upper oval outline controls (also the fully-open lid line)
  const LO = [[X(19), 26], [X(-19), 26]];              // lower oval outline Po -> Pi
  const BOT = [LO[1], LO[0]];                           // same curve, Pi -> Po
  const CL = [[X(-12), 9], [X(12), 9]], CJ = [[X(-14), -13], [X(14), -13]];
  const K = [lp(CL[0], CJ[0], joy), lp(CL[1], CJ[1], joy)];
  const sl = (p.slant ?? 0) * (1 - u);
  const lid = [lp(K[0], UP[0], u), lp(K[1], UP[1], u)];
  lid[0] = [lid[0][0], lid[0][1] + sl]; lid[1] = [lid[1][0], lid[1][1] - sl * 0.7];
  const w = Math.max(clamp(1 - u / 0.35, 0, 1), low * 0.55, joy);
  const lowB = [lp(BOT[0], K[0], w), lp(BOT[1], K[1], w)];
  const P = (p2) => `${f(p2[0])} ${f(p2[1])}`;
  const lidCurve = [Pi, lid[0], lid[1], Po];
  const flickK = clamp((u - 0.15) / 0.5, 0, 1) * (1 - joy * 0.3) + joy * 0.6;
  const flick = [Po[0] + X(6) * flickK, Po[1] - 4 * flickK];
  const lidLine = `M${P(Pi)}C${P(lid[0])} ${P(lid[1])} ${P(Po)}L${P(flick)}`;
  const upperFill = `M${P(Pi)}C${P(UP[0])} ${P(UP[1])} ${P(Po)}C${P(lid[1])} ${P(lid[0])} ${P(Pi)}Z`;
  const lowerFill = `M${P(Pi)}C${P(lowB[0])} ${P(lowB[1])} ${P(Po)}C${P(LO[0])} ${P(LO[1])} ${P(Pi)}Z`;
  // lashes: the near eye (s<0) fans five long lashes off its outer corner, the far eye three short ones
  const near = s < 0;
  const up = near ? [-78, -54, -30, -8, 16] : [-62, -32, -4], dn = near ? [56, 42, 28, 16, 6] : [46, 28, 10];
  const ts = near ? [0.46, 0.6, 0.74, 0.88, 0.99] : [0.62, 0.82, 0.99], len = near ? [14, 18, 20.5, 19, 14] : [10.5, 12.5, 10.5];
  const mix = clamp(Math.max(Math.pow(u, 0.8), joy), 0, 1);
  let lashes = '';
  for (let i = 0; i < ts.length; i++) {
    const t = ts[i], a = rad(lerp(dn[i], up[i], mix)), q = cubicAt(lidCurve, t);
    const ex = q[0] + X(Math.cos(a)) * len[i], ey = q[1] + Math.sin(a) * len[i];
    const mx = (q[0] + ex) / 2, my = (q[1] + ey) / 2 + (mix > 0.5 ? -2.4 : 2.4);
    lashes += `M${P(q)}Q${f(mx)} ${f(my)} ${f(ex)} ${f(ey)}`;
  }
  return { lidLine, upperFill, lowerFill, lashes, closed: w, flick };
}
export const almondPath = (s) => { const X = (x) => s * x; return `M${X(-17)} 1C${X(-19)} -28 ${X(19)} -28 ${X(17)} 1C${X(19)} 26 ${X(-19)} 26 ${X(-17)} 1Z`; };

// ------------------------------------------------------------------ BROWS
export function browPath(s, dy, rot, arch, thick = 1, len = 1) {
  const X = (x) => s * x, pts = [], n = 9;
  const top = [], bot = [];
  const cr = Math.cos(rad(rot * s)), sr = Math.sin(rad(rot * s));
  for (let i = 0; i < n; i++) {
    const u = i / (n - 1);
    const x = X(lerp(-19, 22, u) * len), y = -arch * Math.sin(Math.PI * Math.pow(u, 0.9)) + 3.5 * u * u - 1.5;
    const du = 1e-3, x2 = X(lerp(-19, 22, u + du) * len), y2 = -arch * Math.sin(Math.PI * Math.pow(u + du, 0.9)) + 3.5 * (u + du) * (u + du) - 1.5;
    let tx = x2 - x, ty = y2 - y; const L = Math.hypot(tx, ty) || 1; tx /= L; ty /= L;
    const t = (3.4 * (1 - Math.pow(u, 2.6)) + 0.5) * thick * 0.5;
    const nx = -ty, ny = tx;
    const rp = (px, py) => [px * cr - py * sr, px * sr + py * cr + dy];
    top.push(rp(x + nx * t, y + ny * t)); bot.push(rp(x - nx * t, y - ny * t));
  }
  const all = top.concat(bot.reverse());
  return 'M' + all.map((p) => `${f(p[0])} ${f(p[1])}`).join('L') + 'Z';
}

// ------------------------------------------------------------------ MOUTH: 8 visemes with identical topology (tween-able arrays)
// layout of a viseme vector: lips[16] cavity[16] teeth[2: y0,y1] tongue[4: cx,cy,rx,ry] gloss[4] seam[6] dimple[3: x,y,op] ops[4: cavity,teeth,tongue,seam]
const NL = 16, O_CAV = 16, O_TEETH = 32, O_TONGUE = 34, O_GLOSS = 38, O_SEAM = 42, O_DIMPLE = 48, O_OPS = 51, NV = 55;
function mouthShape(p) {
  const hw = p.hw, cL = p.cL ?? 0, cR = p.cR ?? 0, curve = p.curve ?? 0, up = p.up ?? 3.2, lo = p.lo ?? 3.8, op = p.open ?? 0, cw = p.cw ?? 0.82, bow = p.bow ?? 1.2;
  const yj = (x) => lerp(cL, cR, (x + hw) / (2 * hw)) + curve * (1 - (x / hw) * (x / hw));
  const prof = (x) => Math.sqrt(Math.max(0, 1 - (x / hw) * (x / hw)));
  const xs = [-0.5, 0, 0.5].map((k) => k * hw);
  const v = new Array(NV).fill(0);
  const upOut = (x) => yj(x) - op * 0.5 * prof(x) - up * prof(x), loOut = (x) => yj(x) + op * 0.5 * prof(x) + lo * prof(x);
  const lips = [[-hw, cL], [xs[0], upOut(xs[0])], [0, upOut(0) + bow], [xs[2], upOut(xs[2])], [hw, cR], [xs[2], loOut(xs[2])], [0, loOut(0)], [xs[0], loOut(xs[0])]];
  const cx = hw * cw;
  const cav = [[-cx, yj(-cx)], [-0.5 * cx, yj(-0.5 * cx) - op * 0.5 * prof(-0.5 * cx)], [0, yj(0) - op * 0.5], [0.5 * cx, yj(0.5 * cx) - op * 0.5 * prof(0.5 * cx)], [cx, yj(cx)],
    [0.5 * cx, yj(0.5 * cx) + op * 0.5 * prof(0.5 * cx)], [0, yj(0) + op * 0.5], [-0.5 * cx, yj(-0.5 * cx) + op * 0.5 * prof(-0.5 * cx)]];
  lips.forEach((q, i) => { v[i * 2] = q[0]; v[i * 2 + 1] = q[1]; });
  cav.forEach((q, i) => { v[O_CAV + i * 2] = q[0]; v[O_CAV + i * 2 + 1] = q[1]; });
  const yTop = yj(0) - op * 0.5;
  v[O_TEETH] = yTop; v[O_TEETH + 1] = yTop + (p.teeth ? Math.min(op * 0.5, 4.8) : 0);
  v[O_TONGUE] = p.tx ?? 2; v[O_TONGUE + 1] = yj(0) + op * 0.5 - 1.6; v[O_TONGUE + 2] = hw * 0.42; v[O_TONGUE + 3] = Math.max(0.1, op * 0.34);
  // gloss: small white highlight on the lower lip
  v[O_GLOSS] = -hw * 0.18; v[O_GLOSS + 1] = loOut(-hw * 0.18) - lo * 0.45; v[O_GLOSS + 2] = Math.max(1.2, hw * 0.2); v[O_GLOSS + 3] = Math.max(0.5, lo * 0.22);
  // seam (lip junction) as 3 points
  v[O_SEAM] = -hw; v[O_SEAM + 1] = cL; v[O_SEAM + 2] = 0; v[O_SEAM + 3] = yj(0) + (p.seamDip ?? 1); v[O_SEAM + 4] = hw; v[O_SEAM + 5] = cR;
  v[O_DIMPLE] = hw + 2.4; v[O_DIMPLE + 1] = cR - 3.5; v[O_DIMPLE + 2] = p.dimple ?? 0;
  v[O_OPS] = op > 0.6 ? 1 : 0; v[O_OPS + 1] = p.teeth ? 1 : 0; v[O_OPS + 2] = p.tongue ? 1 : 0; v[O_OPS + 3] = op > 0.6 ? 0 : 1;
  return v;
}
export const VISEMES = {
  smirk:   mouthShape({ hw: 10.5, cL: 0.8, cR: -4.6, curve: 1.8, up: 4.6, lo: 6, bow: 1.4, dimple: 1, cw: 0.8 }),
  grin:    mouthShape({ hw: 13, cL: -2.6, cR: -5.4, curve: 3, up: 4.2, lo: 5.8, bow: 1, dimple: 1 }),
  laugh:   mouthShape({ hw: 15, cL: -4, cR: -6.4, curve: 2.6, up: 3.4, lo: 4.6, open: 15, cw: 0.9, teeth: 1, tongue: 1, bow: 0.5, dimple: 0.6 }),
  oh:      mouthShape({ hw: 6.4, cL: 0, cR: 0, curve: 0, up: 3.8, lo: 4.2, open: 11, cw: 0.84, bow: 0.3 }),
  whistle: mouthShape({ hw: 5, cL: 0, cR: -0.4, curve: 0, up: 3.8, lo: 4, open: 3.8, cw: 0.78, bow: 0.3 }),
  pout:    mouthShape({ hw: 6.4, cL: 0.6, cR: 0.6, curve: 0.4, up: 3.8, lo: 4.6, bow: 1.4 }),
  wry:     mouthShape({ hw: 9.4, cL: -1.8, cR: 2.4, curve: -0.9, up: 3.2, lo: 4, bow: 0.8, dimple: 0.8 }),
  teeth:   mouthShape({ hw: 14, cL: -4, cR: -6.4, curve: 3, up: 3.2, lo: 4.2, open: 8, cw: 0.9, teeth: 1, tongue: 0, bow: 0.6, dimple: 0.7 }),
};
export const VISEME_NAMES = Object.keys(VISEMES);
export const MOUTH_LEN = NV;
// Catmull-Rom closed spline (with corner points at index 0 and 4) -> cubic path
function closedSpline(pts, corners, t = 0.5) {
  const n = pts.length; let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    const a = corners.includes(i) ? p1 : [p1[0] + (p2[0] - p0[0]) * t / 3, p1[1] + (p2[1] - p0[1]) * t / 3];
    const b = corners.includes((i + 1) % n) ? p2 : [p2[0] - (p3[0] - p1[0]) * t / 3, p2[1] - (p3[1] - p1[1]) * t / 3];
    d += `C${f(a[0])} ${f(a[1])} ${f(b[0])} ${f(b[1])} ${f(p2[0])} ${f(p2[1])}`;
  }
  return d + 'Z';
}
const pairs = (v, o, n) => Array.from({ length: n }, (_, i) => [v[o + i * 2], v[o + i * 2 + 1]]);
export function mouthPaths(v) {
  return {
    lips: closedSpline(pairs(v, 0, 8), [0, 4], 1),
    cav: closedSpline(pairs(v, O_CAV, 8), [0, 4], 1),
    teeth: [v[O_TEETH], v[O_TEETH + 1]],
    tongue: v.slice(O_TONGUE, O_TONGUE + 4),
    gloss: v.slice(O_GLOSS, O_GLOSS + 4),
    seam: `M${f(v[O_SEAM])} ${f(v[O_SEAM + 1])}Q${f(v[O_SEAM + 2])} ${f(v[O_SEAM + 3] * 1.9 - (v[O_SEAM + 1] + v[O_SEAM + 5]) / 2 * 0.9)} ${f(v[O_SEAM + 4])} ${f(v[O_SEAM + 5])}`,
    dimple: v.slice(O_DIMPLE, O_DIMPLE + 3),
    ops: v.slice(O_OPS, O_OPS + 4),
  };
}
export function mixVisemes(a, b, t, out) { for (let i = 0; i < NV; i++) out[i] = a[i] + (b[i] - a[i]) * t; return out; }

// ------------------------------------------------------------------ GLOVES (local: wrist at 0,0, fingers toward +y; cuff on top)
function finger(c, x, y, a, len, w, fill) {
  return `<g transform="${tf(x, y, a)}">${part(c, `M${f(-w)} 0L${f(-w)} ${f(len)}Q${f(-w)} ${f(len + w * 1.35)} 0 ${f(len + w * 1.35)}Q${f(w)} ${f(len + w * 1.35)} ${f(w)} ${f(len)}L${f(w)} 0Z`, fill, { sw: 4.6, mis: [1.6, 1.4] })}</g>`;
}
function thumb(c, x, y, a, len, fill) {
  return `<g transform="${tf(x, y, a)}">${part(c, `M-6.6 0L-6.6 ${f(len - 6)}Q-6.6 ${f(len + 3)} 0 ${f(len + 3)}Q6.6 ${f(len + 3)} 6.6 ${f(len - 6)}L6.6 0Z`, fill, { sw: 4.6, mis: [1.5, 1.3] })}</g>`;
}
export function gloveKinds(c, W) {
  const w = W.glove || PAL.white, cuffFill = W.cuff || w;
  const sh = (d) => ({ shade: d, ht: 'ht' });
  const cuff = part(c, 'M-16.5 -15Q0 -20 16.5 -15L17.5 4Q0 9 -17.5 4Z', cuffFill, { sw: 4.8, mis: [1.6, 1.4] }) + line('M-11 -7Q0 -3 11 -7', 2.6, INK, ' opacity=".5"');
  const palm = (d, shadeD) => part(c, d, w, sh(shadeD || rectD(3, 8, 30, 46)));
  return {
    fist: palm('M-20 3C-28 20 -25 38 -17 45Q-12 52 -5 46Q0 53 6 46Q12 52 18 44C26 34 25 14 19 3Z') + line('M-5 46L-4.4 28M6 46L5.4 28', 3) + thumb(c, -16, 30, 74, 21, w) + cuff,
    open: finger(c, 0, 17, 0, 24, 6.4, w) + finger(c, -14, 15, 34, 22, 6.2, w) + finger(c, 14, 15, -34, 22, 6.2, w)
      + palm('M-19 3C-26 20 -20 38 0 40C20 38 26 20 19 3Z') + thumb(c, -19, 22, 64, 22, w) + cuff,
    point: `<g transform="${tf(3, 13, 0)}">${part(c, 'M-6.2 0L-6.2 42Q-6.2 51 0 51Q6.2 51 6.2 42L6.2 0Z', w, { sw: 4.6, mis: [1.6, 1.4] })}</g>`
      + palm('M-19 3C-26 20 -21 36 -3 37C17 37 25 22 19 3Z') + line('M-6 31Q3 36 12 30M-8 22Q2 27 13 21', 3, INK) + thumb(c, -17, 13, 34, 19, w) + cuff,
    flat: palm('M-17 3C-22 28 -18 54 0 54C18 54 22 28 17 3Z') + line('M-6 54L-6 30M5.5 54L5.5 30', 3.2) + thumb(c, -16, 14, 40, 18, w) + cuff,
    pinch: palm('M-19 3C-26 20 -23 34 -14 40Q-8 46 -2 42Q4 47 10 42Q17 40 18 32C24 24 23 12 18 3Z') + line('M-3 42L-3 27', 3.2)
      + `<g transform="${tf(10, 40, -30)}">${part(c, ellD(0, 0, 8, 8.5), w, { sw: 4.4, mis: [1.2, 1.1] })}${circ(0, 0, 3, INK)}</g>` + thumb(c, -15, 29, 74, 18, w) + cuff,
  };
}
export const GLOVE_GRIP = { fist: [0, 27], open: [0, 26], point: [0, 24], flat: [0, 30], pinch: [4, 36] };

// ------------------------------------------------------------------ SHOES (local: leg entry at 0,0, toe toward +x, ground at y=+38)
export function shoeArt(c, W) {
  const base = (W.shoe && W.shoe.base) || PAL.white;
  const body = 'M-26 12C-32 32 -18 44 8 44L34 44C56 44 62 28 58 16C54 2 36 -6 18 -6C0 -8 -18 -4 -26 12Z';
  let s = part(c, body, base, { shade: 'M-34 28L68 12L68 54L-34 54Z' });
  s += line('M30 -1Q26 16 38 36', 3.2, INK, ' opacity=".45"');
  s += `<path d="M-27 38Q-4 47 36 44" fill="none" stroke="${INK}" stroke-width="7" stroke-linecap="round"/>`; // sole
  // puffy ankle cuff (the leg enters here)
  s += part(c, 'M-20 -2C-27 -14 -14 -23 0 -22C14 -21 24 -13 19 -2C14 6 10 2 5 6C0 2 -7 7 -12 4C-16 6 -19 4 -20 -2Z', base, { sw: 4.2, shade: 'M2 -26L30 -26L30 8L2 8Z' });
  s += line('M-12 -10Q-2 -5 11 -9', 2.4, INK, ' opacity=".4"');
  if (W.legs && W.legs.sock) s += part(c, 'M-10 -40L10 -40L10 -20L-10 -20Z', W.legs.sock, { sw: 3.6, mis: [1.2, 1] });
  if (W.shoe && W.shoe.toe) s += `<path d="M36 -3Q28 14 38 40Q56 42 62 26Q64 8 48 -2Z" fill="${W.shoe.toe}" opacity=".95"/>` + line('M36 -3Q28 14 38 40', 3.2);
  return s;
}

// ------------------------------------------------------------------ HEAD
// Head-art coordinates (measured on the model sheet): face centre line x=0, chin y=-14, face half-width ~43, she faces RIGHT.
// The cranium (hair) is wide to the LEFT of the face; the garrison cap sits on the back-left of the head.
export const FACE_D = 'M7 -14C24 -14 38 -26 42 -44C46 -62 45 -84 38 -98C30 -110 14 -115 0 -114C-18 -114 -36 -104 -43 -86C-48 -70 -46 -50 -38 -34C-30 -20 -12 -14 7 -14Z';
export const HEAD_PIVOT = [-9, -6];       // art point that sits on the neck pivot (head tilts about the neck)
export const HEAD_REST_TURN = 1.0;
// feature layout as a function of the face turn t (0 = frontal, 1 = three-quarter toward the grid)
export function faceLayout(t) {
  return {
    near: [-24 + 11 * t, -54 + 1 * t], far: [24 + 4 * t, -56 + 1 * t], kxNear: 0.95 + 0.05 * t, kxFar: 0.95 - 0.33 * t, ky: 1,
    nose: [17 * t, -39], mouth: [8 * t, -27], browNear: [-24 + 11 * t - 1.5, -79 + 1 * t], browFar: [24 + 4 * t - 2, -82],
  };
}

function hairParts(c, W) {
  const col = PAL.hair;
  const mass = part(c, 'M20 -122C16 -140 -2 -148 -30 -146C-60 -142 -88 -122 -93 -90C-97 -76 -94 -64 -88 -56C-82 -48 -96 -38 -92 -28C-88 -14 -70 -4 -50 0L-30 4L-24 -20L0 -20L26 -40C30 -70 26 -100 20 -122Z', col, { shade: 'M-98 -170L-34 -170L-34 10L-98 10Z', ht: 'ht' })
    + line('M-82 -104C-90 -84 -82 -68 -76 -54C-72 -44 -78 -34 -72 -24', 3.6, PAL.hairHi, ' opacity=".85"') + line('M-66 -132C-80 -122 -87 -108 -88 -96', 3.2, PAL.hairHi, ' opacity=".7"')
    + `<g id="${c.pre}hair-tuft" opacity="0">` + part(c, 'M-62 -128L-60 -158L-48 -142L-42 -166L-30 -148L-20 -164L-14 -146L-2 -156L2 -134L-2 -120L-58 -120Z', col, { sw: OL * 0.95 }) + line('M-52 -146L-48 -132M-26 -150L-24 -134', 2.8, PAL.hairHi) + `</g>`;
  const curlL = part(c, 'M-80 -48C-94 -44 -101 -26 -93 -15C-86 -6 -72 -11 -72 -22C-72 -30 -80 -31 -83 -25C-81 -33 -77 -41 -72 -50Z', col, { shade: 'M-100 -30L-80 -30L-80 -5L-100 -5Z' }) + line('M-91 -33C-88 -22 -80 -20 -78 -26', 2.8, PAL.hairHi);
  const curlR = part(c, 'M28 -34C42 -42 57 -34 56 -22C55 -11 40 -10 36 -19C43 -21 45 -27 39 -28L28 -22Z', col, { sw: OL * 0.9 }) + line('M46 -34C52 -30 53 -25 50 -21', 2.6, PAL.hairHi);
  return { mass, curlL, curlR };
}
function bangsArt(c) {
  const col = PAL.hair;
  // hair that sweeps over the forehead and ends in a round curl above the far eye (drawn OVER the cap's lower edge)
  return part(c, 'M-50 -82C-48 -104 -28 -110 -8 -105C8 -101 18 -108 22 -124C29 -135 46 -134 51 -121C55 -108 47 -97 36 -94C22 -90 10 -94 0 -96C-14 -98 -30 -93 -40 -80Z', col, { shade: 'M-60 -140L-4 -140L-4 -90L-60 -90Z' })
    + line('M30 -124C38 -128 46 -126 48 -118', 2.8, PAL.hairHi, ' opacity=".9"');
}

// eyes
function eyeMarkup(c, side, W) {
  const s = side, id = side < 0 ? 'eye-l' : 'eye-r', P = c.pre + id;
  const al = almondPath(s), lid = W.lidFill || PAL.eyeshadow;
  const g0 = eyeGeom(s, { u: 0.55 });
  c.defs.push(`<clipPath id="${P}-clip"><path d="${al}"/></clipPath>`);
  let inner = `<path id="${P}-sclera" d="${al}" fill="${PAL.white}"/>`;
  inner += `<g clip-path="url(#${P}-clip)">`
    + `<g id="${P}-iris"><ellipse id="${P}-iris-disc" cx="0" cy="2" rx="9.4" ry="14.6" fill="#123B40"/><ellipse cx="0" cy="11.4" rx="5.4" ry="3.2" fill="${PAL.turq}" opacity=".95"/><ellipse id="${P}-pupil" cx="0" cy="2" rx="7.4" ry="12.6" fill="${INK}"/>`
      + `<path id="${P}-glint" d="M2.4 -8L7 -5.4L5.2 -2L7.4 1L3.6 2.4L4.8 6.4L1.4 3.6Z" fill="${PAL.white}"/>` + circ(-2.4, 8.6, 1.5, PAL.white) + `</g>`
    + `<g id="${P}-stars" opacity="0">` + circ(0, 1, 17.5, INK) + star(0, 1, 14, PAL.white, 2, 0, 5) + `</g>`
    + `<path id="${P}-lower" d="${g0.lowerFill}" fill="${PAL.skin}"/>`
    + `<path id="${P}-lidfill" d="${g0.upperFill}" fill="${lid}"/>`
    + `</g>`;
  inner += `<path d="M${s * 17} 1C${s * 19} 26 ${s * -19} 26 ${s * -17} 1" fill="none" stroke="${INK}" stroke-width="3.4" stroke-linecap="round"/>`;
  inner += `<path id="${P}-upper" d="M${s * -17} 1C${s * -19} -28 ${s * 19} -28 ${s * 17} 1" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>`;
  inner += `<path id="${P}-lashline" d="${g0.lidLine}" fill="none" stroke="${INK}" stroke-width="5.4" stroke-linecap="round" stroke-linejoin="round"/>`;
  inner += `<path id="${P}-lashes" d="${g0.lashes}" fill="none" stroke="${INK}" stroke-width="3.3" stroke-linecap="round"/>`;
  return G(P, `<g id="${P}-s">` + inner + `</g>`);
}

export function buildHead(c, W) {
  const hb = hairParts(c, W);
  const hairTop = W.hairTop ? W.hairTop(c) : '';
  const maskUnder = W.maskUnder ? W.maskUnder(c) : '';
  const face = part(c, FACE_D, PAL.skin, {});
  const cheeks = `<ellipse cx="-27" cy="-27" rx="7" ry="4.4" fill="${PAL.blush}" opacity=".4"/><ellipse cx="33" cy="-29" rx="5.4" ry="4" fill="${PAL.blush}" opacity=".36"/>`;
  const nose = line('M0 -4Q4.4 1 -0.4 4.6', 2.6) + `<path d="M-2.4 5.4q2.4 1.4 4.8 0" fill="none" stroke="${INK}" stroke-width="1.8" stroke-linecap="round" opacity=".5"/>`;
  const mouth = G(c.pre + 'mouth',
    `<g id="${c.pre}mouth-s">` +
    `<path id="${c.pre}m-lips" d="" fill="${PAL.lips}" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round"/>` +
    `<clipPath id="${c.pre}m-clip"><path id="${c.pre}m-clipd" d=""/></clipPath>` +
    `<path id="${c.pre}m-cav" d="" fill="${PAL.mouth}" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round"/>` +
    `<g clip-path="url(#${c.pre}m-clip)"><rect id="${c.pre}m-teeth" x="-30" y="-6" width="60" height="5" fill="${PAL.white}"/><ellipse id="${c.pre}m-tongue" cx="0" cy="6" rx="8" ry="3" fill="${PAL.orange}"/></g>` +
    `<path id="${c.pre}m-seam" d="" fill="none" stroke="${INK}" stroke-width="2.4" stroke-linecap="round"/>` +
    `<ellipse id="${c.pre}m-gloss" cx="0" cy="0" rx="3" ry="1" fill="${PAL.white}" opacity=".9"/>` +
    `<path id="${c.pre}m-dimple" d="M0 0q2.4 -1.2 3 -4.4" fill="none" stroke="${INK}" stroke-width="2.4" stroke-linecap="round"/>` +
    `</g>`);
  const features = G(c.pre + 'features',
    G(c.pre + 'cheeks', cheeks) + G(c.pre + 'nose', `<g id="${c.pre}nose-s">${nose}</g>`) + eyeMarkup(c, -1, W) + eyeMarkup(c, 1, W)
    + `<path id="${c.pre}brow-l" d="" fill="${INK}" stroke="${INK}" stroke-width="1.2" stroke-linejoin="round"/><path id="${c.pre}brow-r" d="" fill="${INK}" stroke="${INK}" stroke-width="1.2" stroke-linejoin="round"/>` + mouth);
  return {
    hairMass: G(c.pre + 'hair-mass', hb.mass + hairTop), maskUnder, curlL: G(c.pre + 'hair-curl-l', hb.curlL), curlR: G(c.pre + 'hair-curl-r', hb.curlR),
    face: G(c.pre + 'face', face), features, bangs: G(c.pre + 'hair-front', bangsArt(c)),
  };
}

export function defsCommon(pre) {
  return `<pattern id="${pre}ht" width="6.4" height="6.4" patternUnits="userSpaceOnUse" patternTransform="rotate(32)"><circle cx="3.2" cy="3.2" r="1.5" fill="${INK}" opacity=".28"/></pattern>`
    + `<pattern id="${pre}htl" width="6.4" height="6.4" patternUnits="userSpaceOnUse" patternTransform="rotate(32)"><circle cx="3.2" cy="3.2" r="1.45" fill="${PAL.white}" opacity=".32"/></pattern>`;
}
