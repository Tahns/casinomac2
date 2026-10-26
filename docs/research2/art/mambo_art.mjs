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
  hair: '#51251A', hairShade: '#2E140D', hairHi: '#9A5530',
  navyLight: '#2D4A78', navyDeep: '#162338', gold: '#F2C14E', goldDeep: '#C98A1E', leather: '#7A4A2A', leatherLight: '#9A6236',
  steel: '#B9C7CC', lips: '#C4271E', lipsDeep: '#8E1712', mouth: '#5E1410', glass: '#CFEDEA', camel: '#B98A55', burgundy: '#6E2440',
};
export const INK = PAL.ink;
export const OL = 5.2;                 // uniform outline weight (viewBox units)
export const MIS = [2.8, 2.4];         // print misregistration (fill layer shifted against the outline)
export const MIS_T = [1.4, 1.2];
export const GROUND = 566;

// rest skeleton (upper-body coordinates at rest)
export const REST = {
  neck: [200, 250], shoulderL: [160, 270], shoulderR: [240, 270], waist: [200, 336], hip: [200, 366],
  hipJointL: [187, 436], hipJointR: [213, 436], ankleL: [166, 528], ankleR: [236, 528], ground: [200, GROUND], skirtHem: 470,
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
    const a = (Math.PI * 2 * i) / n - Math.PI / 2 + rad(rot), rr = i % 2 ? r * (pts === 4 ? 0.28 : 0.46) : r;
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
export const EYE = { w: 39 };
export function eyeGeom(s, p) {
  const X = (x) => s * x;
  const u = clamp(p.u ?? 0.55, 0, 1), joy = clamp(p.joy ?? 0, 0, 1), low = clamp(p.low ?? 0, 0, 1);
  const Pi = [X(-19), 4], Po = [X(20), -1];
  const UP = [[X(-17), -22], [X(12), -23]];            // upper almond outline controls (also the fully-open lid line)
  const LO = [[X(15), 18], [X(-12), 20]];              // lower almond outline Po -> Pi
  const BOT = [LO[1], LO[0]];                           // same curve, Pi -> Po
  const CL = [[X(-12), 9], [X(14), 7]], CJ = [[X(-14), -17], [X(12), -19]];
  const K = [lp(CL[0], CJ[0], joy), lp(CL[1], CJ[1], joy)];
  const lid = [lp(K[0], UP[0], u), lp(K[1], UP[1], u)];
  const w = Math.max(clamp(1 - u / 0.35, 0, 1), low * 0.55, joy);
  const lowB = [lp(BOT[0], K[0], w), lp(BOT[1], K[1], w)];
  const P = (p2) => `${f(p2[0])} ${f(p2[1])}`;
  const lidCurve = [Pi, lid[0], lid[1], Po];
  const flickK = clamp((u - 0.15) / 0.5, 0, 1) * (1 - joy * 0.3) + joy * 0.6;
  const flick = [Po[0] + X(8.5) * flickK, Po[1] - 6 * flickK - (1 - flickK) * -2];
  const lidLine = `M${P(Pi)}C${P(lid[0])} ${P(lid[1])} ${P(Po)}L${P(flick)}`;
  const upperFill = `M${P(Pi)}C${P(UP[0])} ${P(UP[1])} ${P(Po)}C${P(lid[1])} ${P(lid[0])} ${P(Pi)}Z`;
  const lowerFill = `M${P(Pi)}C${P(lowB[0])} ${P(lowB[1])} ${P(Po)}C${P(LO[0])} ${P(LO[1])} ${P(Pi)}Z`;
  // lashes: four, fanned off the outer lid; direction blends from down-out (closed) to up-out (open / joy)
  const up = [-78, -58, -40, -20], dn = [64, 46, 30, 14], ts = [0.5, 0.68, 0.84, 0.98], len = [11.5, 14, 14.5, 11.5];
  const mix = clamp(Math.max(Math.pow(u, 0.8), joy), 0, 1);
  let lashes = '';
  for (let i = 0; i < 4; i++) {
    const t = ts[i], a = rad(lerp(dn[i], up[i], mix)), q = cubicAt(lidCurve, t);
    const ex = q[0] + X(Math.cos(a)) * len[i], ey = q[1] + Math.sin(a) * len[i];
    const mx = (q[0] + ex) / 2 + X(0) , my = (q[1] + ey) / 2 + (mix > 0.5 ? -2.2 : 2.2);
    lashes += `M${P(q)}Q${f(mx)} ${f(my)} ${f(ex)} ${f(ey)}`;
  }
  return { lidLine, upperFill, lowerFill, lashes, closed: w, flick };
}
export const almondPath = (s) => { const X = (x) => s * x; return `M${X(-19)} 4C${X(-17)} -22 ${X(12)} -23 ${X(20)} -1C${X(15)} 18 ${X(-12)} 20 ${X(-19)} 4Z`; };

// ------------------------------------------------------------------ BROWS
export function browPath(s, dy, rot, arch, thick = 1) {
  const X = (x) => s * x, pts = [], n = 9;
  const top = [], bot = [];
  const cr = Math.cos(rad(rot * s)), sr = Math.sin(rad(rot * s));
  for (let i = 0; i < n; i++) {
    const u = i / (n - 1);
    const x = X(lerp(-19, 22, u)), y = -arch * Math.sin(Math.PI * Math.pow(u, 0.9)) + 3.5 * u * u - 1.5;
    const du = 1e-3, x2 = X(lerp(-19, 22, u + du)), y2 = -arch * Math.sin(Math.PI * Math.pow(u + du, 0.9)) + 3.5 * (u + du) * (u + du) - 1.5;
    let tx = x2 - x, ty = y2 - y; const L = Math.hypot(tx, ty) || 1; tx /= L; ty /= L;
    const t = (3.9 * Math.pow(1 - u, 0.8) + 0.9) * thick * 0.5;
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
  smirk:   mouthShape({ hw: 15, cL: 1.5, cR: -7, curve: 2.2, up: 3.0, lo: 4.0, bow: 1.4, dimple: 1 }),
  grin:    mouthShape({ hw: 19, cL: -4, cR: -8, curve: 4.5, up: 2.8, lo: 4.0, bow: 1.0, dimple: 1 }),
  laugh:   mouthShape({ hw: 21, cL: -6, cR: -9, curve: 3, up: 3.0, lo: 4.2, open: 19, cw: 0.9, teeth: 1, tongue: 1, bow: 0.6, dimple: 0.6 }),
  oh:      mouthShape({ hw: 9.5, cL: 0, cR: 0, curve: 0, up: 4.2, lo: 4.6, open: 15, cw: 0.88, bow: 0.4 }),
  whistle: mouthShape({ hw: 7, cL: 0, cR: -0.5, curve: 0, up: 4.6, lo: 4.8, open: 4.6, cw: 0.8, bow: 0.3 }),
  pout:    mouthShape({ hw: 9, cL: 1, cR: 1, curve: 0.6, up: 4.6, lo: 5.4, bow: 1.8 }),
  wry:     mouthShape({ hw: 14, cL: -2.5, cR: 3.5, curve: -1.2, up: 2.8, lo: 3.4, bow: 0.8, dimple: 0.8 }),
  teeth:   mouthShape({ hw: 20, cL: -6, cR: -9, curve: 4, up: 2.6, lo: 3.6, open: 9.5, cw: 0.9, teeth: 1, tongue: 0, bow: 0.8, dimple: 0.7 }),
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
    fist: palm('M-19 3C-26 20 -23 36 -16 42Q-11 49 -5 43Q0 50 6 43Q12 49 17 41C24 32 23 14 18 3Z') + line('M-5 43L-4.4 27M6 43L5.4 27', 3.2) + thumb(c, -15, 29, 76, 20, w) + cuff,
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

// ------------------------------------------------------------------ SHOES (local: ankle at 0,0, toe toward +x, ground at y=+38)
export function shoeArt(c, W) {
  const base = (W.shoe && W.shoe.base) || PAL.white;
  const d = 'M-26 -2C-32 14 -32 32 -18 37L40 37C66 37 72 24 68 13C64 0 46 -6 28 -6C10 -12 -10 -10 -26 -2Z';
  let s = part(c, d, base, { shade: 'M-34 22L74 8L74 48L-34 48Z' });
  s += line('M30 -2Q24 14 36 32', 3.6, INK, ' opacity=".55"');                                   // toe crease
  s += `<path d="M-28 32Q-6 41 40 38" fill="none" stroke="${INK}" stroke-width="7.5" stroke-linecap="round"/>`; // sole
  // puffy ankle cuff (leg enters here)
  s += part(c, 'M-24 -2C-30 -14 -20 -24 -4 -24C14 -24 26 -16 22 -4C12 2 -12 2 -24 -2Z', base, { sw: 4.6, shade: 'M-4 -26L30 -26L30 6L-4 6Z' });
  s += line('M-16 -10Q-4 -4 10 -9', 2.6, INK, ' opacity=".5"');
  if (W.shoe && W.shoe.toe) s += `<path d="M40 -4Q32 14 40 36Q60 36 69 22Q72 8 52 -3Z" fill="${W.shoe.toe}" opacity=".95"/>` + line('M40 -4Q32 14 40 36', 3.4);
  return s;
}

// ------------------------------------------------------------------ HEAD (hair, face, features). head-local coords.
export const FACE_D = 'M3 -14C20 -14 40 -26 46 -52C52 -78 52 -104 41 -121C31 -135 15 -141 0 -141C-15 -141 -31 -135 -41 -121C-52 -104 -52 -78 -46 -52C-40 -26 -17 -14 3 -14Z';
export const HEAD_REST_TURN = 0.55;      // rest face turn (toward the grid on her right)

function hairBack(c, W) {
  const col = PAL.hair, sh = PAL.hairShade;
  const mass = part(c, 'M48 -100C56 -138 28 -163 -8 -163C-48 -163 -82 -138 -84 -98C-87 -74 -84 -58 -76 -46C-80 -34 -66 -26 -52 -34C-46 -40 -42 -46 -38 -54L40 -54C42 -46 50 -44 56 -48C66 -52 68 -64 60 -70C56 -80 54 -90 48 -100Z', col, { shade: 'M-30 -170L100 -170L100 -20L-30 -20Z', ht: 'ht' });
  const hl = line('M-60 -118C-66 -98 -62 -78 -54 -66', 4, PAL.hairHi, ' opacity=".9"') + line('M-30 -150C-44 -146 -56 -136 -62 -124', 3.6, PAL.hairHi, ' opacity=".8"');
  return { mass: mass + hl,
    curlL: part(c, 'M-62 -60C-84 -56 -92 -32 -78 -18C-68 -10 -52 -16 -52 -30C-52 -40 -62 -42 -66 -36C-62 -44 -58 -52 -56 -60Z', col, { shade: 'M-60 -30L-40 -30L-40 0L-60 0Z' }) + line('M-76 -34C-72 -26 -64 -26 -62 -32', 3.2, PAL.hairHi),
    curlR: part(c, 'M52 -60C66 -66 76 -54 70 -40C66 -30 54 -30 50 -38C56 -38 58 -44 54 -48Z', col, { sw: OL * 0.9 }) };
}
function bangsArt(c) {
  const col = PAL.hair;
  // side-swept fringe: from under the cap across the forehead, ending in a curl at the right temple
  return part(c, 'M-44 -118C-30 -146 14 -150 44 -128C52 -121 54 -108 50 -98C50 -108 44 -116 34 -114C24 -112 18 -104 8 -108C-6 -112 -22 -106 -34 -100C-40 -104 -44 -112 -44 -118Z', col, { shade: 'M-60 -156L-6 -156L-6 -100L-60 -100Z' })
    + line('M-18 -132C-4 -139 14 -137 30 -128', 3.6, PAL.hairHi, ' opacity=".9"')
    + part(c, 'M38 -118C52 -114 56 -96 50 -86C46 -82 40 -86 42 -92C44 -98 40 -104 36 -106Z', col, { sw: OL * 0.9 });
}

// face features builder. Dynamic bits carry ids; the runtime fills their attributes.
function eyeMarkup(c, side, W) {
  const s = side, id = side < 0 ? 'eye-l' : 'eye-r', P = c.pre + id;
  const al = almondPath(s), lid = W.lidFill || PAL.eyeshadow;
  const g0 = eyeGeom(s, { u: 0.55 });
  let inner = '';
  c.defs.push(`<clipPath id="${P}-clip"><path d="${al}"/></clipPath>`);
  inner += `<path d="${al}" fill="${PAL.white}"/>`;
  inner += `<g clip-path="url(#${P}-clip)">`
    + `<g id="${P}-iris">` + circ(0, 2, 11.5, '#1F3B3E') + `<path d="M-9 8Q0 15 9 8Q5 13 0 13.6Q-5 13 -9 8Z" fill="${PAL.turq}" opacity=".9"/>` + circ(0, 2, 6.4, INK)
      + `<ellipse cx="-4" cy="-2.6" rx="3.8" ry="3.2" fill="${PAL.white}" transform="rotate(-20 -4 -2.6)"/>` + circ(3.8, 6, 1.6, PAL.white) + `</g>`
    + `<g id="${P}-stars" opacity="0">` + circ(0, 1, 15.5, INK) + star(0, 1, 12, PAL.white, 2, 0, 5) + `</g>`
    + `<path id="${P}-lower" d="${g0.lowerFill}" fill="${PAL.skin}"/>`
    + `<path id="${P}-lidfill" d="${g0.upperFill}" fill="${lid}"/>`
    + `</g>`;
  inner += `<path d="${al}" fill="none" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round" opacity=".55"/>`;
  inner += `<path id="${P}-lashline" d="${g0.lidLine}" fill="none" stroke="${INK}" stroke-width="5.4" stroke-linecap="round" stroke-linejoin="round"/>`;
  inner += `<path id="${P}-lashes" d="${g0.lashes}" fill="none" stroke="${INK}" stroke-width="3.1" stroke-linecap="round"/>`;
  // soft eyeshadow above the almond + two tiny lower lashes
  const sh = `<path d="M${s * -18} -8C${s * -14} -30 ${s * 12} -31 ${s * 22} -6C${s * 14} -20 ${s * -8} -22 ${s * -18} -8Z" fill="${lid}" opacity="${W.lidShadowOp ?? 0.55}"/>`;
  const lowL = line(`M${s * 12} 15.5l${s * 4} 4.5M${s * 17} 11l${s * 5} 3`, 2.4);
  return G(P, `<g id="${P}-s">` + sh + inner + lowL + `</g>`);
}

export function buildHead(c, W) {
  const hb = hairBack(c, W);
  const face = part(c, FACE_D, PAL.skin, { shade: 'M14 -150L70 -150L70 -8L-6 -8L12 -40Z' });
  // chin / jaw soft shade + cheeks
  const cheeks = `<ellipse cx="-34" cy="-52" rx="10" ry="6.5" fill="${PAL.blush}" opacity=".4"/><ellipse cx="34" cy="-52" rx="9" ry="6" fill="${PAL.blush}" opacity=".4"/>`;
  const nose = line('M2 -66Q10 -58 3 -52', 3.6) + `<path d="M-1 -53.5q3.5 2 7 0" fill="none" stroke="${INK}" stroke-width="2.2" stroke-linecap="round" opacity=".6"/>`;
  const mouth = G(c.pre + 'mouth',
    `<g id="${c.pre}mouth-s">` +
    `<path id="${c.pre}m-lips" d="" fill="${PAL.lips}" stroke="${INK}" stroke-width="4.2" stroke-linejoin="round"/>` +
    `<clipPath id="${c.pre}m-clip"><path id="${c.pre}m-clipd" d=""/></clipPath>` +
    `<path id="${c.pre}m-cav" d="" fill="${PAL.mouth}" stroke="${INK}" stroke-width="2.8" stroke-linejoin="round"/>` +
    `<g clip-path="url(#${c.pre}m-clip)"><rect id="${c.pre}m-teeth" x="-30" y="-6" width="60" height="5" fill="${PAL.white}"/><ellipse id="${c.pre}m-tongue" cx="0" cy="6" rx="8" ry="3" fill="${PAL.orange}"/></g>` +
    `<path id="${c.pre}m-seam" d="" fill="none" stroke="${INK}" stroke-width="2.6" stroke-linecap="round"/>` +
    `<ellipse id="${c.pre}m-gloss" cx="0" cy="0" rx="3" ry="1" fill="${PAL.white}" opacity=".85"/>` +
    `<path id="${c.pre}m-dimple" d="M0 0q2.6 -1.4 3.4 -5" fill="none" stroke="${INK}" stroke-width="2.8" stroke-linecap="round"/>` +
    `</g>`);
  const features = G(c.pre + 'features',
    G(c.pre + 'cheeks', cheeks) + G(c.pre + 'nose', nose) + eyeMarkup(c, -1, W) + eyeMarkup(c, 1, W)
    + `<path id="${c.pre}brow-l" d="" fill="${INK}" stroke="${INK}" stroke-width="1.4" stroke-linejoin="round"/><path id="${c.pre}brow-r" d="" fill="${INK}" stroke="${INK}" stroke-width="1.4" stroke-linejoin="round"/>` + mouth);
  return {
    hairMass: G(c.pre + 'hair-mass', hb.mass), curlL: G(c.pre + 'hair-curl-l', hb.curlL), curlR: G(c.pre + 'hair-curl-r', hb.curlR),
    face: G(c.pre + 'face', face), features, bangs: G(c.pre + 'hair-front', bangsArt(c)),
  };
}

export function defsCommon(pre) {
  return `<pattern id="${pre}ht" width="6.4" height="6.4" patternUnits="userSpaceOnUse" patternTransform="rotate(32)"><circle cx="3.2" cy="3.2" r="1.55" fill="${INK}" opacity=".30"/></pattern>`
    + `<pattern id="${pre}htl" width="6.4" height="6.4" patternUnits="userSpaceOnUse" patternTransform="rotate(32)"><circle cx="3.2" cy="3.2" r="1.45" fill="${PAL.white}" opacity=".32"/></pattern>`;
}

