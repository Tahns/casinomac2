// mambo_rig.mjs - runtime animation rig for "Mambo" (browser ES module, no dependencies).
//
//   import { createHeroine } from './mambo_rig.mjs';
//   const h = createHeroine(document.getElementById('hero'), { outfit: 'inspectrice' });
//   h.setLook('grid'); h.setMood('sly'); h.play('winBig'); h.setOutfit('casino'); h.destroy();
//
// What it is: a part-based skeletal rig (SVG groups with pivots, noodle limbs rebuilt every frame from Bezier curves,
// 8-viseme morphing mouth, eyes with sclera / iris / pupil / highlight / upper lid / lower lid / lashes), a fixed-timestep
// damped-spring solver, a timeline player with named tracks (pose, look, mouth, set, impulse, fx, cue...), interruptible
// procedural clips, a seeded micro-behaviour director (blink, saccades, weight shift, idle gags) and a tiny particle layer.
// Only attributes (transform, d, opacity, display) are written, batched once per frame; no layout reads in the frame loop.
// Reduced motion (prefers-reduced-motion or {reduced:true}): no springs, no breathing, no saccades, poses swap instantly.
// L / R = SCREEN left / right. She faces RIGHT (toward the grid, which sits on her right).

import {
  PAL, INK, OL, REST, GROUND, TORSO_LIFT, f, clamp, lerp, rotp, cubicD, cubicSub, cubicTan, limb, tf, ellD, line, circ, part, G, star,
  makeCtx, defsCommon, buildHead, faceLayout, HEAD_PIVOT, HEAD_SCALE, gloveKinds, GLOVE_GRIP, shoeArt, tubeEls, limbEls, tubeD, spl, OLL, eyeGeom, browPath,
  VISEMES, VISEME_NAMES, MOUTH_LEN, mouthPaths, mixVisemes,
} from './mambo_art.mjs';
import { OUTFIT_DEFS, OUTFIT_KEYS } from './mambo_outfits.mjs';

const HAND_K = 0.92;   // pass 2: slightly smaller gloves (less chunky)
// ====================================================================== easing library
export const Ease = {
  linear: (t) => t, in: (t) => t * t, out: (t) => 1 - (1 - t) * (1 - t), inOut: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  outBack: (t) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
  snap: (t) => (t < 0.5 ? 0 : 1), steps: (n) => (t) => Math.floor(clamp(t, 0, 0.9999) * n) / (n - 1 || 1),
  parabola: (t) => 4 * t * (1 - t), pulse: (t) => Math.sin(Math.PI * clamp(t, 0, 1)),
};

// ====================================================================== crops (viewBox windows in art coordinates)
// full = the whole figure (overflow visible so jumps and props may leave the box), bust = waist-up for portrait mobile (bust, cap, eyes: readable from about
// 120 px wide; the lower body is not even updated), head = face + cap only (avatars, 64 px and up). Windows are mirrored automatically with `mirror`.
export const CROPS = {
  full: { vb: [0, 0, 400, 600], overflow: 'visible', lower: true },
  bust: { vb: [86, 24, 226, 322], overflow: 'hidden', lower: false },
  head: { vb: [96, 60, 160, 176], overflow: 'hidden', lower: false },
};

// ====================================================================== parameters
// Every number below is a spring-driven channel. `G` = spring group (stiffness k, damping c), `P` = primary (limited-animation sampling).
const GROUPS = {
  body: [150, 15], leg: [210, 18], head: [120, 13], lid: [1500, 78], brow: [520, 40], look: [1700, 90], arm: [270, 20], cap: [230, 11], fx: [600, 45], root: [190, 16],
};
const DEF = {
  // name: [rest value, group, primary?]
  rx: [0, 'root', 1], rrot: [0, 'root', 1], sq: [0, 'root', 1], spin: [0, 'root', 0],
  hipX: [0, 'body', 1], hipTilt: [0, 'body', 1],
  lax: [0, 'leg', 1], lay: [0, 'leg', 1], lb1: [6, 'leg', 1], lb2: [-5, 'leg', 1], lsr: [-6, 'leg', 1], lsf: [-1, 'leg', 1],
  rax: [0, 'leg', 1], ray: [0, 'leg', 1], rb1: [-6, 'leg', 1], rb2: [5, 'leg', 1], rsr: [6, 'leg', 1], rsf: [1, 'leg', 1],
  ux: [0, 'body', 1], uy: [0, 'body', 1], lean: [0, 'body', 1], shr: [0, 'body', 1], sho: [0, 'body', 1],   // sho = shoulder-line tilt (torso + arm roots), the S-curve control
  hx: [0, 'head', 1], hy: [0, 'head', 1], htilt: [0, 'head', 1], turn: [1.0, 'head', 1],
  uL: [0.45, 'lid', 0], uR: [0.85, 'lid', 0], slL: [6, 'lid', 0], slR: [2, 'lid', 0], joyL: [0, 'lid', 0], joyR: [0, 'lid', 0], lowL: [0.1, 'lid', 0], lowR: [0.1, 'lid', 0],
  stars: [0, 'fx', 0], wide: [0, 'lid', 0], pup: [1, 'lid', 0], lookx: [-0.75, 'look', 0], looky: [0.05, 'look', 0],
  bLy: [0, 'brow', 0], bLr: [-4, 'brow', 0], bLa: [11, 'brow', 0], bRy: [-3, 'brow', 0], bRr: [-6, 'brow', 0], bRa: [11, 'brow', 0],
  cy: [0, 'cap', 1], cr: [0, 'cap', 1],
  alx: [148, 'arm', 1], aly: [350, 'arm', 1], alb1: [14, 'arm', 1], alb2: [6, 'arm', 1], alr: [0, 'arm', 1], alsx: [1, 'arm', 1], alsy: [1, 'arm', 1],
  arx: [252, 'arm', 1], ary: [350, 'arm', 1], arb1: [-14, 'arm', 1], arb2: [-6, 'arm', 1], arr: [0, 'arm', 1], arsx: [1, 'arm', 1], arsy: [1, 'arm', 1],
  beam: [0, 'fx', 0], acc: [65, 'arm', 1], blush: [0.4, 'fx', 0],
};
const NAMES = Object.keys(DEF), NP = NAMES.length, IX = {}; NAMES.forEach((n, i) => { IX[n] = i; });
const REST_VALUES = NAMES.map((n) => DEF[n][0]);

// discrete channels (swapped, not sprung)
const DISCRETE_DEF = { gl: 'relax', gr: 'relax', prop: 'L', prop2: '', layL: 'front', layR: 'front', mouth: 'smirk' };

// ---------------------------------------------------------------------- poses (only the channels that differ from rest)
export const POSES = {
  rest: {},
  idle: { hipX: 2, hipTilt: 2, lean: 2, sho: 2, ux: -1.5, hx: 2, htilt: -4, lax: -4, lay: 0, lsr: -10, lb1: 12, lb2: -8, rax: -2, rsr: 4, rb1: -4, rb2: 4,
    arx: 249, ary: 302, arb1: -38, arb2: -22, arr: -8, gr: 'hip', alx: 134, aly: 334, alb1: 16, alb2: -8, gl: 'fist', prop: 'L', acc: 65 },
  point: { hipX: -2, hipTilt: 6, lean: 6, sho: -5, ux: -4, hx: 4, hy: 6, htilt: 4, turn: 1.1, lookx: 1, looky: 0, uL: 0.62, uR: 0.9,
    lax: -22, lsr: -6, rax: 30, rsr: 10, lb1: 10, rb1: -8,
    alx: 154, aly: 313, alb1: 58, alb2: 26, alr: 0, gl: 'hip',
    arx: 348, ary: 240, arb1: -6, arb2: 6, arr: 0, gr: 'fist', prop: 'R', acc: 270, beam: 1, mouth: 'smirk' },
  smallwin: { hipX: -2, hipTilt: 3, lean: 2, sho: 2, htilt: 6, turn: 0.9, lookx: 0.2, looky: 0,
    lax: -30, lay: -82, lsr: -48, lb1: 40, lb2: -30, rax: 4, rsr: 4, rb1: -4, rb2: 4,
    uL: 0, lowL: 0.7, uR: 0.8, bLy: 8, bLr: 6, bRy: -5, mouth: 'grin',
    arx: 280, ary: 262, arb1: 62, arb2: 30, arr: 0, gr: 'fist', alx: 138, aly: 334, alb1: 12, alb2: 6, gl: 'fist', prop: 'L', acc: 62 },
  bigwin: { lean: 4, sho: -2, htilt: 8, turn: 0.9, uL: 1, uR: 1, stars: 1, wide: 0.12, mouth: 'laugh', cy: -34, cr: 14,
    lax: -30, lay: -94, lsr: -40, lb1: 44, lb2: -34, rax: 12, ray: -52, rsr: 30, rb1: -34, rb2: 24, hipTilt: 4, hipX: -2, shr: 2,
    alx: 108, aly: 132, alb1: -34, alb2: 8, alr: 0, gl: 'fist', prop: 'L', acc: 180, beam: 1,
    arx: 298, ary: 134, arb1: 34, arb2: -8, arr: 0, gr: 'fist', bLy: -6, bRy: -12, bLa: 13, bRa: 13, bLr: -8, bRr: -10, lookx: 0, looky: 0 },
  shock: { lean: -3, uy: -3, shr: 8, hy: -4, htilt: 3, turn: 0.6, uL: 1.1, uR: 1.1, wide: 0.5, pup: 0.4, lookx: 0, looky: 0, cy: -58, cr: 10, lax: 10, rax: -10, lsr: -2, rsr: 2,
    alx: 140, aly: 226, alb1: -40, alb2: -12, alr: 0, gl: 'flat', arx: 256, ary: 226, arb1: 40, arb2: 12, arr: 0, gr: 'flat', mouth: 'oh', prop: '', bLy: -9, bRy: -12, bLr: 4, bRr: -4, bLa: 13, bRa: 14 },
  shrug: { shr: 9, htilt: 8, lean: -2, turn: 0.8, lookx: -0.8, looky: -0.7, uL: 0.5, uR: 0.6, bLy: -4, bLr: 14, bRy: -6, bRr: -16, lax: -6, rax: 6,
    alx: 92, aly: 246, alb1: -40, alb2: -4, alr: 0, gl: 'fist', prop: 'L', acc: 70, arx: 310, ary: 240, arb1: 38, arb2: 4, arr: 0, gr: 'palm', mouth: 'wry' },
  anticipation: { lean: 7, hx: 8, hy: 2, htilt: 5, turn: 1.1, hipTilt: -4, hipX: 4, lookx: 1, looky: 0.15, uL: 0.5, uR: 0.8, bRy: -8, bRr: -12, bRa: 14, bLy: 4, lax: -8, rax: 8, mouth: 'wry',
    arx: 242, ary: 206, arb1: 36, arb2: 14, arr: 0, gr: 'point', alx: 152, aly: 312, alb1: 54, alb2: 24, alr: 0, gl: 'hip', prop: '' },
  whistle: { lean: 2, htilt: -4, turn: 0.8, uL: 0.12, lowL: 0.8, bLy: 8, bLr: 6, lookx: 0.2, looky: 0, mouth: 'whistle',
    arx: 244, ary: 202, arb1: 32, arb2: 12, arr: 0, gr: 'pinch', alx: 112, aly: 232, alb1: -34, alb2: -6, alr: 0, gl: 'fist', prop: 'L', acc: 150 },
  impatient: { lean: -2, htilt: 7, turn: 0.9, hipTilt: 3, uL: 0.4, uR: 0.6, lookx: -0.9, looky: -0.4, bRy: -3, bLy: 6, mouth: 'wry', rax: 8, ray: -6, rsr: 22, prop: '',
    alx: 222, aly: 290, alb1: 22, alb2: 30, alr: 0, gl: 'relax', arx: 182, ary: 296, arb1: -22, arb2: -30, arr: 0, gr: 'relax' },
  laugh: { lean: 3, htilt: -9, hy: 2, turn: 0.8, joyL: 1, joyR: 1, uL: 0.1, uR: 0.1, lowL: 0.6, lowR: 0.6, bLy: -2, bRy: -6, bLa: 14, bRa: 14, mouth: 'laugh', lax: -6, rax: 6,
    alx: 212, aly: 306, alb1: 22, alb2: 18, alr: 0, gl: 'flat', arx: 190, ary: 302, arb1: -20, arb2: -18, arr: 0, gr: 'flat', prop: '' },
  salute: { lean: -1, htilt: -3, turn: 0.9, uL: 0, lowL: 0.7, uR: 0.9, bLy: 8, mouth: 'grin', lax: 0, rax: 0, lsr: -4, rsr: 4,
    alx: 162, aly: 128, alb1: -36, alb2: -22, alr: 0, gl: 'flat', arx: 249, ary: 302, arb1: -38, arb2: -22, arr: -8, gr: 'hip', prop: '', lookx: 0.1 },
  curtsy: { lean: 12, hx: 6, hy: 4, htilt: -6, turn: 1.1, uy: 14, hipTilt: -6, hipX: 6, lookx: -0.2, looky: -0.7, uL: 0.5, uR: 0.8, bRy: -8, rax: -30, rsr: -10, lax: -14, mouth: 'smirk',
    arx: 330, ary: 330, arb1: -22, arb2: 16, arr: 0, gr: 'open', alx: 168, aly: 140, alb1: -36, alb2: -22, alr: 0, gl: 'flat', prop: '' },
};
POSES.think = { ...POSES.anticipation, mouth: 'smirk', lookx: 0.9, looky: -0.5, hx: 3, lean: 4 };

