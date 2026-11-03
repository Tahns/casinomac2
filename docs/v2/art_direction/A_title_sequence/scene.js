// Direction A scene pieces: night city with a spotlight disc, theatre curtains, the proscenium frame, stage floor, HUD widgets.
import { C, seed, cutPoly, cutRect, cutEll, blob, sh, ln, twinkle, rays } from './art.js';
const F = (n) => Math.round(n * 10) / 10;
let S2 = 7; const r = (a, b) => a + (b - a) * ((S2 = (S2 * 16807) % 2147483647) / 2147483647);

export function sky(W, H, groundY, disc) {
  S2 = 7; seed(3);
  let o = `<rect width="${W}" height="${H}" fill="${C.night}"/>`;
  // two flat stepped bands of the same hue (tonal, cut paper): darker top
  o += `<path d="${cutPoly([[0, 0], [W, 0], [W, H * 0.22], [0, H * 0.27]], 3)}" fill="${C.ink}" opacity=".35"/>`;
  o += `<rect width="${W}" height="${H}" fill="url(#bg-htBL)" opacity=".7"/>`;
  // big spotlight disc: halo rings, mustard disc, cream core, a keyhole bite in the disc (spy motif)
  const { x, y, R } = disc;
  o += `<circle cx="${x}" cy="${y}" r="${R * 1.55}" fill="${C.mustard}" opacity=".07"/><circle cx="${x}" cy="${y}" r="${R * 1.3}" fill="${C.mustard}" opacity=".1"/>`;
  o += `<path d="${cutEll(x, y, R * 1.12, R * 1.12, 3)}" fill="${C.mustard}" opacity=".18"/>`;
  o += `<path d="${cutEll(x, y, R, R, 2.5)}" fill="${C.mustard}"/><path d="${cutEll(x - R * 0.04, y - R * 0.04, R * 0.86, R * 0.86, 2)}" fill="${C.cream}"/>`;
  o += `<path d="${cutEll(x, y, R, R, 0)}" fill="url(#bg-htB)" opacity=".55"/>`;
  // searchlight beams
  [[0.2, 22], [0.82, -18]].forEach(([fx, a]) => { const bx = W * fx, len = groundY * 1.3, wd = len * 0.13, t = Math.tan((a * Math.PI) / 180) * len;
    o += `<path d="M${bx} ${groundY}L${bx - wd + t} ${groundY - len}L${bx + wd + t} ${groundY - len}Z" fill="${C.paper}" opacity=".06"/>`; });
  // stars (cut-paper twinkles)
  for (let i = 0; i < W / 40; i++) { const sx = r(0, W), sy = r(0, groundY * 0.5); o += `<g opacity="${F(r(0.35, 0.85))}">${twinkle(F(sx), F(sy), F(r(2, 5)), C.cream)}</g>`; }
  // title-sequence cut-outs floating in the sky: big tonal keyholes and jazz stars (negative-space shapes, same hue as the night)
  const kh = (x, y, s, op) => `<path d="${cutPoly([[x - s * 0.32, y], [x + s * 0.32, y], [x + s * 0.55, y + s * 1.4], [x - s * 0.55, y + s * 1.4]], 1)}" fill="${C.turq}" opacity="${op}"/><path d="${cutEll(x, y - s * 0.1, s * 0.62, s * 0.62, 1)}" fill="${C.turq}" opacity="${op}"/>`;
  o += kh(W * 0.13, groundY * 0.2, Math.min(W, H) * 0.09, 0.16) + kh(W * 0.9, groundY * 0.12, Math.min(W, H) * 0.06, 0.14);
  o += `<g opacity=".22">${twinkle(W * 0.25, groundY * 0.12, Math.min(W, H) * 0.05, C.turq)}${twinkle(W * 0.8, groundY * 0.42, Math.min(W, H) * 0.04, C.turq)}</g>`;
  // skyline: back layer turquoise (tonal), front layer ink with mustard windows. Hand-cut tops.
  const city = (base, hmin, hmax, fill, op, win, wmin = 50, wmax = 120) => { let cx = -10;
    while (cx < W + 10) { const bw = r(wmin, wmax), bh = r(hmin, hmax), top = base - bh;
      const pts = [[cx, base], [cx, top]]; const kind = r(0, 1);
      if (kind < 0.25) pts.push([cx + bw * 0.5, top - bw * 0.35]); else if (kind < 0.45) { pts.push([cx + bw * 0.3, top], [cx + bw * 0.3, top - bh * 0.15], [cx + bw * 0.7, top - bh * 0.15], [cx + bw * 0.7, top]); }
      pts.push([cx + bw, top], [cx + bw, base]);
      o += `<path d="${cutPoly(pts, 1.2)}" fill="${fill}" opacity="${op}"/>`;
      if (kind > 0.45 && kind < 0.55) o += `<path d="M${F(cx + bw * 0.5)} ${F(top)}v${F(-bh * 0.25)}" stroke="${fill}" stroke-width="3" opacity="${op}"/>`;
      if (win) for (let wy = top + 14; wy < base - 16; wy += 22) for (let wx = cx + 10; wx < cx + bw - 14; wx += 18) if (r(0, 1) < 0.28) o += `<rect x="${F(wx)}" y="${F(wy)}" width="7" height="10" fill="${C.mustard}" opacity=".85"/>`;
      cx += bw + r(2, 14); } };
  city(groundY, groundY * 0.22, groundY * 0.42, C.turq, 0.32, false, 60, 140);
  city(groundY, groundY * 0.12, groundY * 0.28, C.ink, 0.88, true);
  return o;
}

