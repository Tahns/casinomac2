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
  sleeve: { fill: PAL.navyJ, trim: PAL.mustard, trimAt: [0.8, 0.9], gloveFrom: null },
  glove: PAL.white, cuff: PAL.white,
  legs: { fill: INK, w: 13, shine: '#7A5646' },
  shoe: { base: PAL.white },
  lidFill: PAL.eyeshadow, propKind: 'flashlight', whistle: true, accBase: 90, accGain: 1, hairTop: () => '', capOver: false,
  skirt(c) {
    const d = 'M180 300L220 300C238 314 247 336 246 358C245 392 236 424 229 454Q200 462 171 454C166 424 157 392 155 358C153 336 162 314 180 300Z';
    return part(c, d, PAL.navyJ, { shade: 'M208 296L270 296L270 470L208 470Z' })
      + line('M183 308C170 346 168 400 172 446', 3, PAL.navyLight, ' opacity=".7"');
  },
  torso(c) {
    const J = 'M158 252C168 242 186 238 200 240C214 238 232 242 242 252C253 264 248 284 236 293C226 299 219 302 217 306C226 316 242 328 243 340L157 340C158 328 174 316 183 306C181 302 174 299 164 293C152 284 147 264 158 252Z';
    let s = part(c, J, PAL.navyJ, { shade: 'M214 236L290 236L290 344L214 344Z' });
    s += line('M168 276C174 284 184 288 192 286M232 276C226 284 216 288 208 286', 2.6, PAL.navyLight, ' opacity=".8"');
    // shirt V + collar + thin tie
    s += part(c, 'M185 241L215 241L200 288Z', PAL.white, { sw: 4, mis: [1.4, 1.2] });
    s += part(c, 'M187 239L179 249L193 252L197 242Z M213 239L221 249L207 252L203 242Z', PAL.white, { sw: 3.4, mis: [1.2, 1] });
    s += part(c, 'M197.4 246L202.6 246L204.6 280L200 292L195.4 280Z', INK, { sw: 3, mis: [1, 1] });
    s += part(c, 'M196 240L204 240L203 247L197 247Z', INK, { sw: 2.8, mis: [1, 1] });
    // lapels with gold piping
    s += part(c, 'M185 240L169 257L188 292L199 286L191 257Z', PAL.navyLight, { sw: 4.4 }) + part(c, 'M215 240L231 257L212 292L201 286L209 257Z', PAL.navyLight, { sw: 4.4 });
    s += line('M185 245L173 258L189 288M215 245L227 258L211 288', 2.6, PAL.gold);
    // three gold buttons on the centre line, epaulettes
    for (const y of [297, 311, 325]) s += part(c, ellD(200, y, 4.6, 4.6), PAL.gold, { sw: 3, mis: [1, 1] });
    s += part(c, 'M159 252L180 243L184 251L162 261Z', PAL.cream, { sw: 3.4, mis: [1.2, 1] }) + part(c, 'M241 252L220 243L216 251L238 261Z', PAL.cream, { sw: 3.4, mis: [1.2, 1] });
    s += line('M162 334L238 334', 2.8, PAL.gold, ' opacity=".9"');
    // whistle chain (dynamic path) + whistle (positioned by the runtime)
    s += `<path id="${c.pre}chain" d="" fill="none" stroke="${PAL.gold}" stroke-width="3" stroke-linecap="round"/>`;
    s += `<g id="${c.pre}whistle"><g transform="rotate(-12)">${part(c, 'M-9 -5L7 -7L11 -1L9 6L-9 6Z', PAL.gold, { sw: 3.4, mis: [1.2, 1] })}${circ(-2, 0, 2, INK)}${part(c, ellD(-12, 0, 4, 4), 'none', { sw: 2.6 })}</g></g>`;
    return s;
  },
  head(c) { // garrison cap (calot): big boat shape tilted over the back-left of the head, gold piping, 8-point fictional star
    let s = '';
    const body = 'M-82 -112C-60 -135 -30 -156 -7 -166L11 -156C17 -140 20 -130 20 -122C8 -108 -8 -101 -22 -99C-40 -97 -58 -92 -72 -90C-74 -98 -78 -106 -82 -112Z';
    s += part(c, body, PAL.navyJ, { shade: 'M-6 -176L30 -176L30 -80L-30 -80Z' });
    s += `<path d="M-78 -110C-52 -126 -24 -142 2 -150" fill="none" stroke="${INK}" stroke-width="8.4" stroke-linecap="round"/><path d="M-78 -110C-52 -126 -24 -142 2 -150" fill="none" stroke="${PAL.gold}" stroke-width="3.4" stroke-linecap="round"/>`;
    s += `<path d="M-7 -166L2 -168L14 -158L11 -156Z" fill="${PAL.navyLight}" stroke="${INK}" stroke-width="4.4" stroke-linejoin="round"/>`;
    s += `<g transform="translate(-9 -125) rotate(-12)">${star(0, 0, 17, PAL.gold, 3.2, 22.5, 8)}${circ(0, 0, 4.4, PAL.navy, ` stroke="${INK}" stroke-width="2.2"`)}</g>`;
    return s;
  },
  gear: () => '',
  prop(c) { // flashlight, grip at origin, working end toward +y
    const beam = `<g id="${c.pre}beam" opacity="0"><path d="M-12 56L-46 205L46 205L12 56Z" fill="#FFF1A8" opacity=".5"/><path d="M-12 56L-46 205L46 205L12 56Z" fill="url(#${c.pre}htl)" opacity=".6"/></g>`;
    return beam + `<g transform="scale(1.22)">`
      + part(c, 'M-9 -30L9 -30L9 12L-9 12Z', '#4A2A1C', { sw: 4.8, mis: [1.6, 1.4] })
      + part(c, 'M-9 6L9 6L19 40L-19 40Z', '#4A2A1C', { sw: 4.8, mis: [1.6, 1.4] })
      + part(c, ellD(0, 41, 20, 7), PAL.gold, { sw: 4.4, mis: [1.4, 1.2] }) + `<ellipse cx="0" cy="41.5" rx="12.5" ry="3.8" fill="${PAL.cream}"/>`
      + part(c, 'M-10 -30L10 -30L10 -24L-10 -24Z', PAL.gold, { sw: 3.6, mis: [1.2, 1] }) + line('M-3.4 -18L-3.4 -2', 2.6, PAL.goldDeep, ' opacity=".9"') + `</g>`;
  },
};