// ---------------------------------------------------------------------- moods (face baseline; poses override explicit channels)
export const MOODS = {
  sly:     { uL: 0.5, uR: 0.88, lowL: 0.1, slL: 5, slR: 3, bLy: 0, bLr: -4, bLa: 11, bRy: -3, bRr: -6, bRa: 11, lookx: -0.75, looky: 0.05, mouth: 'smirk' },
  happy:   { uL: 0.7, uR: 0.7, joyL: 0.25, joyR: 0.25, bLy: -2, bRy: -6, bLa: 8, bRa: 9, mouth: 'grin' },
  worried: { uL: 0.8, uR: 0.8, bLy: -1, bLr: 14, bRy: -3, bRr: -16, bLa: 6, bRa: 6, mouth: 'wry' },
  bored:   { uL: 0.32, uR: 0.32, bLy: 6, bLr: -2, bRy: 2, bRr: -2, bLa: 2, bRa: 3, mouth: 'wry' },
  alert:   { uL: 0.95, uR: 0.95, bLy: -4, bRy: -10, bLa: 8, bRa: 12, mouth: 'smirk' },
  smug:    { uL: 0.42, uR: 0.42, bLy: 4, bRy: -8, bRr: -14, mouth: 'smirk' },
};

// ====================================================================== markup assembly
let UID = 0;
function buildMarkup(outfitKey, pre, o) {
  const W = OUTFIT_DEFS[outfitKey] || OUTFIT_DEFS.inspectrice;
  const c = makeCtx({ idPrefix: pre, misreg: o.misreg, halftone: o.halftone });
  const sleeve = W.sleeve || {};
  // ---- head
  const H = buildHead(c, W);
  const capG = G(pre + 'cap', W.head ? W.head(c) : '');
  const headInner = H.hairMass + H.curlL + H.curlR + H.face + H.maskUnder + H.features + G(pre + 'face-gear', W.gear ? W.gear(c) : '') + (W.capOver ? H.bangs + capG : capG + H.bangs);
  const head = G(pre + 'head', `<g id="${pre}head-t">${headInner}</g>`);
  // ---- arms
  const arm = (side) => {
    const s = side.toLowerCase(), kinds = gloveKinds(c, W, s);
    let t = limbEls(c, `arm-${s}`, sleeve.fill || PAL.navyJ) + (sleeve.tex && c.halftone ? `<path id="${pre}arm-${s}-tx" d="" fill="url(#${pre}htf)" transform="translate(${f(c.misT[0])} ${f(c.misT[1])})"/>` : '');
    if (sleeve.gloveFrom != null) t += limbEls(c, `arm-${s}-lg`, W.glove || PAL.white, { suffix: ['i', 'f'] });
    if (sleeve.trim) t += limbEls(c, `arm-${s}-tr`, sleeve.trim, { suffix: ['i', 'f'] });
    const hand = G(`${pre}hand-${s}`, `<g id="${pre}hand-${s}-t"><g id="${pre}prop-slot-${s}"></g>` + Object.keys(kinds).map((k) => `<g id="${pre}g-${s}-${k}" display="${k === 'relax' ? 'inline' : 'none'}">${kinds[k]}</g>`).join('') + `</g>`);
    return G(`${pre}arm-${s}`, t + hand);
  };
  const armL = arm('L'), armR = arm('R');
  // ---- legs + shoes
  const leg = (side) => G(`${pre}leg-${side.toLowerCase()}`, limbEls(c, `leg-${side.toLowerCase()}`, W.legs.fill) + (W.legs.shine ? `<path id="${pre}leg-${side.toLowerCase()}-sh" d="" fill="none" stroke="${W.legs.shine}" stroke-width="3.2" stroke-linecap="round" opacity=".5"/>` : ''));
  const shoe = (side) => G(`${pre}shoe-${side.toLowerCase()}`, `<g id="${pre}shoe-${side.toLowerCase()}-t">${shoeArt(c, W)}</g>`);
  const prop = G(`${pre}prop`, W.prop ? W.prop(c) : '') + G(`${pre}prop2`, W.prop2 ? W.prop2(c) : '');
  const neck = part(c, 'M193 212C193 226 191 238 189 250L211 250C210 238 209 226 208 212Z', PAL.skin, { sw: OL * 0.9, mis: [1.4, 1.2], shade: 'M186 212L214 212L214 230C204 226 194 226 186 230Z' });
  const skirt = G(`${pre}skirt`, `<g id="${pre}skirt-t">${W.skirt(c)}</g>`);
  const shoes = G(`${pre}shoes`, shoe('L') + shoe('R'));
  const legs = G(`${pre}legs`, leg('L') + leg('R'));
  const lowerBlock = W.shoesUnder ? legs + shoes + skirt : legs + skirt + shoes;
  const torso = G(`${pre}torso`, `<g id="${pre}torso-t"><g transform="translate(0 ${-TORSO_LIFT})">${W.torso(c)}</g></g>`);
  const body =
    `<ellipse id="${pre}shadow" cx="200" cy="${GROUND + 3}" rx="92" ry="11" fill="${INK}" opacity=".26"/>` +
    G(`${pre}lower`, lowerBlock) +
    G(`${pre}upper`, G(`${pre}upper-t`, G(`${pre}arms-back`, '') + neck + torso + head + G(`${pre}arms-front`, armL + armR))) +
    G(`${pre}prop-store`, prop, ' display="none"');
  return { defs: defsCommon(pre) + c.defs.join(''), body: G(`${pre}mirror`, G(`${pre}root`, G(`${pre}root-t`, body))) + G(`${pre}fx`, ''), W };
}