export function curtains(W, H, sideW, valH, groundY) {
  seed(17);
  let o = '';
  const drape = (x0, dir) => { // dir +1 left curtain (gathered toward the right), -1 right curtain
    const xo = dir > 0 ? 0 : W, xi = xo + dir * sideW, tieY = groundY * 0.62;
    const d = `M${xo} 0L${xi} 0C${xi} ${tieY * 0.5} ${xi - dir * sideW * 0.15} ${tieY * 0.85} ${xi - dir * sideW * 0.55} ${tieY}C${xi - dir * sideW * 0.1} ${tieY + 40} ${xi + dir * sideW * 0.05} ${groundY * 0.9} ${xi + dir * sideW * 0.12} ${groundY + 6}L${xo} ${groundY + 6}Z`;
    o += sh(d, C.brick, 3.4);
    // folds: darker strips (tonal ink) and paper highlight
    for (let k = 1; k < 4; k++) { const fx = xo + dir * sideW * (k / 4) * 0.9;
      o += ln(`M${F(fx)} 4C${F(fx + dir * 4)} ${tieY * 0.6} ${F(fx - dir * sideW * 0.05 * k)} ${tieY * 0.95} ${F(fx)} ${groundY}`, 6, C.ink, ' opacity=".22"'); }
    o += ln(`M${F(xo + dir * sideW * 0.62)} 6C${F(xo + dir * sideW * 0.66)} ${tieY * 0.5} ${F(xo + dir * sideW * 0.5)} ${tieY * 0.85} ${F(xo + dir * sideW * 0.4)} ${tieY}`, 3, C.paper, ' opacity=".35"');
    o += `<path d="${d}" fill="url(#bg-ht)" opacity=".5"/>`;
    // mustard tie-back rope and tassel
    o += sh(cutEll(xi - dir * sideW * 0.55, tieY, sideW * 0.3, 7, 0.5), C.mustard, 2.6) + sh(cutPoly([[xi - dir * sideW * 0.5 - 5, tieY + 4], [xi - dir * sideW * 0.5 + 5, tieY + 4], [xi - dir * sideW * 0.5 + 8, tieY + 30], [xi - dir * sideW * 0.5 - 8, tieY + 30]], 0.6), C.mustard, 2.4);
  };
  drape(0, 1); drape(W, -1);
  // scalloped valance across the top, with a mustard fringe
  const n = Math.max(5, Math.round(W / 120)), sw = W / n; let d = `M0 0L${W} 0L${W} ${valH * 0.55}`;
  for (let i = n; i > 0; i--) { const x1 = (i - 1) * sw; d += `Q${F((i - 0.5) * sw)} ${F(valH * 1.25)} ${F(x1)} ${F(valH * 0.55)}`; }
  o += sh(d + 'Z', C.brick, 3.4) + `<path d="${d}Z" fill="url(#bg-ht)" opacity=".45"/>`;
  let fr = ''; for (let i = 0; i < n; i++) fr += `M${F(i * sw + 6)} ${F(valH * 0.62)}Q${F((i + 0.5) * sw)} ${F(valH * 1.12)} ${F((i + 1) * sw - 6)} ${F(valH * 0.62)}`;
  o += ln(fr, 4, C.mustard) + ln(`M0 ${F(valH * 0.28)}H${W}`, 3, C.mustard);
  return o;
}

