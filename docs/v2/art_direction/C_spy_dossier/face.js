// Direction C: proposed eye + brow variant for the heroine (a drawn face override applied on top of the rig's last frame).
// It mirrors, with new constants, eyeGeom() / browPath() / eyeMarkup() of docs/research2/art/mambo_art.mjs, so the same
// numbers can be ported 1:1 (see README "Eyes"). What changes, and why:
//   1. Shape: the tall 34 x 38 egg becomes a wider cat-eye almond (38 x 30), outer corner 3 units higher (tilt = confidence, 60s glamour).
//   2. No uncanny half-lid: the resting lid sits at u = 0.86-0.92 instead of 0.45-0.5 and is SKIN coloured (it was a mustard
//      eyeshadow plate that read as a yellow shutter over half the eye). "Sly" is now carried by the brows and the gaze, not the lid.
//   3. Readable iris: a turquoise disc (11 x 12.5) with a small ink pupil (5 x 6.2) and one big round highlight + one small;
//      the old near-black 9.4 x 14.6 iris with a 7.4 x 12.6 pupil was a solid black blob at game size.
//   4. Winged lash line (the flick doubles: 6 -> 10 out, 4 -> 7 up) and 3 thick lashes on the outer third instead of 5 thin ones all along.
//   5. Brows: thinner tapered strokes with a higher arch and a clean tail; the far brow is raised (the "one eyebrow up" look).
import { faceLayout } from '../../../research2/art/mambo_art.mjs';

const INK = '#2B1A12', TURQ = '#2E8C8C', SKIN = '#F4E8C8', WHITE = '#FFFBF0', TURQ_DK = '#1B5C5E';
const f = (n) => Math.round(n * 10) / 10;
const lp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const P = (p) => `${f(p[0])} ${f(p[1])}`;
const cubicAt = (c, t) => { const u = 1 - t; return [0, 1].map((i) => u * u * u * c[0][i] + 3 * u * u * t * c[1][i] + 3 * u * t * t * c[2][i] + t * t * t * c[3][i]); };

// resting face for the mock-up (a rig MOODS entry): open, confident, one brow up, glancing at the player
export const FACE_MOOD = { uL: 0.8, uR: 0.88, lowL: 0.1, lowR: 0.08, slL: 1.5, slR: 1, joyL: 0, joyR: 0,
  bLy: -1, bLr: -3, bLa: 12, bRy: -9, bRr: -12, bRa: 15, lookx: -0.45, looky: 0.1, mouth: 'smirk' };

// new eye geometry (eye-local, s = +1 screen-right eye, -1 near/screen-left eye)
export function eyeGeom2(s, p) {
  const X = (x) => s * x, u = Math.min(1, Math.max(0, p.u ?? 0.88));
  const Pi = [X(-18), 2], Po = [X(18), -1];
  const UP = [[X(-18), -25], [X(15), -28]];
  const LO = [[X(19), 17], [X(-16), 21]];
  const joy = Math.min(1, Math.max(0, p.joy ?? 0));
  const KC = [[X(-11), 7], [X(11), 5]], KJ = [[X(-13), -12], [X(13), -14]];   // closed-lid line: neutral / happy (arched smile)
  const K = [lp(KC[0], KJ[0], joy), lp(KC[1], KJ[1], joy)];
  const lid = [lp(K[0], UP[0], u), lp(K[1], UP[1], u)];
  const low = Math.max(Math.max(0, 1 - u / 0.35), Math.max(0, p.low ?? 0.1) * 0.5, joy), lowB = [lp([LO[1][0], LO[1][1]], K[0], low), lp([LO[0][0], LO[0][1]], K[1], low)];
  const flick = [Po[0] + X(10), Po[1] - 7];
  const almond = `M${P(Pi)}C${P(UP[0])} ${P(UP[1])} ${P(Po)}C${P(LO[0])} ${P(LO[1])} ${P(Pi)}Z`;
  const upper = `M${P(Pi)}C${P(UP[0])} ${P(UP[1])} ${P(Po)}`;
  const lower = `M${P(Po)}C${P(LO[0])} ${P(LO[1])} ${P(Pi)}`;
  const lidLine = `M${P(Pi)}C${P(lid[0])} ${P(lid[1])} ${P(Po)}Q${f(Po[0] + X(6))} ${f(Po[1] - 2)} ${P(flick)}`;
  const upperFill = `M${P(Pi)}C${P(UP[0])} ${P(UP[1])} ${P(Po)}C${P(lid[1])} ${P(lid[0])} ${P(Pi)}Z`;
  const lowerFill = `M${P(Pi)}C${P(lowB[0])} ${P(lowB[1])} ${P(Po)}C${P(LO[0])} ${P(LO[1])} ${P(Pi)}Z`;
  const near = s < 0, curve = [Pi, lid[0], lid[1], Po];
  const ts = near ? [0.7, 0.84, 0.96] : [0.8, 0.95], ang = near ? [-70, -45, -22] : [-55, -28], len = near ? [9, 11, 10] : [7, 8];
  let lashes = '';
  ts.forEach((t, i) => { const q = cubicAt(curve, t), a = ang[i] * Math.PI / 180, e = [q[0] + X(Math.cos(a)) * len[i], q[1] + Math.sin(a) * len[i]];
    lashes += `M${P(q)}Q${f((q[0] + e[0]) / 2 - X(1.5))} ${f((q[1] + e[1]) / 2 - 1.5)} ${P(e)}`; });
  return { almond, upper, lower, lidLine, upperFill, lowerFill, lashes };
}
// new brow: tapered (thick head, fine tail), higher arch, a little tail hook
export function browPath2(s, rot, arch, len = 1) {
  const X = (x) => s * x, n = 11, top = [], bot = [];
  const cr = Math.cos(rot * s * Math.PI / 180), sr = Math.sin(rot * s * Math.PI / 180);
  const yAt = (u) => -arch * Math.sin(Math.PI * Math.pow(u, 0.8)) * 1.05 + 4.5 * u * u * u - 1;
  for (let i = 0; i < n; i++) {
    const u = i / (n - 1), x = X((-18 + 42 * u) * len), y = yAt(u);
    const x2 = X((-18 + 42 * (u + 1e-3)) * len), y2 = yAt(u + 1e-3);
    let tx = x2 - x, ty = y2 - y; const Lh = Math.hypot(tx, ty) || 1; tx /= Lh; ty /= Lh;
    const t = 2.7 * (1 - u) + 0.45;
    const rp = (px, py) => [px * cr - py * sr, px * sr + py * cr];
    top.push(rp(x - ty * t, y + tx * t)); bot.push(rp(x + ty * t, y - tx * t));
  }
  return 'M' + top.concat(bot.reverse()).map(P).join('L') + 'Z';
}

