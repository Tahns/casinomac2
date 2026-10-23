// "Old Gus" - the adult prospector mascot of The Unleashed Mine.
// 100% hand-authored SVG + CSS (no raster art, no generative AI). 1960s cartoon style:
// flat fills, offset-print misregistration, thick #2B1A12 outlines, halftone shadows.
// Animations live in mascot.css (steps() keyframes, squash & stretch, reduced-motion safe).

const C = {
  cream: '#F4E8C8', mustard: '#E8A92B', orange: '#D9622B', red: '#B8352A', teal: '#2E8C8C',
  navy: '#1E2F4A', ink: '#2B1A12', olive: '#7A8B3A', plum: '#6A3D6E',
  skin: '#F0C39A', grey: '#D2CEC4', boot: '#8A4F2A', wood: '#B5733A', steel: '#5F7F8C',
  hatDark: '#CF8E1E', nose: '#E2845B', drop: '#9ED8D8',
};

export const POSES = ['idle', 'think', 'happy', 'bigwin', 'shock', 'plunger', 'shrug', 'dance', 'celebrate'];

const ell = (cx, cy, rx, ry) =>
  `M${cx - rx},${cy}A${rx},${ry} 0 1 0 ${cx + rx},${cy}A${rx},${ry} 0 1 0 ${cx - rx},${cy}Z`;
