// Symbols are drawn in code: one hidden SVG sprite (gradients + <symbol>s) is injected
// into the document once; cells reference it with <use>. No image files.

export const SYMBOLS = ['H1', 'H2', 'H3', 'H4', 'L1', 'L2', 'L3', 'L4', 'W', 'S'];

// dominant colour per symbol (used for shatter shards / glows)
export const SYM_COLOR = {
  H1: '#ff3b57', H2: '#3d8bff', H3: '#25d67a', H4: '#ffb62e', L1: '#b45cff',
  L2: '#9fb2c4', L3: '#ffb347', L4: '#ffd23c', W: '#ffd54a', S: '#ff4b2e',
};

const f = (n) => Math.round(n * 100) / 100;
const hsl = (h, s, l) => `hsl(${f(h)} ${f(s)}% ${f(Math.max(4, Math.min(96, l)))}%)`;
const LIGHT = -Math.PI * 0.75; // light comes from the upper left

function poly(pts, fill, stroke, sw) {
  const p = pts.map((q) => `${f(q[0])},${f(q[1])}`).join(' ');
  return `<polygon points="${p}" fill="${fill}"${stroke ? ` stroke="${stroke}" stroke-width="${sw || 0.7}" stroke-linejoin="round"` : ''}/>`;
}

function regular(n, rx, ry, rot, cx = 50, cy = 52) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const a = rot + (i * 2 * Math.PI) / n;
    out.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]);
  }
  return out;
}

// Faceted gem: outer polygon + scaled inner "table"; every facet is shaded by its normal.
function gem(id, outer, { h, s = 82, l = 48, inner = 0.56, cx = 50, cy = 52 }) {
  const scaled = outer.map(([x, y]) => [cx + (x - cx) * inner, cy + (y - cy) * inner - 1.5]);
  let g = '';
  // soft ground shadow
  g += `<ellipse cx="50" cy="91" rx="28" ry="4" fill="#000" opacity=".35"/>`;
  g += poly(outer, hsl(h, s, l - 22), hsl(h, s, l - 30), 2.2);
  const n = outer.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const mx = (outer[i][0] + outer[j][0]) / 2 - cx;
    const my = (outer[i][1] + outer[j][1]) / 2 - cy;
    const a = Math.atan2(my, mx);
    const shade = l + 26 * Math.cos(a - LIGHT) + (i % 2 ? -3 : 3);
    g += poly([outer[i], outer[j], scaled[j], scaled[i]], hsl(h, s - (shade > 70 ? 14 : 0), shade), 'rgba(255,255,255,.28)', 0.5);
  }
  // table, split into a fan of triangles for a cut look
  const tc = [cx - 1, cy - 3];
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const mx = (scaled[i][0] + scaled[j][0]) / 2 - tc[0];
    const my = (scaled[i][1] + scaled[j][1]) / 2 - tc[1];
    const a = Math.atan2(my, mx);
    const shade = l + 12 + 18 * Math.cos(a - LIGHT) + (i % 2 ? 4 : -2);
    g += poly([tc, scaled[i], scaled[j]], hsl(h, s - 6, shade), 'rgba(255,255,255,.22)', 0.4);
  }
  // sparkle + gloss
  g += `<path d="M${f(outer[0][0] * 0 + 33)} 30 l2.2 5.4 5.4 2.2 -5.4 2.2 -2.2 5.4 -2.2 -5.4 -5.4 -2.2 5.4 -2.2z" fill="#fff" opacity=".92"/>`;
  g += `<ellipse cx="60" cy="40" rx="6" ry="2.4" fill="#fff" opacity=".35" transform="rotate(-35 60 40)"/>`;
  return `<symbol id="sym-${id}" viewBox="0 0 100 100">${g}</symbol>`;
}

