// "Mambo" (Mabel Fontaine) - the deadpan adult spy mascot of Agent Mambo.
// 100% hand-authored SVG + CSS (no raster art, no generative AI). 1962 cut-paper cartoon style:
// flat fills with offset print misregistration, thick ink outlines, lilac halftone shadows.
// Animations live in mascot.css (steps() keyframes, squash and stretch, reduced-motion safe).
// Public API is unchanged from Old Gus: POSES, createMascot(host,{size,variant,bubble,pose}).
// Class hooks kept for page CSS: .gus-wrap, svg.gus, .gus-bubble (aliases .mambo-wrap/.mambo-bubble).

const C = {
  ink: '#14102B', indigo: '#2B2A6B', teal: '#1FB5A3', coral: '#F0472F', flamingo: '#F5799F',
  lemon: '#FFD23F', cream: '#FBF1D9', lilac: '#9A7BD0', lime: '#A5D63B', steel: '#6FA7D9',
  aub: '#3B1F52', skin: '#D9A074', lip: '#E03A3E', grey: '#CFCADB', glass: '#E4F3F6',
};

export const POSES = ['idle', 'think', 'happy', 'bigwin', 'shock', 'plunger', 'shrug', 'dance', 'celebrate'];

const ell = (cx, cy, rx, ry) =>
  `M${cx - rx},${cy}A${rx},${ry} 0 1 0 ${cx + rx},${cy}A${rx},${ry} 0 1 0 ${cx - rx},${cy}Z`;
const mirror = (s) => `<g class="mir" transform="matrix(-1 0 0 1 200 0)">${s}</g>`;
const part = (name, inner) => `<g class="${name}"><g class="${name}-a">${inner}</g></g>`;
const star4 = (cx, cy, r) =>
  `M${cx},${cy - r}Q${cx},${cy} ${cx + r},${cy}Q${cx},${cy} ${cx},${cy + r}Q${cx},${cy} ${cx - r},${cy}Q${cx},${cy} ${cx},${cy - r}Z`;
function burstPath(cx, cy, ro, ri, n) {
  let d = '';
  for (let i = 0; i < n * 2; i++) {
    const a = (Math.PI * i) / n - Math.PI / 2, r = i % 2 ? ri : ro;
    d += (i ? 'L' : 'M') + (cx + Math.cos(a) * r).toFixed(1) + ',' + (cy + Math.sin(a) * r).toFixed(1);
  }
  return d + 'Z';
}

let UID = 0;

