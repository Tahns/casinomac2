// 1960s cartoon symbols, all drawn in code: one hidden SVG sprite (halftone patterns + <symbol>s) is injected
// into the document once; cells reference it with <use>. No image files.
// Style: flat colour, thick #2B1A12 outlines, fill offset from the outline (screen-print misregistration),
// halftone dots on shadow faces, ONE simple white highlight stroke, limited-animation idle (steps()).

export const SYMBOLS = ['H1', 'H2', 'H3', 'H4', 'L1', 'L2', 'L3', 'L4', 'W', 'S'];

// dominant colour per symbol (used for puffs / stars / glows)
export const SYM_COLOR = {
  H1: '#B8352A', H2: '#2F6FB8', H3: '#3A9B5C', H4: '#E8A92B', L1: '#8A4FA0',
  L2: '#8FA3AD', L3: '#2E8C8C', L4: '#D9622B', W: '#F2B52E', S: '#B8352A',
};

const INK = '#2B1A12', PAPER = '#F4E8C8', MX = 2.8, MY = 2.2; // misregistration offset (100px symbol box)
const f = (n) => Math.round(n * 100) / 100;
const P = (pts) => 'M' + pts.map((q) => `${f(q[0])} ${f(q[1])}`).join('L') + 'Z';

// flat shape: fill (offset from outline) + optional halftone + outline
function T(d, fill, o = {}) {
  let g = `<path d="${d}" fill="${fill}" transform="translate(${MX} ${MY})"/>`;
  if (o.ht) g += `<path d="${d}" fill="url(#ht${o.ht === 2 ? 2 : ''})" transform="translate(${MX} ${MY})"/>`;
  if (!o.noline) g += `<path d="${d}" fill="none" stroke="${INK}" stroke-width="${o.sw || 3.6}" stroke-linejoin="round" stroke-linecap="round"/>`;
  return g;
}
const fillOnly = (d, fill, ht) => T(d, fill, { ht, noline: true });
const lines = (d, sw = 2.2) => `<path d="${d}" fill="none" stroke="${INK}" stroke-width="${sw}" stroke-linejoin="round" stroke-linecap="round"/>`;
const hl = (d, w = 3.4) => `<path d="${d}" fill="none" stroke="#fff" stroke-width="${w}" stroke-linecap="round"/>`;
const star4 = (cx, cy, r, fill, cls = '', extra = '') => `<path class="${cls}" ${extra} d="M${cx} ${cy - r}L${f(cx + r * .3)} ${f(cy - r * .3)}L${cx + r} ${cy}L${f(cx + r * .3)} ${f(cy + r * .3)}L${cx} ${cy + r}L${f(cx - r * .3)} ${f(cy + r * .3)}L${cx - r} ${cy}L${f(cx - r * .3)} ${f(cy - r * .3)}Z" fill="${fill}" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"/>`;

const LIGHT = -Math.PI * 0.75;

// Cut gem: outer polygon + shrunken table; facet shade follows the normal (3 flat tones, halftone on the dark ones)
function cutGem(id, outer, { base, light, dark, inner = 0.52, cx = 50, cy = 50, tableShift = [-1, -3], hlPath }) {
  const sc = outer.map(([x, y]) => [cx + (x - cx) * inner + tableShift[0], cy + (y - cy) * inner + tableShift[1]]);
  const n = outer.length;
  let g = fillOnly(P(outer), base);
  let ln = '';
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const a = Math.atan2((outer[i][1] + outer[j][1]) / 2 - cy, (outer[i][0] + outer[j][0]) / 2 - cx);
    const d = Math.cos(a - LIGHT);
    const fill = d > 0.5 ? light : d < -0.25 ? dark : base;
    g += fillOnly(P([outer[i], outer[j], sc[j], sc[i]]), fill, d < -0.25 ? 1 : 0);
    ln += `M${f(outer[i][0])} ${f(outer[i][1])}L${f(sc[i][0])} ${f(sc[i][1])}`;
  }
  g += fillOnly(P(sc), light);
  g += fillOnly(P([sc[2 % n], sc[3 % n], sc[4 % n], sc[(5) % n]]), base, 0);
  g += lines(ln + P(sc), 2.2);
  g += lines(P(outer), 3.8);
  g += hl(hlPath || `M${f(sc[0][0] - 3)} ${f(sc[0][1] + 7)}Q${f(sc[0][0])} ${f(sc[0][1] + 1)} ${f(sc[0][0] + 9)} ${f(sc[0][1] + 1)}`);
  g += star4(78, 22, 11, '#fff', 'twk');
  return `<symbol id="sym-${id}" viewBox="0 0 100 100">${g}</symbol>`;
}

