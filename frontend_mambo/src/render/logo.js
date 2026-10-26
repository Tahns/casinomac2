// Retro 1960s "THE UNLEASHED MINE" logo drawn as SVG: starburst behind, slab/rounded lettering with a double outline
// (cream + dark) and an offset drop shadow. System fonts only; textLength pins every word to a fixed width so the
// words never run together whatever font the platform falls back to. Two layouts: stacked (landscape side panel) and wide (portrait).
let uid = 0;
const INK = '#2B1A12', PAPER = '#F4E8C8';
const FONT = "'Cooper Black','Arial Rounded MT Bold','Rockwell Extra Bold','Arial Black',Impact,'DejaVu Sans',Verdana,sans-serif";
const f = (n) => Math.round(n * 100) / 100;

function burst(cx, cy, rx, ry, n, inner, rot = 0) {
  const pts = [];
  for (let i = 0; i < n * 2; i++) {
    const a = rot + (i / (n * 2)) * Math.PI * 2, k = i % 2 ? inner : 1;
    pts.push(`${f(cx + Math.cos(a) * rx * k)},${f(cy + Math.sin(a) * ry * k)}`);
  }
  return pts.join(' ');
}

function defs(id) {
  return `<defs><pattern id="${id}h" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(30)"><circle cx="3" cy="3" r="1.5" fill="${INK}" opacity=".4"/></pattern></defs>`;
}

function T(id, txt, x, y, size, len, fill, spacing = '') {
  const a = `x="${x}" y="${y}" text-anchor="middle" font-family="${FONT}" font-weight="900" font-size="${size}" textLength="${len}" lengthAdjust="spacingAndGlyphs" ${spacing}`;
  return { a, txt, fill };
}

function lettering(id, lines, h) {
  const sh = lines.map((l) => `<text ${l.a} fill="${INK}" stroke="${INK}" stroke-width="13" stroke-linejoin="round" transform="translate(4.5 5.5)">${l.txt}</text>`).join('');
  const outer = lines.map((l) => `<text ${l.a} fill="${INK}" stroke="${INK}" stroke-width="11" stroke-linejoin="round">${l.txt}</text>`).join('');
  const cream = lines.map((l) => `<text ${l.a} fill="${PAPER}" stroke="${PAPER}" stroke-width="6.5" stroke-linejoin="round">${l.txt}</text>`).join('');
  const fill = lines.map((l) => `<text ${l.a} fill="${l.fill}" stroke="${INK}" stroke-width="1.4" stroke-linejoin="round" transform="translate(1.6 1.3)">${l.txt}</text>`).join('');
  const clip = `<clipPath id="${id}c">${lines.map((l) => `<text ${l.a}>${l.txt}</text>`).join('')}</clipPath>`;
  const ht = `<g clip-path="url(#${id}c)"><rect x="0" y="${f(h * .62)}" width="1000" height="${h}" fill="url(#${id}h)"/></g>`;
  return `${clip}${sh}${outer}${cream}${fill}${ht}`;
}

function star(x, y, r, cls) {
  return `<path class="${cls}" d="M${x} ${y - r}L${f(x + r * .3)} ${f(y - r * .3)}L${x + r} ${y}L${f(x + r * .3)} ${f(y + r * .3)}L${x} ${y + r}L${f(x - r * .3)} ${f(y + r * .3)}L${x - r} ${y}L${f(x - r * .3)} ${f(y - r * .3)}Z" fill="#fff" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>`;
}

function build(variant) {
  const id = 'lg' + (++uid) + variant[0];
  let w, h, bg, lines, extra;
  if (variant === 'stack') {
    w = 300; h = 214;
    bg = `<polygon points="${burst(150, 108, 148, 100, 18, .8, .1)}" fill="${'#2E8C8C'}" transform="translate(4 3.5)"/>
      <polygon points="${burst(150, 108, 148, 100, 18, .8, .1)}" fill="none" stroke="${INK}" stroke-width="4.5" stroke-linejoin="round"/>
      <polygon points="${burst(150, 108, 118, 78, 18, .84, .1)}" fill="#E8A92B" opacity=".0"/>`;
    lines = [T(id, 'UNLEASHED', 150, 112, 62, 252, '#E8A92B'), T(id, 'MINE', 150, 186, 82, 176, '#D9622B')];
    extra = `<g transform="rotate(-4 150 40)"><rect x="96" y="22" width="108" height="34" rx="7" fill="#B8352A" stroke="${INK}" stroke-width="4" transform="translate(3 3)" opacity=".0"/><rect x="96" y="22" width="108" height="34" rx="7" fill="#B8352A" stroke="${INK}" stroke-width="4"/><text x="150" y="48" text-anchor="middle" font-family="${FONT}" font-weight="900" font-size="26" textLength="60" lengthAdjust="spacingAndGlyphs" fill="${PAPER}" stroke="${INK}" stroke-width="1" paint-order="stroke">THE</text></g>
      ${star(262, 64, 14, 'lgstar')}${star(36, 196, 9, 'lgstar l2')}`;
  } else {
    w = 520; h = 116;
    bg = `<polygon points="${burst(260, 58, 258, 54, 22, .78, .05)}" fill="#2E8C8C" transform="translate(4 3.5)"/>
      <polygon points="${burst(260, 58, 258, 54, 22, .78, .05)}" fill="none" stroke="${INK}" stroke-width="4.5" stroke-linejoin="round"/>`;
    lines = [T(id, 'UNLEASHED', 222, 76, 56, 262, '#E8A92B'), T(id, 'MINE', 450, 80, 64, 112, '#D9622B')];
    extra = `<g transform="rotate(-5 44 56)"><rect x="12" y="38" width="64" height="30" rx="6" fill="#B8352A" stroke="${INK}" stroke-width="4"/><text x="44" y="61" text-anchor="middle" font-family="${FONT}" font-weight="900" font-size="22" textLength="40" lengthAdjust="spacingAndGlyphs" fill="${PAPER}" stroke="${INK}" stroke-width="1" paint-order="stroke">THE</text></g>
      ${star(500, 20, 10, 'lgstar')}`;
  }
  return `<svg class="${variant === 'stack' ? 'stack' : 'wide'}" viewBox="0 0 ${w} ${h}" role="img" aria-label="The Unleashed Mine" focusable="false">${defs(id)}${bg}${lettering(id, lines, h)}${extra}</svg>`;
}

export function buildLogo(host) {
  if (!host || host.dataset.logo) return;
  host.dataset.logo = '1';
  host.insertAdjacentHTML('beforeend', build('stack') + build('wide'));
}