// apply to a rendered rig (container el, id prefix pre) after its last step
export function applyFace(el, pre, mood = FACE_MOOD, turn = 1.05) {
  const L = faceLayout(turn), q = (id) => el.querySelector('#' + pre + id);
  for (const s of [-1, 1]) {
    const id = s < 0 ? 'eye-l' : 'eye-r', k = s < 0 ? 'L' : 'R';
    const g = eyeGeom2(s, { u: mood['u' + k], low: mood['low' + k], joy: mood['joy' + k] });
    if ((mood['u' + k] ?? 1) < 0.15) { q(id + '-upper').setAttribute('opacity', '0'); }
    const root = q(id + '-s'); if (!root) continue;
    q(id + '-sclera').setAttribute('d', g.almond);
    const clip = el.querySelector(`#${pre}${id}-clip path`); if (clip) clip.setAttribute('d', g.almond);
    q(id + '-upper').setAttribute('d', g.upper); q(id + '-upper').setAttribute('opacity', '1');
    const lowOut = [...root.querySelectorAll('path')].find((p) => p.getAttribute('stroke-width') === '3.4');
    if (lowOut) { lowOut.setAttribute('d', g.lower); lowOut.setAttribute('stroke-width', '2.4'); }
    q(id + '-lidfill').setAttribute('d', g.upperFill); q(id + '-lidfill').setAttribute('fill', SKIN);
    q(id + '-lower').setAttribute('d', g.lowerFill);
    q(id + '-lashline').setAttribute('d', g.lidLine); q(id + '-lashline').setAttribute('stroke-width', '5');
    q(id + '-lashes').setAttribute('d', g.lashes); q(id + '-lashes').setAttribute('stroke-width', '3.6');
    // iris: turquoise disc, ink ring, small pupil, big round highlight
    const disc = q(id + '-iris-disc'); disc.setAttribute('rx', '11'); disc.setAttribute('ry', '12.5'); disc.setAttribute('cy', '-1'); disc.setAttribute('fill', TURQ); disc.setAttribute('stroke', INK); disc.setAttribute('stroke-width', '1.8');
    const refl = disc.nextElementSibling; if (refl) { refl.setAttribute('cy', '6.5'); refl.setAttribute('rx', '7'); refl.setAttribute('ry', '3.4'); refl.setAttribute('fill', TURQ_DK); refl.setAttribute('opacity', '.6'); }
    const pu = q(id + '-pupil'); pu.setAttribute('rx', '5'); pu.setAttribute('ry', '6.2'); pu.setAttribute('cy', '-1');
    const gl = q(id + '-glint'); gl.setAttribute('d', 'M4 -9.4a3.8 3.8 0 1 0 0.01 0Z'); gl.setAttribute('fill', WHITE);
    const small = gl.nextElementSibling; if (small) { small.setAttribute('cx', '-3.6'); small.setAttribute('cy', '4.4'); small.setAttribute('r', '1.6'); }
    // brow
    const kx = s < 0 ? L.kxNear : L.kxFar;
    const bw = q(s < 0 ? 'brow-l' : 'brow-r'); bw.setAttribute('d', browPath2(s, mood['b' + k + 'r'], mood['b' + k + 'a'], kx * 0.85)); bw.setAttribute('stroke-width', '0.8');
  }
}