const mirror = (s) => `<g transform="matrix(-1 0 0 1 200 0)">${s}</g>`;
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
  // shape = offset fill (+ optional halftone shadow clipped to the shape) + crisp outline
  const sh = (d, fill, ht, cls = '') => {
    const id = `${uid}c${n++}`;
    return `<g class="sh ${cls}"><g class="fill"><path d="${d}" fill="${fill}"/>` +
      (ht ? `<clipPath id="${id}"><path d="${d}"/></clipPath><g clip-path="url(#${id})" class="ht"><path d="${ht}" fill="url(#${uid}ht)"/></g>` : '') +
      `</g><path class="o" d="${d}"/></g>`;
  };
  const ln = (d, cls = 'fine') => `<path class="o ${cls}" d="${d}"/>`;

  const mouthTongue = '#D9622B';

  // ---- legs
  const leg = mirror(
    sh('M66,196L95,196L95,228L64,228Z', C.red) +
    sh('M50,248C46,236 54,224 70,222L97,222L99,248Z', C.boot, 'M40,240L110,240L110,252L40,252Z') +
    ln('M60,232Q76,228 94,232', 'fine') + ln('M52,244L98,244', 'fine'));

  // ---- torso
  const torso =
    sh(ell(100, 172, 56, 50), C.cream, 'M128,100L170,100L170,230L128,230Z') +
    sh('M47,178C49,206 70,222 100,223C130,222 151,206 153,178L128,178L128,152L72,152L72,178Z', C.red,
       'M118,150L170,150L170,240L118,240Z') +
    sh('M69,154L84,154L79,124L61,130Z', C.red) +
    sh('M131,154L116,154L121,124L139,130Z', C.red) +
    `<circle class="fine" cx="76" cy="160" r="4.2" fill="${C.mustard}" stroke="${C.ink}" stroke-width="2.5"/>` +
    `<circle class="fine" cx="124" cy="160" r="4.2" fill="${C.mustard}" stroke="${C.ink}" stroke-width="2.5"/>` +
    ln('M88,172L112,172L112,190L88,190Z') + ln('M100,198L100,222');

  // ---- arm (drawn for left; right is mirrored, hand/pickaxe added separately)
  const arm = sh('M38,152A11,11 0 0 1 60,152L60,196A11,11 0 0 1 38,196Z', C.cream, 'M52,140L70,140L70,210L52,210Z') +
    ln('M38,190L60,190', 'fine') +
    sh(ell(49, 207, 10.5, 10), C.skin);
  const handR = ''; // hand is part of mirrored arm
  const pick =
    `<g class="pick">` +
    sh('M147.5,240L155,240L155,108L147.5,108Z', C.wood) +
    sh('M114,122C126,96 176,96 188,122C176,111 164,110 151,112C138,110 126,111 114,122Z', C.steel, 'M150,90L200,90L200,130L150,130Z') +
    sh('M143,104L159,104L159,118L143,118Z', C.navy) +
    `</g>`;
  const armR = part('armR', pick + mirror(arm));
  // redraw the right hand on top of the pickaxe handle so it grips it
  const gripR = '';

  // ---- plunger (TNT box)
  const plunger =
    `<g class="plunger">` +
    part('plbar',
      sh('M96.5,176L103.5,176L103.5,226L96.5,226Z', C.steel) +
      sh('M74,162A6,6 0 0 1 80,156L120,156A6,6 0 0 1 126,162A6,6 0 0 1 120,168L80,168A6,6 0 0 1 74,162Z', C.wood)) +
    sh('M62,222L138,222L138,250L62,250Z', C.red, 'M112,222L140,222L140,252L112,252Z') +
    `<text x="100" y="243" text-anchor="middle" font-family="Impact,'Arial Black',sans-serif" font-size="17" font-weight="900" fill="${C.cream}" stroke="${C.ink}" stroke-width="1.2" letter-spacing="1">TNT</text>` +
    `</g>`;

  // ---- eyes
  const eyeShape =
    sh(ell(79, 82, 10.5, 12.5), '#FFFDF4') +
    `<g class="pup"><circle cx="79" cy="83" r="5.6" fill="${C.ink}"/><circle cx="77" cy="80.5" r="1.9" fill="#fff"/></g>` +
    `<clipPath id="${uid}ecl"><path d="${ell(79, 82, 10.5, 12.5)}"/></clipPath>` +
    `<g clip-path="url(#${uid}ecl)">%LID%</g>` +
    `<path class="o" d="${ell(79, 82, 10.5, 12.5)}"/>`;
  const lid = (nm) => part(nm, `<path d="M64,56L96,56L96,93L64,93Z" fill="${C.skin}"/><path class="o" d="M64,93L96,93"/>`);
  const eyeL = `<g class="eyeL"><g class="eyeL-a">${eyeShape.replace('%LID%', lid('lidL'))}</g></g>`;
  const eyeR = `<g class="eyeR"><g class="eyeR-a">${mirror(eyeShape.replace('%LID%', lid('lidR')).replace(new RegExp(uid + 'ecl', 'g'), uid + 'ecr'))}</g></g>`;
  const eyesHappy =
    `<path class="o thick" d="M67,87Q79,68 91,87"/><path class="o thick" d="M109,87Q121,68 133,87"/>`;

  // ---- brows
  const browD = 'M59,69C60,58 78,53 98,62C92,69 84,66 72,71C67,73 61,73 59,69Z';
  const browL = `<g class="browL"><g class="browL-a">${sh(browD, C.grey, 'M50,64L110,64L110,80L50,80Z')}</g></g>`;
  const browR = `<g class="browR"><g class="browR-a">${mirror(sh(browD, C.grey, 'M50,64L110,64L110,80L50,80Z'))}</g></g>`;

  // ---- mouths (behind the moustache)
  const mouths =
    `<g class="m m-smile"><path class="o thick" d="M88,134Q100,143 112,134"/></g>` +
    `<g class="m m-open">${sh(ell(100, 136, 12, 9), C.ink)}<path d="M92,141Q100,137 108,141Q100,146 92,141Z" fill="${mouthTongue}"/></g>` +
    `<g class="m m-wide">${sh('M78,128Q100,126 122,128Q122,150 100,150Q78,150 78,128Z', C.ink)}` +
      `<path d="M88,145Q100,138 112,145Q100,150 88,145Z" fill="${mouthTongue}"/><path d="M82,129L118,129L116,134L84,134Z" fill="${C.cream}"/></g>` +
    `<g class="m m-o">${sh(ell(100, 137, 8, 10), C.ink)}</g>` +
    `<g class="m m-frown"><path class="o thick" d="M87,141Q100,129 113,141"/></g>` +
    `<g class="m m-side"><path class="o thick" d="M90,136Q99,131 112,137"/></g>`;

  // ---- moustache
  const mN = 'M100,110C86,104 62,104 48,112C38,118 40,136 56,136C70,136 84,130 100,128C116,130 130,136 144,136C160,136 162,118 152,112C138,104 114,104 100,110Z';
  const mS = 'M100,108L88,100L80,106L68,100L62,110L48,108L50,120L38,124L48,132L40,140L56,138L64,146L74,136L86,138L92,130L100,132L108,130L114,138L126,136L136,146L144,138L160,140L152,132L162,124L150,120L152,108L138,110L132,100L120,106L112,100Z';
  const must = part('must',
    `<g class="must-n">${sh(mN, C.grey, 'M30,126L170,126L170,150L30,150Z')}${ln('M56,119Q70,128 90,125')}${ln('M144,119Q130,128 110,125')}${ln('M60,128Q72,132 84,129')}${ln('M140,128Q128,132 116,129')}</g>` +
    `<g class="must-s">${sh(mS, C.grey)}${ln('M60,120L74,126')}${ln('M140,120L126,126')}</g>`);

  // ---- nose, cheeks, face
  const nose = sh(ell(100, 102, 14, 13), C.nose, 'M104,90L120,90L120,120L104,120Z') +
    `<path d="M92,96Q95,92 99,92" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/>`;
  const face =
    `<g class="ears">${sh(ell(52, 98, 9, 10), C.skin)}${sh(ell(148, 98, 9, 10), C.skin)}</g>` +
    sh(ell(100, 94, 48, 50), C.skin, 'M132,40L160,40L160,150L132,150Z M44,50L160,50L160,66Q100,74 44,66Z') +
    `<circle class="fine" cx="62" cy="106" r="7" fill="${C.orange}" opacity=".45"/><circle class="fine" cx="138" cy="106" r="7" fill="${C.orange}" opacity=".45"/>`;

  // ---- hat
  const hat = part('hat',
    sh('M54,46C54,8 146,8 146,46Z', C.mustard, 'M112,0L160,0L160,60L112,60Z') +
    sh('M91,12L109,12L111,46L89,46Z', C.hatDark) +
    sh('M42,50A6,6 0 0 1 48,44L152,44A6,6 0 0 1 158,50A6,6 0 0 1 152,56L48,56A6,6 0 0 1 42,50Z', C.mustard, 'M40,52L160,52L160,60L40,60Z') +
    `<g class="lamp-rays"><path class="o thin" d="M100,10L100,-2M84,16L76,8M116,16L124,8M72,28L62,26M128,28L138,26"/></g>` +
    sh(ell(100, 31, 11, 11), C.grey) +
    `<circle cx="100" cy="31" r="6.2" fill="#FFF3B0" stroke="${C.ink}" stroke-width="2.4"/>` +
    `<path d="M97,28L99,26" stroke="#fff" stroke-width="2" stroke-linecap="round"/>`);

  const handThink = `<g class="handThink">${sh(ell(84, 150, 11, 10), C.skin)}${ln('M78,146Q84,142 90,146', 'fine')}</g>`;

  const head = part('head', face + mouths + eyeL + eyeR + `<g class="eyesHappy">${eyesHappy}</g>` + must + nose + browL + browR + handThink + hat);

  // ---- fx
  const fxBurst = `<g class="burst">${sh(burstPath(100, 112, 104, 66, 12), C.mustard)}${`<path d="${burstPath(100, 112, 70, 44, 12)}" fill="${C.cream}" stroke="${C.ink}" stroke-width="3" stroke-linejoin="round" opacity=".95"/>`}</g>`;
  const starAt = (x, y, r, fill, delay) =>
    `<g class="star" style="transform-origin:${x}px ${y}px;animation-delay:${delay}s">${sh(star4(x, y, r), fill)}</g>`;
  const stars = `<g class="stars">${starAt(18, 40, 17, C.mustard, 0)}${starAt(186, 30, 21, C.cream, .15)}${starAt(8, 150, 14, C.cream, .3)}${starAt(194, 140, 17, C.mustard, .45)}${starAt(150, -8, 12, C.mustard, .2)}</g>`;
  const dropAt = (x, y, k) =>
    `<g transform="translate(${x} ${y}) scale(${k})"><g class="dropA"><path class="o" fill="${C.drop}" d="M0,-9C6,-1 8,3 8,6A8,8 0 0 1 -8,6C-8,3 -6,-1 0,-9Z" style="fill:${C.drop}"/></g></g>`;
  const sweat = `<g class="sweat">${dropAt(150, 52, 1)}${dropAt(40, 62, .85)}${dropAt(158, 82, .7)}</g>`;
  const mlh = `<g class="mlh"><path class="o thick" d="M26,56L8,48M24,76L4,76M28,96L10,106M174,56L192,48M176,76L196,76M172,96L190,106"/></g>`;
  const mlhop = `<g class="mlhop"><path class="o thick" d="M30,214L30,236M18,206L18,230M170,214L170,236M182,206L182,230"/></g>`;
  const tdots = `<g class="tdots"><circle class="td1" cx="146" cy="30" r="4" fill="${C.cream}" stroke="${C.ink}" stroke-width="2.5"/><circle class="td2" cx="160" cy="14" r="6" fill="${C.cream}" stroke="${C.ink}" stroke-width="2.5"/><circle class="td3" cx="180" cy="-6" r="9" fill="${C.cream}" stroke="${C.ink}" stroke-width="2.5"/></g>`;

  const shadow = `<g class="shadow"><ellipse cx="100" cy="249" rx="64" ry="7" fill="${C.ink}" opacity=".28"/><ellipse cx="100" cy="249" rx="64" ry="7" fill="url(#${uid}ht)"/></g>`;

  return `<svg class="gus" xmlns="http://www.w3.org/2000/svg" viewBox="-20 -24 240 280" role="img" aria-label="Old Gus the miner">
<defs><pattern id="${uid}ht" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(30)"><circle cx="2.5" cy="2.5" r="1.35" fill="${C.ink}" opacity=".5"/></pattern></defs>
${shadow}${fxBurst}
<g class="body"><g class="body-a">
${part('legL', leg.replace('matrix(-1 0 0 1 200 0)', 'matrix(1 0 0 1 0 0)'))}${part('legR', leg)}
${part('torso', torso)}
${plunger}
${part('armL', arm)}${armR}${gripR}
${head}
${sweat}${mlh}${tdots}
</g></g>
${mlhop}${stars}
</svg>`;
}

