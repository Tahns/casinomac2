// Agent Mambo: ten 1960s spy-jazz props, all hand-built in code (no image files, no generative AI).
// Style: flat fills offset from a thick ink outline (screen-print misregistration), halftone on shadow faces,
// ONE white highlight stroke, distinct silhouette + hue per symbol, readable at 40 px.
// Markup is INLINE (not <use>) so ancestor selectors (.antic .cell.s-S ...) reach inner parts.
// Idle = limited animation (steps()). All CSS for the symbol insides lives in the <style id="mb-sym-css"> below.
// State hooks (put on the .cell, or any ancestor): .win (squash pop owned by styles.css; S/W get extra frames here),
//   .antic ancestor (board-wrap.antic) or .cell.hot (scatter anticipation: folder opens, glow, shake), .cell.dim/.adim (calm: no inner anim).

export const SYMBOLS = ['H1', 'H2', 'H3', 'H4', 'L1', 'L2', 'L3', 'L4', 'W', 'S'];

// dominant colour per symbol (puffs / sparks / glows) - palette DESIGN 4.1
export const SYM_COLOR = {
  H1: '#FFD23F', H2: '#1FB5A3', H3: '#F5799F', H4: '#F08A2B', L1: '#9A7BD0',
  L2: '#F0472F', L3: '#6FA7D9', L4: '#F5799F', W: '#FFD23F', S: '#F0472F',
};

const INK = '#14102B', CREAM = '#FBF1D9', MX = 2.6, MY = 2.2; // misregistration offset (100 px symbol box)
const C = { indigo: '#2B2A6B', teal: '#1FB5A3', coral: '#F0472F', flam: '#F5799F', lemon: '#FFD23F', lilac: '#9A7BD0', lime: '#A5D63B', steel: '#6FA7D9', brass: '#E8A92B', orange: '#F08A2B', aub: '#3B1F52', tan: '#D9B77A' };
const f = (n) => Math.round(n * 100) / 100;
const P = (pts) => 'M' + pts.map((q) => `${f(q[0])} ${f(q[1])}`).join('L') + 'Z';
const ELL = (cx, cy, rx, ry) => `M${f(cx - rx)} ${cy}A${rx} ${ry} 0 1 0 ${f(cx + rx)} ${cy}A${rx} ${ry} 0 1 0 ${f(cx - rx)} ${cy}Z`;
const RR = (x, y, w, h, r) => `M${x + r} ${y}H${x + w - r}Q${x + w} ${y} ${x + w} ${y + r}V${y + h - r}Q${x + w} ${y + h} ${x + w - r} ${y + h}H${x + r}Q${x} ${y + h} ${x} ${y + h - r}V${y + r}Q${x} ${y} ${x + r} ${y}Z`;
function starPts(cx, cy, n, ro, ri, rot = -Math.PI / 2) {
  const out = [];
  for (let i = 0; i < n * 2; i++) { const a = rot + i * Math.PI / n, r = i % 2 ? ri : ro; out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); }
  return out;
}

// flat shape: fill offset from the outline + optional halftone + outline
function T(d, fill, o = {}) {
  let g = `<path d="${d}" fill="${fill}" transform="translate(${MX} ${MY})"/>`;
  if (o.ht) g += `<path d="${d}" fill="url(#mb-ht${o.ht === 2 ? 2 : ''})" transform="translate(${MX} ${MY})"/>`;
  if (!o.noline) g += `<path d="${d}" fill="none" stroke="${INK}" stroke-width="${o.sw || 4}" stroke-linejoin="round" stroke-linecap="round"/>`;
  return g;
}
const fillOnly = (d, fill, ht) => T(d, fill, { ht, noline: true });
const ln = (d, sw = 2.4, col = INK) => `<path d="${d}" fill="none" stroke="${col}" stroke-width="${sw}" stroke-linejoin="round" stroke-linecap="round"/>`;
const hl = (d, w = 3.6) => `<path d="${d}" fill="none" stroke="#fff" stroke-width="${w}" stroke-linecap="round"/>`;
const dot = (cx, cy, r, fill, sw = 0) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}"${sw ? ` stroke="${INK}" stroke-width="${sw}"` : ''}/>`;
const spark = (cx, cy, r, fill = '#fff', cls = '', sw = 1.8) => `<path class="${cls}" d="M${cx} ${cy - r}L${f(cx + r * .28)} ${f(cy - r * .28)}L${cx + r} ${cy}L${f(cx + r * .28)} ${f(cy + r * .28)}L${cx} ${cy + r}L${f(cx - r * .28)} ${f(cy + r * .28)}L${cx - r} ${cy}L${f(cx - r * .28)} ${f(cy - r * .28)}Z" fill="${fill}" stroke="${INK}" stroke-width="${sw}" stroke-linejoin="round"/>`;
const grp = (cls, inner, extra = '') => `<g class="${cls}" ${extra}>${inner}</g>`;