const SHADE_R = (x = 212) => `M${x} 236L300 236L300 580L${x} 580Z`;

// ====================================================================== B. CASINO EVENING (gown, mask, fan, chips)
const casino = {
  key: 'casino', label: 'B. Casino evening', accent: PAL.brick,
  sleeve: { fill: PAL.brick, trim: null, gloveFrom: 0.52 }, glove: PAL.white, cuff: PAL.white,
  legs: { fill: INK, w: 13 }, shoe: { base: PAL.white }, shoesUnder: true,
  lidFill: '#1E1411', lidShadowOp: 0, accBase: 180, accGain: 0.5, capOver: false,
  hairTop(c) { // big 60s wave on top (no hat)
    return part(c, 'M-86 -104C-84 -140 -52 -162 -14 -160C24 -158 44 -142 44 -118C30 -128 8 -134 -12 -126C-34 -118 -58 -112 -86 -104Z', PAL.hair, { shade: 'M-96 -170L-20 -170L-20 -100L-96 -100Z' })
      + line('M-50 -146C-34 -154 -14 -152 0 -146', 3.4, PAL.hairHi, ' opacity=".9"') + line('M10 -140C20 -138 28 -132 32 -126', 3, PAL.hairHi, ' opacity=".8"');
  },
  skirt(c) {
    const d = 'M181 300L219 300C233 316 239 334 239 352C239 392 233 436 236 470C240 504 262 534 276 556Q200 572 124 556C138 534 160 504 164 470C167 436 161 392 161 352C161 334 167 316 181 300Z';
    return part(c, d, PAL.brick, { shade: 'M206 296L300 296L300 580L206 580Z' })
      + line('M186 430C176 480 158 520 146 552M200 440C198 490 198 530 196 562M214 430C226 480 246 520 258 552', 3, '#8E1F1B', ' opacity=".8"');
  },
  torso(c) {
    const J = 'M160 254C170 244 186 241 200 241C214 241 230 244 240 254C248 264 245 282 236 291C227 298 221 301 220 306L180 306C179 301 173 298 164 291C155 282 152 264 160 254Z';
    let s = part(c, J, PAL.brick, { shade: SHADE_R(214) });
    s += line('M168 262C178 268 186 282 190 300M232 262C222 268 214 282 210 300', 2.6, '#8E1F1B', ' opacity=".75"');
    // gold collar band (high neck) + brooch
    s += part(c, 'M186 232L214 232L216 249C206 253 194 253 184 249Z', PAL.gold, { sw: 4, mis: [1.4, 1.2] });
    s += part(c, ellD(200, 266, 5.2, 5.2), PAL.gold, { sw: 3, mis: [1, 1] }) + circ(200, 266, 2, PAL.white);
    return s;
  },
  maskUnder(c) {
    return part(c, 'M-47 -66C-44 -78 -28 -80 -14 -76C-6 -74 2 -72 10 -76C22 -82 36 -80 42 -68C46 -58 42 -44 34 -36C28 -30 22 -34 18 -40C10 -30 -2 -30 -8 -38C-14 -30 -28 -30 -36 -40C-44 -48 -48 -58 -47 -66Z', '#1E1411', { sw: OL })
      + `<path d="M-40 -70C-30 -76 -18 -74 -10 -72" fill="none" stroke="${PAL.white}" stroke-width="2.4" stroke-linecap="round" opacity=".5"/>`;
  },
  head: () => '', gear: () => '',
  prop(c) { // folded fan, opened: handle at the grip, working end (+y) = the fan spread
    const rib = (a) => `M0 8L${f(Math.sin((a * Math.PI) / 180) * 62)} ${f(8 + Math.cos((a * Math.PI) / 180) * 62)}`;
    let ribs = ''; for (const a of [-50, -32, -16, 0, 16, 32, 50]) ribs += rib(a);
    return part(c, 'M-4 -26L4 -26L5 10L-5 10Z', PAL.gold, { sw: 3.6, mis: [1.2, 1] })
      + part(c, 'M0 8L-52 40Q0 78 52 40Z', PAL.brick, { sw: 4.4, mis: [1.6, 1.4], shade: 'M10 8L60 8L60 80L10 80Z' })
      + `<path d="${ribs}" fill="none" stroke="${PAL.gold}" stroke-width="2.4" stroke-linecap="round"/>` + `<path d="M-52 40Q0 78 52 40" fill="none" stroke="${PAL.gold}" stroke-width="3.4" stroke-linecap="round"/>`;
  },
  prop2(c) { // chips stack
    let s = '';
    const cols = [PAL.brick, INK, PAL.cream, PAL.brick];
    for (let i = 0; i < 4; i++) s += part(c, `M-15 ${-8 + i * 7}C-15 ${-13 + i * 7} 15 ${-13 + i * 7} 15 ${-8 + i * 7}L15 ${-3 + i * 7}C15 ${2 + i * 7} -15 ${2 + i * 7} -15 ${-3 + i * 7}Z`, cols[i], { sw: 3.2, mis: [1.2, 1] }) + line(`M-9 ${-2 + i * 7}h4M-1 ${-0.5 + i * 7}h4M7 ${-2 + i * 7}h4`, 2, PAL.white);
    return s;
  },
};