function buildSVG(uid) {
  let n = 0;
  // shape = offset fill (+ optional halftone shadow and extra detail clipped to the shape) + crisp outline.
  // od = optional custom outline path (open paths hide seams).
  const sh = (d, fill, ht, cls = '', extra = '', od) => {
    const id = `${uid}c${n++}`;
    const clipped = (ht ? `<g class="ht"><path d="${ht}" fill="url(#${uid}ht)"/></g>` : '') + extra;
    return `<g class="sh ${cls}"><g class="fill"><path d="${d}" fill="${fill}"/>` +
      (clipped ? `<clipPath id="${id}"><path d="${d}"/></clipPath><g clip-path="url(#${id})">${clipped}</g>` : '') +
      `</g><path class="o" d="${od || d}"/></g>`;
  };
  const ln = (d, cls = 'fine') => `<path class="o ${cls}" d="${d}"/>`;
  const inkFill = (d, fill) => `<path d="${d}" fill="${fill}" stroke="${C.ink}" stroke-width="2.4" stroke-linejoin="round"/>`;

  // ---------------------------------------------------------------- legs (left drawn, right mirrored)
  const leg =
    sh('M78,200L88,200L87,228L79,228Z', C.cream, 'M84,196L96,196L96,236L84,236Z') +
    sh('M92,221C92,225 91.5,229 90.5,232L87,232L87.4,228.4C80,229.6 72,229.4 68,227.6C65.6,226.5 66.4,223.8 69.6,223.8C75,223.8 79.6,222.6 84,220.6Z', C.teal, 'M70,229L96,229L96,236L70,236Z');
  const legL = leg;
  const legR = mirror(leg);

  // ---------------------------------------------------------------- skirt + bodice
  const dots = [[68, 196], [100, 202], [132, 196], [82, 180], [118, 180], [100, 176], [56, 203], [144, 203]]
    .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3" fill="${C.cream}"/>`).join('');
  const skirtD = 'M85,156L115,156C122,176 138,194 152,207Q100,222 48,207C62,194 78,176 85,156Z';
  const skirt = part('skirt',
    sh(skirtD, C.coral, 'M104,150L160,150L160,230L110,230Q118,200 104,150Z', 'dress', dots) +
    ln('M60,206Q100,217 140,206', 'fine'));
  const bodiceD = 'M76,139C84,131 116,131 124,139L115,158L85,158Z';
  const torso = part('torso',
    sh(bodiceD, C.coral, 'M106,130L130,130L130,160L110,160Z', 'dress') +
    // scoop neckline: skin chest
    `<g class="sh"><g class="fill"><path d="M88,133Q100,152 112,133Z" fill="${C.skin}"/></g><path class="o thin" d="M88,133Q100,152 112,133"/></g>` +
    // belt + 8-point buckle
    sh('M85,155L115,155L114.4,164L85.6,164Z', C.lemon) +
    sh(burstPath(100, 159.5, 8, 4.4, 8), C.cream, '', 'buckle') +
    `<circle cx="100" cy="159.5" r="1.8" fill="${C.ink}"/>`);

  // ---------------------------------------------------------------- arms (two-segment, pivots at shoulder + elbow)
  const T = (x, y, s) => `translate(${x} ${y}) scale(${s} 1)`;
  const upperD = 'M-5.5,0Q-5.5,-5.5 0,-5.5Q5.5,-5.5 5.5,0L5,23L-5,23Z';
  const upperO = 'M-5,23L-5.5,0Q-5.5,-5.5 0,-5.5Q5.5,-5.5 5.5,0L5,23';
  const foreD = 'M-5,-1Q-5,-5 0,-5Q5,-5 5,-1L4.6,22L-4.6,22Z';
  const hand = sh(ell(0, 27, 6.4, 6.8), C.cream) +
    sh('M3.8,21.5Q10.5,22.5 9.4,29Q5.4,29.4 3.8,26Z', C.cream, '', 'thumb') +
    `<path class="o thin fing" d="M-3.6,32L-4.4,36.4M0,33.4L0,38M3.6,32L4.4,36.4"/>`;
  const cuff = `<path d="M-4.9,12L4.9,12" stroke="${C.lemon}" stroke-width="3" stroke-linecap="round" class="fine"/>`;
  const caseHold =
    // drum-shaped attache case hanging from the hand (counter-rotated by CSS to hang upright)
    `<g class="hold"><g class="case">` +
    `<path class="o thick" d="M-6,40Q0,28 6,40"/>` +
    sh('M-13,45L13,45L13,62Q0,67.5 -13,62Z', C.indigo, 'M3,40L18,40L18,70L3,70Z', 'drum',
       `<path d="M-1.6,45L1.6,45L1.6,64L-1.6,64Z" fill="${C.lemon}"/><path d="M-13,51L13,51" stroke="${C.lemon}" stroke-width="2"/>`) +
    sh(ell(0, 45, 13, 5.2), C.flamingo, '', 'lid') +
    `<rect x="-2.6" y="52" width="5.2" height="4.4" rx="1" fill="${C.lemon}" stroke="${C.ink}" stroke-width="1.6"/>` +
    `</g>` +
    // seltzer glass with lime fizz (raised in celebrate)
    `<g class="glass">` +
    sh('M-6.4,30L6.4,30L8.6,2L-8.6,2Z', C.glass, '', 'gl') +
    `<path d="M-5.2,27L5.2,27L6.8,8L-6.8,8Z" fill="${C.lime}"/>` +
    `<path d="M-6.8,8Q0,5 6.8,8" fill="none" stroke="${C.cream}" stroke-width="1.6"/>` +
    `<circle cx="-2" cy="20" r="1.5" fill="${C.cream}"/><circle cx="2.4" cy="14" r="1.2" fill="${C.cream}"/><circle cx="-1.4" cy="11" r="1" fill="${C.cream}"/>` +
    `<path class="o" d="M-6.4,30L6.4,30L8.6,2L-8.6,2Z"/>` +
    `<g class="fizz"><circle cx="-3" cy="-4" r="1.6" fill="${C.cream}"/><circle cx="3" cy="-8" r="1.3" fill="${C.cream}"/><circle cx="0" cy="-12" r="1.1" fill="${C.cream}"/></g>` +
    `<circle cx="8.6" cy="3" r="5.4" fill="${C.lime}" stroke="${C.ink}" stroke-width="2.6"/><path d="M8.6,3L12,1M8.6,3L5,0.5M8.6,3L8.6,8" stroke="${C.ink}" stroke-width="1.2" fill="none"/>` +
    `</g></g>`;

  const arm = (side, px, withProp) => {
    const s = side === 'L' ? 1 : -1, N = 'arm' + side, F = 'fore' + side;
    return `<g class="${N} mir${side}"><g class="${N}-a">` +
      `<g class="mir${side}" transform="${T(px, 138, s)}">` + sh(upperD, C.cream, 'M2,-6L9,-6L9,26L2,26Z', '', '', upperO) + `</g>` +
      `<g class="${F}"><g class="${F}-a"><g transform="${T(px, 161, s)}" class="mir${side}">` +
        sh(foreD, C.cream, 'M2,-6L9,-6L9,24L2,24Z') + cuff + hand + (withProp ? caseHold : '') +
      `</g></g></g>` +
      `</g></g>`;
  };
  // order: forearm under the upper arm is handled by the DOM order inside arm() (upper first, forearm after, so
  // the round elbow cap shows); the upper outline is open so no seam shows.

  // ---------------------------------------------------------------- plunger (DEFUSE box)
  const plunger =
    `<g class="plunger">` +
    sh('M140,204L190,204L190,232L140,232Z', C.cream, 'M176,200L196,200L196,236L176,236Z') +
    `<path class="o thin" d="M140,210L190,210"/>` +
    `<text x="165" y="224.6" text-anchor="middle" font-family="Impact,'Arial Black',sans-serif" font-size="9.4" font-weight="900" fill="${C.coral}" stroke="${C.ink}" stroke-width=".7" paint-order="stroke" letter-spacing=".5">DEFUSE</text>` +
    part('plbtn',
      sh('M150,205Q150,203 152,203L178,203Q180,203 180,205Q180,208 178,208L152,208Q150,208 150,205Z', C.steel) +
      sh('M152.6,203Q152.6,189 165,189Q177.4,189 177.4,203Z', C.coral, 'M166,186L180,186L180,205L170,205Z') +
      `<path d="M158,198Q158,193 163,192" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/>`) +
    `</g>`;

  // ---------------------------------------------------------------- head
  // hair (behind face): beehive, stripes, highlight, antenna, hinged lid
  const hairD = 'M76,106C64,96 64,60 74,44C81,33 91,28 100,28C109,28 119,33 126,44C136,60 136,96 124,106Z';
  const stripes =
    `<path d="M60,46Q100,57 140,46M58,61Q100,73 142,61M60,76Q100,88 140,76" fill="none" stroke="${C.cream}" stroke-width="3.2" stroke-linecap="round" opacity=".95"/>`;
  const lidO =
    // slot + speaker grille under the lid
    `<g class="lidslot"><rect x="114" y="54" width="18" height="13" rx="3" fill="${C.ink}"/><path d="M117,58.5L129,58.5M117,62.5L129,62.5" stroke="${C.lemon}" stroke-width="1.8"/></g>` +
    part('lid',
      sh('M114,54.6Q114,52.6 116,52.6L129,52.6Q131,52.6 131,54.6L131,65Q131,67 129,67L116,67Q114,67 114,65Z', C.flamingo, '', 'lidp') +
      `<circle cx="118.4" cy="60" r="1.7" fill="${C.ink}"/><circle cx="124.4" cy="60" r="1.7" fill="${C.ink}"/>`);
  const hair = part('hair',
    sh(hairD, C.aub, 'M108,0L170,0L170,130L114,130Q126,60 108,0Z', 'hairs', stripes) +
    `<path class="o thin hl" d="M74,58Q74,44 88,36" style="stroke:#fff"/>` +
    lidO);
  const antenna =
    `<g class="ant"><g class="ant-a">` +
      `<path class="shaft" d="M100,31L100,-2" stroke="${C.ink}" stroke-width="4.6" stroke-linecap="round" fill="none"/>` +
      `<g class="anttop">` +
        `<g class="fins"><path d="M86,13Q100,8 114,13Q100,18 86,13Z" fill="${C.lemon}" stroke="${C.ink}" stroke-width="2.4" stroke-linejoin="round"/></g>` +
        sh(ell(100, 13, 6, 6), C.lemon, '', 'ball') +
        `<path d="M97,9.6Q98.6,8 100.6,8.4" stroke="#fff" stroke-width="1.7" fill="none" stroke-linecap="round"/>` +
        `<g class="qstar">` +
          `<path d="${burstPath(124, 11, 12, 6.8, 8)}" fill="${C.lemon}" stroke="${C.ink}" stroke-width="2.6" stroke-linejoin="round"/>` +
          `<path d="M119.8,7.4Q119.8,3.4 124,3.4Q128.2,3.4 128.2,7.4Q128.2,10.4 124,11.4L124,14" fill="none" stroke="${C.ink}" stroke-width="2.6" stroke-linecap="round"/>` +
          `<circle cx="124" cy="17.2" r="1.6" fill="${C.ink}"/>` +
        `</g>` +
      `</g>` +
    `</g></g>`;

  const faceD = ell(100, 108, 26, 30);
  const ears = `<g class="ears">${sh(ell(74.4, 112, 4.4, 6.6), C.skin)}${sh(ell(125.6, 112, 4.4, 6.6), C.skin)}</g>`;
  const neck = `<g class="neck"><path d="M91,124L91,138L109,138L109,124Z" fill="${C.skin}"/><path d="M91,124L91,137M109,124L109,137" class="o" fill="none"/>` +
    `<path d="M91,128Q100,136 109,128L109,138L91,138Z" fill="${C.ink}" opacity=".22"/></g>`;
  const face = sh(faceD, C.skin, 'M110,80L136,80L136,140L116,140Q122,112 110,80Z', 'face', '', 'M76.2,96A26,30 0 1 0 123.8,96') +
    `<ellipse class="fine" cx="82.6" cy="119" rx="5.4" ry="3.2" fill="${C.flamingo}" opacity=".55"/><ellipse class="fine" cx="117.4" cy="119" rx="5.4" ry="3.2" fill="${C.flamingo}" opacity=".55"/>`;

  // earrings: lemon atoms
  const atom = (x) => `<g class="fine"><ellipse cx="${x}" cy="124" rx="7" ry="2.6" fill="none" stroke="${C.ink}" stroke-width="1.6" transform="rotate(-24 ${x} 124)"/><ellipse cx="${x}" cy="124" rx="7" ry="2.6" fill="none" stroke="${C.ink}" stroke-width="1.6" transform="rotate(24 ${x} 124)"/></g>` +
    `<circle cx="${x}" cy="124" r="3.4" fill="${C.lemon}" stroke="${C.ink}" stroke-width="2.2"/>`;
  const earrings = `<g class="earr"><path class="fine" d="M74.5,118L74.5,121M125.5,118L125.5,121" stroke="${C.ink}" stroke-width="1.6"/>${atom(74.5)}${atom(125.5)}</g>`;

  // eyes: big white ovals, ink pupils, winged liner. Lids are skin-coloured, clipped to the eye (blink).
  const EL = 90, ER = 110, EY = 106;
  const eyeOval = (cx) => ell(cx, EY, 7.2, 9.4);
  const mkEye = (cx, side, cid) => {
    const w = side === 'L' ? -1 : 1;
    return `<g class="eye${side}"><g class="eye${side}-a">` +
      `<path d="${eyeOval(cx)}" fill="#FFFEF8"/>` +
      `<g class="pup"><circle cx="${cx - w * 0.6}" cy="${EY + 0.6}" r="4.2" fill="${C.ink}"/><circle cx="${cx - w * 0.6 - 1.4}" cy="${EY - 1.4}" r="1.4" fill="#fff"/></g>` +
      `<clipPath id="${uid}${cid}"><path d="${eyeOval(cx)}"/></clipPath>` +
      `<g clip-path="url(#${uid}${cid})">${part('lid' + side, `<path d="M${cx - 10},${EY - 14}L${cx + 10},${EY - 14}L${cx + 10},${EY + 1}L${cx - 10},${EY + 1}Z" fill="${C.skin}"/><path class="o" d="M${cx - 10},${EY + 1}L${cx + 10},${EY + 1}"/>`)}</g>` +
            // upper liner + wing flick
      `<path class="o liner" d="M${cx + w * 7.6},${EY - 1.6}Q${cx + w * 0.8},${EY - 11.2} ${cx - w * 5.6},${EY - 7}"/>` +
      `<path class="o wing" d="M${cx + w * 7.6},${EY - 1.6}L${cx + w * 13},${EY - 5.6}"/>` +
      `</g></g>`;
  };
  const eyes = mkEye(EL, 'L', 'ecl') + mkEye(ER, 'R', 'ecr');
  // closed happy eyes (arcs) + wink
  const arcL = `M${EL - 7.4},${EY + 3}Q${EL},${EY - 8} ${EL + 7.4},${EY + 3}`;
  const arcR = `M${ER - 7.4},${EY + 3}Q${ER},${EY - 8} ${ER + 7.4},${EY + 3}`;
  const eyesHappy = `<g class="eyesHappy"><path class="o thick" d="${arcL}"/><path class="o thick" d="${arcR}"/>` +
    `<path class="o thick wing" d="M${EL - 7.4},${EY + 3}L${EL - 12},${EY - 0.6}M${ER + 7.4},${EY + 3}L${ER + 12},${EY - 0.6}"/></g>`;
  const winkR = `<g class="winkR"><path class="o thick" d="${arcR}"/><path class="o thick wing" d="M${ER + 7.4},${EY + 3}L${ER + 12},${EY - 0.6}"/></g>`;

  // brows: thin 3 px arcs
  const browL = `<g class="browL"><g class="browL-a"><path class="o brow" d="M82,91Q89,85.6 97,89"/></g></g>`;
  const browR = `<g class="browR"><g class="browR-a"><path class="o brow" d="M103,89Q111,85.6 118,91"/></g></g>`;

  const nose = `<path class="o thin nose" d="M101.4,112.6Q104.8,116.2 101.4,118.2"/>`;

  // mouths (coral lips, no teeth)
  const lipsD = 'M90.6,124.4Q95,120.8 100,123Q105,120.8 109.4,124.4Q105,131.4 100,131.4Q95,131.4 90.6,124.4Z';
  const mouths = '<g transform="translate(0 -3)">' +
    `<g class="m m-smile">${inkFill(lipsD, C.lip)}<path class="fine" d="M95,126.6Q100,128.6 105,126.6" stroke="${C.ink}" stroke-width="1.4" fill="none" opacity=".7"/></g>` +
    `<g class="m m-grin">${inkFill('M89.6,122.6Q100,128.6 110.4,122.6Q108.6,134 100,134Q91.4,134 89.6,122.6Z', C.ink)}` +
      `<path d="M94,131.2Q100,128.4 106,131.2Q100,134 94,131.2Z" fill="${C.flamingo}"/>` +
      `<path d="M89.6,122.6Q100,128.6 110.4,122.6" fill="none" stroke="${C.lip}" stroke-width="2.6" stroke-linecap="round"/></g>` +
    `<g class="m m-o"><ellipse cx="100" cy="128.4" rx="6.6" ry="8" fill="${C.ink}" stroke="${C.lip}" stroke-width="3.6"/><ellipse cx="100" cy="128.4" rx="8.4" ry="9.8" fill="none" stroke="${C.ink}" stroke-width="2.4"/><path d="M96,132.4Q100,129.8 104,132.4Q100,135 96,132.4Z" fill="${C.flamingo}"/></g>` +
    `<g class="m m-gasp"><ellipse cx="100" cy="129.6" rx="3.8" ry="4.8" fill="${C.ink}" stroke="${C.lip}" stroke-width="2.6"/><ellipse cx="100" cy="129.6" rx="5.4" ry="6.4" fill="none" stroke="${C.ink}" stroke-width="2"/></g>` +
    `<g class="m m-flat"><path d="M92.4,127.6L107.6,127.6" stroke="${C.ink}" stroke-width="6.6" stroke-linecap="round"/><path d="M92.4,127.6L107.6,127.6" stroke="${C.lip}" stroke-width="3" stroke-linecap="round"/></g>` +
    `<g class="m m-side"><path d="M92.6,128.4Q100,129.8 108.4,124.8" stroke="${C.ink}" stroke-width="6.6" stroke-linecap="round" fill="none"/><path d="M92.6,128.4Q100,129.8 108.4,124.8" stroke="${C.lip}" stroke-width="3" stroke-linecap="round" fill="none"/></g>` +
    `<circle class="fine" cx="113" cy="124" r="1.4" fill="${C.ink}"/></g>`;

  // fringe + headband in front of the face
  const fringe =
    part('bangs',
      sh('M72,104C70,88 84,80 100,80C116,80 130,88 128,104C120,94 110,90 100,91C90,92 80,96 72,104Z', C.aub, 'M106,76L136,76L136,110L122,110Q122,86 106,76Z', 'fringe', '', 'M128,104C120,94 110,90 100,91C90,92 80,96 72,104') +
      `<g class="sh band"><g class="fill"><path d="M70,89C80,72 120,72 130,89L127.6,93C118,82 82,82 72.4,93Z" fill="${C.teal}"/></g><path class="o thin" d="M70,89C80,72 120,72 130,89L127.6,93C118,82 82,82 72.4,93Z"/></g>`);

  // hand-on-chin glove for think (sits on the head so it follows its tilt)
  // glove on the chin for think (drawn over the face; the real forearm rises behind it)
  const handThink = `<g class="handThink">` +
    sh('M89,141L104,141L103,150L90,150Z', C.cream, '', 'ht-wrist') +
    sh(ell(96.5, 134.4, 8.8, 7.6), C.cream, 'M98,126L108,126L108,142L98,142Z', 'ht-fist') +
    `<path class="o thin" d="M90,131.6Q96.5,128.4 103,131.6"/>` +
    sh('M101.4,138Q107,138 107.6,143.4Q103,144 100.4,141Z', C.cream, '', 'ht-thumb') +
    `</g>`;
  const head = part('head', `<g transform="translate(0 -2)">` + hair + antenna + neck + ears + face + earrings + eyes + eyesHappy + winkR + browL + browR + nose + mouths + fringe + handThink + `</g>`);

  // ---------------------------------------------------------------- fx
  const fxBurst = `<g class="burst">${sh(burstPath(100, 130, 120, 76, 12), C.lemon)}<path d="${burstPath(100, 130, 80, 50, 12)}" fill="${C.cream}" stroke="${C.ink}" stroke-width="3" stroke-linejoin="round" opacity=".96"/></g>`;
  const fxBurst2 = `<g class="burst2">${sh(burstPath(100, 110, 140, 96, 14), C.teal, 'M100,-50L250,-50L250,250L100,250Z')}</g>`;
  const cfCols = [C.coral, C.teal, C.lemon, C.flamingo, C.cream, C.lilac, C.lime];
  const cfPos = [[-8, 22], [24, -14], [56, -22], [146, -26], [176, -12], [208, 22], [-14, 74], [214, 78], [-4, 124], [206, 126], [10, 176], [196, 176]];
  const confetti = `<g class="confetti">${cfPos.map(([x, y], i) => {
    const fill = cfCols[i % cfCols.length], k = i % 3;
    const d = k === 0 ? `M${x - 7},${y - 4}L${x + 7},${y - 4}L${x + 7},${y + 4}L${x - 7},${y + 4}Z` : k === 1 ? `M${x},${y - 9}L${x + 7},${y}L${x},${y + 9}L${x - 7},${y}Z` : star4(x, y, 10);
    return `<g class="cf" style="transform-origin:${x}px ${y}px;animation-delay:${(i % 4) * .13}s"><path d="${d}" fill="${fill}" stroke="${C.ink}" stroke-width="2" stroke-linejoin="round"/></g>`;
  }).join('')}</g>`;
  const lidConf = `<g class="lidconf">${[[0, C.coral], [1, C.lemon], [2, C.teal], [3, C.flamingo]].map(([i, f]) =>
    `<g class="lc lc${i}"><path d="M-4,-3L4,-3L4,3L-4,3Z" fill="${f}" stroke="${C.ink}" stroke-width="1.8" stroke-linejoin="round"/></g>`).join('')}</g>`;
  const starAt = (x, y, r, fill, delay) =>
    `<g class="star" style="transform-origin:${x}px ${y}px;animation-delay:${delay}s">${sh(star4(x, y, r), fill)}</g>`;
  const stars = `<g class="stars">${starAt(20, 52, 17, C.lemon, 0)}${starAt(184, 40, 21, C.cream, .15)}${starAt(10, 150, 13, C.cream, .3)}${starAt(192, 140, 16, C.lemon, .45)}${starAt(156, -4, 12, C.flamingo, .2)}</g>`;
  const dropAt = (x, y, k) =>
    `<g transform="translate(${x} ${y}) scale(${k})"><g class="dropA"><path class="o" fill="${C.steel}" d="M0,-9C6,-1 8,3 8,6A8,8 0 0 1 -8,6C-8,3 -6,-1 0,-9Z" style="fill:${C.steel}"/></g></g>`;
  const sweat = `<g class="sweat">${dropAt(146, 66, 1)}${dropAt(54, 76, .85)}${dropAt(152, 100, .7)}</g>`;
  const mlh = `<g class="mlh"><path class="o thick" d="M48,60L30,52M46,82L26,82M50,102L32,112M152,60L170,52M154,82L174,82M150,102L168,112"/></g>`;
  const note = `<g class="note"><path d="M0,0L0,-22" stroke="${C.ink}" stroke-width="4.6" stroke-linecap="round"/><ellipse cx="-4.4" cy="1" rx="6.6" ry="5" fill="${C.flamingo}" stroke="${C.ink}" stroke-width="3" transform="rotate(-20 -4.4 1)"/><path d="M0,-22Q10,-20 11,-10" fill="none" stroke="${C.ink}" stroke-width="4.6" stroke-linecap="round"/></g>`;
  const notes = `<g class="notes"><g transform="translate(172 74)">${note}</g><g class="note2" transform="translate(30 90) scale(.75)">${note}</g></g>`;
  const puff = `<g class="puff"><circle cx="150" cy="30" r="5" fill="${C.grey}" stroke="${C.ink}" stroke-width="2.4"/><circle cx="160" cy="16" r="7.4" fill="${C.grey}" stroke="${C.ink}" stroke-width="2.4"/><circle cx="174" cy="0" r="10" fill="${C.grey}" stroke="${C.ink}" stroke-width="2.4"/></g>`;
  const tdots = `<g class="tdots"><circle class="td1" cx="148" cy="86" r="3.6" fill="${C.cream}" stroke="${C.ink}" stroke-width="2.4"/><circle class="td2" cx="160" cy="72" r="5.4" fill="${C.cream}" stroke="${C.ink}" stroke-width="2.4"/></g>`;
  const spark = `<g class="spark"><path d="${burstPath(168, 192, 17, 7, 8)}" fill="${C.lemon}" stroke="${C.ink}" stroke-width="2.8" stroke-linejoin="round"/></g>`;

  const shadow = `<g class="shadow"><ellipse cx="100" cy="232" rx="58" ry="6.4" fill="${C.ink}" opacity=".3"/><ellipse cx="100" cy="232" rx="58" ry="6.4" fill="url(#${uid}ht)"/></g>`;

  // everything is drawn in a 200x233 box and lifted into the 240x280 viewBox (ground y232 -> 248)
  return `<svg class="gus mambo" xmlns="http://www.w3.org/2000/svg" viewBox="-20 -24 240 280" role="img" aria-label="Agent Mambo, Mabel Fontaine">
<defs><pattern id="${uid}ht" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(30)"><circle cx="2.5" cy="2.5" r="1.05" fill="${C.lilac}"/></pattern></defs>
<g transform="translate(-10 -8) scale(1.1)">${shadow}</g>
<g class="fig" transform="translate(-10 -8) scale(1.1)">
${fxBurst}${fxBurst2}
${plunger}
<g class="body"><g class="body-a">
${part('legL', legL)}${part('legR', legR)}
${skirt}
${torso}
${arm('L', 78, false)}${arm('R', 122, true)}
${head}
${sweat}${mlh}${tdots}${puff}${notes}${lidConf}
</g></g>
${spark}${stars}${confetti}
</g>
</svg>`;
}