// ---------------------------------------------------------------- H1 Vault Safe (square, gold)
function safe() {
  let g = T(RR(8, 8, 84, 84, 11), C.brass, {});
  g += fillOnly('M92 40V81Q92 92 81 92H40Q70 86 92 40Z', '#B97F12', 1);
  g += T(RR(17, 17, 66, 66, 7), C.lemon, { sw: 3 });
  g += fillOnly('M83 44V76Q83 83 76 83H48Q72 78 83 44Z', '#E8B820', 1);
  // hinge bars
  g += T(RR(4, 25, 10, 14, 3), CREAM, { sw: 2.8 }) + T(RR(4, 62, 10, 14, 3), CREAM, { sw: 2.8 });
  // dial: ring + 8-point star
  g += `<circle cx="50" cy="50" r="22" fill="${C.brass}" stroke="${INK}" stroke-width="3.4" transform="translate(${MX} ${MY})"/>`;
  g += `<circle cx="50" cy="50" r="22" fill="none" stroke="${INK}" stroke-width="3.4"/>`;
  g += grp('mb-dial', `<path d="${P(starPts(50, 50, 8, 17, 8.5))}" fill="${C.coral}" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round"/>${dot(50, 50, 4.2, CREAM, 2)}${ln('M50 33.5V38', 2.6)}`, 'style="transform-box:fill-box;transform-origin:50% 50%"');
  // lock handle
  g += T(RR(70, 44, 9, 13, 4), CREAM, { sw: 2.8 });
  g += hl('M22 28Q22 22 30 22H42', 3.6);
  g += spark(80, 20, 9, '#fff', 'mb-tw');
  return g;
}

// ---------------------------------------------------------------- H2 Atomic Fizz (inverted triangle, teal)
function fizz() {
  // base + stem first
  let g = T(ELL(50, 90, 20, 5.5), C.teal, { sw: 3.4 });
  g += T(RR(45.5, 62, 9, 28, 3), C.teal, { sw: 3.4 });
  // cone glass
  const cone = 'M10 22Q10 17 16 17H84Q90 17 90 22L53 68Q50 72 47 68Z';
  g += T(cone, C.teal);
  g += fillOnly('M90 22L53 68Q50 72 50 72V44Z', '#14887B', 1);
  // fizz (lime) filling the top of the glass
  g += fillOnly('M15 24H85L70 43H30Z', C.lime);
  g += ln('M30 43H70', 2.2);
  g += grp('mb-bub', `${dot(40, 36, 2.6, CREAM, 1.4)}${dot(56, 32, 2, CREAM, 1.2)}${dot(49, 52, 2.2, CREAM, 1.2)}`);
  g += ln(cone, 4);
  // foam blobs over the rim
  g += T('M14 17Q16 8 25 11Q30 4 38 10Q46 5 50 12Q58 5 64 11Q74 7 76 15Q85 12 86 17Z', CREAM, { sw: 3 });
  // lemon-orange slice on the rim
  g += `<g transform="translate(78 17)">${T(ELL(0, 0, 13, 13), C.orange, { sw: 3.4 })}${fillOnly(ELL(0, 0, 8.5, 8.5), C.lemon)}${ln('M0 -8.5V8.5M-8.5 0H8.5M-6 -6L6 6M6 -6L-6 6', 1.5)}</g>`;
  // atom-orbit swizzle
  g += ln('M43 23L30 -1', 3.2);
  g += `<g transform="translate(27 5)">${grp('mb-orbit', `<ellipse rx="11" ry="4.2" fill="none" stroke="${INK}" stroke-width="2.4"/><ellipse rx="11" ry="4.2" fill="none" stroke="${INK}" stroke-width="2.4" transform="rotate(60)"/><ellipse rx="11" ry="4.2" fill="none" stroke="${INK}" stroke-width="2.4" transform="rotate(-60)"/>`)}${dot(0, 0, 3.6, C.coral, 1.8)}</g>`;
  g += hl('M17 25L38 55', 3.4);
  return g;
}

// ---------------------------------------------------------------- H3 Hi-Fi Vinyl (circle, aubergine + flamingo label)
function vinyl() {
  let g = T(RR(34, 32, 60, 60, 4), CREAM, { sw: 3.6 });
  g += ln('M84 32L94 42', 2); // sleeve corner fold
  g += fillOnly('M94 62V88Q94 92 90 92H64Z', '#E6D3A8', 1);
  g += T(ELL(46, 48, 41, 41), C.aub, { sw: 4 });
  g += `<path d="M46 7A41 41 0 0 1 87 48A41 41 0 0 1 46 89Q80 70 80 40Z" fill="url(#mb-ht)" transform="translate(${MX} ${MY})"/>`;
  g += `<g fill="none" stroke="${C.lilac}" stroke-width="2.2">${[33, 27, 21].map((r) => `<circle cx="46" cy="48" r="${r}"/>`).join('')}</g>`;
  g += grp('mb-vshine', hl('M20 36A28 28 0 0 1 36 22', 4));
  g += T(ELL(46, 48, 13, 13), C.flam, { sw: 3 });
  g += `<path d="${P(starPts(46, 48, 5, 7.5, 3))}" fill="${INK}"/>`;
  g += dot(46, 48, 1.3, CREAM);
  return g;
}

