// Agent Mambo v2 layers (WP6): the props, hand-built as SVG strings in code (no generative tool, no bitmap). 1962 print look: flat fills
// from the closed palette (styles.css :root), a thick ink outline, a halftone dot screen, and a slight misregistration (the colour plate
// printed 2-3 px off the ink plate). Text uses the game's own font stacks (var(--disp) / var(--num)): no new font.
import { esc } from './util.js';

// the closed palette (styles.css :root). Nothing outside this list is drawn by the layers.
export const P = Object.freeze({
  ink: '#14102B', indigo: '#2B2A6B', teal: '#1FB5A3', coral: '#F0472F', flamingo: '#F5799F', lemon: '#FFD23F', cream: '#FBF1D9',
  lilac: '#9A7BD0', lime: '#A5D63B', steel: '#6FA7D9', brass: '#E8A92B', aubergine: '#3B1F52', orange: '#F08A2B', coralDk: '#C2321E',
  tealDk: '#0B6B61', inkDim: '#4A4470', board: '#1D1B4F',
});

let uid = 0;
const id = (p) => `${p}${++uid}`;

/** a halftone dot pattern (returns [defs, fill url]) */
export function halftone(color, size = 7, r = 1.4) {
  const pid = id('ht');
  return [`<pattern id="${pid}" width="${size}" height="${size}" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="${color}"/></pattern>`, `url(#${pid})`];
}

/**
 * Rubber stamp: double ink border, bold caps, rotated, a few "missed ink" gaps (white dashes over the border).
 * kind: 'coral' (TOP SECRET, SEALED), 'teal' (OPENED), 'ink' (FILED), 'lilac' (DECLASSIFIED), 'steel' (the floor-plan name)
 */
export function stampSvg(text, kind = 'coral', o = {}) {
  const col = { coral: P.coral, teal: P.tealDk, ink: P.inkDim, lilac: P.aubergine, steel: P.cream, lemon: P.lemon }[kind] || P.coral;
  const t = esc(String(text || '').toUpperCase());
  const n = Math.max(3, t.length);
  const W = Math.round(40 + n * 21), H = o.tall ? 64 : 52;
  const rot = o.rot == null ? -7 : o.rot;
  return `<svg class="l-stamp-svg" viewBox="-6 -6 ${W + 12} ${H + 12}" width="100%" height="100%" aria-hidden="true" style="transform:rotate(${rot}deg)">
  <g fill="none" stroke="${col}">
    <rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="7" stroke-width="5"/>
    <rect x="8" y="8" width="${W - 16}" height="${H - 16}" rx="4" stroke-width="2.4"/>
  </g>
  <text x="${W / 2}" y="${H / 2 + 1}" text-anchor="middle" dominant-baseline="central" fill="${col}"
    style="font:900 ${o.tall ? 30 : 25}px var(--disp);letter-spacing:2px">${t}</text>
  <g stroke="${o.paper || P.cream}" stroke-width="2.2" stroke-linecap="round" opacity=".85">
    <path d="M${W * 0.18} 1.5h${W * 0.07}M${W * 0.62} ${H - 1.5}h${W * 0.09}M1.5 ${H * 0.4}v${H * 0.12}M${W * 0.43} ${H / 2 + 5}h${W * 0.04}"/>
  </g>
</svg>`;
}

/** The cyanotype sheet: indigo paper, cream grid every cell and a finer grid, a halftone shade, the title block. */
export function blueprintDefs(cols, rows) {
  const g1 = id('bpg'), g2 = id('bpf');
  return {
    defs: `<pattern id="${g2}" width=".25" height=".25" patternUnits="userSpaceOnUse"><path d="M.25 0V.25H0" fill="none" stroke="${P.cream}" stroke-width=".008" opacity=".35"/></pattern>
      <pattern id="${g1}" width="1" height="1" patternUnits="userSpaceOnUse"><rect width="1" height="1" fill="url(#${g2})"/><path d="M1 0V1H0" fill="none" stroke="${P.cream}" stroke-width=".018" opacity=".55"/></pattern>`,
    grid: `url(#${g1})`,
    w: cols, h: rows,
  };
}