// ---- stylesheet auto-load (once). Callers may also <link> mascot.css themselves.
function ensureCss() {
  if (typeof document === 'undefined') return;
  if (document.querySelector('link[data-mambo-css]') || document.querySelector('link[href*="mascot.css"]')) return;
  try {
    const l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = new URL('./mascot.css', import.meta.url).href;
    l.setAttribute('data-mambo-css', '');
    document.head.appendChild(l);
  } catch (_) { /* ignore */ }
}

/**
 * createMascot(hostEl, { size = 240, variant = 'auto', bubble = 'top', pose = 'idle', reduced })
 *   size    : rendered height in px (width follows, ratio 6:7)
 *   variant : 'full' | 'small' | 'auto' (small when size <= 140: no halftone/detail, thicker outlines)
 *   bubble  : speech bubble side: 'top' | 'left' | 'right'
 * returns { el, setPose(name), say(text, ms), hideSay(), getPose(), destroy() }
 */
export function createMascot(hostEl, opts = {}) {
  ensureCss();
  const size = Math.max(40, opts.size || 240);
  const uid = 'm' + (++UID) + '_';
  const wrap = document.createElement('div');
  wrap.className = 'gus-wrap mambo-wrap';
  wrap.style.setProperty('--gus-h', size + 'px');
  wrap.style.height = size + 'px';
  wrap.style.width = Math.round(size * 6 / 7) + 'px';
  wrap.dataset.bubble = opts.bubble || 'top';
  wrap.innerHTML = buildSVG(uid);
  const svg = wrap.firstElementChild;
  const small = opts.variant === 'small' || (opts.variant !== 'full' && size <= 140);
  if (small) svg.classList.add('small');
  if (opts.reduced) svg.classList.add('still');

  const bub = document.createElement('div');
  bub.className = 'gus-bubble mambo-bubble';
  bub.setAttribute('aria-live', 'polite');
  bub.hidden = true;
  wrap.appendChild(bub);
  hostEl.appendChild(wrap);

  let pose = 'idle', bubTimer = 0;
  const setPose = (name) => {
    if (!POSES.includes(name)) name = 'idle';
    svg.classList.remove('p-' + pose);
    if (name === pose) void svg.getBoundingClientRect(); // restart one-shot animations
    pose = name;
    svg.classList.add('p-' + pose);
    svg.dataset.pose = pose;
  };
  setPose(opts.pose || 'idle');

  // keep the bubble inside the viewport (uses layout sizes, so the pop-in scale does not matter)
  const fit = () => {
    bub.style.translate = '';
    try {
      const vw = document.documentElement.clientWidth || window.innerWidth, vh = document.documentElement.clientHeight || window.innerHeight;
      const wr = wrap.getBoundingClientRect();
      const l = wr.left + bub.offsetLeft, t = wr.top + bub.offsetTop, w = bub.offsetWidth, h = bub.offsetHeight, m = 4;
      let dx = 0, dy = 0;
      if (l < m) dx = m - l; else if (l + w > vw - m) dx = vw - m - (l + w);
      if (t < m) dy = m - t; else if (t + h > vh - m) dy = vh - m - (t + h);
      if (dx || dy) bub.style.translate = `${Math.round(dx)}px ${Math.round(dy)}px`;
    } catch (_) { /* ignore */ }
  };

  const hideSay = () => { clearTimeout(bubTimer); bub.hidden = true; };
  const say = (text, ms = 2200) => {
    clearTimeout(bubTimer);
    bub.textContent = String(text == null ? '' : text);
    bub.hidden = !bub.textContent;
    fit();
    // restart pop-in
    bub.classList.remove('pop'); void bub.offsetWidth; bub.classList.add('pop');
    if (ms > 0) bubTimer = setTimeout(hideSay, ms);
  };
  return {
    el: wrap, setPose, say, hideSay, getPose: () => pose,
    destroy() { clearTimeout(bubTimer); wrap.remove(); },
  };
}

export default createMascot;