// ---------------------------------------------------------------- H4 Bongos (two lobes, orange)
function bongos() {
  const drum = (cx, top, w, h, dark) => {
    const x0 = cx - w / 2, x1 = cx + w / 2, bot = top + h;
    let d = T(`M${x0} ${top}L${x0 + 3} ${bot - 4}Q${cx} ${bot + 5} ${x1 - 3} ${bot - 4}L${x1} ${top}Z`, C.orange);
    d += fillOnly(`M${cx + w * .12} ${top + 4}L${x1} ${top}L${x1 - 3} ${bot - 4}Q${cx + w * .3} ${bot + 2} ${cx + w * .1} ${bot + 2}Z`, '#C0601A', 1);
    d += ln(`M${x0 + 4} ${bot - 14}Q${cx} ${bot - 8} ${x1 - 4} ${bot - 14}`, 2.4);
    // lemon lugs (three) under the skin rim
    for (const k of [-1, 0, 1]) { const lx = cx + k * w * .3; d += `<g>${T(RR(lx - 3, top + 7, 6, 11, 2.5), C.lemon, { sw: 2.2 })}${ln(`M${lx} ${top + 18}V${bot - 12}`, 1.8)}</g>`; }
    d += T(ELL(cx, top, w / 2 + 1, 8.5), CREAM, { sw: 3.6 });
    d += ln(`M${cx - w / 2 + 5} ${top + 1}Q${cx} ${top + 6} ${cx + w / 2 - 5} ${top + 1}`, 1.6, '#E0C48A');
    return d;
  };
  let g = T(RR(40, 54, 22, 9, 3), C.brass, { sw: 3 });
  g += drum(27, 33, 40, 55) + drum(73, 41, 38, 48);
  g += T(RR(40, 54, 22, 9, 3), C.brass, { sw: 3 });
  g += hl('M13 52V70', 3.4);
  g += spark(88, 22, 8, '#fff', 'mb-tw');
  return g;
}

// ---------------------------------------------------------------- L1 Fedora (dome + wide brim, navy)
function fedora() {
  let g = T('M3 66Q2 80 50 82Q98 80 97 66Q94 52 50 52Q6 52 3 66Z', C.indigo);
  g += fillOnly('M97 66Q94 52 50 52Q80 56 84 68Q88 76 50 82Q98 80 97 66Z', '#14124A', 1);
  g += T('M22 66Q18 26 36 20Q43 18 50 26Q57 18 64 20Q82 26 78 66Q50 74 22 66Z', C.indigo);
  g += fillOnly('M64 20Q82 26 78 66Q66 69 60 68Q70 40 64 20Z', '#14124A', 1);
  g += ln('M36 22Q43 34 50 26', 2.6);
  // coral band
  g += T('M21.5 56Q50 64 78.5 56L78 66Q50 74 22 66Z', C.coral, { sw: 3 });
  // feather
  g += grp('mb-feather', `${T('M64 62Q66 48 78 40Q82 38 84 40Q82 52 72 60Q68 64 64 62Z', C.lemon, { sw: 2.6 })}${ln('M65 62Q74 52 83 41', 1.8)}`, 'style="transform-box:fill-box;transform-origin:10% 90%"');
  g += hl('M27 56Q25 34 34 27', 3.4);
  return g;
}