function prism(x0, x1, tip, sh, base, h, rot, px, py) {
  const xm = (x0 + x1) / 2;
  const wq = (x1 - x0) / 4;
  const a = [x0, sh], b = [x0 + wq, sh], c = [x1 - wq, sh], d = [x1, sh];
  let g = `<g transform="rotate(${rot} ${px} ${py})">`;
  g += poly([[x0, sh], [x0 + wq, sh], [x0 + wq, base], [x0, base - 2]], hsl(h, 70, 28), hsl(h, 70, 20), 0.8);
  g += poly([[x0 + wq, sh], [x1 - wq, sh], [x1 - wq, base], [x0 + wq, base]], hsl(h, 78, 52), hsl(h, 70, 22), 0.8);
  g += poly([[x1 - wq, sh], [x1, sh], [x1, base - 2], [x1 - wq, base]], hsl(h, 72, 38), hsl(h, 70, 20), 0.8);
  g += poly([a, b, [xm, tip]], hsl(h, 75, 40), hsl(h, 70, 22), 0.8);
  g += poly([b, c, [xm, tip]], hsl(h, 82, 72), hsl(h, 70, 22), 0.8);
  g += poly([c, d, [xm, tip]], hsl(h, 75, 50), hsl(h, 70, 22), 0.8);
  g += `<path d="M${x0 + wq + 1.5} ${sh + 4} V${base - 8}" stroke="#fff" stroke-opacity=".45" stroke-width="1.6" stroke-linecap="round"/>`;
  return g + '</g>';
}

function amethyst() {
  let g = `<ellipse cx="50" cy="91" rx="30" ry="4" fill="#000" opacity=".35"/>`;
  g += prism(10, 36, 30, 46, 88, 285, -14, 23, 88);
  g += prism(64, 90, 26, 44, 88, 285, 13, 77, 88);
  g += prism(32, 68, 6, 34, 90, 285, 0, 50, 90);
  g += `<path d="M44 12 l1.8 4.4 4.4 1.8 -4.4 1.8 -1.8 4.4 -1.8 -4.4 -4.4 -1.8 4.4 -1.8z" fill="#fff" opacity=".9"/>`;
  return `<symbol id="sym-L1" viewBox="0 0 100 100">${g}</symbol>`;
}

function pickaxe() {
  let g = `<ellipse cx="50" cy="92" rx="26" ry="3.6" fill="#000" opacity=".32"/>`;
  g += '<g transform="rotate(34 50 56)">';
  // handle
  g += `<rect x="45" y="22" width="10" height="72" rx="4" fill="url(#g-wood)" stroke="#2c1608" stroke-width="1.6"/>`;
  g += `<path d="M48 40 V86 M52 34 V80" stroke="#2c1608" stroke-opacity=".35" stroke-width="1"/>`;
  g += `<rect x="44" y="84" width="12" height="6" rx="2" fill="#4a2a10" stroke="#2c1608" stroke-width="1.2"/>`;
  // head
  g += `<path d="M6 40 Q50 -12 94 40 Q50 22 6 40Z" fill="url(#g-steel)" stroke="#1f2a35" stroke-width="2" stroke-linejoin="round"/>`;
  g += `<path d="M14 36 Q50 2 86 36" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="2" stroke-linecap="round"/>`;
  g += `<path d="M9 40 L5 43 L20 37Z M91 40 L95 43 L80 37Z" fill="#dce6ee" stroke="#1f2a35" stroke-width="1"/>`;
  g += `<rect x="40" y="16" width="20" height="16" rx="3" fill="url(#g-iron)" stroke="#1f2a35" stroke-width="1.8"/>`;
  g += `<circle cx="45" cy="24" r="1.7" fill="#cfd8df"/><circle cx="55" cy="24" r="1.7" fill="#cfd8df"/>`;
  g += '</g>';
  return `<symbol id="sym-L2" viewBox="0 0 100 100">${g}</symbol>`;
}