// ====================================================================== C. LABORATORY (coat, butterfly glasses, test tube, clipboard)
const COAT = '#FBF3DC';
const lab = {
  key: 'lab', label: 'C. Laboratory', accent: PAL.turq,
  sleeve: { fill: COAT, trim: '#E4D6AE', trimAt: [0.82, 0.9], gloveFrom: null }, glove: PAL.white, cuff: PAL.white,
  legs: { fill: '#3A1A10', w: 13, shine: '#8A5A44' }, shoe: { base: PAL.white },
  lidFill: PAL.eyeshadow, accBase: 180, accGain: 0.3, capOver: false,
  hairTop(c) { // big curl on top
    return part(c, 'M-88 -104C-90 -146 -56 -170 -18 -168C16 -170 44 -154 50 -126C52 -112 44 -102 34 -98C32 -118 14 -134 -6 -130C-34 -126 -60 -116 -88 -104Z', PAL.hair, { shade: 'M-100 -176L-24 -176L-24 -100L-100 -100Z' })
      + part(c, 'M16 -158C34 -162 50 -150 48 -134C46 -122 34 -122 32 -130C38 -132 38 -140 30 -140Z', PAL.hair, { sw: OL * 0.9 })
      + line('M-56 -150C-38 -160 -16 -160 2 -152', 3.4, PAL.hairHi, ' opacity=".9"');
  },
  skirt(c) {
    const dress = 'M181 300L219 300C233 316 239 334 239 352C239 384 233 420 228 452Q200 459 172 452C167 420 161 384 161 352C161 334 167 316 181 300Z';
    let s = part(c, dress, PAL.turq, { shade: 'M208 296L270 296L270 470L208 470Z' });
    // coat flaps (open in the middle, showing the dress)
    s += part(c, 'M178 300L197 304C197 360 196 410 194 456Q168 462 148 454C156 410 166 350 178 300Z', COAT, { shade: 'M150 440L196 440L196 470L150 470Z' });
    s += part(c, 'M222 300L203 304C203 360 204 410 206 456Q232 462 252 454C244 410 234 350 222 300Z', COAT, { shade: 'M204 296L270 296L270 470L204 470Z' });
    s += part(c, 'M216 372L236 372L236 394L216 394Z', COAT, { sw: 3.4, mis: [1.2, 1] }) + part(c, 'M164 372L184 372L184 394L164 394Z', COAT, { sw: 3.4, mis: [1.2, 1] });
    return s;
  },
  torso(c) {
    let s = part(c, 'M184 241L216 241L200 300Z', PAL.turq, { sw: 4, mis: [1.4, 1.2] });
    s += part(c, 'M158 252C168 242 184 240 188 242L200 300L198 306L181 306C180 301 173 298 164 291C154 282 150 264 158 252Z', COAT, { shade: 'M150 236L190 236L190 312L150 312Z' });
    s += part(c, 'M242 252C232 242 216 240 212 242L200 300L202 306L219 306C220 301 227 298 236 291C246 282 250 264 242 252Z', COAT, { shade: 'M204 236L260 236L260 312L204 312Z' });
    s += part(c, 'M188 240L174 252L192 284L200 296L197 262Z', COAT, { sw: 4.2 }) + part(c, 'M212 240L226 252L208 284L200 296L203 262Z', COAT, { sw: 4.2 });
    // breast pocket with pens, buttons
    s += part(c, 'M166 284L184 284L184 302L166 302Z', COAT, { sw: 3.4, mis: [1.2, 1] }) + line('M171 284l0 -7M176 284l0 -9M181 284l0 -6', 2.8, PAL.brick) + line('M176 284l0 -9', 2.8, PAL.turq);
    s += part(c, ellD(207, 304, 3.4, 3.4), '#CFC6A8', { sw: 2.6, mis: [1, 1] });
    return s;
  },
  gear(c) { // butterfly glasses (frames above the eyes)
    const fr = PAL.turq;
    const lensN = 'M-44 -78C-30 -88 -4 -84 6 -70C10 -56 4 -36 -12 -32C-30 -30 -44 -44 -46 -62Z';
    const lensF = 'M12 -80C26 -88 42 -84 46 -68C48 -52 40 -36 28 -34C16 -34 10 -50 12 -80Z';
    return `<path d="${lensN}" fill="${PAL.glass}" fill-opacity=".22"/><path d="${lensF}" fill="${PAL.glass}" fill-opacity=".22"/>`
      + `<path d="${lensN}" fill="none" stroke="${INK}" stroke-width="6.6" stroke-linejoin="round"/><path d="${lensF}" fill="none" stroke="${INK}" stroke-width="6.6" stroke-linejoin="round"/>`
      + `<path d="${lensN}" fill="none" stroke="${fr}" stroke-width="3.4" stroke-linejoin="round"/><path d="${lensF}" fill="none" stroke="${fr}" stroke-width="3.4" stroke-linejoin="round"/>`
      + `<path d="M6 -66C8 -70 10 -72 12 -72" fill="none" stroke="${INK}" stroke-width="5.8" stroke-linecap="round"/><path d="M6 -66C8 -70 10 -72 12 -72" fill="none" stroke="${fr}" stroke-width="2.6" stroke-linecap="round"/>`
      + line('M-40 -70C-30 -78 -18 -80 -8 -76', 2.2, PAL.white, ' opacity=".7"');
  },
  head: () => '',
  prop(c) { // test tube: +y = open end (up when held upright), rounded bottom at -y
    return part(c, 'M-8 36L-8 -30C-8 -44 8 -44 8 -30L8 36Z', PAL.glass, { sw: 4, mis: [1.4, 1.2] })
      + `<path d="M-8 -6L-8 -30C-8 -44 8 -44 8 -30L8 -6Z" fill="#A4E24E"/>` + line('M-8 -6Q0 -2 8 -6', 2.6, '#6FB82E')
      + part(c, 'M-11 34L11 34L11 40L-11 40Z', PAL.glass, { sw: 3.6, mis: [1.2, 1] }) + line('M-3 -20L-3 -34', 2.6, PAL.white, ' opacity=".9"')
      + circ(-3, 52, 4.4, '#B9F06A', ` stroke="${INK}" stroke-width="2.2"`) + circ(6, 62, 3.2, '#B9F06A', ` stroke="${INK}" stroke-width="2"`) + circ(-1, 72, 2.4, '#B9F06A', ` stroke="${INK}" stroke-width="1.8"`);
  },
  prop2(c) { // clipboard
    return part(c, 'M-18 -26L18 -26L18 26L-18 26Z', '#8A5A33', { sw: 4, mis: [1.4, 1.2] }) + part(c, 'M-13 -20L13 -20L13 20L-13 20Z', PAL.white, { sw: 2.6, mis: [1, 1] })
      + line('M-8 -10h16M-8 -3h16M-8 4h10', 2, PAL.turq) + part(c, 'M-7 -30L7 -30L7 -23L-7 -23Z', PAL.gold, { sw: 2.8, mis: [1, 1] });
  },
};