// ---------------------------------------------------------------- L2 Rotary Phone (rounded box + handset arch, coral)
function phone() {
  let g = T('M8 56Q8 46 18 46H82Q92 46 92 56V84Q92 92 84 92H16Q8 92 8 84Z', C.coral);
  g += fillOnly('M92 62V84Q92 92 84 92H44Q80 88 92 62Z', '#B5321F', 1);
  // handset arch on top
  g += grp('mb-hand', `${T('M10 42Q8 20 30 20H70Q92 20 90 42L78 44Q78 33 68 33H32Q22 33 22 44Z', C.indigo)}${T(RR(5, 36, 22, 14, 5), C.indigo, { sw: 3.4 })}${T(RR(73, 36, 22, 14, 5), C.indigo, { sw: 3.4 })}${hl('M30 26H55', 3.2)}`, 'style="transform-box:fill-box;transform-origin:50% 100%"');
  // dial disc + 5 holes
  g += `<circle cx="50" cy="69" r="19" fill="${CREAM}" stroke="${INK}" stroke-width="3.2" transform="translate(${MX} ${MY})"/><circle cx="50" cy="69" r="19" fill="none" stroke="${INK}" stroke-width="3.4"/>`;
  g += grp('mb-rot', [0, 1, 2, 3, 4].map((i) => { const a = Math.PI * (0.95 + i * 0.28); return dot(f(50 + Math.cos(a) * 13), f(69 + Math.sin(a) * 13), 3.3, C.coral, 1.9).replace(/y="/, 'y="'); }).join('') + dot(50, 69, 4.2, C.coral, 2), 'style="transform-box:fill-box;transform-origin:50% 50%"');
  g += ln('M63 60Q68 66 66 74', 2.2);
  g += hl('M14 56V66', 3.4);
  return g;
}

// ---------------------------------------------------------------- L3 Magnifier (circle + diagonal handle, steel blue)
function magnifier() {
  let g = '';
  g += `<path d="M66 66L88 88" stroke="${INK}" stroke-width="16" stroke-linecap="round"/><path d="M66 66L88 88" stroke="#4A4678" stroke-width="9" stroke-linecap="round" transform="translate(-.6 -.6)"/>`;
  g += `<path d="M66 66L74 74" stroke="${INK}" stroke-width="18" stroke-linecap="round"/><path d="M66 66L74 74" stroke="${C.brass}" stroke-width="11" stroke-linecap="round"/>`;
  g += T(ELL(40, 40, 34, 34), C.brass, { sw: 4 });
  g += `<circle cx="40" cy="40" r="25.5" fill="${C.steel}"/>`;
  g += `<path d="M65.5 40A25.5 25.5 0 0 1 40 65.5Q58 56 58 36Z" fill="url(#mb-ht)"/>`;
  g += ln(ELL(40, 40, 25.5, 25.5), 3.2);
  g += grp('mb-glint', hl('M24 34Q27 24 38 22', 4.4) + hl('M23 42V43', 4.4));
  g += spark(72, 20, 8.5, '#fff', 'mb-tw');
  return g;
}

// ---------------------------------------------------------------- L4 Bow Tie (butterfly, flamingo)
function bowtie() {
  const wing = (s) => {
    const X = (x) => (s < 0 ? 100 - x : x);
    return `M${X(44)} 46Q${X(26)} 38 ${X(6)} 24Q${X(1)} 22 ${X(2)} 30V70Q${X(1)} 78 ${X(6)} 76Q${X(26)} 62 ${X(44)} 54Z`;
  };
  let g = T(wing(1), C.flam) + T(wing(-1), C.flam);
  g += fillOnly('M56 54Q74 62 94 76Q99 78 98 70V50Q74 60 56 54Z', '#C8486F', 1);
  g += fillOnly('M44 54Q26 62 6 76Q1 78 2 70V50Q26 60 44 54Z', '#C8486F', 1);
  g += ln('M16 33Q22 50 16 67M84 33Q78 50 84 67', 2);
  g += `${dot(18, 40, 3.2, CREAM, 1.5)}${dot(28, 52, 3.2, CREAM, 1.5)}${dot(17, 61, 2.6, CREAM, 1.3)}${dot(82, 40, 3.2, CREAM, 1.5)}${dot(72, 52, 3.2, CREAM, 1.5)}${dot(83, 61, 2.6, CREAM, 1.3)}`;
  g += grp('mb-knot', `${T(RR(41, 36, 18, 28, 6), '#E04F80', { sw: 3.6 })}${hl('M46 42V54', 3)}`, 'style="transform-box:fill-box;transform-origin:50% 50%"');
  g += hl('M10 33L26 42', 3.2);
  return g;
}

// ---------------------------------------------------------------- W Mambo Star (12-point starburst, lemon) + sparkle state
function wild() {
  const burst = P(starPts(50, 44, 12, 48, 36));
  let g = grp('mb-wburst', T(burst, C.lemon, { sw: 3.8 }) + `<path d="${P([[50, 44], [86, 22], [96, 46], [86, 70], [60, 92]])}" fill="url(#mb-ht)" clip-path="url(#mb-wclip)" transform="translate(${MX} ${MY})"/>` + ln(burst, 3.8), 'style="transform-box:fill-box;transform-origin:50% 50%"');
  g += `<circle cx="50" cy="44" r="31" fill="${CREAM}" stroke="${INK}" stroke-width="3.4" transform="translate(${MX} ${MY})"/><circle cx="50" cy="44" r="31" fill="none" stroke="${INK}" stroke-width="3.6"/>`;
  g += `<circle cx="50" cy="44" r="25" fill="${C.lilac}" stroke="${INK}" stroke-width="2.4"/>`;
  g += `<path d="M75 44A25 25 0 0 1 50 69Q66 58 64 38Z" fill="url(#mb-ht)"/>`;
  // winged eyes (cut paper)
  const eye = (cx, s) => `<path d="M${cx - 9 * s} 42Q${cx} 33 ${cx + 9 * s} 40L${cx + 14 * s} 35L${cx + 12 * s} 43Q${cx} 48 ${cx - 9 * s} 42Z" fill="${CREAM}" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/>${dot(cx + 0.5 * s, 41, 3.4, INK)}${dot(cx + 1.5 * s, 39.8, 1, '#fff')}`;
  g += eye(40, -1).replace(/<path/, '<path class="mb-eye"') + eye(60, 1);
  g += ln('M31 33Q40 29 47 33M53 33Q60 29 69 33', 2.2);
  // lips
  g += `<path d="M42 55Q46 51 50 54Q54 51 58 55Q50 63 42 55Z" fill="${C.coral}" stroke="${INK}" stroke-width="2.2" stroke-linejoin="round"/><path d="M43.5 55Q50 57.5 56.5 55" fill="none" stroke="${INK}" stroke-width="1.4" stroke-linecap="round"/>`;
  g += hl('M32 33Q36 24 46 21', 3.4);
  // banner
  g += T('M16 77H84L80 87L84 97H16L20 87Z', C.coral, { sw: 3.4 });
  g += `<text x="50" y="92.6" text-anchor="middle" font-family="Impact,'Arial Black',system-ui,sans-serif" font-weight="900" font-size="15" letter-spacing="1.5" fill="${CREAM}" stroke="${INK}" stroke-width="2.4" paint-order="stroke" stroke-linejoin="round">WILD</text>`;
  // sparkle state (hidden at rest; .cell.s-W animates them, stronger on .win)
  g += grp('mb-sp', spark(10, 12, 9, '#fff', 'mb-s1') + spark(92, 14, 8, C.lemon, 'mb-s2', 1.6) + spark(95, 62, 6, '#fff', 'mb-s3') + spark(6, 60, 7, C.lemon, 'mb-s4', 1.6) + spark(50, 2, 6, '#fff', 'mb-s5'));
  return g;
}

// ---------------------------------------------------------------- S Classified Dossier (scatter, tilted vellum folder)
function dossier() {
  // closed state
  let closed = T('M10 24Q10 18 16 18H38L44 25H82Q90 25 90 31V84Q90 90 84 90H16Q10 90 10 84Z', C.tan);
  closed += T('M10 36Q10 30 16 30H84Q90 30 90 36V84Q90 90 84 90H16Q10 90 10 84Z', CREAM);
  closed += fillOnly('M90 56V84Q90 90 84 90H48Q82 84 90 56Z', '#E9D7A8', 1);
  // red top-secret band + stamp
  closed += `<path d="M10 40H90V50H10Z" fill="${C.coral}" stroke="${INK}" stroke-width="2.6"/>`;
  closed += `<text x="50" y="48.5" text-anchor="middle" font-family="Impact,'Arial Black',system-ui,sans-serif" font-weight="900" font-size="10" letter-spacing="1.4" fill="${CREAM}">TOP SECRET</text>`;
  closed += grp('mb-stamp', `<circle cx="50" cy="69" r="17" fill="none" stroke="${C.coral}" stroke-width="3.6"/><circle cx="50" cy="69" r="12.5" fill="${C.coral}" stroke="${INK}" stroke-width="2.4"/><path d="${P(starPts(50, 69, 5, 9, 3.8))}" fill="#fff" stroke="${INK}" stroke-width="1.2" stroke-linejoin="round"/>`, 'style="transform-box:fill-box;transform-origin:50% 50%"');
  // curled corner
  closed += `<path d="M90 70V84Q90 90 84 90H70Q74 76 90 70Z" fill="${C.tan}" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round"/>`;
  // paper clip (lilac)
  closed += `<path d="M24 20V31Q24 36 29 36Q34 36 34 31V14Q34 9 29 9Q23 9 23 15V30" fill="none" stroke="${INK}" stroke-width="6" stroke-linecap="round"/><path d="M24 20V31Q24 36 29 36Q34 36 34 31V14Q34 9 29 9Q23 9 23 15V30" fill="none" stroke="${C.lilac}" stroke-width="2.6" stroke-linecap="round"/>`;
  closed += hl('M16 36H20', 3);
  // open state: glowing contents + flap tipped up
  let open = T('M10 24Q10 18 16 18H38L44 25H82Q90 25 90 31V84Q90 90 84 90H16Q10 90 10 84Z', C.tan);
  open += `<path d="M18 30L12 4L88 4L82 30Z" fill="${C.lemon}" opacity=".95" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round"/>`;
  open += T('M20 26L22 10H78L80 26Z', '#fff', { sw: 2.6 });
  open += ln('M28 16H64M28 21H72', 2);
  open += T('M10 44Q10 38 16 38H84Q90 38 90 44V84Q90 90 84 90H16Q10 90 10 84Z', CREAM);
  open += `<path d="M10 44H90V54H10Z" fill="${C.coral}" stroke="${INK}" stroke-width="2.6"/>`;
  open += `<text x="50" y="52.5" text-anchor="middle" font-family="Impact,'Arial Black',system-ui,sans-serif" font-weight="900" font-size="10" letter-spacing="1.4" fill="${CREAM}">TOP SECRET</text>`;
  open += `<circle cx="50" cy="73" r="12" fill="${C.coral}" stroke="${INK}" stroke-width="2.4"/><path d="${P(starPts(50, 73, 5, 8.5, 3.6))}" fill="#fff" stroke="${INK}" stroke-width="1.2" stroke-linejoin="round"/>`;
  open += ln('M5 12L-1 8M95 12L101 8M50 1V-4', 3.4, C.lemon);
  let g = `<g class="mb-doss" style="transform-box:fill-box;transform-origin:50% 90%"><g transform="rotate(-6 50 56)"><g class="mb-closed">${closed}</g><g class="mb-open">${open}</g></g></g>`;
  g += spark(90, 14, 8, '#fff', 'mb-tw');
  return g;
}

const BUILD = { H1: safe, H2: fizz, H3: vinyl, H4: bongos, L1: fedora, L2: phone, L3: magnifier, L4: bowtie, W: wild, S: dossier };
const cache = {};
const inner = (name) => cache[name] || (cache[name] = BUILD[name]());

const DEFS = `
<pattern id="mb-ht" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(32)"><circle cx="2.5" cy="2.5" r="1.25" fill="${INK}" opacity=".4"/></pattern>
<clipPath id="mb-wclip"><path d="${P(starPts(50, 44, 12, 48, 36))}"/></clipPath>
<pattern id="mb-ht2" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(32)"><circle cx="2" cy="2" r="1" fill="${INK}" opacity=".28"/></pattern>`;

// Symbol-inside CSS. Per-cell phase comes from --c/--r (set on .cell). Everything is steps() (limited animation).
// v2 (WP5, layer budget): every idle keyframe animates the NON-INHERITED custom properties --mbt / --mbo instead of transform /
// opacity (see noComposite below). A custom property animation runs on the main thread, so Chrome no longer promotes each
// twinkle / dial / bubble to its own compositor layer (30 cells used to cost about 60 layers for these parts alone), and a
// steps(1,end) animation only restyles at its step boundaries. The visible result is identical: the 'universal' syntax
// interpolates discretely and steps(1,end) holds the start value of every interval, exactly like before.
const ANIMATED = '.mb-tw,.mb-dial,.mb-bub,.mb-orbit,.mb-vshine,.mb-feather,.mb-hand,.mb-rot,.mb-glint,.mb-knot,.mb-wburst,.mb-sp>path,.mb-eye,.mb-stamp,.mb-closed,.mb-open,.mb-doss';
const RAW_CSS = `
.mb *{transform-box:fill-box}
${ANIMATED}{transform:var(--mbt,none);opacity:var(--mbo,1)}
.mb-tw{transform-origin:50% 50%;opacity:var(--mbo,0);animation:mb-tw 3.6s steps(1,end) infinite;animation-delay:calc(var(--c,0)*-.55s + var(--r,0)*-.95s)}
@keyframes mb-tw{0%,60%,82%,100%{opacity:0;transform:scale(.2)}62%{opacity:1;transform:scale(.55)}67%{opacity:1;transform:scale(1.15)}73%{opacity:1;transform:scale(.7)}78%{opacity:1;transform:scale(.3)}}
.mb-dial{animation:mb-dial 4s steps(1,end) infinite;animation-delay:calc(var(--c,0)*-.7s + var(--r,0)*-1.3s)}
@keyframes mb-dial{0%,70%{transform:rotate(0)}74%{transform:rotate(45deg)}78%{transform:rotate(90deg)}82%{transform:rotate(135deg)}86%,100%{transform:rotate(0)}}
.mb-bub{animation:mb-bub 1.6s steps(1,end) infinite;animation-delay:calc(var(--c,0)*-.3s)}
@keyframes mb-bub{0%{transform:translateY(0)}25%{transform:translateY(-2.2px)}50%{transform:translateY(-4px);opacity:.8}75%{transform:translateY(-1px)}}
.mb-orbit{transform-origin:50% 50%;animation:mb-orbit 2.4s steps(1,end) infinite}
@keyframes mb-orbit{0%{transform:rotate(0)}25%{transform:rotate(30deg)}50%{transform:rotate(60deg)}75%{transform:rotate(90deg)}}
.mb-vshine{transform-origin:46px 48px;transform-box:view-box;animation:mb-vsh 3.2s steps(1,end) infinite;animation-delay:calc(var(--c,0)*-.4s)}
@keyframes mb-vsh{0%{transform:rotate(0)}25%{transform:rotate(90deg)}50%{transform:rotate(180deg)}75%{transform:rotate(270deg)}}
.mb-feather{animation:mb-fea 2.8s steps(1,end) infinite;animation-delay:calc(var(--c,0)*-.5s)}
@keyframes mb-fea{0%,70%,100%{transform:rotate(0)}76%{transform:rotate(-7deg)}84%{transform:rotate(4deg)}92%{transform:rotate(-3deg)}}
.mb-hand{animation:mb-ring 3s steps(1,end) infinite;animation-delay:calc(var(--c,0)*-.6s + var(--r,0)*-.4s)}
@keyframes mb-ring{0%,72%,100%{transform:translateY(0) rotate(0)}76%{transform:translateY(-2px) rotate(-2.5deg)}80%{transform:translateY(-1px) rotate(2.5deg)}84%{transform:translateY(-2px) rotate(-2.5deg)}88%{transform:translateY(-1px) rotate(2deg)}}
.mb-rot{animation:mb-rot 3s steps(1,end) infinite;animation-delay:calc(var(--c,0)*-.6s + var(--r,0)*-.4s)}
@keyframes mb-rot{0%,60%{transform:rotate(0)}65%{transform:rotate(-40deg)}70%{transform:rotate(-80deg)}75%{transform:rotate(-40deg)}80%,100%{transform:rotate(0)}}
.mb-glint{animation:mb-gl 2.6s steps(1,end) infinite;animation-delay:calc(var(--c,0)*-.45s)}
@keyframes mb-gl{0%,55%,100%{opacity:1}60%{opacity:0}65%{opacity:1}70%{opacity:0}}
.mb-knot{animation:mb-kn 2.2s steps(1,end) infinite;animation-delay:calc(var(--c,0)*-.35s + var(--r,0)*-.6s)}
@keyframes mb-kn{0%,64%,100%{transform:scale(1,1)}68%{transform:scale(1.14,.88)}74%{transform:scale(.9,1.12)}80%{transform:scale(1.05,.97)}}
/* wild: gentle pulse + sparkle state */
.mb-wburst{animation:mb-wp 1.6s steps(1,end) infinite}
@keyframes mb-wp{0%{transform:scale(1) rotate(0)}25%{transform:scale(1.03) rotate(4deg)}50%{transform:scale(1.06) rotate(8deg)}75%{transform:scale(1.03) rotate(4deg)}}
.mb-sp>path{transform-origin:50% 50%;opacity:var(--mbo,0);animation:mb-wk 2.4s steps(1,end) infinite}
.mb-sp>.mb-s2{animation-delay:-.6s}.mb-sp>.mb-s3{animation-delay:-1.2s}.mb-sp>.mb-s4{animation-delay:-1.8s}.mb-sp>.mb-s5{animation-delay:-.3s}
@keyframes mb-wk{0%,66%,100%{opacity:0;transform:scale(.1)}70%{opacity:1;transform:scale(.6)}76%{opacity:1;transform:scale(1.25) rotate(20deg)}84%{opacity:1;transform:scale(.8) rotate(45deg)}92%{opacity:0}}
.cell.win .mb-sp>path,.cell.hot .mb-sp>path{animation-duration:.5s}
.cell.win .mb-wburst{animation-duration:.4s}
.cell.s-W.win .mb-eye{animation:mb-wink .5s steps(1,end) infinite}
@keyframes mb-wink{0%,60%{transform:scaleY(1)}70%{transform:scaleY(.15)}85%,100%{transform:scaleY(1)}}
/* scatter: open/closed frames. rest = closed with stamp thump; antic or win = folder opens, glows, shakes */
.mb-open{display:none}
.mb-stamp{transform-origin:50% 50%;animation:mb-st 3.4s steps(1,end) infinite;animation-delay:calc(var(--c,0)*-.5s)}
@keyframes mb-st{0%,80%,100%{transform:scale(1) rotate(0)}84%{transform:scale(1.18) rotate(-8deg)}90%{transform:scale(.95) rotate(3deg)}}
.antic .cell.s-S:not(.adim) .mb-closed,.cell.s-S.hot .mb-closed,.cell.s-S.win .mb-closed{animation:mb-fa .6s steps(1,end) infinite}
.antic .cell.s-S:not(.adim) .mb-open,.cell.s-S.hot .mb-open,.cell.s-S.win .mb-open{display:inline;animation:mb-fb .6s steps(1,end) infinite}
@keyframes mb-fa{0%,100%{opacity:1}50%{opacity:0}}
@keyframes mb-fb{0%,100%{opacity:0}50%{opacity:1}}
.antic .cell.s-S:not(.adim) .mb-doss,.cell.s-S.hot .mb-doss,.cell.s-S.win .mb-doss{animation:mb-sh .3s steps(1,end) infinite}
@keyframes mb-sh{0%{transform:translate(0,0) rotate(0)}33%{transform:translate(1.5px,-1px) rotate(2deg)}66%{transform:translate(-1.5px,0) rotate(-2deg)}}
.cell.dim .mb *,.cell.adim .mb *{animation-play-state:paused}
@media (prefers-reduced-motion:reduce){.mb *{animation:none!important}.mb-tw,.mb-sp>path{opacity:0}}
html[data-motion="calm"] .mb *,html[data-motion="still"] .mb *,html[data-quality="lite"] .mb *,html[data-quality="calm"] .mb *{animation:none!important}
`;
/** Pure: rewrite every @keyframes block so it animates --mbt / --mbo (main thread) instead of transform / opacity (compositor). */
export function noComposite(css) {
  const body = String(css).replace(/@keyframes\s+[\w-]+\s*\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g,
    (block) => block.replace(/(^|[{;\s])transform\s*:/g, '$1--mbt:').replace(/(^|[{;\s])opacity\s*:/g, '$1--mbo:'));
  return '@property --mbt{syntax:"*";inherits:false}@property --mbo{syntax:"*";inherits:false}\n' + body;
}
export const SYMBOL_CSS = noComposite(clocked(RAW_CSS));

let built = false;
export function ensureSprite() {
  if (built || typeof document === 'undefined') return;
  built = true;
  const symbols = SYMBOLS.map((n) => `<symbol id="sym-${n}" viewBox="0 0 100 100">${inner(n)}</symbol>`).join('');
  const svg = `<svg id="sym-sprite" xmlns="http://www.w3.org/2000/svg" width="0" height="0" style="position:absolute;width:0;height:0;overflow:hidden" aria-hidden="true" focusable="false"><defs>${DEFS}</defs>${symbols}</svg>`;
  document.body.insertAdjacentHTML('afterbegin', svg);
  if (!document.getElementById('mb-sym-css')) {
    const st = document.createElement('style'); st.id = 'mb-sym-css'; st.textContent = SYMBOL_CSS + '\n' + CLOCK_CSS; document.head.appendChild(st);
  }
  startIdleClock();
}

// ---- ONE stepped clock for every looping symbol animation (v2, WP5 frame budget).
// A running main-thread animation (the custom-property idle loops above, ~80 on a 30-cell board) is serviced on EVERY frame, so
// the page produced 60 frames a second of style recalc + paint although each loop only changes a few times a second (and ~130
// unsynchronised changes a second land on almost every frame). Measured idle at 4x CPU throttle (harness, 1024x576): p50 33 ms /
// p95 50-67 ms with the loops running, 16.7 / 33 ms with them off.
// The clock keeps every loop a CSS animation (values, keyframes, per-cell phases and state durations stay in the CSS above, and
// Calm / Still / quality lite+calm still remove them in CSS) but PAUSES them (`html[data-mbclock]`) and folds a shared clock into
// their delay: `animation-delay: calc(<phase> - var(--mbclk))`. A paused animation shows the value at -delay = clock + phase, so
// advancing --mbclk (one custom property on #game) on the 12 fps grid steps every symbol together: at most 12 restyles a second
// and no frame at all in between. (Pausing through the Web Animations API instead would detach them from CSS in Chrome: Calm and
// Still could no longer remove them.) Without JS, or before the clock starts, the loops simply run as plain CSS animations.
export const IDLE_CLOCK = Object.freeze({ gridMs: 1000 / 12 });
/** Pure: add the shared clock to every animation rule (outside @keyframes) of a stylesheet. */
export function clocked(css) {
  return String(css).replace(/(@keyframes\s+[\w-]+\s*\{(?:[^{}]*\{[^{}]*\})*[^{}]*\})|([^{}]+)\{([^{}]*)\}/g, (m, kf, sel, body) => {
    if (kf) return kf;
    if (!/(^|;)\s*animation(-delay)?\s*:/.test(body)) return m;
    let b = body.replace(/(^|;)(\s*)animation-delay\s*:\s*([^;]+)/g, (x, a, w, v) => `${a}${w}animation-delay:calc(${v.trim()} - var(--mbclk,0s))`);
    // a shorthand resets the delay to 0s: give it the clock too unless a delay is declared after it
    const sh = b.search(/(^|;)\s*animation\s*:(?!.*(^|;)\s*animation\s*:)/), dl = b.lastIndexOf('animation-delay:');
    if (sh >= 0 && dl < sh) b = b.replace(/;?\s*$/, '') + ';animation-delay:calc(0s - var(--mbclk,0s))';
    return `${sel}{${b}}`;
  });
}
export const CLOCK_CSS = `html[data-mbclock] .mb *{animation-play-state:paused!important}
html[data-mbclock] .cell:not(.win):not(.dim):not(.fuse):not(.adim) .sym-svg.mb{animation-play-state:paused!important;animation-delay:calc(var(--c,0)*-.43s + var(--r,0)*-.71s - var(--mbclk,0s))!important}
html[data-mbclock] .cell.dim .mb *,html[data-mbclock] .cell.adim .mb *{animation-delay:0s!important}`;
let clockTimer = 0;
function clockHost() { return document.getElementById('game') || document.documentElement; }
function idleTick() {
  clockTimer = 0;
  const g = IDLE_CLOCK.gridMs, now = performance.now();
  if (!document.hidden) { try { clockHost().style.setProperty('--mbclk', (Math.floor(now / g) * g / 1000).toFixed(3) + 's'); } catch (e) { /* ignore */ } }
  clockTimer = setTimeout(idleTick, Math.max(1, (Math.floor(now / g) + 1) * g - now));
}
export function startIdleClock() {
  if (clockTimer || typeof document === 'undefined' || typeof setTimeout !== 'function') return;
  idleTick();
  try { document.documentElement.setAttribute('data-mbclock', ''); } catch (e) { /* ignore */ }
}
export function stopIdleClock() {
  if (clockTimer) clearTimeout(clockTimer);
  clockTimer = 0;
  try { document.documentElement.removeAttribute('data-mbclock'); } catch (e) { /* ignore */ }
}

export function symbolMarkup(name) {
  if (!BUILD[name]) name = 'L1';
  return `<svg class="sym-svg mb mb-${name}" viewBox="0 0 100 100" aria-hidden="true" focusable="false">${inner(name)}</svg>`;
}