/** The manila envelope of Sealed Orders (viewBox 0 0 120 90): body, side folds, flap (separate group so it can open), string button. */
export function envelopeSvg() {
  const [hd, hf] = halftone(P.brass, 6, 1.3);
  return `<svg class="l-env-svg" viewBox="-6 -40 132 136" width="100%" height="100%" aria-hidden="true">
  <defs>${hd}</defs>
  <g class="l-env-back"><path d="M4 22H116V86H4Z" fill="${P.brass}" transform="translate(2.5 2)"/><path d="M4 22H116V86H4Z" fill="${P.cream}" stroke="${P.ink}" stroke-width="4" stroke-linejoin="round"/></g>
  <g class="l-env-slips"></g>
  <g class="l-env-front">
    <path d="M4 86L60 52L116 86Z" fill="${P.cream}" stroke="${P.ink}" stroke-width="4" stroke-linejoin="round"/>
    <path d="M4 22L52 60L4 86Z" fill="${hf}" stroke="${P.ink}" stroke-width="4" stroke-linejoin="round"/>
    <path d="M116 22L68 60L116 86Z" fill="${hf}" stroke="${P.ink}" stroke-width="4" stroke-linejoin="round"/>
    <path d="M4 22L52 60L4 86Z M116 22L68 60L116 86Z" fill="${P.cream}" opacity=".55"/>
    <path d="M14 78h22" stroke="${P.inkDim}" stroke-width="3" stroke-linecap="round"/>
  </g>
  <g class="l-env-flap">
    <path d="M4 22L60 64L116 22Z" fill="${P.brass}" transform="translate(2.5 2)"/>
    <path d="M4 22L60 64L116 22Z" fill="${P.cream}" stroke="${P.ink}" stroke-width="4" stroke-linejoin="round"/>
    <path d="M4 22L60 64L116 22Z" fill="${hf}" opacity=".6"/>
    <circle cx="60" cy="56" r="6.5" fill="${P.coral}" stroke="${P.ink}" stroke-width="3"/>
  </g>
  <path class="l-env-string" d="M60 56c-10 8 -18 14 -6 22" fill="none" stroke="${P.coralDk}" stroke-width="2.6" stroke-linecap="round"/>
</svg>`;
}

/** one filed slip (slides into the envelope): steel paper (never gold), ink lines, small FILED tick */
export function slipSvg(i) {
  const tilt = [-4, 3, -2, 5, -3][i % 5];
  return `<g class="l-slip" style="transform:rotate(${tilt}deg);transform-origin:60px 40px">
    <path d="M20 ${12 - (i % 3) * 3}H100V56H20Z" fill="${i % 2 ? P.steel : P.lilac}" stroke="${P.ink}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M28 ${22 - (i % 3) * 3}h44M28 ${30 - (i % 3) * 3}h30" stroke="${P.ink}" stroke-width="2.6" stroke-linecap="round"/>
  </g>`;
}

/** the dossier folder (viewBox 0 0 300 210): back cover with tab, paper, front cover hinged at the left (group .l-dos-cover) */
export function dossierSvg(icon) {
  const [hd, hf] = halftone(P.orange, 8, 1.8);
  return `<svg class="l-dos-svg" viewBox="-10 -24 320 250" width="100%" height="100%" aria-hidden="true">
  <defs>${hd}</defs>
  <path d="M6 8H96L108 -12H170L178 8H294V206H6Z" fill="${P.orange}" transform="translate(3 3)"/>
  <path d="M6 8H96L108 -12H170L178 8H294V206H6Z" fill="${P.brass}" stroke="${P.ink}" stroke-width="5" stroke-linejoin="round"/>
  <path d="M6 8H294V206H6Z" fill="${hf}" opacity=".7"/>
  <g class="l-dos-paper">
    <path d="M22 18H282V196H22Z" fill="${P.cream}" stroke="${P.ink}" stroke-width="4" stroke-linejoin="round"/>
    <path d="M40 150h120M40 164h170M40 178h90" stroke="${P.inkDim}" stroke-width="4" stroke-linecap="round" opacity=".6"/>
    <g class="l-dos-icon" transform="translate(222 150)">${icon || ''}</g>
    <circle cx="258" cy="34" r="9" fill="none" stroke="${P.inkDim}" stroke-width="3"/>
  </g>
  <g class="l-dos-cover">
    <path d="M6 14H294V206H6Z" fill="${P.brass}" stroke="${P.ink}" stroke-width="5" stroke-linejoin="round"/>
    <path d="M6 14H294V206H6Z" fill="${hf}" opacity=".55"/>
    <path d="M28 40H180" stroke="${P.ink}" stroke-width="5" stroke-linecap="round"/>
    <path d="M28 58H140" stroke="${P.ink}" stroke-width="5" stroke-linecap="round" opacity=".6"/>
  </g>
</svg>`;
}