function lantern() {
  let g = `<ellipse cx="50" cy="92" rx="22" ry="3.6" fill="#000" opacity=".32"/>`;
  g += `<circle cx="50" cy="56" r="40" fill="url(#g-glow)" opacity=".55"/>`;
  g += `<path d="M36 22 Q36 6 50 6 Q64 6 64 22" fill="none" stroke="#1d1710" stroke-width="5" stroke-linecap="round"/>`;
  g += `<path d="M36 22 Q36 8 50 8 Q64 8 64 22" fill="none" stroke="#9a8260" stroke-width="2.4" stroke-linecap="round"/>`;
  g += `<path d="M30 34 L38 20 H62 L70 34Z" fill="url(#g-iron)" stroke="#1d1710" stroke-width="2" stroke-linejoin="round"/>`;
  g += `<rect x="29" y="34" width="42" height="40" rx="6" fill="url(#g-lamp)" stroke="#1d1710" stroke-width="2"/>`;
  g += `<path d="M50 70 C40 62 44 54 50 46 C52 52 60 56 58 64 C57 68 54 70 50 70Z" fill="#fff6b0" stroke="#ff9a1a" stroke-width="1.6"/>`;
  g += `<path d="M50 70 C46 66 47 60 50 56 C53 60 54 66 50 70Z" fill="#fff" opacity=".9"/>`;
  g += `<path d="M39 35 V73 M61 35 V73" stroke="#1d1710" stroke-width="3"/>`;
  g += `<path d="M33 38 V68" stroke="#fff" stroke-opacity=".55" stroke-width="2.2" stroke-linecap="round"/>`;
  g += `<path d="M26 74 H74 L68 86 H32Z" fill="url(#g-iron)" stroke="#1d1710" stroke-width="2" stroke-linejoin="round"/>`;
  g += `<rect x="29" y="31" width="42" height="5" rx="2" fill="#2a2118"/>`;
  return `<symbol id="sym-L3" viewBox="0 0 100 100">${g}</symbol>`;
}

function hardhat() {
  let g = `<ellipse cx="50" cy="88" rx="38" ry="4.4" fill="#000" opacity=".32"/>`;
  g += `<path d="M16 68 Q14 24 50 22 Q86 24 84 68Z" fill="url(#g-hat)" stroke="#8a4a00" stroke-width="2.4" stroke-linejoin="round"/>`;
  g += `<path d="M42 23 V67 H58 V23 Q50 20 42 23Z" fill="#ffd45a" stroke="#8a4a00" stroke-width="1.6"/>`;
  g += `<path d="M30 30 Q26 46 27 66 M70 30 Q74 46 73 66" fill="none" stroke="#c46a00" stroke-opacity=".6" stroke-width="1.6"/>`;
  g += `<path d="M24 52 Q27 34 40 29" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="3" stroke-linecap="round"/>`;
  g += `<rect x="8" y="64" width="84" height="13" rx="6.5" fill="url(#g-brim)" stroke="#8a4a00" stroke-width="2.2"/>`;
  g += `<circle cx="50" cy="45" r="9" fill="#2b2b2b" stroke="#8a4a00" stroke-width="1.6"/>`;
  g += `<circle cx="50" cy="45" r="6" fill="url(#g-lamp)"/><circle cx="48" cy="43" r="2" fill="#fff"/>`;
  return `<symbol id="sym-L4" viewBox="0 0 100 100">${g}</symbol>`;
}