function ruby() {
  const outer = [[27, 15], [73, 15], [92, 38], [50, 91], [8, 38]];
  const C = { base: '#B8352A', light: '#E5604A', mid: '#CF4535', dark: '#7E2018' };
  let g = fillOnly(P(outer), C.base);
  g += fillOnly(P([[27, 15], [73, 15], [62, 38], [38, 38]]), C.light);
  g += fillOnly(P([[73, 15], [92, 38], [62, 38]]), C.dark, 1);
  g += fillOnly(P([[38, 38], [62, 38], [50, 91]]), C.mid);
  g += fillOnly(P([[62, 38], [92, 38], [50, 91]]), C.dark, 1);
  g += lines('M8 38H92M27 15L38 38M73 15L62 38M38 38L50 91M62 38L50 91', 2.2);
  g += lines(P(outer), 3.8);
  g += hl('M31 26Q34 21 47 21');
  g += star4(80, 20, 11, '#fff', 'twk');
  return `<symbol id="sym-H1" viewBox="0 0 100 100">${g}</symbol>`;
}

function sapphire() {
  const outer = [[50, 8], [89, 30], [89, 70], [50, 92], [11, 70], [11, 30]];
  return cutGem('H2', outer, { base: '#2F6FB8', light: '#69A4E6', dark: '#1E2F4A', inner: 0.5, hlPath: 'M36 36Q40 30 50 29' });
}
function emerald() {
  const outer = [[32, 7], [68, 7], [88, 25], [88, 75], [68, 93], [32, 93], [12, 75], [12, 25]];
  return cutGem('H3', outer, { base: '#3A9B5C', light: '#74CC8A', dark: '#1F6B3E', inner: 0.56, hlPath: 'M31 27Q34 20 44 19' });
}
function topaz() {
  const outer = 'M50 7C66 28 89 46 85 67C81 85 65 93 50 93C35 93 19 85 15 67C11 46 34 28 50 7Z';
  let g = fillOnly(outer, '#E8A92B');
  g += fillOnly('M50 7C66 28 89 46 85 67C81 85 65 93 50 93Z', '#B87A14', 1);
  g += fillOnly('M50 30L68 56L50 82L32 56Z', '#F6CF5C');
  g += fillOnly('M50 30L68 56L50 82Z', '#E8A92B');
  g += lines('M50 30L68 56L50 82L32 56ZM50 7L50 30M85 67L68 56M15 67L32 56M50 93L50 82', 2.2);
  g += lines(outer, 3.8);
  g += hl('M28 56Q30 44 41 34');
  g += star4(78, 22, 11, '#fff', 'twk');
  return `<symbol id="sym-H4" viewBox="0 0 100 100">${g}</symbol>`;
}

function crystal(x0, x1, tip, sh, base, rot, px, py, C) {
  const xm = (x0 + x1) / 2;
  let g = `<g transform="rotate(${rot} ${px} ${py})">`;
  g += fillOnly(P([[x0, sh], [xm, tip], [x1, sh], [x1, base], [x0, base]]), C.base);
  g += fillOnly(P([[x0, sh], [xm, tip], [xm, sh]]), C.light);
  g += fillOnly(P([[x0, sh], [xm, sh], [xm, base], [x0, base]]), C.light);
  g += fillOnly(P([[xm, sh], [x1, sh], [x1, base], [xm, base]]), C.dark, 1);
  g += lines(`M${x0} ${sh}H${x1}M${xm} ${tip}L${xm} ${base}`, 2.2);
  g += lines(P([[x0, sh], [xm, tip], [x1, sh], [x1, base], [x0, base]]), 3.6);
  return g + '</g>';
}
function amethyst() {
  const C = { base: '#8A4FA0', light: '#C28BD8', dark: '#6A3D6E' };
  let g = crystal(14, 38, 32, 46, 88, -14, 26, 88, C) + crystal(62, 86, 28, 44, 88, 13, 74, 88, C);
  g += crystal(31, 69, 6, 30, 90, 0, 50, 90, C);
  g += T('M12 88Q50 79 88 88L90 94Q50 99 10 94Z', '#6A3D6E', { ht: 1, sw: 3 });
  g += hl('M40 36Q39 52 40 68');
  g += star4(79, 18, 11, '#fff', 'twk');
  return `<symbol id="sym-L1" viewBox="0 0 100 100">${g}</symbol>`;
}

