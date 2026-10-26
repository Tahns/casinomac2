// mambo_outfits.mjs - the five costume layers of Mambo (same body, same face, swappable wardrobe).
// A inspectrice (base) · B casino evening · C laboratory · D vault / commando · E trench and fedora.
// Every costume only draws: skirt/lower garment, torso/jacket, headgear, face gear, hand prop, sleeve + glove colours,
// leg and shoe styling. Coordinates are the REST skeleton of mambo_art.mjs (upper body / lower body world coordinates,
// head-local coordinates for headgear and face gear, grip-local coordinates for props).
// [217] discipline: every costume is fully covering (high necklines, long sleeves or gloves, knee-length or longer,
// no slit, no cleavage); glamour comes from style, not exposure.

import { PAL, INK, OL, part, line, circ, G, star, rectD, ellD, tf, f } from './mambo_art.mjs';

const dotsShade = (x, y, w, h) => `M${x} ${y}h${w}v${h}h${-w}Z`;
const R_SHADE = 'M208 250L290 250L290 480L208 480Z';       // right-hand shade band on the body (halftone side)

// ====================================================================== A. INSPECTRICE (base)
const inspectrice = {
  key: 'inspectrice', label: 'A. Inspectrice (base)', accent: PAL.navy,
  sleeve: { fill: PAL.navy, trim: PAL.mustard, trimAt: [0.8, 0.9], gloveFrom: null },
  glove: PAL.white, cuff: PAL.white,
  legs: { fill: INK, w: 15, shine: '#7A5646' },
  shoe: { base: PAL.white },
  lidFill: PAL.eyeshadow, propKind: 'flashlight', whistle: true,
  skirt(c) {
    const d = 'M174 328L226 328C237 346 241 362 241 380C241 410 237 440 233 470Q200 478 167 470C163 440 159 410 159 380C159 362 163 346 174 328Z';
    return part(c, d, PAL.navy, { shade: R_SHADE })
      + line('M180 332C170 368 168 420 170 466', 3, PAL.navyLight, ' opacity=".7"');
  },
  torso(c) {
    const J = 'M158 272C166 260 184 256 200 258C216 256 234 260 242 272C249 288 247 308 236 322C230 330 224 334 224 338C232 346 240 356 240 368L160 368C160 356 168 346 176 338C176 334 170 330 164 322C153 308 151 288 158 272Z';
    let s = part(c, J, PAL.navy, { shade: 'M214 252L290 252L290 372L214 372Z' });
    // shirt V + collar + thin tie
    s += part(c, 'M184 259L216 259L200 306Z', PAL.white, { sw: 4.4, mis: [1.4, 1.2] });
    s += part(c, 'M186 257L178 267L192 270L196 260Z M214 257L222 267L208 270L204 260Z', PAL.white, { sw: 3.6, mis: [1.2, 1] });
    s += part(c, 'M196.4 264L203.6 264L206 300L200 312L194 300Z', INK, { sw: 3.4, mis: [1, 1] });
    s += part(c, 'M195 258L205 258L203.6 265L196.4 265Z', INK, { sw: 3, mis: [1, 1] });
    // lapels with gold piping
    s += part(c, 'M184 258L168 276L186 312L198 306L190 276Z', PAL.navyLight, { sw: 4.8 }) + part(c, 'M216 258L232 276L214 312L202 306L210 276Z', PAL.navyLight, { sw: 4.8 });
    s += line('M184 262L172 277L188 308M216 262L228 277L212 308', 2.8, PAL.gold);
    // three gold buttons on the centre line, epaulettes
    for (const y of [322, 340, 357]) s += part(c, ellD(200, y, 4.9, 4.9), PAL.gold, { sw: 3.2, mis: [1, 1] });
    s += part(c, 'M159 272L180 262L184 270L162 281Z', PAL.cream, { sw: 3.6, mis: [1.2, 1] }) + part(c, 'M241 272L220 262L216 270L238 281Z', PAL.cream, { sw: 3.6, mis: [1.2, 1] });
    // peplum hem piping
    s += line('M162 362L238 362', 3, PAL.gold, ' opacity=".9"');
    // whistle chain (dynamic path) + whistle (positioned by the runtime)
    s += `<path id="${c.pre}chain" d="" fill="none" stroke="${PAL.gold}" stroke-width="3.2" stroke-linecap="round"/>`;
    s += `<g id="${c.pre}whistle"><g transform="rotate(-12)">${part(c, 'M-9 -5L7 -7L11 -1L9 6L-9 6Z', PAL.gold, { sw: 3.6, mis: [1.2, 1] })}${circ(-2, 0, 2, INK)}${part(c, ellD(-12, 0, 4, 4), 'none', { sw: 2.8 })}</g></g>`;
    return s;
  },
  head(c) { // garrison cap (calot) tilted, gold piping, fictional agency star (8-point "Mambo star")
    let s = '';
    const body = 'M-66 -128C-72 -150 -56 -178 -32 -190C-10 -200 20 -206 44 -196C58 -182 62 -160 56 -138C32 -144 -8 -138 -66 -128Z';
    s += part(c, body, PAL.navy, { shade: 'M0 -210L80 -210L80 -120L0 -120Z' });
    s += part(c, 'M-42 -182C-14 -170 20 -170 50 -182C56 -166 56 -152 54 -142C24 -150 -16 -148 -58 -136C-62 -152 -56 -168 -42 -182Z', PAL.navyLight, { sw: 0, shade: 'M10 -190L70 -190L70 -130L10 -130Z' });
    s += line('M-44 -184C-14 -172 22 -172 50 -184', 3.8, INK);
    s += `<path d="M-66 -128C-8 -138 32 -144 56 -138" fill="none" stroke="${PAL.gold}" stroke-width="5.6" stroke-linecap="round"/>`;
    s += line('M-66 -128C-8 -138 32 -144 56 -138', 1.2, INK, ' opacity=".6"');
    s += `<path d="M-60 -140C-10 -150 30 -156 52 -150" fill="none" stroke="${PAL.gold}" stroke-width="3" stroke-linecap="round"/>`;
    s += `<g transform="translate(-26 -158) rotate(-14)">${star(0, 0, 15, PAL.gold, 3.4, 22.5, 8)}${circ(0, 0, 4.2, PAL.navy, ` stroke="${INK}" stroke-width="2.2"`)}</g>`;
    return s;
  },
  gear: () => '',
  prop(c) { // flashlight, grip at origin, working end toward +y
    const beam = `<g id="${c.pre}beam" opacity="0"><path d="M-12 56L-46 205L46 205L12 56Z" fill="${PAL.gold}" opacity=".5"/><path d="M-12 56L-46 205L46 205L12 56Z" fill="url(#${c.pre}ht)" opacity=".5"/></g>`;
    return beam
      + part(c, 'M-9 -30L9 -30L9 12L-9 12Z', '#4A2A1C', { sw: 4.8, mis: [1.6, 1.4] })
      + part(c, 'M-9 6L9 6L19 40L-19 40Z', '#4A2A1C', { sw: 4.8, mis: [1.6, 1.4] })
      + part(c, ellD(0, 41, 20, 7), PAL.gold, { sw: 4.4, mis: [1.4, 1.2] }) + `<ellipse cx="0" cy="41.5" rx="12.5" ry="3.8" fill="${PAL.cream}"/>`
      + part(c, 'M-10 -30L10 -30L10 -24L-10 -24Z', PAL.gold, { sw: 3.6, mis: [1.2, 1] }) + line('M-3.4 -18L-3.4 -2', 2.6, PAL.goldDeep, ' opacity=".9"');
  },
};

export const OUTFIT_DEFS = { inspectrice };
export const OUTFIT_KEYS = ['inspectrice', 'casino', 'lab', 'vault', 'trench'];