function nugget() {
  let g = `<circle cx="50" cy="52" r="46" fill="url(#g-goldglow)"/>`;
  g += `<ellipse cx="50" cy="90" rx="30" ry="4" fill="#000" opacity=".35"/>`;
  const body = 'M18 62 Q10 42 28 30 Q38 10 60 18 Q86 20 84 46 Q94 70 70 82 Q44 94 26 80 Q16 72 18 62Z';
  g += `<path d="${body}" fill="url(#g-gold)" stroke="#6d4300" stroke-width="2.6" stroke-linejoin="round"/>`;
  g += `<path d="M28 32 Q40 24 52 30 Q44 42 30 44Z" fill="#fff6b8" opacity=".85"/>`;
  g += `<path d="M62 22 Q78 26 80 44 Q70 40 62 22Z" fill="#fff0a0" opacity=".6"/>`;
  g += `<path d="M20 64 Q30 78 52 82 Q36 86 24 78Z" fill="#8a5a00" opacity=".55"/>`;
  g += `<path d="M66 60 Q80 66 70 80 Q62 84 56 80 Q70 74 66 60Z" fill="#a06800" opacity=".5"/>`;
  g += `<path d="M30 50 Q50 42 70 52" fill="none" stroke="#b07a00" stroke-width="1.4" opacity=".6"/>`;
  g += `<text x="51" y="68" text-anchor="middle" font-family="Georgia,'Times New Roman',serif" font-weight="900" font-size="40" fill="#7a4800" stroke="#fff3b0" stroke-width="1.2" paint-order="stroke">W</text>`;
  g += `<path d="M82 14 l2 6 6 2 -6 2 -2 6 -2 -6 -6 -2 6 -2z" fill="#fff"><animate attributeName="opacity" values="1;.2;1" dur="1.6s" repeatCount="indefinite"/></path>`;
  g += `<path d="M14 24 l1.6 4.4 4.4 1.6 -4.4 1.6 -1.6 4.4 -1.6 -4.4 -4.4 -1.6 4.4 -1.6z" fill="#fff"><animate attributeName="opacity" values=".2;1;.2" dur="1.3s" repeatCount="indefinite"/></path>`;
  return `<symbol id="sym-W" viewBox="0 0 100 100">${g}</symbol>`;
}

function dynamite() {
  let g = `<circle cx="50" cy="58" r="42" fill="url(#g-redglow)"/>`;
  g += `<ellipse cx="50" cy="92" rx="30" ry="4" fill="#000" opacity=".35"/>`;
  const stick = (x, rot) => `<g transform="rotate(${rot} ${x + 9} 80)"><rect x="${x}" y="32" width="18" height="56" rx="6" fill="url(#g-stick)" stroke="#5a0d08" stroke-width="2"/><rect x="${x + 3}" y="36" width="3.4" height="46" rx="1.7" fill="#fff" opacity=".4"/><ellipse cx="${x + 9}" cy="33" rx="7" ry="3" fill="#7a1a10" stroke="#5a0d08" stroke-width="1.4"/></g>`;
  g += stick(18, -8) + stick(61, 8) + stick(40, 0);
  g += `<rect x="14" y="54" width="72" height="17" rx="3" fill="#e9d6a8" stroke="#6b5322" stroke-width="2"/>`;
  g += `<text x="50" y="67.5" text-anchor="middle" font-family="Arial Black,Impact,sans-serif" font-weight="900" font-size="14" letter-spacing="1" fill="#8a1208">TNT</text>`;
  g += `<path d="M49 31 Q46 20 56 15 Q62 12 64 6" fill="none" stroke="#2a1d10" stroke-width="3.4" stroke-linecap="round"/>`;
  g += `<path d="M49 31 Q46 20 56 15 Q62 12 64 6" fill="none" stroke="#a88a5a" stroke-width="1.2" stroke-dasharray="2 3" stroke-linecap="round"/>`;
  g += `<g><circle cx="64" cy="6" r="9" fill="url(#g-spark)"><animate attributeName="r" values="7;10;7" dur=".5s" repeatCount="indefinite"/></circle><path d="M64 -2 l1.8 6 6 1.8 -6 1.8 -1.8 6 -1.8 -6 -6 -1.8 6 -1.8z" fill="#fff"><animate attributeName="opacity" values="1;.4;1" dur=".35s" repeatCount="indefinite"/></path></g>`;
  return `<symbol id="sym-S" viewBox="0 0 100 100">${g}</symbol>`;
}