function pickaxe() {
  let g = '<g transform="rotate(32 50 54)">';
  g += T('M44.5 20H55.5L56.5 90Q50 95 43.5 90Z', '#C8782E');
  g += fillOnly('M50 20H55.5L56.5 90Q53 92.5 50 93Z', '#8F4F1B', 1);
  g += lines('M50 24V90', 1.6);
  g += T('M6 44Q50 -14 94 44Q82 42 72 35Q50 18 28 35Q18 42 6 44Z', '#9FB3BA');
  g += fillOnly('M50 8Q78 12 94 44Q82 42 72 35Q60 22 50 17Z', '#5E7580', 1);
  g += T('M38 14H62V30H38Z', '#B8352A', { sw: 3.2 });
  g += `<path d="M42 19H58" stroke="${PAPER}" stroke-width="2.4" stroke-linecap="round"/>`;
  g += hl('M16 38Q32 14 50 9', 3.2);
  g += '</g>';
  g += star4(82, 80, 8, PAPER, 'twk');
  return `<symbol id="sym-L2" viewBox="0 0 100 100">${g}</symbol>`;
}

function lantern() {
  let g = `<circle class="lglow" cx="50" cy="56" r="45" fill="#E8A92B" opacity=".3"/>`;
  g += `<path d="M36 24Q36 6 50 6Q64 6 64 24" fill="none" stroke="${INK}" stroke-width="8" stroke-linecap="round"/><path d="M36 24Q36 8 50 8Q64 8 64 24" fill="none" stroke="#2E8C8C" stroke-width="3.4" stroke-linecap="round"/>`;
  g += T('M28 36L38 20H62L72 36Z', '#2E8C8C', { ht: 0 });
  g += T('M30 36H70V74H30Z', '#F7D774', { sw: 3.6 });
  g += fillOnly('M56 36H70V74H56Z', '#E8A92B', 1);
  g += `<g class="fl fl1">${T('M50 70C39 63 43 53 50 44C52 51 61 56 58 64C57 68 54 70 50 70Z', '#D9622B', { sw: 2.4 })}${T('M50 70C46 66 47 61 50 56C53 61 54 66 50 70Z', '#F7E7A0', { noline: 1 })}</g>`;
  g += `<g class="fl fl2">${T('M50 70C41 65 45 55 49 46C52 52 59 55 60 63C60 67 55 70 50 70Z', '#D9622B', { sw: 2.4 })}${T('M51 70C47 66 48 61 51 57C54 61 55 66 51 70Z', '#F7E7A0', { noline: 1 })}</g>`;
  g += lines('M40 37V73M60 37V73', 3);
  g += hl('M35 41V62', 3);
  g += T('M26 74H74L68 90H32Z', '#2E8C8C', { ht: 1 });
  g += lines('M30 36H70', 3.2);
  return `<symbol id="sym-L3" viewBox="0 0 100 100">${g}</symbol>`;
}

function hardhat() {
  let g = T('M16 68Q14 26 50 23Q86 26 84 68Z', '#D9622B');
  g += fillOnly('M58 24Q84 28 84 68H62Z', '#A9441C', 1);
  g += T('M42 24Q50 21 58 24V68H42Z', '#F08A45', { sw: 2.6 });
  g += T('M8 64H92V77Q92 80 88 80H12Q8 80 8 77Z', '#B8501F', { sw: 3.6 });
  g += fillOnly('M50 64H92V77Q92 80 88 80H50Z', '#8A3A14', 1);
  g += `<circle cx="50" cy="45" r="10.5" fill="${PAPER}" stroke="${INK}" stroke-width="2.8"/><circle cx="50" cy="45" r="6.2" fill="#F7D774" stroke="${INK}" stroke-width="1.8"/>`;
  g += hl('M23 54Q25 36 38 29');
  g += star4(50, 45, 5, '#fff', 'twk');
  return `<symbol id="sym-L4" viewBox="0 0 100 100">${g}</symbol>`;
}