// ---- stylesheet auto-load (once). Callers may also <link> mascot.css themselves.
function ensureCss() {
  if (typeof document === 'undefined') return;
  if (document.querySelector('link[data-gus-css]') || document.querySelector('link[href*="mascot.css"]')) return;
  try {
    const l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = new URL('./mascot.css', import.meta.url).href;
    l.setAttribute('data-gus-css', '');
    document.head.appendChild(l);
  } catch (_) { /* ignore */ }
}

/**
 * createMascot(hostEl, { size = 240, variant = 'auto', bubble = 'top', pose = 'idle' })
 *   size    : rendered height in px (width follows, ratio 240:280)
 *   variant : 'full' | 'small' | 'auto' (small when size <= 140: fewer parts, thicker outlines)
 *   bubble  : speech bubble side: 'top' | 'left' | 'right'
 * returns { el, setPose(name), say(text, ms), hideSay(), getPose(), destroy() }
 */
export function createMascot(hostEl, opts = {}) {
  ensureCss();
  const size = Math.max(40, opts.size || 240);
  const uid = 'g' + (++UID) + '_';
  const wrap = document.createElement('div');
  wrap.className = 'gus-wrap';
  wrap.style.setProperty('--gus-h', size + 'px');
  wrap.style.height = size + 'px';
  wrap.style.width = Math.round(size * 240 / 280) + 'px';
  wrap.dataset.bubble = opts.bubble || 'top';
  wrap.innerHTML = buildSVG(uid);
  const svg = wrap.firstElementChild;
  const small = opts.variant === 'small' || (opts.variant !== 'full' && size <= 140);
  if (small) svg.classList.add('small');

  const bub = document.createElement('div');
  bub.className = 'gus-bubble';
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

  const hideSay = () => { clearTimeout(bubTimer); bub.hidden = true; };
  const say = (text, ms = 2200) => {
    clearTimeout(bubTimer);
    bub.textContent = String(text == null ? '' : text);
    bub.hidden = !bub.textContent;
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