export function floor(W, H, groundY) {
  seed(29);
  let o = sh(`M-4 ${groundY}H${W + 4}V${H + 4}H-4Z`, C.chestnut, 4);
  for (let i = 1; i < 6; i++) { const y = groundY + (H - groundY) * Math.pow(i / 6, 1.25); o += ln(`M0 ${F(y)}H${W}`, 2, C.ink, ' opacity=".45"'); }
  for (let i = 0; i < 16; i++) { const x = (W / 15) * i; o += ln(`M${F(W / 2 + (x - W / 2) * 0.6)} ${groundY}L${F(W / 2 + (x - W / 2) * 1.5)} ${H}`, 1.6, C.ink, ' opacity=".25"'); }
  o += `<rect x="0" y="${groundY}" width="${W}" height="${H - groundY}" fill="url(#bg-htB)"/>`;
  // spotlight pool on the boards
  o += `<path d="${cutEll(W * 0.55, groundY + (H - groundY) * 0.45, W * 0.34, (H - groundY) * 0.35, 3)}" fill="${C.mustard}" opacity=".16"/>`;
  return o;
}

// proscenium frame around the opening (x0,y0)-(x1,y1); k = scale of the band widths
export function proscenium(x0, y0, x1, y1, k = 1, crown = true) {
  seed(41);
  const b = 20 * k, w = x1 - x0, h = y1 - y0;
  let o = '';
  // board backing inside (night, darkened tonally, halftone)
  o += `<rect x="${x0}" y="${y0}" width="${w}" height="${h}" fill="${C.night}"/><rect x="${x0}" y="${y0}" width="${w}" height="${h}" fill="${C.ink}" opacity=".45"/><rect x="${x0}" y="${y0}" width="${w}" height="${h}" fill="url(#bg-htBL)"/>`;
  // drop shadow (cut paper lifted off the page)
  const outer = [[x0 - b, y0 - b], [x1 + b, y0 - b], [x1 + b, y1 + b], [x0 - b, y1 + b]];
  o += `<path d="${cutPoly(outer.map(([x, y]) => [x + 9 * k, y + 10 * k]), 1)}" fill="${C.ink}" opacity=".5"/>`;
  // the band: mustard, with an inner brick lip, stepped deco corners
  const band = `M${x0 - b} ${y0 - b}H${x1 + b}V${y1 + b}H${x0 - b}Z M${x0} ${y0}V${y1}H${x1}V${y0}Z`;
  o += `<path d="${band}" fill="${C.mustard}" fill-rule="evenodd"/>` + `<path d="${band}" fill="url(#bg-ht)" fill-rule="evenodd" opacity=".35"/>`;
  o += ln(cutRect(x0 - b, y0 - b, w + 2 * b, h + 2 * b, 0.8, 30, 0), 3.4 * Math.max(0.8, k));
  o += `<path d="M${x0 - 5 * k} ${y0 - 5 * k}H${x1 + 5 * k}V${y1 + 5 * k}H${x0 - 5 * k}Z M${x0} ${y0}V${y1}H${x1}V${y0}Z" fill="${C.brick}" fill-rule="evenodd"/>`;
  o += ln(`M${x0} ${y0}H${x1}V${y1}H${x0}Z`, 2.6 * Math.max(0.8, k));
  // marquee bulbs along the band
  const bulb = (x, y) => `<circle cx="${F(x)}" cy="${F(y)}" r="${F(4.6 * k)}" fill="${C.paper}" stroke="${C.ink}" stroke-width="${F(1.8 * k)}"/><circle cx="${F(x)}" cy="${F(y)}" r="${F(9 * k)}" fill="${C.paper}" opacity=".16"/>`;
  const step = 30 * k, mid = -b * 0.48 - 2.5 * k;
  for (let x = x0 + step * 0.5; x < x1; x += step) { o += bulb(x, y0 + mid) + bulb(x, y1 - mid); }
  for (let y = y0 + step * 0.5; y < y1; y += step) { o += bulb(x0 + mid, y) + bulb(x1 - mid, y); }
  // corner medallions (keyhole rosettes)
  for (const [cx, cy] of [[x0 - b / 2, y0 - b / 2], [x1 + b / 2, y0 - b / 2], [x0 - b / 2, y1 + b / 2], [x1 + b / 2, y1 + b / 2]]) {
    o += sh(cutEll(cx, cy, 15 * k, 15 * k, 0.5), C.brick, 2.6 * k) + sh(cutEll(cx, cy, 8 * k, 8 * k, 0.4), C.cream, 2 * k) + `<circle cx="${F(cx)}" cy="${F(cy - 1.5 * k)}" r="${F(2.6 * k)}" fill="${C.ink}"/><path d="M${F(cx - 2 * k)} ${F(cy)}L${F(cx + 2 * k)} ${F(cy)}L${F(cx + 3 * k)} ${F(cy + 5 * k)}L${F(cx - 3 * k)} ${F(cy + 5 * k)}Z" fill="${C.ink}"/>`;
  }
  if (crown) { // stepped arch crown above the top band (the logo sits on it)
    const cx = (x0 + x1) / 2, cw = w * 0.56, ch = 36 * k, ty = y0 - b;
    const pts = [[cx - cw / 2, ty], [cx - cw / 2 + 12 * k, ty - ch * 0.45], [cx - cw * 0.3, ty - ch * 0.45], [cx - cw * 0.26, ty - ch], [cx + cw * 0.26, ty - ch], [cx + cw * 0.3, ty - ch * 0.45], [cx + cw / 2 - 12 * k, ty - ch * 0.45], [cx + cw / 2, ty]];
    o += sh(cutPoly(pts, 0.8), C.brick, 3.2 * k);
  }
  return o;
}
// stage plinth under the frame (where the win plate sits)
export function plinth(x0, x1, y, h, k = 1) {
  seed(51);
  return sh(cutPoly([[x0, y], [x1, y], [x1 + 14 * k, y + h], [x0 - 14 * k, y + h]], 0.8), C.chestnut, 3 * k) + ln(`M${x0 + 6} ${y + 6 * k}H${x1 - 6}`, 2.6 * k, C.mustard);
}
// footlights along the stage lip
export function footlights(x0, x1, y, k = 1) {
  let o = ''; const n = Math.round((x1 - x0) / (46 * k));
  for (let i = 0; i <= n; i++) { const x = x0 + ((x1 - x0) * i) / n;
    o += `<path d="${cutEll(x, y - 20 * k, 28 * k, 26 * k, 1)}" fill="${C.mustard}" opacity=".13"/>` + sh(`M${F(x - 12 * k)} ${y}A${F(12 * k)} ${F(10 * k)} 0 0 1 ${F(x + 12 * k)} ${y}Z`, C.mustard, 2.4 * k); }
  return o;
}