const DEFS = `
<linearGradient id="g-wood" x1="0" x2="1"><stop offset="0" stop-color="#b8793a"/><stop offset=".5" stop-color="#e0a35e"/><stop offset="1" stop-color="#7a4a22"/></linearGradient>
<linearGradient id="g-steel" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f2f7fb"/><stop offset=".5" stop-color="#9fb2c4"/><stop offset="1" stop-color="#4d5f70"/></linearGradient>
<linearGradient id="g-iron" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8b8f95"/><stop offset="1" stop-color="#3b3f45"/></linearGradient>
<radialGradient id="g-lamp" cx=".5" cy=".6" r=".7"><stop offset="0" stop-color="#fff7b8"/><stop offset=".55" stop-color="#ffc247"/><stop offset="1" stop-color="#c8641a"/></radialGradient>
<radialGradient id="g-glow" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ffd36a" stop-opacity=".9"/><stop offset="1" stop-color="#ffb347" stop-opacity="0"/></radialGradient>
<radialGradient id="g-goldglow" cx=".5" cy=".5" r=".5"><stop offset=".45" stop-color="#ffe066" stop-opacity=".7"/><stop offset="1" stop-color="#ffcc00" stop-opacity="0"/></radialGradient>
<radialGradient id="g-redglow" cx=".5" cy=".5" r=".5"><stop offset=".5" stop-color="#ff5030" stop-opacity=".45"/><stop offset="1" stop-color="#ff5030" stop-opacity="0"/></radialGradient>
<radialGradient id="g-spark" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff"/><stop offset=".4" stop-color="#ffe066"/><stop offset="1" stop-color="#ff7a1a" stop-opacity="0"/></radialGradient>
<linearGradient id="g-hat" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffe46a"/><stop offset=".55" stop-color="#ffb81f"/><stop offset="1" stop-color="#e07a00"/></linearGradient>
<linearGradient id="g-brim" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffc52e"/><stop offset="1" stop-color="#d77a00"/></linearGradient>
<linearGradient id="g-gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff4a8"/><stop offset=".35" stop-color="#ffd02a"/><stop offset=".75" stop-color="#d89000"/><stop offset="1" stop-color="#9a6200"/></linearGradient>
<linearGradient id="g-stick" x1="0" x2="1"><stop offset="0" stop-color="#a81810"/><stop offset=".4" stop-color="#ff4a30"/><stop offset="1" stop-color="#8a0f0a"/></linearGradient>`;

let built = false;
export function ensureSprite() {
  if (built || typeof document === 'undefined') return;
  built = true;
  const parts = [
    gem('H1', regular(8, 40, 40, Math.PI / 8), { h: 350, s: 86, l: 46 }),
    gem('H2', regular(6, 42, 38, 0), { h: 214, s: 84, l: 48, inner: 0.58 }),
    gem('H3', [[28, 12], [72, 12], [88, 28], [88, 76], [72, 92], [28, 92], [12, 76], [12, 28]], { h: 146, s: 72, l: 40, inner: 0.6, cy: 52 }),
    gem('H4', regular(5, 43, 41, -Math.PI / 2), { h: 38, s: 96, l: 52, inner: 0.55 }),
    amethyst(), pickaxe(), lantern(), hardhat(), nugget(), dynamite(),
  ];
  const svg = `<svg id="sym-sprite" xmlns="http://www.w3.org/2000/svg" width="0" height="0" style="position:absolute;width:0;height:0;overflow:hidden" aria-hidden="true" focusable="false"><defs>${DEFS}</defs>${parts.join('')}</svg>`;
  document.body.insertAdjacentHTML('afterbegin', svg);
}

export function symbolMarkup(name) {
  return `<svg class="sym-svg" viewBox="0 0 100 100" aria-hidden="true" focusable="false"><use href="#sym-${name}"/></svg>`;
}