// ====================================================================== deterministic PRNG
function mulberry32(a) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// ====================================================================== the heroine
export function createHeroine(container, opts = {}) {
  const O = { outfit: 'inspectrice', seed: 7, limited: 12, autoplay: true, raf: true, rim: false, lookTargets: {}, onCue: null, idle: true, size: null, crop: 'full', mirror: false, ...opts };
  const pre = O.idPrefix || `mambo${++UID}-`;
  const mq = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null;
  let reduced = O.reduced ?? !!(mq && mq.matches);
  const rnd = mulberry32(O.seed);
  const rr = (a, b) => a + (b - a) * rnd();

  // ---- state
  const X = new Float64Array(NP), V = new Float64Array(NP), T = new Float64Array(NP), D = new Float64Array(NP);
  REST_VALUES.forEach((v, i) => { X[i] = T[i] = D[i] = v; });
  const KK = new Float64Array(NP), CC = new Float64Array(NP), PRIM = new Uint8Array(NP);
  NAMES.forEach((n, i) => { const [, g, p] = DEF[n]; KK[i] = GROUPS[g][0]; CC[i] = GROUPS[g][1]; PRIM[i] = p; });
  const dis = { ...DISCRETE_DEF };
  let outfitKey = OUTFIT_KEYS.includes(O.outfit) ? O.outfit : 'inspectrice';
  let cropName = CROPS[O.crop] ? O.crop : 'full', mirrored = !!O.mirror;   // mirrored: she stands on the right of the grid and looks left (cheap: one flipped group)
  let mood = 'sly', poseName = 'idle', overrides = {}, W = null, E = {}, svg = null, markup = null;
  let ry = 0, vy = 0, ryTarget = 0, grounded = true;            // ballistic height (negative = up)
  const sec = {};                                                // secondary springs
  const SEC = { hair: [60, 5.2, 0.0022, 0.0014, 0.0, 0.9], curlL: [90, 6, 0.0034, 0.002, 0.0, 1.1], curlR: [100, 6.5, 0.0030, 0.0018, 0.0, 1.0], bangs: [140, 8, 0.0016, 0.001, 0, 0.5], cap: [170, 7, 0.0026, 0.0016, 0, 0.5],
    skirt: [90, 6, 0.0022, 0.0, 0, 0.6], whistle: [55, 3.6, 0.004, 0.003, 0, 1.2], scarf1: [48, 3.2, 0.004, 0.003, 0, 1.6], scarf2: [60, 3.8, 0.0045, 0.0035, 0, 1.3] };
  Object.keys(SEC).forEach((k) => { sec[k] = { x: 0, v: 0 }; });
  const look = { tx: 0.5, ty: 0.1, sx: 0, sy: 0, nextSac: 1, target: null };
  const blinkS = { t: -1, kind: 'normal', next: rr(2, 5), amount: 0 };
  const mouthS = { from: VISEMES.smirk.slice(), to: VISEMES.smirk, cur: VISEMES.smirk.slice(), t: 1, dur: 0.08, name: 'smirk' };
  const clipS = { cur: null, queue: [], lastEnd: 0 };
  const dir = { next: rr(5, 11), idle: 0, shiftNext: rr(5, 9), shiftSide: 1 };
  const fxP = [];
  let speed = 1; const stat = { frames: 0, avg: 0, max: 0 };
  let time = 0, acc = 0, lastSample = 0, raf = 0, last = 0, paused = false, destroyed = false, rendered = false;
  const prevHead = { x: 0, y: 0, a: 0, vx: 0, vy: 0, w: 0, ax: 0, ay: 0, al: 0, init: false };
  const cache = Object.create(null);
  const spinS = { angle: 0, active: false };
  const gthumb = { l: { t: 1, v: 1 }, r: { t: 1, v: 1 } };     // thumb side: target (+1 = side A on the glove's -x, -1 = side B) and eased value (cross-fade, no mirror pop)
  let lastRenderT = 0, snapThumbs = true;

  // ---- DOM
  function mount() {
    const keepFx = E.fx ? Array.from(E.fx.childNodes) : [];
    const { defs, body, W: w } = buildMarkup(outfitKey, pre, O);
    W = w;
    const rimCss = O.rim ? ' style="filter:drop-shadow(0 0 0 #FFFBF0)"' : '';
    container.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vbOf()}" preserveAspectRatio="xMidYMax meet" style="width:100%;height:100%;display:block;overflow:${CROPS[cropName].overflow}"${O.size ? ` height="${O.size}"` : ''} role="img" aria-label="Agent Mambo heroine"><defs>${defs}</defs>${body}</svg>`;
    svg = container.firstElementChild;
    E = {}; for (const k of Object.keys(cache)) delete cache[k];
    svg.querySelectorAll('[id]').forEach((el) => { E[el.id.slice(pre.length)] = el; });
    keepFx.forEach((n) => E.fx.appendChild(n));
    // initial layers
    E['arms-front'].appendChild(E['arm-l']); E['arms-front'].appendChild(E['arm-r']);
    const propEl = E['prop'];
    if (propEl) { const slot = E[`prop-slot-${dis.prop.toLowerCase()}`]; if (slot) slot.appendChild(propEl); }
    applyDiscrete(true);
    markup = true;
    applyCrop();
  }
  function vbOf() { const [x, y, w, h] = CROPS[cropName].vb; return `${mirrored ? 400 - x - w : x} ${y} ${w} ${h}`; }
  function applyCrop() {
    if (!svg) return;
    svg.setAttribute('viewBox', vbOf()); svg.style.overflow = CROPS[cropName].overflow;
    const low = CROPS[cropName].lower !== false;
    for (const n of ['lower', 'shadow']) if (E[n]) E[n].setAttribute('display', low ? 'inline' : 'none');
    if (E.mirror) E.mirror.setAttribute('transform', mirrored ? 'translate(400 0) scale(-1 1)' : '');
  }
  const set = (el, a, v) => { const k = el.id + '|' + a; if (cache[k] !== v) { cache[k] = v; el.setAttribute(a, v); } };
  const setE = (n, a, v) => { const el = E[n]; if (el) { const k = n + '|' + a; if (cache[k] !== v) { cache[k] = v; el.setAttribute(a, v); } } };

  function applyDiscrete(force) {
    for (const s of ['l', 'r']) {
      const kind = dis[s === 'l' ? 'gl' : 'gr'];
      for (const k of Object.keys(GLOVE_GRIP)) setE(`g-${s}-${k}`, 'display', k === kind ? 'inline' : 'none');
    }
    const ph = dis.prop;
    if (E.prop) { const slot = ph ? E[`prop-slot-${ph.toLowerCase()}`] : E['prop-store']; if (slot && E.prop.parentNode !== slot) slot.appendChild(E.prop); }
    const p2 = (W.prop2On && W.prop2On[poseName]) || dis.prop2 || '';
    const ph2 = p2 && p2 !== ph ? p2 : '';
    if (E.prop2) { const slot = ph2 ? E[`prop-slot-${ph2.toLowerCase()}`] : E['prop-store']; if (slot && E.prop2.parentNode !== slot) slot.appendChild(E.prop2); dis._p2 = ph2; }
    const lay = (side, which) => { const parent = which === 'back' ? E['arms-back'] : E['arms-front']; const el = E[`arm-${side}`]; if (parent && el.parentNode !== parent) parent.appendChild(el); };
    lay('l', dis.layL); lay('r', dis.layR);
  }

  // ---- targets
  function composeTargets() {
    const base = {};
    NAMES.forEach((n) => { base[n] = DEF[n][0]; });
    const m = MOODS[mood] || MOODS.sly, p = POSES[poseName] || POSES.idle;
    const disc = { ...DISCRETE_DEF, mouth: m.mouth || 'smirk' };
    for (const k of Object.keys(m)) { if (k in base) base[k] = m[k]; }
    for (const k of Object.keys(p)) { if (k in base) base[k] = p[k]; else if (k in disc) disc[k] = p[k]; }
    for (const k of Object.keys(overrides)) { if (k in base) base[k] = overrides[k]; else if (k in disc) disc[k] = overrides[k]; }
    return { base, disc };
  }
  function applyTargets(snap) {
    if (snap) snapThumbs = true;
    const { base, disc } = composeTargets();
    NAMES.forEach((n, i) => { if (n === 'lookx' || n === 'looky') return; T[i] = base[n]; if (snap || reduced) { X[i] = T[i]; V[i] = 0; D[i] = T[i]; } });
    if (!look.target) { look.tx = base.lookx; look.ty = base.looky; }
    Object.assign(dis, { gl: disc.gl, gr: disc.gr, prop: disc.prop, prop2: disc.prop2, layL: disc.layL, layR: disc.layR });
    setMouth(disc.mouth, snap || reduced ? 0 : undefined);
    applyDiscrete();
  }
  function setMouth(name, dur) {
    if (!VISEMES[name] || mouthS.name === name) return;
    mouthS.from = mouthS.cur.slice(); mouthS.to = VISEMES[name]; mouthS.t = dur === 0 ? 1 : 0; mouthS.dur = dur ?? 0.09; mouthS.name = name;
    if (dur === 0) mixVisemes(mouthS.from, mouthS.to, 1, mouthS.cur);
  }

  // ---- look
  function resolveLook(t) {
    if (t == null) return null;
    if (typeof t === 'string') {
      const lt = O.lookTargets[t];
      if (lt) t = typeof lt === 'function' ? lt() : lt;
      else {
        const named = { grid: [1, 0.12, 0.75], player: [-0.25, 0.05, 0.08], meter: [0.1, -0.7, 0.4], spin: [0.8, 0.5, 0.7], up: [0.2, -0.9, 0.4], down: [0, 0.8, 0.5], left: [-1, 0, 0.3], right: [1, 0, 0.8], hand: [-0.3, 0.8, 0.3] }[t];
        return named ? { nx: named[0], ny: named[1], turn: named[2] } : null;
      }
    }
    if (t && 'nx' in t) return t;
    if (t && 'x' in t && svg) { // container-relative pixel target
      const r = svg.getBoundingClientRect(), cr = container.getBoundingClientRect();
      const ex = r.left + r.width * 200 / 400 - cr.left, ey = r.top + r.height * 176 / 600 - cr.top, sz = Math.max(60, r.width);
      const dx = (mirrored ? -1 : 1) * (t.x - ex), dy = t.y - ey;
      return { nx: clamp(dx / (sz * 0.7), -1, 1), ny: clamp(dy / (sz * 1.0), -1, 1), turn: clamp(1 + dx / (sz * 2.4), 0.05, 1.15) };
    }
    return null;
  }
  function setLook(t) {
    look.target = resolveLook(t);
    if (!look.target) { const { base } = composeTargets(); look.tx = base.lookx; look.ty = base.looky; } else { look.tx = look.target.nx; look.ty = look.target.ny; }
  }

  // ---- blink / wink
  function blink(kind = 'normal') { if (blinkS.t < 0 && !reduced) { blinkS.t = 0; blinkS.kind = kind; } }
  const BLINK = { normal: [0.07, 0.04, 0.12, 1], half: [0.06, 0.02, 0.1, 0.5], slow: [0.22, 0.14, 0.3, 1] };
  function updateBlink(dt) {
    if (blinkS.t >= 0) {
      const [a, h, b, peak] = BLINK[blinkS.kind]; blinkS.t += dt; const t = blinkS.t;
      blinkS.amount = t < a ? Ease.out(t / a) * peak : t < a + h ? peak : t < a + h + b ? (1 - Ease.inOut((t - a - h) / b)) * peak : 0;
      if (t >= a + h + b) { blinkS.t = -1; blinkS.amount = 0; }
    } else if (!reduced && O.idle) {
      blinkS.next -= dt;
      if (blinkS.next <= 0) { const r = rnd(); blink(r < 0.12 ? 'slow' : r < 0.3 ? 'half' : 'normal'); blinkS.next = rr(2, 6); if (rnd() < 0.15) blinkS.next = 0.25; }
    }
  }
  // wink('L'|'R') = SCREEN side as seen by the player (the mirrored heroine swaps eyes); 'near' / 'far' = the eye nearer / farther from the camera (art-space L / R)
  function wink(side = 'L', dur = 0.6) {
    const isNear = side === 'near' ? true : side === 'far' ? false : (side === 'L') !== mirrored;
    overrideTimed(isNear ? { uL: 0, lowL: 0.7, bLy: 10, bLr: 6 } : { uR: 0, lowR: 0.7, bRy: 8 }, dur);
  }
  const timedOver = [];
  function overrideTimed(set, dur) { timedOver.push({ set, left: dur, prev: {} }); for (const k of Object.keys(set)) { timedOver[timedOver.length - 1].prev[k] = overrides[k]; overrides[k] = set[k]; } applyTargets(); }
  function updateTimed(dt) {
    for (let i = timedOver.length - 1; i >= 0; i--) {
      const o = timedOver[i]; o.left -= dt;
      if (o.left <= 0) { for (const k of Object.keys(o.set)) { if (o.prev[k] === undefined) delete overrides[k]; else overrides[k] = o.prev[k]; } timedOver.splice(i, 1); applyTargets(); }
    }
  }

  // ---- impulses & jumps
  function impulse(d) {
    if ('jump' in d) { vy = -d.jump; grounded = false; }
    if ('sq' in d) V[IX.sq] += d.sq;
    if ('cap' in d) { V[IX.cy] += d.cap; }
    if ('capSpin' in d) V[IX.cr] += d.capSpin;
    if ('shake' in d) V[IX.rx] += d.shake;
    if ('hair' in d) for (const k of ['hair', 'curlL', 'curlR', 'bangs']) sec[k].v += d.hair;
    if ('lean' in d) V[IX.lean] += d.lean;
    if ('head' in d) V[IX.htilt] += d.head;
  }

  // ---- particles
  function fxLayer() { return E.fx; }
  function spawn(type, o = {}) {
    if (reduced && type !== 'sparkle') return;
    const L = fxLayer(); if (!L) return;
    if (mirrored) { o = { ...o, x: 400 - (o.x ?? 200), vx: -(o.vx ?? 0), rot: type === 'dash' ? 180 - (o.rot ?? 0) : o.rot, vr: -(o.vr ?? 0) }; }
    const p = { type, t: 0, life: o.life ?? 0.6, x: o.x ?? 200, y: o.y ?? 120, vx: o.vx ?? 0, vy: o.vy ?? 0, g: o.g ?? 0, r: o.r ?? 1, rot: o.rot ?? 0, vr: o.vr ?? 0, s: o.s ?? 1, col: o.col, el: null, delay: o.delay ?? 0 };
    const mk = (inner) => { const gg = document.createElementNS('http://www.w3.org/2000/svg', 'g'); gg.innerHTML = inner; gg.setAttribute('visibility', 'hidden'); L.appendChild(gg); return gg; };
    if (type === 'sparkle') p.el = mk(star(0, 0, 11, o.col || PAL.white, 2.6));
    else if (type === 'dash') p.el = mk(`<path d="M0 0L${o.len ?? 22} 0" stroke="${INK}" stroke-width="4.4" stroke-linecap="round"/>`);
    else if (type === 'drop') p.el = mk(`<path d="M0 -9C6 -1 7 4 0 7C-7 4 -6 -1 0 -9Z" fill="${PAL.glass}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>`);
    else if (type === 'puff') p.el = mk(`<path d="${ellD(0, 0, 14, 11)}" fill="${PAL.white}" stroke="${INK}" stroke-width="3.4"/><path d="${ellD(-12, 4, 9, 8)}" fill="${PAL.white}" stroke="${INK}" stroke-width="3.2"/><path d="${ellD(11, 5, 9, 7)}" fill="${PAL.white}" stroke="${INK}" stroke-width="3.2"/><path d="${ellD(0, 3, 14, 8)}" fill="${PAL.white}"/>`);
    else if (type === 'conf') p.el = mk(`<rect x="-4" y="-2.6" width="8" height="5.2" fill="${o.col || PAL.gold}" stroke="${INK}" stroke-width="1.6"/>`);
    else if (type === 'note') p.el = mk(`<path d="M-4 8a4.5 3.6 -20 1 0 0.1 0M0 8L0 -10Q8 -8 9 0" fill="none" stroke="${INK}" stroke-width="3.6" stroke-linecap="round"/><ellipse cx="-3" cy="8" rx="4.6" ry="3.6" fill="${INK}"/>`);
    else if (type === 'chip') p.el = mk(`<circle r="9" fill="${o.col || PAL.brick}" stroke="${INK}" stroke-width="2.8"/><circle r="5.2" fill="none" stroke="${PAL.white}" stroke-width="2.4" stroke-dasharray="3.2 3.2"/>`);
    else if (type === 'bubble') p.el = mk(`<circle r="7" fill="#B9F06A" stroke="${INK}" stroke-width="2.8"/><circle cx="-2" cy="-2" r="1.8" fill="${PAL.white}"/>`);
    else if (type === 'ring') p.el = mk(`<circle r="14" fill="none" stroke="${o.col || PAL.gold}" stroke-width="4"/>`);
    else if (type === 'q') p.el = mk(`<text x="0" y="0" font-family="Arial Black,Helvetica,sans-serif" font-weight="900" font-size="30" text-anchor="middle" fill="${PAL.gold}" stroke="${INK}" stroke-width="2.4" paint-order="stroke">?</text>`);
    fxP.push(p); return p;
  }
  function updateFx(dt) {
    for (let i = fxP.length - 1; i >= 0; i--) {
      const p = fxP[i];
      if (p.delay > 0) { p.delay -= dt; continue; }
      p.t += dt; const u = p.t / p.life;
      if (u >= 1) { p.el.remove(); fxP.splice(i, 1); continue; }
      p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
      let sc = p.s, op = 1;
      if (p.type === 'sparkle') sc = p.s * Math.sin(Math.PI * Math.min(1, u * 1.1)) * 1.2;
      else if (p.type === 'puff') { sc = p.s * (0.5 + u); op = 1 - u * u; }
      else if (p.type === 'dash') { sc = p.s * (1 - u * 0.6); op = u > 0.7 ? 1 - (u - 0.7) / 0.3 : 1; }
      else if (p.type === 'ring') sc = p.s * (0.4 + u * 2.2), op = 1 - u;
      else if (p.type === 'drop') op = 1 - u * u;
      else if (p.type === 'note' || p.type === 'q') op = u > 0.7 ? 1 - (u - 0.7) / 0.3 : 1;
      else if (p.type === 'bubble') sc = p.s * (0.6 + u * 0.6), op = 1 - u * u;
      p.el.setAttribute('visibility', 'visible');
      p.el.setAttribute('transform', `translate(${f(p.x)} ${f(p.y)}) rotate(${f(p.rot)}) scale(${f(sc)})`);
      p.el.setAttribute('opacity', f2(op));
    }
  }
  const tweens = [];
  const tween = (el, fn, from, to, dur, ease = Ease.out, delay = 0, done) => { tweens.push({ el, fn, from, to, dur, t: -delay, ease, done }); };
  function updateTweens(dt) {
    for (let i = tweens.length - 1; i >= 0; i--) {
      const w = tweens[i]; w.t += dt; if (w.t < 0) continue;
      const u = clamp(w.t / w.dur, 0, 1); w.fn(w.el, lerp(w.from, w.to, w.ease(u)));
      if (u >= 1) { tweens.splice(i, 1); if (w.done) w.done(); }
    }
  }
  let screenEl = null;
  function paraventIn() {
    if (screenEl) screenEl.remove();
    const L = fxLayer(); if (!L) return;
    const g2 = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    let inner = '';
    for (let i = 0; i < 3; i++) {
      const x = i * 84, top = 150 + (i % 2 ? 8 : -2), fill = i % 2 ? '#7A4A7E' : PAL.plum;
      inner += `<path d="M${x} ${top}L${x + 84} ${top + (i % 2 ? -10 : 10)}L${x + 84} 566L${x} 566Z" fill="${fill}" stroke="${INK}" stroke-width="6" stroke-linejoin="round"/>`
        + `<path d="M${x + 8} ${top + 14}L${x + 76} ${top + 14 + (i % 2 ? -8 : 8)}" stroke="${PAL.gold}" stroke-width="5" stroke-linecap="round"/>`
        + `<g transform="translate(${x + 42} ${top + 120})">${star(0, 0, 20, PAL.gold, 3.4, 0, 4)}</g>`
        + `<path d="M${x + 12} 540L${x + 72} 540" stroke="${PAL.gold}" stroke-width="4" stroke-linecap="round"/>`;
    }
    g2.innerHTML = inner; L.appendChild(g2); screenEl = g2;
    g2.setAttribute('transform', 'translate(-300 0)');
    tween(g2, (el, v) => el.setAttribute('transform', `translate(${f(v)} 0)`), -300, 74, 0.32, Ease.outBack);
  }
  function paraventOut() {
    if (!screenEl) return; const el = screenEl;
    tween(el, (e2, v) => e2.setAttribute('transform', `translate(${f(v)} 0)`), 74, 460, 0.34, Ease.in, 0, () => { el.remove(); if (screenEl === el) screenEl = null; });
  }
  const headWorld = () => { const a = rad2(X[IX.htilt] + X[IX.lean]); return [200 + X[IX.rx] + X[IX.ux] + X[IX.hipX] * 0.55 + 190 * Math.sin(a) + X[IX.hx], 164 + (REST.neck[1] - 225) + ry + X[IX.uy] + X[IX.hy]]; };
  const rad2 = (d) => (d * Math.PI) / 180;