/** mission icons for the dossier paper (drawn around 0,0, about 70 px) */
export function missionIcon(m) {
  if (m === 'orders') {
    return `<g transform="translate(-34 -26) scale(.58)">${envelopeSvg().replace(/<svg[^>]*>|<\/svg>/g, '')}</g>`;
  }
  if (m === 'blackout') {
    return `<g><path d="M-6 -34L6 -34L36 30L-36 30Z" fill="${P.cream}" opacity=".9" stroke="${P.ink}" stroke-width="3" stroke-linejoin="round"/>
      <rect x="-14" y="-46" width="28" height="16" rx="4" fill="${P.ink}"/><ellipse cx="0" cy="30" rx="36" ry="8" fill="${P.lemon}" stroke="${P.ink}" stroke-width="3"/></g>`;
  }
  // briefing: the clearance dial
  return `<g><circle r="30" fill="${P.lime}" transform="translate(2 2)"/><circle r="30" fill="${P.cream}" stroke="${P.ink}" stroke-width="4"/>
    <path d="M-20 10A22 22 0 1 1 20 10" fill="none" stroke="${P.ink}" stroke-width="3" stroke-dasharray="3 5"/>
    <path d="M0 0L14 -16" stroke="${P.coral}" stroke-width="5" stroke-linecap="round"/><circle r="5" fill="${P.ink}"/></g>`;
}

/** The secret door (viewBox 0 0 200 300): frame, two panels, brass knob, ink keyhole, door plate (name). */
export function doorSvg(label, color = P.aubergine) {
  const [hd, hf] = halftone(P.ink, 9, 1.6);
  return `<svg class="l-door-svg" viewBox="-10 -10 220 320" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
  <defs>${hd}</defs>
  <path d="M0 0H200V300H0Z" fill="${P.ink}"/>
  <path d="M14 14H186V300H14Z" fill="${P.indigo}" transform="translate(3 3)"/>
  <path d="M14 14H186V300H14Z" fill="${color}" stroke="${P.ink}" stroke-width="6" stroke-linejoin="round"/>
  <path d="M14 14H186V300H14Z" fill="${hf}" opacity=".35"/>
  <path d="M36 40H164V140H36Z M36 168H164V280H36Z" fill="none" stroke="${P.ink}" stroke-width="5" stroke-linejoin="round"/>
  <path d="M42 46H158V134H42Z M42 174H158V274H42Z" fill="none" stroke="${P.lilac}" stroke-width="2.5" opacity=".7"/>
  <rect x="44" y="74" width="112" height="32" rx="5" fill="${P.cream}" stroke="${P.ink}" stroke-width="4"/>
  <text x="100" y="91" text-anchor="middle" dominant-baseline="central" fill="${P.ink}" textLength="${Math.min(98, 8.2 * String(label || '').length)}" lengthAdjust="spacingAndGlyphs" style="font:900 14px var(--disp)">${esc(label || '')}</text>
  <circle cx="160" cy="160" r="9" fill="${P.brass}" stroke="${P.ink}" stroke-width="4"/>
  <path d="M100 150a8 8 0 1 1 0.01 0Z M96 156L92 178H108L104 156Z" fill="${P.ink}"/>
</svg>`;
}

/** keyhole shape scaled by s (unit: about 0.7 wide, 1.4 high, centred on 0,0) as a polygon path for the iris mask */
export function keyholePath(s) {
  const r = 0.36 * s, cy = -0.26 * s, pts = [];
  for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; pts.push(`${(Math.cos(a) * r).toFixed(2)} ${(cy + Math.sin(a) * r).toFixed(2)}`); }
  const q = (v) => (v * s).toFixed(2);
  return `M${pts.join('L')}Z M${q(-0.17)} ${q(-0.1)}L${q(-0.32)} ${q(0.78)}L${q(0.32)} ${q(0.78)}L${q(0.17)} ${q(-0.1)}Z`;
}

/** The ballroom spotlight lamp (viewBox 0 0 60 40) */
export function lampSvg() {
  return `<svg viewBox="-4 -4 68 48" width="100%" height="100%" aria-hidden="true">
    <path d="M8 6H52L46 34H14Z" fill="${P.inkDim}" transform="translate(2 2)"/>
    <path d="M8 6H52L46 34H14Z" fill="${P.aubergine}" stroke="${P.ink}" stroke-width="4" stroke-linejoin="round"/>
    <path d="M18 30H42" stroke="${P.cream}" stroke-width="5" stroke-linecap="round"/>
    <circle cx="30" cy="4" r="5" fill="${P.brass}" stroke="${P.ink}" stroke-width="3"/>
  </svg>`;
}

/** a small tag "x4" (lit cluster) */
export function tagSvg(text) {
  return `<svg viewBox="-3 -3 66 40" width="100%" height="100%" aria-hidden="true">
    <path d="M10 2H56V32H10L2 17Z" fill="${P.coralDk}" transform="translate(2.5 2)"/>
    <path d="M10 2H56V32H10L2 17Z" fill="${P.cream}" stroke="${P.ink}" stroke-width="3.5" stroke-linejoin="round"/>
    <circle cx="11" cy="17" r="3" fill="${P.ink}"/>
    <text x="34" y="18" text-anchor="middle" dominant-baseline="central" fill="${P.ink}" style="font:900 20px var(--num)">${esc(text)}</text>
  </svg>`;
}