// ====================================================================== D. VAULT / COMMANDO (jumpsuit, scarf, aviator cap + goggles, grappling hook)
const SUIT = PAL.mustard, LEATHER = '#7A4A2A';
const vault = {
  key: 'vault', label: 'D. Vault / commando', accent: PAL.mustard, scarf: true,
  sleeve: { fill: SUIT, trim: LEATHER, trimAt: [0.8, 0.9], gloveFrom: null }, glove: PAL.white, cuff: PAL.white,
  legs: { fill: SUIT, w: 17, sock: '#5A3A22' }, shoe: { base: PAL.white },
  lidFill: PAL.eyeshadow, accBase: 90, accGain: 1, capOver: true, hairTop: () => '',
  skirt(c) {
    const d = 'M181 300L219 300C233 316 239 334 238 352C237 374 234 396 230 414L170 414C166 396 163 374 162 352C161 334 167 316 181 300Z';
    return part(c, d, SUIT, { shade: 'M208 296L270 296L270 440L208 440Z' }) + line('M200 306L200 410', 2.6, '#B77A12', ' opacity=".8"');
  },
  torso(c) {
    const J = 'M159 252C169 243 186 240 200 240C214 240 231 243 241 252C249 263 246 282 237 291C228 298 221 301 220 306L180 306C179 301 172 298 163 291C154 282 151 263 159 252Z';
    let s = part(c, J, SUIT, { shade: SHADE_R(214) });
    // zipper
    s += `<path d="M200 246L200 300" stroke="${INK}" stroke-width="3.2" stroke-linecap="round"/><path d="M200 252L200 296" stroke="${PAL.cream}" stroke-width="1.6" stroke-dasharray="1.6 3.4"/>` + part(c, 'M197 252L203 252L203 262L200 266L197 262Z', PAL.steel, { sw: 2.4, mis: [0.8, 0.8] });
    s += line('M170 268C180 276 188 292 190 304M230 268C220 276 212 292 210 304', 2.6, '#B77A12', ' opacity=".8"');
    // belt + buckle + pouches
    s += part(c, 'M177 296L223 296L224 308L176 308Z', LEATHER, { sw: 3.8, mis: [1.4, 1.2] }) + part(c, 'M193 295L207 295L207 309L193 309Z', PAL.gold, { sw: 3.2, mis: [1, 1] }) + `<rect x="197" y="299" width="6" height="6" fill="${INK}"/>`;
    s += part(c, 'M159 322L180 322L180 346L159 346Z', LEATHER, { sw: 3.8, mis: [1.4, 1.2] }) + line('M161 330L178 330', 2.2, PAL.goldDeep) + part(c, 'M220 322L241 322L241 346L220 346Z', LEATHER, { sw: 3.8, mis: [1.4, 1.2] }) + line('M222 330L239 330', 2.2, PAL.goldDeep);
    // scarf: wrap around the neck + two tails (swing)
    s += `<g id="${c.pre}scarf-2" transform="rotate(0 188 250)">${part(c, 'M180 250C164 262 148 280 146 308C156 300 166 292 176 292C172 276 178 262 188 254Z', PAL.olive, { sw: OL * 0.95, shade: 'M140 290L190 290L190 320L140 320Z' })}</g>`;
    s += `<g id="${c.pre}scarf-1" transform="rotate(0 188 250)">${part(c, 'M182 252C170 268 164 292 168 322C176 312 182 300 186 290C186 278 188 266 192 256Z', PAL.olive, { sw: OL * 0.95 })}</g>`;
    s += part(c, 'M184 232C192 238 208 238 216 232L220 246C208 254 192 254 180 246Z', PAL.olive, { sw: OL * 0.95, shade: 'M200 228L230 228L230 258L200 258Z' }) + line('M186 244C196 249 206 249 214 244', 2.4, '#55611F', ' opacity=".9"');
    return s;
  },
  head(c) { // leather aviator cap (over the hair), strap, ear flap, goggles on the front
    let s = '';
    s += part(c, 'M-92 -96C-96 -146 -58 -172 -12 -170C28 -168 48 -142 46 -112C40 -102 30 -97 22 -94C10 -100 -10 -102 -26 -99C-44 -96 -58 -98 -70 -104Z', LEATHER, { shade: 'M-6 -176L56 -176L56 -92L-6 -92Z' });
    s += part(c, 'M-92 -96C-98 -76 -94 -52 -82 -38C-70 -32 -62 -46 -62 -64L-70 -104Z', '#8F5A34', { sw: OL, shade: 'M-96 -60L-70 -60L-70 -30L-96 -30Z' });
    s += `<path d="M-84 -122C-60 -140 -20 -148 20 -142" fill="none" stroke="${INK}" stroke-width="8" stroke-linecap="round"/><path d="M-84 -122C-60 -140 -20 -148 20 -142" fill="none" stroke="#B0763F" stroke-width="3.6" stroke-linecap="round"/>`;
    s += line('M-40 -168C-30 -150 -28 -130 -30 -108M0 -170C6 -150 6 -130 2 -106', 2.6, '#5A3A22', ' opacity=".8"');
    // goggles: two round lenses with a strap
    const lens = (x, y) => `<g transform="translate(${x} ${y})">${part(c, ellD(0, 0, 17, 15), PAL.gold, { sw: 4.2, mis: [1.4, 1.2] })}<ellipse cx="0" cy="0" rx="11.5" ry="10" fill="#1E4A52" stroke="${INK}" stroke-width="2.6"/><path d="M-6 -5C-3 -8 3 -8 6 -5" fill="none" stroke="${PAL.white}" stroke-width="2.6" stroke-linecap="round" opacity=".9"/></g>`;
    s += lens(-30, -140) + lens(4, -144) + part(c, 'M-14 -142L-9 -144L-9 -138L-14 -137Z', PAL.goldDeep, { sw: 2.6, mis: [0.8, 0.8] });
    return s;
  },
  gear: () => '',
  prop(c) { // grappling hook with rope coil; +y = working end (hook)
    let s = '';
    s += part(c, ellD(-22, 8, 17, 15), 'none', { sw: 0 });
    for (const r of [15, 10, 5]) s += `<ellipse cx="-24" cy="10" rx="${r + 3}" ry="${r}" fill="none" stroke="${INK}" stroke-width="6.6"/>`;
    for (const r of [15, 10, 5]) s += `<ellipse cx="-24" cy="10" rx="${r + 3}" ry="${r}" fill="none" stroke="#B0763F" stroke-width="3"/>`;
    s += part(c, 'M-8 -30L8 -30L8 14L-8 14Z', LEATHER, { sw: 4.4, mis: [1.6, 1.4] }) + line('M-8 -18h16M-8 -8h16M-8 2h16', 2, '#4A2A16');
    s += part(c, 'M-5 12L5 12L5 52L-5 52Z', PAL.steel, { sw: 4, mis: [1.4, 1.2] });
    s += part(c, 'M0 50C-6 56 -22 58 -30 48C-24 66 -6 72 0 66C6 72 24 66 30 48C22 58 6 56 0 50Z', PAL.steel, { sw: 4.2, mis: [1.6, 1.4] });
    s += part(c, 'M-2 60L2 60L2 78L-2 78Z', PAL.steel, { sw: 3.4, mis: [1.2, 1] });
    return s;
  },
};