// ------------------------------------------------------------------ HUD
const font = `font-family="Luckiest, 'Luckiest Guy', sans-serif"`;
export function label(x, y, txt, size, fill = C.paper, anchor = 'start', ol = 0.22) {
  return `<text x="${x}" y="${y}" ${font} font-size="${size}" text-anchor="${anchor}" letter-spacing="${size * 0.03}" fill="${fill}" stroke="${C.ink}" stroke-width="${size * ol}" stroke-linejoin="round" paint-order="stroke">${txt}</text>`;
}
export function spinButton(cx, cy, R) {
  seed(61);
  let o = `<path d="${cutEll(cx + R * 0.08, cy + R * 0.1, R * 1.06, R * 1.06, 1)}" fill="${C.ink}" opacity=".55"/>`;
  o += sh(cutEll(cx, cy, R * 1.08, R * 1.08, 1), C.paper, 0) + sh(cutEll(cx, cy, R, R, 1.2), C.ink, 0);
  o += `<g>${rays(cx, cy, R * 0.2, R * 0.93, 18, C.mustard, 0, 0.5)}</g>`;
  o += sh(cutEll(cx, cy, R * 0.72, R * 0.72, 1), C.brick, 3) + `<path d="${cutEll(cx, cy, R * 0.72, R * 0.72, 0)}" fill="url(#bg-ht)" opacity=".5"/>`;
  // circular arrows (two cut-paper arcs with heads)
  const a = R * 0.4, sw = R * 0.13;
  o += `<g stroke="${C.ink}" stroke-width="${sw + 5}" fill="none" stroke-linecap="round"><path d="M${F(cx - a)} ${F(cy - a * 0.15)}A${a} ${a} 0 0 1 ${F(cx + a * 0.75)} ${F(cy - a * 0.62)}"/><path d="M${F(cx + a)} ${F(cy + a * 0.15)}A${a} ${a} 0 0 1 ${F(cx - a * 0.75)} ${F(cy + a * 0.62)}"/></g>`;
  o += `<g stroke="${C.paper}" stroke-width="${sw}" fill="none" stroke-linecap="round"><path d="M${F(cx - a)} ${F(cy - a * 0.15)}A${a} ${a} 0 0 1 ${F(cx + a * 0.75)} ${F(cy - a * 0.62)}"/><path d="M${F(cx + a)} ${F(cy + a * 0.15)}A${a} ${a} 0 0 1 ${F(cx - a * 0.75)} ${F(cy + a * 0.62)}"/></g>`;
  const head = (x, y, ang) => { const s = R * 0.2; const p = [[0, -s], [s * 1.1, s * 0.2], [-s * 0.4, s * 0.9]].map(([px, py]) => [x + px * Math.cos(ang) - py * Math.sin(ang), y + px * Math.sin(ang) + py * Math.cos(ang)]);
    return `<path d="M${p.map((q) => F(q[0]) + ' ' + F(q[1])).join('L')}Z" fill="${C.paper}" stroke="${C.ink}" stroke-width="3" stroke-linejoin="round"/>`; };
  o += head(cx + a * 0.8, cy - a * 0.6, 0.5) + head(cx - a * 0.8, cy + a * 0.6, 0.5 + Math.PI);
  // SPIN tab on top
  o += sh(cutRect(cx - R * 0.42, cy - R * 1.2, R * 0.84, R * 0.32, 0.5, 12, 3), C.ink, 0) + label(cx, cy - R * 0.97, 'SPIN', R * 0.22, C.mustard, 'middle', 0);
  return o;
}
export function roundBtn(cx, cy, R, glyph) {
  seed(71);
  let o = `<circle cx="${cx + 3}" cy="${cy + 4}" r="${R}" fill="${C.ink}" opacity=".5"/>` + sh(cutEll(cx, cy, R, R, 0.6), C.cream, 3);
  if (glyph === '-') o += ln(`M${cx - R * 0.42} ${cy}H${cx + R * 0.42}`, R * 0.24);
  if (glyph === '+') o += ln(`M${cx - R * 0.42} ${cy}H${cx + R * 0.42}M${cx} ${cy - R * 0.42}V${cy + R * 0.42}`, R * 0.24);
  if (glyph === 'menu') o += ln(`M${cx - R * 0.45} ${cy - R * 0.3}H${cx + R * 0.45}M${cx - R * 0.45} ${cy}H${cx + R * 0.45}M${cx - R * 0.45} ${cy + R * 0.3}H${cx + R * 0.45}`, R * 0.17);
  if (glyph === 'auto') o += ln(`M${cx - R * 0.4} ${cy + R * 0.1}A${R * 0.42} ${R * 0.42} 0 1 1 ${cx + R * 0.1} ${cy + R * 0.4}`, R * 0.16) + `<path d="M${cx - R * 0.62} ${cy - R * 0.05}L${cx - R * 0.18} ${cy - R * 0.05}L${cx - R * 0.4} ${cy + R * 0.38}Z" fill="${C.ink}"/>`;
  if (glyph === 'bolt') o += `<path d="M${cx + R * 0.1} ${cy - R * 0.55}L${cx - R * 0.35} ${cy + R * 0.08}L${cx - R * 0.02} ${cy + R * 0.08}L${cx - R * 0.12} ${cy + R * 0.55}L${cx + R * 0.36} ${cy - R * 0.1}L${cx + R * 0.04} ${cy - R * 0.1}Z" fill="${C.ink}"/>`;
  return o;
}
// SECRET ENTRANCE: sticker-style feature button (a little brick stage door with a keyhole, paper sticker rim, tilted)
export function secretButton(cx, cy, k = 1) {
  seed(81);
  const g = [];
  const door = cutPoly([[-34, 38], [-34, -18], [-22, -38], [22, -38], [34, -18], [34, 38]], 0.8);
  g.push(`<path d="${door}" fill="none" stroke="${C.paper}" stroke-width="16" stroke-linejoin="round"/>`);
  g.push(`<path d="${door}" fill="${C.ink}" transform="translate(4 5)" opacity=".5"/>`);
  g.push(sh(door, C.mustard, 3.2));
  g.push(sh(cutPoly([[-25, 38], [-25, -12], [-16, -28], [16, -28], [25, -12], [25, 38]], 0.6), C.brick, 2.6));
  g.push(`<path d="${cutPoly([[-25, 38], [-25, -12], [-16, -28], [16, -28], [25, -12], [25, 38]], 0)}" fill="url(#bg-ht)" opacity=".55"/>`);
  g.push(sh(cutEll(0, 6, 9, 9, 0.4), C.cream, 2.2) + `<path d="M0 0a3.4 3.4 0 0 1 1.8 6.3L3.2 13H-3.2l1.4 -6.7A3.4 3.4 0 0 1 0 0Z" fill="${C.ink}"/>`);
  g.push(twinkle(30, -40, 9, C.paper, 2));
  // label plate (two lines)
  const plate = cutPoly([[-62, 44], [62, 41], [60, 92], [-60, 94]], 0.8);
  g.push(`<path d="${plate}" fill="none" stroke="${C.paper}" stroke-width="12" stroke-linejoin="round"/>` + sh(plate, C.ink, 0));
  g.push(label(0, 66, 'SECRET', 21, C.mustard, 'middle', 0) + label(0, 87, 'ENTRANCE', 17, C.paper, 'middle', 0));
  return `<g transform="translate(${cx} ${cy}) rotate(-5) scale(${k})">${g.join('')}</g>`;
}
export function winPlate(cx, cy, k, amount) {
  seed(91);
  const w = 230 * k, h = 50 * k;
  const p = cutPoly([[cx - w / 2, cy - h / 2], [cx + w / 2, cy - h / 2 - 2], [cx + w / 2 + 12 * k, cy], [cx + w / 2, cy + h / 2], [cx - w / 2, cy + h / 2 + 2], [cx - w / 2 - 12 * k, cy]], 0.6);
  return `<path d="${p}" fill="none" stroke="${C.paper}" stroke-width="${10 * k}" stroke-linejoin="round"/>` + sh(p, C.ink, 0)
    + label(cx - w / 2 + 16 * k, cy + 9 * k, 'WIN', 22 * k, C.mustard, 'start', 0) + label(cx + w / 2 - 12 * k, cy + 12 * k, amount, 32 * k, C.paper, 'end', 0);
}