const f2 = (n) => Math.round(n * 100) / 100;
  function fxPreset(name, o = {}) {
    const [hx, hy] = headWorld();
    if (name === 'sparkles') for (let i = 0; i < (o.n ?? 5); i++) spawn('sparkle', { x: hx + rr(-90, 90), y: hy + rr(-100, 60), life: rr(0.4, 0.8), s: rr(0.7, 1.4), delay: rr(0, 0.35), col: rnd() < 0.5 ? PAL.white : PAL.gold });
    else if (name === 'burstLines') for (let i = 0; i < (o.n ?? 6); i++) { const a = -Math.PI / 2 + (i - (o.n ?? 6) / 2 + 0.5) * 0.36, r0 = 120 + rr(0, 14); spawn('dash', { x: hx + Math.cos(a) * r0, y: hy - 60 + Math.sin(a) * r0 * 0.9, rot: (a * 180) / Math.PI, life: 0.45, len: 20 + rr(0, 12) }); }
    else if (name === 'sweat') { spawn('drop', { x: hx + 62, y: hy - 70, vx: 40, vy: -70, g: 520, life: 0.8 }); spawn('drop', { x: hx - 58, y: hy - 56, vx: -50, vy: -60, g: 520, life: 0.8, s: 0.8 }); }
    else if (name === 'puff') spawn('puff', { x: hx + 54, y: hy - 4, vx: 30, vy: -26, life: 1.1, s: 0.9 });
    else if (name === 'confetti') for (let i = 0; i < (o.n ?? 26); i++) spawn('conf', { x: hx + rr(-20, 20), y: hy - 70, vx: rr(-170, 170), vy: rr(-330, -120), g: 520, life: rr(0.9, 1.5), rot: rr(0, 360), vr: rr(-500, 500), col: [PAL.gold, PAL.brick, PAL.turq, PAL.white, PAL.orange][i % 5] });
    else if (name === 'notes') for (let i = 0; i < 3; i++) spawn('note', { x: hx + 70, y: hy - 10, vx: 40 + i * 12, vy: -50 - i * 14, life: 1, delay: i * 0.18, rot: rr(-20, 20) });
    else if (name === 'ring') spawn('ring', { x: hx, y: hy - 20, life: 0.5 });
    else if (name === 'chips') for (let i = 0; i < (o.n ?? 8); i++) spawn('chip', { x: hx + rr(-20, 20), y: hy - 60, vx: rr(-180, 180), vy: rr(-300, -120), g: 560, life: rr(1, 1.5), vr: rr(-500, 500), col: [PAL.brick, INK, PAL.cream][i % 3] });
    else if (name === 'bubbles') for (let i = 0; i < (o.n ?? 8); i++) spawn('bubble', { x: hx + rr(-70, 90), y: hy + rr(-60, 40), vx: rr(-20, 20), vy: rr(-90, -40), life: rr(0.7, 1.2), delay: rr(0, 0.4), s: rr(0.7, 1.3) });
    else if (name === 'paraventIn') paraventIn();
    else if (name === 'paraventOut') paraventOut();
    else if (name === 'garments') for (let i = 0; i < 10; i++) spawn('conf', { x: 200 + rr(-60, 60), y: 200, vx: rr(-200, 200), vy: rr(-380, -160), g: 600, life: rr(0.7, 1.1), rot: rr(0, 360), vr: rr(-600, 600), col: [PAL.navy, PAL.brick, PAL.turq, PAL.mustard, PAL.camel][i % 5], s: 1.8 });
    else if (name === 'question') spawn('q', { x: hx + 60, y: hy - 130, vy: -22, life: 1.1 });
  }

  // ---- clips
  const clipDefs = { ...CLIPS, ...(O.clips || {}) };
  const TRACK_FIELDS = ['pose', 'mood', 'set', 'mouth', 'look', 'impulse', 'fx', 'wink', 'blink', 'spin', 'outfit', 'cue'];
  function compileClip(def) {
    if (def.events || !def.tracks) return def;
    const ev = new Map();
    for (const [track, keys] of Object.entries(def.tracks)) for (const k of keys) { const at = k[0], val = k[1], extra = k[2] || {}; const e = ev.get(at) || { at }; e[track] = val; Object.assign(e, extra); ev.set(at, e); }
    return { ...def, events: [...ev.values()].sort((a, b) => a.at - b.at) };
  }
  function play(clip, o = {}) {
    if (clip === 'outfitChange') { const ks = OUTFIT_KEYS, k = o.outfit || ks[(ks.indexOf(outfitKey) + 1) % ks.length]; setOutfit(k, { animated: true }); return clipS.cur && clipS.cur.def; }
    let def = typeof clip === 'string' ? clipDefs[clip] : clip;
    if (!def) return null;
    def = compileClip(def);
    if (o.queue && clipS.cur) { clipS.queue.push([def, o]); return def; }
    const events = (def.events || []).slice().sort((a, b) => a.at - b.at);
    clipS.cur = { def, events, i: 0, t: 0, speed: o.speed || 1, hold: o.hold ?? def.hold ?? false, name: def.name || (typeof clip === 'string' ? clip : 'custom'), onEnd: o.onEnd };
    dir.idle = 0; dir.next = rr(5, 11);
    return def;
  }
  function stopClip(toRest = true) { const c = clipS.cur; clipS.cur = null; if (toRest) { overrides = {}; poseName = 'idle'; applyTargets(); } if (c && c.onEnd) c.onEnd(); }
  function runEvent(ev) {
    if (ev.pose) { poseName = ev.pose; overrides = ev.keep ? overrides : {}; }
    if (ev.mood) mood = ev.mood;
    if (ev.set) Object.assign(overrides, ev.set);
    if (ev.pose || ev.mood || ev.set) applyTargets();
    if (ev.mouth) { overrides.mouth = ev.mouth; setMouth(ev.mouth, ev.mouthDur); }
    if ('look' in ev) setLook(ev.look);
    if (ev.impulse && !reduced) impulse(ev.impulse);
    if (ev.fx) fxPreset(ev.fx, ev.fxOpts);
    if (ev.blink) blink(ev.blink);
    if (ev.wink) wink(ev.wink, ev.winkDur || 0.6);
    if (ev.spin && !reduced) { spinS.active = true; spinS.angle = 0; spinS.turns = ev.spin; spinS.dur = ev.spinDur || 0.8; spinS.t = 0; }
    if (ev.outfit) setOutfit(ev.outfit);
    if (ev.cue && O.onCue) O.onCue(ev.cue, clipS.cur && clipS.cur.name);
    if (ev.call) ev.call(api);
  }
  function updateClip(dt) {
    const c = clipS.cur;
    if (!c) { dir.idle += dt; return; }
    c.t += dt * c.speed;
    while (c.i < c.events.length && c.events[c.i].at <= c.t) runEvent(c.events[c.i++]);
    if (c.t >= (c.def.dur || 1) && c.i >= c.events.length) {
      if (c.hold) return;
      clipS.cur = null; if (c.onEnd) c.onEnd();
      overrides = {}; poseName = c.def.endPose || 'idle'; applyTargets();
      if (clipS.queue.length) { const [d, o] = clipS.queue.shift(); play(d, o); }
    }
  }

  // ---- idle director (micro behaviours, weight shifts)
  const MICRO = ['checkFlashlight', 'blowWhistle', 'examineNails', 'glancePlayer', 'hairFlip', 'shiftWeight', 'shiftWeight'];
  function updateDirector(dt) {
    if (reduced || !O.idle || clipS.cur) return;
    dir.next -= dt;
    if (dir.next <= 0) {
      dir.next = rr(5, 12);
      const pool = MICRO.filter((m) => !(m === 'blowWhistle' && !W.whistle));
      const pick = pool[Math.floor(rnd() * pool.length)];
      play(pick);
    }
  }

  // ---- outfit
  function setOutfit(key, o2 = {}) {
    if (!OUTFIT_DEFS[key] || key === outfitKey) return;
    if (o2.animated && !reduced) { play({ name: 'outfitChange', dur: 1.9, endPose: 'idle', events: [
      { at: 0, pose: 'idle', look: 'player', cue: 'outfitChange' }, { at: 0.02, fx: 'paraventIn' },
      { at: 0.55, outfit: key, spin: 2, spinDur: 0.5, impulse: { hair: 22, sq: 0.6 }, fx: 'garments' }, { at: 0.7, fx: 'sparkles', fxOpts: { n: 7 } },
      { at: 1.15, fx: 'paraventOut' }, { at: 1.3, pose: 'salute' }, { at: 1.7, look: 'grid' } ] }); return; }
    outfitKey = key; mount(); applyTargets(true); rendered = false; render(true);
  }

  // ====================================================================== simulation
  const FIX = 1 / 120;
  function stepFixed(dt) {
    // springs
    for (let i = 0; i < NP; i++) {
      const tgt = T[i]; let x = X[i], v = V[i];
      const a = KK[i] * (tgt - x) - CC[i] * v;
      v += a * dt; x += v * dt; X[i] = x; V[i] = v;
    }
    // look springs live in params: drive tx/ty + saccade
    // ballistic height
    if (!grounded) {
      vy += 2400 * dt; ry += vy * dt;
      if (ry >= 0) { ry = 0; if (vy > 160) { V[IX.sq] -= Math.min(5.5, vy / 260); fxLanding(vy); } vy = 0; grounded = true; }
    } else { ry = ry * 0.0; }
    // head kinematics -> secondary springs
    const hx = X[IX.rx] + X[IX.ux] + X[IX.hipX] * 0.55 + 190 * Math.sin(rad2(X[IX.lean])) + X[IX.hx];
    const hy = ry + X[IX.uy] + X[IX.hy] + X[IX.sq] * -120;
    const ha = X[IX.htilt] + X[IX.lean] + X[IX.rrot];
    const P = prevHead;
    if (!P.init) { P.x = hx; P.y = hy; P.a = ha; P.init = true; }
    const vx = (hx - P.x) / dt, vyy = (hy - P.y) / dt, w = (ha - P.a) / dt;
    const k = 0.35;
    P.ax += (((vx - P.vx) / dt) - P.ax) * k; P.ay += (((vyy - P.vy) / dt) - P.ay) * k; P.al += (((w - P.w) / dt) - P.al) * k;
    P.x = hx; P.y = hy; P.a = ha; P.vx = vx; P.vy = vyy; P.w = w;
    const wind = time;
    for (const key in SEC) {
      const [kk, cc, gx, gy, gr, windAmp] = SEC[key]; const s = sec[key];
      const drive = -(gx * P.ax + gy * P.ay) * (key === 'cap' ? 1 : 1) - gr * P.al;
      const rest = reduced ? 0 : Math.sin(wind * (0.9 + (key.length % 3) * 0.23) + key.length) * windAmp;
      const a = -kk * (s.x - rest) - cc * s.v + drive * 60;
      s.v += a * dt; s.x += s.v * dt; s.x = clamp(s.x, -38, 38);
    }
    // spin
    if (spinS.active) {
      spinS.t += dt; const u = clamp(spinS.t / spinS.dur, 0, 1); spinS.angle = Ease.inOut(u) * spinS.turns * 360;
      if (u >= 1) { spinS.active = false; spinS.angle = 0; }
    }
  }
  function fxLanding() { if (!reduced) { const [hx] = headWorld(); spawn('puff', { x: 200, y: GROUND - 6, life: 0.5, s: 0.5, vy: -8 }); spawn('puff', { x: 150, y: GROUND - 4, vx: -40, life: 0.45, s: 0.4 }); spawn('puff', { x: 250, y: GROUND - 4, vx: 40, life: 0.45, s: 0.4 }); } }

  function sampleDisplay() {
    for (let i = 0; i < NP; i++) D[i] = reduced ? T[i] : X[i];
  }
  const Dv = (n) => D[IX[n]];

  // ====================================================================== render
  let primSnap = null;
  function render(force) {
    if (!svg) return;
    const lim = !reduced && O.limited > 0;
    const gdt = clamp(time - lastRenderT, 0, 0.1); lastRenderT = time;
    if (!primSnap) primSnap = new Float64Array(X);
    if (lim) { if (time - lastSample >= 1 / O.limited || force) { lastSample = time; for (let i = 0; i < NP; i++) if (PRIM[i]) primSnap[i] = X[i]; } }
    for (let i = 0; i < NP; i++) D[i] = reduced ? T[i] : (PRIM[i] && lim ? primSnap[i] : X[i]);
    const d = (n) => D[IX[n]];
    const breath = reduced ? 0 : Math.sin(time * (Math.PI * 2) / 3.7);
    const sway = reduced ? 0 : Math.sin(time * 0.9 + 1.2);
    // ---- root
    const sq = d('sq'), sy = 1 + sq, sx = 1 / Math.pow(Math.max(0.2, sy), 0.75);
    const spinSx = spinS.active ? Math.cos(rad2(spinS.angle)) : 1;
    setE('root-t', 'transform', `translate(${f(d('rx'))} ${f(ry)}) translate(200 ${GROUND}) rotate(${f(d('rrot'))}) scale(${f2(sx * spinSx)} ${f2(sy)}) translate(-200 -${GROUND})`);
    const lift = clamp(-ry / 260, 0, 1);
    setE('shadow', 'transform', `translate(${f(d('hipX') * 0.5)} 0) scale(${f2(1 - lift * 0.45)} 1)`);
    setE('shadow', 'opacity', f2(0.26 * (1 - lift * 0.6)));
    // ---- lower body (skipped entirely in the waist-up crops)
    const lowerOn = CROPS[cropName].lower !== false;
    const hipX = d('hipX') + sway * 1.2, tilt = d('hipTilt') + sway * 0.5;
    if (lowerOn) {
    // pass 3: the skirt leans a little toward the feet (skew about the hip), and the legs leave from the HEM, not from hidden hip joints,
    // so a pencil skirt and its legs always agree (wide stance, kick, jump). Trousers (legs.fromHip) keep the hip joints.
    const skew = W.legs.fromHip || W.shoesUnder ? 0 : clamp((d('lax') + d('rax')) * 0.1, -6, 6), tk = Math.tan(rad2(skew));
    setE('skirt', 'transform', `translate(${f(hipX)} 0) rotate(${f(tilt)} 200 346) translate(200 346) skewX(${f(skew)}) translate(-200 -346)`);
    setE('skirt-t', 'transform', `rotate(${f(sec.skirt.x)} 200 304)`);
    const LW = (W.legs.w || 13) / 13, legW = (t) => LW * (12.2 - 3.9 * t + 1.1 * Math.sin(Math.PI * t));   // slim, tapering, slight calf
    const anchor = (J) => {
      if (W.legs.fromHip) { const q = rotp(J, tilt, REST.hip); q[0] += hipX; return q; }
      const q = rotp([J[0], REST.skirtHem - 6], sec.skirt.x, [200, 304]); q[0] += tk * (q[1] - 346);
      const r2 = rotp(q, tilt, REST.hip); r2[0] += hipX; return r2;
    };
    const rootL = anchor(REST.hipJointL), rootR = anchor(REST.hipJointR);
    const bk = W.legs.fromHip ? 1 : 0.55;   // shorter visible leg: smaller bends
    for (const [s, root, A] of [['l', rootL, REST.ankleL], ['r', rootR, REST.ankleR]]) {
      const p = s;
      // floor-length gown (shoesUnder): the feet stay under the flare, only the toes peek out
      const ax = W.shoesUnder ? clamp(A[0] + d(p + 'ax') * 0.3, 168, 232) : A[0] + d(p + 'ax');
      const ay = W.shoesUnder ? A[1] : W.legs.fromHip ? A[1] + d(p + 'ay') : Math.max(A[1] + d(p + 'ay'), root[1] + 42);   // feet never climb above the hem
      const cv = limb(root, [ax, ay], d(p + 'b1') * bk, d(p + 'b2') * bk), dd = tubeD(cv, legW);
      setE(`leg-${s}-ink`, 'd', dd); setE(`leg-${s}-fill`, 'd', dd);
      if (E[`leg-${s}-sh`]) setE(`leg-${s}-sh`, 'd', cubicD(limb([root[0] - 3, root[1] + 6], [ax - 3, ay - 6], d(p + 'b1') * 0.8 * bk, d(p + 'b2') * 0.8 * bk)));
      const flip = d(p + 'sf');
      setE(`shoe-${s}-t`, 'transform', `translate(${f(ax)} ${f(ay)}) rotate(${f(d(p + 'sr'))}) scale(${f2(flip * 0.88)} 0.88)`);
    }
    }
    // ---- upper body
    const ux = d('ux') + hipX * 0.55, uy = d('uy') + breath * 1.1;
    const waist = REST.waist;
    setE('upper-t', 'transform', `translate(${f(ux)} ${f(uy)}) rotate(${f(d('lean') + breath * 0.25)} ${waist[0]} ${waist[1]})`);
    const shr = d('shr') + breath * 1.6;
    // chest breath: tiny vertical scale of the torso about the waist
    const sho = d('sho');
    setE('torso-t', 'transform', `translate(200 ${waist[1]}) rotate(${f(sho)}) scale(${f2(1 + breath * 0.006)} ${f2(1 + breath * 0.012)}) translate(-200 -${waist[1]})`);
    // ---- head & face
    const turn = clamp(d('turn'), 0, 1.2);
    const lx = clamp(X[IX.lookx] + look.sx, -1.2, 1.2), ly = clamp(X[IX.looky] + look.sy, -1.2, 1.2);
    const ht = d('htilt') + lx * 1.6 * (reduced ? 0 : 1) + sway * 0.5;
    setE('head-t', 'transform', `translate(${f(REST.neck[0] + d('hx'))} ${f(REST.neck[1] + d('hy'))}) rotate(${f(ht)}) scale(${HEAD_SCALE}) translate(${-HEAD_PIVOT[0]} ${-HEAD_PIVOT[1]})`);
    setE('hair-mass', 'transform', `rotate(${f(sec.hair.x)} -20 -130)`);
    setE('hair-curl-l', 'transform', `rotate(${f(sec.curlL.x)} -80 -48)`);
    setE('hair-curl-r', 'transform', `rotate(${f(sec.curlR.x)} 30 -30)`);
    setE('hair-front', 'transform', `rotate(${f(sec.bangs.x)} 10 -110)`);
    if (E['hair-tuft']) setE('hair-tuft', 'opacity', f2(clamp(-d('cy') / 24, 0, 1)));
    setE('cap', 'transform', `translate(0 ${f(d('cy'))}) rotate(${f(d('cr') + sec.cap.x)} -30 -110)`);
    const L = faceLayout(turn);
    setE('nose-s', 'transform', `translate(${f(L.nose[0])} ${f(L.nose[1])})`);
    setE('cheeks', 'opacity', f2(d('blush')));
    const bl = blinkS.amount;
    for (const s of [-1, 1]) {
      const id = s < 0 ? 'eye-l' : 'eye-r', p = s < 0 ? 'L' : 'R';
      const u = clamp(d('u' + p), 0, 1.2) * (1 - bl), a = { u: Math.min(1, u), joy: d('joy' + p), low: d('low' + p), slant: d('sl' + p) };
      const C = s < 0 ? L.near : L.far, kx = s < 0 ? L.kxNear : L.kxFar, wide = 1 + d('wide') * 0.3;
      setE(`${id}-s`, 'transform', `translate(${f(C[0])} ${f(C[1])}) scale(${f2(kx * wide)} ${f2(L.ky * wide)})`);
      const g = eyeGeom(s, a);
      setE(`${id}-upper`, 'opacity', f2(clamp((a.u - 0.12) / 0.25, 0, 1) * (1 - a.joy))); setE(`${id}-lashline`, 'd', g.lidLine); setE(`${id}-lashes`, 'd', g.lashes); setE(`${id}-lidfill`, 'd', g.upperFill); setE(`${id}-lower`, 'd', g.lowerFill);
      const ox = lx * 8.4, oy = ly * 4.6;
      const pr = d('pup');
      setE(`${id}-iris`, 'transform', `translate(${f(ox)} ${f(oy)}) translate(0 2) scale(${f2(0.5 + pr * 0.5)} ${f2(0.5 + pr * 0.5)}) translate(0 -2)`);
      const st = d('stars'); setE(`${id}-stars`, 'opacity', f2(clamp(st, 0, 1))); setE(`${id}-iris`, 'opacity', st > 0.5 ? 0 : 1);
      const B = s < 0 ? L.browNear : L.browFar;
      setE(s < 0 ? 'brow-l' : 'brow-r', 'd', browPath(s, 0, d('b' + p + 'r'), d('b' + p + 'a'), 1.3, kx * 0.8));
      setE(s < 0 ? 'brow-l' : 'brow-r', 'transform', `translate(${f(B[0])} ${f(B[1] + d('b' + p + 'y'))})`);
    }
    // ---- mouth
    renderMouth(L);
    // ---- arms
    const AW = (W.sleeve && W.sleeve.w) || [10.2, 8.2], armW = (t) => AW[0] + (AW[1] - AW[0]) * t + 5.4 * Math.exp(-t * 9);   // slim noodle with a rounded sleeve head at the shoulder
    for (const s of ['l', 'r']) {
      const S0 = s === 'l' ? REST.shoulderL : REST.shoulderR, S = sho ? rotp(S0, sho, waist) : S0;
      const Sx = S[0], Sy = S[1] - shr;
      const p = s === 'l' ? 'al' : 'ar';
      let wx = d(p + 'x'), wy = d(p + 'y');
      // chain / whistle special-case: whistle pose uses pinch glove at the mouth (handled by pose targets)
      const cv = limb([Sx, Sy], [wx, wy], d(p + 'b1'), d(p + 'b2')), dd = tubeD(cv, armW);
      setE(`arm-${s}-ink`, 'd', dd); setE(`arm-${s}-fill`, 'd', dd); if (E[`arm-${s}-tx`]) setE(`arm-${s}-tx`, 'd', dd);
      const sl = W.sleeve || {};
      if (sl.trim) { const [t0, t1] = sl.trimAt, tr = tubeD(cubicSub(cv, t0, t1), (t) => armW(t0 + (t1 - t0) * t) + 1.8, { n: 3, capS: false, capE: false }); setE(`arm-${s}-tri`, 'd', tr); setE(`arm-${s}-trf`, 'd', tr); }
      if (sl.gloveFrom != null) { const g0 = sl.gloveFrom, lg = tubeD(cubicSub(cv, g0, 1), (t) => armW(g0 + (1 - g0) * t) + 0.8, { n: 5, capS: false }); setE(`arm-${s}-lgi`, 'd', lg); setE(`arm-${s}-lgf`, 'd', lg); }
      const tan = cubicTan(cv, 1), ang = (Math.atan2(tan[1], tan[0]) * 180) / Math.PI - 90 + d(p + 'r');
      const thumbDown = -Math.sin(rad2(ang)), gt = gthumb[s];
      if (thumbDown > 0.28) gt.t = -1; else if (thumbDown < -0.28) gt.t = 1;
      gt.v = reduced || snapThumbs ? gt.t : gt.v + (gt.t - gt.v) * (1 - Math.exp(-gdt / 0.055));
      const kindNow = dis[s === 'l' ? 'gl' : 'gr'];
      setE(`g-${s}-${kindNow}-ta`, 'opacity', f2(clamp((1 + gt.v) / 2, 0, 1))); setE(`g-${s}-${kindNow}-tb`, 'opacity', f2(clamp((1 - gt.v) / 2, 0, 1)));
      const spd = reduced ? 0 : Math.hypot(V[IX[p + 'x']], V[IX[p + 'y']]), smear = clamp((spd - 500) / 3200, 0, 0.32);
      setE(`hand-${s}-t`, 'transform', `translate(${f(wx)} ${f(wy)}) rotate(${f(ang)}) scale(${f2(HAND_K * d(p + 'sx') * (1 - smear * 0.38))} ${f2(HAND_K * d(p + 'sy') * (1 + smear))})`);
      if (s === dis.prop.toLowerCase() && E.prop) {
        const kind = dis[s === 'l' ? 'gl' : 'gr'], gp = GLOVE_GRIP[kind] || [0, 26];
        const eff = (W.accBase ?? 90) + (d('acc') - 90) * (W.accGain ?? 1);
        setE('prop', 'transform', `translate(${gp[0]} ${gp[1]}) rotate(${f(eff - ang)})`);
      }
      if (E.prop2 && dis._p2 === s.toUpperCase()) {
        const kind = dis[s === 'l' ? 'gl' : 'gr'], gp = GLOVE_GRIP[kind] || [0, 26];
        setE('prop2', 'transform', `translate(${gp[0]} ${gp[1]}) rotate(${f(0 - ang)})`);
      }
    }
    if (E.beam) setE('beam', 'opacity', f2(clamp(d('beam'), 0, 1)));
    // ---- whistle chain (inspectrice)
    if (E.chain) renderChain(d, shr);
    // ---- scarf (vault)
    if (E['scarf-1']) { setE('scarf-1', 'transform', `rotate(${f(sec.scarf1.x)} 186 270)`); if (E['scarf-2']) setE('scarf-2', 'transform', `rotate(${f(sec.scarf2.x)} 186 272)`); }
    snapThumbs = false;
    rendered = true;
  }
  function renderMouth(L) {
    const m = mouthS;
    if (m.t < 1 || !rendered) { mixVisemes(m.from, m.to, m.t >= 1 ? 1 : Ease.out(m.t), m.cur); }
    const v = m.cur, mp = mouthPaths(v);
    setE('mouth-s', 'transform', `translate(${f(L.mouth[0])} ${f(L.mouth[1])})`);
    setE('m-lips', 'd', mp.lips); setE('m-clipd', 'd', mp.cav); setE('m-cav', 'd', mp.cav);
    setE('m-cav', 'opacity', mp.ops[0] > 0.5 ? 1 : 0); setE('m-seam', 'opacity', mp.ops[3] > 0.5 ? 1 : 0);
    setE('m-seam', 'd', mp.seam);
    setE('m-teeth', 'y', f(mp.teeth[0])); setE('m-teeth', 'height', f(Math.max(0.01, mp.teeth[1] - mp.teeth[0])));
    setE('m-tongue', 'cx', f(mp.tongue[0])); setE('m-tongue', 'cy', f(mp.tongue[1])); setE('m-tongue', 'rx', f(mp.tongue[2])); setE('m-tongue', 'ry', f(Math.max(0.01, mp.tongue[3])));
    setE('m-tongue', 'opacity', mp.ops[2] > 0.5 ? 1 : 0);
    setE('m-gloss', 'cx', f(mp.gloss[0])); setE('m-gloss', 'cy', f(mp.gloss[1])); setE('m-gloss', 'rx', f(mp.gloss[2])); setE('m-gloss', 'ry', f(mp.gloss[3]));
    setE('m-dimple', 'transform', `translate(${f(mp.dimple[0])} ${f(mp.dimple[1])})`); setE('m-dimple', 'opacity', f2(mp.dimple[2]));
  }
  function renderChain(d, shr) {
    // collar anchor -> whistle (hanging at the hip, swinging) or at the mouth for the whistle pose
    const A = [223, 253 - shr * 0.4];   // torso frame (the torso art is lifted by TORSO_LIFT)
    let end;
    const inMouth = dis.gr === 'pinch';
    if (inMouth) { const ml = faceLayout(clamp(d('turn'), 0, 1.2)).mouth, ang = rad2(d('htilt')), vx = ml[0] + 9, vy = ml[1] + 6; end = [200 + d('hx') + vx * Math.cos(ang) - vy * Math.sin(ang) + 6, TORSO_LIFT + REST.neck[1] + d('hy') + vx * Math.sin(ang) + vy * Math.cos(ang)]; }
    else end = [233 + sec.whistle.x * 0.9, 349 - Math.abs(sec.whistle.x) * 0.1];
    const mid = [(A[0] + end[0]) / 2 + (inMouth ? -10 : 5), (A[1] + end[1]) / 2 + (inMouth ? 26 : 14)];
    setE('chain', 'd', `M${f(A[0])} ${f(A[1])}Q${f(mid[0])} ${f(mid[1])} ${f(end[0])} ${f(end[1])}`);
    setE('whistle', 'transform', `translate(${f(end[0])} ${f(end[1])}) rotate(${f(inMouth ? -8 : sec.whistle.x * 0.6)})`);
  }

  // ====================================================================== frame loop
  function update(dt) {
    time += dt;
    // look target & saccades
    if (!reduced && O.idle) {
      look.nextSac -= dt;
      if (look.nextSac <= 0) { look.nextSac = rr(0.6, 2.0); look.sx = rr(-0.1, 0.1); look.sy = rr(-0.07, 0.07); if (rnd() < 0.12) { look.sx *= 2.2; } }
    } else { look.sx = 0; look.sy = 0; }
    T[IX.lookx] = look.tx; T[IX.looky] = look.ty;
    if (look.target) { T[IX.turn] = clamp(look.target.turn ?? T[IX.turn], 0, 1); }
    updateTweens(dt); updateTimed(dt); updateBlink(dt); updateClip(dt); updateDirector(dt);
    if (mouthS.t < 1) mouthS.t = Math.min(1, mouthS.t + dt / Math.max(0.001, mouthS.dur));
    if (reduced) { for (let i = 0; i < NP; i++) { X[i] = T[i]; V[i] = 0; } }
    else { acc += dt; let n = 0; while (acc >= FIX && n < 10) { stepFixed(FIX); acc -= FIX; n++; } if (n === 10) acc = 0; }
    // mouth mixing uses the eased `t`
    updateFx(dt);
  }
  function frame(now) {
    raf = 0; if (destroyed) return;
    if (!paused) {
      const dt = Math.min(0.05, last ? (now - last) / 1000 : 1 / 60) * speed; last = now;
      const t0 = performance.now(); update(dt); render(); const ms = performance.now() - t0;
      stat.frames++; stat.avg += (ms - stat.avg) * 0.05; if (stat.frames > 30) stat.max = Math.max(stat.max * 0.995, ms);
    } else last = 0;
    if (O.raf) raf = requestAnimationFrame(frame);
  }
  const onVis = () => { if (document.hidden) { paused = true; } else { paused = false; last = 0; } };

  // ====================================================================== public API
  const api = {
    get svg() { return svg; }, get outfit() { return outfitKey; }, get crop() { return cropName; }, get mirror() { return mirrored; }, get pose() { return poseName; }, get mood() { return mood; }, get reduced() { return reduced; },
    setLook, setMood(name) { if (MOODS[name]) { mood = name; applyTargets(); } },
    setPose(name, o2 = {}) { if (!POSES[name]) return; clipS.cur = null; poseName = name; overrides = o2.keep ? overrides : {}; applyTargets(!!o2.snap); },
    setCrop(name) { if (CROPS[name]) { cropName = name; applyCrop(); rendered = false; render(true); } },
    setMirror(b) { mirrored = !!b; applyCrop(); },
    setOutfit, play, stop: stopClip, wink, blink, impulse, fx: fxPreset, setMouth(n, d2) { overrides.mouth = n; setMouth(n, d2); },
    set(over, snap) { Object.assign(overrides, over); applyTargets(snap); },
    clear() { overrides = {}; applyTargets(); },
    step(dt) { const n = Math.max(1, Math.round(dt / (1 / 60))); for (let i = 0; i < n; i++) update(dt / n); render(true); },
    render() { render(true); },
    snap() { applyTargets(true); render(true); },
    setReduced(v) { reduced = !!v; applyTargets(true); },
    pause() { paused = true; }, resume() { paused = false; last = 0; },
    setLimited(hz) { O.limited = hz; }, setIdle(b) { O.idle = !!b; }, setSpeed(v) { speed = clamp(v, 0.1, 4); },
    stats() { return { frames: stat.frames, avgMs: stat.avg, maxMs: stat.max, clip: clipS.cur ? clipS.cur.name : '' }; },
    state: () => ({ ...Object.fromEntries(NAMES.map((n, i) => [n, X[i]])), ry, sec: Object.fromEntries(Object.keys(sec).map((k) => [k, sec[k].x])) }),
    clips: () => Object.keys(clipDefs), poses: () => Object.keys(POSES), outfits: () => OUTFIT_KEYS.slice(), moods: () => Object.keys(MOODS), visemes: () => VISEME_NAMES.slice(),
    destroy() { destroyed = true; if (raf) cancelAnimationFrame(raf); document.removeEventListener('visibilitychange', onVis); if (mq && mq.removeEventListener) mq.removeEventListener('change', onMq); container.innerHTML = ''; svg = null; },
  };
  const onMq = (e) => { reduced = O.reduced ?? e.matches; applyTargets(true); };
  if (mq && mq.addEventListener) mq.addEventListener('change', onMq);
  document.addEventListener('visibilitychange', onVis);

  mount();
  if (O.pose) poseName = O.pose;
  applyTargets(true);
  mixVisemes(mouthS.cur, VISEMES[mouthS.name], 1, mouthS.cur);
  render(true);
  if (O.autoplay && O.raf) raf = requestAnimationFrame(frame);
  return api;
}