function nugget() {
  const body = 'M16 62Q8 42 26 30Q36 8 60 16Q86 18 86 46Q96 70 72 83Q44 96 24 82Q14 72 16 62Z';
  let g = T(body, '#F2B52E');
  g += fillOnly('M86 46Q96 70 72 83Q44 96 24 82Q40 82 58 74Q80 64 86 46Z', '#C98418', 1);
  g += T('M26 34Q36 22 52 28Q44 40 28 46Z', '#F9D96A', { sw: 2.4 });
  g += lines('M62 20Q78 26 80 44', 2.2);
  g += `<path d="M31 42L41 68L50 50L59 68L69 42" fill="none" stroke="${INK}" stroke-width="7" stroke-linejoin="round" stroke-linecap="round"/><path d="M31 42L41 68L50 50L59 68L69 42" fill="none" stroke="${PAPER}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>`;
  g += hl('M34 26Q42 20 50 22', 3);
  g += star4(86, 14, 10, '#fff', 'wink w1') + star4(12, 28, 7, '#fff', 'wink w2') + star4(90, 60, 6, '#fff', 'wink w3') + star4(26, 92, 7, '#fff', 'wink w4');
  return `<symbol id="sym-W" viewBox="0 0 100 100">${g}</symbol>`;
}

function dynamite() {
  const stick = (x, rot, col, dk) => `<g transform="rotate(${rot} ${x + 9} 82)">${T(`M${x} 36H${x + 18}V86Q${x + 9} 91 ${x} 86Z`, col, { sw: 3.4 })}${fillOnly(`M${x + 10} 36H${x + 18}V86Q${x + 14} 88.5 ${x + 10} 89Z`, dk, 1)}${T(`M${x} 36Q${x + 9} 30 ${x + 18} 36Q${x + 9} 41 ${x} 36Z`, '#7E2018', { sw: 2.4 })}</g>`;
  let g = stick(14, -9, '#B8352A', '#7E2018') + stick(68, 9, '#B8352A', '#7E2018') + stick(41, 0, '#D9482F', '#8E2A1C');
  g += T('M12 54H88V72H12Z', PAPER, { sw: 3.2 });
  g += `<path d="M27 59H39M33 59V68M44 68V59L56 68V59M61 59H73M67 59V68" fill="none" stroke="#B8352A" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`;
  g += `<path d="M50 34Q46 22 56 16Q62 12 64 8" fill="none" stroke="${INK}" stroke-width="5" stroke-linecap="round"/><path d="M50 34Q46 22 56 16Q62 12 64 8" fill="none" stroke="#C9A45C" stroke-width="2" stroke-dasharray="3 3" stroke-linecap="round"/>`;
  g += `<g class="spk">${star4(64, 8, 13, '#F7D774')}${star4(64, 8, 6.5, '#fff')}</g>`;
  g += `<circle class="puff pf1" cx="76" cy="14" r="3.4" fill="${PAPER}" stroke="${INK}" stroke-width="1.6"/><circle class="puff pf2" cx="54" cy="6" r="2.6" fill="${PAPER}" stroke="${INK}" stroke-width="1.4"/>`;
  g += hl('M23 44V70', 2.8);
  return `<symbol id="sym-S" viewBox="0 0 100 100">${g}</symbol>`;
}

const DEFS = `
<pattern id="ht" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(32)"><circle cx="2.5" cy="2.5" r="1.25" fill="${INK}" opacity=".42"/></pattern>
<pattern id="ht2" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(32)"><circle cx="2" cy="2" r="1" fill="${INK}" opacity=".3"/></pattern>`;

let built = false;
export function ensureSprite() {
  if (built || typeof document === 'undefined') return;
  built = true;
  const parts = [ruby(), sapphire(), emerald(), topaz(), amethyst(), pickaxe(), lantern(), hardhat(), nugget(), dynamite()];
  const svg = `<svg id="sym-sprite" xmlns="http://www.w3.org/2000/svg" width="0" height="0" style="position:absolute;width:0;height:0;overflow:hidden" aria-hidden="true" focusable="false"><defs>${DEFS}</defs>${parts.join('')}</svg>`;
  document.body.insertAdjacentHTML('afterbegin', svg);
}

export function symbolMarkup(name) {
  return `<svg class="sym-svg" viewBox="0 0 100 100" aria-hidden="true" focusable="false"><use href="#sym-${name}"/></svg>`;
}