// ====================================================================== E. TRENCH AND FEDORA (trench coat, tie, magnifying glass)
const CAMEL = PAL.camel, BURG = PAL.burgundy;
const trench = {
  key: 'trench', label: 'E. Trench and fedora', accent: BURG,
  sleeve: { fill: CAMEL, trim: '#8A5E34', trimAt: [0.78, 0.86], gloveFrom: null }, glove: PAL.white, cuff: PAL.white,
  legs: { fill: '#3A1A10', w: 13, shine: '#8A5A44' }, shoe: { base: PAL.white },
  lidFill: PAL.eyeshadow, accBase: 90, accGain: 1, capOver: true, hairTop: () => '',
  skirt(c) {
    const d = 'M178 300L222 300C236 316 242 336 243 356C244 392 244 424 246 452Q200 462 154 452C156 424 156 392 157 356C158 336 164 316 178 300Z';
    let s = part(c, d, CAMEL, { shade: 'M212 296L270 296L270 470L212 470Z' });
    s += line('M212 304C214 360 214 410 214 458', 3.2, '#8A5E34');
    for (const y of [352, 384, 416]) s += part(c, ellD(190, y, 3.8, 3.8), '#4A2E1A', { sw: 2.4, mis: [0.8, 0.8] }) + part(c, ellD(224, y, 3.8, 3.8), '#4A2E1A', { sw: 2.4, mis: [0.8, 0.8] });
    s += part(c, 'M166 350L186 358L184 384L164 376Z', CAMEL, { sw: 3.4, mis: [1.2, 1] });
    s += line('M162 448C190 456 212 456 242 448', 2.6, '#8A5E34');
    return s;
  },
  torso(c) {
    const J = 'M158 252C168 242 186 238 200 240C214 238 232 242 242 252C250 264 246 282 236 291C227 298 220 301 219 306L181 306C180 301 173 298 164 291C154 282 150 264 158 252Z';
    let s = part(c, J, CAMEL, { shade: SHADE_R(214) });
    s += part(c, 'M186 242L214 242L200 284Z', PAL.white, { sw: 3.8, mis: [1.2, 1] }) + part(c, 'M197.4 248L202.6 248L204.4 276L200 286L195.6 276Z', BURG, { sw: 3, mis: [1, 1] });
    // big collar / lapels
    s += part(c, 'M186 238L166 250L174 270L194 290L202 280L190 258Z', '#C99C66', { sw: 4.2 }) + part(c, 'M214 238L234 250L226 270L206 290L198 280L210 258Z', '#C99C66', { sw: 4.2 });
    for (const y of [296]) for (const x of [189, 211]) s += part(c, ellD(x, y, 3.8, 3.8), '#4A2E1A', { sw: 2.4, mis: [0.8, 0.8] });
    s += part(c, 'M159 252L180 242L184 250L162 261Z', '#8A5E34', { sw: 3.2, mis: [1.2, 1] }) + part(c, 'M241 252L220 242L216 250L238 261Z', '#8A5E34', { sw: 3.2, mis: [1.2, 1] });
    // belt + gold buckle
    s += part(c, 'M178 296L222 296L223 308L177 308Z', '#5A3A22', { sw: 3.6, mis: [1.4, 1.2] }) + part(c, 'M192 294L208 294L208 310L192 310Z', PAL.gold, { sw: 3.2, mis: [1, 1] }) + `<rect x="196" y="298" width="8" height="8" fill="none" stroke="${INK}" stroke-width="2.4"/>`;
    return s;
  },
  head(c) { // fedora, tilted over the back-left of the head
    let s = '';
    s += part(c, 'M-46 -108C-50 -142 -36 -170 -8 -172C18 -172 34 -148 32 -116C14 -108 -22 -104 -46 -108Z', BURG, { shade: 'M-4 -176L40 -176L40 -100L-4 -100Z' });
    s += `<path d="M-16 -170C-8 -158 0 -156 10 -166" fill="none" stroke="${INK}" stroke-width="3.6" stroke-linecap="round"/>`;
    s += part(c, 'M-47 -112C-20 -102 14 -106 33 -114L33 -128C14 -120 -20 -116 -47 -126Z', '#3A1626', { sw: 4, mis: [1.4, 1.2] });
    s += part(c, 'M-76 -104C-70 -120 -34 -128 6 -126C42 -124 66 -114 66 -102C58 -90 20 -84 -14 -86C-48 -88 -70 -92 -76 -104Z', BURG, { sw: OL, shade: 'M8 -130L80 -130L80 -76L8 -76Z' });
    s += line('M-66 -102C-44 -94 -10 -94 24 -96', 2.6, '#4A1A2E', ' opacity=".8"');
    return s;
  },
  gear: () => '',
  prop(c) { // magnifying glass; +y = working end (the lens)
    return part(c, 'M-5 -28L5 -28L5 16L-5 16Z', '#4A2A1C', { sw: 4.2, mis: [1.4, 1.2] })
      + part(c, ellD(0, 42, 25, 25), PAL.gold, { sw: 4.4, mis: [1.6, 1.4] }) + `<ellipse cx="0" cy="42" rx="18" ry="18" fill="#D2EEF2" stroke="${INK}" stroke-width="3"/>`
      + `<path d="M-10 36C-8 30 -2 26 4 26" fill="none" stroke="${PAL.white}" stroke-width="3.4" stroke-linecap="round"/>` + line('M8 52L12 48', 2.4, PAL.white);
  },
  prop2: () => '',
};

export const OUTFIT_DEFS = { inspectrice, casino, lab, vault, trench };
export const OUTFIT_KEYS = ['inspectrice', 'casino', 'lab', 'vault', 'trench'];

// second hand-held item per pose (hand letter = screen side); only used when that hand is free
casino.prop2On = { shrug: 'R', smallwin: 'R', laugh: '' };
lab.prop2On = { idle: 'R', shrug: 'R' };
