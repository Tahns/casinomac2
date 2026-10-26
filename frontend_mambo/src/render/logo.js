// AGENT MAMBO logo, drawn as SVG (system fonts only, no images). Two layouts share one design:
//   stack (landscape side panel): AGENT (small, tilted -4deg, lemon) above MAMBO (large, coral)
//   wide  (portrait): AGENT on the left, MAMBO on the right, gap >= 0.3 em
// Every WORD is its own set of <text> elements and every LETTER is placed at a fixed x with a pinned textLength, so glyph
// metrics of the fallback font can never make words run together. Accessible name: the single string "Agent Mambo".
// Lettering: indigo offset shadow, ink outline, cream inner line, misregistered colour fill, halftone dots on the lower part,
// 14-point lemon starburst behind (fill shifted 3 px off its ink outline), bomb-clock dot over the O.
// Also boots the loading screen extras (Mambo in `think` + the wire logo) when #mb-ld-logo / #mb-ld-mascot exist.
let uid = 0;
const INK = '#14102B', PAPER = '#FBF1D9', LEMON = '#FFD23F', CORAL = '#F0472F', INDIGO = '#2B2A6B', TEAL = '#1FB5A3', FLAM = '#F5799F';
const FONT = "'Arial Black','Futura','Century Gothic','Arial Rounded MT Bold','DejaVu Sans',Verdana,sans-serif";
const f = (n) => Math.round(n * 100) / 100;
export const LOGO_TITLE = 'Agent Mambo';

// advance widths in em, forced onto each glyph through textLength so any fallback font gives the same layout
const W = { A: .76, G: .82, E: .66, N: .82, T: .7, M: .92, B: .76, O: .84 };
const BOUNCE = [-3, 2.5, -2, 3, -2.5]; // per-letter cut-paper tilt in degrees

function burst(cx, cy, rx, ry, n, inner, rot = 0) {
  const pts = [];
  for (let i = 0; i < n * 2; i++) {
    const a = rot + (i / (n * 2)) * Math.PI * 2, k = i % 2 ? inner : 1;
    pts.push(`${f(cx + Math.cos(a) * rx * k)},${f(cy + Math.sin(a) * ry * k)}`);
  }
  return pts.join(' ');
}

function defs(id) {
  return `<defs><pattern id="${id}h" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(30)"><circle cx="3" cy="3" r="1.4" fill="${INK}" opacity=".38"/></pattern></defs>`;
}

// one word -> letter descriptors centred on cx
function word(txt, cx, y, size, gap, tilt, fill) {
  const lens = [...txt].map((ch) => f(W[ch] * size)); const total = lens.reduce((a, b) => a + b, 0) + gap * (lens.length - 1);
  let x = cx - total / 2; const out = [];
  [...txt].forEach((ch, i) => {
    const cxl = x + lens[i] / 2; x += lens[i] + gap;
    const rot = tilt + BOUNCE[i % 5] * size / 60; const dy = (i % 2 ? -1 : 1) * size * .018;
    out.push({ ch, x: f(cxl), y: f(y + dy), len: lens[i], size, rot: f(rot), cx, cy: y, tilt, fill });
  });
  return { letters: out, left: f(cx - total / 2), right: f(cx + total / 2), size, y, cx, tilt };
}

function letterAttrs(l, extra = '') {
  return `x="${l.x}" y="${l.y}" text-anchor="middle" font-family="${FONT}" font-weight="900" font-size="${l.size}" textLength="${l.len}" lengthAdjust="spacingAndGlyphs" transform="rotate(${l.rot} ${l.x} ${f(l.y - l.size * .3)})${extra}"`;
}

function lettering(id, words, sh, k) {
  const L = words.flatMap((w) => w.letters.map((l) => ({ ...l, w })));
  const wr = (l, inner) => `<g transform="rotate(${l.tilt} ${l.cx} ${l.cy})">${inner}</g>`;
  const txt = (l, attrs) => wr(l, `<text ${letterAttrs(l)} ${attrs}>${l.ch}</text>`);
  const shadow = L.map((l) => wr(l, `<g transform="translate(${sh[0]} ${sh[1]})"><text ${letterAttrs(l)} fill="${INDIGO}" stroke="${INDIGO}" stroke-width="${f(15 * k)}" stroke-linejoin="round">${l.ch}</text></g>`)).join('');
  const outer = L.map((l) => txt(l, `fill="${INK}" stroke="${INK}" stroke-width="${f(12.5 * k)}" stroke-linejoin="round"`)).join('');
  const cream = L.map((l) => txt(l, `fill="${PAPER}" stroke="${PAPER}" stroke-width="${f(6.2 * k)}" stroke-linejoin="round"`)).join('');
  const fill = L.map((l) => wr(l, `<g transform="translate(${f(1.6 * k)} ${f(1.3 * k)})"><text ${letterAttrs(l)} fill="${l.fill}" stroke="${INK}" stroke-width="${f(1.3 * k)}" stroke-linejoin="round">${l.ch}</text></g>`)).join('');
  const clip = `<clipPath id="${id}c">${L.map((l) => wr(l, `<text ${letterAttrs(l)}>${l.ch}</text>`)).join('')}</clipPath>`;
  const ht = `<g clip-path="url(#${id}c)"><rect x="-20" y="${f(words[words.length - 1].y - words[words.length - 1].size * .3)}" width="700" height="200" fill="url(#${id}h)"/></g>`;
  return `${clip}${shadow}${outer}${cream}${fill}${ht}`;
}