// ====================================================================== clips (procedural, named tracks flattened to events)
// event fields: pose, mood, set{channel:value}, mouth, look, impulse{jump,sq,cap,shake,hair...}, fx, wink, blink, spin, cue, outfit
const rep = (arr, f2) => arr.map(f2);
export const CLIPS = {
  spinStart: { dur: 0.5, hold: true, tracks: {   // named tracks: [time, value, extra]
    pose: [[0, 'anticipation']], look: [[0, 'grid']], impulse: [[0, { sq: -1.6, head: -4 }]], cue: [[0, 'spinStart']], mouth: [[0.18, 'wry']] } },
  scatterTease: { dur: 2.4, hold: true, events: [
    { at: 0, pose: 'anticipation', set: { lean: 10, hx: 12 }, look: { nx: 1, ny: -0.5, turn: 0.8 }, mouth: 'wry', cue: 'scatterTease' },
    { at: 0.35, look: { nx: 1, ny: 0.5, turn: 0.85 } }, { at: 0.7, look: { nx: 0.9, ny: -0.1, turn: 0.8 }, set: { lean: 12, hx: 15 } },
    { at: 1.05, look: { nx: 1, ny: 0.6, turn: 0.9 } }, { at: 1.4, look: { nx: 1, ny: -0.6, turn: 0.85 }, fx: 'sparkles', fxOpts: { n: 3 } },
    { at: 1.8, look: { nx: 0.8, ny: 0.1, turn: 0.8 }, set: { lean: 14, hx: 18, bRy: -15 }, mouth: 'oh' } ] },
  winSmall: { dur: 1.6, events: [
    { at: 0, pose: 'smallwin', impulse: { sq: -1.2 }, wink: 'L', winkDur: 0.7, cue: 'winSmall' }, { at: 0.12, impulse: { jump: 520, sq: 1.2 }, fx: 'sparkles', fxOpts: { n: 3 } },
    { at: 0.3, set: { arx: 266, ary: 164 } }, { at: 0.52, set: { arx: 262, ary: 190 } }, { at: 0.8, mouth: 'smirk' }, { at: 1.25, look: 'player' } ] },
  winBig: { dur: 2.8, endPose: 'idle', tracks: {
    pose: [[0, 'anticipation', { set: { sq: -0.2, uy: 14, arx: 250, ary: 360, alx: 150, aly: 360, hipTilt: 0, lean: 0 } }], [0.14, 'bigwin']],
    mouth: [[0, 'grin'], [1.9, 'teeth']], cue: [[0, 'winBig']],
    impulse: [[0.14, { jump: 820, sq: 1.8, hair: 18, cap: -520 }], [0.9, { jump: 430, sq: 0.8, hair: 8 }], [1.4, { jump: 300, sq: 0.5 }]],
    fx: [[0.14, 'burstLines'], [0.32, 'sparkles', { fxOpts: { n: 6 } }], [0.9, 'sparkles']],
    set: [[1.9, { stars: 0 }]], mood: [[1.9, 'happy'], [2.4, 'sly']] } },
  megaWin: { dur: 3.6, endPose: 'idle', events: [
    { at: 0, pose: 'anticipation', set: { sq: -0.25, uy: 16 }, cue: 'megaWin' },
    { at: 0.14, pose: 'bigwin', impulse: { jump: 980, sq: 2, hair: 24, cap: -620, capSpin: 600 }, spin: 2, spinDur: 0.9, fx: 'confetti', fxOpts: { n: 36 } },
    { at: 0.6, fx: 'sparkles', fxOpts: { n: 8 } }, { at: 1.1, impulse: { jump: 520, sq: 1 }, fx: 'confetti', fxOpts: { n: 18 } }, { at: 1.7, impulse: { jump: 380, sq: 0.7 } },
    { at: 2.2, impulse: { jump: 260, sq: 0.5 }, fx: 'sparkles' }, { at: 2.9, mood: 'sly', set: { stars: 0 } } ] },
  shock: { dur: 1.8, endPose: 'idle', events: [
    { at: 0, pose: 'shock', impulse: { jump: 260, sq: 1.4, cap: -1500, capSpin: 380, shake: 40, hair: -14 }, fx: 'burstLines', cue: 'shock' },
    { at: 0.12, fx: 'sweat' }, { at: 0.35, impulse: { shake: -50 } }, { at: 0.6, impulse: { shake: 30 } }, { at: 1.3, mood: 'worried', set: { cy: 0 } } ] },
  lose: { dur: 2.2, endPose: 'idle', events: [
    { at: 0, pose: 'shrug', impulse: { sq: -0.5 }, cue: 'lose' }, { at: 0.3, look: { nx: 0.6, ny: -0.8, turn: 0.4 } }, { at: 0.7, look: { nx: -0.6, ny: -0.8, turn: 0.4 }, fx: 'puff' },
    { at: 1.2, look: { nx: 0.9, ny: 0.2, turn: 0.5 }, set: { shr: 2 } }, { at: 1.8, look: 'grid' } ] },
  freeSpinStart: { dur: 2.2, endPose: 'idle', events: [
    { at: 0, pose: 'salute', impulse: { sq: -0.8 }, wink: 'L', cue: 'freeSpinStart' }, { at: 0.2, fx: 'ring' }, { at: 0.3, set: { beam: 0 } }, { at: 1.0, look: 'grid', mouth: 'smirk' } ] },
  freeSpinEnd: { dur: 2.6, endPose: 'idle', events: [ { at: 0, pose: 'curtsy', cue: 'freeSpinEnd' }, { at: 0.5, fx: 'sparkles', fxOpts: { n: 5 } }, { at: 1.4, set: { lean: 6, uy: 0 } }, { at: 2.0, look: 'player' } ] },
  curtsy: { dur: 2.4, endPose: 'idle', events: [ { at: 0, pose: 'curtsy' }, { at: 0.5, fx: 'sparkles', fxOpts: { n: 4 } }, { at: 1.3, set: { lean: 4, uy: 4 } } ] },
  meterMilestone: { dur: 1.8, endPose: 'idle', events: [
    { at: 0, pose: 'point', look: 'meter', set: { arx: 318, ary: 168, arr: -60, arb1: -26, arb2: 14, prop: '', beam: 0, turn: 0.6 }, cue: 'meterMilestone' }, { at: 0.2, fx: 'ring' }, { at: 1.2, look: 'player' } ] },
  checkFlashlight: { dur: 2.6, events: [
    { at: 0, set: { alx: 190, aly: 252, alb1: 40, alb2: 30, acc: 150, lookx: -0.2, looky: 0.6, turn: 0.35, htilt: -4 }, look: 'hand' },
    { at: 0.5, set: { beam: 1 } }, { at: 0.7, set: { beam: 0 } }, { at: 0.95, set: { beam: 1 } }, { at: 1.25, set: { beam: 0 }, mouth: 'smirk' }, { at: 1.6, look: 'player' } ] },
  blowWhistle: { dur: 2.4, events: [
    { at: 0, pose: 'whistle', cue: 'whistle' }, { at: 0.35, fx: 'notes', impulse: { sq: 0.3 } }, { at: 0.9, fx: 'notes' }, { at: 1.5, set: { lowL: 0.1, uL: 0.55 }, mouth: 'smirk' } ] },
  examineNails: { dur: 3, events: [
    { at: 0, set: { arx: 236, ary: 214, arb1: -34, arb2: -20, arr: 150, turn: 0.4 }, look: 'hand' }, { at: 0.2, mood: 'bored' }, { at: 1.6, look: { nx: 0.8, ny: -0.2, turn: 0.6 }, mouth: 'wry' }, { at: 2.2, mood: 'sly', look: 'player' } ] },
  glancePlayer: { dur: 1.8, events: [ { at: 0, look: 'player', set: { turn: 0.15, htilt: -6 }, wink: 'L', winkDur: 0.5, mouth: 'grin' }, { at: 1.2, look: 'grid', mouth: 'smirk' } ] },
  hairFlip: { dur: 2, events: [
    { at: 0, set: { arx: 150, ary: 122, arb1: -34, arb2: -26, arr: 40, gr: 'open', htilt: 6, turn: 0.3 }, impulse: { hair: 22 } }, { at: 0.5, impulse: { hair: -18 }, set: { htilt: -4 } }, { at: 1.3, look: 'grid' } ] },
  shiftWeight: { dur: 1.2, events: [ { at: 0, set: { hipX: -3, hipTilt: 3, lean: -2, htilt: 2, lax: 4, rax: -6 } }, { at: 0.6, set: { hipX: 6, hipTilt: -4, lean: 3, htilt: -3, lax: -12, rax: 5 } } ] },
  impatient: { dur: 3, endPose: 'idle', events: [ { at: 0, pose: 'impatient' }, { at: 0.35, set: { ray: -6 } }, { at: 0.55, set: { ray: 0 } }, { at: 0.9, set: { ray: -6 } }, { at: 1.1, set: { ray: 0 } }, { at: 1.6, look: { nx: -0.8, ny: -0.5, turn: 0.4 }, mood: 'bored' } ] },
  laugh: { dur: 2, endPose: 'idle', events: [ { at: 0, pose: 'laugh' }, { at: 0.2, set: { sq: 0.12 } }, { at: 0.4, set: { sq: -0.1 } }, { at: 0.6, set: { sq: 0.12 } }, { at: 0.8, set: { sq: -0.1 } }, { at: 1.0, set: { sq: 0.1 } } ] },
  outfitChange: { dur: 1.6, endPose: 'idle', events: [ { at: 0, pose: 'idle' } ] },
};
export { OUTFIT_KEYS };