function star(x, y, r, cls) {
  return `<path class="${cls}" d="M${x} ${y - r}L${f(x + r * .3)} ${f(y - r * .3)}L${x + r} ${y}L${f(x + r * .3)} ${f(y + r * .3)}L${x} ${y + r}L${f(x - r * .3)} ${f(y + r * .3)}L${x - r} ${y}L${f(x - r * .3)} ${f(y - r * .3)}Z" fill="${PAPER}" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>`;
}

// small bomb-clock sitting over the O: two bells, cream dial, ink hands, spark star on top
function clock(x, y, r) {
  return `<g class="lgclock" transform="translate(${f(x)} ${f(y)})">
    <circle cx="${f(-r * .78)}" cy="${f(-r * .78)}" r="${f(r * .42)}" fill="${CORAL}" stroke="${INK}" stroke-width="2.4"/><circle cx="${f(r * .78)}" cy="${f(-r * .78)}" r="${f(r * .42)}" fill="${CORAL}" stroke="${INK}" stroke-width="2.4"/>
    <circle r="${r}" fill="${PAPER}" stroke="${INK}" stroke-width="3.6"/>
    <circle r="${f(r * .8)}" fill="none" stroke="${CORAL}" stroke-width="1.6"/>
    <path d="M0 ${f(-r * .62)}V0" stroke="${INK}" stroke-width="2.6" stroke-linecap="round"/>
    <g class="lghand"><path d="M0 0L${f(r * .46)} ${f(r * .1)}" stroke="${INK}" stroke-width="2.6" stroke-linecap="round"/></g>
    <circle r="2" fill="${INK}"/>
    <path d="M0 ${f(-r - 1)}V${f(-r - 6)}" stroke="${INK}" stroke-width="2.4" stroke-linecap="round"/>${star(0, f(-r - 9), 5.4, 'lgstar l3')}
  </g>`;
}

function build(variant) {
  const id = 'lg' + (++uid) + variant[0];
  let vw, vh, bg, words, k, sh, extra;
  if (variant === 'stack') {
    vw = 300; vh = 190; k = 1; sh = [5, 6];
    const a = word('AGENT', 150, 74, 35, 3, -4, LEMON), m = word('MAMBO', 150, 138, 62, 2.5, 0, CORAL);
    words = [a, m];
    const bp = burst(150, 98, 148, 88, 14, .8, .06);
    bg = `<polygon points="${bp}" fill="${LEMON}" transform="translate(3 3)"/><polygon points="${bp}" fill="none" stroke="${INK}" stroke-width="4.5" stroke-linejoin="round"/>`;
    const o = m.letters[4];
    extra = `${clock(o.x + o.len * .46, o.y - o.size * .86, 11)}${star(272, 40, 12, 'lgstar')}${star(30, 158, 8, 'lgstar l2')}`;
  } else {
    vw = 520; vh = 122; k = .95; sh = [4.5, 5.5];
    const a = word('AGENT', 90, 72, 34, 3, -4, LEMON), m = word('MAMBO', 352, 92, 74, 3, 0, CORAL);
    words = [a, m];
    const bp = burst(260, 62, 258, 58, 20, .8, .04);
    bg = `<polygon points="${bp}" fill="${LEMON}" transform="translate(3 3)"/><polygon points="${bp}" fill="none" stroke="${INK}" stroke-width="4.5" stroke-linejoin="round"/>`;
    const o = m.letters[4];
    extra = `${clock(o.x + o.len * .46, o.y - o.size * .86, 11)}${star(14, 24, 9, 'lgstar l2')}`;
  }
  return `<svg class="${variant === 'stack' ? 'stack' : 'wide'}" viewBox="0 0 ${vw} ${vh}" role="img" aria-label="${LOGO_TITLE}" focusable="false">${defs(id)}${bg}${lettering(id, words, sh, k)}${extra}</svg>`;
}

const CSS = `
.logo .lgstar{transform-box:fill-box;transform-origin:50% 50%;animation:mblgtw 1.6s steps(1,end) infinite}
.logo .lgstar.l2{animation-delay:.5s}.logo .lgstar.l3{animation-delay:1s}
@keyframes mblgtw{0%{transform:scale(1)}50%{transform:scale(.55) rotate(20deg)}100%{transform:scale(1)}}
.logo .lghand{animation:mblghand 6s steps(12,end) infinite}
@keyframes mblghand{to{transform:rotate(360deg)}}
@media (prefers-reduced-motion:reduce){.logo .lgstar,.logo .lghand{animation:none!important}}
`;

export function buildLogo(host) {
  if (!host || host.dataset.logo) return;
  host.dataset.logo = '1';
  if (!document.getElementById('mb-logo-css')) { const st = document.createElement('style'); st.id = 'mb-logo-css'; st.textContent = CSS; document.head.appendChild(st); }
  host.insertAdjacentHTML('beforeend', build('stack') + build('wide'));
}

// ---- loading screen: logo + Mambo thinking (the wire progress bar is plain markup + CSS inside #loading in index.html)
export function initLoading() {
  if (typeof document === 'undefined') return;
  const lg = document.getElementById('mb-ld-logo');
  if (lg && !lg.dataset.logo) {
    lg.dataset.logo = '1';
    lg.insertAdjacentHTML('beforeend', build('stack').replace('class="stack"', 'class="ld-svg"'));
  }
  const slot = document.getElementById('mb-ld-mascot');
  if (slot && !slot.dataset.m) {
    slot.dataset.m = '1';
    import('./mascot.js').then((mod) => {
      const size = Math.round(Math.min(220, Math.max(70, Math.min(window.innerWidth, window.innerHeight) * .34)));
      const reduced = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
      const m = mod.createMascot(slot, { size, reduced });
      if (m && m.setPose) m.setPose('think');
    }).catch(() => { /* mascot is optional on the loading screen */ });
  }
}
try { initLoading(); } catch (e) { /* ignore */ }
